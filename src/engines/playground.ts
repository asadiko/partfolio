import type { DiagramSpec, ScenarioId } from '@/lib/schemas';

export type EventKind = 'info' | 'ok' | 'warn' | 'fail' | 'recover';
export type EventTarget = { node: string } | { edge: string };

export interface ScenarioEvent {
  at: number;
  target: EventTarget;
  kind: EventKind;
  message: string;
}

/** Small builder so scenarios read as a script and timings stay consistent. */
class Timeline {
  private readonly events: ScenarioEvent[] = [];
  private clock = 0;

  constructor(private readonly spec: DiagramSpec) {}

  private push(target: EventTarget, kind: EventKind, message: string, gapMs: number) {
    this.assertExists(target);
    this.clock += gapMs;
    this.events.push({ at: this.clock, target, kind, message });
    return this;
  }

  private assertExists(target: EventTarget) {
    const { nodes, edges } = this.spec;
    const found =
      'node' in target
        ? nodes.some((n) => n.id === target.node)
        : edges.some((e) => e.id === target.edge);
    if (!found) throw new Error(`scenario references unknown ${JSON.stringify(target)}`);
  }

  node(id: string, kind: EventKind, message: string, gapMs = 500) {
    return this.push({ node: id }, kind, message, gapMs);
  }

  edge(id: string, message: string, gapMs = 400) {
    return this.push({ edge: id }, 'info', message, gapMs);
  }

  done() {
    return this.events;
  }
}

const intake = (t: Timeline) =>
  t
    .node(
      'client',
      'info',
      'Opens a server-streaming RPC: 96-page document, wants progress as it goes.',
      0,
    )
    .edge('client-proxy', 'Request headers + document reference')
    .edge('proxy-service', 'Stream forwarded; proxy idle timeout starts (60 s)')
    .node('service', 'ok', 'Admission control: 3 of 8 slots in use → admitted, no queueing.')
    .edge('service-gateway', 'Batch of page-extraction calls (16 concurrent)')
    .node('gateway', 'ok', 'Least-in-flight routing: A has 2 in flight, B has 5, C has 3 → A.');

const scenarios: Record<ScenarioId, (t: Timeline) => ScenarioEvent[]> = {
  'happy-path': (t) =>
    intake(t)
      .edge('gateway-a', 'Chat completion, 1 page image + text, JSON schema attached')
      .node('ep-a', 'ok', 'Returns structured JSON in 3.8 s.')
      .edge('gateway-service', 'Parsed batch result + token usage')
      .node('service', 'ok', 'Parsed cleanly. Progress message 12/96 pages sent downstream.')
      .edge('service-proxy', 'Progress frame (heartbeat resets idle timer)')
      .edge('proxy-client', 'Progress frame')
      .node(
        'client',
        'ok',
        'Receives 12/96 … 96/96, then the final result. Stream closes cleanly.',
        800,
      )
      .done(),

  'malformed-output': (t) =>
    intake(t)
      .edge('gateway-a', 'Chat completion, JSON schema attached')
      .node('ep-a', 'warn', 'Response hit the output token limit: JSON truncated mid-array.')
      .edge('gateway-service', 'Raw text, finish_reason = length')
      .node('service', 'fail', 'JSON parse failed at position 8 412.')
      .node(
        'service',
        'warn',
        'Repair pass: strip code fences, close open strings and brackets → still missing 3 of 12 items.',
        900,
      )
      .node(
        'service',
        'info',
        'Partial batch accepted for the 9 complete items; the 3 missing ones are re-requested alone with a shorter output budget.',
        900,
      )
      .edge('service-gateway', 'Retry: 3 items, max_tokens halved, "return only the JSON object"')
      .edge('gateway-a', 'Retry call')
      .node('ep-a', 'ok', 'Returns a complete object in 1.9 s.')
      .edge('gateway-service', 'Parsed retry result')
      .node('service', 'recover', 'Batch merged: 12/12 items. Nothing was dropped silently.')
      .edge('service-proxy', 'Progress frame')
      .edge('proxy-client', 'Progress frame')
      .node(
        'client',
        'recover',
        'Sees one slower batch and a complete result. No error surfaced.',
        800,
      )
      .done(),

  'endpoint-timeout': (t) =>
    intake(t)
      .edge('gateway-a', 'Chat completion (expected ≈ 4 s for this prompt size)')
      .node('ep-a', 'warn', 'No first token after 9 s. Endpoint is degraded, not down.', 1200)
      .node(
        'gateway',
        'fail',
        'Token-aware adaptive timeout fired at 11 s (budget scales with prompt + max output, not a flat 30 s).',
        600,
      )
      .node(
        'gateway',
        'warn',
        'A placed in cooldown for 20 s; failure class = timeout, not quota.',
        500,
      )
      .edge('gateway-b', 'Same request re-issued to B (next least-in-flight)')
      .node('ep-b', 'ok', 'Returns in 4.1 s.')
      .edge('gateway-service', 'Result + usage; attempt count = 2 in metadata')
      .node(
        'service',
        'recover',
        'Batch completes 7 s late. Concurrency limiter never over-subscribed.',
      )
      .edge('service-proxy', 'Progress frame')
      .edge('proxy-client', 'Progress frame')
      .node(
        'ep-a',
        'recover',
        'Cooldown expires; a single probe succeeds → back in rotation.',
        1500,
      )
      .node('client', 'recover', 'One slow batch. Final result identical to the happy path.', 300)
      .done(),

  'client-cancel': (t) =>
    intake(t)
      .edge('gateway-a', 'Page batch in flight')
      .node('ep-a', 'info', 'Generating…')
      .node('client', 'fail', 'User closes the tab. gRPC client sends RST_STREAM (CANCELLED).', 900)
      .edge('client-proxy', 'CANCELLED')
      .edge('proxy-service', 'Cancellation propagated to the server-side stream context')
      .node(
        'service',
        'warn',
        'Context cancelled → every pending page task receives CancelledError; in-flight results are discarded, not persisted.',
        500,
      )
      .edge('service-gateway', 'Abort in-flight upstream calls')
      .node(
        'gateway',
        'warn',
        'Upstream HTTP requests aborted; tokens already generated are still billed and attributed.',
      )
      .node('ep-a', 'info', 'Generation stops on connection close.')
      .node(
        'service',
        'recover',
        'Admission slot released within 50 ms. Nothing leaks: no orphan tasks, no half-written output.',
        600,
      )
      .node(
        'client',
        'recover',
        'A new request from the same user gets a fresh slot immediately.',
        800,
      )
      .done(),

  'provider-outage': (t) =>
    intake(t)
      .edge('gateway-a', 'Chat completion')
      .node('ep-a', 'fail', '503 Service Unavailable', 800)
      .node('gateway', 'warn', 'A: failure 1/3 within window. Cooldown 5 s.', 300)
      .edge('gateway-b', 'Retry on B')
      .node('ep-b', 'fail', '503 Service Unavailable', 800)
      .node(
        'gateway',
        'warn',
        'B: failure 1/3. Two regional endpoints down together — looks like a provider incident.',
        300,
      )
      .edge('gateway-c', 'Retry on C')
      .node('ep-c', 'ok', 'Returns in 4.4 s.')
      .node(
        'gateway',
        'fail',
        'A and B cross the failure threshold → circuit OPEN for both. All traffic to C; admission cap lowered so C is not overrun.',
        600,
      )
      .edge('gateway-service', 'Result; backpressure signal: reduce batch concurrency')
      .node(
        'service',
        'warn',
        'Concurrency limiter drops 16 → 6. Throughput down, correctness unchanged.',
      )
      .edge('service-proxy', 'Progress frame')
      .edge('proxy-client', 'Progress frame')
      .node(
        'gateway',
        'info',
        'After 30 s: circuit HALF-OPEN. One probe request each to A and B.',
        1500,
      )
      .node('ep-a', 'ok', 'Probe succeeds.', 400)
      .node(
        'gateway',
        'recover',
        'A enters probation: gets 10 % of traffic for 60 s. A single failure during probation re-opens the circuit (anti-flap).',
        500,
      )
      .node('service', 'recover', 'Limiter ramps back to 16.', 800)
      .node('client', 'recover', 'Job finished slower than usual. Client never saw an error.', 500)
      .done(),

  'proxy-idle-kill': (t) =>
    intake(t)
      .edge('gateway-a', 'Large batch: 16 dense pages, each ≈ 40 s')
      .node('ep-a', 'info', 'Generating… (no result for the service to forward yet)')
      .node(
        'proxy',
        'warn',
        '30 s without a byte on the response stream. Idle timeout is 60 s.',
        2000,
      )
      .node(
        'proxy',
        'fail',
        'Without heartbeats this is where the proxy would close the stream and the client would see UNAVAILABLE after 2 minutes of real work.',
        1500,
      )
      .node(
        'service',
        'info',
        'Queue heartbeat: an empty progress frame is emitted every 15 s while any task is in flight, independent of model output.',
        400,
      )
      .edge('service-proxy', 'Heartbeat frame (0 bytes of payload, resets idle timer)')
      .node('proxy', 'recover', 'Idle timer reset. Stream stays open.', 300)
      .edge('proxy-client', 'Heartbeat frame')
      .node('ep-a', 'ok', 'First batch returns after 41 s.', 1200)
      .edge('gateway-service', 'Batch result')
      .node('service', 'ok', 'Real progress frame 16/96.')
      .edge('service-proxy', 'Progress frame')
      .edge('proxy-client', 'Progress frame')
      .node(
        'client',
        'recover',
        'A 6-minute extraction completes over a proxy configured for 60 s. Cancellation still works at any point.',
        800,
      )
      .done(),
};

export function runScenario(id: ScenarioId, spec: DiagramSpec): ScenarioEvent[] {
  return scenarios[id](new Timeline(spec));
}
