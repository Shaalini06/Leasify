import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "./Button";
import {
  Home,
  Upload,
  BarChart2,
  MessageSquare,
  Clock,
  Settings,
  LogOut,
} from "react-feather";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/upload", label: "Upload Contract", icon: Upload },
  { to: "/analysis", label: "Analysis", icon: BarChart2 },
  { to: "/chat", label: "Negotiation", icon: MessageSquare },
  { to: "/history", label: "History", icon: Clock },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-bg-secondary to-bg-primary border-r border-white/10 text-white flex flex-col shadow-2xl z-30 backdrop-blur-sm overflow-hidden">
      {/* Brand */}
      <div className="px-6 py-8 border-b border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent-blue flex items-center justify-center">
            <span className="text-lg font-bold">⚡</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">LEASIFY</h1>
            <p className="text-xs text-text-tertiary">Smart Lease Analysis</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        <p className="text-text-tertiary text-xs font-semibold px-3 mb-4 upper case">
          MENU
        </p>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? "bg-white/10 text-text-primary border border-white/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="px-4 py-4 border-t border-white/10 space-y-4">
        {user && (
          <div className="px-3 py-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-text-secondary text-xs mb-1">Signed in as</p>
            <p className="text-text-primary font-medium truncate">
              {user.email}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center gap-2"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
