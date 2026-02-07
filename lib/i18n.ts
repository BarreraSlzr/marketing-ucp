export const SUPPORTED_LOCALES = ["en-US", "es-ES"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en-US";

export const LOCALE_LABELS: Record<Locale, string> = {
  "en-US": "English",
  "es-ES": "Espanol",
};

export function prefixPath(params: { locale: Locale; path: string }): string {
  const path = params.path.startsWith("/") ? params.path : `/${params.path}`;
  if (params.locale === DEFAULT_LOCALE) {
    return path;
  }
  return `/${params.locale}${path}`;
}
