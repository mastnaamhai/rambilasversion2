import React, { useState } from 'react';
import type { TruckHiringNote, CompanyInfo } from '../types';
import { generateDocumentPdf, printDocument } from '../services/pdfService';
import { Button } from './ui/Button';
import { Logo } from './ui/Logo';
import { PrintStyles } from './ui/PrintStyles';
import { PDFViewer, usePDFViewer } from './ui/PDFViewer';
import { PDFActionBar } from './ui/PDFActionBar';
import { formatDate } from '../services/utils';

interface THNPdfProps {
    thn: TruckHiringNote;
    companyInfo: CompanyInfo;
    onBack: () => void;
}

export const THNPdf: React.FC<THNPdfProps> = ({ thn, companyInfo, onBack }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const { openViewer, PDFViewerComponent } = usePDFViewer();

    const handleGeneratePdf = async () => {
        setIsGenerating(true);
        try {
            await generateDocumentPdf(
                'thn-pdf-container', 
                'truck-hiring-note', 
                thn.thnNumber,
                thn.date
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
            await printDocument('thn-pdf-container', {
                orientation: 'portrait',
                scale: 'fit',
                margins: 'minimum'
            });
        } catch (error) {
            console.error('Print failed:', error);
            alert('Failed to print. Please try again.');
        } finally {
            setIsPrinting(false);
        }
    };

    const handleViewPdf = async () => {
        try {
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (printWindow) {
                const element = document.getElementById('thn-pdf-container');
                if (element) {
                    const clonedElement = element.cloneNode(true) as HTMLElement;
                    printWindow.document.write(`
                        <!DOCTYPE html>
                        <html>
                            <head>
                                <title>Truck Hiring Note ${thn.thnNumber}</title>
                                <style>
                                    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                                    @page { size: A4 portrait; margin: 0.5in; }
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
        <div className="space-y-6">
            <PrintStyles documentType="truck-hiring-note" orientation="portrait" />
            <div className="flex justify-between items-center no-print print-controls">
                <h2 className="text-3xl font-bold text-gray-800">Truck Hiring Note #{thn.thnNumber}</h2>
                <PDFActionBar
                    fileName={`THN-${thn.thnNumber}`}
                    onView={handleViewPdf}
                    onPrint={handlePrint}
                    onDownload={handleGeneratePdf}
                    onBack={onBack}
                    isGenerating={isGenerating}
                    isPrinting={isPrinting}
                />
            </div>

            <div id="thn-pdf-container" className="print-container">
                <div id="thn-pdf" className="thn-pdf bg-white shadow-2xl" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'sans-serif', lineHeight: '1.5', margin: '0 auto', border: '1px solid #e5e7eb' }}>
                    <style>{`
                        /* Screen styles - responsive scaling */
                        #thn-pdf {
                            transform: scale(1);
                            transform-origin: top left;
                            transition: transform 0.3s ease;
                            padding: 20px;
                        }
                        
                        @media (max-width: 1200px) {
                            #thn-pdf {
                                transform: scale(0.8);
                            }
                        }
                        
                        @media (max-width: 1000px) {
                            #thn-pdf {
                                transform: scale(0.7);
                            }
                        }
                        
                        @media (max-width: 800px) {
                            #thn-pdf {
                                transform: scale(0.6);
                            }
                        }
                        
                        .thn-pdf {
                            font-size: 12px;
                            color: #1f2937;
                        }
                        
                        .thn-pdf .section {
                            margin-bottom: 18px;
                        }
                        
                        .thn-pdf .grid-2 {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 20px;
                        }
                        
                        .thn-pdf .grid-3 {
                            display: grid;
                            grid-template-columns: 1fr 1fr 1fr;
                            gap: 16px;
                        }
                        
                        .thn-pdf .grid-4 {
                            display: grid;
                            grid-template-columns: 1fr 1fr 1fr 1fr;
                            gap: 16px;
                        }
                        
                        .thn-pdf .border-section {
                            border: 1.5px solid #d1d5db;
                            border-radius: 6px;
                            padding: 18px;
                            margin-bottom: 16px;
                            background: #ffffff;
                            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                        }
                        
                        .thn-pdf .header-bg {
                            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1d4ed8 100%);
                            color: white;
                            padding: 28px 24px;
                            border-radius: 8px;
                            margin-bottom: 28px;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
                        }
                        
                        .thn-pdf .info-row {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 10px 0;
                            border-bottom: 1px solid #e5e7eb;
                            transition: background-color 0.2s;
                        }
                        
                        .thn-pdf .info-row:hover {
                            background-color: #f9fafb;
                            margin: 0 -8px;
                            padding-left: 8px;
                            padding-right: 8px;
                            border-radius: 4px;
                        }
                        
                        .thn-pdf .info-row:last-child {
                            border-bottom: none;
                        }
                        
                        .thn-pdf .label {
                            font-weight: 600;
                            color: #4b5563;
                            min-width: 150px;
                            font-size: 12px;
                            text-transform: uppercase;
                            letter-spacing: 0.3px;
                        }
                        
                        .thn-pdf .value {
                            color: #111827;
                            text-align: right;
                            font-weight: 500;
                            font-size: 13px;
                            flex: 1;
                        }
                        
                        .thn-pdf .amount {
                            font-weight: 700;
                            color: #059669;
                            font-size: 14px;
                        }
                        
                        .thn-pdf .balance {
                            font-weight: 700;
                            color: #dc2626;
                            font-size: 14px;
                        }
                        
                        .thn-pdf .section-title {
                            font-size: 14px;
                            font-weight: 700;
                            color: #1f2937;
                            margin-bottom: 14px;
                            padding-bottom: 10px;
                            border-bottom: 2px solid #3b82f6;
                            text-transform: uppercase;
                            letter-spacing: 0.8px;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }
                        
                        .thn-pdf .highlight-box {
                            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                            border: 2px solid #3b82f6;
                            border-radius: 8px;
                            padding: 20px;
                            margin: 18px 0;
                            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
                        }
                        
                        .thn-pdf .signature-section {
                            background: #f9fafb;
                            border: 2px dashed #9ca3af;
                            border-radius: 8px;
                            padding: 24px;
                            text-align: center;
                            min-height: 120px;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                        }
                        
                        .thn-pdf .signature-line {
                            height: 2px;
                            background: #6b7280;
                            margin: 12px auto;
                            width: 80%;
                            max-width: 200px;
                        }
                        
                        .no-break {
                            page-break-inside: avoid;
                        }
                        
                        .thn-pdf .company-logo {
                            filter: brightness(0) invert(1);
                        }
                        
                        .thn-pdf .header-badge {
                            background: rgba(255, 255, 255, 0.25);
                            backdrop-filter: blur(10px);
                            padding: 8px 16px;
                            border-radius: 6px;
                            border: 1px solid rgba(255, 255, 255, 0.3);
                        }
                        
                        .thn-pdf .trip-route {
                            background: #f0f9ff;
                            border-left: 4px solid #3b82f6;
                            padding: 12px 16px;
                            border-radius: 4px;
                            margin: 12px 0;
                            font-weight: 500;
                        }
                        
                        .thn-pdf .financial-grid {
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                            gap: 16px;
                            margin: 16px 0;
                        }
                        
                        .thn-pdf .financial-total {
                            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                            border: 2px solid #10b981;
                            border-radius: 8px;
                            padding: 16px;
                            text-align: center;
                        }
                        
                        .thn-pdf .financial-balance {
                            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                            border: 2px solid #ef4444;
                            border-radius: 8px;
                            padding: 16px;
                            text-align: center;
                        }
                        
                        @media print {
                            #thn-pdf {
                                transform: none !important;
                                width: 100% !important;
                                padding: 15px !important;
                                box-shadow: none !important;
                                border: none !important;
                            }
                            
                            .thn-pdf {
                                page-break-inside: avoid;
                                font-size: 11px;
                                width: 100%;
                            }
                            
                            .thn-pdf .section {
                                margin-bottom: 14px;
                                page-break-inside: avoid;
                            }
                            
                            .thn-pdf .grid-2 {
                                display: grid !important;
                                grid-template-columns: 1fr 1fr !important;
                                gap: 14px !important;
                            }
                            
                            .thn-pdf .grid-4 {
                                display: grid !important;
                                grid-template-columns: 1fr 1fr 1fr 1fr !important;
                                gap: 10px !important;
                            }
                            
                            .thn-pdf .border-section {
                                border: 1px solid #000 !important;
                                padding: 12px !important;
                                margin-bottom: 10px !important;
                                background: #ffffff !important;
                                box-shadow: none !important;
                            }
                            
                            .thn-pdf .header-bg {
                                background: #1e40af !important;
                                padding: 20px !important;
                                margin-bottom: 20px !important;
                                box-shadow: none !important;
                                page-break-inside: avoid !important;
                            }
                            
                            .thn-pdf .info-row {
                                padding: 6px 0 !important;
                                border-bottom: 1px solid #d1d5db !important;
                            }
                            
                            .thn-pdf .info-row:hover {
                                background-color: transparent !important;
                                margin: 0 !important;
                                padding: 6px 0 !important;
                            }
                            
                            .thn-pdf .label {
                                font-size: 10px !important;
                                min-width: 120px !important;
                            }
                            
                            .thn-pdf .value {
                                font-size: 11px !important;
                            }
                            
                            .thn-pdf .section-title {
                                font-size: 12px !important;
                                margin-bottom: 10px !important;
                                padding-bottom: 6px !important;
                            }
                            
                            .thn-pdf .highlight-box {
                                padding: 14px !important;
                                margin: 12px 0 !important;
                                background: #f0f9ff !important;
                                border: 1.5px solid #3b82f6 !important;
                            }
                            
                            .thn-pdf .signature-section {
                                padding: 18px !important;
                                border: 1.5px dashed #6b7280 !important;
                            }
                            
                            .thn-pdf .signature-line {
                                height: 1px !important;
                                margin: 8px auto !important;
                            }
                        }
                    `}</style>
                
                {/* Enhanced Professional Header */}
                <div className="header-bg text-center">
                    <div className="flex justify-center items-center mb-5">
                        <Logo 
                            size="lg" 
                            showText={true} 
                            className="justify-center company-logo"
                            companyLogo={companyInfo?.logo}
                            companyName={companyInfo?.name}
                        />
                    </div>
                    <h1 className="text-3xl font-black mb-4 tracking-wide" style={{ letterSpacing: '2px' }}>TRUCK HIRING NOTE</h1>
                    <div className="flex justify-center items-center gap-8 flex-wrap">
                        <div className="header-badge">
                            <span className="font-semibold text-sm">THN No:</span>
                            <span className="font-black text-lg ml-2">#{thn.thnNumber}</span>
                        </div>
                        <div className="header-badge">
                            <span className="font-semibold text-sm">Date:</span>
                            <span className="font-black text-lg ml-2">{formatDate(thn.date)}</span>
                        </div>
                    </div>
                </div>

                {/* Trip Route Information - Highlighted */}
                <div className="trip-route no-break">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 text-center">
                            <div className="text-xs font-semibold text-gray-600 uppercase mb-1">From</div>
                            <div className="text-base font-bold text-gray-900">{thn.loadingLocation}</div>
                        </div>
                        <div className="flex items-center mx-4">
                            <div className="w-12 h-0.5 bg-blue-600"></div>
                            <div className="mx-2 text-blue-600 font-bold">→</div>
                            <div className="w-12 h-0.5 bg-blue-600"></div>
                        </div>
                        <div className="flex-1 text-center">
                            <div className="text-xs font-semibold text-gray-600 uppercase mb-1">To</div>
                            <div className="text-base font-bold text-gray-900">{thn.unloadingLocation}</div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid-2 no-break">
                    {/* Vehicle Information */}
                    <div className="border-section">
                        <div className="section-title">
                            <span>🚛</span>
                            <span>Vehicle Details</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Truck Number</span>
                            <span className="value font-semibold">{thn.truckNumber}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Truck Type</span>
                            <span className="value">{thn.truckType}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Capacity</span>
                            <span className="value">{thn.vehicleCapacity} tons</span>
                        </div>
                    </div>

                    {/* Party Information */}
                    <div className="border-section">
                        <div className="section-title">
                            <span>👥</span>
                            <span>Party Details</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Agency Name</span>
                            <span className="value font-semibold">{thn.agencyName}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Owner Name</span>
                            <span className="value">{thn.truckOwnerName}</span>
                        </div>
                        {thn.truckOwnerContact && (
                            <div className="info-row">
                                <span className="label">Contact</span>
                                <span className="value">{thn.truckOwnerContact}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Trip & Cargo Information */}
                <div className="grid-2 no-break">
                    <div className="border-section">
                        <div className="section-title">
                            <span>📍</span>
                            <span>Trip Schedule</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Loading Date & Time</span>
                            <span className="value">{formatDate(thn.loadingDateTime)}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Expected Delivery</span>
                            <span className="value">{formatDate(thn.expectedDeliveryDate)}</span>
                        </div>
                    </div>

                    <div className="border-section">
                        <div className="section-title">
                            <span>📦</span>
                            <span>Cargo Information</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Goods Type</span>
                            <span className="value">{thn.goodsType}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Payment Mode</span>
                            <span className="value">{thn.paymentMode}</span>
                        </div>
                    </div>
                </div>

                {/* Enhanced Financial Summary */}
                <div className="highlight-box no-break">
                    <div className="section-title">
                        <span>💰</span>
                        <span>Financial Summary</span>
                    </div>
                    
                    <div className="financial-grid">
                        <div className="info-row">
                            <span className="label">Freight Rate</span>
                            <span className="value amount">₹{thn.freightRate.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">Rate Type</span>
                            <span className="value">{thn.freightRateType.replace('_', ' ').toUpperCase()}</span>
                        </div>
                        {thn.additionalCharges > 0 && (
                            <div className="info-row">
                                <span className="label">Additional Charges</span>
                                <span className="value amount">₹{thn.additionalCharges.toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        <div className="info-row">
                            <span className="label">Advance Paid</span>
                            <span className="value amount">₹{thn.advanceAmount.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                    
                    <div className="grid-2 mt-6 pt-6 border-t-2 border-blue-400">
                        <div className="financial-total">
                            <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Total Amount</div>
                            <div className="text-2xl font-black text-emerald-700">
                                ₹{(thn.freightRate + (thn.additionalCharges || 0)).toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div className="financial-balance">
                            <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Balance Amount</div>
                            <div className="text-2xl font-black text-red-700">
                                ₹{thn.balanceAmount.toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Terms & Additional Info */}
                <div className="grid-2 no-break">
                    {thn.paymentTerms && (
                        <div className="border-section">
                            <div className="section-title">
                                <span>📋</span>
                                <span>Payment Terms</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed mt-2">{thn.paymentTerms}</p>
                        </div>
                    )}

                    {(thn.linkedLR || thn.linkedInvoice || thn.remarks) && (
                        <div className="border-section">
                            <div className="section-title">
                                <span>📝</span>
                                <span>Additional Information</span>
                            </div>
                            {thn.linkedLR && (
                                <div className="info-row">
                                    <span className="label">Linked LR</span>
                                    <span className="value">{thn.linkedLR}</span>
                                </div>
                            )}
                            {thn.linkedInvoice && (
                                <div className="info-row">
                                    <span className="label">Linked Invoice</span>
                                    <span className="value">{thn.linkedInvoice}</span>
                                </div>
                            )}
                            {thn.remarks && (
                                <div className="mt-3">
                                    <div className="label mb-2">Remarks</div>
                                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded border border-gray-200">{thn.remarks}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Enhanced Signatures */}
                <div className="grid-2 no-break mt-8">
                    <div className="signature-section">
                        <div className="text-sm font-semibold text-gray-700 mb-4">AGENCY SIGNATURE</div>
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-full">
                                <div className="signature-line"></div>
                                <div className="signature-line"></div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-base text-gray-900 font-bold">{thn.agencyName}</p>
                            <p className="text-xs text-gray-600 mt-1">Authorized Signatory</p>
                        </div>
                    </div>
                    <div className="signature-section">
                        <div className="text-sm font-semibold text-gray-700 mb-4">TRUCK OWNER SIGNATURE</div>
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-full">
                                <div className="signature-line"></div>
                                <div className="signature-line"></div>
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-base text-gray-900 font-bold">{thn.truckOwnerName}</p>
                            <p className="text-xs text-gray-600 mt-1">Truck Owner</p>
                        </div>
                    </div>
                </div>
                </div>
            </div>
            <PDFViewerComponent />
        </div>
    );
};
