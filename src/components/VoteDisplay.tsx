import { NO_VOTE_TEXT } from "@/lib/constants";
import type { Vote } from "@/types/digest";

/**
 * A missing vote and a 0-0 vote are different facts and must never render
 * identically. When the source records no vote we say so in words rather than
 * showing an empty space or a zero.
 */
export function VoteDisplay({ vote }: { vote: Vote | null }) {
  if (vote === null) {
    return <p className="text-sm text-muted italic">{NO_VOTE_TEXT}</p>;
  }

  const counts: string[] = [];
  if (vote.for !== null) counts.push(`${vote.for} for`);
  if (vote.against !== null) counts.push(`${vote.against} against`);
  if (vote.abstain !== null) counts.push(`${vote.abstain} abstaining`);

  return (
    <div className="text-sm">
      <p className="font-medium">
        {counts.length > 0 ? counts.join(" · ") : "Vote recorded"}
      </p>
      <p className="mt-0.5 text-muted">
        As stated in source: “{vote.asStated}”
      </p>
      {vote.memberVotes !== null && vote.memberVotes.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          {vote.memberVotes.map((m, i) => (
            <li key={`${m.name}-${i}`}>
              <span className="font-medium text-ink">{m.name}</span> — {m.vote}
            </li>
          ))}
        </ul>
      )}
      {vote.memberVotes === null && (
        <p className="mt-1 text-xs text-muted">
          Individual member votes not listed in source.
        </p>
      )}
    </div>
  );
}
