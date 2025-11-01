import React from 'react';

// Mobile print handler utilities
// This component provides mobile-optimized print functionality

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export const supportsPrint = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'print' in window;
};

export const supportsPDFDownload = (): boolean => {
  // Modern browsers support PDF download
  if (typeof window === 'undefined') return false;
  return true; // Assume supported since we're using jsPDF
};

// Mobile print handler hook
export const useMobilePrint = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [supportsPrintAPI, setSupportsPrintAPI] = React.useState(false);

  React.useEffect(() => {
    setIsMobile(isMobileDevice());
    setSupportsPrintAPI(supportsPrint());
  }, []);

  return {
    isMobile,
    supportsPrint: supportsPrintAPI,
    supportsPDFDownload: supportsPDFDownload()
  };
};

// Note: This file provides utilities, the actual mobile print handling
// is now integrated into pdfService.ts's printDocument function

