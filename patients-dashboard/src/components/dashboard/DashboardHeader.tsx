import type { Booking } from "@/pages/Dashboard";
import { patientAuth } from "@/lib/api";

interface DashboardHeaderProps {
  booking: Booking | null;
}

const DashboardHeader = ({ booking }: DashboardHeaderProps) => {
  const user = patientAuth.getCurrentUser();

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-primary">GOOD</span>
            <span className="text-foreground">HEALTH</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>
          )}

          {booking && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold">
              <span className="text-sm">Queue</span>
              <span className="text-xl">#{booking.queue_number.toString().padStart(2, "0")}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
