"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { DEFAULT_LOCALE, LOCALE_LABELS, SUPPORTED_LOCALES } from "@/lib/i18n";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";
import styles from "./locale-switcher.module.css";

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const currentLocale = SUPPORTED_LOCALES.includes(locale as never)
    ? locale
    : DEFAULT_LOCALE;

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value;
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    router.replace(url, { locale: nextLocale });
  }

  return (
    <label className={styles.label}>
      <span className={styles.labelText}>Locale</span>
      <select
        className={styles.select}
        value={currentLocale}
        onChange={handleChange}
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </option>
        ))}
      </select>
    </label>
  );
}
