import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Search, 
  CreditCard, 
  History, 
  User, 
  Calendar, 
  ArrowUpRight, 
  Filter,
  Download,
  Printer,
  MoreVertical,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Separator } from "@/src/components/ui/separator";
import { useAuth } from "@/src/context/AuthContext";
import { Patient, Bill } from "@/src/types";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/firebase";
import { collection, query, where, onSnapshot, getDoc, doc, orderBy } from "firebase/firestore";

export function Debts() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [debts, setDebts] = useState<(Bill & { patient?: Patient })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = user.branch === 'COMBINED'
      ? query(collection(db, "bills"), where("status", "in", ["Unpaid", "Partial"]))
      : query(collection(db, "bills"), where("branch", "==", user.branch), where("status", "in", ["Unpaid", "Partial"]));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const debtsData = await Promise.all(snapshot.docs.map(async (billDoc) => {
          const bill = { id: billDoc.id, ...billDoc.data() } as Bill;
          const patientDoc = await getDoc(doc(db, "patients", bill.patientId));
          return { ...bill, patient: patientDoc.exists() ? { id: patientDoc.id, ...patientDoc.data() } as Patient : undefined };
        }));

        // Sort manually
        const sortedData = debtsData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setDebts(sortedData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error processing debts snapshot:", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handlePrintStatement = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Outstanding Debts Statement</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #eee; padding: 12px; text-align: left; }
            th { background: #f9f9f9; font-size: 12px; text-transform: uppercase; }
            .total { margin-top: 30px; text-align: right; font-size: 18px; font-bold; }
            .footer { margin-top: 50px; border-top: 1px solid #eee; pt: 20px; font-size: 10px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AMPOH MEDICAL CLINIC</h1>
            <p>Outstanding Debts Statement - ${user?.branch}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Bill ID</th>
                <th>Date</th>
                <th>Total Amount</th>
                <th>Paid</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDebts.map(d => `
                <tr>
                  <td>${d.patient?.name || 'Unknown'}</td>
                  <td>${d.id.slice(-8).toUpperCase()}</td>
                  <td>${d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td>${d.totalAmount.toFixed(2)}</td>
                  <td>${d.paidAmount.toFixed(2)}</td>
                  <td>${(d.totalAmount - d.paidAmount).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            Total Outstanding: KES ${totalOutstanding.toLocaleString()}
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

  const filteredDebts = debts.filter(d => 
    d.patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = debts.reduce((acc, d) => acc + (d.totalAmount - d.paidAmount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search by patient name or debt ID..." 
            className="pl-10 bg-slate-900 border-slate-800 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="border-slate-800 text-slate-400 h-10"
            onClick={handlePrintStatement}
            disabled={filteredDebts.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Statement
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Outstanding" value={`KES ${totalOutstanding.toLocaleString()}`} color="text-red-400" />
        <StatCard label="Active Debtors" value={`${debts.length} Patients`} color="text-blue-400" />
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Debt Management</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">Loading debts...</div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-500">Debtor</TableHead>
                  <TableHead className="text-slate-500">Total Debt</TableHead>
                  <TableHead className="text-slate-500">Paid</TableHead>
                  <TableHead className="text-slate-500">Balance</TableHead>
                  <TableHead className="text-slate-500">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebts.map((debt) => (
                  <TableRow key={debt.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200 text-sm">{debt.patient?.name || "Unknown"}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{debt.id.slice(-8).toUpperCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400 font-mono text-sm">{debt.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-emerald-500 font-mono text-sm">{debt.paidAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-red-400 font-mono text-sm font-bold">{(debt.totalAmount - debt.paidAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-[10px] border",
                          debt.status === "Unpaid" && "bg-red-500/10 text-red-500 border-red-500/20",
                          debt.status === "Partial" && "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}
                      >
                        {debt.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDebts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      No outstanding debts found.
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

function StatCard({ label, value, color }: any) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-6">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <p className={cn("text-2xl font-bold font-mono", color)}>{value}</p>
      </CardContent>
    </Card>
  );
}
