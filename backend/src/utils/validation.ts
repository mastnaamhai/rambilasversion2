import { z } from 'zod';
import { GstType, GstPayableBy, InvoiceStatus, LorryReceiptStatus, PaymentType, PaymentMode, RiskBearer } from '../types';

export const paginationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});


export const createInvoiceSchema = z.object({
  invoiceNumber: z.number().positive().optional(),
  customer: z.string().min(1),
  lorryReceipts: z.array(z.string().min(1)).min(1),
  date: z.string().min(1),
  totalAmount: z.number().nonnegative(),
  gstType: z.nativeEnum(GstType),
  cgstRate: z.number().nonnegative(),
  sgstRate: z.number().nonnegative(),
  igstRate: z.number().nonnegative(),
  cgstAmount: z.number().nonnegative(),
  sgstAmount: z.number().nonnegative(),
  igstAmount: z.number().nonnegative(),
  grandTotal: z.number().nonnegative(),
  isRcm: z.boolean().optional(),
  isManualGst: z.boolean().optional(),
  remarks: z.string().optional(),
  // Auto-calculated freight fields
  isAutoFreightCalculated: z.boolean().optional(),
  invoiceFreightTotal: z.number().nonnegative().optional(),
  // Separate freight charges fields
  freightCharges: z.object({
    amount: z.number().nonnegative().optional(),
    paymentType: z.enum(['Paid', 'To Pay', 'Not Applicable']).optional(),
    transporterName: z.string().optional(),
    lrNumber: z.string().optional(),
  }).optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial();

export const createLrSchema = z.object({
  lrNumber: z.number().positive().optional(),
  date: z.string().min(1),
  consignor: z.string().min(1),
  consignee: z.string().min(1),
  vehicleNumber: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  loadingAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
  packages: z.array(z.object({
    count: z.number().positive(),
    packingMethod: z.string().min(1),
    description: z.string().min(1),
    actualWeight: z.number().nonnegative(),
    chargedWeight: z.number().nonnegative(),
  })).min(1),
  charges: z.object({
    freight: z.union([z.number().nonnegative(), z.string()]).transform(val => val === '' ? 0 : Number(val) || 0).default(0),
    aoc: z.number().nonnegative().default(0),
    hamali: z.number().nonnegative().default(0),
    bCh: z.number().nonnegative().default(0),
    trCh: z.number().nonnegative().default(0),
    detentionCh: z.number().nonnegative().default(0),
  }),
  totalAmount: z.number().nonnegative(),
  eWayBillNo: z.string().optional(),
  eWayBillValidUpto: z.string().optional(),
  valueGoods: z.number().optional(),
  gstPayableBy: z.nativeEnum(GstPayableBy),
  riskBearer: z.nativeEnum(RiskBearer),
  reportingDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  insurance: z.object({
    hasInsured: z.boolean().default(false),
    company: z.string().optional(),
    policyNo: z.string().optional(),
    date: z.string().optional(),
    amount: z.number().optional(),
    risk: z.string().optional(),
  }).optional(),
  invoiceNo: z.string().optional(),
  sealNo: z.string().optional(),
});

export const updateLrSchema = createLrSchema.partial();

export const createPaymentSchema = z.object({
  invoiceId: z.string().optional(),
  truckHiringNoteId: z.string().optional(),
  customer: z.string().optional(),
  amount: z.number().positive(),
  date: z.string().min(1),
  type: z.nativeEnum(PaymentType),
  mode: z.nativeEnum(PaymentMode),
  referenceNo: z.string().optional(),
  notes: z.string().optional(),
  // TDS fields
  tdsApplicable: z.boolean().optional(),
  tdsRate: z.number().min(0).max(100).optional(),
  tdsAmount: z.number().nonnegative().optional(),
  tdsDate: z.string().optional(),
}).refine(data => data.invoiceId || data.truckHiringNoteId, {
  message: 'Either invoiceId or truckHiringNoteId is required',
}).refine(data => data.invoiceId ? (data.customer && data.customer.trim().length > 0) : true, {
  message: 'Customer is required for invoice payments',
}).refine(data => {
  // TDS can only be applied to Receipts
  if (data.tdsApplicable && data.type !== PaymentType.RECEIPT) {
    return false;
  }
  return true;
}, {
  message: 'TDS can only be applied to Receipts',
}).refine(data => {
  // If TDS is applicable, rate is required
  if (data.tdsApplicable && (data.tdsRate === undefined || data.tdsRate === null)) {
    return false;
  }
  return true;
}, {
  message: 'TDS rate is required when TDS is applicable',
});

export const updatePaymentSchema = createPaymentSchema.partial();

export const createTruckHiringNoteSchema = z.object({
  date: z.string().min(1),
  truckNumber: z.string().min(1),
  truckType: z.string().min(1),
  vehicleCapacity: z.number().positive(),
  loadingLocation: z.string().min(1),
  unloadingLocation: z.string().min(1),
  loadingDateTime: z.string().min(1),
  expectedDeliveryDate: z.string().min(1),
  goodsType: z.string().min(1),
  agencyName: z.string().min(1),
  truckOwnerName: z.string().min(1),
  truckOwnerContact: z.string().optional(),
  freightRate: z.number().nonnegative(),
  freightRateType: z.string().min(1),
  advanceAmount: z.number().nonnegative().optional(),
  paymentMode: z.string().min(1),
  paymentTerms: z.string().optional(),
  additionalCharges: z.number().nonnegative().optional(),
  remarks: z.string().optional(),
  linkedLR: z.string().optional(),
  linkedInvoice: z.string().optional(),
});

export const updateTruckHiringNoteSchema = createTruckHiringNoteSchema.partial();

export const createPromissoryNoteSchema = z.object({
  supplier: z.string().min(1),
  amount: z.number().positive(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  paymentTerms: z.string().optional(),
  isPaid: z.boolean().optional(),
});

export const updatePromissoryNoteSchema = createPromissoryNoteSchema.partial();


export const backupDataSchema = z.object({
  customers: z.array(z.any()),
  lorryReceipts: z.array(z.any()),
  invoices: z.array(z.any()),
  truckHiringNotes: z.array(z.any()),
  payments: z.array(z.any()),
  numberingConfigs: z.array(z.any()),
  companyInfo: z.array(z.any()).optional(),
  bankAccounts: z.array(z.any()).optional(),
});

// Company Info validation schemas
export const createCompanyInfoSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  state: z.string().min(1, 'State is required'),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  website: z.string().optional().refine((val) => {
    if (!val) return true; // Allow empty/undefined
    // Allow URLs with or without protocol
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
    return urlPattern.test(val);
  }, {
    message: 'Invalid website URL format'
  }),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  logo: z.string().optional(),
  currentBankAccount: z.string().optional(),
});

export const updateCompanyInfoSchema = createCompanyInfoSchema.partial();

// Bank Account validation schemas
export const createBankAccountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  ifscCode: z.string().min(1, 'IFSC code is required'),
  branch: z.string().min(1, 'Branch is required'),
  accountType: z.enum(['Savings', 'Current', 'Fixed Deposit', 'Recurring Deposit']).default('Current'),
  isActive: z.boolean().default(true),
});

export const updateBankAccountSchema = createBankAccountSchema.partial();


