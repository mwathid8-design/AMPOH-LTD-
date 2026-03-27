import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Separator } from "@/src/components/ui/separator";
import { useAuth } from "@/src/context/AuthContext";
import { Patient, Appointment } from "@/src/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/firebase";
import { collection, query, where, onSnapshot, getDoc, doc, orderBy } from "firebase/firestore";

export function Calendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<(Appointment & { patient?: Patient })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const q = user.branch === 'COMBINED'
      ? query(collection(db, "appointments"), where("date", ">=", format(start, "yyyy-MM-dd")), where("date", "<=", format(end, "yyyy-MM-dd")), orderBy("date", "asc"))
      : query(collection(db, "appointments"), where("branch", "==", user.branch), where("date", ">=", format(start, "yyyy-MM-dd")), where("date", "<=", format(end, "yyyy-MM-dd")), orderBy("date", "asc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const appointmentsData = await Promise.all(snapshot.docs.map(async (appDoc) => {
        const app = { id: appDoc.id, ...appDoc.data() } as Appointment;
        const patientDoc = await getDoc(doc(db, "patients", app.patientId));
        return { ...app, patient: patientDoc.exists() ? { id: patientDoc.id, ...patientDoc.data() } as Patient : undefined };
      }));
      setAppointments(appointmentsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, currentMonth]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const selectedDateAppointments = appointments.filter(app => isSameDay(new Date(app.date), selectedDate));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-white">{format(currentMonth, "MMMM yyyy")}</h2>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b border-slate-800">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {daysInMonth.map((day, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "min-h-[100px] p-2 border-r border-b border-slate-800 transition-all cursor-pointer hover:bg-slate-800/30",
                      !isSameMonth(day, currentMonth) && "opacity-20",
                      isSameDay(day, selectedDate) && "bg-blue-600/10 border-blue-500/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-xs font-mono",
                        isSameDay(day, new Date()) ? "text-blue-400 font-bold" : "text-slate-500"
                      )}>
                        {format(day, "d")}
                      </span>
                      {appointments.some(a => isSameDay(new Date(a.date), day)) && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      )}
                    </div>
                    <div className="space-y-1">
                      {appointments.filter(a => isSameDay(new Date(a.date), day)).slice(0, 2).map(a => (
                        <div key={a.id} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 truncate border border-slate-700">
                          {a.time} - {a.patient?.name || "Appt"}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Date Details */}
        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-500" />
                {format(selectedDate, "EEEE, dd MMM")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-800">
                {selectedDateAppointments.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                    <Clock className="w-8 h-8 mb-2 opacity-10" />
                    <p className="text-xs">No appointments scheduled for this day.</p>
                  </div>
                ) : (
                  selectedDateAppointments.map(a => (
                    <div key={a.id} className="p-4 space-y-3 hover:bg-slate-800/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xs uppercase">
                            {(a.patient?.name || "U").charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{a.patient?.name || "Unknown Patient"}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{a.time} • {a.type}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-[9px] border",
                            a.status === "Scheduled" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                            a.status === "Completed" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                            a.status === "Overdue" && "bg-red-500/10 text-red-500 border-red-500/20"
                          )}
                        >
                          {a.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

