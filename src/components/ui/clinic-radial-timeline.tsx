import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { 
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
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { db } from "@/src/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/src/context/AuthContext";

interface OrbitNode {
  id: string;
  title: string;
  icon: React.ElementType;
  count: number;
  status: 'pending' | 'in-progress' | 'completed' | 'urgent';
  details: string;
  relatedIds: string[];
}

export function ClinicRadialTimeline() {
  const { user } = useAuth();
  const [selectedNode, setSelectedNode] = useState<OrbitNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const baseQuery = (coll: string) => user.branch === 'COMBINED' 
      ? collection(db, coll) 
      : query(collection(db, coll), where("branch", "==", user.branch));

    // Listen to patients today
    const unsubPatients = onSnapshot(query(baseQuery("patients"), where("createdAt", ">=", todayStr)), (snap) => {
      setCounts(prev => ({ ...prev, reg: snap.size }));
    });

    // Listen to visits today
    const unsubVisits = onSnapshot(query(baseQuery("visits"), where("createdAt", ">=", todayStr)), (snap) => {
      const vData = snap.docs.map(d => d.data());
      setCounts(prev => ({
        ...prev,
        cons: vData.filter(v => v.status === 'CONSULTATION').length,
        lab_req: vData.filter(v => v.labStatus === 'PENDING').length,
        lab_res: vData.filter(v => v.labStatus === 'COMPLETED').length,
        proc: vData.filter(v => v.type === 'PROCEDURE').length,
        fp: vData.filter(v => v.type === 'FAMILY_PLANNING').length,
        bill: vData.filter(v => v.billingStatus === 'PENDING').length,
        debt: vData.filter(v => (v.balance || 0) > 0).length,
        otc: vData.filter(v => v.type === 'OTC').length
      }));
    });

    // Listen to appointments today
    const unsubApps = onSnapshot(query(baseQuery("appointments"), where("date", "==", today.toISOString().split('T')[0])), (snap) => {
      setCounts(prev => ({ ...prev, cal: snap.size }));
    });

    return () => {
      unsubPatients();
      unsubVisits();
      unsubApps();
    };
  }, [user]);

  const orbitNodes: OrbitNode[] = [
    { id: "reg", title: "Registrations", icon: Users, count: counts.reg || 0, status: 'completed', details: `${counts.reg || 0} new patients registered today`, relatedIds: ["cons"] },
    { id: "cons", title: "Consultations", icon: Stethoscope, count: counts.cons || 0, status: 'in-progress', details: `${counts.cons || 0} patients in consultation queue`, relatedIds: ["lab_req", "proc", "fp", "bill"] },
    { id: "lab_req", title: "Lab Requests", icon: FlaskConical, count: counts.lab_req || 0, status: 'pending', details: `${counts.lab_req || 0} pending lab collections`, relatedIds: ["lab_res"] },
    { id: "lab_res", title: "Lab Results", icon: Activity, count: counts.lab_res || 0, status: 'urgent', details: `${counts.lab_res || 0} results ready for review`, relatedIds: ["cons"] },
    { id: "proc", title: "Procedures", icon: Scissors, count: counts.proc || 0, status: 'in-progress', details: `${counts.proc || 0} procedures scheduled/active`, relatedIds: ["bill"] },
    { id: "fp", title: "Family Planning", icon: ShieldPlus, count: counts.fp || 0, status: 'completed', details: `${counts.fp || 0} FP services administered`, relatedIds: ["bill", "cal"] },
    { id: "bill", title: "Billing Pending", icon: Receipt, count: counts.bill || 0, status: 'pending', details: `${counts.bill || 0} invoices awaiting payment`, relatedIds: ["debt"] },
    { id: "debt", title: "Debt Follow-Up", icon: BadgeDollarSign, count: counts.debt || 0, status: 'urgent', details: `${counts.debt || 0} patients with outstanding balances`, relatedIds: ["bill"] },
    { id: "otc", title: "OTC Sales", icon: ShoppingCart, count: counts.otc || 0, status: 'completed', details: `${counts.otc || 0} pharmacy sales completed`, relatedIds: ["bill"] },
    { id: "cal", title: "Follow-Up / TCA", icon: CalendarDays, count: counts.cal || 0, status: 'pending', details: `${counts.cal || 0} appointments scheduled for today`, relatedIds: ["cons"] },
  ];

  const getStatusColor = (status: OrbitNode['status']) => {
    switch (status) {
      case 'completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'in-progress': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'pending': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'urgent': return 'text-red-500 bg-red-500/10 border-red-500/20';
    }
  };

  return (
    <div className="relative w-full h-[600px] flex items-center justify-center bg-slate-950/50 rounded-3xl border border-slate-800 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #334155 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      
      {/* Orbital Rings */}
      <div className="absolute w-[450px] h-[450px] border border-slate-800/50 rounded-full animate-[spin_60s_linear_infinite]" />
      <div className="absolute w-[300px] h-[300px] border border-slate-800/30 rounded-full animate-[spin_40s_linear_infinite_reverse]" />

      {/* Center Node */}
      <motion.div 
        className="relative z-10 w-32 h-32 rounded-full bg-blue-600/20 border border-blue-500/50 flex flex-col items-center justify-center cursor-pointer group"
        whileHover={{ scale: 1.05 }}
        onClick={() => setSelectedNode(null)}
      >
        <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse" />
        <Hospital className="w-8 h-8 text-blue-400 mb-1" />
        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-tighter">Live Status</span>
        <span className="text-xs text-white font-medium">AMPOH CMS</span>
      </motion.div>

      {/* Orbital Nodes */}
      {orbitNodes.map((node, index) => {
        const angle = (index / orbitNodes.length) * 2 * Math.PI;
        const radius = 220;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const isRelated = selectedNode?.relatedIds.includes(node.id) || node.relatedIds.includes(selectedNode?.id || "");

        return (
          <motion.div
            key={node.id}
            className="absolute z-20"
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ 
              x, 
              y, 
              opacity: 1,
              scale: hoveredNode === node.id || selectedNode?.id === node.id ? 1.2 : 1,
              zIndex: selectedNode?.id === node.id ? 50 : 20
            }}
            onHoverStart={() => setHoveredNode(node.id)}
            onHoverEnd={() => setHoveredNode(null)}
            onClick={() => setSelectedNode(node)}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 border",
              selectedNode?.id === node.id 
                ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]" 
                : isRelated
                  ? "bg-slate-800 border-blue-500/50 text-blue-400"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"
            )}>
              <node.icon className="w-6 h-6" />
              {node.count > 0 && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-slate-950">
                  {node.count}
                </div>
              )}
            </div>
            
            {/* Label */}
            <AnimatePresence>
              {(hoveredNode === node.id || selectedNode?.id === node.id) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] font-bold text-white shadow-xl"
                >
                  {node.title}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Info Card */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-8 top-8 w-64 z-40"
          >
            <Card className="bg-slate-900/90 backdrop-blur-md border-slate-800 shadow-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg">
                    <selectedNode.icon className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedNode.title}</h3>
                    <Badge variant="outline" className={cn("text-[10px] h-4", getStatusColor(selectedNode.status))}>
                      {selectedNode.status.replace('-', ' ')}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {selectedNode.details}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold">
                    <span>Workflow Links</span>
                    <Activity className="w-3 h-3" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.relatedIds.map(id => {
                      const related = orbitNodes.find(n => n.id === id);
                      return related ? (
                        <Badge key={id} variant="secondary" className="text-[9px] bg-slate-800 text-slate-300 border-slate-700">
                          {related.title}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-6 left-8 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <div className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <div className="w-2 h-2 rounded-full bg-blue-500" /> In Progress
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <div className="w-2 h-2 rounded-full bg-amber-500" /> Pending
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <div className="w-2 h-2 rounded-full bg-red-500" /> Urgent
        </div>
      </div>
    </div>
  );
}

function Hospital(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 6v4" />
      <path d="M14 14h-4" />
      <path d="M14 18h-4" />
      <path d="M14 8h-4" />
      <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" />
      <path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18" />
    </svg>
  );
}
