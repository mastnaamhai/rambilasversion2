import React, { useState, useMemo, useEffect } from 'react';
import type { LorryReceipt, Customer, CompanyInfo, Invoice } from '../types';
import { LorryReceiptStatus } from '../types';
import type { View } from '../App';
import { formatDate } from '../services/utils';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { LorryReceiptView } from './LorryReceiptPDF';
import { API_BASE_URL } from '../constants';
import { Pagination } from './ui/Pagination';
import { StatusBadge, getStatusVariant } from './ui/StatusBadge';
import { UniversalSearchSort, SortOption } from './ui/UniversalSearchSort';


interface LorryReceiptsProps {
  lorryReceipts: LorryReceipt[];
  invoices: Invoice[];
  customers: Customer[];
  companyInfo: CompanyInfo;
  onViewChange: (view: View) => void;
  onUpdateLrStatus: (id: string, status: LorryReceiptStatus) => void;
  onDeleteLr: (id: string) => void;
  onBack: () => void;
  initialFilters?: Partial<Record<keyof LorryReceiptsTableFilters, any>>;
}

interface LorryReceiptsTableFilters {
    searchTerm: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    ids?: string[];
}

const statusColors: { [key in LorryReceiptStatus]: string } = {
  [LorryReceiptStatus.CREATED]: 'bg-blue-100 text-blue-800',
  [LorryReceiptStatus.IN_TRANSIT]: 'bg-yellow-100 text-yellow-800',
  [LorryReceiptStatus.DELIVERED]: 'bg-green-100 text-green-800',
  [LorryReceiptStatus.INVOICED]: 'bg-purple-100 text-purple-800',
  [LorryReceiptStatus.PAID]: 'bg-pink-100 text-pink-800',
  [LorryReceiptStatus.UNBILLED]: 'bg-orange-100 text-orange-800',
};

const PreviewModal: React.FC<{
  item: { type: 'LR', data: LorryReceipt };
  onClose: () => void;
  companyInfo: CompanyInfo;
}> = ({ item, onClose, companyInfo }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
        onClose();
    }, 300); // Match animation duration
  };

  const modalAnimation = isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100';
  const backdropAnimation = isClosing ? 'opacity-0' : 'opacity-100';


  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity duration-300 ease-in-out ${backdropAnimation}`}
      onClick={closeModal}
      data-form-modal="true"
      aria-modal="true"
      role="dialog"
      data-pdf-viewer="true"
    >
      <div
        className={`bg-white rounded-xl shadow-2xl max-h-[95vh] w-full max-w-4xl sm:max-w-6xl overflow-hidden flex flex-col transform transition-all duration-300 ease-in-out ${modalAnimation}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">{`Preview: Lorry Receipt #${item.data.lrNumber}`}</h2>
          <button onClick={closeModal} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto bg-gray-200 flex-1">
           <div className="p-2 sm:p-4 md:p-8 flex justify-center">
             {item.type === 'LR' && item.data.consignor && ( // Ensure data is populated
              <LorryReceiptView
                lorryReceipt={item.data as LorryReceipt}
                companyInfo={companyInfo}
              />
            )}
           </div>
        </div>
      </div>
    </div>
  );
};


export const LorryReceipts: React.FC<LorryReceiptsProps> = ({ lorryReceipts, invoices, customers, companyInfo, onViewChange, onUpdateLrStatus, onDeleteLr, onBack, initialFilters }) => {
  const [searchTerm, setSearchTerm] = useState(initialFilters?.searchTerm || '');
  const [sortBy, setSortBy] = useState(initialFilters?.sortBy || 'lrNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialFilters?.sortOrder || 'desc');
  const [previewItem, setPreviewItem] = useState<{type: 'LR', data: LorryReceipt} | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Sort options for LR
  const sortOptions: SortOption[] = [
    { value: 'lrNumber', label: 'Sort by LR Number' },
    { value: 'date', label: 'Sort by Date' },
    { value: 'consignor', label: 'Sort by Consignor' },
    { value: 'consignee', label: 'Sort by Consignee' },
    { value: 'from', label: 'Sort by From' },
    { value: 'to', label: 'Sort by To' },
    { value: 'totalAmount', label: 'Sort by Amount' },
    { value: 'status', label: 'Sort by Status' }
  ];

  const filteredLrs = useMemo(() => {
    // Create a set of LR IDs that are included in invoices (billed LRs)
    const invoicedLrIds = new Set(invoices.flatMap(inv => inv.lorryReceipts?.map(lr => lr._id) || []));
    
    let filtered = lorryReceipts.filter(lr => {
      const consignorName = lr.consignor?.name || '';
      const consigneeName = lr.consignee?.name || '';

      const searchLower = searchTerm.toLowerCase();

      const matchesSearch = searchTerm === '' ||
        lr.lrNumber.toString().includes(searchTerm) ||
        (lr.invoiceNo && lr.invoiceNo.toLowerCase().includes(searchLower)) ||
        lr.from.toLowerCase().includes(searchLower) ||
        lr.to.toLowerCase().includes(searchLower) ||
        consignorName.toLowerCase().includes(searchLower) ||
        consigneeName.toLowerCase().includes(searchLower) ||
        lr.status.toLowerCase().includes(searchLower);
      
      const matchesId = !initialFilters?.ids || initialFilters.ids.includes(lr._id);

      return matchesSearch && matchesId;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';
      
      switch (sortBy) {
        case 'lrNumber':
          aValue = a.lrNumber;
          bValue = b.lrNumber;
          break;
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'consignor':
          aValue = (a.consignor?.name || '').toLowerCase();
          bValue = (b.consignor?.name || '').toLowerCase();
          break;
        case 'consignee':
          aValue = (a.consignee?.name || '').toLowerCase();
          bValue = (b.consignee?.name || '').toLowerCase();
          break;
        case 'from':
          aValue = a.from.toLowerCase();
          bValue = b.from.toLowerCase();
          break;
        case 'to':
          aValue = a.to.toLowerCase();
          bValue = b.to.toLowerCase();
          break;
        case 'totalAmount':
          aValue = a.totalAmount || 0;
          bValue = b.totalAmount || 0;
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        default:
          aValue = a.lrNumber;
          bValue = b.lrNumber;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [lorryReceipts, invoices, searchTerm, sortBy, sortOrder, initialFilters]);

  // Paginated LRs
  const paginatedLrs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLrs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLrs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLrs.length / itemsPerPage);

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8">

       {previewItem && (
        <PreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          companyInfo={companyInfo}
        />
      )}
      <Card>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Lorry Receipts</h2>
            <div className="space-x-2">
              <Button onClick={() => onViewChange({ name: 'CREATE_LR' })}>Create New Lorry Receipt</Button>
              <Button onClick={onBack} variant="secondary">Back to Dashboard</Button>
            </div>
        </div>
        
        <UniversalSearchSort
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by LR number, consignor, consignee, from/to location, or status..."
          sortBy={sortBy}
          onSortChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          sortOptions={sortOptions}
          totalItems={lorryReceipts.length}
          filteredItems={filteredLrs.length}
          onClearSearch={handleClearSearch}
        />
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LR No.</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consignor</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consignee</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From / To</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedLrs.map(lr => (
                <tr key={lr._id} onClick={() => setPreviewItem({ type: 'LR', data: lr })} className="hover:bg-slate-50 transition-colors duration-200 cursor-pointer">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{lr.lrNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(lr.date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{lr.invoiceNo || 'N/A'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{lr.consignor?.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{lr.consignee?.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{lr.from} to {lr.to}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">₹{(lr.totalAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <select
                      value={lr.status}
                      onClick={e => e.stopPropagation()}
                      onChange={(e) => onUpdateLrStatus(lr._id, e.target.value as LorryReceiptStatus)}
                      className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${statusColors[lr.status]} border-0 bg-opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 focus:outline-none`}
                    >
                      {Object.values(LorryReceiptStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {[LorryReceiptStatus.CREATED, LorryReceiptStatus.IN_TRANSIT, LorryReceiptStatus.DELIVERED].includes(lr.status) && (
                        <button onClick={(e) => { e.stopPropagation(); onViewChange({ name: 'CREATE_INVOICE_FROM_LR', lrId: lr._id }); }} className="text-blue-600 hover:text-blue-900 transition-colors">Create Invoice</button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onViewChange({ name: 'VIEW_LR', id: lr._id }); }} className="text-indigo-600 hover:text-indigo-900 transition-colors">View PDF</button>
                    <button onClick={(e) => { e.stopPropagation(); onViewChange({ name: 'EDIT_LR', id: lr._id }); }} className="text-green-600 hover:text-green-900 transition-colors">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteLr(lr._id); }} className="text-red-600 hover:text-red-900 transition-colors">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredLrs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </Card>
    </div>
  );
};
