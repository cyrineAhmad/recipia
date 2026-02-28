import { UserRole } from "@/types/recipe";
import { UtensilsCrossed, BookOpen, User, ChefHat, Sparkles, Inbox } from "lucide-react";

interface AppSidebarProps {
  userRole: UserRole;
  activePage: string;
  onNavigate: (page: string) => void;
}

const AppSidebar = ({ userRole, activePage, onNavigate }: AppSidebarProps) => {
  const navItems = [
    { id: "recipes", label: "Recipes", icon: BookOpen, roles: ["admin", "user"] as UserRole[] },
    { id: "manage", label: "Manage Recipes", icon: UtensilsCrossed, roles: ["admin"] as UserRole[] },
    { id: "suggestions", label: "Recipe Suggestions", icon: Inbox, roles: ["admin"] as UserRole[] },
    { id: "suggest", label: "Suggest Recipe", icon: Sparkles, roles: ["user"] as UserRole[] },
    { id: "profile", label: "Profile", icon: User, roles: ["admin", "user"] as UserRole[] },
  ];

  return (
    <aside className="w-60 h-screen border-r border-sidebar-border bg-sidebar flex flex-col shrink-0">
      <div className="p-5 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
          <ChefHat className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg text-foreground tracking-tight">Recipia</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems
          .filter((item) => item.roles.includes(userRole))
          .map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </button>
            );
          })}
      </nav>
    </aside>
  );
};

export default AppSidebar;
