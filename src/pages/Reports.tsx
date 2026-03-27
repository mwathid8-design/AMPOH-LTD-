import * as React from "react";
import { useState, useEffect } from "react";
import { 
  FileText, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Download, 
  Printer, 
  Search, 
  Calendar, 
  Filter,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Separator } from "@/src/components/ui/separator";
import { useAuth } from "@/src/context/AuthContext";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export function Reports() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState("REVENUE");
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalPatients: 0,
    avgBill: 0,
    totalRevenue: 0
  });

  const [topDiagnoses, setTopDiagnoses] = useState<any[]>([]);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        // Fetch revenue for last 7 days
        const revenue = [];
        let totalRev = 0;
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const start = startOfDay(date);
          const end = endOfDay(date);

          const q = user.branch === 'COMBINED'
            ? query(collection(db, "bills"), where("createdAt", ">=", start.toISOString()), where("createdAt", "<=", end.toISOString()))
            : query(collection(db, "bills"), where("branch", "==", user.branch), where("createdAt", ">=", start.toISOString()), where("createdAt", "<=", end.toISOString()));

          const snapshot = await getDocs(q);
          const total = snapshot.docs.reduce((acc, doc) => acc + (doc.data().totalAmount || 0), 0);
          totalRev += total;
          revenue.push({
            name: format(date, "MMM dd"),
            revenue: total
          });
        }
        setRevenueData(revenue);

        // Fetch top diagnoses
        const visitsQ = user.branch === 'COMBINED'
          ? query(collection(db, "visits"), limit(100))
          : query(collection(db, "visits"), where("branch", "==", user.branch), limit(100));
        const visitsSnapshot = await getDocs(visitsQ);
        const diagnosisMap: Record<string, number> = {};
        visitsSnapshot.docs.forEach(doc => {
          const d = doc.data().diagnosis;
          if (d) {
            diagnosisMap[d] = (diagnosisMap[d] || 0) + 1;
          }
        });
        const diagnosisData = Object.entries(diagnosisMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        setTopDiagnoses(diagnosisData);

        // Fetch total patients
        const patientsQ = user.branch === 'COMBINED'
          ? query(collection(db, "patients"))
          : query(collection(db, "patients"), where("branch", "==", user.branch));
        const patientsSnapshot = await getDocs(patientsQ);
        
        // Fetch all bills to calculate avg
        const billsQ = user.branch === 'COMBINED'
          ? query(collection(db, "bills"))
          : query(collection(db, "bills"), where("branch", "==", user.branch));
        const billsSnapshot = await getDocs(billsQ);
        const allBillsTotal = billsSnapshot.docs.reduce((acc, doc) => acc + (doc.data().totalAmount || 0), 0);
        const avgBill = billsSnapshot.size > 0 ? allBillsTotal / billsSnapshot.size : 0;

        setStats({
          totalPatients: patientsSnapshot.size,
          avgBill,
          totalRevenue: totalRev
        });

      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [user]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const csvRows = [
      ["Date", "Revenue"],
      ...revenueData.map(d => [d.name, d.revenue])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Revenue_Report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportCategories = [
    { id: "REVENUE", label: "Financial Reports", icon: TrendingUp, items: ["Daily Revenue", "Monthly Summary", "Outstanding Debts", "Insurance Claims"] },
    { id: "PATIENTS", label: "Patient Reports", icon: BarChart3, items: ["MOH 705A (Under 5)", "MOH 705B (Over 5)", "Daily Attendance", "TCA List"] },
    { id: "CLINICAL", label: "Clinical Reports", icon: FileText, items: ["Diagnosis Summary", "Lab Workload", "FP Method Usage", "Prescription Trends"] },
    { id: "INVENTORY", label: "Inventory Reports", icon: PieChart, items: ["Stock Levels", "Expiring Items", "OTC Sales Summary", "Drug Usage"] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white">System Reports & Analytics</h2>
          <Badge variant="outline" className="border-slate-800 text-slate-500">
            {user?.branch} Branch
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-slate-800 text-slate-400 h-9" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" className="border-slate-800 text-slate-400 h-9" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Categories */}
        <div className="space-y-4">
          {reportCategories.map(cat => (
            <Card key={cat.id} className="bg-slate-900 border-slate-800 overflow-hidden">
              <CardHeader className="p-4 border-b border-slate-800 bg-slate-900/50">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <cat.icon className="w-4 h-4 text-blue-500" />
                  {cat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-800">
                  {cat.items.map(item => (
                    <button 
                      key={item}
                      onClick={() => setReportType(item.toUpperCase().replace(/ /g, "_"))}
                      className="w-full text-left p-3 text-xs text-slate-500 hover:text-blue-400 hover:bg-slate-800/30 transition-all flex items-center justify-between group"
                    >
                      {item}
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReportStatCard label="Total Revenue" value={`KES ${stats.totalRevenue.toLocaleString()}`} trend="Real-time" up />
            <ReportStatCard label="Total Patients" value={stats.totalPatients.toString()} trend="All-time" up />
            <ReportStatCard label="Avg. Bill" value={`KES ${stats.avgBill.toFixed(0)}`} trend="Overall" up={true} />
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Revenue Trend (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center text-slate-500">Loading revenue data...</div>
              ) : revenueData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `K${v/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                  No revenue data available.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Top Diagnoses</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-48 flex items-center justify-center text-slate-500">Loading diagnoses...</div>
              ) : topDiagnoses.length > 0 ? (
                <div className="space-y-4">
                  {topDiagnoses.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">
                          {i + 1}
                        </div>
                        <span className="text-sm text-slate-200">{d.name}</span>
                      </div>
                      <Badge variant="secondary" className="bg-slate-800 text-slate-400">
                        {d.count} Cases
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 p-6 text-center border-2 border-dashed border-slate-800 rounded-xl">
                  <BarChart3 className="w-8 h-8 mb-2 opacity-10" />
                  <p className="text-xs">No diagnosis data available for the selected period.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReportStatCard({ label, value, trend, up }: any) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-6">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-end justify-between">
          <p className="text-xl font-bold text-white font-mono">{value}</p>
          <div className={cn("flex items-center text-[10px] font-bold", up ? "text-emerald-500" : "text-red-500")}>
            {up ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            {trend}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

