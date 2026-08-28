import { VoteDisplay } from "@/components/VoteDisplay";
import { IMPACT_LABEL, UNCERTAIN_BADGE } from "@/lib/constants";
import type { DigestItem } from "@/types/digest";

/**
 * One card per item. Procedural items render the same card, de-emphasised but
 * NEVER hidden — hiding them would make the classification audit impossible,
 * because you could not see a real decision wrongly filed as procedural.
 */
export function DigestCard({ item }: { item: DigestItem }) {
  const procedural = item.classification === "procedural";
  const uncertain = item.confidence === "uncertain";

  return (
    <article
      className={`rounded border p-4 ${
        uncertain
          ? "border-near bg-near-bg/40"
          : procedural
            ? "border-line bg-neutral-50/60"
            : "border-line bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3
          className={`font-medium ${procedural ? "text-muted" : "text-ink"}`}
        >
          {item.title}
        </h3>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
            procedural
              ? "bg-neutral-200 text-neutral-700"
              : "bg-verified-bg text-verified"
          }`}
        >
          {procedural ? "Procedural" : "Decision"}
        </span>
      </div>

      {uncertain && (
        <p className="mt-2 rounded bg-near-bg px-2 py-1 text-xs font-medium text-near">
          {UNCERTAIN_BADGE}
          {item.uncertaintyReason && (
            <span className="font-normal"> {item.uncertaintyReason}</span>
          )}
        </p>
      )}

      <p className="measure mt-2 text-sm">
        {item.decision ?? (
          <span className="text-muted italic">No decision recorded.</span>
        )}
      </p>

      {item.deferred && (
        <p className="mt-2 text-sm font-medium text-near">
          Deferred{item.deferralNote ? ` — ${item.deferralNote}` : ""}
        </p>
      )}

      <div className="mt-3">
        <VoteDisplay vote={item.vote} />
      </div>

      {item.impactNote && (
        <div className="mt-3 rounded border-l-2 border-accent bg-blue-50/40 py-2 pl-3">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">
            {IMPACT_LABEL}
          </p>
          <p className="measure mt-0.5 text-sm">{item.impactNote}</p>
        </div>
      )}

      {/* Always visible, never behind a toggle: the premise is that verifying
          a claim against the source takes seconds. */}
      <div className="mt-3 border-t border-line pt-2">
        <p className="text-xs text-muted">
          Source — page {item.sourcePage}
        </p>
        <blockquote className="measure mt-1 border-l-2 border-line pl-3 text-sm text-muted italic">
          “{item.sourceQuote}”
        </blockquote>
      </div>

      <p className="mt-2 text-xs text-muted">
        Why this classification: {item.classificationReason}
      </p>
    </article>
  );
}
