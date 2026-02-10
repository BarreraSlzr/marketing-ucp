import { kv } from "@vercel/kv";
import { z } from "zod";

// LEGEND: Cross-platform session bridge
// Use these utilities to link internal sessions with external platform data
// Enables unified view across Stripe, Shopify, and custom integrations
// All usage must comply with this LEGEND and the LICENSE

const CrossPlatformLinkSchema = z.object({
  sessionId: z.string(),
  platform: z.string(),
  externalId: z.string(),
  linkedAt: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type CrossPlatformLink = z.infer<typeof CrossPlatformLinkSchema>;

interface LinkSessionParams {
  sessionId: string;
  platform: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Link an internal session to an external platform
 * Stores the mapping in KV for future queries
 */
export async function linkSessionToPlatform(
  params: LinkSessionParams
): Promise<void> {
  const link: CrossPlatformLink = {
    sessionId: params.sessionId,
    platform: params.platform,
    externalId: params.externalId,
    linkedAt: new Date().toISOString(),
    metadata: params.metadata,
  };

  // Store bi-directional mapping
  await Promise.all([
    kv.set(
      `cross-platform:session:${params.sessionId}:${params.platform}`,
      link
    ),
    kv.set(
      `cross-platform:external:${params.platform}:${params.externalId}`,
      link
    ),
  ]);

  // Emit event for audit trail
  await kv.lpush("cross-platform:events", {
    type: "cross_platform_link_created",
    ...link,
  });
}

interface GetLinkedPlatformsParams {
  sessionId: string;
}

/**
 * Get all external platform links for a session
 */
export async function getLinkedPlatforms(
  params: GetLinkedPlatformsParams
): Promise<CrossPlatformLink[]> {
  const pattern = `cross-platform:session:${params.sessionId}:*`;
  const keys = await kv.keys(pattern);

  const links = await Promise.all(
    keys.map((key) => kv.get<CrossPlatformLink>(key))
  );

  return links.filter((link): link is CrossPlatformLink => link !== null);
}

interface GetSessionByExternalIdParams {
  platform: string;
  externalId: string;
}

/**
 * Find internal session by external platform ID
 */
export async function getSessionByExternalId(
  params: GetSessionByExternalIdParams
): Promise<CrossPlatformLink | null> {
  const key = `cross-platform:external:${params.platform}:${params.externalId}`;
  return await kv.get<CrossPlatformLink>(key);
}

export interface CrossPlatformSessionData {
  sessionId: string;
  workflowId?: string;
  internalEvents: unknown[];
  externalData: Record<string, unknown>;
}

interface GetCrossPlatformSessionDataParams {
  sessionId: string;
  platforms?: string[];
}

/**
 * Fetch unified session data from internal and external sources
 * Returns merged view of all linked platform data
 */
export async function getCrossPlatformSessionData(
  params: GetCrossPlatformSessionDataParams
): Promise<CrossPlatformSessionData> {
  // Fetch internal events
  const internalEventsResponse = await fetch(
    `/api/pipeline/events?sessionId=${params.sessionId}`
  );
  const internalData = await internalEventsResponse.json();

  // Get all linked platforms
  const links = await getLinkedPlatforms({ sessionId: params.sessionId });

  // Filter by requested platforms if specified
  const filteredLinks = params.platforms
    ? links.filter((link) => params.platforms!.includes(link.platform))
    : links;

  // Fetch external data from each platform
  const externalData: Record<string, unknown> = {};
  for (const link of filteredLinks) {
    try {
      const platformData = await fetchPlatformData({
        platform: link.platform,
        externalId: link.externalId,
      });
      externalData[link.platform] = platformData;
    } catch (error) {
      console.warn(`Failed to fetch ${link.platform} data:`, error);
      externalData[link.platform] = { error: "Failed to fetch" };
    }
  }

  return {
    sessionId: params.sessionId,
    workflowId: internalData.events?.[0]?.workflowId,
    internalEvents: internalData.events || [],
    externalData,
  };
}

interface FetchPlatformDataParams {
  platform: string;
  externalId: string;
}

/**
 * Fetch data from external platform APIs
 * Delegates to platform-specific integrations
 */
async function fetchPlatformData(
  params: FetchPlatformDataParams
): Promise<unknown> {
  // Dynamic import of platform-specific bridge
  try {
    const bridge = await import(`./integrations/${params.platform}-bridge`);
    return await bridge.fetchExternalData({ externalId: params.externalId });
  } catch (error) {
    throw new Error(
      `Platform ${params.platform} integration not found or failed`
    );
  }
}
