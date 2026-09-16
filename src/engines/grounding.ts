import type { Claim } from '@/lib/schemas';

export type ClaimStatus = 'supported' | 'stripped' | 'unsupported';
export type GradedClaim = Claim & { status: ClaimStatus };

export interface GroundingResult {
  claims: GradedClaim[];
  firstPass?: GradedClaim[];
  retried: boolean;
  stripped: number;
}

interface GroundingOptions {
  enforce: boolean;
}

function grade(draft: Claim[], retrieved: ReadonlySet<string>, enforce: boolean): GradedClaim[] {
  return draft.map((claim) => {
    const supported =
      claim.sourceIds.length > 0 && claim.sourceIds.every((id) => retrieved.has(id));
    if (supported) return { ...claim, status: 'supported' };
    return { ...claim, status: enforce ? 'stripped' : 'unsupported' };
  });
}

const countStripped = (claims: GradedClaim[]) =>
  claims.filter((c) => c.status === 'stripped').length;

/**
 * A claim is grounded only if every source it cites was actually retrieved.
 * With enforcement on, ungrounded claims are stripped and the draft is retried once —
 * never more, so a bad retrieval degrades to a shorter answer, not a loop.
 */
export function groundAnswer(
  draft: Claim[],
  retrieved: ReadonlySet<string>,
  retry: Claim[] | undefined,
  { enforce }: GroundingOptions,
): GroundingResult {
  const firstPass = grade(draft, retrieved, enforce);
  const firstStripped = countStripped(firstPass);
  if (!enforce || firstStripped === 0 || !retry) {
    return { claims: firstPass, retried: false, stripped: firstStripped };
  }
  const second = grade(retry, retrieved, enforce);
  return {
    claims: second,
    firstPass,
    retried: true,
    stripped: firstStripped + countStripped(second),
  };
}

export function retrievedIds(
  retrieval: readonly { chunkId: string; score: number }[],
  topK: number,
): Set<string> {
  return new Set(
    [...retrieval]
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((hit) => hit.chunkId),
  );
}

const tokens = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2),
  );

const MIN_OVERLAP = 0.2;

/** Nearest canned question by Jaccard overlap on word tokens; undefined below the threshold. */
export function matchQuestion(
  input: string,
  questions: readonly { id: string; text: string }[],
): string | undefined {
  const query = tokens(input);
  if (query.size === 0) return undefined;
  let best: { id: string; score: number } | undefined;
  for (const q of questions) {
    const candidate = tokens(q.text);
    const shared = [...query].filter((t) => candidate.has(t)).length;
    const score = shared / (query.size + candidate.size - shared);
    if (score >= MIN_OVERLAP && (!best || score > best.score)) best = { id: q.id, score };
  }
  return best?.id;
}
