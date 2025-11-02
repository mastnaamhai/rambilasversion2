import React, { useState, useEffect } from 'react';
import type { LorryReceipt, CompanyInfo, RiskBearer } from '../types';
import { generateMultiPagePdf, printDocument } from '../services/pdfService';
import { Button } from './ui/Button';
import { Logo } from './ui/Logo';
import { PrintStyles } from './ui/PrintStyles';
import { PDFViewer, usePDFViewer } from './ui/PDFViewer';
import { PDFActionBar } from './ui/PDFActionBar';
import { formatDate, numberToWords } from '../services/utils';
import { Card } from './ui/Card';
import { BottomSheet } from './ui/BottomSheet';
import { LorryReceiptCopySelector, CopySelection } from './ui/LorryReceiptCopySelector';
import { MobileActionButton } from './ui/MobileActionButton';
import { MobilePDFStyles } from './ui/MobilePDFStyles';
import { LorryReceiptCopyTabs } from './ui/LorryReceiptCopyTabs';
import { LorryReceiptCopyPreview } from './ui/LorryReceiptCopyPreview';

interface LorryReceiptPDFProps {
  lorryReceipt: LorryReceipt;
  companyInfo: CompanyInfo;
  onBack: () => void;
}

interface LorryReceiptViewProps {
    lorryReceipt: LorryReceipt;
    companyInfo: CompanyInfo;
    copyType?: string;
    hideCharges?: boolean;
}

const copyTypes = [
  'Original for Consignor',
  'Duplicate for Transporter',
  'Triplicate for Consignee',
  'Office Copy'
];

export const LorryReceiptView: React.FC<LorryReceiptViewProps> = ({ lorryReceipt, companyInfo, copyType = 'PREVIEW', hideCharges = true }) => {
    const { consignor, consignee } = lorryReceipt;

    const charges = [
        { label: 'Freight', value: lorryReceipt.charges?.freight || 0 },
        { label: 'AOC', value: lorryReceipt.charges?.aoc || 0 },
        { label: 'Hamali', value: lorryReceipt.charges?.hamali || 0 },
        { label: 'B. Ch.', value: lorryReceipt.charges?.bCh || 0 },
        { label: 'Tr. Ch.', value: lorryReceipt.charges?.trCh || 0 },
        { label: 'Detention Ch.', value: lorryReceipt.charges?.detentionCh || 0 },
    ];

    // Determine if this is a copy (not original)
    const isCopy = copyType && !copyType.includes('ORIGINAL') && copyType !== 'PREVIEW';

    return (
        <div className="bg-white p-2 text-xs font-sans break-inside-avoid shadow-lg relative" style={{ width: '210mm', minHeight:'297mm', fontFamily: 'Arial, sans-serif', lineHeight: '1.2' }}>
            {/* Watermark for copies */}
            {isCopy && (
                <div className="absolute inset-0 pointer-events-none z-10">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="text-6xl font-bold text-gray-300 opacity-30 transform rotate-45 select-none">
                            {copyType.toUpperCase()}
                        </div>
                    </div>
                </div>
            )}

            <div className="border-2 border-black p-2 relative z-20">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-4">
                    {/* Left - Logo */}
                    <div className="flex items-center">
                        <Logo
                            size="xl"
                            showText={false}
                            companyLogo={companyInfo?.logo}
                            companyName={companyInfo?.name}
                        />
                    </div>
                    
                    {/* Center - Religious Invocations and Company Name */}
                    <div className="flex-grow text-center">
                        <div className="mb-2">
                            <p className="text-sm font-semibold italic">!! Jai Bajarang Bali !!</p>
                            <p className="text-sm font-semibold italic">!! Jai Dada Nath !!</p>
                        </div>
                        <h1 className="text-4xl font-bold tracking-wider text-red-600 mb-2">{companyInfo?.name || 'Company Name'}</h1>
                        <p className="text-sm mb-1">{companyInfo?.address || 'Company Address'}</p>
                        <p className="text-sm">E-mail: {companyInfo?.email || 'email@company.com'} / Web.: {companyInfo?.website || 'www.company.com'}</p>
                    </div>
                    
                    {/* Right - Contact Numbers */}
                    <div className="text-right text-sm whitespace-nowrap">
                        <p className="font-semibold">Mob.: {companyInfo?.phone1 || 'Phone 1'}</p>
                        <p className="font-semibold">{companyInfo?.phone2 || 'Phone 2'}</p>
                    </div>
                </div>

                {/* Sub-Header Section - 3 Column Grid */}
                <div className="grid grid-cols-3 gap-1 mb-2">
                    {/* Left Box - Demurrage Charges */}
                    <div className="border border-black p-1">
                        <h3 className="font-bold text-center underline text-xs mb-1">SCHEDULE OF DEMURRAGE CHARGES</h3>
                        <p className="text-xs text-gray-600 whitespace-pre-line leading-tight">
                            {lorryReceipt.demurrageCharges || 'Demurrage after 15 days @ Rs.1/- per day per Quintal.'}
                        </p>
                    </div>

                    {/* Center Box - Copy Type and Risk Bearer */}
                    <div className="border border-black p-1">
                        <h3 className="font-bold text-center text-red-600 text-sm mb-1">CONSIGNEE COPY</h3>
                        
                        {/* Risk Bearer Section */}
                        <div>
                            <h4 className="text-xs font-bold text-center underline mb-1">RISK BEARER</h4>
                            <p className="text-xs font-bold text-center">{lorryReceipt.riskBearer || 'AT OWNER\'S RISK'}</p>
                        </div>
                    </div>

                    {/* Right Box - PAN/GSTIN */}
                    <div className="border border-black p-1">
                        <div className="text-center">
                            <p className="text-xs mb-1">PAN No.: {companyInfo?.pan || 'PAN Number'}</p>
                            <p className="text-xs">GSTIN: {companyInfo?.gstin || 'GSTIN Number'}</p>
                        </div>
                    </div>
                </div>

                {/* Information Boxes Section - 3 Column Grid */}
                <div className="grid grid-cols-3 gap-1 mb-2">
                    {/* Left Box - Notice */}
                    <div className="border border-black p-1">
                        <h3 className="font-bold text-center underline text-xs mb-1">NOTICE</h3>
                        <p className="text-xs text-gray-600 whitespace-pre-line leading-tight">
                            {lorryReceipt.notice || 'Consignments stored at destination under Transport Operator control. Delivered only to Consignee Bank or authorized parties with written authority.'}
                        </p>
                    </div>

                    {/* Center Box - Risk Declaration */}
                    <div className="border border-black p-1">
                        <h3 className="font-bold text-center underline text-xs mb-1">RISK DECLARATION</h3>
                        <p className="text-xs text-gray-600 whitespace-pre-line leading-tight">
                            {lorryReceipt.riskDeclaration || 'Goods accepted at owner\'s risk. Ensure proper insurance coverage.'}
                        </p>
                    </div>

                    {/* Right Box - Important Notice */}
                    <div className="border border-black p-1">
                        <h3 className="font-bold text-center underline text-xs text-red-600 mb-1">IMPORTANT NOTICE</h3>
                        <p className="text-xs text-gray-600 font-semibold whitespace-pre-line leading-tight">
                            {lorryReceipt.importantNotice || 'Consignment will not be detained, diverted, or re-routed without Consignee Bank\'s written permission.'}
                        </p>
                    </div>
                </div>

                {/* Main Body Section - 5 Column Grid (3+2 split) */}
                <div className="grid grid-cols-5 gap-1 mb-2">
                    {/* Left Side - Consignment Note and Addresses (3 columns) */}
                    <div className="col-span-3">
                        {/* Consignment Note */}
                        <div className="border border-black p-1 mb-2">
                            <h3 className="font-bold text-center underline text-xs mb-1">CONSIGNMENT NOTE</h3>
                            <p className="text-center text-lg font-bold mb-1">No. {lorryReceipt.lrNumber}</p>
                            <p className="text-center text-xs">Date: {formatDate(lorryReceipt.date)}</p>
                        </div>
                        
                        {/* Consignor's Name & Address */}
                        <div className="border border-black p-1 mb-2">
                            <h3 className="font-bold text-center underline text-xs mb-1">CONSIGNOR'S NAME & ADDRESS</h3>
                            <div className="text-xs space-y-0.5">
                                <p><strong>Name:</strong> {consignor?.name || 'N/A'}</p>
                                <p><strong>Address:</strong> {consignor?.address || 'N/A'}</p>
                                <p><strong>City:</strong> {consignor?.city || 'N/A'}</p>
                                <p><strong>State:</strong> {consignor?.state || 'N/A'}</p>
                                <p><strong>PIN:</strong> {consignor?.pin || 'N/A'}</p>
                                <p><strong>Phone:</strong> {consignor?.phone || 'N/A'}</p>
                                <p><strong>GSTIN:</strong> {consignor?.gstin || 'N/A'}</p>
                            </div>
                        </div>
                        
                        {/* Consignee's Name & Address */}
                        <div className="border border-black p-1">
                            <h3 className="font-bold text-center underline text-xs mb-1">CONSIGNEE'S NAME & ADDRESS</h3>
                            <div className="text-xs space-y-0.5">
                                <p><strong>Name:</strong> {consignee?.name || 'N/A'}</p>
                                <p><strong>Address:</strong> {consignee?.address || 'N/A'}</p>
                                <p><strong>City:</strong> {consignee?.city || 'N/A'}</p>
                                <p><strong>State:</strong> {consignee?.state || 'N/A'}</p>
                                <p><strong>PIN:</strong> {consignee?.pin || 'N/A'}</p>
                                <p><strong>Phone:</strong> {consignee?.phone || 'N/A'}</p>
                                <p><strong>GSTIN:</strong> {consignee?.gstin || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - GST, Insurance, and Route Details (2 columns) */}
                    <div className="col-span-2">
                        {/* GST Payable By */}
                        <div className="border border-black p-1 mb-1">
                            <h3 className="font-bold text-center underline text-xs mb-1">GST PAYABLE BY</h3>
                            <div className="text-xs space-y-0.5">
                                <p>□ Consignor ( )</p>
                                <p>□ Consignee ( )</p>
                                <p>□ Transporter ( )</p>
                            </div>
                        </div>
                        
                        
                        {/* Insurance Details */}
                        <div className="border border-black p-1 mb-1">
                            <h3 className="font-bold text-center underline text-xs mb-1">INSURANCE</h3>
                            <div className="text-xs space-y-0.5">
                                <p className="mb-1 text-center">The Customer has stated that:</p>
                                <div className="flex items-center mb-0.5">
                                    <div className="w-2 h-2 border border-black mr-1 flex items-center justify-center">
                                        {!lorryReceipt.insurance?.hasInsured && <div className="w-1 h-1 bg-black"></div>}
                                    </div>
                                    <span>He has not insured the Consignment</span>
                                </div>
                                <div className="flex items-center mb-1">
                                    <div className="w-2 h-2 border border-black mr-1 flex items-center justify-center">
                                        {lorryReceipt.insurance?.hasInsured && <div className="w-1 h-1 bg-black"></div>}
                                    </div>
                                    <span>He has insured the Consignment OR</span>
                                </div>
                                <div className="space-y-0.5">
                                    <p>Company: {lorryReceipt.insurance?.hasInsured ? (lorryReceipt.insurance?.company || '_________________') : '_________________'}</p>
                                    <p>Policy No: {lorryReceipt.insurance?.hasInsured ? (lorryReceipt.insurance?.policyNo || '_________________') : '_________________'}</p>
                                    <p>Date: {lorryReceipt.insurance?.hasInsured ? (lorryReceipt.insurance?.date || '_________________') : '_________________'}</p>
                                    <p>Amount: {lorryReceipt.insurance?.hasInsured ? `₹${lorryReceipt.insurance?.amount?.toLocaleString('en-IN') || '_________________'}` : '_________________'}</p>
                                    {lorryReceipt.insurance?.hasInsured && lorryReceipt.insurance?.risk && (
                                        <p>Risk: {lorryReceipt.insurance.risk}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Logistics Details - Inline Box Layout */}
                        <div className="grid grid-cols-2 gap-1 mb-1">
                            {/* Seal No */}
                            <div className="border border-black p-1">
                                <h3 className="font-bold text-center underline text-xs mb-0.5">SEAL NO.</h3>
                                <p className="text-center text-xs">{lorryReceipt.sealNo || 'N/A'}</p>
                            </div>
                            
                            {/* Vehicle No */}
                            <div className="border border-black p-1">
                                <h3 className="font-bold text-center underline text-xs mb-0.5">VEHICLE NO.</h3>
                                <p className="text-center text-xs">{lorryReceipt.vehicleNumber}</p>
                            </div>
                        </div>
                        
                        {/* Invoice No */}
                        <div className="border border-black p-1 mb-1">
                            <h3 className="font-bold text-center underline text-xs mb-0.5">INVOICE NO.</h3>
                            <p className="text-center text-xs">{lorryReceipt.invoiceNo || 'N/A'}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1">
                            {/* From */}
                            <div className="border border-black p-1">
                                <h3 className="font-bold text-center underline text-xs mb-0.5">FROM</h3>
                                <p className="text-center text-xs">{lorryReceipt.from}</p>
                            </div>
                            
                            {/* To */}
                            <div className="border border-black p-1">
                                <h3 className="font-bold text-center underline text-xs mb-0.5">TO</h3>
                                <p className="text-center text-xs">{lorryReceipt.to}</p>
                            </div>
                        </div>
                    </div>
                </div>



                {/* Packages and Charges Tables Section */}
                <div className="grid grid-cols-12 gap-1 mb-2">
                    {/* Left Side - Packages Table */}
                    <div className="col-span-8">
                        {/* Package Table Header */}
                        <div className="grid grid-cols-4 text-center font-bold border-2 border-black bg-gray-100 h-[3rem]">
                            <div className="col-span-1 border-r-2 border-black p-1 flex items-center justify-center text-xs leading-tight">
                                <div>
                                    <div>No. of</div>
                                    <div>Pkgs.</div>
                                </div>
                            </div>
                            <div className="col-span-1 border-r-2 border-black p-1 flex items-center justify-center text-xs leading-tight">
                                <div>
                                    <div>Method of</div>
                                    <div>Packing</div>
                                </div>
                            </div>
                            <div className="col-span-1 border-r-2 border-black p-1 flex items-center justify-center text-xs leading-tight">
                                <div>
                                    <div>DESCRIPTION</div>
                                    <div>(Said to Contain)</div>
                                </div>
                            </div>
                            <div className="col-span-1 p-1">
                                <div className="h-full flex flex-col">
                                    <div className="h-1/2 border-b-2 border-black flex items-center justify-center text-xs font-bold">WEIGHT</div>
                                    <div className="h-1/2 grid grid-cols-2">
                                        <div className="border-r-2 border-black flex items-center justify-center text-xs">Actual</div>
                                        <div className="flex items-center justify-center text-xs">Charged</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Package Table Body */}
                        <div className="min-h-[3rem] border-l-2 border-r-2 border-b-2 border-black bg-white">
                            {lorryReceipt.packages && lorryReceipt.packages.length > 0 ? (
                                lorryReceipt.packages.map((pkg, index) => (
                                    <div key={index} className={`grid grid-cols-4 border-b-2 border-black h-[2rem] items-center hover:bg-gray-50 last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                        <div className="col-span-1 border-r-2 border-black p-1 text-center h-full flex items-center justify-center text-xs font-medium">{pkg.count || ''}</div>
                                        <div className="col-span-1 border-r-2 border-black p-1 text-center h-full flex items-center justify-center text-xs font-medium">{pkg.packingMethod || ''}</div>
                                        <div className="col-span-1 border-r-2 border-black p-1 text-center h-full flex items-center justify-center text-xs font-medium">{pkg.description || ''}</div>
                                        <div className="col-span-1 p-1">
                                            <div className="grid grid-cols-2 h-full">
                                                <div className="border-r-2 border-black text-center h-full flex items-center justify-center text-xs font-medium">{pkg.actualWeight || ''}</div>
                                                <div className="text-center h-full flex items-center justify-center text-xs font-medium">{pkg.chargedWeight || ''}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="grid grid-cols-4 h-[2rem] items-center bg-white">
                                    <div className="col-span-1 border-r-2 border-black h-full"></div>
                                    <div className="col-span-1 border-r-2 border-black h-full"></div>
                                    <div className="col-span-1 border-r-2 border-black h-full"></div>
                                    <div className="col-span-1 p-1">
                                        <div className="grid grid-cols-2 h-full">
                                            <div className="border-r-2 border-black h-full"></div>
                                            <div className="h-full"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side - Charges Table */}
                    {!hideCharges && (
                        <div className="col-span-4">
                            {/* Charges Header */}
                            <div className="grid grid-cols-3 text-center font-bold border-2 border-black bg-gray-50 h-[2.5rem]">
                                <div className="col-span-2 border-r border-black p-1 flex items-center justify-center text-xs">RATE</div>
                                <div className="col-span-1 p-1 text-xs flex items-center justify-center">Amount To Pay</div>
                            </div>
                            {/* Charges Body */}
                            <div className="min-h-[3rem] border-l-2 border-r-2 border-b-2 border-black">
                                {charges.filter(charge => charge.value > 0).map(charge => (
                                    <div key={charge.label} className="grid grid-cols-3 border-b border-black h-[1.8rem] items-center hover:bg-gray-50 last:border-b-0">
                                        <div className="col-span-2 border-r border-black pl-1 h-full flex items-center text-xs">{charge.label}</div>
                                        <div className="col-span-1 pr-1 text-right h-full flex items-center text-xs">{charge.value.toFixed(2)}</div>
                                    </div>
                                ))}
                                {/* Show empty row if no charges */}
                                {charges.filter(charge => charge.value > 0).length === 0 && (
                                    <div className="grid grid-cols-3 h-[1.8rem] items-center">
                                        <div className="col-span-2 border-r border-black h-full"></div>
                                        <div className="col-span-1 h-full"></div>
                                    </div>
                                )}
                            </div>
                            {/* Charges Total */}
                            <div className="grid grid-cols-3 font-bold border-2 border-black bg-gray-100">
                                <div className="col-span-2 border-r border-black p-1 text-xs">TOTAL</div>
                                <div className="col-span-1 p-1 text-right text-xs">{(lorryReceipt.totalAmount || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="grid grid-cols-12 gap-1 mt-2">
                    {/* Left Side - E-Way Bill and Value */}
                    <div className="col-span-6">
                        <div className="grid grid-cols-2 gap-1 mb-1">
                            <div className="border border-black p-1">
                                <h3 className="font-bold text-xs underline mb-0.5">E-WAY BILL NO.</h3>
                                <p className="text-xs font-medium">{lorryReceipt.eWayBillNo || 'N/A'}</p>
                                {lorryReceipt.eWayBillValidUpto && (
                                    <div className="mt-1 pt-1 border-t border-gray-300">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs">Valid Upto:</span>
                                            <span className="text-xs font-semibold text-red-600">{formatDate(lorryReceipt.eWayBillValidUpto)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="border border-black p-1">
                                <h3 className="font-bold text-xs underline mb-0.5">VALUE OF GOODS Rs.</h3>
                                <p className="text-xs">{lorryReceipt.valueGoods || 0}</p>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 italic">
                            <p>Goods accepted for carriage on the terms and conditions printed overleaf.</p>
                        </div>
                    </div>
                    
                    {/* Right Side - Signature */}
                    <div className="col-span-6 flex flex-col justify-end items-center">
                        <p className="font-bold mt-4 pt-2 border-t-2 border-black w-full text-center text-xs">Signature of the Transport Operator</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export const LorryReceiptPDF: React.FC<LorryReceiptPDFProps> = ({ lorryReceipt, companyInfo, onBack }) => {
    // Provide fallback company info if null
    const safeCompanyInfo = companyInfo || {
        name: 'Company Name',
        address: 'Company Address',
        email: 'email@company.com',
        website: 'www.company.com',
        phone1: 'Phone 1',
        phone2: 'Phone 2',
        pan: 'PAN Number',
        gstin: 'GSTIN Number',
        logo: null
    };

    return (
        <LorryReceiptCopyPreview
            lorryReceipt={lorryReceipt}
            companyInfo={safeCompanyInfo}
            onBack={onBack}
        />
    );
}

