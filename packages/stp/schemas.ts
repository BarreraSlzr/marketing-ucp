import { z } from "zod";

/* ── STP SPEI Inbound Order (cobro) ──────────────────────── */

export const StpSpeiInOrderSchema = z.object({
  /** Company registration alias in STP */
  empresa: z.string(),
  /** Ordered CLABE to receive funds */
  cuentaOrdenante: z.string().length(18).optional(),
  /** Beneficiary CLABE (your registered CLABE in STP) */
  cuentaBeneficiario: z.string().length(18),
  /** Amount in MXN */
  monto: z.number().min(0.01),
  /** Payment concept visible in bank statement */
  conceptoPago: z.string().max(40),
  /** Numeric reference (7 digits) */
  referenciaNumerica: z.number().int(),
  /** Tracking key — optional, STP generates one if omitted */
  claveRastreo: z.string().optional(),
  /** RFC of the payer */
  rfcCurpOrdenante: z.string().optional(),
  /** RFC of the beneficiary */
  rfcCurpBeneficiario: z.string().optional(),
  /** Nombre del ordenante */
  nombreOrdenante: z.string().optional(),
  /** Nombre del beneficiario */
  nombreBeneficiario: z.string().optional(),
  /** Tipo de pago: 1 = terceros, etc. */
  tipoPago: z.number().int().default(1),
  /** Institution code (bank) of payer */
  institucionContraparte: z.number().int().optional(),
});

export const StpSpeiInResponseSchema = z.object({
  /** STP-assigned operation ID */
  id: z.number().int(),
  /** Clave de rastreo assigned by STP */
  claveRastreo: z.string(),
  /** Status: "Liquidada", "Devuelta", "En proceso" */
  estado: z.string(),
  /** Registered amount */
  monto: z.number(),
  /** Timestamp */
  fechaOperacion: z.string().optional(),
});

/* ── STP SPEI Outbound Transfer (pago) ───────────────────── */

export const StpSpeiOutOrderSchema = z.object({
  empresa: z.string(),
  cuentaOrdenante: z.string().length(18),
  cuentaBeneficiario: z.string().length(18),
  nombreBeneficiario: z.string(),
  monto: z.number().min(0.01),
  conceptoPago: z.string().max(40),
  referenciaNumerica: z.number().int(),
  claveRastreo: z.string().optional(),
  institucionContraparte: z.number().int().describe("STP bank code of destination"),
  tipoCuentaBeneficiario: z.number().int().default(40).describe("40 = CLABE"),
  rfcCurpBeneficiario: z.string().optional(),
});

export const StpSpeiOutResponseSchema = z.object({
  id: z.number().int(),
  claveRastreo: z.string(),
  estado: z.string(),
  monto: z.number(),
  fechaOperacion: z.string().optional(),
});

/* ── STP Conciliation ────────────────────────────────────── */

export const StpConciliationEntrySchema = z.object({
  id: z.number().int(),
  claveRastreo: z.string(),
  cuentaBeneficiario: z.string(),
  cuentaOrdenante: z.string().optional(),
  monto: z.number(),
  conceptoPago: z.string(),
  estado: z.string(),
  fechaOperacion: z.string(),
  referenciaNumerica: z.number().int().optional(),
});

/* ── STP Webhook (Notificación) ──────────────────────────── */

export const StpWebhookNotificationSchema = z.object({
  id: z.number().int(),
  claveRastreo: z.string(),
  cuentaBeneficiario: z.string(),
  cuentaOrdenante: z.string().optional(),
  monto: z.number(),
  conceptoPago: z.string(),
  estado: z.enum(["Liquidada", "Devuelta", "En proceso", "Cancelada"]),
  fechaOperacion: z.string(),
  institucionOrdenante: z.number().int().optional(),
  nombreOrdenante: z.string().optional(),
  rfcCurpOrdenante: z.string().optional(),
});

export type StpSpeiInOrder = z.infer<typeof StpSpeiInOrderSchema>;
export type StpSpeiInResponse = z.infer<typeof StpSpeiInResponseSchema>;
export type StpSpeiOutOrder = z.infer<typeof StpSpeiOutOrderSchema>;
export type StpSpeiOutResponse = z.infer<typeof StpSpeiOutResponseSchema>;
export type StpConciliationEntry = z.infer<typeof StpConciliationEntrySchema>;
export type StpWebhookNotification = z.infer<typeof StpWebhookNotificationSchema>;
