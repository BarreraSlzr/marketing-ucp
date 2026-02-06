// LEGEND: Canonical timestamp utilities
// Use only these re-exports for all fossil creation and metadata
// All usage must comply with this LEGEND and the LICENSE

export function getIsoTimestamp(): string {
  return new Date().toISOString();
}

export function getIsoTimestampFromUnix(params: { seconds: number }): string {
  return new Date(params.seconds * 1000).toISOString();
}

export function generateStamp(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${getIsoTimestamp()}-${random}`;
}
