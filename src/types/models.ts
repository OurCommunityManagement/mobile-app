export type Role = "platform" | "admin" | "user";

export type PlatformAdmin = {
  email: string;
  password: string;
};

export type Community = {
  id: string;
  slug: string;
  name: string;
  address?: string;
  adminEmail: string;
  createdAt: number;
};

export type PlatformCommunityInput = {
  name: string;
  slug: string;
  address?: string;
  adminEmail: string;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  active?: boolean;
  createdAt?: number;
};

export type Owner = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  password: string;
  cross?: string;
  house?: string;
  unitNo?: string;
  flatNo?: string;
  siteNo?: string;
  houseNo?: string;
  flats?: number;
  status?: string;
  createdAt?: string | number;
};

export type AmenitySlot = {
  id: string;
  label: string;
  charge?: number;
};

export type Amenity = {
  id: string;
  name: string;
  instructions?: string;
  enabled?: boolean;
  chargesEnabled?: boolean;
  advanceDays?: number;
  slots?: AmenitySlot[];
};

export type AmenityBooking = {
  id: string;
  amenityId: string;
  slotId: string;
  date: string;
  ownerEmail: string;
  ownerName: string;
  unitNo: string;
  amount: number;
  status: string;
  createdAt: number;
};

export type Visitor = {
  id: string;
  ownerEmail: string;
  ownerName: string;
  unitNo: string;
  visitorName: string;
  visitorPhone: string;
  visitDate: string;
  purpose?: string;
  passCode: string;
  status: string;
  entryTime: number | null;
  exitTime: number | null;
  createdAt: number;
};

export type Invoice = {
  id: string;
  ownerId: string;
  amount: number;
  penalty?: number;
  paidAmount?: number;
  paymentId?: string;
  status: "paid" | "pending" | "overdue" | "partial";
  month: number;
  year: number;
  dueDate?: string;
  type?: "flat" | "site" | "house" | string;
  freq?: "monthly" | "yearly" | string;
  paidDate?: string;
};

export type Payment = {
  id: string;
  ownerId: string;
  amount: number;
  date: string;
  month: number;
  year: number;
  mode?: string;
  notes?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt?: number;
};

export type ExpenseHead = {
  id: string;
  name: string;
  budget?: number;
  createdAt?: number;
};

export type ExpenseEntry = {
  id: string;
  headId: string;
  desc?: string;
  amount: number;
  date: string;
  month: number;
  year: number;
  createdAt: number;
};

export type Vehicle = {
  id: string;
  ownerId: string;
  ownerEmail: string;
  number: string;
  type: string;
  make?: string;
  color?: string;
  notes?: string;
  createdAt: number;
};

export type GateLog = {
  id: string;
  number: string;
  ownerId?: string | null;
  ownerName: string;
  ownerSite: string;
  vehType?: string;
  purpose: string;
  visitorName?: string;
  entryTime: string;
  exitTime: string | null;
  status: "inside" | "exited";
  createdAt: number;
};

export type CommunityData = {
  admin: PlatformAdmin | null;
  staffList: StaffMember[];
  owners: Owner[];
  invoices: Invoice[];
  payments: Payment[];
  expenseHeads: ExpenseHead[];
  expenses: ExpenseEntry[];
  amenities: Amenity[];
  amenityBookings: AmenityBooking[];
  visitors: Visitor[];
  vehicles: Vehicle[];
  gateLogs: GateLog[];
};

export type Session = {
  role: Role;
  email: string;
  cid?: string;
  staffName?: string;
  staffRole?: string;
  fromPlatform?: boolean;
  sessionToken?: string;
  expiresAt?: string;
};

export type PendingPlatformAuth = {
  email: string;
  accountType: "admin" | "staff";
  name: string;
  platformRole?: string;
  scope?: string;
  requiresTotp: boolean;
  totpSetupRequired: boolean;
  setupSecret?: string;
};

export type PendingCommunityAuth = {
  communityId: string;
  email: string;
  accountType: "admin" | "staff";
  name: string;
  staffRole?: string;
  totpSetupRequired: boolean;
  setupSecret?: string;
};

export type OtpStore = {
  email: string;
  otp: string;
  expiry: number;
};

export type OwnerProfileInput = {
  name: string;
  email: string;
  mobile: string;
};

export type AdminOwnerInput = {
  name: string;
  email: string;
  mobile?: string;
  unitNo?: string;
  cross?: string;
  temporaryPassword: string;
};

export type AdminInvoiceInput = {
  ownerId: string;
  amount: number;
  penalty?: number;
  dueDate?: string;
  month: number;
  year: number;
  freq?: "monthly" | "yearly" | string;
};

export type StaffInput = {
  id?: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  password?: string;
};

export type ExpenseHeadInput = {
  name: string;
  budget?: number;
};

export type ExpenseInput = {
  headId: string;
  desc?: string;
  amount: number;
  date: string;
};

export type AmenityInput = {
  id?: string;
  name: string;
  instructions?: string;
  enabled: boolean;
  chargesEnabled: boolean;
  advanceDays: number;
  slots: AmenitySlot[];
};

export type VehicleInput = {
  ownerId: string;
  number: string;
  type: string;
  make?: string;
  color?: string;
  notes?: string;
};

export type GateEntryInput = {
  number: string;
  visitorName?: string;
  purpose: string;
};

export type VisitorInput = {
  visitorName: string;
  visitorPhone: string;
  visitDate: string;
  purpose?: string;
};

export type OwnerPaymentInput = {
  invoiceId: string;
  mode: string;
  date: string;
  reference?: string;
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
};
