import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n";
import { createNavigation } from "next-intl/navigation";

export const { Link, redirect, usePathname, useRouter } =
  createNavigation({
    locales: SUPPORTED_LOCALES,
    defaultLocale: DEFAULT_LOCALE,
    localePrefix: DEFAULT_LOCALE === "en-US" ? "as-needed" : "always",
  });
