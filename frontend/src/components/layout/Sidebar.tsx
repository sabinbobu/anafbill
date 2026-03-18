import { NavLink, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  FileText,
  Users,
  Archive,
  MessageSquare,
  Settings,
  FileCheck,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/invoices", label: "Facturi", icon: FileText },
  { to: "/clients", label: "Clienți", icon: Users },
  { to: "/archive", label: "Arhivă", icon: Archive },
  { to: "/chat", label: "Asistent AI", icon: MessageSquare },
  { to: "/settings", label: "Setări", icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const { user, signOut } = useAuth()

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-30">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700">
        <FileCheck className="h-7 w-7 text-blue-400" />
        <span className="text-xl font-bold tracking-tight">Anaf Bill</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive =
              location.pathname === to ||
              (to !== "/dashboard" && location.pathname.startsWith(to))
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-700 px-4 py-4">
        <p className="text-xs text-slate-400 truncate mb-2">{user?.email}</p>
        <button
          onClick={() => void signOut()}
          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Deconectare
        </button>
      </div>
    </aside>
  )
}
