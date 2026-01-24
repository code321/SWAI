import type { DashboardDTO, UsageDailyDTO } from "@/types";
import { CreateSetCard } from "./CreateSetCard";
import { ContinueSessionCard } from "./ContinueSessionCard";
import { StatsCard } from "./StatsCard";

interface DashboardGridProps {
  dashboard: DashboardDTO;
  usage: UsageDailyDTO;
}

/**
 * DashboardGrid component
 *
 * Main layout component for the dashboard
 * Renders all dashboard cards in a responsive grid
 */
export function DashboardGrid({ dashboard, usage }: DashboardGridProps) {
  const hasActiveSession = dashboard.active_session !== null && dashboard.active_session !== undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Create Set Card - always visible */}
      <CreateSetCard />

      {/* Continue Session Card - conditional */}
      {hasActiveSession && dashboard.active_session && <ContinueSessionCard activeSession={dashboard.active_session} />}

      {/* Stats Card - always visible */}
      <StatsCard setsTotal={dashboard.sets_total} />
    </div>
  );
}
