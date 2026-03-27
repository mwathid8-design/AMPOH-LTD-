import { Patient, Visit, LabRequest, Bill, Appointment, Branch } from "@/src/types";
import { format, addMonths, addYears } from "date-fns";

// Mock Data Generators
export const generatePatientNumber = () => `AMP-${Math.floor(10000 + Math.random() * 90000)}`;

export const mockPatients: Patient[] = [
  {
    id: "p1",
    patientNumber: "AMP-12345",
    name: "John Doe",
    phone: "0712345678",
    dob: "1990-05-15",
    gender: "Male",
    address: "Nairobi, Kenya",
    branch: "AMPOH LIMITED",
    createdAt: "2026-01-01T10:00:00Z",
    isArchived: false
  },
  {
    id: "p2",
    patientNumber: "AMP-67890",
    name: "Jane Smith",
    phone: "0722334455",
    dob: "1985-10-20",
    gender: "Female",
    address: "Thika, Kenya",
    branch: "AMPOH MEDICAL CENTRE",
    createdAt: "2026-02-15T14:30:00Z",
    isArchived: false
  }
];

export const mockVisits: Visit[] = [
  {
    id: "v1",
    patientId: "p1",
    branch: "AMPOH LIMITED",
    date: "2026-03-27T08:00:00Z",
    status: "Completed",
    vitals: { temp: "36.5", bp: "120/80", pulse: "72", weight: "75", height: "175", spo2: "98" },
    notes: "Patient complains of headache and fever.",
    diagnosis: "Malaria",
    managementPlan: "Start AL, Paracetamol 500mg TDS for 3 days.",
    reviewDate: "2026-03-30"
  }
];

export const mockBills: Bill[] = [
  {
    id: "b1",
    patientId: "p1",
    visitId: "v1",
    branch: "AMPOH LIMITED",
    items: [
      { description: "Consultation Fee", amount: 1000, category: "Consultation" },
      { description: "AL (Antimalarial)", amount: 500, category: "Pharmacy" },
      { description: "Paracetamol", amount: 100, category: "Pharmacy" }
    ],
    totalAmount: 1600,
    paidAmount: 1600,
    status: "Locked",
    createdAt: "2026-03-27T08:30:00Z"
  }
];

export const calculateFPNextDate = (method: string, dateGiven: string) => {
  const date = new Date(dateGiven);
  switch (method) {
    case 'Depo-Provera': return format(addMonths(date, 3), 'yyyy-MM-dd');
    case 'Implanon': return format(addYears(date, 3), 'yyyy-MM-dd');
    case 'Jadelle': return format(addYears(date, 5), 'yyyy-MM-dd');
    case 'Coil/IUCD': return format(addYears(date, 10), 'yyyy-MM-dd');
    default: return format(date, 'yyyy-MM-dd');
  }
};

export const getBranchData = <T extends { branch: Branch }>(data: T[], branch: Branch) => {
  if (branch === 'COMBINED') return data;
  return data.filter(item => item.branch === branch);
};
