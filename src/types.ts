export type Role = 'ADMIN' | 'STAFF';
export type Branch = 'AMPOH LIMITED' | 'AMPOH MEDICAL CENTRE' | 'COMBINED';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  branch: Branch;
  clinicName: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  patientNumber: string; // Auto-generated
  name: string;
  phone: string;
  email?: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  photoUrl?: string;
  branch: Branch;
  clinicName?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
  isArchived: boolean;
}

export interface Service {
  id: string;
  name: string;
  category: 'CONSULTATION' | 'LAB' | 'PROCEDURE' | 'PHARMACY' | 'OTHER';
  price: number;
  branch: Branch | 'BOTH';
  createdAt: string;
  updatedAt?: string;
}

export interface Visit {
  id: string;
  patientId: string;
  branch: Branch;
  date: string;
  status: 'Waiting' | 'Consultation' | 'Pending Lab' | 'Pending Billing' | 'Completed';
  vitals?: Vitals;
  notes?: string;
  diagnosis?: string;
  managementPlan?: string;
  reviewDate?: string;
}

export interface Vitals {
  temp: string;
  bp: string;
  pulse: string;
  weight: string;
  height: string;
  spo2: string;
}

export interface LabRequest {
  id: string;
  visitId: string;
  patientId: string;
  branch: Branch;
  tests: string[];
  status: 'Requested' | 'Pending' | 'In Progress' | 'Completed';
  results?: Record<string, string>;
  requestedAt: string;
  completedAt?: string;
}

export interface Prescription {
  id: string;
  visitId: string;
  patientId: string;
  branch: Branch;
  items: PrescriptionItem[];
  isBillable: boolean;
  createdAt: string;
}

export interface PrescriptionItem {
  medicine: string;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
  quantity: number;
  instructions: string;
}

export interface Procedure {
  id: string;
  visitId: string;
  patientId: string;
  branch: Branch;
  name: string;
  notes: string;
  isBillable: boolean;
  price: number;
  status?: 'Pending' | 'Completed';
  createdAt: string;
  completedAt?: string;
}

export interface FamilyPlanning {
  id: string;
  patientId: string;
  branch: Branch;
  method: string;
  dateGiven: string;
  nextDueDate: string;
  price: number;
  notes: string;
  administeredBy?: string;
  createdAt?: string;
}

export interface Bill {
  id: string;
  patientId: string;
  visitId?: string;
  branch: Branch;
  items: BillItem[];
  totalAmount: number;
  paidAmount: number;
  status: 'Unpaid' | 'Partial' | 'Paid' | 'Locked';
  createdAt: string;
}

export interface BillItem {
  description: string;
  amount: number;
  category: 'Consultation' | 'Lab' | 'Procedure' | 'Pharmacy' | 'FP' | 'OTC' | 'Other';
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  method: 'Cash' | 'M-Pesa' | 'Bank';
  date: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  branch: Branch;
  date: string;
  time?: string;
  type: 'Review' | 'FP' | 'Lab' | 'Dressing';
  status: 'Scheduled' | 'Completed' | 'Overdue' | 'PENDING' | 'ATTENDED' | 'MISSED';
}
