// LEGEND: Pipeline checksum utilities — deterministic hashes for step input/output
// These helpers normalize payloads before hashing for stable observability
// All usage must comply with this LEGEND and the LICENSE

async function sha256(params: { data: string }): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(params.data)
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      normalized[key] = normalizeValue(record[key]);
    }
    return normalized;
  }

  return value;
}

async function computeChecksum(params: { data: unknown }): Promise<string> {
  const normalized = normalizeValue(params.data ?? null);
  const serialized = JSON.stringify(normalized);
  return sha256({ data: serialized ?? "null" });
}

export async function computeInputChecksum(params: {
  data: unknown;
}): Promise<string> {
  return computeChecksum({ data: params.data });
}

export async function computeOutputChecksum(params: {
  data: unknown;
}): Promise<string> {
  return computeChecksum({ data: params.data });
}
