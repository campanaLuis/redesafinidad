import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Share2, Users, Shield, UserCheck,
  MessageSquare, Phone, Landmark, LogOut, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const mainNav: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/",                    label: "Panel",                icon: LayoutDashboard,  end: true },
  { to: "/redes-de-afinidad",   label: "Redes de Afinidad",    icon: Users },
  { to: "/ejercito-digital",    label: "Ejercito Digital",     icon: Shield },
  { to: "/beneficiarios",       label: "Beneficiarios",        icon: UserCheck },
  { to: "/atencion-ciudadana",  label: "Atención Ciudadana",   icon: MessageSquare },
  { to: "/redes-sociales",      label: "Redes Sociales",       icon: Share2 },
  { to: "/encuesta-telefonica", label: "Encuesta Telefónica",  icon: Phone },
  { to: "/estructura-territorial", label: "Estructura Territorial", icon: Landmark },
];

const SIDEBAR_KEY = "dashboard-sidebar-collapsed";

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_KEY);
    setCollapsed(stored === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  }, [collapsed]);

  function handleSignOut() {
    signOut();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      className={cn(
        "hidden h-screen shrink-0 flex-col border-r border-border/60 bg-card transition-[width] duration-200 md:flex",
        collapsed ? "w-[64px]" : "w-[240px]",
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex h-14 shrink-0 items-center border-b border-border/50",
        collapsed ? "justify-center px-3" : "justify-between px-4",
      )}>
        <Link
          to="/"
          className="flex items-center gap-2.5 outline-none"
          title="Red Afinidad"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-3.5 w-3.5" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Red Afinidad
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Contraer sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="flex justify-center border-b border-border/50 py-2">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Expandir sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className={cn("flex-1 overflow-y-auto py-3 scrollbar-hide", collapsed ? "px-2" : "px-3")}>
        <ul className="space-y-0.5">
          {mainNav.map(({ to, label, icon: Icon, end }) => {
            const active = end
              ? location.pathname === to
              : location.pathname === to || location.pathname.startsWith(`${to}/`);
            return (
              <li key={to}>
                <Link
                  to={to}
                  title={label}
                  className={cn(
                    "flex items-center rounded-xl text-sm transition-colors",
                    collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2",
                    active
                      ? "bg-primary/8 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className={cn("shrink-0 border-t border-border/50 py-3", collapsed ? "px-2" : "px-3")}>
        {!collapsed && user && (
          <p className="mb-2 truncate px-3 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">{user.login}</span>
            <span className="mx-1 opacity-40">·</span>
            {user.role}
          </p>
        )}
        <button
          onClick={handleSignOut}
          title="Cerrar sesión"
          className={cn(
            "flex w-full items-center rounded-xl text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
            collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
