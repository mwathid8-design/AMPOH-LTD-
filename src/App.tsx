import * as React from "react";
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MedicalLogin } from "./components/ui/medical-login";
import { ClinicLimelightNav } from "./components/ui/clinic-limelight-nav";
import { Dashboard } from "./pages/Dashboard";
import { Patients } from "./pages/Patients";
import { Consultation } from "./pages/Consultation";
import { Lab } from "./pages/Lab";
import { FamilyPlanning } from "./pages/FamilyPlanning";
import { Billing } from "./pages/Billing";
import { Debts } from "./pages/Debts";
import { OTCSales } from "./pages/OTCSales";
import { Calendar } from "./pages/Calendar";
import { Reports } from "./pages/Reports";
import { Admin } from "./pages/Admin";
import { Procedures } from "./pages/Procedures";
import { Branch } from "./types";

function AppContent() {
  const { user, logout, switchBranch, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const path = location.pathname.split("/")[1] || "dashboard";
    setActiveTab(path);
  }, [location]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <MedicalLogin />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <ClinicLimelightNav 
        activeTab={activeTab} 
        onTabChange={(id) => {
          setActiveTab(id);
          navigate(`/${id}`);
        }}
        userRole={user.role}
        userBranch={user.branch}
        onLogout={logout}
      />
      
      <main className="flex-1 overflow-y-auto bg-slate-950 custom-scrollbar">
        <div className="p-8 max-w-7xl mx-auto">
          {/* Header with Branch Switcher for Admin */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight capitalize">{activeTab.replace("-", " ")}</h1>
              <p className="text-slate-500 text-sm">Welcome back, {user.displayName}</p>
            </div>
            {user.role === 'ADMIN' && (
              <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {(['AMPOH LIMITED', 'AMPOH MEDICAL CENTRE', 'COMBINED'] as Branch[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => switchBranch(b)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                      user.branch === b 
                        ? "bg-blue-600 text-white shadow-lg" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/consultation" element={<Consultation />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/procedures" element={<Procedures />} />
            <Route path="/family-planning" element={<FamilyPlanning />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/otc" element={<OTCSales />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
