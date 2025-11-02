// Enhanced PDF Service with printing, downloading, and viewing capabilities

export interface PDFOptions {
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a3' | 'letter';
  quality?: 'low' | 'medium' | 'high';
  useTextContent?: boolean;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface PrintOptions {
  orientation?: 'portrait' | 'landscape';
  scale?: 'actual-size' | 'fit' | 'shrink-to-fit';
  margins?: 'minimum' | 'default' | 'custom';
  customMargins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

// Wait for libraries to load
const waitForLibraries = (): Promise<{ jsPDF: any; html2canvas: any }> => {
  return new Promise((resolve, reject) => {
    const maxAttempts = 50; // 5 seconds max wait
    let attempts = 0;

    const checkLibraries = () => {
      attempts++;
      
      if (typeof (window as any).jspdf !== 'undefined' && typeof (window as any).html2canvas !== 'undefined') {
        resolve({
          jsPDF: (window as any).jspdf.jsPDF,
          html2canvas: (window as any).html2canvas
        });
      } else if (attempts >= maxAttempts) {
        reject(new Error('PDF libraries failed to load within timeout period'));
      } else {
        setTimeout(checkLibraries, 100);
      }
    };

    checkLibraries();
  });
};

// Generate descriptive filename
const generateFileName = (baseName: string | number, documentType: string, documentNumber?: string | number, date?: string): string => {
  const timestamp = date || new Date().toISOString().split('T')[0];
  const cleanBaseName = String(baseName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanDocNumber = documentNumber ? String(documentNumber).replace(/[^a-zA-Z0-9_-]/g, '_') : '';
  
  return `${documentType}_${cleanDocNumber ? cleanDocNumber + '_' : ''}${timestamp}.pdf`;
};

// Get quality settings based on option
const getQualitySettings = (quality: 'low' | 'medium' | 'high') => {
  switch (quality) {
    case 'low':
      return { scale: 1, jpegQuality: 0.6, compression: 'FAST' };
    case 'medium':
      return { scale: 1.5, jpegQuality: 0.75, compression: 'MEDIUM' };
    case 'high':
    default:
      return { scale: 2, jpegQuality: 0.85, compression: 'SLOW' };
  }
};

// Enhanced PDF generation with better quality and file size control
export const generatePdf = async (elementId: string, options: PDFOptions): Promise<void> => {
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  try {
    const { jsPDF, html2canvas } = await waitForLibraries();
    const qualitySettings = getQualitySettings(options.quality || 'high');
    
    // Enhanced canvas options for better quality and performance
    const canvas = await html2canvas(input, {
      scale: qualitySettings.scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: input.scrollWidth,
      height: input.scrollHeight,
      windowWidth: input.scrollWidth,
      windowHeight: input.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0
    });
    
    // Use JPEG with optimized quality for file size control
    const imgData = canvas.toDataURL('image/jpeg', qualitySettings.jpegQuality);
    
    // Create PDF with specified options
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'pt',
      format: options.format || 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;

    // Apply margins
    const margins = options.margins || { top: 20, right: 20, bottom: 20, left: 20 };
    const contentWidth = pdfWidth - margins.left - margins.right;
    const contentHeight = pdfHeight - margins.top - margins.bottom;

    let imgWidth = contentWidth;
    let imgHeight = imgWidth / ratio;

    // Fit to page while maintaining aspect ratio
    if (imgHeight > contentHeight) {
      imgHeight = contentHeight;
      imgWidth = imgHeight * ratio;
    }

    const x = margins.left + (contentWidth - imgWidth) / 2;
    const y = margins.top + (contentHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, undefined, qualitySettings.compression);
    
    // Generate descriptive filename
    const fileName = generateFileName(options.fileName, 'Document');
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Enhanced multi-page PDF generation
export const generateMultiPagePdf = async (elementId: string, options: PDFOptions): Promise<void> => {
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  try {
    const { jsPDF, html2canvas } = await waitForLibraries();
    const qualitySettings = getQualitySettings(options.quality || 'high');
    
    const canvas = await html2canvas(input, {
      scale: qualitySettings.scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: input.scrollWidth,
      height: input.scrollHeight,
      windowWidth: input.scrollWidth,
      windowHeight: input.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0
    });

    const imgData = canvas.toDataURL('image/jpeg', qualitySettings.jpegQuality);
    const pdf = new jsPDF({
      orientation: options.orientation || 'portrait',
      unit: 'pt',
      format: options.format || 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;

    // Apply margins
    const margins = options.margins || { top: 20, right: 20, bottom: 20, left: 20 };
    const contentWidth = pdfWidth - margins.left - margins.right;
    const contentHeight = pdfHeight - margins.top - margins.bottom;

    const imgWidth = contentWidth;
    const imgHeight = imgWidth / ratio;

    let heightLeft = imgHeight;
    let position = 0;
    
    // Add first page
    pdf.addImage(imgData, 'JPEG', margins.left, margins.top + position, imgWidth, imgHeight, undefined, qualitySettings.compression);
    heightLeft -= contentHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margins.left, margins.top + position, imgWidth, imgHeight, undefined, qualitySettings.compression);
      heightLeft -= contentHeight;
    }

    const fileName = generateFileName(options.fileName, 'MultiPage');
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating multi-page PDF:', error);
    throw new Error(`Failed to generate multi-page PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Enhanced function to capture computed styles for an element and its children
const captureComputedStyles = (element: HTMLElement): string => {
  let inlineStyles = '';
  
  // Function to recursively process elements
  const processElement = (el: Element) => {
    const computed = window.getComputedStyle(el);
    const styleMap: Record<string, string> = {};
    
    // Capture important computed styles
    const importantProps = [
      'font-family', 'font-size', 'font-weight', 'font-style',
      'color', 'background-color', 'background',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'border', 'border-width', 'border-style', 'border-color',
      'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
      'display', 'position', 'top', 'right', 'bottom', 'left',
      'text-align', 'line-height', 'white-space', 'overflow',
      'transform', 'transform-origin'
    ];
    
    importantProps.forEach(prop => {
      const value = computed.getPropertyValue(prop);
      if (value && value !== 'normal' && value !== 'auto' && value !== 'none') {
        styleMap[prop] = value;
      }
    });
    
    // Convert style map to CSS
    const styleString = Object.entries(styleMap)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
      .join('; ');
    
    if (styleString) {
      inlineStyles += `#${el.id || `el-${Math.random().toString(36).substr(2, 9)}`} { ${styleString}; }\n`;
    }
    
    // Process children
    Array.from(el.children).forEach(processElement);
  };
  
  processElement(element);
  return inlineStyles;
};

// Enhanced function to capture all font-face declarations
const captureFontFaces = (): string => {
  let fontFaces = '';
  try {
    const stylesheets = Array.from(document.styleSheets);
    stylesheets.forEach(sheet => {
      try {
        if (sheet.cssRules) {
          Array.from(sheet.cssRules).forEach(rule => {
            if (rule instanceof CSSFontFaceRule) {
              fontFaces += rule.cssText + '\n';
            }
          });
        }
      } catch (e) {
        // Skip CORS-protected stylesheets
      }
    });
  } catch (e) {
    console.warn('Could not capture font faces:', e);
  }
  return fontFaces;
};

// Enhanced function to capture CSS custom properties
const captureCSSVariables = (element: HTMLElement): string => {
  const computed = window.getComputedStyle(element);
  const rootComputed = window.getComputedStyle(document.documentElement);
  let cssVars = '';
  
  // Get all CSS variables
  const allStyles = rootComputed.cssText.split(';');
  allStyles.forEach(style => {
    if (style.includes('--')) {
      cssVars += `  ${style.trim()};\n`;
    }
  });
  
  if (cssVars) {
    cssVars = `:root {\n${cssVars}}\n`;
  }
  
  return cssVars;
};

// Enhanced printing functionality with better style preservation
export const printDocument = async (elementId: string, options: PrintOptions = {}): Promise<void> => {
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  try {
    // Detect if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    // Use iframe for mobile to prevent popup blocking
    if (isMobile) {
      return await printDocumentMobile(elementId, options);
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please allow popups for this site.');
    }

    // Clone the element deeply
    const clonedElement = input.cloneNode(true) as HTMLElement;
    
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
        // Skip stylesheets that can't be accessed due to CORS
        console.warn('Could not access stylesheet:', e);
      }
    }
    
    // Capture computed styles, font faces, and CSS variables
    const computedStyles = captureComputedStyles(input);
    const fontFaces = captureFontFaces();
    const cssVariables = captureCSSVariables(input);
    
    // Add print-specific styles with browser compatibility
    const printStyles = `
      ${fontFaces}
      ${cssVariables}
      
      @page {
        size: ${options.orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
        margin: ${options.margins === 'minimum' ? 
                 (options.orientation === 'landscape' ? '0.2in' : '0.5in') : 
                 options.margins === 'custom' && options.customMargins ? 
                 `${options.customMargins.top}in ${options.customMargins.right}in ${options.customMargins.bottom}in ${options.customMargins.left}in` : 
                 '0.75in'};
      }
      
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.4;
        color: #000;
        background: white;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      .print-container {
        width: 100%;
        max-width: none;
        margin: 0;
        padding: 0;
        transform: none !important;
        scale: none !important;
      }
      
      /* Fix for invoice landscape width */
      #invoice-pdf {
        width: 420mm !important;
        min-height: 297mm !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        #invoice-pdf {
          width: calc(100% - 0.4in) !important;
          max-width: 420mm !important;
          margin: 0 auto !important;
        }
        
        .no-print {
          display: none !important;
        }
        
        .print-break-before {
          page-break-before: always !important;
        }
        
        .print-break-after {
          page-break-after: always !important;
        }
        
        .print-break-inside-avoid {
          page-break-inside: avoid !important;
        }
        
        /* Browser-specific fixes */
        @supports (-webkit-appearance: none) {
          /* WebKit browsers */
          body {
            -webkit-print-color-adjust: exact;
          }
        }
        
        @supports (print-color-adjust: exact) {
          /* Modern browsers */
          body {
            print-color-adjust: exact;
          }
        }
      }
      
      ${computedStyles}
    `;

    // Write the HTML content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Document</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>${stylesText}</style>
          <style>${printStyles}</style>
        </head>
        <body>
          <div class="print-container">
            ${clonedElement.outerHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        
        // Close the window after printing (optional)
        printWindow.onafterprint = () => {
          setTimeout(() => {
            printWindow.close();
          }, 100);
        };
      }, 500);
    };

  } catch (error) {
    console.error('Error printing document:', error);
    throw new Error(`Failed to print document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Mobile print handler using iframe
const printDocumentMobile = async (elementId: string, options: PrintOptions = {}): Promise<void> => {
  return new Promise((resolve, reject) => {
    const input = document.getElementById(elementId);
    if (!input) {
      reject(new Error(`Element with id ${elementId} not found.`));
      return;
    }

    // Create iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const clonedElement = input.cloneNode(true) as HTMLElement;
    
    // Get stylesheets
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
    
    const computedStyles = captureComputedStyles(input);
    const fontFaces = captureFontFaces();
    const cssVariables = captureCSSVariables(input);
    
    const printStyles = `
      ${fontFaces}
      ${cssVariables}
      
      @page {
        size: ${options.orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
        margin: ${options.margins === 'minimum' ? 
                 (options.orientation === 'landscape' ? '0.2in' : '0.5in') : 
                 '0.75in'};
      }
      
      body {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .print-container {
        width: 100%;
        transform: none !important;
      }
      
      #invoice-pdf {
        width: 420mm !important;
        min-height: 297mm !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      
      @media print {
        #invoice-pdf {
          width: calc(100% - 0.4in) !important;
          max-width: 420mm !important;
          margin: 0 auto !important;
        }
      }
      
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
      
      ${computedStyles}
    `;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      reject(new Error('Unable to access iframe document'));
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>${stylesText}</style>
          <style>${printStyles}</style>
        </head>
        <body>
          <div class="print-container">
            ${clonedElement.outerHTML}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
            resolve();
          }, 1000);
        } catch (e) {
          document.body.removeChild(iframe);
          reject(e);
        }
      }, 500);
    };
  });
};

// Generate PDF for specific document types with optimized settings
export const generateDocumentPdf = async (
  elementId: string, 
  documentType: 'invoice' | 'lorry-receipt' | 'truck-hiring-note' | 'ledger',
  documentNumber: string | number,
  date?: string
): Promise<void> => {
  const baseFileName = documentNumber;
  const fileName = generateFileName(baseFileName, documentType, documentNumber, date);
  
  // Document-specific optimizations
  const options: PDFOptions = {
    fileName,
    quality: 'high',
    useTextContent: true,
    margins: { top: 20, right: 20, bottom: 20, left: 20 }
  };

  // Set orientation based on document type
  if (documentType === 'invoice') {
    options.orientation = 'landscape';
    options.format = 'a4';
  } else {
    options.orientation = 'portrait';
    options.format = 'a4';
  }

  await generatePdf(elementId, options);
};

// Legacy function for backward compatibility
export const generatePdfLegacy = async (elementId: string, fileName: string): Promise<void> => {
  await generatePdf(elementId, {
    fileName,
    quality: 'high',
    orientation: 'portrait',
    format: 'a4'
  });
};

// Legacy function for backward compatibility
export const generateMultiPagePdfLegacy = async (elementId: string, fileName: string): Promise<void> => {
  await generateMultiPagePdf(elementId, {
    fileName,
    quality: 'high',
    orientation: 'portrait',
    format: 'a4'
  });
};

// Print to PDF file directly (downloads PDF without opening print dialog)
export const printToPdfFile = async (elementId: string, options: PrintOptions & { fileName?: string } = {}): Promise<void> => {
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  try {
    const { jsPDF, html2canvas } = await waitForLibraries();
    const qualitySettings = getQualitySettings('high');
    
    // Enhanced canvas options
    const canvas = await html2canvas(input, {
      scale: qualitySettings.scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: input.scrollWidth,
      height: input.scrollHeight,
      windowWidth: input.scrollWidth,
      windowHeight: input.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      onclone: (clonedDoc: Document) => {
        // Ensure all styles are preserved in cloned document
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // Apply important styles that might be lost
          const originalElement = input;
          const computed = window.getComputedStyle(originalElement);
          (clonedElement as HTMLElement).style.width = computed.width;
          (clonedElement as HTMLElement).style.height = computed.height;
        }
      }
    });
    
    const imgData = canvas.toDataURL('image/jpeg', qualitySettings.jpegQuality);
    
    // Determine orientation and format
    const orientation = options.orientation || 'portrait';
    const format = 'a4';
    
    // Create PDF
    const pdf = new jsPDF({
      orientation,
      unit: 'pt',
      format,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;

    // Handle landscape properly - especially for invoices
    const margins = { top: 20, right: 20, bottom: 20, left: 20 };
    const contentWidth = pdfWidth - margins.left - margins.right;
    const contentHeight = pdfHeight - margins.top - margins.bottom;

    let imgWidth = contentWidth;
    let imgHeight = imgWidth / ratio;

    // Fit to page while maintaining aspect ratio
    if (imgHeight > contentHeight) {
      imgHeight = contentHeight;
      imgWidth = imgHeight * ratio;
    }

    // For landscape documents, ensure proper scaling
    if (orientation === 'landscape' && canvasWidth > canvasHeight) {
      // Check if we need to scale down to fit
      const widthRatio = contentWidth / canvasWidth;
      const heightRatio = contentHeight / canvasHeight;
      const scale = Math.min(widthRatio, heightRatio, 1);
      
      imgWidth = canvasWidth * scale;
      imgHeight = canvasHeight * scale;
    }

    const x = margins.left + (contentWidth - imgWidth) / 2;
    const y = margins.top;

    // Add image to PDF
    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, undefined, qualitySettings.compression);
    
    // Handle multi-page if content exceeds page height
    let heightLeft = imgHeight - contentHeight;
    let pageNumber = 1;
    
    while (heightLeft > 0 && pageNumber < 50) { // Max 50 pages safety limit
      pdf.addPage();
      const newY = -contentHeight * pageNumber;
      pdf.addImage(imgData, 'JPEG', x, newY, imgWidth, imgHeight, undefined, qualitySettings.compression);
      heightLeft -= contentHeight;
      pageNumber++;
    }
    
    // Generate filename
    const fileName = options.fileName || `document_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF file:', error);
    throw new Error(`Failed to generate PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};