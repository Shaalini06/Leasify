import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "./Button";
import {
  Home,
  Upload,
  Search,
  MessageSquare,
  Clock,
  Settings,
  LogOut,
  BarChart2,
} from "react-feather";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/upload", label: "Upload Contract", icon: Upload },
  { to: "/vin", label: "VIN Lookup", icon: Search },
  { to: "/chat", label: "Negotiation AI", icon: MessageSquare },
  { to: "/history", label: "History", icon: Clock },
  { to: "/comparison", label: "Compare Deals", icon: BarChart2 },
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
    <aside className="sidebar-nav fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-bg-secondary to-bg-primary border-r border-white/8 text-white flex flex-col shadow-2xl z-30 backdrop-blur-sm overflow-hidden">
      {/* Brand */}
      <div className="px-6 py-8 border-b border-white/8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-red to-accent-red-dark flex items-center justify-center shadow-glow">
            <span className="text-xl">🏎️</span>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary" style={{ fontFamily: "'Outfit', sans-serif" }}>
              LEASIFY
            </h1>
            <p className="text-[10px] font-medium text-accent-red-light tracking-wider uppercase">
              Smart Lease Analysis
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="text-text-tertiary text-[10px] font-bold px-3 mb-4 tracking-widest uppercase">
          NAVIGATION
        </p>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-accent-red/15 text-accent-red-light border border-accent-red/25 shadow-sm"
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
      <div className="px-4 py-4 border-t border-white/8 space-y-3">
        {user && (
          <div className="px-3 py-3 rounded-xl bg-white/5 border border-white/8">
            <p className="text-text-tertiary text-xs mb-1">Signed in as</p>
            <p className="text-text-primary font-medium truncate text-sm">
              {user.full_name || user.email}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center gap-2 text-text-secondary hover:text-accent-red-light"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
