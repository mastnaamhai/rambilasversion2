import React from 'react';

interface PrintStylesProps {
  documentType?: 'invoice' | 'lorry-receipt' | 'truck-hiring-note' | 'ledger';
  orientation?: 'portrait' | 'landscape';
}

export const PrintStyles: React.FC<PrintStylesProps> = ({ 
  documentType = 'invoice', 
  orientation = 'landscape' 
}) => {
  return (
    <style>{`
      /* Smart Scaling for PDFs - Only scales container, preserves layout */
      
      /* Very Small Mobile (≤360px) */
      @media (max-width: 360px) {
        .print-container {
          transform: scale(0.5) !important;
          transform-origin: top left !important;
          width: 200% !important; /* Compensate for 0.5 scale */
          /* Very small mobile-specific visibility improvements */
          padding: 8px !important;
          margin: 2px !important;
        }
      }
      
      /* Small Mobile (≤480px) */
      @media (max-width: 480px) and (min-width: 361px) {
        .print-container {
          transform: scale(0.6) !important;
          transform-origin: top left !important;
          width: 167% !important; /* Compensate for 0.6 scale */
          /* Small mobile-specific visibility improvements */
          padding: 10px !important;
          margin: 5px !important;
        }
      }
      
      /* Mobile (≤768px) */
      @media (max-width: 768px) and (min-width: 481px) {
        .print-container {
          transform: scale(0.8) !important;
          transform-origin: top left !important;
          width: 125% !important; /* Compensate for 0.8 scale */
          /* Mobile-specific visibility improvements */
          padding: 15px !important;
          margin: 10px !important;
        }
      }
      
      /* Tablet (769px-1024px) */
      @media (min-width: 769px) and (max-width: 1024px) {
        .print-container {
          transform: scale(0.9) !important;
          transform-origin: top left !important;
          width: 111% !important; /* Compensate for 0.9 scale */
        }
      }
      
      /* Ensure PDFs are clearly visible with proper overflow handling */
      .print-container {
        overflow-x: auto !important;
        overflow-y: visible !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        /* Ensure clear visibility */
        background: #f8f9fa !important;
        padding: 20px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
      }
      
      /* Ensure PDF content is clearly visible */
      .print-container > div {
        /* Add subtle border to make PDF boundaries clear */
        border: 1px solid #e5e7eb !important;
        background: white !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
      }
      
      /* Improve text readability on scaled PDFs */
      .print-container * {
        /* Ensure text remains crisp when scaled */
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        text-rendering: optimizeLegibility !important;
      }
      
      /* Base print styles */
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        @page {
          size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
          margin: 0.5in;
          orphans: 3;
          widows: 3;
        }
        
        /* Browser-specific page size fixes */
        @supports (-webkit-appearance: none) {
          /* Chrome, Safari, Edge */
          @page {
            size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4'};
            -webkit-print-color-adjust: exact;
          }
        }
        
        @supports (print-color-adjust: exact) {
          /* Firefox, modern browsers */
          @page {
            size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4'};
            print-color-adjust: exact;
          }
        }
        
        body {
          margin: 0 !important;
          padding: 0 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          font-size: 12px !important;
          line-height: 1.4 !important;
          color: #000 !important;
          background: white !important;
          -webkit-text-size-adjust: 100% !important;
          -ms-text-size-adjust: 100% !important;
        }
        
        /* Browser-specific font rendering fixes */
        @supports (-webkit-font-smoothing: antialiased) {
          body {
            -webkit-font-smoothing: antialiased !important;
          }
        }
        
        @supports (-moz-osx-font-smoothing: grayscale) {
          body {
            -moz-osx-font-smoothing: grayscale !important;
          }
        }
        
        /* Hide non-printable elements */
        .no-print,
        .print-hidden,
        button:not(.print-button),
        .print-controls,
        .navigation,
        .sidebar,
        .header-actions,
        .footer-actions {
          display: none !important;
        }
        
        /* Page break controls */
        .print-break-before {
          page-break-before: always !important;
        }
        
        .print-break-after {
          page-break-after: always !important;
        }
        
        .print-break-inside-avoid {
          page-break-inside: avoid !important;
        }
        
        .print-break-inside-auto {
          page-break-inside: auto !important;
        }
        
        /* Container adjustments */
        .print-container {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          transform: none !important;
          scale: none !important;
          box-shadow: none !important;
          border: none !important;
        }
        
        /* Typography */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid !important;
          margin-top: 0 !important;
        }
        
        p {
          orphans: 3;
          widows: 3;
        }
        
        /* Tables */
        table {
          page-break-inside: avoid !important;
          border-collapse: collapse !important;
          width: 100% !important;
          font-size: 10px !important;
        }
        
        th, td {
          border: 1px solid #000 !important;
          padding: 4px 6px !important;
          vertical-align: top !important;
          page-break-inside: avoid !important;
        }
        
        th {
          background-color: #f5f5f5 !important;
          font-weight: bold !important;
          text-align: center !important;
        }
        
        /* Invoice specific styles */
        ${documentType === 'invoice' ? `
          #invoice-pdf {
            width: 100% !important;
            min-height: auto !important;
            max-width: 100% !important;
            transform: none !important;
            scale: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          
          /* Ensure invoice fits landscape page properly */
          @page {
            size: A4 landscape !important;
            margin: 0.2in !important;
          }
          
          /* Browser-specific invoice width fixes - use 100% for full page */
          @supports (-webkit-appearance: none) {
            /* WebKit browsers */
            #invoice-pdf {
              width: 100% !important;
              max-width: 100% !important;
              transform: none !important;
            }
          }
          
          @supports (print-color-adjust: exact) {
            /* Firefox and modern browsers */
            #invoice-pdf {
              width: 100% !important;
              max-width: 100% !important;
              transform: none !important;
            }
          }
          
          .invoice-table {
            transform: none !important;
            font-size: 11px !important;
            width: 100% !important;
            table-layout: fixed !important;
          }
          
          .charges-table {
            transform: none !important;
            width: 100% !important;
          }
          
          .invoice-table th,
          .invoice-table td {
            padding: 5px 6px !important;
            font-size: 11px !important;
            border: 1px solid #000 !important;
            white-space: normal !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            line-height: 1.4 !important;
          }
          
          .invoice-table th {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
          }
          
          .invoice-header {
            page-break-inside: avoid !important;
            margin-bottom: 10px !important;
          }
          
          .invoice-details {
            page-break-inside: avoid !important;
          }
          
          .no-break {
            page-break-inside: avoid !important;
          }
        ` : ''}
        
        /* Lorry Receipt specific styles */
        ${documentType === 'lorry-receipt' ? `
          #lr-pdf {
            width: 100% !important;
            height: auto !important;
            transform: none !important;
            scale: none !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: Arial, sans-serif !important;
            line-height: 1.4 !important;
          }
          
          .lr-container {
            page-break-inside: avoid !important;
            margin-bottom: 20px !important;
            border: 2px solid #000 !important;
            padding: 12px !important;
          }
          
          .lr-header {
            page-break-inside: avoid !important;
            margin-bottom: 12px !important;
          }
          
          .lr-body {
            page-break-inside: avoid !important;
          }
          
          .lr-footer {
            page-break-inside: avoid !important;
            margin-top: 12px !important;
          }
          
          /* Typography improvements for LR PDFs */
          .lr-container h1, .lr-container h2, .lr-container h3, .lr-container h4 {
            font-weight: bold !important;
            margin-bottom: 8px !important;
            page-break-after: avoid !important;
          }
          
          .lr-container h1 {
            font-size: 16px !important;
          }
          
          .lr-container h2 {
            font-size: 14px !important;
          }
          
          .lr-container h3 {
            font-size: 12px !important;
          }
          
          .lr-container h4 {
            font-size: 11px !important;
          }
          
          .lr-container p, .lr-container div {
            font-size: 11px !important;
            line-height: 1.4 !important;
            margin-bottom: 4px !important;
          }
          
          .lr-container .text-xs {
            font-size: 10px !important;
          }
          
          .lr-container .text-sm {
            font-size: 11px !important;
          }
          
          .lr-container .text-base {
            font-size: 12px !important;
          }
          
          .lr-container .text-lg {
            font-size: 14px !important;
          }
          
          .lr-container .text-xl {
            font-size: 16px !important;
          }
          
          /* Table typography */
          .lr-container table {
            font-size: 11px !important;
          }
          
          .lr-container th, .lr-container td {
            font-size: 11px !important;
            padding: 6px 8px !important;
          }
          
          /* Ensure proper spacing between sections */
          .lr-container .mb-1 {
            margin-bottom: 8px !important;
          }
          
          .lr-container .mb-2 {
            margin-bottom: 12px !important;
          }
          
          .lr-container .mb-3 {
            margin-bottom: 16px !important;
          }
          
          .lr-container .mb-4 {
            margin-bottom: 20px !important;
          }
        ` : ''}
        
        /* Truck Hiring Note specific styles */
        ${documentType === 'truck-hiring-note' ? `
          #thn-pdf {
            width: 100% !important;
            height: auto !important;
            transform: none !important;
            scale: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          .thn-pdf {
            page-break-inside: avoid !important;
            font-size: 12px !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          .thn-pdf .section {
            margin-bottom: 12px !important;
            page-break-inside: avoid !important;
          }
          
          .thn-pdf .grid-2 {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
          }
          
          .thn-pdf .grid-3 {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 12px !important;
          }
          
          .thn-pdf .grid-4 {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr 1fr !important;
            gap: 8px !important;
          }
          
          .thn-pdf .border-section {
            border: 1px solid #000 !important;
            border-radius: 4px !important;
            padding: 12px !important;
            margin-bottom: 8px !important;
            background: #fafafa !important;
          }
          
          .thn-pdf .header-bg {
            background: #1e40af !important;
            color: white !important;
            padding: 16px !important;
            border-radius: 6px !important;
            margin-bottom: 16px !important;
            box-shadow: none !important;
          }
          
          .thn-pdf .info-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 4px 0 !important;
            border-bottom: 1px solid #e5e7eb !important;
          }
          
          .thn-pdf .info-row:last-child {
            border-bottom: none !important;
          }
          
          .thn-pdf .label {
            font-weight: 700 !important;
            color: #374151 !important;
            min-width: 120px !important;
            font-size: 11px !important;
          }
          
          .thn-pdf .value {
            color: #111827 !important;
            text-align: right !important;
            font-weight: 500 !important;
            font-size: 11px !important;
          }
          
          .thn-pdf .amount {
            font-weight: 800 !important;
            color: #059669 !important;
            font-size: 12px !important;
          }
          
          .thn-pdf .balance {
            font-weight: 800 !important;
            color: #dc2626 !important;
            font-size: 12px !important;
          }
          
          .thn-pdf .section-title {
            font-size: 14px !important;
            font-weight: 800 !important;
            color: #1f2937 !important;
            margin-bottom: 8px !important;
            padding-bottom: 4px !important;
            border-bottom: 2px solid #3b82f6 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
          }
          
          .thn-pdf .highlight-box {
            background: #f0f9ff !important;
            border: 1px solid #0ea5e9 !important;
            border-radius: 4px !important;
            padding: 12px !important;
            margin: 8px 0 !important;
          }
          
          .thn-pdf .signature-section {
            background: #f8fafc !important;
            border: 1px dashed #cbd5e1 !important;
            border-radius: 4px !important;
            padding: 16px !important;
            text-align: center !important;
          }
          
          .thn-pdf .signature-line {
            height: 1px !important;
            background: #374151 !important;
            margin: 4px 0 !important;
          }
          
          .thn-pdf .company-logo {
            filter: brightness(0) invert(1) !important;
          }
        ` : ''}
        
        /* Ledger specific styles */
        ${documentType === 'ledger' ? `
          #ledger-pdf {
            width: 100% !important;
            height: auto !important;
            transform: none !important;
            scale: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .ledger-table {
            font-size: 10px !important;
            width: 100% !important;
            table-layout: fixed !important;
            page-break-inside: auto !important;
          }
          
          .ledger-table th,
          .ledger-table td {
            padding: 4px 6px !important;
            font-size: 10px !important;
            border: 1px solid #000 !important;
          }
          
          .ledger-header {
            page-break-inside: avoid !important;
            margin-bottom: 10px !important;
          }
          
          .ledger-summary {
            page-break-inside: avoid !important;
            margin-bottom: 10px !important;
          }
        ` : ''}
        
        /* Common utility classes */
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        .text-left { text-align: left !important; }
        .font-bold { font-weight: bold !important; }
        .font-semibold { font-weight: 600 !important; }
        .text-sm { font-size: 11px !important; }
        .text-xs { font-size: 10px !important; }
        .text-lg { font-size: 14px !important; }
        .text-xl { font-size: 16px !important; }
        .text-2xl { font-size: 18px !important; }
        .text-3xl { font-size: 20px !important; }
        .text-4xl { font-size: 24px !important; }
        
        /* Spacing */
        .p-1 { padding: 2px !important; }
        .p-2 { padding: 4px !important; }
        .p-3 { padding: 6px !important; }
        .p-4 { padding: 8px !important; }
        .p-6 { padding: 12px !important; }
        .p-8 { padding: 16px !important; }
        
        .m-1 { margin: 2px !important; }
        .m-2 { margin: 4px !important; }
        .m-3 { margin: 6px !important; }
        .m-4 { margin: 8px !important; }
        .m-6 { margin: 12px !important; }
        .m-8 { margin: 16px !important; }
        
        .mb-1 { margin-bottom: 2px !important; }
        .mb-2 { margin-bottom: 4px !important; }
        .mb-3 { margin-bottom: 6px !important; }
        .mb-4 { margin-bottom: 8px !important; }
        .mb-6 { margin-bottom: 12px !important; }
        .mb-8 { margin-bottom: 16px !important; }
        
        .mt-1 { margin-top: 2px !important; }
        .mt-2 { margin-top: 4px !important; }
        .mt-3 { margin-top: 6px !important; }
        .mt-4 { margin-top: 8px !important; }
        .mt-6 { margin-top: 12px !important; }
        .mt-8 { margin-top: 16px !important; }
        
        /* Colors */
        .text-gray-800 { color: #1f2937 !important; }
        .text-gray-700 { color: #374151 !important; }
        .text-gray-600 { color: #4b5563 !important; }
        .text-gray-500 { color: #6b7280 !important; }
        .text-gray-400 { color: #9ca3af !important; }
        .text-black { color: #000 !important; }
        .text-white { color: #fff !important; }
        
        .bg-gray-50 { background-color: #f9fafb !important; }
        .bg-gray-100 { background-color: #f3f4f6 !important; }
        .bg-gray-200 { background-color: #e5e7eb !important; }
        .bg-white { background-color: #fff !important; }
        
        /* Borders */
        .border { border: 1px solid #000 !important; }
        .border-2 { border: 2px solid #000 !important; }
        .border-t { border-top: 1px solid #000 !important; }
        .border-b { border-bottom: 1px solid #000 !important; }
        .border-l { border-left: 1px solid #000 !important; }
        .border-r { border-right: 1px solid #000 !important; }
        .border-t-2 { border-top: 2px solid #000 !important; }
        .border-b-2 { border-bottom: 2px solid #000 !important; }
        
        /* Grid layouts */
        .grid { display: grid !important; }
        .grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
        .grid-cols-3 { grid-template-columns: repeat(3, 1fr) !important; }
        .grid-cols-4 { grid-template-columns: repeat(4, 1fr) !important; }
        .grid-cols-5 { grid-template-columns: repeat(5, 1fr) !important; }
        .grid-cols-6 { grid-template-columns: repeat(6, 1fr) !important; }
        .grid-cols-8 { grid-template-columns: repeat(8, 1fr) !important; }
        .grid-cols-12 { grid-template-columns: repeat(12, 1fr) !important; }
        
        .col-span-1 { grid-column: span 1 / span 1 !important; }
        .col-span-2 { grid-column: span 2 / span 2 !important; }
        .col-span-3 { grid-column: span 3 / span 3 !important; }
        .col-span-4 { grid-column: span 4 / span 4 !important; }
        .col-span-5 { grid-column: span 5 / span 5 !important; }
        .col-span-6 { grid-column: span 6 / span 6 !important; }
        .col-span-8 { grid-column: span 8 / span 8 !important; }
        .col-span-12 { grid-column: span 12 / span 12 !important; }
        
        /* Flexbox */
        .flex { display: flex !important; }
        .flex-col { flex-direction: column !important; }
        .flex-row { flex-direction: row !important; }
        .items-center { align-items: center !important; }
        .items-start { align-items: flex-start !important; }
        .items-end { align-items: flex-end !important; }
        .justify-center { justify-content: center !important; }
        .justify-between { justify-content: space-between !important; }
        .justify-end { justify-content: flex-end !important; }
        .justify-start { justify-content: flex-start !important; }
        
        /* Width and height */
        .w-full { width: 100% !important; }
        .h-full { height: 100% !important; }
        .w-1/2 { width: 50% !important; }
        .w-1/3 { width: 33.333333% !important; }
        .w-2/3 { width: 66.666667% !important; }
        .w-1/4 { width: 25% !important; }
        .w-3/4 { width: 75% !important; }
        .w-1/5 { width: 20% !important; }
        .w-2/5 { width: 40% !important; }
        .w-3/5 { width: 60% !important; }
        .w-4/5 { width: 80% !important; }
        
        /* Positioning */
        .relative { position: relative !important; }
        .absolute { position: absolute !important; }
        .fixed { position: fixed !important; }
        
        /* Overflow */
        .overflow-hidden { overflow: hidden !important; }
        .overflow-auto { overflow: auto !important; }
        .overflow-x-auto { overflow-x: auto !important; }
        .overflow-y-auto { overflow-y: auto !important; }
        
        /* Text overflow */
        .truncate {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        
        /* Whitespace */
        .whitespace-nowrap { white-space: nowrap !important; }
        .whitespace-pre { white-space: pre !important; }
        .whitespace-pre-line { white-space: pre-line !important; }
        .whitespace-pre-wrap { white-space: pre-wrap !important; }
        
        /* Display */
        .block { display: block !important; }
        .inline { display: inline !important; }
        .inline-block { display: inline-block !important; }
        .hidden { display: none !important; }
        
        /* Visibility */
        .visible { visibility: visible !important; }
        .invisible { visibility: hidden !important; }
        
        /* Opacity */
        .opacity-0 { opacity: 0 !important; }
        .opacity-25 { opacity: 0.25 !important; }
        .opacity-50 { opacity: 0.5 !important; }
        .opacity-75 { opacity: 0.75 !important; }
        .opacity-100 { opacity: 1 !important; }
      }
    `}</style>
  );
};

export default PrintStyles;
