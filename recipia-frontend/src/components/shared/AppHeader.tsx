import { UserRole } from "@/types/recipe";
import { Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

interface AppHeaderProps {
  title: string;
  userRole: UserRole;
  onLogout: () => void;
  onMenuClick?: () => void;
}

const AppHeader = ({ title, userRole, onLogout, onMenuClick }: AppHeaderProps) => (
  <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 shrink-0">
    <div className="flex items-center gap-3">
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
      )}
      <h1 className="text-lg sm:text-xl font-semibold text-foreground">{title}</h1>
    </div>
    <div className="flex items-center gap-2 sm:gap-3">
      <NotificationBell />
      {userRole === "admin" && (
        <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-muted">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs sm:text-sm font-semibold">
            A
          </div>
          <span className="hidden sm:inline text-sm font-medium text-foreground capitalize">admin</span>
        </div>
      )}
      <button
        onClick={onLogout}
        className="px-2 sm:px-3 py-1.5 rounded-lg border border-input text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        Logout
      </button>
    </div>
  </header>
);

export default AppHeader;
