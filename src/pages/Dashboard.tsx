import * as React from "react";
import { useState, useEffect } from "react";
import { ClinicRadialTimeline } from "@/src/components/ui/clinic-radial-timeline";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";
import { 
  Users, 
  Stethoscope, 
  FlaskConical, 
  Receipt, 
  BadgeDollarSign, 
  CalendarDays,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { motion } from "framer-motion";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { db } from "@/src/firebase";
import { collection, query, where, onSnapshot, getCountFromServer } from "firebase/firestore";

export function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalPatients: 0,
    todayVisits: 0,
    revenue: 0,
    debt: 0
  });
  const [chartData, setChartData] = useState([
    { name: "Mon", patients: 0, revenue: 0 },
    { name: "Tue", patients: 0, revenue: 0 },
    { name: "Wed", patients: 0, revenue: 0 },
    { name: "Thu", patients: 0, revenue: 0 },
    { name: "Fri", patients: 0, revenue: 0 },
    { name: "Sat", patients: 0, revenue: 0 },
    { name: "Sun", patients: 0, revenue: 0 },
  ]);

  useEffect(() => {
    if (!user) return;

    // 1. Total Patients
    const patientsQuery = user.branch === 'COMBINED' 
      ? collection(db, "patients") 
      : query(collection(db, "patients"), where("branch", "==", user.branch));
    
    const unsubscribePatients = onSnapshot(patientsQuery, (snapshot) => {
      setMetrics(prev => ({ ...prev, totalPatients: snapshot.size }));
    });

    // 2. Today's Visits & Revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const visitsQuery = user.branch === 'COMBINED'
      ? query(collection(db, "visits"), where("createdAt", ">=", today.toISOString()))
      : query(collection(db, "visits"), where("branch", "==", user.branch), where("createdAt", ">=", today.toISOString()));

    const unsubscribeVisits = onSnapshot(visitsQuery, (snapshot) => {
      setMetrics(prev => ({ ...prev, todayVisits: snapshot.size }));
      
      let totalRevenue = 0;
      let totalDebt = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalRevenue += (data.totalBill || 0);
        totalDebt += (data.balance || 0);
      });
      setMetrics(prev => ({ ...prev, revenue: totalRevenue, debt: totalDebt }));
    });

    // 3. Chart Data (Last 7 Days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const chartQueries = last7Days.map(date => {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      return user.branch === 'COMBINED'
        ? query(collection(db, "visits"), where("createdAt", ">=", start.toISOString()), where("createdAt", "<=", end.toISOString()))
        : query(collection(db, "visits"), where("branch", "==", user.branch), where("createdAt", ">=", start.toISOString()), where("createdAt", "<=", end.toISOString()));
    });

    const unsubscribesCharts = chartQueries.map((q, i) => {
      return onSnapshot(q, (snapshot) => {
        setChartData(prev => {
          const newData = [...prev];
          const dayName = last7Days[i].toLocaleDateString('en-US', { weekday: 'short' });
          let dayRevenue = 0;
          snapshot.docs.forEach(doc => {
            dayRevenue += (doc.data().totalBill || 0);
          });
          newData[i] = { name: dayName, patients: snapshot.size, revenue: dayRevenue };
          return newData;
        });
      });
    });

    return () => {
      unsubscribePatients();
      unsubscribeVisits();
      unsubscribesCharts.forEach(unsub => unsub());
    };
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Patients" 
          value={metrics.totalPatients.toLocaleString()} 
          change="+0%" 
          isUp={true} 
          icon={Users} 
          color="blue"
        />
        <MetricCard 
          title="Today's Visits" 
          value={metrics.todayVisits.toLocaleString()} 
          change="+0%" 
          isUp={true} 
          icon={Stethoscope} 
          color="emerald"
        />
        <MetricCard 
          title="Revenue (KES)" 
          value={metrics.revenue.toLocaleString()} 
          change="+0%" 
          isUp={true} 
          icon={Receipt} 
          color="amber"
        />
        <MetricCard 
          title="Outstanding Debt" 
          value={metrics.debt.toLocaleString()} 
          change="+0%" 
          isUp={false} 
          icon={BadgeDollarSign} 
          color="red"
        />
      </div>

      {/* Operations Hub (Radial Timeline) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Clinic Operations Hub</h2>
          <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
            Live Updates • {user?.branch}
          </Badge>
        </div>
        <ClinicRadialTimeline />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Patient Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Area type="monotone" dataKey="patients" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPatients)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Revenue Analysis (KES)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, isUp, icon: Icon, color }: any) {
  const colorClasses: any = {
    blue: "text-blue-500 bg-blue-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    red: "text-red-500 bg-red-500/10",
  };

  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-lg", colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
          <div className={cn(
            "flex items-center text-xs font-bold",
            isUp ? "text-emerald-500" : "text-red-500"
          )}>
            {isUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
            {change}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
