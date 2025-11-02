export enum LorryReceiptStatus {
  CREATED = 'Created',
  IN_TRANSIT = 'In Transit',
  DELIVERED = 'Delivered',
  INVOICED = 'Invoiced',
  PAID = 'Paid',
  UNBILLED = 'Unbilled',
}

export enum GstPayableBy {
  CONSIGNOR = 'Consignor',
  CONSIGNEE = 'Consignee',
  TRANSPORTER = 'Transporter',
}

export enum GstType {
    CGST_SGST = 'CGST/SGST',
    IGST = 'IGST',
}

export enum InvoiceStatus {
    UNPAID = 'Unpaid',
    PARTIALLY_PAID = 'Partially Paid',
    PAID = 'Paid',
}

export enum THNStatus {
    UNPAID = 'Unpaid',
    PARTIALLY_PAID = 'Partially Paid',
    PAID = 'Paid',
}

export enum PaymentType {
    ADVANCE = 'Advance',
    RECEIPT = 'Receipt',
    PAYMENT = 'Payment',
}

export enum PaymentMode {
    CASH = 'Cash',
    CHEQUE = 'Cheque',
    NEFT = 'NEFT',
    RTGS = 'RTGS',
    UPI = 'UPI',
}

export enum RiskBearer {
    CARRIER = "AT CARRIER'S RISK",
    OWNER = "AT OWNER'S RISK",
}

export interface Customer {
  _id: string;
  name: string; // Legal Name of Business
  tradeName?: string;
  address: string;
  state: string;
  gstin?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  city?: string;
  pin?: string;
  phone?: string;
  email?: string;
}

export interface Vehicle {
  _id: string;
  number: string;
}

export interface LorryReceipt {
  _id: string;
  lrNumber: number;
  date: string;
  reportingDate?: string;
  deliveryDate?: string;
  consignorId: string;
  consignor?: Customer;
  consigneeId: string;
  consignee?: Customer;
  vehicleNumber: string;
  from: string;
  to: string;
  loadingAddress?: string;
  deliveryAddress?: string;
  packages: {
    count: number;
    packingMethod: string;
    description: string;
    actualWeight: number;
    chargedWeight: number;
  }[];
  charges: {
    freight?: number;
    aoc: number;
    hamali: number;
    bCh: number;
    trCh: number;
    detentionCh: number;
  };
  totalAmount: number;
  eWayBillNo: string;
  eWayBillValidUpto?: string;
  valueGoods: number;
  gstPayableBy: GstPayableBy;
  riskBearer: RiskBearer;
  status: LorryReceiptStatus;
  insurance: {
      hasInsured: boolean;
      company?: string;
      policyNo?: string;
      date?: string;
      amount?: number;
  },
  invoiceNo: string;
  sealNo: string;
  remarks?: string;
  // Additional sections for fixed layout boxes
  demurrageCharges?: string;
  notice?: string;
  riskDeclaration?: string;
  importantNotice?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: number;
  date: string;
  customerId: string;
  customer?: Customer;
  lorryReceipts: LorryReceipt[];
  totalAmount: number;
  remarks: string;
  gstType: GstType;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  isRcm: boolean;
  isManualGst: boolean;
  status: InvoiceStatus;
  // Auto-calculated freight fields
  isAutoFreightCalculated: boolean;
  invoiceFreightTotal: number;
  // Separate freight charges fields
  freightCharges?: {
    amount: number;
    paymentType: 'Paid' | 'To Pay' | 'Not Applicable';
    transporterName?: string;
    lrNumber?: string;
  };
}

export interface CompanyInfo {
    name: string;
    address: string;
    state: string;
    phone1: string;
    phone2: string;
    email: string;
    website: string;
    gstin: string;
    pan: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    logo?: string; // Base64 encoded image or URL
}

export interface Payment {
    _id: string;
    invoiceId?: string;
    invoice?: Invoice;
    truckHiringNoteId?: string;
    truckHiringNote?: TruckHiringNote;
    customerId: string;
    customer?: Customer;
    date: string;
    amount: number;
    type: PaymentType;
    mode: PaymentMode;
    referenceNo?: string;
    notes?: string;
    // TDS fields
    tdsApplicable?: boolean;
    tdsRate?: number;
    tdsAmount?: number;
    tdsDate?: string;
}

export interface TruckHiringNote {
  _id: string;
  thnNumber: number;
  date: string;
  truckNumber: string;
  truckType: string;
  vehicleCapacity: number;
  loadingLocation: string;
  unloadingLocation: string;
  loadingDateTime: string;
  expectedDeliveryDate: string;
  goodsType: string;
  agencyName: string;
  truckOwnerName: string;
  truckOwnerContact?: string;
  freightRate: number;
  freightRateType: 'per_trip' | 'per_ton' | 'per_km';
  advanceAmount: number;
  balanceAmount: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
  paymentTerms: string;
  additionalCharges?: number;
  remarks?: string;
  linkedLR?: string;
  linkedInvoice?: string;
  status: THNStatus;
  paidAmount: number;
  payments: Payment[];
}

// Additional types for components
export interface PromissoryNote {
  _id: string;
  noteNumber: number;
  date: string;
  customerId: string;
  customer?: Customer;
  amount: number;
  dueDate: string;
  status: 'Pending' | 'Paid' | 'Overdue';
  remarks?: string;
}

export interface Supplier {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
}

export interface TruckRental {
  _id: string;
  rentalNumber: number;
  date: string;
  supplierId: string;
  supplier?: Supplier;
  vehicleId: string;
  vehicle?: Vehicle;
  rentalType: 'Daily' | 'Monthly' | 'Trip';
  rate: number;
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Completed' | 'Cancelled';
  remarks?: string;
}

export interface SupplierPayment {
  _id: string;
  paymentNumber: number;
  supplierId: string;
  supplier?: Supplier;
  truckRentalId?: string;
  truckRental?: TruckRental;
  date: string;
  amount: number;
  mode: PaymentMode;
  referenceNo?: string;
  remarks?: string;
}

export enum RentalType {
  DAILY = 'Daily',
  MONTHLY = 'Monthly',
  TRIP = 'Trip',
}

// Export ledger types
// Enhanced ledger types for double-entry bookkeeping

export interface LedgerTransaction {
  _id: string;
  date: string;
  voucherNumber?: string;
  voucherType: 'INVOICE' | 'PAYMENT' | 'ADVANCE' | 'RECEIPT' | 'JOURNAL' | 'THN';
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'DR' | 'CR';
  reference?: string; // Invoice number, THN number, etc.
  customerId?: string;
  customerName?: string;
  paymentMode?: string;
  notes?: string;
  linkedTransactionId?: string; // For linking related transactions
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientLedgerEntry {
  date: string;
  voucherNumber?: string;
  voucherType: 'INVOICE' | 'PAYMENT' | 'ADVANCE' | 'RECEIPT';
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'DR' | 'CR';
  reference?: string;
  paymentMode?: string;
  notes?: string;
}

export interface CompanyLedgerEntry {
  date: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'DR' | 'CR';
  reference?: string;
  customerName?: string;
  notes?: string;
}


export interface LedgerSummary {
  openingBalance: number;
  openingBalanceType: 'DR' | 'CR';
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  closingBalanceType: 'DR' | 'CR';
  transactionCount: number;
}

export interface ClientLedgerData {
  customerId: string;
  customerName: string;
  openingBalance: number;
  openingBalanceType: 'DR' | 'CR';
  transactions: ClientLedgerEntry[];
  summary: LedgerSummary;
}

export interface CompanyLedgerData {
  period: {
    startDate: string;
    endDate: string;
  };
  transactions: CompanyLedgerEntry[];
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    totalAssets: number;
    totalLiabilities: number;
  };
}


export interface LedgerFilters {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  voucherType?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface LedgerExportOptions {
  format: 'PDF' | 'EXCEL' | 'CSV';
  includeSummary: boolean;
  includeNotes: boolean;
  groupByCustomer?: boolean;
  groupByAccount?: boolean;
}

// Bank Account Types
export interface BankAccount {
  _id?: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  accountType: 'Savings' | 'Current' | 'Fixed Deposit' | 'Recurring Deposit';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Company Info Types
export interface CompanyInfo {
  _id?: string;
  name: string;
  address: string;
  state: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  website?: string;
  gstin?: string;
  pan?: string;
  logo?: string;
  bankAccounts?: BankAccount[];
  currentBankAccount?: BankAccount;
  createdAt?: string;
  updatedAt?: string;
}
