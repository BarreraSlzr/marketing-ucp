import { getIsoTimestamp } from "@/utils/stamp";
import { kv } from "@vercel/kv";

const usePersistentStorage = Boolean(
  process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN &&
    process.env.VERCEL
);

const WEBHOOK_IDEMPOTENCY_PREFIX = "ucp:webhooks:processed";
const processedWebhookIds = new Set<string>();

function webhookKey(params: { event_id: string }): string {
  return `${WEBHOOK_IDEMPOTENCY_PREFIX}:${params.event_id}`;
}

export async function hasProcessedWebhookEvent(params: {
  event_id: string;
}): Promise<boolean> {
  if (!usePersistentStorage) {
    return processedWebhookIds.has(params.event_id);
  }

  const stored = await kv.get(webhookKey({ event_id: params.event_id }));
  return Boolean(stored);
}

export async function markWebhookEventProcessed(params: {
  event_id: string;
}): Promise<void> {
  if (!usePersistentStorage) {
    processedWebhookIds.add(params.event_id);
    return;
  }

  await kv.set(webhookKey({ event_id: params.event_id }), getIsoTimestamp());
}
