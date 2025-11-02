import type { 
  Customer, 
  Invoice, 
  Payment, 
  TruckHiringNote
} from '../types';
import { PaymentType, PaymentMode } from '../types';
import type { 
  LedgerTransaction, 
  ClientLedgerEntry, 
  CompanyLedgerEntry, 
  ClientLedgerData, 
  CompanyLedgerData,
  LedgerSummary,
  LedgerFilters
} from '../types/ledger';

export class LedgerService {
  /**
   * Generate client ledger data for a specific customer
   */
  static generateClientLedger(
    customerId: string,
    customer: Customer,
    invoices: Invoice[],
    payments: Payment[],
    truckHiringNotes: TruckHiringNote[],
    filters?: LedgerFilters
  ): ClientLedgerData {
    // Filter transactions for this customer
    const customerInvoices = invoices.filter(inv => inv.customer?._id === customerId);
    const customerPayments = payments.filter(p => {
      if (typeof p.customerId === 'string') {
        return p.customerId === customerId;
      }
      return p.customer?._id === customerId;
    });
    const customerTHNs = truckHiringNotes.filter(thn => thn.truckOwnerName === customer.name);

    // Generate ledger entries
    const entries: ClientLedgerEntry[] = [];

    // Process invoices (debit entries)
    customerInvoices.forEach(invoice => {
      if (!filters || !filters.startDate || new Date(invoice.date) >= new Date(filters.startDate)) {
        entries.push({
          date: invoice.date,
          voucherNumber: `INV-${invoice.invoiceNumber}`,
          voucherType: 'INVOICE',
          particulars: `Invoice No: INV-${invoice.invoiceNumber} - ${this.getInvoiceDescription(invoice)}`,
          debit: invoice.grandTotal,
          credit: 0,
          balance: 0, // Will be calculated later
          balanceType: 'DR',
          reference: `INV-${invoice.invoiceNumber}`,
          notes: invoice.remarks || undefined
        });
      }
    });

    // Process payments (credit entries)
    customerPayments.forEach(payment => {
      if (!filters || !filters.startDate || new Date(payment.date) >= new Date(filters.startDate)) {
        const paymentType = payment.type === PaymentType.ADVANCE ? 'ADVANCE' : 'PAYMENT';
        const particulars = this.getPaymentParticulars(payment, customerInvoices, customerTHNs);
        
        entries.push({
          date: payment.date,
          voucherNumber: payment.referenceNo || `PAY-${payment._id.slice(-6)}`,
          voucherType: paymentType as any,
          particulars,
          debit: 0,
          credit: payment.amount,
          balance: 0, // Will be calculated later
          balanceType: 'CR',
          reference: payment.invoiceId ? `INV-${typeof payment.invoiceId === 'string' ? payment.invoiceId : (payment.invoiceId as Invoice).invoiceNumber}` : undefined,
          paymentMode: payment.mode,
          notes: payment.notes || undefined
        });
      }
    });

    // Sort entries by date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balances
    let runningBalance = 0;
    const processedEntries = entries.map(entry => {
      runningBalance += (entry.debit - entry.credit);
      return {
        ...entry,
        balance: Math.abs(runningBalance),
        balanceType: runningBalance >= 0 ? 'DR' : 'CR' as 'DR' | 'CR'
      };
    });

    // Generate summary
    const summary: LedgerSummary = {
      openingBalance: 0,
      openingBalanceType: 'DR',
      totalDebits: processedEntries.reduce((sum, entry) => sum + entry.debit, 0),
      totalCredits: processedEntries.reduce((sum, entry) => sum + entry.credit, 0),
      closingBalance: processedEntries.length > 0 ? processedEntries[processedEntries.length - 1].balance : 0,
      closingBalanceType: processedEntries.length > 0 ? processedEntries[processedEntries.length - 1].balanceType : 'DR',
      transactionCount: processedEntries.length
    };

    return {
      customerId,
      customerName: customer.name,
      openingBalance: 0,
      openingBalanceType: 'DR',
      transactions: processedEntries,
      summary
    };
  }

  /**
   * Generate company ledger data for all transactions
   */
  static generateCompanyLedger(
    customers: Customer[],
    invoices: Invoice[],
    payments: Payment[],
    truckHiringNotes: TruckHiringNote[],
    filters?: LedgerFilters
  ): CompanyLedgerData {
    const entries: CompanyLedgerEntry[] = [];
    const startDate = filters?.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters?.endDate || new Date().toISOString().split('T')[0];

    // Process invoices (credit to Sales, debit to Debtors)
    invoices.forEach(invoice => {
      if (new Date(invoice.date) >= new Date(startDate) && new Date(invoice.date) <= new Date(endDate)) {
        // Sales Revenue (Credit)
        entries.push({
          date: invoice.date,
          particulars: `Invoice No: INV-${invoice.invoiceNumber} - ${invoice.customer?.name || 'Unknown Customer'}`,
          debit: 0,
          credit: invoice.grandTotal,
          balance: 0,
          balanceType: 'CR',
          reference: `INV-${invoice.invoiceNumber}`,
          customerName: invoice.customer?.name,
          notes: invoice.remarks || undefined
        });

        // Accounts Receivable (Debit)
        entries.push({
          date: invoice.date,
          particulars: `Invoice No: INV-${invoice.invoiceNumber} - ${invoice.customer?.name || 'Unknown Customer'}`,
          debit: invoice.grandTotal,
          credit: 0,
          balance: 0,
          balanceType: 'DR',
          reference: `INV-${invoice.invoiceNumber}`,
          customerName: invoice.customer?.name,
          notes: invoice.remarks || undefined
        });
      }
    });

    // Process payments
    payments.forEach(payment => {
      if (new Date(payment.date) >= new Date(startDate) && new Date(payment.date) <= new Date(endDate)) {
        if (payment.type === PaymentType.ADVANCE) {
          // Advance Received (Credit)
          entries.push({
            date: payment.date,
            particulars: `Advance received from ${payment.customer?.name || 'Unknown Customer'} (Ref: ${payment.referenceNo || payment._id.slice(-6)})`,
            debit: 0,
            credit: payment.amount,
            balance: 0,
            balanceType: 'CR',
            reference: payment.referenceNo || payment._id.slice(-6),
            customerName: payment.customer?.name,
            notes: payment.notes || `Payment Mode: ${payment.mode}`
          });

          // Cash/Bank (Debit)
          entries.push({
            date: payment.date,
            particulars: `Advance received from ${payment.customer?.name || 'Unknown Customer'}`,
            debit: payment.amount,
            credit: 0,
            balance: 0,
            balanceType: 'DR',
            reference: payment.referenceNo || payment._id.slice(-6),
            customerName: payment.customer?.name,
            notes: payment.notes || `Payment Mode: ${payment.mode}`
          });
        } else {
          // Handle TDS for Receipts (Option 3a: TDS deducted from payment amount)
          const hasTDS = payment.tdsApplicable && payment.type === PaymentType.RECEIPT && payment.tdsAmount && payment.tdsAmount > 0;
          const grossAmount = hasTDS ? (payment.amount + payment.tdsAmount!) : payment.amount;
          const netAmount = payment.amount; // Already net after TDS deduction

          // Cash/Bank (Debit) - Net amount received (after TDS)
          entries.push({
            date: payment.date,
            particulars: hasTDS 
              ? `Payment received from ${payment.customer?.name || 'Unknown Customer'} (Net after TDS: ₹${payment.tdsAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`
              : `Payment received from ${payment.customer?.name || 'Unknown Customer'}`,
            debit: netAmount,
            credit: 0,
            balance: 0,
            balanceType: 'DR',
            reference: payment.referenceNo || payment._id.slice(-6),
            customerName: payment.customer?.name,
            notes: hasTDS 
              ? `${payment.notes || ''} Payment Mode: ${payment.mode}. TDS @ ${payment.tdsRate}%: ₹${payment.tdsAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`.trim()
              : payment.notes || `Payment Mode: ${payment.mode}`
          });

          // TDS Payable (Credit) - Only if TDS is applicable
          if (hasTDS) {
            entries.push({
              date: payment.tdsDate || payment.date,
              particulars: `TDS deducted from payment received from ${payment.customer?.name || 'Unknown Customer'} @ ${payment.tdsRate}%`,
              debit: 0,
              credit: payment.tdsAmount!,
              balance: 0,
              balanceType: 'CR',
              reference: payment.referenceNo || payment._id.slice(-6),
              customerName: payment.customer?.name,
              notes: `TDS @ ${payment.tdsRate}% on gross payment of ₹${grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            });
          }

          // Accounts Receivable (Credit) - Gross amount (before TDS)
          entries.push({
            date: payment.date,
            particulars: `Payment for ${payment.invoiceId ? `INV-${typeof payment.invoiceId === 'string' ? payment.invoiceId : (payment.invoiceId as Invoice).invoiceNumber}` : 'General Payment'} - ${payment.customer?.name || 'Unknown Customer'}${hasTDS ? ` (Gross: ₹${grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}, TDS: ₹${payment.tdsAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : ''}`,
            debit: 0,
            credit: grossAmount,
            balance: 0,
            balanceType: 'CR',
            reference: payment.invoiceId ? `INV-${typeof payment.invoiceId === 'string' ? payment.invoiceId : (payment.invoiceId as Invoice).invoiceNumber}` : undefined,
            customerName: payment.customer?.name,
            notes: payment.notes || `Payment Mode: ${payment.mode}`
          });
        }
      }
    });

    // Process THNs (expenses)
    truckHiringNotes.forEach(thn => {
      if (new Date(thn.date) >= new Date(startDate) && new Date(thn.date) <= new Date(endDate)) {
        // Freight Expense (Debit)
        entries.push({
          date: thn.date,
          particulars: `THN No: THN-${thn.thnNumber} - ${thn.truckOwnerName}`,
          debit: thn.freightRate,
          credit: 0,
          balance: 0,
          balanceType: 'DR',
          reference: `THN-${thn.thnNumber}`,
          customerName: thn.truckOwnerName,
          notes: `Route: ${thn.loadingLocation} to ${thn.unloadingLocation}`
        });

        // Cash/Bank (Credit) - assuming payment made
        entries.push({
          date: thn.date,
          particulars: `Payment for THN No: THN-${thn.thnNumber}`,
          debit: 0,
          credit: thn.freightRate,
          balance: 0,
          balanceType: 'CR',
          reference: `THN-${thn.thnNumber}`,
          customerName: thn.truckOwnerName,
          notes: `Route: ${thn.loadingLocation} to ${thn.unloadingLocation}`
        });
      }
    });

    // Sort entries by date
    entries.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Calculate running balances
    let runningBalance = 0;
    const processedEntries = entries.map(entry => {
      runningBalance += (entry.debit - entry.credit);
      
      return {
        ...entry,
        balance: Math.abs(runningBalance),
        balanceType: runningBalance >= 0 ? 'DR' : 'CR'
      };
    });

    // Calculate summary
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalExpenses = truckHiringNotes.reduce((sum, thn) => sum + thn.freightRate, 0);
    const netProfit = totalRevenue - totalExpenses;

    return {
      period: { startDate, endDate },
      transactions: processedEntries,
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        totalAssets: 0, // Would need asset calculations
        totalLiabilities: 0 // Would need liability calculations
      }
    };
  }

  /**
   * Get descriptive text for invoice
   */
  private static getInvoiceDescription(invoice: Invoice): string {
    const lrCount = invoice.lorryReceipts?.length || 0;
    const customerName = invoice.customer?.name || 'Unknown Customer';
    return `Freight charges for ${lrCount} LR${lrCount > 1 ? 's' : ''} - ${customerName}`;
  }

  /**
   * Get descriptive text for payment particulars
   */
  private static getPaymentParticulars(
    payment: Payment, 
    customerInvoices: Invoice[], 
    customerTHNs: TruckHiringNote[]
  ): string {
    const customerName = payment.customer?.name || 'Unknown Customer';
    const paymentMode = payment.mode;
    
    if (payment.type === PaymentType.ADVANCE) {
      return `Advance received from ${customerName} (Ref: ${payment.referenceNo || 'ADVANCE'}) - Mode: ${paymentMode}`;
    }
    
    if (payment.invoiceId) {
      const invoiceNumber = typeof payment.invoiceId === 'string' 
        ? payment.invoiceId 
        : (payment.invoiceId as Invoice).invoiceNumber;
      return `Payment for Invoice INV-${invoiceNumber} - ${customerName} (Mode: ${paymentMode})`;
    }
    
    if (payment.truckHiringNoteId) {
      const thnNumber = typeof payment.truckHiringNoteId === 'string' 
        ? payment.truckHiringNoteId 
        : (payment.truckHiringNoteId as TruckHiringNote).thnNumber;
      return `Payment for THN-${thnNumber} - ${customerName} (Mode: ${paymentMode})`;
    }
    
    return `Payment received from ${customerName} (Mode: ${paymentMode})`;
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number): string {
    return `₹${amount.toFixed(2)}`;
  }

  /**
   * Format date for display
   */
  static formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
