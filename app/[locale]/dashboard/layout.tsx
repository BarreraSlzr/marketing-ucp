import { Link } from "@/i18n/navigation";
import { Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import styles from "./dashboard.module.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-dashboard",
});

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.dashboardShell} ${spaceGrotesk.variable}`}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandBadge}>UCP</div>
          <div>
            <div className={styles.brandTitle}>Pipeline Dashboard</div>
            <div className={styles.brandSub}>Observability Console</div>
          </div>
        </div>
        <nav className={styles.nav}>
          <Link className={styles.navLink} href="/dashboard">
            Overview
          </Link>
          <Link className={styles.navLink} href="/dashboard/events">
            Event Stream
          </Link>
          <Link className={styles.navLink} href="/dashboard/handlers">
            Handler Health
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.footerLabel}>In-memory demo</div>
          <div className={styles.footerHint}>
            Generate events via /api/pipeline/demo
          </div>
        </div>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
