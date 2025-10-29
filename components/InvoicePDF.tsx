

import React, { useState } from 'react';
import type { Invoice, CompanyInfo, Customer } from '../types';
import { GstType } from '../types';
import { generateDocumentPdf, printDocument } from '../services/pdfService';
import { Button } from './ui/Button';
import { Logo } from './ui/Logo';
import { PrintStyles } from './ui/PrintStyles';
import { PDFViewer, usePDFViewer } from './ui/PDFViewer';
import { PDFActionBar } from './ui/PDFActionBar';
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
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, companyInfo, customers, showFreightBreakdown = false }) => {
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
        if (lrCount <= 10) return 0.9;
        if (lrCount <= 15) return 0.8;
        if (lrCount <= 20) return 0.75;
        return 0.7; // For very long tables
    };
    
    const tableScale = getTableScale();

    return (
        <div id="invoice-pdf" className="bg-white p-4 text-sm font-sans" style={{ width: '420mm', minHeight: '297mm', fontFamily: 'sans-serif', lineHeight: '1.3', margin: '0 auto' }}>
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
                    font-size: 10px;
                    width: 100%;
                    table-layout: fixed;
                    border-collapse: collapse;
                }
                
                .invoice-table th,
                .invoice-table td {
                    padding: 6px 4px;
                    border: 1px solid #374151;
                    vertical-align: middle;
                    word-wrap: break-word;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                
                .invoice-table th {
                    background-color: #f3f4f6;
                    font-weight: 600;
                    text-align: center;
                    font-size: 10px;
                }
                
                .invoice-table td {
                    text-align: center;
                    font-size: 10px;
                }
                
                .invoice-table .text-left {
                    text-align: left !important;
                    white-space: normal;
                }
                
                .invoice-table .text-right {
                    text-align: right;
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
                    font-size: ${Math.max(6, 8 * tableScale)}px !important;
                }
                
                .charges-table th,
                .charges-table td {
                    padding: ${Math.max(1, 2 * tableScale)}px ${Math.max(2, 3 * tableScale)}px !important;
                    font-size: ${Math.max(6, 8 * tableScale)}px !important;
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
                        height: auto !important;
                        min-height: 100vh !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    
                    /* Ensure tables fit properly in landscape with auto-scaling */
                    .invoice-table {
                        font-size: ${Math.max(6, 8 * tableScale)}px !important;
                        width: 100% !important;
                        table-layout: fixed !important;
                        page-break-inside: avoid !important;
                        transform-origin: top left !important;
                    }
                    
                    .invoice-table th,
                    .invoice-table td {
                        padding: ${Math.max(1, 2 * tableScale)}px ${Math.max(2, 3 * tableScale)}px !important;
                        font-size: ${Math.max(6, 8 * tableScale)}px !important;
                        line-height: 1.2 !important;
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                    }
                    
                    /* Prevent table from breaking across pages */
                    .invoice-table tbody tr {
                        page-break-inside: avoid !important;
                    }
                    
                    /* Ensure headers stay with content */
                    .invoice-table thead {
                        display: table-header-group !important;
                    }
                    
                    /* Auto-scale table to fit page based on content */
                    .invoice-table {
                        transform: scale(${Math.min(tableScale, 0.8)}) !important;
                        transform-origin: top left !important;
                        width: ${100 / Math.min(tableScale, 0.8)}% !important; /* Compensate for scale */
                    }
                    
                    /* More aggressive scaling for print if needed */
                    @media print {
                        .invoice-table {
                            transform: scale(${Math.min(tableScale * 0.9, 0.75)}) !important;
                            width: ${100 / Math.min(tableScale * 0.9, 0.75)}% !important;
                        }
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
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center mb-4">
                        <Logo 
                            size="xl" 
                            showText={true} 
                            className="justify-center"
                            companyLogo={companyInfo?.logo}
                            companyName={companyInfo?.name}
                        />
                    </div>
                    <h1 className="text-4xl font-bold tracking-wider text-gray-800">{companyInfo?.name || 'Company Name'}</h1>
                    <p className="text-gray-600 text-sm">{companyInfo?.address || 'Company Address'}</p>
                    <p className="text-gray-600 text-sm font-semibold">PH: {companyInfo?.phone1 || 'N/A'} / {companyInfo?.phone2 || 'N/A'}</p>
                    <div className="flex justify-center space-x-4 text-gray-600 text-sm">
                        <span>E-Mail : {companyInfo?.email || 'N/A'}</span>
                        <span>Web :- {companyInfo?.website || 'N/A'}</span>
                    </div>
                    <p className="font-bold mt-2 text-sm">GSTIN: {companyInfo?.gstin || 'N/A'}</p>
                </div>

                {/* Customer and Invoice Details */}
                <div className="invoice-header border-t border-b border-gray-400 py-4 mb-4">
                    <div className="invoice-details">
                        <div>
                            <p><span className="font-bold w-24 inline-block">Customer :</span> {client?.name}</p>
                            <p className="flex items-start gap-2">
                                <span className="font-bold w-24 inline-block flex-shrink-0">Address :</span>
                                <span className="whitespace-pre-line text-xs flex-1">{client?.address}</span>
                            </p>
                            <p><span className="font-bold w-24 inline-block">GSTIN/- :</span> {client?.gstin}</p>
                        </div>
                        <div className="text-right">
                            <p><span className="font-bold">Invoice No :</span> {invoice.invoiceNumber}</p>
                            <p><span className="font-bold">Date :</span> {formatDate(invoice.date)}</p>
                        </div>
                    </div>
                </div>

                <p className="mb-4 font-semibold">Sub : {originLocationText}</p>
                
                {/* Lorry Receipts Table */}
                <div className="mb-4 no-break">
                    {tableScale < 1.0 && (
                        <div className="mb-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                            <strong>Note:</strong> Table has been automatically scaled to {Math.round(tableScale * 100)}% to fit all {lrCount} lorry receipts on one page.
                        </div>
                    )}
                    <table className="w-full text-xs border-collapse border border-gray-400 invoice-table">
                    <thead className="bg-gray-100">
                        <tr className="border-b-2 border-black">
                            <th className="p-2 border border-gray-300 font-semibold text-center">LR Number</th>
                            <th className="p-2 border border-gray-300 font-semibold text-center">LR Date</th>
                            <th className="p-2 border border-gray-300 font-semibold text-center">Destination</th>
                            <th className="p-2 border border-gray-300 font-semibold text-center">Reporting Date</th>
                            <th className="p-2 border border-gray-300 font-semibold text-center">Delivery Date</th>
                            <th className="p-2 border border-gray-300 font-semibold text-center">Invoice Number</th>
                            <th className="p-2 border border-gray-300 font-semibold text-center">Consigner Name</th>
                            <th className="p-2 border border-gray-300 text-right font-semibold">Packages</th>
                            <th className="p-2 border border-gray-300 text-right font-semibold">Weight (kg)</th>
                            <th className="p-2 border border-gray-300 text-center font-semibold">Material</th>
                            <th className="p-2 border border-gray-300 text-right font-semibold">Total Charges (₹)</th>
                            <th className="p-2 border border-gray-300 text-right font-semibold">Taxable Amount (₹)</th>
                            {invoice.gstType === GstType.CGST_SGST && (invoice.sgstAmount || 0) > 0 && (
                                <th className="p-2 border border-gray-300 text-right font-semibold gst-column">SGST (₹)</th>
                            )}
                            {invoice.gstType === GstType.CGST_SGST && (invoice.cgstAmount || 0) > 0 && (
                                <th className="p-2 border border-gray-300 text-right font-semibold gst-column">CGST (₹)</th>
                            )}
                            {invoice.gstType === GstType.IGST && (invoice.igstAmount || 0) > 0 && (
                                <th className="p-2 border border-gray-300 text-right font-semibold gst-column">IGST (₹)</th>
                            )}
                            <th className="p-2 border border-gray-300 text-right font-semibold">Total (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(invoice.lorryReceipts || []).map(lr => {
                            const consignor = lr.consignor;
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
                                <tr key={lr._id} className="border-b border-gray-300 hover:bg-gray-50">
                                    <td className="p-2 border border-gray-300 text-center text-xs" title={lr.lrNumber || ''}>{lr.lrNumber || ''}</td>
                                    <td className="p-2 border border-gray-300 text-center text-xs">{formatDate(lr.date)}</td>
                                    <td className="p-2 border border-gray-300 text-center text-xs" title={lr.to || ''}>{lr.to || ''}</td>
                                    <td className="p-2 border border-gray-300 text-center text-xs">{lr.reportingDate ? formatDate(lr.reportingDate) : '-'}</td>
                                    <td className="p-2 border border-gray-300 text-center text-xs">{lr.deliveryDate ? formatDate(lr.deliveryDate) : '-'}</td>
                                    <td className="p-2 border border-gray-300 text-center text-xs" title={lr.invoiceNo || ''}>{lr.invoiceNo || '-'}</td>
                                    <td className="p-2 border border-gray-300 text-left text-xs" title={consignor?.tradeName || consignor?.name || ''}>
                                        {consignor?.tradeName || consignor?.name || '-'}
                                    </td>
                                    <td className="p-2 border border-gray-300 text-right text-xs">{packs}</td>
                                    <td className="p-2 border border-gray-300 text-right text-xs">{weight.toLocaleString('en-IN')}</td>
                                    <td className="p-2 border border-gray-300 text-center text-xs" title={material}>{material}</td>
                                    <td className="p-2 border border-gray-300 text-right text-xs">
                                        {totalCharges.toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-2 border border-gray-300 text-right text-xs">{taxableAmount.toLocaleString('en-IN')}</td>
                                    {invoice.gstType === GstType.CGST_SGST && (invoice.sgstAmount || 0) > 0 && (
                                        <td className="p-2 border border-gray-300 text-right text-xs gst-column">{lrSgstAmount.toLocaleString('en-IN')}</td>
                                    )}
                                    {invoice.gstType === GstType.CGST_SGST && (invoice.cgstAmount || 0) > 0 && (
                                        <td className="p-2 border border-gray-300 text-right text-xs gst-column">{lrCgstAmount.toLocaleString('en-IN')}</td>
                                    )}
                                    {invoice.gstType === GstType.IGST && (invoice.igstAmount || 0) > 0 && (
                                        <td className="p-2 border border-gray-300 text-right text-xs gst-column">{lrIgstAmount.toLocaleString('en-IN')}</td>
                                    )}
                                    <td className="p-2 border border-gray-300 text-right text-xs font-semibold">{lrTotal.toLocaleString('en-IN')}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                    </table>
                    
                    {/* GST Type Information */}
                    <div className="mt-2 text-xs text-gray-600">
                        <p className="font-semibold">GST Information:</p>
                        <p>
                            {invoice.gstType === GstType.CGST_SGST 
                                ? `CGST + SGST (${invoice.cgstRate || 0}% + ${invoice.sgstRate || 0}% = ${(invoice.cgstRate || 0) + (invoice.sgstRate || 0)}%) - For same state transactions`
                                : `IGST (${invoice.igstRate || 0}%) - For inter-state transactions`
                            }
                        </p>
                        {invoice.isRcm && <p className="text-red-600 font-semibold">Note: GST payable under Reverse Charge Mechanism (RCM)</p>}
                    </div>
                </div>

                {/* Freight Charges Breakdown Table */}
                {showFreightBreakdown && (
                <div className="mb-4 no-break">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Freight Charges Breakdown</h3>
                    {tableScale < 1.0 && (
                        <div className="mb-2 text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                            <strong>Note:</strong> Freight breakdown table scaled to {Math.round(tableScale * 100)}% to match main table.
                        </div>
                    )}
                    <table className="w-full text-xs border-collapse border border-gray-400 invoice-table charges-table">
                        <thead className="bg-gray-100">
                            <tr className="border-b-2 border-black">
                                <th className="p-2 border border-gray-300 font-semibold text-center">LR Number</th>
                                <th className="p-2 border border-gray-300 font-semibold text-center">Freight (₹)</th>
                                <th className="p-2 border border-gray-300 font-semibold text-center">AOC (₹)</th>
                                <th className="p-2 border border-gray-300 font-semibold text-center">Hamali (₹)</th>
                                <th className="p-2 border border-gray-300 font-semibold text-center">B. Ch. (₹)</th>
                                <th className="p-2 border border-gray-300 font-semibold text-center">Tr. Ch. (₹)</th>
                                <th className="p-2 border border-gray-300 font-semibold text-center">Detention Ch. (₹)</th>
                                <th className="p-2 border border-gray-300 font-semibold text-center">Total (₹)</th>
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
                                        <tr key={lr._id} className="border-b border-gray-300 hover:bg-gray-50">
                                            <td className="p-2 border border-gray-300 text-center text-xs">{lr.lrNumber || ''}</td>
                                            <td className="p-2 border border-gray-300 text-right text-xs">{freight.toLocaleString('en-IN')}</td>
                                            <td className="p-2 border border-gray-300 text-right text-xs">{aoc.toLocaleString('en-IN')}</td>
                                            <td className="p-2 border border-gray-300 text-right text-xs">{hamali.toLocaleString('en-IN')}</td>
                                            <td className="p-2 border border-gray-300 text-right text-xs">{bCh.toLocaleString('en-IN')}</td>
                                            <td className="p-2 border border-gray-300 text-right text-xs">{trCh.toLocaleString('en-IN')}</td>
                                            <td className="p-2 border border-gray-300 text-right text-xs">{detentionCh.toLocaleString('en-IN')}</td>
                                            <td className="p-2 border border-gray-300 text-right text-xs font-semibold">{totalCharges.toLocaleString('en-IN')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="font-bold bg-gray-200">
                                <tr className="border-t-2 border-black">
                                    <td className="p-2 border border-gray-300 text-center text-xs">Totals:</td>
                                    <td className="p-2 border border-gray-300 text-right text-xs">{totalFreight.toLocaleString('en-IN')}</td>
                                    <td className="p-2 border border-gray-300 text-right text-xs">{(invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.charges?.aoc || 0), 0).toLocaleString('en-IN')}</td>
                                    <td className="p-2 border border-gray-300 text-right text-xs">{(invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.charges?.hamali || 0), 0).toLocaleString('en-IN')}</td>
                                    <td className="p-2 border border-gray-300 text-right text-xs">{(invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.charges?.bCh || 0), 0).toLocaleString('en-IN')}</td>
                                    <td className="p-2 border border-gray-300 text-right text-xs">{(invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.charges?.trCh || 0), 0).toLocaleString('en-IN')}</td>
                                    <td className="p-2 border border-gray-300 text-right text-xs">{(invoice.lorryReceipts || []).reduce((sum, lr) => sum + (lr.charges?.detentionCh || 0), 0).toLocaleString('en-IN')}</td>
                                    <td className="p-2 border border-gray-300 text-right text-xs">{subTotal.toLocaleString('en-IN')}</td>
                                </tr>
                            </tfoot>
                        </table>
                </div>
                )}
                
                {/* Total */}
                 <div className="flex justify-end mb-4 no-break">
                    <div className="w-2/5 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span>Sub Total:</span>
                            <span>{(invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {invoice.isAutoFreightCalculated && (
                            <div className="flex justify-between text-xs text-gray-600">
                                <span>Freight (Auto-calculated):</span>
                                <span>₹{totalFreight.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>Taxable Amount:</span>
                            <span>{(invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t-2 border-b-2 border-black py-1 text-base">
                            <span>Grand Total:</span>
                            <span>{(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                {/* RCM Notice */}
                {invoice.isRcm && (
                    <div className="text-center font-bold text-gray-700 my-4 p-2 border border-dashed border-gray-400">
                        <p>GST Payable under Reverse Charge as per Notification No. 13/2017 – CT (Rate).</p>
                    </div>
                )}

                {/* Amount in words and Remarks */}
                <div className="mb-8 text-sm no-break">
                    <p><span className="font-bold">Rs : </span>{numberToWords(Math.round(invoice.grandTotal || 0))} Only /-</p>
                    <p><span className="font-bold">Remark :</span> {invoice.remarks || ''}</p>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-end pt-4 border-t">
                    <div className="relative">
                        <p className="font-bold">FOR {companyInfo?.name || 'Company Name'}</p>
                        <div className="w-32 h-20 border-2 border-blue-500 rounded-full flex items-center justify-center text-blue-500 -rotate-12 mt-4">
                            <div className="text-center leading-tight">
                                <p className="font-bold">ALL INDIA</p>
                                <p className="font-bold text-xs">LOGISTICS</p>
                                <p className="text-xs">MUMBAI</p>
                                <p className="text-xs">400 001</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-left text-sm">
                        <p className="font-bold underline">Bank Details</p>
                        {companyInfo?.currentBankAccount ? (
                            <>
                                <p>{companyInfo.currentBankAccount.bankName}</p>
                               
                                <p>Account No: {companyInfo.currentBankAccount.accountNumber}</p>
                                <p>IFSC Code: {companyInfo.currentBankAccount.ifscCode}</p>
                                <p>Branch: {companyInfo.currentBankAccount.branch}</p>
                            </>
                        ) : (
                            <p className="text-gray-500">No bank account selected</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, companyInfo, customers, onBack }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [showFreightBreakdown, setShowFreightBreakdown] = useState(false);
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

    const handleViewPdf = async () => {
        // For now, we'll use the print functionality to generate a PDF blob
        // In a real implementation, you'd generate the PDF and create a blob URL
        try {
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (printWindow) {
                const element = document.getElementById('invoice-pdf-container');
                if (element) {
                    const clonedElement = element.cloneNode(true) as HTMLElement;
                    printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                            <head>
                                <title>Invoice ${invoice.invoiceNumber}</title>
                                <style>
                                    body { 
                                        margin: 0; 
                                        padding: 20px; 
                                        font-family: Arial, sans-serif; 
                                        background: white;
                                    }
                                    @page { 
                                        size: A4 landscape; 
                                        margin: 0.2in;
                                        orphans: 3;
                                        widows: 3;
                                    }
                                    .invoice-table {
                                        font-size: ${Math.max(6, 8 * tableScale)}px !important;
                                        width: 100% !important;
                                        table-layout: fixed !important;
                                        transform: scale(${Math.min(tableScale, 0.8)}) !important;
                                        transform-origin: top left !important;
                                    }
                                    .invoice-table th,
                                    .invoice-table td {
                                        padding: ${Math.max(1, 2 * tableScale)}px ${Math.max(2, 3 * tableScale)}px !important;
                                        font-size: ${Math.max(6, 8 * tableScale)}px !important;
                                        word-wrap: break-word !important;
                                    }
                                </style>
                            </head>
                            <body>
                                ${clonedElement.outerHTML}
                            </body>
                        </html>
                    `);
                    printWindow.document.close();
                }
            }
        } catch (error) {
            console.error('PDF view failed:', error);
            alert('Failed to open PDF viewer. Please try downloading instead.');
        }
    };

    return (
        <div>
            <PrintStyles documentType="invoice" orientation="landscape" />
            <div className="mb-4">
                <div className="flex justify-between items-center mb-4 no-print">
                    <div className="flex items-center space-x-4">
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
                </div>
            </div>
            <div id="invoice-pdf-container" className="print-container flex justify-center bg-gray-300 p-4 overflow-x-auto" style={{ minHeight: '100vh' }}>
                <div style={{ minWidth: '297mm', padding: '20px 0' }}>
                    <InvoiceView invoice={invoice} companyInfo={companyInfo} customers={customers} showFreightBreakdown={showFreightBreakdown} />
                </div>
            </div>
            <PDFViewerComponent />
        </div>
    );
}