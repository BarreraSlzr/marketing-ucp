import { z } from "zod";

// LEGEND: Canonical support ticket and communication record schemas
// These Zod schemas define ticket tracking, communication threads, and feedback records
// All usage must comply with this LEGEND and the LICENSE

/* ── Ticket Status ───────────────────────────────────────── */
export const TicketStatusSchema = z.enum([
  "open",
  "in_progress",
  "waiting_on_customer",
  "waiting_on_merchant",
  "escalated",
  "resolved",
  "closed",
]);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

/* ── Ticket Priority ─────────────────────────────────────── */
export const TicketPrioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "critical",
]);
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;

/* ── Ticket Role ─────────────────────────────────────────── */
export const TicketRoleSchema = z.enum([
  "customer",
  "merchant",
  "support_agent",
  "system",
]);
export type TicketRole = z.infer<typeof TicketRoleSchema>;

/* ── Communication Message ───────────────────────────────── */
export const TicketMessageSchema = z.object({
  /** Unique message identifier */
  id: z.string().min(1),
  /** ID of the parent ticket */
  ticketId: z.string().min(1),
  /** Who sent this message */
  senderRole: TicketRoleSchema,
  /** Sender identifier (email, merchant ID, agent ID, or "system") */
  senderId: z.string().min(1),
  /** Message content */
  content: z.string().min(1),
  /** Content type */
  contentType: z.enum(["plain", "markdown"]).default("plain"),
  /** Optional attachment URLs */
  attachments: z.array(z.string().url()).optional(),
  /** When the message was sent */
  createdAt: z.string(),
  /** Whether this is an internal note (not visible to customer) */
  internal: z.boolean().default(false),
});
export type TicketMessage = z.infer<typeof TicketMessageSchema>;

/* ── Support Ticket ──────────────────────────────────────── */
export const SupportTicketSchema = z.object({
  /** Unique ticket identifier */
  id: z.string().min(1),
  /** Subject line */
  subject: z.string().min(1),
  /** Current status */
  status: TicketStatusSchema.default("open"),
  /** Priority level */
  priority: TicketPrioritySchema.default("normal"),
  /** Category of the issue */
  issueType: z.string().min(1),
  /** Who created the ticket */
  createdBy: TicketRoleSchema,
  /** Creator identifier (email or merchant ID) */
  creatorId: z.string().min(1),
  /** Associated order ID, if any */
  orderId: z.string().optional(),
  /** Associated merchant ID, if any */
  merchantId: z.string().optional(),
  /** The onboarding template used to create this ticket */
  templateId: z.string().min(1),
  /** Communication thread */
  messages: z.array(TicketMessageSchema).default([]),
  /** Tags for categorization */
  tags: z.array(z.string()).default([]),
  /** When the ticket was created */
  createdAt: z.string(),
  /** When the ticket was last updated */
  updatedAt: z.string(),
  /** When the ticket was resolved/closed */
  resolvedAt: z.string().optional(),
  /** Resolution summary */
  resolutionSummary: z.string().optional(),
});
export type SupportTicket = z.infer<typeof SupportTicketSchema>;

/* ── Feedback / Review Record ────────────────────────────── */
export const FeedbackRecordSchema = z.object({
  /** Unique feedback record identifier */
  id: z.string().min(1),
  /** Associated order ID */
  orderId: z.string().optional(),
  /** Associated merchant ID */
  merchantId: z.string().optional(),
  /** Who submitted the feedback */
  submittedBy: TicketRoleSchema,
  /** Submitter identifier */
  submitterId: z.string().min(1),
  /** The onboarding template used to create this record */
  templateId: z.string().min(1),
  /** Overall rating (1-5) */
  overallRating: z.number().min(1).max(5),
  /** Category-specific ratings */
  ratings: z.record(z.string(), z.number().min(1).max(5)).optional(),
  /** Review title */
  title: z.string().optional(),
  /** Review comments */
  comments: z.string().optional(),
  /** Would recommend */
  wouldRecommend: z.enum(["yes", "maybe", "no"]),
  /** Photo/attachment URLs */
  attachments: z.array(z.string().url()).optional(),
  /** Whether the review is publicly visible */
  published: z.boolean().default(false),
  /** When the feedback was submitted */
  createdAt: z.string(),
  /** When the feedback was last modified */
  updatedAt: z.string(),
});
export type FeedbackRecord = z.infer<typeof FeedbackRecordSchema>;
