import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  CreditCard, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  Pill,
  ChevronRight,
  Package
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Separator } from "@/src/components/ui/separator";
import { useAuth } from "@/src/context/AuthContext";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/firebase";
import { collection, query, onSnapshot, addDoc, where, orderBy } from "firebase/firestore";

export function OTCSales() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [inventory, setInventory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return;
    setCart(cart.map(c => c.id === id ? { ...c, qty } : c));
  };

  const total = cart.reduce((acc, c) => acc + (c.price * c.qty), 0);

  const handleCheckout = async () => {
    if (!user) return;
    try {
      // Create a bill for the OTC sale
      const billItems = cart.map(item => ({
        description: item.name,
        amount: item.price * item.qty,
        category: 'Pharmacy' as const
      }));

      await addDoc(collection(db, "bills"), {
        branch: user.branch,
        items: billItems,
        totalAmount: total,
        paidAmount: total, // OTC sales are usually paid immediately
        paymentMethod,
        status: 'Paid',
        type: 'OTC',
        createdAt: new Date().toISOString()
      });

      alert(`Sale of KES ${total} completed via ${paymentMethod}. Receipt printed.`);
      setCart([]);
    } catch (error) {
      console.error("Error completing sale:", error);
      alert("Failed to complete sale. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Search medicine inventory..." 
                className="pl-10 bg-slate-900 border-slate-800 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Badge variant="outline" className="border-slate-800 text-slate-500">
              {inventory.length} Items in Stock
            </Badge>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pharmacy Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-10 text-center text-slate-500">Loading inventory...</div>
              ) : (
                <Table>
                  <TableHeader className="border-slate-800">
                    <TableRow className="hover:bg-transparent border-slate-800">
                      <TableHead className="text-slate-500">Item Name</TableHead>
                      <TableHead className="text-slate-500">Stock</TableHead>
                      <TableHead className="text-slate-500">Price</TableHead>
                      <TableHead className="text-right text-slate-500">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-200 text-sm">{item.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{item.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-[10px] border",
                            item.stock < 100 ? "text-red-400 border-red-500/20 bg-red-500/10" : "text-slate-400 border-slate-700"
                          )}>
                            {item.stock} {item.unit || "Units"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white font-mono text-sm">{item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                            onClick={() => addToCart(item)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInventory.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-slate-500">
                          No items found in inventory.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 h-full flex flex-col">
            <CardHeader className="border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-500" />
                Sales Cart
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-auto max-h-[400px]">
              {cart.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                  <ShoppingCart className="w-12 h-12 mb-4 opacity-10" />
                  <p className="text-sm">Your cart is empty.</p>
                  <p className="text-xs mt-1">Add items from the inventory to start a sale.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {cart.map((item) => (
                    <div key={item.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">{item.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">KES {item.price.toFixed(2)} / {item.unit}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:text-red-400" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-slate-800 rounded-lg overflow-hidden h-8">
                          <button className="px-3 hover:bg-slate-800 text-slate-400" onClick={() => updateQty(item.id, item.qty - 1)}>-</button>
                          <span className="px-3 text-xs font-mono text-white border-x border-slate-800 flex items-center">{item.qty}</span>
                          <button className="px-3 hover:bg-slate-800 text-slate-400" onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                        </div>
                        <p className="text-sm font-bold text-blue-400 font-mono">KES {(item.price * item.qty).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono">{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-white">
                  <span>Total Due</span>
                  <span className="text-blue-400 font-mono">KES {total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={paymentMethod === "CASH" ? "default" : "outline"}
                  className={cn("h-9 text-xs uppercase font-bold", paymentMethod === "CASH" ? "bg-blue-600" : "border-slate-800 text-slate-500")}
                  onClick={() => setPaymentMethod("CASH")}
                >
                  Cash
                </Button>
                <Button 
                  variant={paymentMethod === "MPESA" ? "default" : "outline"}
                  className={cn("h-9 text-xs uppercase font-bold", paymentMethod === "MPESA" ? "bg-emerald-600" : "border-slate-800 text-slate-500")}
                  onClick={() => setPaymentMethod("MPESA")}
                >
                  M-Pesa
                </Button>
              </div>

              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-bold" 
                disabled={cart.length === 0}
                onClick={handleCheckout}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Complete Sale
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

