

import React, { useState } from 'react';
import type { Invoice, CompanyInfo, Customer } from '../types';
import { GstType } from '../types';
import { generateDocumentPdf, printDocument, printToPdfFile } from '../services/pdfService';
import { Button } from './ui/Button';
import { Logo } from './ui/Logo';
import { PrintStyles } from './ui/PrintStyles';
import { PDFViewer, usePDFViewer } from './ui/PDFViewer';
import { PDFActionBar } from './ui/PDFActionBar';
import { PrintPreview } from './ui/PrintPreview';
import { numberToWords, formatDate, getOriginLocationText } from '../services/utils';

interface InvoicePDFProps {
  invoice: Invoice;
  companyInfo: CompanyInfo;
  customers: Customer[];
  onBack: () => void;
}

interface InvoiceViewProps {
  invoice: Invoice;
  companyInfo: CompanyInfo;
  customers: Customer[];
  showFreightBreakdown?: boolean;
  hideTableBorders?: boolean;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, companyInfo, customers, showFreightBreakdown = false, hideTableBorders = false }) => {
    const client = invoice.customer;

    const totalPacks = (invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.packages || []).reduce((pkgSum, p) => pkgSum + (p.count || 0), 0), 0);
    const totalWeight = (invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.packages || []).reduce((pkgSum, p) => pkgSum + (p.chargedWeight || 0), 0), 0);
    // Use auto-calculated freight total if available, otherwise calculate from LRs (includes all charges)
    const totalFreight = invoice.invoiceFreightTotal || (invoice.lorryReceipts || []).reduce((sum, lr) => {
        // Calculate total charges for this LR (freight + all other charges)
        const totalCharges = (lr.charges?.freight || 0) + 
                            (lr.charges?.aoc || 0) + 
                            (lr.charges?.hamali || 0) + 
                            (lr.charges?.bCh || 0) + 
                            (lr.charges?.trCh || 0) + 
                            (lr.charges?.detentionCh || 0);
        return sum + totalCharges;
    }, 0);
    // Note: totalOtherCharges is now included in totalFreight, so we can remove this calculation
    const totalOtherCharges = 0; // Deprecated - now included in totalFreight
    const subTotal = invoice.totalAmount || 0;
    
    // Get the origin location text based on LR data
    const originLocationText = getOriginLocationText(invoice.lorryReceipts || []);
    
    // Calculate dynamic scaling based on number of LRs
    const lrCount = (invoice.lorryReceipts || []).length;
    const getTableScale = () => {
        if (lrCount <= 5) return 1.0;
        if (lrCount <= 10) return 0.95;
        if (lrCount <= 15) return 0.9;
        if (lrCount <= 20) return 0.85;
        return 0.85; // For very long tables - minimum scale to maintain readability
    };
    
    const tableScale = getTableScale();
    
    // Check if any LR has reporting/delivery dates for conditional column display
    const hasReportingDate = (invoice.lorryReceipts || []).some(lr => lr.reportingDate);
    const hasDeliveryDate = (invoice.lorryReceipts || []).some(lr => lr.deliveryDate);

    return (
        <div id="invoice-pdf" className="bg-white p-4 text-base font-sans" style={{ width: '420mm', minHeight: '297mm', fontFamily: 'sans-serif', lineHeight: '1.3', margin: '0 auto' }}>
            <style>{`
                /* Apply landscape styles to both screen and print */
                #invoice-pdf {
                    width: 420mm !important;
                    min-height: 297mm !important;
                    transform: scale(1);
                    transform-origin: top left;
                    transition: transform 0.3s ease;
                    background: white;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                }
                
                /* Responsive scaling for different screen sizes */
                @media (max-width: 1600px) {
                    #invoice-pdf {
                        transform: scale(0.8);
                    }
                }
                
                @media (max-width: 1400px) {
                    #invoice-pdf {
                        transform: scale(0.7);
                    }
                }
                
                @media (max-width: 1200px) {
                    #invoice-pdf {
                        transform: scale(0.6);
                    }
                }
                
                @media (max-width: 1000px) {
                    #invoice-pdf {
                        transform: scale(0.5);
                    }
                }
                
                @media (max-width: 800px) {
                    #invoice-pdf {
                        transform: scale(0.4);
                    }
                }
                
                /* Mobile-specific optimizations */
                @media (max-width: 768px) {
                    #invoice-pdf {
                        transform: scale(0.35);
                        padding: 8px !important;
                    }
                    
                    .invoice-table {
                        font-size: 9px !important;
                    }
                    
                    .invoice-table th,
                    .invoice-table td {
                        padding: 4px 2px !important;
                    }
                }
                
                @media (max-width: 640px) {
                    #invoice-pdf {
                        transform: scale(0.3);
                        padding: 6px !important;
                    }
                    
                    .invoice-table {
                        font-size: 8px !important;
                    }
                    
                    .invoice-table th,
                    .invoice-table td {
                        padding: 3px 1px !important;
                    }
                }
                
                @media (max-width: 480px) {
                    #invoice-pdf {
                        transform: scale(0.25);
                        padding: 4px !important;
                    }
                    
                    .invoice-table {
                        font-size: 7px !important;
                    }
                    
                    .invoice-table th,
                    .invoice-table td {
                        padding: 2px 1px !important;
                    }
                }
                
                
                .invoice-table {
                    page-break-inside: avoid;
                    font-size: 20px;
                    width: 100%;
                    table-layout: fixed;
                    border-collapse: collapse;
                }
                
                .invoice-table th,
                .invoice-table td {
                    padding: 8px 6px;
                    ${hideTableBorders ? 'border: none !important;' : 'border: 1px solid #374151;'}
                    vertical-align: middle;
                    word-wrap: break-word;
                    overflow: hidden;
                }
                
                .invoice-table th {
                    background-color: #f3f4f6;
                    font-weight: 600;
                    text-align: center;
                    font-size: 20px;
                    white-space: normal;
                }
                
                .invoice-table td {
                    text-align: center;
                    font-size: 20px;
                    white-space: normal;
                    overflow-wrap: break-word;
                }
                
                .invoice-table .text-left {
                    text-align: center !important;
                    white-space: normal;
                }
                
                .invoice-table .text-right {
                    text-align: center !important;
                }
                
                /* Column width optimization for landscape - better space utilization */
                .invoice-table th:nth-child(1), .invoice-table td:nth-child(1) { width: 6%; } /* LR Number */
                .invoice-table th:nth-child(2), .invoice-table td:nth-child(2) { width: 6%; } /* LR Date */
                .invoice-table th:nth-child(3), .invoice-table td:nth-child(3) { width: 8%; } /* Destination */
                .invoice-table th:nth-child(4), .invoice-table td:nth-child(4) { width: 6%; } /* Reporting Date */
                .invoice-table th:nth-child(5), .invoice-table td:nth-child(5) { width: 6%; } /* Delivery Date */
                .invoice-table th:nth-child(6), .invoice-table td:nth-child(6) { width: 7%; } /* Invoice Number */
                .invoice-table th:nth-child(7), .invoice-table td:nth-child(7) { width: 12%; } /* Consigner Name */
                .invoice-table th:nth-child(8), .invoice-table td:nth-child(8) { width: 5%; } /* Packages */
                .invoice-table th:nth-child(9), .invoice-table td:nth-child(9) { width: 6%; } /* Weight */
                .invoice-table th:nth-child(10), .invoice-table td:nth-child(10) { width: 8%; } /* Material */
                .invoice-table th:nth-child(11), .invoice-table td:nth-child(11) { width: 8%; } /* Total Charges */
                .invoice-table th:nth-child(12), .invoice-table td:nth-child(12) { width: 7%; } /* Taxable Amount */
                /* Dynamic GST columns - flexible width based on available columns */
                .invoice-table th:last-child, .invoice-table td:last-child { width: 7%; } /* Total - always last */
                
                /* GST columns styling */
                .gst-column {
                    background-color: #f0f9ff;
                    width: auto;
                    min-width: 5%;
                }
                
                /* Charges table column widths */
                .charges-table th:nth-child(1), .charges-table td:nth-child(1) { width: 10%; } /* LR Number */
                .charges-table th:nth-child(2), .charges-table td:nth-child(2) { width: 12%; } /* Freight */
                .charges-table th:nth-child(3), .charges-table td:nth-child(3) { width: 12%; } /* AOC */
                .charges-table th:nth-child(4), .charges-table td:nth-child(4) { width: 12%; } /* Hamali */
                .charges-table th:nth-child(5), .charges-table td:nth-child(5) { width: 12%; } /* B. Ch. */
                .charges-table th:nth-child(6), .charges-table td:nth-child(6) { width: 12%; } /* Tr. Ch. */
                .charges-table th:nth-child(7), .charges-table td:nth-child(7) { width: 15%; } /* Detention Ch. */
                .charges-table th:nth-child(8), .charges-table td:nth-child(8) { width: 15%; } /* Total */
                
                /* Apply same scaling to charges table */
                .charges-table {
                    transform: scale(${tableScale}) !important;
                    transform-origin: top left !important;
                    width: ${100 / tableScale}% !important;
                    font-size: ${Math.max(12, 20 * tableScale)}px !important;
                }
                
                .charges-table th,
                .charges-table td {
                    padding: ${Math.max(3, 8 * tableScale)}px ${Math.max(3, 6 * tableScale)}px !important;
                    font-size: ${Math.max(12, 20 * tableScale)}px !important;
                    ${hideTableBorders ? 'border: none !important;' : ''}
                }
                
                .invoice-table .text-right {
                    text-align: right;
                }
                
                .invoice-table .text-left {
                    text-align: left;
                }
                
                .no-break {
                    page-break-inside: avoid;
                }
                
                .invoice-header {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    gap: 2rem;
                    align-items: start;
                }
                
                .invoice-details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }
                
                /* Single box with divider styling */
                .invoice-single-box {
                    border: 2px solid #000;
                    background-color: #ffffff;
                }
                
                .invoice-divider {
                    border-top: 2px solid #000;
                    margin: 20px 0;
                    padding-top: 20px;
                }
                
                .invoice-section-top,
                .invoice-section-bottom {
                    /* Sections within the single box */
                }
                
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 0.2in;
                        orphans: 3;
                        widows: 3;
                    }
                    #invoice-pdf {
                        transform: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                    }
                    
                    /* Ensure single box is visible in print */
                    .invoice-single-box {
                        border: 2px solid #000 !important;
                        background-color: #ffffff !important;
                        page-break-inside: avoid !important;
                    }
                    
                    .invoice-divider {
                        border-top: 2px solid #000 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    
                    /* Ensure tables fit properly in landscape - NO TRANSFORMS in print */
                    .invoice-table {
                        transform: none !important;
                        width: 100% !important;
                        table-layout: fixed !important;
                        page-break-inside: avoid !important;
                        font-size: ${Math.max(12, 20 * tableScale)}px !important;
                    }
                    
                    .invoice-table th,
                    .invoice-table td {
                        padding: ${Math.max(4, 8 * tableScale)}px ${Math.max(4, 6 * tableScale)}px !important;
                        font-size: ${Math.max(12, 20 * tableScale)}px !important;
                        line-height: 1.4 !important;
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                        white-space: normal !important;
                        ${hideTableBorders ? 'border: none !important;' : ''}
                    }
                    
                    /* Reset charges table transforms in print */
                    .charges-table {
                        transform: none !important;
                        width: 100% !important;
                        font-size: ${Math.max(11, 20 * tableScale)}px !important;
                    }
                    
                    .charges-table th,
                    .charges-table td {
                        padding: ${Math.max(4, 8 * tableScale)}px ${Math.max(4, 6 * tableScale)}px !important;
                        font-size: ${Math.max(11, 20 * tableScale)}px !important;
                        ${hideTableBorders ? 'border: none !important;' : ''}
                    }
                    
                    /* Prevent table from breaking across pages */
                    .invoice-table tbody tr {
                        page-break-inside: avoid !important;
                    }
                    
                    /* Ensure headers stay with content */
                    .invoice-table thead {
                        display: table-header-group !important;
                    }
                    
                    /* Better spacing for landscape */
                    .invoice-header {
                        margin-bottom: 8px !important;
                    }
                    
                    .invoice-details {
                        margin-bottom: 6px !important;
                    }
                    
                    /* Ensure proper text wrapping */
                    .invoice-table td {
                        word-break: break-word !important;
                        hyphens: auto !important;
                        white-space: normal !important;
                        overflow-wrap: break-word !important;
                    }
                    
                    .invoice-table th {
                        white-space: normal !important;
                        overflow-wrap: break-word !important;
                    }
                    
                    /* Ensure all table content stays on one page */
                    .invoice-table,
                    .invoice-table tbody,
                    .invoice-table thead,
                    .invoice-table tfoot {
                        page-break-inside: avoid !important;
                    }
                    
                    /* Ensure table rows don't break */
                    .invoice-table tr {
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>
            <div className="w-full">
                {/* Company Header - Outside boxes */}
                <div className="mb-6 pb-4">
                    {/* Logo on Left, Company Name/Details on Right - Center aligned */}
                    <div className="flex items-start justify-center mb-3">
                        <div className="flex-shrink-0" style={{ width: '250px', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '-15px', marginLeft: '100px' }}>
                            <div style={{ transform: 'scale(3.0)', transformOrigin: 'center' }}>
                                <Logo 
                                    size="xl" 
                                    showText={false}
                                    companyLogo={companyInfo?.logo}
                                    companyName={companyInfo?.name}
                                />
                            </div>
                        </div>
                        <div className="text-center flex-1">
                            <h1 className="font-bold text-red-600 uppercase leading-tight mb-6" style={{ fontSize: '68px', letterSpacing: '2px', color: '#DC2626', fontWeight: '900', marginBottom: '24px' }}>
                                {companyInfo?.name || 'ALL INDIA LOGISTICS CHENNAI'}
                            </h1>
                            
                            {/* Company Details - Bold and Bigger */}
                            <div className="text-center">
                                <p className="text-gray-700 text-xl font-bold mb-1" style={{ fontWeight: '700' }}>{companyInfo?.address || 'Company Address'}</p>
                                <p className="text-gray-700 text-xl font-bold mb-1" style={{ fontWeight: '700' }}>
                                    PH: {companyInfo?.phone1 || 'N/A'} / {companyInfo?.phone2 || 'N/A'}
                                </p>
                                <div className="flex items-center justify-center gap-4 text-gray-700 text-xl font-bold mb-1">
                                    <span className="font-bold" style={{ fontWeight: '700' }}>E-Mail:- {companyInfo?.email || 'N/A'}</span>
                                    <span className="font-bold" style={{ fontWeight: '700' }}>Web :- {companyInfo?.website || 'N/A'}</span>
                                </div>
                                <p className="font-bold text-xl mt-1" style={{ fontWeight: '700' }}>GSTIN: {companyInfo?.gstin || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Single Box with Two Sections */}
                <div className="invoice-single-box" style={{ padding: '20px', border: '2px solid #000' }}>
                    {/* Top Section: Customer Details, Invoice Details, Table, Financial Summary */}
                    <div className="invoice-section-top">
                        {/* Customer and Invoice Details */}
                        <div className="invoice-header py-4 mb-4">
                            <div className="invoice-details">
                                <div>
                                    <p className="text-lg"><span className="font-bold w-24 inline-block">Customer :</span> {client?.name}</p>
                                    <p className="flex items-start gap-2 text-lg">
                                        <span className="font-bold w-24 inline-block flex-shrink-0">Add :</span>
                                        <span className="whitespace-pre-line flex-1">{client?.address}</span>
                                    </p>
                                    <p className="text-lg"><span className="font-bold w-24 inline-block">GSTIN: </span> {client?.gstin}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold">Invoice No : {invoice.invoiceNumber}</p>
                                    <p className="text-lg font-bold">Date : {formatDate(invoice.date)}</p>
                                </div>
                            </div>
                        </div>

                        <p className="mb-4 font-semibold text-lg">Sub : {originLocationText}</p>
                    
                    {/* Lorry Receipts Table */}
                    <div className="mb-4 no-break">
                        {tableScale < 1.0 && (
                            <div className="mb-2 text-sm text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                                <strong>Note:</strong> Table has been automatically scaled to {Math.round(tableScale * 100)}% to fit all {lrCount} lorry receipts on one page.
                            </div>
                        )}
                        <table className={`w-full border-collapse ${hideTableBorders ? '' : 'border border-gray-400'} invoice-table`}>
                            <thead className="bg-gray-100">
                                <tr className={hideTableBorders ? '' : 'border-b-2 border-black'}>
                                    <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>LR Number</th>
                                    <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>LR Date</th>
                                    <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>Destination</th>
                                    {hasReportingDate && (
                                        <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>Reporting Date</th>
                                    )}
                                    {hasDeliveryDate && (
                                        <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>Delivery Date</th>
                                    )}
                                    <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>Invoice Number</th>
                                    <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>Consigner Name</th>
                                    <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center font-semibold`}>Packages</th>
                                    <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center font-semibold`}>Weight (kg)</th>
                                    <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center font-semibold`}>Material</th>
                                    {!(invoice.isRcm === true) && (
                                        <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center font-semibold`}>Total Charges (₹)</th>
                                    )}
                                    {!(invoice.isRcm === true) && (
                                        <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center font-semibold`}>Taxable Amount (₹)</th>
                                    )}
                                    {invoice.gstType === GstType.CGST_SGST && (invoice.sgstAmount || 0) > 0 && (
                                        <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center font-semibold gst-column`}>SGST (₹)</th>
                                    )}
                                    {invoice.gstType === GstType.CGST_SGST && (invoice.cgstAmount || 0) > 0 && (
                                        <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center font-semibold gst-column`}>CGST (₹)</th>
                                    )}
                                    {invoice.gstType === GstType.IGST && (invoice.igstAmount || 0) > 0 && (
                                        <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center font-semibold gst-column`}>IGST (₹)</th>
                                    )}
                                    <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center font-semibold`}>Total (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(invoice.lorryReceipts || []).map(lr => {
                                    const consignor = lr.consignor;
                                    const consignee = lr.consignee;
                                    const customer = invoice.customer;
                                    
                                    // Determine which party name to show in "Consigner Name" column
                                    let displayParty = consignor; // Default fallback
                                    if (customer && consignor && customer._id === consignor._id) {
                                        // Customer is consignor, show consignee
                                        displayParty = consignee;
                                    } else if (customer && consignee && customer._id === consignee._id) {
                                        // Customer is consignee, show consigner
                                        displayParty = consignor;
                                    }
                                    
                                    const packs = (lr.packages || []).reduce((sum, p) => sum + (p.count || 0), 0);
                                    const weight = (lr.packages || []).reduce((sum, p) => sum + (p.chargedWeight || 0), 0);
                                    const material = (lr.packages || []).map(p => p.description).join(', ') || '-';
                                    const freightCharges = lr.charges?.freight || 0;
                                    const aoc = lr.charges?.aoc || 0;
                                    const hamali = lr.charges?.hamali || 0;
                                    const bCh = lr.charges?.bCh || 0;
                                    const trCh = lr.charges?.trCh || 0;
                                    const detentionCh = lr.charges?.detentionCh || 0;
                                    const totalCharges = freightCharges + aoc + hamali + bCh + trCh + detentionCh;
                                    const taxableAmount = lr.totalAmount || 0;
                                    
                                    // Calculate GST amounts for this LR (proportional to total invoice)
                                    const lrProportion = taxableAmount / (invoice.totalAmount || 1);
                                    let lrSgstAmount = 0;
                                    let lrCgstAmount = 0;
                                    let lrIgstAmount = 0;
                                    
                                    if (invoice.gstType === GstType.CGST_SGST) {
                                        lrSgstAmount = (invoice.sgstAmount || 0) * lrProportion;
                                        lrCgstAmount = (invoice.cgstAmount || 0) * lrProportion;
                                    } else if (invoice.gstType === GstType.IGST) {
                                        lrIgstAmount = (invoice.igstAmount || 0) * lrProportion;
                                    }
                                    
                                    const lrTotal = taxableAmount + lrSgstAmount + lrCgstAmount + lrIgstAmount;
                                    
                                    return (
                                        <tr key={lr._id} className={hideTableBorders ? 'hover:bg-gray-50' : 'border-b border-gray-300 hover:bg-gray-50'}>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`} title={lr.lrNumber || ''}>{lr.lrNumber || ''}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{formatDate(lr.date)}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`} title={lr.to || ''}>{lr.to || ''}</td>
                                            {hasReportingDate && (
                                                <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{lr.reportingDate ? formatDate(lr.reportingDate) : '-'}</td>
                                            )}
                                            {hasDeliveryDate && (
                                                <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{lr.deliveryDate ? formatDate(lr.deliveryDate) : '-'}</td>
                                            )}
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`} title={lr.invoiceNo || ''}>{lr.invoiceNo || '-'}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`} title={displayParty?.tradeName || displayParty?.name || ''}>
                                                {displayParty?.tradeName || displayParty?.name || '-'}
                                            </td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{packs}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{weight.toLocaleString('en-IN')}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`} title={material}>{material}</td>
                                            {!(invoice.isRcm === true) && (
                                                <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>
                                                    {totalCharges.toLocaleString('en-IN')}
                                                </td>
                                            )}
                                            {!(invoice.isRcm === true) && (
                                                <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{taxableAmount.toLocaleString('en-IN')}</td>
                                            )}
                                            {invoice.gstType === GstType.CGST_SGST && (invoice.sgstAmount || 0) > 0 && (
                                                <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm gst-column`}>{lrSgstAmount.toLocaleString('en-IN')}</td>
                                            )}
                                            {invoice.gstType === GstType.CGST_SGST && (invoice.cgstAmount || 0) > 0 && (
                                                <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm gst-column`}>{lrCgstAmount.toLocaleString('en-IN')}</td>
                                            )}
                                            {invoice.gstType === GstType.IGST && (invoice.igstAmount || 0) > 0 && (
                                                <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm gst-column`}>{lrIgstAmount.toLocaleString('en-IN')}</td>
                                            )}
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm font-semibold`}>{lrTotal.toLocaleString('en-IN')}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        
                        {/* GST Type Information */}
                        {!(invoice.isRcm === true) && (
                            <div className="mt-2 text-base text-gray-600">
                                <p className="font-semibold">GST Information:</p>
                                <p>
                                    {invoice.gstType === GstType.CGST_SGST 
                                        ? `CGST + SGST (${invoice.cgstRate || 0}% + ${invoice.sgstRate || 0}% = ${(invoice.cgstRate || 0) + (invoice.sgstRate || 0)}%) - For same state transactions`
                                        : `IGST (${invoice.igstRate || 0}%) - For inter-state transactions`
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Freight Charges Breakdown Table */}
                    {showFreightBreakdown && (
                    <div className="mb-4 no-break">
                        <h3 className="text-base font-semibold text-gray-800 mb-2">Freight Charges Breakdown</h3>
                        {tableScale < 1.0 && (
                            <div className="mb-2 text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                                <strong>Note:</strong> Freight breakdown table scaled to {Math.round(tableScale * 100)}% to match main table.
                            </div>
                        )}
                        <table className={`w-full border-collapse ${hideTableBorders ? '' : 'border border-gray-400'} invoice-table charges-table`}>
                        <thead className="bg-gray-100">
                            <tr className={hideTableBorders ? '' : 'border-b-2 border-black'}>
                                <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>LR Number</th>
                                <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>Freight (₹)</th>
                                <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>AOC (₹)</th>
                                <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>Hamali (₹)</th>
                                <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>B. Ch. (₹)</th>
                                <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>Tr. Ch. (₹)</th>
                                <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>Detention Ch. (₹)</th>
                                <th className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} font-semibold text-center`}>Total (₹)</th>
                            </tr>
                        </thead>
                            <tbody>
                                {(invoice.lorryReceipts || []).map(lr => {
                                    const freight = lr.charges?.freight || 0;
                                    const aoc = lr.charges?.aoc || 0;
                                    const hamali = lr.charges?.hamali || 0;
                                    const bCh = lr.charges?.bCh || 0;
                                    const trCh = lr.charges?.trCh || 0;
                                    const detentionCh = lr.charges?.detentionCh || 0;
                                    const totalCharges = freight + aoc + hamali + bCh + trCh + detentionCh;
                                    
                                    return (
                                        <tr key={lr._id} className={hideTableBorders ? 'hover:bg-gray-50' : 'border-b border-gray-300 hover:bg-gray-50'}>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{lr.lrNumber || ''}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{freight.toLocaleString('en-IN')}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{aoc.toLocaleString('en-IN')}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{hamali.toLocaleString('en-IN')}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{bCh.toLocaleString('en-IN')}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{trCh.toLocaleString('en-IN')}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{detentionCh.toLocaleString('en-IN')}</td>
                                            <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm font-semibold`}>{totalCharges.toLocaleString('en-IN')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="font-bold bg-gray-200">
                                <tr className={hideTableBorders ? '' : 'border-t-2 border-black'}>
                                    <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>Totals:</td>
                                    <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{totalFreight.toLocaleString('en-IN')}</td>
                                    <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{(invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.charges?.aoc || 0), 0).toLocaleString('en-IN')}</td>
                                    <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{(invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.charges?.hamali || 0), 0).toLocaleString('en-IN')}</td>
                                    <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{(invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.charges?.bCh || 0), 0).toLocaleString('en-IN')}</td>
                                    <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{(invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.charges?.trCh || 0), 0).toLocaleString('en-IN')}</td>
                                    <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{(invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.charges?.detentionCh || 0), 0).toLocaleString('en-IN')}</td>
                                    <td className={`p-2 ${hideTableBorders ? '' : 'border border-gray-300'} text-center text-sm`}>{subTotal.toLocaleString('en-IN')}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    )}
                    
                    {/* Total */}
                    <div className="flex justify-end mb-4 no-break">
                        <div className="w-2/5 space-y-1 text-lg">
                            <div className="flex justify-between">
                                <span>Sub Total:</span>
                                <span>{(invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            {invoice.isAutoFreightCalculated && (
                                <div className="flex justify-between text-base text-gray-600">
                                    <span>Freight (Auto-calculated):</span>
                                    <span>₹{totalFreight.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            {!invoice.isRcm && (
                                <div className="flex justify-between">
                                    <span>Taxable Amount:</span>
                                    <span>{(invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold py-1 text-xl">
                                <span>Grand Total:</span>
                                <span>{(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                    </div>

                    {/* Divider Border */}
                    <div className="invoice-divider" style={{ borderTop: '2px solid #000', margin: '20px 0', paddingTop: '20px' }}></div>

                    {/* Bottom Section: Amount in words, GSTIN Notes, Footer */}
                    <div className="invoice-section-bottom">
                        {/* Amount in words and Remarks */}
                        <div className="mb-8 text-lg no-break">
                            <p><span className="font-bold">Rs : </span>{numberToWords(Math.round(invoice.grandTotal || 0))} Only /-</p>
                            {invoice.isRcm ? (
                                <div>
                                    <p className="font-bold mb-2">GSTIN NOTE:</p>
                                    <p>(1) Registration Under GST For Goods Transport Agency Is Exempted.</p>
                                    <p>(2) GST On Goods Transport Agency (GTA) Services Is Payable By The Service Receiver Under Reverse Charge Mechanism</p>
                                </div>
                            ) : (
                                <p><span className="font-bold">Remark :</span> {invoice.remarks || ''}</p>
                            )}
                        </div>

                    {/* Footer */}
                    <div className="flex justify-between items-end pt-4">
                        <div className="relative">
                            <p className="font-bold text-lg">FOR {companyInfo?.name || 'Company Name'}</p>
                            <div className="w-32 h-20 border-2 border-blue-500 rounded-full flex items-center justify-center text-blue-500 -rotate-12 mt-4">
                                <div className="text-center leading-tight">
                                    <p className="font-bold text-sm">ALL INDIA</p>
                                    <p className="font-bold text-xs">LOGISTICS</p>
                                    <p className="text-xs">MUMBAI</p>
                                    <p className="text-xs">400 001</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex justify-center">
                            <div className="text-left text-base">
                                <p className="font-bold underline" style={{ color: '#DC2626' }}>Bank Details</p>
                                {companyInfo?.currentBankAccount ? (
                                    <>
                                        <p className="font-bold" style={{ color: '#DC2626' }}>{companyInfo.currentBankAccount.bankName}</p>
                                       
                                        <p className="font-bold" style={{ color: '#DC2626' }}>Account No: {companyInfo.currentBankAccount.accountNumber}</p>
                                        <p className="font-bold" style={{ color: '#DC2626' }}>IFSC Code: {companyInfo.currentBankAccount.ifscCode}</p>
                                        <p className="font-bold" style={{ color: '#DC2626' }}>Branch: {companyInfo.currentBankAccount.branch}</p>
                                    </>
                                ) : (
                                    <p className="text-gray-500">No bank account selected</p>
                                )}
                            </div>
                        </div>
                        <div className="w-0 flex-1"></div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, companyInfo, customers, onBack }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [showFreightBreakdown, setShowFreightBreakdown] = useState(false);
    const [hideTableBorders, setHideTableBorders] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [previewScale, setPreviewScale] = useState(1);
    const { openViewer, PDFViewerComponent } = usePDFViewer();

    const handleGeneratePdf = async () => {
        setIsGenerating(true);
        try {
            await generateDocumentPdf(
                'invoice-pdf-container', 
                'invoice', 
                invoice.invoiceNumber,
                invoice.date
            );
        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = async () => {
        // Show preview first
        setShowPrintPreview(true);
    };

    const handlePrintConfirmed = async () => {
        setShowPrintPreview(false);
        setIsPrinting(true);
        try {
            await printDocument('invoice-pdf-container', {
                orientation: 'landscape',
                scale: 'fit',
                margins: 'minimum',
                pageSize: 'A4',
                printBackground: true,
                preferCSSPageSize: true
            });
        } catch (error) {
            console.error('Print failed:', error);
            alert('Failed to print. Please try again.');
        } finally {
            setIsPrinting(false);
        }
    };

    const handlePrintToPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            await printToPdfFile('invoice-pdf-container', {
                orientation: 'landscape',
                fileName: `Invoice-${invoice.invoiceNumber}.pdf`
            });
        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleViewPdf = async () => {
        try {
            const element = document.getElementById('invoice-pdf-container');
            if (!element) {
                alert('Invoice content not found. Please try again.');
                return;
            }

            const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
            if (!printWindow) {
                alert('Popup blocked. Please allow popups for this site and try again.');
                return;
            }

            // Clone the element and get all styles
            const clonedElement = element.cloneNode(true) as HTMLElement;
            
            // Get all stylesheets
            const stylesheets = Array.from(document.styleSheets);
            let stylesText = '';
            
            for (const stylesheet of stylesheets) {
                try {
                    if (stylesheet.href) {
                        stylesText += `@import url("${stylesheet.href}");\n`;
                    } else if (stylesheet.ownerNode && stylesheet.ownerNode.textContent) {
                        stylesText += stylesheet.ownerNode.textContent + '\n';
                    }
                } catch (e) {
                    console.warn('Could not access stylesheet:', e);
                }
            }

            const printWindowHTML = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <title>Invoice ${invoice.invoiceNumber}</title>
                        <style>
                            ${stylesText}
                            
                            @page { 
                                size: A4 landscape; 
                                margin: 0.2in;
                                orphans: 3;
                                widows: 3;
                            }
                            
                            body { 
                                margin: 0; 
                                padding: 20px; 
                                font-family: Arial, sans-serif; 
                                background: #f5f5f5;
                                overflow: auto;
                            }
                            
                            .print-container {
                                background: white;
                                padding: 20px;
                                max-width: 100%;
                                margin: 0 auto;
                            }
                            
                            #invoice-pdf {
                                width: 100% !important;
                                max-width: 100% !important;
                                transform: none !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                box-sizing: border-box !important;
                            }
                            
                            .invoice-table,
                            .charges-table {
                                transform: none !important;
                                width: 100% !important;
                            }
                            
                            .no-print {
                                display: none !important;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="print-container">
                            ${clonedElement.outerHTML}
                        </div>
                    </body>
                </html>
            `;

            printWindow.document.write(printWindowHTML);
            printWindow.document.close();
            
            // Wait for content to load
            printWindow.onload = () => {
                printWindow.focus();
            };
        } catch (error) {
            console.error('PDF view failed:', error);
            alert('Failed to open PDF viewer. Please try downloading the PDF instead.');
        }
    };

    return (
        <div>
            <PrintStyles documentType="invoice" orientation="landscape" />
            <div className="mb-4">
                <div className="flex justify-between items-center mb-4 no-print flex-wrap gap-2">
                    <div className="flex items-center space-x-4 flex-wrap gap-2">
                        <label className="flex items-center cursor-pointer bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <input
                                type="checkbox"
                                checked={showFreightBreakdown}
                                onChange={(e) => setShowFreightBreakdown(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">
                                Show Freight Charges Breakdown
                            </span>
                        </label>
                        <label className="flex items-center cursor-pointer bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                            <input
                                type="checkbox"
                                checked={hideTableBorders}
                                onChange={(e) => setHideTableBorders(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">
                                Hide Table Borders
                            </span>
                        </label>
                        <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <span className="text-sm font-medium text-gray-700">Zoom:</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
                                className="px-2 py-1"
                            >
                                −
                            </Button>
                            <span className="text-sm font-medium text-gray-700 w-12 text-center">
                                {Math.round(previewScale * 100)}%
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewScale(Math.min(2, previewScale + 0.1))}
                                className="px-2 py-1"
                            >
                                +
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewScale(1)}
                                className="px-2 py-1 ml-2"
                            >
                                Reset
                            </Button>
                        </div>
                    </div>
                    <PDFActionBar
                        fileName={`Invoice-${invoice.invoiceNumber}`}
                        onView={handleViewPdf}
                        onPrint={handlePrint}
                        onDownload={handleGeneratePdf}
                        onBack={onBack}
                        isGenerating={isGenerating}
                        isPrinting={isPrinting}
                    />
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            onClick={handlePrintToPdf}
                            disabled={isGeneratingPdf}
                        >
                            {isGeneratingPdf ? 'Generating PDF...' : 'Print to PDF'}
                        </Button>
                    </div>
                </div>
            </div>
            <div 
                id="invoice-pdf-container" 
                className="print-container flex justify-center bg-gray-300 p-4 overflow-auto" 
                style={{ 
                    minHeight: '100vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    padding: '20px'
                }}
            >
                <div 
                    style={{ 
                        transform: `scale(${previewScale})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.2s ease',
                        width: '420mm',
                        minHeight: '297mm',
                        padding: '20px 0'
                    }}
                >
                    <InvoiceView invoice={invoice} companyInfo={companyInfo} customers={customers} showFreightBreakdown={showFreightBreakdown} hideTableBorders={hideTableBorders} />
                </div>
            </div>
            <PDFViewerComponent />
            {showPrintPreview && (
                <PrintPreview
                    elementId="invoice-pdf-container"
                    isOpen={showPrintPreview}
                    onClose={() => setShowPrintPreview(false)}
                    onPrint={handlePrintConfirmed}
                    orientation="landscape"
                    title={`Print Preview - Invoice ${invoice.invoiceNumber}`}
                />
            )}
        </div>
    );
}