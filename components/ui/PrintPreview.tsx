import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { printDocument } from '../../services/pdfService';

interface PrintPreviewProps {
  elementId: string;
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  orientation?: 'portrait' | 'landscape';
  title?: string;
  previewContent?: () => Promise<JSX.Element> | JSX.Element;
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({
  elementId,
  isOpen,
  onClose,
  onPrint,
  orientation = 'portrait',
  title = 'Print Preview',
  previewContent
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen || !previewFrameRef.current) return;

    const loadPreview = async () => {
      let content: string = '';
      
      // If previewContent is provided, render it
      if (previewContent) {
        try {
          const contentElement = previewContent();
          const { createRoot } = await import('react-dom/client');
          const tempDiv = document.createElement('div');
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.top = '-9999px';
          document.body.appendChild(tempDiv);
          const root = createRoot(tempDiv);
          
          if (contentElement && typeof contentElement === 'object' && 'then' in contentElement) {
            // Promise
            const resolved = await contentElement;
            root.render(resolved);
            await new Promise(resolve => setTimeout(resolve, 200));
            content = tempDiv.innerHTML;
            root.unmount();
            document.body.removeChild(tempDiv);
          } else {
            // Synchronous JSX
            root.render(contentElement as JSX.Element);
            await new Promise(resolve => setTimeout(resolve, 200));
            content = tempDiv.innerHTML;
            root.unmount();
            document.body.removeChild(tempDiv);
          }
        } catch (error) {
          console.error('Error rendering preview content:', error);
          setIsLoading(false);
          return;
        }
      } else if (elementId) {
        // Fallback to elementId lookup
        const input = document.getElementById(elementId);
        if (!input) {
          setIsLoading(false);
          return;
        }
        const clonedElement = input.cloneNode(true) as HTMLElement;
        content = clonedElement.outerHTML;
      } else {
        setIsLoading(false);
        return;
      }

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

      // Print preview styles
      const printStyles = `
        @page {
          size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
          margin: ${orientation === 'landscape' ? '0.2in' : '0.5in'};
        }
        
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
        }
        
        .print-container {
          background: white;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          max-width: 100%;
          margin: 0 auto;
          overflow: auto;
          width: 100%;
        }
        
        /* For preview display, ensure content fits or scrolls */
        #invoice-pdf {
          width: 420mm !important;
          min-height: 297mm !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          margin: 0 auto;
        }
        
        /* Scale down invoice for preview if container is smaller */
        @media screen and (max-width: 1600px) {
          #invoice-pdf {
            transform: scale(0.8);
            transform-origin: top left;
          }
        }
        
        @media screen and (max-width: 1200px) {
          #invoice-pdf {
            transform: scale(0.6);
            transform-origin: top left;
          }
        }
        
        @media screen and (max-width: 800px) {
          #invoice-pdf {
            transform: scale(0.4);
            transform-origin: top left;
          }
        }
        
        @media print {
          #invoice-pdf {
            width: calc(100% - 0.4in) !important;
            max-width: 420mm !important;
            margin: 0 auto !important;
            transform: none !important;
          }
        }
        
        /* Hide non-printable elements in preview */
        .no-print {
          display: none !important;
        }
      `;

      const iframe = previewFrameRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        setIsLoading(false);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>${stylesText}</style>
            <style>${printStyles}</style>
          </head>
          <body>
            <div class="print-container">
              ${content}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      iframe.onload = () => {
        setIsLoading(false);
      };
    };

    loadPreview();
  }, [isOpen, elementId, orientation, previewContent]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    try {
      await printDocument(elementId, { 
        orientation,
        margins: 'minimum',
        scale: 'fit'
      });
      onPrint();
      onClose();
    } catch (error) {
      console.error('Print failed:', error);
      alert('Failed to print. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={handlePrint}
              disabled={isLoading}
            >
              Print
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4 relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-75">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading preview...</p>
              </div>
            </div>
          )}
          <iframe
            ref={previewFrameRef}
            className="w-full h-full border-0 bg-white"
            style={{ minHeight: '500px' }}
            title="Print Preview"
          />
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600">
            This preview shows how your document will look when printed. Click "Print" to open the print dialog.
          </p>
        </div>
      </div>
    </div>
  );
};

