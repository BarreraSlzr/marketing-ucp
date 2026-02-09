import { DashboardClient } from "./dashboard-client";
import { getDashboardSessions } from "./data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessions = await getDashboardSessions();
  return <DashboardClient initialSessions={sessions} />;
}
