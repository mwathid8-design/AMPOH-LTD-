import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Scissors, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  User,
  Printer,
  Save,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Separator } from "@/src/components/ui/separator";
import { useAuth } from "@/src/context/AuthContext";
import { Patient, Procedure } from "@/src/types";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/firebase";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc, orderBy } from "firebase/firestore";
import { format } from "date-fns";

export function Procedures() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [procedures, setProcedures] = useState<(Procedure & { patient?: Patient })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProcedure, setSelectedProcedure] = useState<(Procedure & { patient?: Patient }) | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) return;

    // Use a simpler query if orderBy is failing or until indexes are ready
    const q = user.branch === 'COMBINED'
      ? query(collection(db, "procedures"))
      : query(collection(db, "procedures"), where("branch", "==", user.branch));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const procData = await Promise.all(snapshot.docs.map(async (procDoc) => {
          const proc = { id: procDoc.id, ...procDoc.data() } as Procedure;
          const patientDoc = await getDoc(doc(db, "patients", proc.patientId));
          return { ...proc, patient: patientDoc.exists() ? { id: patientDoc.id, ...patientDoc.data() } as Patient : undefined };
        }));
        
        // Sort manually in memory to avoid index issues and handle missing createdAt
        const sortedData = procData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setProcedures(sortedData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error processing procedures snapshot:", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handlePrint = (proc: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Procedure Record - ${proc.patient?.name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
            .value { font-size: 16px; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .footer { margin-top: 50px; border-top: 1px solid #eee; pt: 20px; font-size: 10px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AMPOH MEDICAL CLINIC</h1>
            <p>Procedure Completion Record</p>
          </div>
          <div class="grid">
            <div class="section">
              <div class="label">Patient Name</div>
              <div class="value">${proc.patient?.name}</div>
            </div>
            <div class="section">
              <div class="label">Patient ID</div>
              <div class="value">${proc.patient?.patientNumber}</div>
            </div>
          </div>
          <div class="section">
            <div class="label">Procedure Name</div>
            <div class="value">${proc.name}</div>
          </div>
          <div class="section">
            <div class="label">Status</div>
            <div class="value">${proc.status}</div>
          </div>
          <div class="section">
            <div class="label">Clinical Notes & Findings</div>
            <div class="value" style="white-space: pre-wrap;">${proc.notes || 'No notes provided.'}</div>
          </div>
          <div class="grid">
            <div class="section">
              <div class="label">Performed On</div>
              <div class="value">${proc.completedAt ? new Date(proc.completedAt).toLocaleString() : 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">Branch</div>
              <div class="value">${proc.branch}</div>
            </div>
          </div>
          <div class="footer">
            <p>Printed on: ${new Date().toLocaleString()}</p>
            <p>This is an official medical record.</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleComplete = async () => {
    if (!selectedProcedure) return;

    try {
      await updateDoc(doc(db, "procedures", selectedProcedure.id), {
        notes: notes,
        status: 'Completed',
        completedAt: new Date().toISOString()
      });
      
      alert("Procedure marked as completed.");
      setSelectedProcedure(null);
      setNotes("");
    } catch (error) {
      console.error("Error completing procedure:", error);
      alert("Failed to update procedure.");
    }
  };

  const filteredProcedures = procedures.filter(p => 
    p.patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedProcedure) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedProcedure(null)} className="text-slate-400">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <div>
              <h2 className="text-lg font-bold text-white">Procedure Details</h2>
              <p className="text-xs text-slate-500">{selectedProcedure.patient?.name} • {selectedProcedure.name}</p>
            </div>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 h-9" onClick={handleComplete}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark as Completed
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Notes & Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea 
                  className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Enter procedure findings, observations, and post-op instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold">
                    {selectedProcedure.patient?.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedProcedure.patient?.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{selectedProcedure.patient?.gender} • {selectedProcedure.patient?.dob}</p>
                  </div>
                </div>
                <Separator className="bg-slate-800" />
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Requested Procedure</p>
                  <p className="text-sm text-white font-medium">{selectedProcedure.name}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Requested On</p>
                  <p className="text-sm text-slate-300">{format(new Date(selectedProcedure.createdAt), "dd MMM yyyy, HH:mm")}</p>
                </div>
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
            placeholder="Search procedure or patient..." 
            className="pl-10 bg-slate-900 border-slate-800 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            {procedures.filter(p => p.status !== 'Completed').length} Active Procedures
          </Badge>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Procedure Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">Loading procedure queue...</div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-500">Date</TableHead>
                  <TableHead className="text-slate-500">Patient</TableHead>
                  <TableHead className="text-slate-500">Procedure</TableHead>
                  <TableHead className="text-slate-500">Status</TableHead>
                  <TableHead className="text-right text-slate-500">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcedures.map((proc) => (
                  <TableRow key={proc.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="text-slate-400 text-xs">{format(new Date(proc.createdAt), "dd/MM HH:mm")}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200 text-sm">{proc.patient?.name || "Unknown"}</span>
                        <span className="text-[10px] text-slate-500">{proc.patient?.patientNumber || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white text-sm">{proc.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        "text-[10px] uppercase font-bold",
                        proc.status === 'Completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      )}>
                        {proc.status || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {proc.status !== 'Completed' ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                          onClick={() => setSelectedProcedure(proc)}
                        >
                          Perform
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-blue-400"
                          onClick={() => handlePrint(proc)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProcedures.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      No procedures found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
