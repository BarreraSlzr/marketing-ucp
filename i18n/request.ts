import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale =
    typeof locale === "string" && SUPPORTED_LOCALES.includes(locale as never)
      ? locale
      : DEFAULT_LOCALE;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
