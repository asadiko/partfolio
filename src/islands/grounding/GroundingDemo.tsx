import { useEffect, useMemo, useState } from 'react';
import type { SubmitEvent } from 'react';

import type { GradedClaim } from '@/engines/grounding';
import { groundAnswer, matchQuestion, retrievedIds } from '@/engines/grounding';
import { groundingFixture } from '@/lib/fixtures';
import { usePrefersReducedMotion } from '@/lib/motion';
import type { GroundingQuestion } from '@/lib/schemas';

import { SimBadge } from '../shared/SimBadge';
import { Button, Panel, Segmented } from '../shared/ui';
import { useTicker } from '../shared/useTicker';

type Phase = 'idle' | 'retrieving' | 'drafting' | 'checking' | 'retrying' | 'done';

const enforceOptions = [
  { value: 'on', label: 'Grounding check on' },
  { value: 'off', label: 'Grounding check off' },
] as const;

const phaseCopy: Record<Phase, string> = {
  idle: '',
  retrieving: 'Retrieving evidence…',
  drafting: 'Drafting answer with citation labels…',
  checking: 'Checking every citation against the retrieved set…',
  retrying: 'Unsupported claims stripped. One corrective retry…',
  done: '',
};

const RETRIEVE_MS = 900;
const DRAFT_STEP_MS = 650;
const CHECK_MS = 700;
const RETRY_MS = 900;
const RETRY_STEP_MS = 500;

export function GroundingDemo() {
  const reduced = usePrefersReducedMotion();
  const { corpus, questions } = groundingFixture;
  const chunks = useMemo(() => new Map(corpus.map((c) => [c.id, c])), [corpus]);

  const [enforce, setEnforce] = useState<'on' | 'off'>('on');
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState<GroundingQuestion | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [runId, setRunId] = useState(0);

  const retrieved = useMemo(
    () => (question ? retrievedIds(question.retrieval, question.topK) : new Set<string>()),
    [question],
  );
  const result = useMemo(
    () =>
      question
        ? groundAnswer(question.draft, retrieved, question.retry, { enforce: enforce === 'on' })
        : null,
    [question, retrieved, enforce],
  );

  const ask = (q: GroundingQuestion) => {
    setQuestion(q);
    setInput(q.text);
    setNoMatch(false);
    setPhase('retrieving');
    setRunId((n) => n + 1);
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = matchQuestion(input, questions);
    const match = questions.find((q) => q.id === id);
    if (match) ask(match);
    else setNoMatch(true);
  };

  const toggleEnforce = (value: 'on' | 'off') => {
    setEnforce(value);
    if (question) {
      setPhase('retrieving');
      setRunId((n) => n + 1);
    }
  };

  const firstPass = result?.firstPass ?? result?.claims ?? [];
  const draftTicks = useTicker(
    firstPass.length,
    DRAFT_STEP_MS,
    runId,
    reduced || phase !== 'drafting',
  );
  const retryTicks = useTicker(
    result?.claims.length ?? 0,
    RETRY_STEP_MS,
    runId,
    reduced || phase !== 'retrying',
  );

  useEffect(() => {
    if (!question || !result) return;
    if (reduced) {
      setPhase('done');
      return;
    }
    const timers: number[] = [];
    const after = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    const firstCount = result.firstPass?.length ?? result.claims.length;
    let t = RETRIEVE_MS;
    after(t, () => setPhase('drafting'));
    t += firstCount * DRAFT_STEP_MS + 300;
    after(t, () => setPhase('checking'));
    t += CHECK_MS;
    if (result.retried) {
      after(t, () => setPhase('retrying'));
      t += RETRY_MS + result.claims.length * RETRY_STEP_MS;
    }
    after(t, () => setPhase('done'));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [question, result, reduced, runId]);

  const showChecks = phase === 'checking' || phase === 'retrying' || phase === 'done';
  const showRetry = result?.retried && (phase === 'retrying' || phase === 'done');
  const supported = result?.claims.filter((c) => c.status === 'supported').length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted m-0 text-sm">
          Corpus: {corpus.length} passages paraphrased from RFC 9110 (HTTP Semantics). Ask about
          methods or status codes.
        </p>
        <SimBadge note="canned retrieval and drafts" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="grounding-question">
          Question
        </label>
        <input
          id="grounding-question"
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setNoMatch(false);
          }}
          placeholder="e.g. Is DELETE idempotent?"
          className="border-line bg-surface text-ink placeholder:text-faint flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <Button type="submit" variant="primary">
          Ask
        </Button>
      </form>
      {noMatch && (
        <p className="text-warn m-0 text-sm" role="status">
          No fixture matches that question — this demo only knows the five below. Pick one.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => ask(q)}
            aria-pressed={question?.id === q.id}
            className={[
              'rounded-full border px-3 py-1 text-sm transition-colors',
              question?.id === q.id
                ? 'border-accent bg-accent/10 text-ink'
                : 'border-line bg-surface text-muted hover:text-ink',
            ].join(' ')}
          >
            {q.text}
          </button>
        ))}
      </div>

      <Segmented
        label="Grounding check"
        value={enforce}
        options={enforceOptions}
        onChange={toggleEnforce}
      />

      {question && result && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="1 · Retrieval">
            <ol className="m-0 list-none space-y-2 p-0" aria-label="Ranked evidence">
              {[...question.retrieval]
                .sort((a, b) => b.score - a.score)
                .map((hit, i) => {
                  const chunk = chunks.get(hit.chunkId);
                  const inSet = retrieved.has(hit.chunkId);
                  const visible = reduced || phase !== 'retrieving' || i < 2;
                  return (
                    <li
                      key={hit.chunkId}
                      className={[
                        'rounded-md border px-3 py-2 text-sm transition-opacity duration-500',
                        inSet ? 'border-accent/40 bg-accent/5' : 'border-line opacity-60',
                        visible ? 'opacity-100' : 'opacity-0',
                      ].join(' ')}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-ink font-medium">{chunk?.source}</span>
                        <span className="text-faint font-mono text-xs tabular-nums">
                          {hit.score.toFixed(2)} {inSet ? '· retrieved' : '· below cut-off'}
                        </span>
                      </div>
                      <p className="text-muted m-0 mt-1 line-clamp-2 text-xs leading-relaxed">
                        {chunk?.text}
                      </p>
                    </li>
                  );
                })}
            </ol>
          </Panel>

          <Panel title={result.retried && showRetry ? '2 · Answer (after retry)' : '2 · Answer'}>
            <p className="text-accent m-0 mb-3 min-h-5 font-mono text-xs" aria-live="polite">
              {phaseCopy[phase]}
            </p>
            {phase !== 'retrieving' && (
              <ClaimList
                claims={showRetry ? result.claims : firstPass}
                revealed={showRetry ? retryTicks : draftTicks}
                showChecks={showChecks}
                sources={chunks}
              />
            )}
            {showRetry && result.firstPass && (
              <div className="border-line mt-4 border-t pt-3">
                <p className="text-faint m-0 mb-2 font-mono text-[11px] tracking-wide uppercase">
                  Stripped from the first draft
                </p>
                <ClaimList
                  claims={result.firstPass.filter((c) => c.status === 'stripped')}
                  revealed={Number.MAX_SAFE_INTEGER}
                  showChecks
                  sources={chunks}
                />
              </div>
            )}
            {phase === 'done' && (
              <p className="text-muted border-line m-0 mt-3 border-t pt-3 text-xs">
                {supported} supported ·{' '}
                {enforce === 'on'
                  ? `${result.stripped} stripped · ${result.retried ? 'retried once' : 'no retry needed'}`
                  : `${result.claims.length - supported} unsupported and shown anyway`}
                {enforce === 'off' && result.claims.length - supported > 0 && (
                  <> — this is what a reader would have taken as fact.</>
                )}
              </p>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function ClaimList({
  claims,
  revealed,
  showChecks,
  sources,
}: {
  claims: GradedClaim[];
  revealed: number;
  showChecks: boolean;
  sources: ReadonlyMap<string, { source: string }>;
}) {
  return (
    <ol className="m-0 list-none space-y-2 p-0">
      {claims.slice(0, revealed).map((claim) => {
        const bad = showChecks && claim.status !== 'supported';
        const stripped = showChecks && claim.status === 'stripped';
        return (
          <li
            key={claim.id}
            className={[
              'rounded-md border px-3 py-2 text-sm leading-relaxed transition-colors duration-500',
              stripped
                ? 'border-fail/40 text-muted'
                : bad
                  ? 'border-warn/60 bg-warn/10 text-ink'
                  : 'border-line text-ink',
            ].join(' ')}
          >
            <span className={stripped ? 'decoration-fail/70 line-through' : ''}>{claim.text}</span>
            <span className="mt-1 flex flex-wrap gap-1">
              {claim.sourceIds.length === 0 && <Cite text="no source" tone="fail" />}
              {claim.sourceIds.map((id) => (
                <Cite
                  key={id}
                  text={sources.get(id)?.source ?? id}
                  tone={showChecks && !sources.has(id) ? 'fail' : showChecks && bad ? 'warn' : 'ok'}
                />
              ))}
            </span>
            {bad && (
              <span className="text-fail mt-1 block font-mono text-[11px]">
                {stripped ? 'stripped — ' : 'unsupported — '}
                cites a source that was not retrieved
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Cite({ text, tone }: { text: string; tone: 'ok' | 'warn' | 'fail' }) {
  const colour = {
    ok: 'text-accent border-accent/40',
    warn: 'text-warn border-warn/50',
    fail: 'text-fail border-fail/50',
  }[tone];
  return (
    <span
      className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[10px] no-underline ${colour}`}
    >
      [{text}]
    </span>
  );
}
