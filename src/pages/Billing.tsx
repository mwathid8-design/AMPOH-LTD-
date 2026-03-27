import * as React from "react";
import { useState, useEffect } from "react";
import { 
  CreditCard, 
  Search, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  ChevronRight,
  Wallet,
  Smartphone,
  ShieldCheck,
  Receipt,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Separator } from "@/src/components/ui/separator";
import { useAuth } from "@/src/context/AuthContext";
import { Patient, Bill, BillItem, Payment } from "@/src/types";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/firebase";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, orderBy, getDoc } from "firebase/firestore";

export function Billing() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [bills, setBills] = useState<(Bill & { patient?: Patient })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<(Bill & { patient?: Patient }) | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "M-Pesa" | "Bank">("Cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [transactionCode, setTransactionCode] = useState("");

  useEffect(() => {
    if (!user) return;

    const q = user.branch === 'COMBINED'
      ? query(collection(db, "bills"), where("status", "in", ["Unpaid", "Partial"]), orderBy("createdAt", "desc"))
      : query(collection(db, "bills"), where("branch", "==", user.branch), where("status", "in", ["Unpaid", "Partial"]), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const billsData = await Promise.all(snapshot.docs.map(async (billDoc) => {
        const bill = { id: billDoc.id, ...billDoc.data() } as Bill;
        const patientDoc = await getDoc(doc(db, "patients", bill.patientId));
        return { ...bill, patient: patientDoc.exists() ? { id: patientDoc.id, ...patientDoc.data() } as Patient : undefined };
      }));
      setBills(billsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handlePayment = async () => {
    if (!selectedBill || !amountPaid || !user) return;

    try {
      const paid = parseFloat(amountPaid);
      const newPaidAmount = (selectedBill.paidAmount || 0) + paid;
      const newStatus = newPaidAmount >= selectedBill.totalAmount ? 'Paid' : 'Partial';

      // 1. Update Bill
      await updateDoc(doc(db, "bills", selectedBill.id), {
        paidAmount: newPaidAmount,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // 2. Create Payment Record
      await addDoc(collection(db, "payments"), {
        billId: selectedBill.id,
        amount: paid,
        method: paymentMethod,
        transactionCode: transactionCode,
        date: new Date().toISOString(),
        branch: selectedBill.branch,
        receivedBy: user.uid
      });

      // 3. If visitId exists, update visit status if fully paid
      if (selectedBill.visitId && newStatus === 'Paid') {
        await updateDoc(doc(db, "visits", selectedBill.visitId), {
          status: 'Completed'
        });
      }

      alert(`Payment of KES ${paid.toFixed(2)} processed successfully!`);
      setSelectedBill(null);
      setAmountPaid("");
      setTransactionCode("");
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Failed to process payment. Please try again.");
    }
  };

  const filteredBills = bills.filter(b => 
    b.patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedBill) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedBill(null)} className="text-slate-400">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </Button>
            <div>
              <h2 className="text-lg font-bold text-white">Process Payment</h2>
              <p className="text-xs text-slate-500">{selectedBill.id} • {selectedBill.patient?.name}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Details</CardTitle>
                <Badge variant="outline" className="border-slate-700 text-slate-400">{selectedBill.branch}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="border-slate-800">
                    <TableRow className="hover:bg-transparent border-slate-800">
                      <TableHead className="text-slate-500 text-xs pl-6">Description</TableHead>
                      <TableHead className="text-slate-500 text-xs">Category</TableHead>
                      <TableHead className="text-right text-slate-500 text-xs pr-6">Price (KES)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBill.items.map((item: BillItem, i: number) => (
                      <TableRow key={i} className="border-slate-800 hover:bg-transparent">
                        <TableCell className="text-slate-300 text-sm pl-6">{item.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-slate-800 text-slate-400 text-[9px] uppercase">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-white text-sm pr-6">{item.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-6 flex justify-end bg-slate-950/30">
                  <div className="w-full max-w-[240px] space-y-3">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Total Amount</span>
                      <span className="font-mono text-slate-300">{selectedBill.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Already Paid</span>
                      <span className="font-mono text-emerald-500">{selectedBill.paidAmount.toFixed(2)}</span>
                    </div>
                    <Separator className="bg-slate-800" />
                    <div className="flex justify-between text-lg font-bold text-blue-400">
                      <span>Balance</span>
                      <span className="font-mono">KES {(selectedBill.totalAmount - selectedBill.paidAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PaymentMethodCard 
                icon={Wallet} 
                label="Cash" 
                active={paymentMethod === "Cash"} 
                onClick={() => setPaymentMethod("Cash")} 
              />
              <PaymentMethodCard 
                icon={Smartphone} 
                label="M-Pesa" 
                active={paymentMethod === "M-Pesa"} 
                onClick={() => setPaymentMethod("M-Pesa")} 
              />
              <PaymentMethodCard 
                icon={ShieldCheck} 
                label="Bank" 
                active={paymentMethod === "Bank"} 
                onClick={() => setPaymentMethod("Bank")} 
              />
            </div>
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amount to Pay</label>
                  <Input 
                    type="number"
                    className="bg-slate-950 border-slate-800 text-white h-12 text-xl font-mono focus:ring-2 focus:ring-blue-500" 
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="xs" 
                      className="text-[10px] h-6 border-slate-800 text-slate-500"
                      onClick={() => setAmountPaid((selectedBill.totalAmount - selectedBill.paidAmount).toString())}
                    >
                      Pay Full Balance
                    </Button>
                  </div>
                </div>
                {paymentMethod !== "Cash" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Transaction Reference</label>
                    <Input 
                      className="bg-slate-950 border-slate-800 text-white h-10 font-mono uppercase" 
                      placeholder="e.g. SAB123XYZ" 
                      value={transactionCode}
                      onChange={(e) => setTransactionCode(e.target.value)}
                    />
                  </div>
                )}
                <Separator className="bg-slate-800" />
                <div className="flex flex-col gap-2">
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 font-bold" 
                    onClick={handlePayment}
                    disabled={!amountPaid || parseFloat(amountPaid) <= 0}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Complete Payment
                  </Button>
                  <Button variant="outline" className="w-full border-slate-800 text-slate-400 h-11">
                    <Receipt className="w-4 h-4 mr-2" />
                    Save as Debt
                  </Button>
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
            placeholder="Search by patient name or invoice ID..." 
            className="pl-10 bg-slate-900 border-slate-800 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
            {bills.length} Pending Invoices
          </Badge>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Billing Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">Loading billing queue...</div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-500">Invoice ID</TableHead>
                  <TableHead className="text-slate-500">Patient</TableHead>
                  <TableHead className="text-slate-500">Amount (KES)</TableHead>
                  <TableHead className="text-slate-500">Status</TableHead>
                  <TableHead className="text-right text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-blue-400 text-xs">{bill.id.slice(-8).toUpperCase()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-200 text-sm">{bill.patient?.name || "Unknown"}</span>
                        <span className="text-[10px] text-slate-500">{bill.patient?.patientNumber || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white font-mono text-sm">{bill.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(
                        "text-[10px] uppercase font-bold",
                        bill.status === 'Unpaid' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      )}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                        onClick={() => setSelectedBill(bill)}
                      >
                        Process Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBills.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                      No pending invoices found.
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

function PaymentMethodCard({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6 rounded-xl border transition-all",
        active 
          ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10" 
          : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
      )}
    >
      <Icon className={cn("w-6 h-6", active ? "text-blue-400" : "text-slate-600")} />
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

