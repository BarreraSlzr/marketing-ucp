import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n";
import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: DEFAULT_LOCALE === "en-US" ? "as-needed" : "always",
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
