import { UserRole } from "@/types/recipe";

interface AppHeaderProps {
  title: string;
  userRole: UserRole;
  onLogout: () => void;
}

const AppHeader = ({ title, userRole, onLogout }: AppHeaderProps) => (
  <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
    <h1 className="text-xl font-semibold text-foreground">{title}</h1>
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
          {userRole === "admin" ? "A" : "U"}
        </div>
        <span className="text-sm font-medium text-foreground capitalize">{userRole}</span>
      </div>
      <button
        onClick={onLogout}
        className="px-3 py-1.5 rounded-lg border border-input text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        Logout
      </button>
    </div>
  </header>
);

export default AppHeader;
