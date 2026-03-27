import * as React from "react";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Stethoscope, 
  FlaskConical, 
  Scissors, 
  ShieldPlus, 
  Receipt, 
  BadgeDollarSign, 
  ShoppingCart, 
  CalendarDays, 
  FileBarChart, 
  Settings,
  ChevronRight,
  LogOut,
  Hospital
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Role, Branch } from "@/src/types";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { id: "patients", label: "Patients", icon: Users, href: "/patients" },
  { id: "consultation", label: "Consultation", icon: Stethoscope, href: "/consultation" },
  { id: "lab", label: "Lab", icon: FlaskConical, href: "/lab" },
  { id: "procedures", label: "Procedures", icon: Scissors, href: "/procedures" },
  { id: "family-planning", label: "Family Planning", icon: ShieldPlus, href: "/family-planning" },
  { id: "billing", label: "Billing", icon: Receipt, href: "/billing" },
  { id: "debts", label: "Debts", icon: BadgeDollarSign, href: "/debts" },
  { id: "otc", label: "OTC Sales", icon: ShoppingCart, href: "/otc" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, href: "/calendar" },
  { id: "reports", label: "Reports", icon: FileBarChart, href: "/reports" },
  { id: "admin", label: "Admin", icon: Settings, href: "/admin", adminOnly: true },
];

interface ClinicLimelightNavProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  userRole: Role;
  userBranch: Branch;
  onLogout: () => void;
}

export function ClinicLimelightNav({ 
  activeTab, 
  onTabChange, 
  userRole, 
  userBranch,
  onLogout 
}: ClinicLimelightNavProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredItems = navItems.filter(item => !item.adminOnly || userRole === 'ADMIN');

  return (
    <div 
      className={cn(
        "h-screen bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out z-50",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg shrink-0">
          <Hospital className="w-6 h-6 text-white" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <h2 className="text-sm font-bold text-white tracking-tight">AMPOH CMS</h2>
            <p className="text-[10px] text-blue-400 font-medium truncate">{userBranch}</p>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {filteredItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive 
                  ? "bg-blue-600/10 text-blue-400" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-500" : "group-hover:text-blue-400")} />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {isActive && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className={cn("flex items-center gap-3 mb-4", isCollapsed ? "justify-center" : "")}>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
            <Users className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{userRole} User</p>
              <p className="text-[10px] text-slate-500 truncate">Online</p>
            </div>
          )}
        </div>
        
        <button 
          onClick={onLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors",
            isCollapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="text-xs font-medium">Sign Out</span>}
        </button>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mt-4 w-full flex items-center justify-center p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <ChevronRight className={cn("w-4 h-4 transition-transform", isCollapsed ? "" : "rotate-180")} />
        </button>
      </div>
    </div>
  );
}
