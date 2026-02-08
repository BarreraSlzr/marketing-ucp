import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
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
    <SidebarProvider
      className={`${styles.dashboardShell} ${spaceGrotesk.variable}`}
    >
      <div className={styles.sidebarBackground} aria-hidden="true" />
      <Sidebar className={styles.sidebar}>
        <SidebarHeader>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-primary)] text-sm font-semibold tracking-[0.02em] text-[var(--color-primary-foreground)]">
            UCP
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--color-foreground)]">
              Pipeline Dashboard
            </div>
            <div className="text-xs text-[var(--color-muted-foreground)]">
              Observability Console
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard">Overview</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/events">Event Stream</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard/handlers">Handler Health</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="text-xs font-semibold text-[var(--color-foreground)]">
            In-memory demo
          </div>
          <div className="text-xs text-[var(--color-muted-foreground)]">
            Generate events via /api/pipeline/demo
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className={styles.content}>{children}</SidebarInset>
    </SidebarProvider>
  );
}
