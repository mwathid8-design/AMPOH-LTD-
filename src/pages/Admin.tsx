import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Users, 
  Settings, 
  Shield, 
  Database, 
  Activity, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  ChevronRight, 
  Save, 
  Lock, 
  Hospital,
  DollarSign,
  History,
  X,
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
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  orderBy, 
  addDoc, 
  limit 
} from "firebase/firestore";
import { User, Role, Branch, Service } from "@/src/types";

// Helper to log audit events
export const logAudit = async (userId: string, userName: string, action: string, target: string, branch: string) => {
  try {
    await addDoc(collection(db, "audit_logs"), {
      userId,
      userName,
      action,
      target,
      branch,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error logging audit:", error);
  }
};

export function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("USERS");

  const adminTabs = [
    { id: "USERS", label: "User Management", icon: Users },
    { id: "SERVICES", label: "Service Pricing", icon: DollarSign },
    { id: "INVENTORY", label: "Inventory", icon: Package },
    { id: "SYSTEM", label: "System Settings", icon: Settings },
    { id: "AUDIT", label: "Audit Logs", icon: History },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white uppercase tracking-wider">Administration Panel</h2>
        <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10">
          Admin Access Only
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Admin Navigation */}
        <div className="space-y-2">
          {adminTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-bold uppercase tracking-wider",
                activeTab === tab.id 
                  ? "bg-blue-600/10 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/10" 
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Admin Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === "USERS" && <UserManagement />}
          {activeTab === "SERVICES" && <ServiceManagement />}
          {activeTab === "INVENTORY" && <InventoryManagement />}
          {activeTab === "SYSTEM" && <SystemSettings />}
          {activeTab === "AUDIT" && <AuditLogs />}
        </div>
      </div>
    </div>
  );
}

function InventoryManagement() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    unit: "Tab"
  });

  useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const itemData = {
        name: formData.name,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        unit: formData.unit,
        updatedAt: new Date().toISOString()
      };

      if (editingItem) {
        await setDoc(doc(db, "inventory", editingItem.id), itemData, { merge: true });
      } else {
        await addDoc(collection(db, "inventory"), { ...itemData, createdAt: new Date().toISOString() });
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: "", price: "", stock: "", unit: "Tab" });
    } catch (error) {
      console.error("Error saving inventory item:", error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!user) return;
    if (confirm(`Delete ${name} from inventory?`)) {
      try {
        await deleteDoc(doc(db, "inventory", id));
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    }
  };

  return (
    <>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pharmacy Inventory</CardTitle>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
            <Plus className="w-3 h-3 mr-2" />
            Add Item
          </Button>
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
                  <TableHead className="text-right text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-200 text-sm">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[10px] border",
                        item.stock < 100 ? "text-red-400 border-red-500/20 bg-red-500/10" : "text-slate-400 border-slate-700"
                      )}>
                        {item.stock} {item.unit}s
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-mono text-sm">{item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-white"
                          onClick={() => {
                            setEditingItem(item);
                            setFormData({
                              name: item.name,
                              price: item.price.toString(),
                              stock: item.stock.toString(),
                              unit: item.unit
                            });
                            setShowModal(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-red-400"
                          onClick={() => handleDelete(item.id, item.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
                {editingItem ? "Edit Item" : "Add New Item"}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="text-slate-500">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Item Name</label>
                  <Input 
                    required
                    className="bg-slate-950 border-slate-800 text-white"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price (KES)</label>
                    <Input 
                      required
                      type="number"
                      step="0.01"
                      className="bg-slate-950 border-slate-800 text-white"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stock Level</label>
                    <Input 
                      required
                      type="number"
                      className="bg-slate-950 border-slate-800 text-white"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unit (e.g., Tab, Bottle)</label>
                  <Input 
                    required
                    className="bg-slate-950 border-slate-800 text-white"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                  {editingItem ? "Update Item" : "Add to Inventory"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    displayName: "",
    role: "STAFF" as Role,
    branch: "AMPOH LIMITED" as Branch
  });

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ ...doc.data() } as User));
      setUsers(usersData);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      // Create a document with email as ID for pre-authorization
      const clinicName = newUser.branch === "AMPOH LIMITED" ? "AMPOH LIMITED" : "AMPOH MEDICAL CENTRE";
      const userToCreate: Partial<User> = {
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        branch: newUser.branch,
        clinicName: clinicName,
        createdAt: new Date().toISOString()
      };
      
      // Use email as doc ID temporarily until they login
      await setDoc(doc(db, "users", newUser.email), userToCreate);
      
      await logAudit(user.uid, user.displayName, "Added User", newUser.email, user.branch);
      
      setShowAddModal(false);
      setNewUser({ email: "", displayName: "", role: "STAFF", branch: "AMPOH LIMITED" });
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteDoc(doc(db, "users", uid));
        await logAudit(user.uid, user.displayName, "Deleted User", uid, user.branch);
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  return (
    <>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">System Users</CardTitle>
          <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
            <Plus className="w-3 h-3 mr-2" />
            Add New User
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">Loading users...</div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-500">Name</TableHead>
                  <TableHead className="text-slate-500">Email</TableHead>
                  <TableHead className="text-slate-500">Role</TableHead>
                  <TableHead className="text-slate-500">Branch</TableHead>
                  <TableHead className="text-right text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.uid || u.email} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-200 text-sm">{u.displayName}</TableCell>
                    <TableCell className="text-slate-400 text-xs">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[10px] border",
                        u.role === "ADMIN" ? "text-red-400 border-red-500/20 bg-red-500/10" : "text-blue-400 border-blue-500/20 bg-blue-500/10"
                      )}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-xs">{u.branch}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-red-400"
                          onClick={() => handleDeleteUser(u.uid || u.email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">Add New Staff Member</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="text-slate-500">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                  <Input 
                    required
                    className="bg-slate-950 border-slate-800 text-white"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Google Email Address</label>
                  <Input 
                    required
                    type="email"
                    className="bg-slate-950 border-slate-800 text-white"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Role</label>
                    <select 
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-md h-10 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value as Role})}
                    >
                      <option value="STAFF">STAFF</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assigned Branch</label>
                    <select 
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-md h-10 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newUser.branch}
                      onChange={(e) => setNewUser({...newUser, branch: e.target.value as Branch})}
                    >
                      <option value="AMPOH LIMITED">AMPOH LIMITED</option>
                      <option value="AMPOH MEDICAL CENTRE">AMPOH MEDICAL CENTRE</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                  Authorize Staff Member
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function ServiceManagement() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "CONSULTATION" as Service["category"],
    price: "",
    branch: "BOTH" as Service["branch"]
  });

  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const serviceData = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        branch: formData.branch,
        updatedAt: new Date().toISOString()
      };

      if (editingService) {
        await setDoc(doc(db, "services", editingService.id), serviceData, { merge: true });
        await logAudit(user.uid, user.displayName, "Updated Service", formData.name, user.branch);
      } else {
        await addDoc(collection(db, "services"), { ...serviceData, createdAt: new Date().toISOString() });
        await logAudit(user.uid, user.displayName, "Added Service", formData.name, user.branch);
      }

      setShowModal(false);
      setEditingService(null);
      setFormData({ name: "", category: "CONSULTATION", price: "", branch: "BOTH" });
    } catch (error) {
      console.error("Error saving service:", error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!user) return;
    if (confirm(`Delete service "${name}"?`)) {
      try {
        await deleteDoc(doc(db, "services", id));
        await logAudit(user.uid, user.displayName, "Deleted Service", name, user.branch);
      } catch (error) {
        console.error("Error deleting service:", error);
      }
    }
  };

  return (
    <>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Service Pricing</CardTitle>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 h-8 text-xs">
            <Plus className="w-3 h-3 mr-2" />
            Add Service
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">Loading services...</div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-500">Service Name</TableHead>
                  <TableHead className="text-slate-500">Category</TableHead>
                  <TableHead className="text-slate-500">Price (KES)</TableHead>
                  <TableHead className="text-slate-500">Branch</TableHead>
                  <TableHead className="text-right text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-200 text-sm">{s.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">
                        {s.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-mono text-sm">{s.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-slate-400 text-[10px]">{s.branch}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-white"
                          onClick={() => {
                            setEditingService(s);
                            setFormData({
                              name: s.name,
                              category: s.category,
                              price: s.price.toString(),
                              branch: s.branch
                            });
                            setShowModal(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-red-400"
                          onClick={() => handleDelete(s.id, s.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">
                {editingService ? "Edit Service" : "Add New Service"}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowModal(false)} className="text-slate-500">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Service Name</label>
                  <Input 
                    required
                    className="bg-slate-950 border-slate-800 text-white"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</label>
                    <select 
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-md h-10 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value as Service["category"]})}
                    >
                      <option value="CONSULTATION">CONSULTATION</option>
                      <option value="LAB">LAB</option>
                      <option value="PROCEDURE">PROCEDURE</option>
                      <option value="PHARMACY">PHARMACY</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Price (KES)</label>
                    <Input 
                      required
                      type="number"
                      step="0.01"
                      className="bg-slate-950 border-slate-800 text-white"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Availability</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-md h-10 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.branch}
                    onChange={(e) => setFormData({...formData, branch: e.target.value as Service["branch"]})}
                  >
                    <option value="BOTH">BOTH CLINICS</option>
                    <option value="AMPOH LIMITED">AMPOH LIMITED ONLY</option>
                    <option value="AMPOH MEDICAL CENTRE">AMPOH MEDICAL CENTRE ONLY</option>
                  </select>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                  {editingService ? "Update Service" : "Create Service"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function SystemSettings() {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Clinic Configuration</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clinic Name</label>
            <Input className="bg-slate-950 border-slate-800 text-white h-10" defaultValue="AMPOH CLINIC" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Email</label>
            <Input className="bg-slate-950 border-slate-800 text-white h-10" defaultValue="admin@ampoh.com" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Currency Code</label>
            <Input className="bg-slate-950 border-slate-800 text-white h-10" defaultValue="KES" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tax Rate (%)</label>
            <Input className="bg-slate-950 border-slate-800 text-white h-10" defaultValue="0" />
          </div>
        </div>
        <Separator className="bg-slate-800" />
        <div className="flex justify-end">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">System Audit Trail</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center text-slate-500">Loading logs...</div>
        ) : (
          <div className="space-y-4 pt-4">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg bg-slate-950 border border-slate-800/50">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-slate-500">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-300">
                      <span className="text-blue-400">{log.userName}</span> {log.action}
                    </p>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
                    Target: {log.target} • Branch: {log.branch}
                  </p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="py-10 text-center text-slate-500">No audit logs found.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

