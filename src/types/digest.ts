import type { z } from "zod";
import type {
  AuditRowSchema,
  DigestItemSchema,
  DigestRequestSchema,
  DigestResponseSchema,
  MemberVoteSchema,
  PageSchema,
  VoteSchema,
} from "../lib/schema";
import type { MATCH_VALUES, SOURCE_CHECK_VALUES } from "../lib/constants";

/**
 * Types only. Every shape here is inferred from src/lib/schema.ts — there are no
 * Zod calls in this file and no shape is redeclared.
 */

export type Page = z.infer<typeof PageSchema>;
export type DigestRequest = z.infer<typeof DigestRequestSchema>;
export type MemberVote = z.infer<typeof MemberVoteSchema>;
export type Vote = z.infer<typeof VoteSchema>;
export type DigestItem = z.infer<typeof DigestItemSchema>;
export type DigestResponse = z.infer<typeof DigestResponseSchema>;
export type AuditRow = z.infer<typeof AuditRowSchema>;

export type SourceCheck = (typeof SOURCE_CHECK_VALUES)[number];
export type MatchValue = (typeof MATCH_VALUES)[number];

/** Browser-only. The File itself is never sent anywhere; only `pages` is. */
export interface ExtractedDoc {
  id: string;
  filename: string;
  pages: Page[];
}

export type DocumentStatus =
  | "queued"
  | "extracting"
  | "processing"
  | "done"
  | "error";

/** One document's slot in the session. State lives in React only. */
export interface SessionDoc extends ExtractedDoc {
  status: DocumentStatus;
  error: string | null;
  result: DigestResponse | null;
}
