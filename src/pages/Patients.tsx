import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Search, 
  UserPlus, 
  MoreVertical, 
  Eye, 
  Edit, 
  Archive, 
  Phone, 
  Calendar, 
  MapPin,
  FileText,
  X,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Patient, Branch } from "@/src/types";
import { useAuth } from "@/src/context/AuthContext";
import { format } from "date-fns";
import { cn } from "@/src/lib/utils";
import { db } from "@/src/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from "firebase/firestore";

export function Patients() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    dob: "",
    gender: "Male" as any,
    address: "",
    photoUrl: ""
  });

  useEffect(() => {
    if (!user) return;

    const q = user.branch === 'COMBINED'
      ? query(collection(db, "patients"), orderBy("createdAt", "desc"))
      : query(collection(db, "patients"), where("branch", "==", user.branch), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientsData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Patient));
      setPatients(patientsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const generatePatientNumber = () => {
    const prefix = user?.branch === 'AMPOH MEDICAL CENTRE' ? 'AMC' : 'AL';
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Simple resize using canvas to keep it small
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setNewPatient({ ...newPatient, photoUrl: dataUrl });
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const patientData: Partial<Patient> = {
        patientNumber: generatePatientNumber(),
        name: newPatient.name,
        phone: newPatient.phone,
        dob: newPatient.dob,
        gender: newPatient.gender,
        address: newPatient.address,
        photoUrl: newPatient.photoUrl,
        branch: user.branch === 'COMBINED' ? 'AMPOH LIMITED' : user.branch as Branch,
        clinicName: user.branch === 'COMBINED' ? 'AMPOH LIMITED' : user.clinicName,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
      };

      await addDoc(collection(db, "patients"), patientData);
      setIsRegistering(false);
      setNewPatient({ name: "", phone: "", dob: "", gender: "Male", address: "", photoUrl: "" });
    } catch (error) {
      console.error("Error registering patient:", error);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.phone.includes(searchTerm) || 
    p.patientNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input 
            placeholder="Search by name, phone, or file number..." 
            className="pl-10 bg-slate-900 border-slate-800 text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsRegistering(true)} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Register Patient
        </Button>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Patient Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">Loading patients...</div>
          ) : (
            <Table>
              <TableHeader className="border-slate-800">
                <TableRow className="hover:bg-transparent border-slate-800">
                  <TableHead className="text-slate-500">File No.</TableHead>
                  <TableHead className="text-slate-500">Name</TableHead>
                  <TableHead className="text-slate-500">Phone</TableHead>
                  <TableHead className="text-slate-500">Gender</TableHead>
                  <TableHead className="text-slate-500">Branch</TableHead>
                  <TableHead className="text-slate-500">Registered</TableHead>
                  <TableHead className="text-right text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-mono text-blue-400">{patient.patientNumber}</TableCell>
                    <TableCell className="font-medium text-slate-200">{patient.name}</TableCell>
                    <TableCell className="text-slate-400">{patient.phone}</TableCell>
                    <TableCell className="text-slate-400">{patient.gender}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                        {patient.branch}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {patient.createdAt ? format(new Date(patient.createdAt), "dd MMM yyyy") : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-400">
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPatients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No patients found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Registration Modal */}
      {isRegistering && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl bg-slate-900 border-slate-800 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-white uppercase tracking-wider">New Patient Registration</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsRegistering(false)} className="text-slate-500">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Patient Photo (Optional)</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                        {newPatient.photoUrl ? (
                          <img src={newPatient.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-slate-700" />
                        )}
                      </div>
                      <Input 
                        type="file" 
                        accept="image/*"
                        className="bg-slate-950 border-slate-800 text-white text-xs" 
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                    <Input 
                      required
                      className="bg-slate-950 border-slate-800 text-white" 
                      placeholder="e.g. John Doe" 
                      value={newPatient.name}
                      onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                    <Input 
                      required
                      className="bg-slate-950 border-slate-800 text-white" 
                      placeholder="07XXXXXXXX" 
                      value={newPatient.phone}
                      onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth</label>
                    <Input 
                      required
                      type="date" 
                      className="bg-slate-950 border-slate-800 text-white" 
                      value={newPatient.dob}
                      onChange={(e) => setNewPatient({...newPatient, dob: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
                    <select 
                      className="w-full h-10 rounded-md border border-slate-800 bg-slate-950 px-3 py-1 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newPatient.gender}
                      onChange={(e) => setNewPatient({...newPatient, gender: e.target.value as any})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Residential Address</label>
                  <Input 
                    required
                    className="bg-slate-950 border-slate-800 text-white" 
                    placeholder="e.g. Nairobi, Kenya" 
                    value={newPatient.address}
                    onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsRegistering(false)}>Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Complete Registration
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
