import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  MessageSquare,
  UserCircle,
  Stethoscope
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Patients", path: "/patients" },
  { icon: Stethoscope, label: "Doctors", path: "/doctors" },
  { icon: ShieldCheck, label: "Admins", path: "/admins" },
  { icon: MessageSquare, label: "Messages", path: "/messages" },
  { icon: UserCircle, label: "Profile", path: "/profile" },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col card-shadow h-screen sticky top-0">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Stethoscope className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">
              <span className="text-primary">Good</span>
              <span className="text-foreground">Health</span>
            </h1>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth text-sm font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          v1.0.0 • {new Date().getFullYear()}
        </div>
      </div>
    </aside>
  );
};
