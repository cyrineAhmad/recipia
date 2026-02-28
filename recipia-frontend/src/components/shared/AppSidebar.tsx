import { UserRole } from "@/types/recipe";
import { UtensilsCrossed, BookOpen, User, ChefHat, Sparkles, Inbox, Users } from "lucide-react";

interface AppSidebarProps {
  userRole: UserRole;
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const AppSidebar = ({ userRole, activePage, onNavigate, isOpen = true, onClose }: AppSidebarProps) => {
  const navItems = [
    { id: "recipes", label: "Recipes", icon: BookOpen, roles: ["admin", "user"] as UserRole[] },
    { id: "shared", label: "Shared With Me", icon: Users, roles: ["admin", "user"] as UserRole[] },
    { id: "manage", label: "Manage Recipes", icon: UtensilsCrossed, roles: ["admin"] as UserRole[] },
    { id: "suggestions", label: "Recipe Suggestions", icon: Inbox, roles: ["admin"] as UserRole[] },
    { id: "suggest", label: "Suggest Recipe", icon: Sparkles, roles: ["user"] as UserRole[] },
    { id: "profile", label: "Profile", icon: User, roles: ["admin", "user"] as UserRole[] },
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-60 h-screen border-r border-sidebar-border bg-sidebar 
          flex flex-col shrink-0 transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <button 
          onClick={() => handleNavigate("recipes")}
          className="p-5 flex items-center gap-2.5 hover:bg-sidebar-accent/50 transition-colors"
        >
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground tracking-tight">Recipia</span>
        </button>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems
            .filter((item) => item.roles.includes(userRole))
            .map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
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
    </>
  );
};

export default AppSidebar;
