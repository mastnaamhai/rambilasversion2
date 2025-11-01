import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { LorryReceiptView } from '../LorryReceiptPDF';
import { LorryReceipt, CompanyInfo } from '../../types';
import { generatePdf, generateMultiPagePdf, printDocument, printToPdfFile } from '../../services/pdfService';
import { PrintPreview } from './PrintPreview';

interface CopyType {
  id: string;
  label: string;
  description: string;
  icon: string;
  watermark: string;
}

interface CopyState {
  showFreightCharges: boolean;
  isGenerating: boolean;
  isPrinting: boolean;
  isGeneratingPdf: boolean;
  showPreview: boolean;
}

interface LorryReceiptCopyPreviewProps {
  lorryReceipt: LorryReceipt;
  companyInfo: CompanyInfo;
  onBack: () => void;
}

const copyTypes: CopyType[] = [
  {
    id: 'consignor',
    label: 'Consignor Copy',
    description: 'Original copy for the consignor',
    icon: '📋',
    watermark: 'ORIGINAL FOR CONSIGNOR'
  },
  {
    id: 'transporter',
    label: 'Transporter Copy',
    description: 'Duplicate copy for the transporter',
    icon: '🚛',
    watermark: 'DUPLICATE FOR TRANSPORTER'
  },
  {
    id: 'consignee',
    label: 'Consignee Copy',
    description: 'Triplicate copy for the consignee',
    icon: '📦',
    watermark: 'TRIPLICATE FOR CONSIGNEE'
  },
  {
    id: 'office',
    label: 'Office Copy',
    description: 'Office copy for records',
    icon: '🏢',
    watermark: 'OFFICE COPY'
  }
];

export const LorryReceiptCopyPreview: React.FC<LorryReceiptCopyPreviewProps> = ({
  lorryReceipt,
  companyInfo,
  onBack
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('consignor');
  const [copyStates, setCopyStates] = useState<Record<string, CopyState>>(() => {
    const initialState: Record<string, CopyState> = {};
    copyTypes.forEach(copy => {
      initialState[copy.id] = {
        showFreightCharges: false,
        isGenerating: false,
        isPrinting: false,
        isGeneratingPdf: false,
        showPreview: false
      };
    });
    return initialState;
  });

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getActiveCopyType = () => {
    return copyTypes.find(copy => copy.id === activeTab) || copyTypes[0];
  };

  const updateCopyState = (copyId: string, updates: Partial<CopyState>) => {
    setCopyStates(prev => ({
      ...prev,
      [copyId]: { ...prev[copyId], ...updates }
    }));
  };

  const toggleShowFreightCharges = (copyId: string) => {
    updateCopyState(copyId, { 
      showFreightCharges: !copyStates[copyId].showFreightCharges 
    });
  };

  const handleDownloadPdf = async (copyId: string) => {
    const copyType = copyTypes.find(c => c.id === copyId);
    if (!copyType) return;

    updateCopyState(copyId, { isGenerating: true });
    
    try {
      // Create a temporary container for single copy
      const tempContainer = document.createElement('div');
      tempContainer.id = `temp-lr-container-${copyId}`;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      // Create a temporary React element
      const tempDiv = document.createElement('div');
      tempContainer.appendChild(tempDiv);

      // Use React to render the component
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempDiv);
      
      root.render(
        <div className="print-container flex flex-col items-center bg-gray-200 p-8">
          <LorryReceiptView
            lorryReceipt={lorryReceipt}
            companyInfo={companyInfo}
            copyType={copyType.watermark}
            hideCharges={!copyStates[copyId].showFreightCharges}
          />
        </div>
      );

      // Wait for render to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate PDF
      await generatePdf(`temp-lr-container-${copyId}`, {
        fileName: `LR-${lorryReceipt.id}-${copyType.label.replace(/\s+/g, '-')}`,
        orientation: 'portrait',
        format: 'a4',
        quality: 'high'
      });

      // Cleanup
      root.unmount();
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      updateCopyState(copyId, { isGenerating: false });
    }
  };

  const handleShowPreview = (copyId: string) => {
    updateCopyState(copyId, { showPreview: true });
  };

  const handleClosePreview = (copyId: string) => {
    updateCopyState(copyId, { showPreview: false });
  };

  const handlePrint = async (copyId: string) => {
    const copyType = copyTypes.find(c => c.id === copyId);
    if (!copyType) return;

    // Show preview first
    updateCopyState(copyId, { showPreview: true });
  };

  const handlePrintConfirmed = async (copyId: string) => {
    const copyType = copyTypes.find(c => c.id === copyId);
    if (!copyType) return;

    updateCopyState(copyId, { isPrinting: true, showPreview: false });
    
    try {
      // Create a temporary container for single copy
      const tempContainer = document.createElement('div');
      tempContainer.id = `temp-print-container-${copyId}`;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      // Create a temporary React element
      const tempDiv = document.createElement('div');
      tempContainer.appendChild(tempDiv);

      // Use React to render the component
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempDiv);
      
      root.render(
        <div className="print-container flex flex-col items-center bg-gray-200 p-8">
          <LorryReceiptView
            lorryReceipt={lorryReceipt}
            companyInfo={companyInfo}
            copyType={copyType.watermark}
            hideCharges={!copyStates[copyId].showFreightCharges}
          />
        </div>
      );

      // Wait for render to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Print
      await printDocument(`temp-print-container-${copyId}`, {
        orientation: 'portrait',
        scale: 'fit',
        margins: 'minimum'
      });

      // Cleanup
      root.unmount();
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Print failed:', error);
      alert('Failed to print. Please try again.');
    } finally {
      updateCopyState(copyId, { isPrinting: false });
    }
  };

  const handlePrintToPdf = async (copyId: string) => {
    const copyType = copyTypes.find(c => c.id === copyId);
    if (!copyType) return;

    updateCopyState(copyId, { isGeneratingPdf: true });
    
    try {
      // Create a temporary container for single copy
      const tempContainer = document.createElement('div');
      tempContainer.id = `temp-pdf-container-${copyId}`;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      // Create a temporary React element
      const tempDiv = document.createElement('div');
      tempContainer.appendChild(tempDiv);

      // Use React to render the component
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempDiv);
      
      root.render(
        <div className="print-container flex flex-col items-center bg-gray-200 p-8">
          <LorryReceiptView
            lorryReceipt={lorryReceipt}
            companyInfo={companyInfo}
            copyType={copyType.watermark}
            hideCharges={!copyStates[copyId].showFreightCharges}
          />
        </div>
      );

      // Wait for render to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Generate PDF
      await printToPdfFile(`temp-pdf-container-${copyId}`, {
        orientation: 'portrait',
        fileName: `LR-${lorryReceipt.id}-${copyType.label.replace(/\s+/g, '-')}.pdf`
      });

      // Cleanup
      root.unmount();
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      updateCopyState(copyId, { isGeneratingPdf: false });
    }
  };

  const handleDownloadAllCopies = async () => {
    try {
      // Create a temporary container for all copies
      const tempContainer = document.createElement('div');
      tempContainer.id = 'temp-all-copies-container';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      // Create a temporary React element
      const tempDiv = document.createElement('div');
      tempContainer.appendChild(tempDiv);

      // Use React to render all copies
      const { createRoot } = await import('react-dom/client');
      const root = createRoot(tempDiv);
      
      root.render(
        <div className="print-container flex flex-col items-center bg-gray-200 p-8 space-y-8">
          {copyTypes.map(copyType => (
            <LorryReceiptView
              key={copyType.id}
              lorryReceipt={lorryReceipt}
              companyInfo={companyInfo}
              copyType={copyType.watermark}
              hideCharges={!copyStates[copyType.id].showFreightCharges}
            />
          ))}
        </div>
      );

      // Wait for render to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Generate multi-page PDF
      await generateMultiPagePdf('temp-all-copies-container', {
        fileName: `LR-${lorryReceipt.id}-All-Copies`,
        orientation: 'portrait',
        format: 'a4',
        quality: 'high'
      });

      // Cleanup
      root.unmount();
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };


  const getCopyTypeLabel = (id: string) => {
    const copyType = copyTypes.find(type => type.id === id);
    return copyType ? copyType.label : id;
  };

  const getCopyTypeDescription = (id: string) => {
    const copyType = copyTypes.find(type => type.id === id);
    return copyType ? copyType.description : '';
  };

  const getCopyTypeIcon = (id: string) => {
    const copyType = copyTypes.find(type => type.id === id);
    return copyType ? copyType.icon : '📄';
  };

  const getCopyTypeWatermark = (id: string) => {
    const copyType = copyTypes.find(type => type.id === id);
    return copyType ? copyType.watermark : '';
  };

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">LR Copies</h2>
          <Button variant="outline" onClick={onBack} size="sm">
            Back
          </Button>
        </div>

        {/* Mobile Copy Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex overflow-x-auto scrollbar-hide">
            {copyTypes.map((copyType) => (
              <button
                key={copyType.id}
                onClick={() => setActiveTab(copyType.id)}
                className={`flex-shrink-0 px-4 py-3 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === copyType.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{copyType.icon}</span>
                  <span>{copyType.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Preview Area */}
        <div className="flex-1 overflow-auto bg-gray-100">
          <div className="p-4">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <LorryReceiptView
                lorryReceipt={lorryReceipt}
                companyInfo={companyInfo}
                copyType={getCopyTypeWatermark(activeTab)}
                hideCharges={!copyStates[activeTab].showFreightCharges}
              />
            </div>
          </div>
        </div>

        {/* Mobile Floating Action Bar */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => toggleShowFreightCharges(activeTab)}
              className="flex-1"
              size="sm"
            >
              {copyStates[activeTab].showFreightCharges ? 'Hide' : 'Show'} Freight Charges
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleDownloadPdf(activeTab)}
              disabled={copyStates[activeTab].isGenerating}
              className="flex-1"
              size="sm"
            >
              {copyStates[activeTab].isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              variant="primary"
              onClick={() => handlePrint(activeTab)}
              disabled={copyStates[activeTab].isPrinting}
              className="flex-1"
              size="sm"
            >
              {copyStates[activeTab].isPrinting ? 'Printing...' : 'Print'}
            </Button>
          </div>
          <div className="mt-2">
            <Button
              variant="outline"
              onClick={handleDownloadAllCopies}
              className="w-full"
              size="sm"
            >
              Download All Copies
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Desktop Header */}
      <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">LR Copies Preview</h2>
          <p className="text-sm text-gray-600">LR #{lorryReceipt.id} - {lorryReceipt.date}</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleDownloadAllCopies}
          >
            Download All Copies
          </Button>
          <Button variant="secondary" onClick={onBack}>
            Back to LR List
          </Button>
        </div>
      </div>

      {/* Desktop Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {copyTypes.map((copyType) => (
            <button
              key={copyType.id}
              onClick={() => setActiveTab(copyType.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === copyType.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{copyType.icon}</span>
                <span>{copyType.label}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Desktop Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Preview Area */}
          <div className="flex-1 overflow-auto bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <LorryReceiptView
                  lorryReceipt={lorryReceipt}
                  companyInfo={companyInfo}
                  copyType={getCopyTypeWatermark(activeTab)}
                  hideCharges={!copyStates[activeTab].showFreightCharges}
                />
              </div>
            </div>
          </div>

          {/* Action Panel */}
          <div className="w-80 bg-white border-l border-gray-200 p-6">
            <div className="space-y-6">
              {/* Copy Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {getCopyTypeLabel(activeTab)}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {getCopyTypeDescription(activeTab)}
                </p>
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  Watermark: {getCopyTypeWatermark(activeTab)}
                </div>
              </div>

              {/* Copy Options */}
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">Freight charges in PDF</span>
                      <span className="text-xs text-gray-500">Include pricing information in this copy</span>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={copyStates[activeTab].showFreightCharges}
                        onChange={() => toggleShowFreightCharges(activeTab)}
                        className="sr-only"
                      />
                      <div
                        className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                          copyStates[activeTab].showFreightCharges ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                            copyStates[activeTab].showFreightCharges ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                          style={{ marginTop: '2px' }}
                        />
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  variant="primary"
                  onClick={() => handleDownloadPdf(activeTab)}
                  disabled={copyStates[activeTab].isGenerating}
                  className="w-full"
                >
                  {copyStates[activeTab].isGenerating ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating PDF...
                    </div>
                  ) : (
                    'Download PDF'
                  )}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => handlePrint(activeTab)}
                  disabled={copyStates[activeTab].isPrinting}
                  className="w-full"
                >
                  {copyStates[activeTab].isPrinting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Printing...
                    </div>
                  ) : (
                    'Print Copy'
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handlePrintToPdf(activeTab)}
                  disabled={copyStates[activeTab].isGeneratingPdf}
                  className="w-full"
                >
                  {copyStates[activeTab].isGeneratingPdf ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Generating...
                    </div>
                  ) : (
                    'Print to PDF'
                  )}
                </Button>
              </div>

              {/* Copy Status */}
              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Charges: {copyStates[activeTab].showFreightCharges ? 'Visible' : 'Hidden'}</div>
                  <div>Status: Ready</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      {copyStates[activeTab].showPreview && (
        <PrintPreview
          elementId=""
          isOpen={copyStates[activeTab].showPreview}
          onClose={() => handleClosePreview(activeTab)}
          onPrint={() => handlePrintConfirmed(activeTab)}
          orientation="portrait"
          title={`Print Preview - ${getCopyTypeLabel(activeTab)}`}
          previewContent={() => (
            <div className="print-container flex flex-col items-center bg-gray-200 p-8">
              <LorryReceiptView
                lorryReceipt={lorryReceipt}
                companyInfo={companyInfo}
                copyType={getCopyTypeWatermark(activeTab)}
                hideCharges={!copyStates[activeTab].showFreightCharges}
              />
            </div>
          )}
        />
      )}
    </div>
  );
};
