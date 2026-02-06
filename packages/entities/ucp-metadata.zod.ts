import { z } from 'zod';

export const UCPCheckoutResponseSchema = z.object({
  version: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("UCP protocol version in YYYY-MM-DD format"),
  capabilities: z.array(CapabilitySchema).describe("Active capabilities for this response")
});

export const CapabilitySchema = z.object({
  name: z.string().describe("Capability identifier in reverse-domain notation"),
  version: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Capability version"),
  config: z.record(z.string(), z.any()).optional()
});