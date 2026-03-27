import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Plus, 
  Calendar, 
  History, 
  User, 
  ChevronRight, 
  Printer, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Syringe,
  Pill,
  ClipboardList,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Separator } from "@/src/components/ui/separator";
import { useAuth } from "@/src/context/AuthContext";
import { Patient, FamilyPlanning as FPRecord } from "@/src/types";
import { format, addMonths, addWeeks } from "date-fns";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/firebase";
import { collection, query, where, onSnapshot, addDoc, getDocs, orderBy } from "firebase/firestore";

export function FamilyPlanning() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [method, setMethod] = useState("");
  const [adminDate, setAdminDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [nextDate, setNextDate] = useState("");
  const [price, setPrice] = useState(0);
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<FPRecord[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = user.branch === 'COMBINED'
      ? collection(db, "patients")
      : query(collection(db, "patients"), where("branch", "==", user.branch));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedPatient) return;

    const q = query(
      collection(db, "family_planning"), 
      where("patientId", "==", selectedPatient.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fpData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FPRecord));
      // Sort manually
      const sortedData = fpData.sort((a, b) => {
        const dateA = a.dateGiven ? new Date(a.dateGiven).getTime() : 0;
        const dateB = b.dateGiven ? new Date(b.dateGiven).getTime() : 0;
        return dateB - dateA;
      });
      setHistory(sortedData);
    });

    return () => unsubscribe();
  }, [selectedPatient]);

  const methods = [
    { id: "DEPO", name: "Depo-Provera (Injection)", duration: 3, unit: "months", icon: Syringe, price: 500 },
    { id: "IMPLANON", name: "Implanon (Implant)", duration: 3, unit: "years", icon: Syringe, price: 2500 },
    { id: "JADELLE", name: "Jadelle (Implant)", duration: 5, unit: "years", icon: Syringe, price: 3500 },
    { id: "COIL", name: "IUCD (Coil)", duration: 10, unit: "years", icon: ClipboardList, price: 1500 },
    { id: "PILLS", name: "Combined Oral Contraceptives", duration: 1, unit: "months", icon: Pill, price: 200 },
  ];

  const handleMethodSelect = (m: any) => {
    setMethod(m.name);
    setPrice(m.price);
    const date = new Date(adminDate);
    let next;
    if (m.unit === "months") next = addMonths(date, m.duration);
    else if (m.unit === "years") next = addMonths(date, m.duration * 12);
    else next = addWeeks(date, m.duration);
    setNextDate(format(next, "yyyy-MM-dd"));
  };

  const handleSave = async () => {
    if (!selectedPatient || !method || !user) return;

    try {
      const fpData = {
        patientId: selectedPatient.id,
        branch: selectedPatient.branch,
        method,
        dateGiven: adminDate,
        nextDueDate: nextDate,
        price,
        notes,
        administeredBy: user.uid,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "family_planning"), fpData);

      // Create a bill for FP
      await addDoc(collection(db, "bills"), {
        patientId: selectedPatient.id,
        branch: selectedPatient.branch,
        items: [{
          description: `Family Planning: ${method}`,
          amount: price,
          category: 'FP'
        }],
        totalAmount: price,
        paidAmount: 0,
        status: 'Unpaid',
        createdAt: new Date().toISOString()
      });

      alert(`FP record saved for ${selectedPatient.name}. Next visit: ${nextDate}.`);
      setSelectedPatient(null);
      setMethod("");
      setNotes("");
    } catch (error) {
      console.error("Error saving FP record:", error);
      alert("Failed to save FP record.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!selectedPatient) return;
    const content = `Patient: ${selectedPatient.name}\nFile No: ${selectedPatient.patientNumber}\nMethod: ${method}\nDate Given: ${adminDate}\nNext Due: ${nextDate}\nNotes: ${notes}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FP_Record_${selectedPatient.patientNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedPatient) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedPatient(null)} className="text-slate-400">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <div>
              <h2 className="text-lg font-bold text-white">Family Planning Administration</h2>
              <p className="text-xs text-slate-500">{selectedPatient.name} • {selectedPatient.patientNumber}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="border-slate-800 text-slate-400 h-9 flex-1 sm:flex-none" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" className="border-slate-800 text-slate-400 h-9 flex-1 sm:flex-none" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 h-9 w-full sm:w-auto" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Record
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Method</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {methods.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => handleMethodSelect(m)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                      method === m.name 
                        ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10" 
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", method === m.name ? "bg-blue-600/20 text-blue-400" : "bg-slate-900 text-slate-600")}>
                      <m.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white leading-tight truncate">{m.name}</p>
                      <p className="text-[10px] uppercase tracking-wider opacity-60">Duration: {m.duration} {m.unit}</p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Administration Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date Administered</label>
                    <Input 
                      type="date" 
                      className="bg-slate-950 border-slate-800 text-white h-10" 
                      value={adminDate}
                      onChange={(e) => setAdminDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-blue-400">Next Visit Date (TCA)</label>
                    <Input 
                      type="date" 
                      className="bg-slate-950 border-blue-500/30 text-blue-400 h-10 font-bold" 
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Batch Number</label>
                    <Input className="bg-slate-950 border-slate-800 text-white h-10" placeholder="e.g. B12345" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Site of Administration</label>
                    <Input className="bg-slate-950 border-slate-800 text-white h-10" placeholder="e.g. Left Arm" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">FP History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {history.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-slate-500 p-6 text-center border-2 border-dashed border-slate-800 rounded-xl">
                    <History className="w-8 h-8 mb-2 opacity-10" />
                    <p className="text-xs">No previous FP records found for this patient.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map(h => (
                      <div key={h.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white">{h.method}</span>
                          <span className="text-[10px] text-slate-500">{format(new Date(h.dateGiven), "dd MMM yyyy")}</span>
                        </div>
                        <p className="text-[10px] text-blue-400">Next Due: {format(new Date(h.nextDueDate), "dd MMM yyyy")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search patient for FP services..." 
            className="pl-10 bg-slate-900 border-slate-800 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Patient Selection</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-500">File No.</TableHead>
                  <TableHead className="text-slate-500">Name</TableHead>
                  <TableHead className="text-slate-500 hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="text-right text-slate-500">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
                  <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-blue-400 text-xs">{p.patientNumber}</TableCell>
                    <TableCell className="font-medium text-slate-200 text-sm">{p.name}</TableCell>
                    <TableCell className="text-slate-400 text-xs hidden sm:table-cell">{p.phone}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                        onClick={() => setSelectedPatient(p)}
                      >
                        Start FP Service
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

