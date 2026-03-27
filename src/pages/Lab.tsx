import * as React from "react";
import { useState, useEffect } from "react";
import { 
  FlaskConical, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Printer, 
  MoreVertical,
  ChevronRight,
  Save,
  Send,
  Microscope,
  ClipboardCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Separator } from "@/src/components/ui/separator";
import { Textarea } from "@/src/components/ui/textarea";
import { useAuth } from "@/src/context/AuthContext";
import { Patient, LabRequest } from "@/src/types";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, orderBy, getDoc } from "firebase/firestore";

export function Lab() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [requests, setRequests] = useState<(LabRequest & { patient?: Patient })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<(LabRequest & { patient?: Patient }) | null>(null);
  const [results, setResults] = useState("");

  useEffect(() => {
    if (!user) return;

    const q = user.branch === 'COMBINED'
      ? query(collection(db, "lab_requests"), where("status", "in", ["Pending", "Processing"]))
      : query(collection(db, "lab_requests"), where("branch", "==", user.branch), where("status", "in", ["Pending", "Processing"]));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const requestsData = await Promise.all(snapshot.docs.map(async (requestDoc) => {
          const req = { id: requestDoc.id, ...requestDoc.data() } as LabRequest;
          const patientDoc = await getDoc(doc(db, "patients", req.patientId));
          return { ...req, patient: patientDoc.exists() ? { id: patientDoc.id, ...patientDoc.data() } as Patient : undefined };
        }));

        // Sort manually
        const sortedData = requestsData.sort((a, b) => {
          const dateA = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
          const dateB = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
          return dateB - dateA;
        });

        setRequests(sortedData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error processing lab snapshot:", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handlePrintResults = (req: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Lab Results - ${req.patient?.name}</title>
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
            <p>Laboratory Results Report</p>
          </div>
          <div class="grid">
            <div class="section">
              <div class="label">Patient Name</div>
              <div class="value">${req.patient?.name}</div>
            </div>
            <div class="section">
              <div class="label">Patient ID</div>
              <div class="value">${req.patient?.patientNumber}</div>
            </div>
          </div>
          <div class="section">
            <div class="label">Tests Performed</div>
            <div class="value">${req.tests?.join(", ")}</div>
          </div>
          <div class="section">
            <div class="label">Results / Findings</div>
            <div class="value" style="white-space: pre-wrap;">${req.results || 'Pending'}</div>
          </div>
          <div class="grid">
            <div class="section">
              <div class="label">Completed On</div>
              <div class="value">${req.completedAt ? new Date(req.completedAt).toLocaleString() : 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">Branch</div>
              <div class="value">${req.branch}</div>
            </div>
          </div>
          <div class="footer">
            <p>Printed on: ${new Date().toLocaleString()}</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleUpdateStatus = async (newStatus: 'Processing' | 'Completed') => {
    if (!selectedRequest || !user) return;

    try {
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      if (newStatus === 'Completed') {
        updateData.results = results; // This could be a JSON string or map
        updateData.completedAt = new Date().toISOString();
        updateData.completedBy = user.uid;
      }

      await updateDoc(doc(db, "lab_requests", selectedRequest.id), updateData);
      
      alert(`Lab request ${newStatus.toLowerCase()} successfully!`);
      setSelectedRequest(null);
      setResults("");
    } catch (error) {
      console.error("Error updating lab request:", error);
      alert("Failed to update lab request.");
    }
  };

  const filteredRequests = requests.filter(r => 
    r.patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.tests?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (selectedRequest) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(null)} className="text-slate-400">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <div>
              <h2 className="text-lg font-bold text-white">Lab Results Entry</h2>
              <p className="text-xs text-slate-500">{selectedRequest.patient?.name} • {selectedRequest.tests?.join(", ")}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Request Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Tests Requested</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedRequest.tests?.map(t => <Badge key={t} variant="outline" className="text-blue-400 border-blue-500/20">{t}</Badge>)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Requested By</span>
                    <p className="text-white font-medium">Dr. {selectedRequest.requestedBy || "System"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Priority</span>
                    <Badge variant="outline" className="border-red-500/20 text-red-400 bg-red-500/5">URGENT</Badge>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Branch</span>
                    <p className="text-slate-400">{selectedRequest.branch}</p>
                  </div>
                </div>
                
                <Separator className="bg-slate-800" />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Results / Findings</label>
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 text-[10px]">REQUIRED</Badge>
                  </div>
                  <Textarea 
                    className="bg-slate-950 border-slate-800 text-white min-h-[200px] focus:ring-2 focus:ring-blue-500" 
                    placeholder="Enter detailed lab findings, values, and observations..."
                    value={results}
                    onChange={(e) => setResults(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lab Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedRequest.status === 'Pending' && (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-bold"
                    onClick={() => handleUpdateStatus('Processing')}
                  >
                    <Microscope className="w-4 h-4 mr-2" />
                    Mark as Processing
                  </Button>
                )}
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 font-bold"
                  onClick={() => handleUpdateStatus('Completed')}
                  disabled={!results.trim()}
                >
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Finalize Results
                </Button>
                <Separator className="bg-slate-800" />
                <Button 
                  variant="outline" 
                  className="w-full border-slate-800 text-slate-400 h-11"
                  onClick={() => handlePrintResults(selectedRequest)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Results
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Name</span>
                  <span className="text-slate-200">{selectedRequest.patient?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Age/Sex</span>
                  <span className="text-slate-200">{selectedRequest.patient?.age}Y / {selectedRequest.patient?.gender}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">ID</span>
                  <span className="text-slate-200 font-mono text-xs">{selectedRequest.patient?.patientNumber}</span>
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
            placeholder="Search by patient or test name..." 
            className="pl-10 bg-slate-900 border-slate-800 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            {requests.length} Active Requests
          </Badge>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Laboratory Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">Loading lab queue...</div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-500">Time</TableHead>
                  <TableHead className="text-slate-500">Patient</TableHead>
                  <TableHead className="text-slate-500">Test Requested</TableHead>
                  <TableHead className="text-slate-500">Status</TableHead>
                  <TableHead className="text-right text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="text-slate-400 text-xs font-mono">
                      {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200 text-sm">{req.patient?.name || "Unknown"}</span>
                        <span className="text-[10px] text-slate-500">{req.patient?.patientNumber || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {req.tests?.map(t => (
                          <Badge key={t} variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        "text-[10px] uppercase font-bold",
                        req.status === 'Pending' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      )}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                        onClick={() => setSelectedRequest(req)}
                      >
                        Enter Results
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      No active lab requests found.
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

function ParameterInput({ label, range, value, onChange }: any) {
  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <label className="text-xs font-bold text-slate-400 uppercase">{label}</label>
      <Input 
        className="bg-slate-950 border-slate-800 text-white h-9" 
        placeholder="Result" 
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-[10px] text-slate-500 font-mono">Ref: {range}</span>
    </div>
  );
}
