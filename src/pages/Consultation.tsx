import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Stethoscope, 
  Activity, 
  FlaskConical, 
  Scissors, 
  Pill, 
  Save, 
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  Plus,
  X,
  Search,
  User
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Separator } from "@/src/components/ui/separator";
import { useAuth } from "@/src/context/AuthContext";
import { Patient, Visit, Vitals, LabRequest, Procedure, PrescriptionItem } from "@/src/types";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/firebase";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy, getDoc } from "firebase/firestore";

export function Consultation() {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<(Visit & { patient?: Patient })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [vitals, setVitals] = useState<Vitals>({ temp: "", bp: "", pulse: "", weight: "", height: "", spo2: "" });
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [plan, setPlan] = useState("");
  const [labRequests, setLabRequests] = useState<string[]>([]);
  const [procedures, setProcedures] = useState<{name: string, price: number}[]>([]);
  const [prescriptions, setPrescriptions] = useState<Partial<PrescriptionItem>[]>([]);

  const steps = [
    { id: "triage", label: "Triage & Vitals", icon: Activity },
    { id: "notes", label: "Clinical Notes", icon: Stethoscope },
    { id: "lab_proc", label: "Labs & Procedures", icon: FlaskConical },
    { id: "presc", label: "Prescriptions", icon: Pill },
    { id: "finalize", label: "Finalize & Bill", icon: CheckCircle2 },
  ];

  useEffect(() => {
    if (!user) return;

    const q = user.branch === 'COMBINED'
      ? query(collection(db, "visits"), where("status", "in", ["Waiting", "Consultation"]), orderBy("date", "asc"))
      : query(collection(db, "visits"), where("branch", "==", user.branch), where("status", "in", ["Waiting", "Consultation"]), orderBy("date", "asc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const visitsData = await Promise.all(snapshot.docs.map(async (visitDoc) => {
        const visit = { id: visitDoc.id, ...visitDoc.data() } as Visit;
        const patientDoc = await getDoc(doc(db, "patients", visit.patientId));
        return { ...visit, patient: patientDoc.exists() ? { id: patientDoc.id, ...patientDoc.data() } as Patient : undefined };
      }));
      setVisits(visitsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSelectVisit = (visit: Visit & { patient?: Patient }) => {
    setSelectedVisit(visit);
    setSelectedPatient(visit.patient || null);
    setVitals(visit.vitals || { temp: "", bp: "", pulse: "", weight: "", height: "", spo2: "" });
    setNotes(visit.notes || "");
    setDiagnosis(visit.diagnosis || "");
    setPlan(visit.managementPlan || "");
    setActiveStep(0);
  };

  const [nextAppointmentDate, setNextAppointmentDate] = useState("");
  const [nextAppointmentType, setNextAppointmentType] = useState<any>("Review");

  const handleFinalize = async () => {
    if (!selectedVisit || !user) return;

    try {
      const visitRef = doc(db, "visits", selectedVisit.id);
      
      // 1. Update Visit
      await updateDoc(visitRef, {
        vitals,
        notes,
        diagnosis,
        managementPlan: plan,
        status: 'Pending Billing',
        updatedAt: new Date().toISOString()
      });

      // 2. Create Lab Request if any
      if (labRequests.length > 0) {
        await addDoc(collection(db, "lab_requests"), {
          visitId: selectedVisit.id,
          patientId: selectedVisit.patientId,
          branch: selectedVisit.branch,
          tests: labRequests,
          status: 'Requested',
          requestedAt: new Date().toISOString()
        });
      }

      // 3. Create Procedures if any
      for (const proc of procedures) {
        await addDoc(collection(db, "procedures"), {
          visitId: selectedVisit.id,
          patientId: selectedVisit.patientId,
          branch: selectedVisit.branch,
          name: proc.name,
          price: proc.price,
          isBillable: true,
          status: 'Pending',
          createdAt: new Date().toISOString()
        });
      }

      // 4. Create Prescription if any
      if (prescriptions.length > 0) {
        await addDoc(collection(db, "prescriptions"), {
          visitId: selectedVisit.id,
          patientId: selectedVisit.patientId,
          branch: selectedVisit.branch,
          items: prescriptions,
          isBillable: true,
          createdAt: new Date().toISOString()
        });
      }

      // 5. Create Appointment if any
      if (nextAppointmentDate) {
        await addDoc(collection(db, "appointments"), {
          patientId: selectedVisit.patientId,
          branch: selectedVisit.branch,
          date: nextAppointmentDate,
          time: "09:00", // Default time
          type: nextAppointmentType,
          status: 'Scheduled',
          createdAt: new Date().toISOString()
        });
      }

      // 6. Create Bill
      const billItems = [
        { description: 'Consultation Fee', amount: 1000, category: 'Consultation' },
        ...procedures.map(p => ({ description: p.name, amount: p.price, category: 'Procedure' as const }))
      ];
      
      await addDoc(collection(db, "bills"), {
        patientId: selectedVisit.patientId,
        visitId: selectedVisit.id,
        branch: selectedVisit.branch,
        items: billItems,
        totalAmount: billItems.reduce((acc, item) => acc + item.amount, 0),
        paidAmount: 0,
        status: 'Unpaid',
        createdAt: new Date().toISOString()
      });

      setSelectedVisit(null);
      setSelectedPatient(null);
      setActiveStep(0);
      setNextAppointmentDate("");
      alert("Consultation finalized successfully!");
    } catch (error) {
      console.error("Error finalizing consultation:", error);
      alert("Failed to finalize consultation. Please try again.");
    }
  };

  if (!selectedVisit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Consultation Queue</h2>
          <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 uppercase tracking-widest">
            {user?.branch}
          </Badge>
        </div>
        
        {isLoading ? (
          <div className="py-10 text-center text-slate-500">Loading queue...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visits.map(v => (
              <Card 
                key={v.id} 
                className="bg-slate-900 border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group" 
                onClick={() => handleSelectVisit(v)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-bold">
                      {v.patient?.name.charAt(0) || <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{v.patient?.name || "Unknown Patient"}</h3>
                      <p className="text-[10px] text-slate-500 font-mono">{v.patient?.patientNumber || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(v.date), "HH:mm")}</span>
                    </div>
                    <Badge variant="secondary" className={cn(
                      "text-[9px] uppercase font-bold",
                      v.status === 'Waiting' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    )}>
                      {v.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {visits.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
                <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-10" />
                <p>No patients currently in the queue.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Patient Header */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xl">
              {selectedPatient?.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{selectedPatient?.name}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{selectedPatient?.patientNumber}</span>
                <span>•</span>
                <span>{selectedPatient?.gender}</span>
                <span>•</span>
                <span>{selectedPatient?.dob ? format(new Date(selectedPatient.dob), "dd MMM yyyy") : "N/A"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 border-slate-800 text-slate-400" onClick={() => setSelectedVisit(null)}>
              Exit Visit
            </Button>
            <Button variant="outline" size="sm" className="h-8 border-slate-800 text-slate-400">
              <Printer className="w-3 h-3 mr-2" />
              History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Steps */}
      <div className="flex items-center justify-between bg-slate-900/50 p-1 rounded-xl border border-slate-800 sticky top-0 z-10 backdrop-blur-md">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(index)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all",
              activeStep === index 
                ? "bg-blue-600 text-white shadow-lg" 
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <step.icon className="w-4 h-4" />
            <span className="text-xs font-bold hidden md:inline">{step.label}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <Card className="bg-slate-900 border-slate-800 min-h-[400px]">
        <CardContent className="p-6">
          {activeStep === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Patient Triage & Vitals
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <VitalInput label="Temperature (°C)" value={vitals.temp} onChange={(v: string) => setVitals({...vitals, temp: v})} placeholder="36.5" />
                <VitalInput label="Blood Pressure" value={vitals.bp} onChange={(v: string) => setVitals({...vitals, bp: v})} placeholder="120/80" />
                <VitalInput label="Pulse Rate (bpm)" value={vitals.pulse} onChange={(v: string) => setVitals({...vitals, pulse: v})} placeholder="72" />
                <VitalInput label="Weight (kg)" value={vitals.weight} onChange={(v: string) => setVitals({...vitals, weight: v})} placeholder="70" />
                <VitalInput label="Height (cm)" value={vitals.height} onChange={(v: string) => setVitals({...vitals, height: v})} placeholder="170" />
                <VitalInput label="SpO2 (%)" value={vitals.spo2} onChange={(v: string) => setVitals({...vitals, spo2: v})} placeholder="98" />
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-500" />
                Clinical Documentation
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Clinical Notes (History & Examination)</label>
                  <textarea 
                    className="w-full min-h-[200px] bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-200 focus:border-blue-500 outline-none transition-colors"
                    placeholder="Enter full clinical history and physical examination findings..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Diagnosis</label>
                    <Input className="bg-slate-950 border-slate-800 text-white" placeholder="e.g. Acute Malaria" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Management Plan</label>
                    <Input className="bg-slate-950 border-slate-800 text-white" placeholder="e.g. Start AL, Review in 3 days" value={plan} onChange={(e) => setPlan(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-blue-500" />
                    Lab Requests
                  </h3>
                  <div className="space-y-2">
                    {["Full Blood Count", "Malaria BS/RDT", "Urinalysis", "Blood Sugar", "H. Pylori", "Widal Test"].map(test => (
                      <button 
                        key={test}
                        onClick={() => setLabRequests(prev => prev.includes(test) ? prev.filter(t => t !== test) : [...prev, test])}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-sm",
                          labRequests.includes(test) ? "bg-blue-600/10 border-blue-500 text-blue-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        )}
                      >
                        {test}
                        {labRequests.includes(test) && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-blue-500" />
                    Minor Procedures
                  </h3>
                  <div className="space-y-2">
                    {[
                      {name: "Wound Dressing", price: 500},
                      {name: "Suturing", price: 1500},
                      {name: "Incision & Drainage", price: 2000},
                      {name: "Nebulization", price: 800}
                    ].map(proc => (
                      <button 
                        key={proc.name}
                        onClick={() => setProcedures(prev => prev.find(p => p.name === proc.name) ? prev.filter(p => p.name !== proc.name) : [...prev, proc])}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-sm",
                          procedures.find(p => p.name === proc.name) ? "bg-blue-600/10 border-blue-500 text-blue-400" : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        )}
                      >
                        <span>{proc.name}</span>
                        <span className="font-mono text-xs">KES {proc.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Pill className="w-4 h-4 text-blue-500" />
                  Prescriptions
                </h3>
                <Button size="sm" variant="outline" className="h-8 border-slate-800" onClick={() => setPrescriptions([...prescriptions, {medicine: "", dose: "", frequency: "", duration: ""}])}>
                  <Plus className="w-3 h-3 mr-2" />
                  Add Medicine
                </Button>
              </div>
              <div className="space-y-3">
                {prescriptions.map((p, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Medicine</label>
                      <Input className="bg-slate-950 border-slate-800 text-white" placeholder="Medicine Name" value={p.medicine} onChange={(e) => {
                        const newP = [...prescriptions];
                        newP[i].medicine = e.target.value;
                        setPrescriptions(newP);
                      }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Dosage</label>
                      <Input className="bg-slate-950 border-slate-800 text-white" placeholder="e.g. 500mg" value={p.dose} onChange={(e) => {
                        const newP = [...prescriptions];
                        newP[i].dose = e.target.value;
                        setPrescriptions(newP);
                      }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold">Frequency</label>
                      <Input className="bg-slate-950 border-slate-800 text-white" placeholder="e.g. TDS" value={p.frequency} onChange={(e) => {
                        const newP = [...prescriptions];
                        newP[i].frequency = e.target.value;
                        setPrescriptions(newP);
                      }} />
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => setPrescriptions(prescriptions.filter((_, idx) => idx !== i))}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {prescriptions.length === 0 && (
                  <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                    <Pill className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs">No medicines prescribed yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Finalize Consultation
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-slate-950 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase">Clinical Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Diagnosis</p>
                      <p className="text-white font-medium">{diagnosis || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Management</p>
                      <p className="text-white font-medium">{plan || "Not specified"}</p>
                    </div>
                    {labRequests.length > 0 && (
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase font-bold mb-1">Pending Labs</p>
                        <div className="flex flex-wrap gap-1">
                          {labRequests.map(l => <Badge key={l} variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{l}</Badge>)}
                        </div>
                      </div>
                    )}
                    <Separator className="bg-slate-800 my-4" />
                    <div className="space-y-4">
                      <p className="text-slate-500 text-[10px] uppercase font-bold">Schedule Follow-up (Optional)</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">Date</label>
                          <Input 
                            type="date" 
                            className="bg-slate-950 border-slate-800 text-white h-9 text-xs" 
                            value={nextAppointmentDate}
                            onChange={(e) => setNextAppointmentDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">Type</label>
                          <select 
                            className="w-full h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-xs text-slate-200 outline-none"
                            value={nextAppointmentType}
                            onChange={(e) => setNextAppointmentType(e.target.value)}
                          >
                            <option value="Review">Review</option>
                            <option value="Lab">Lab Results</option>
                            <option value="Dressing">Dressing</option>
                            <option value="FP">Family Planning</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-950 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold text-slate-500 uppercase">Billing Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Consultation Fee</span>
                      <span className="text-white font-mono">1,000.00</span>
                    </div>
                    {procedures.map(p => (
                      <div key={p.name} className="flex justify-between text-sm">
                        <span className="text-slate-400">{p.name}</span>
                        <span className="text-white font-mono">{p.price.toFixed(2)}</span>
                      </div>
                    ))}
                    <Separator className="bg-slate-800 my-4" />
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-white">Total Bill</span>
                      <span className="text-blue-400 font-mono">
                        KES {(1000 + procedures.reduce((acc, p) => acc + p.price, 0)).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          disabled={activeStep === 0} 
          onClick={() => setActiveStep(prev => prev - 1)}
          className="text-slate-400"
        >
          Previous Step
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-slate-800 text-slate-400">
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleFinalize}>
              Finalize & Close Visit
            </Button>
          ) : (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setActiveStep(prev => prev + 1)}>
              Next Step
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function VitalInput({ label, value, onChange, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      <Input 
        className="bg-slate-950 border-slate-800 text-white h-10" 
        placeholder={placeholder} 
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
