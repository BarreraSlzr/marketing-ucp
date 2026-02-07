import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n";
import { createSharedPathnamesNavigation } from "next-intl/navigation";

export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation({
    locales: SUPPORTED_LOCALES,
    localePrefix: DEFAULT_LOCALE === "en-US" ? "as-needed" : "always",
  });
