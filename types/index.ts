export type UserRole = 'admin' | 'teacher' | 'principal' | 'donor' | 'parent';

export interface User {
  email: string;
  role: UserRole;
  name: string;
  lastLogin?: string;
  createdAt: string;
  schoolId?: string;
}

export interface Student {
  name: string;
  mealServed: boolean;
  time: string;
  photoUrl: string | null;
  // Optional feedback fields for meal reactions and health observations
  mealReaction?: 'happy' | 'little' | 'none';
  healthObservation?: 'tired' | 'sick' | 'active' | null;
  notes?: string;
}

export interface StudentProfile {
  studentId: string;
  name: string;
  dateOfBirth: string;
  age: number;
  grade: string;
  classId?: string;
  parentName: string;
  parentContact: string;
  parentEmail?: string;
  allergies?: string;
  mealFeedbacks?: string | null;
  parentAccessToken?: string;
  createdAt?: string;
  teacherId?: string;
  mealServedToday?: boolean;
}

export interface MealTracking {
  teacherId: string;
  students: Record<string, Student>;
}

export interface InventoryItem {
  name: string;
  quantity: number;
  unit: string;
  supplier: string;
  lastRestocked: string;
  nextOrderDate: string;
}

export interface MealPlanItem {
  mealName: string;
  quantity: number;
  ingredients: string[];
  dietaryRestrictions: string[];
}

export interface MealPlan {
  principalId: string;
  schoolId: string;
  menu: MealPlanItem[];
  date: string;
  status: 'draft' | 'approved';
  createdAt: string;
  approvedAt?: string;
}

export interface Donation {
  donorId: string;
  donorName?: string;
  donorEmail?: string;
  schoolId?: string;
  mealPlanId?: string;
  amount: number;
  mealContribution: number;
  date: string;
  status: 'completed' | 'pending';
  donorMessage: string;
}

export interface Feedback {
  parentId: string;
  feedback: string;
  mealDate: string;
  status: 'submitted' | 'reviewed';
}

export interface Report {
  generatedBy: string;
  dateGenerated: string;
  mealsServed: number;
  shortages: number;
  donationsReceived: number;
  feedbackSummary: string;
}

export interface School {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  contactEmail: string;
  contactPhone: string;
  principalId: string;
  principalName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Teacher {
  name: string;
  email: string;
  userId?: string;
  schoolId: string;
  classId?: string;
  className?: string;
  addedBy: string;
  createdAt: string;
  isActive: boolean;
}

export interface ClassInfo {
  className: string;
  grade: string;
  numberOfStudents: number;
  teacherId?: string;
  teacherName?: string;
  assignedDonors?: string[];
  schoolId: string;
  createdAt: string;
}

export interface ClassDonationRequest {
  classId: string;
  className: string;
  schoolId: string;
  schoolName: string;
  principalId: string;
  principalName: string;
  numberOfStudents: number;
  donorId: string;
  donorName?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAmount?: number;
  purpose?: string;
  description?: string;
  createdAt: string;
  respondedAt?: string;
}

export interface MealProposal {
  classId: string;
  className: string;
  mealName: string;
  mealDescription: string;
  ingredients: string[];
  date: string;
  numberOfStudents: number;
  createdAt: string;
  createdBy: string;
}

export interface DonationRequest {
  schoolId: string;
  schoolName: string;
  principalId: string;
  principalName: string;
  mealPlanId?: string;
  requestedAmount: number;
  purpose: string;
  description: string;
  targetDate: string;
  status: 'active' | 'fulfilled' | 'cancelled';
  createdAt: string;
  fulfilledAmount: number;
  publishedDonationId?: string;
}

export interface PublishedDonation {
  donorId: string;
  donorName: string;
  donorEmail: string;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  numberOfStudents?: number;
  remainingStudents?: number;
  category: 'food' | 'supplies' | 'monetary' | 'other';
  monetaryValue?: number;
  availableFrom: string;
  expiryDate?: string;
  status: 'available' | 'reserved' | 'fulfilled';
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  deliveryOptions: string[];
  location?: string;
}

export interface DonationFulfillment {
  donationRequestId: string;
  publishedDonationId: string;
  donorId: string;
  principalId: string;
  schoolId: string;
  quantityFulfilled: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface MoneyDonationRecord {
  donorId: string;
  donorName?: string;
  donorEmail?: string;
  amount: number;
  note?: string;
  availableFrom?: string;
  createdAt?: string;
}

export interface DonationAssignment {
  publishedDonationId: string;
  donorId: string;
  donorName: string;
  principalId: string;
  principalName: string;
  schoolId: string;
  schoolName: string;
  classId: string;
  className: string;
  numberOfStudents: number;
  itemName: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'accepted' | 'dispatched' | 'claimed' | 'served' | 'rejected';
  createdAt: string;
  acceptedAt?: string;
  dispatchedAt?: string;
  claimedAt?: string;
  servedAt?: string;
  teacherId?: string;
  teacherName?: string;
  notes?: string;
}
