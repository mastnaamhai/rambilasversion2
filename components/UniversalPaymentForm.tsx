import React, { useState, useEffect } from 'react';
import type { Payment, Invoice, TruckHiringNote } from '../types';
import { PaymentMode, PaymentType } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { ValidatedInput } from './ui/ValidatedInput';
import { ValidatedSelect } from './ui/ValidatedSelect';
import { ValidatedTextarea } from './ui/ValidatedTextarea';
import { FormSection } from './ui/ResponsiveForm';
import { useFormValidation } from '../hooks/useFormValidation';
import { fieldRules, commonRules } from '../services/formValidation';
import { getCurrentDate } from '../services/utils';

interface UniversalPaymentFormProps {
    invoiceId?: string;
    truckHiringNoteId?: string;
    customerId?: string;
    grandTotal: number;
    balanceDue: number;
    onSave: (payment: Omit<Payment, '_id' | 'customer' | 'invoice' | 'truckHiringNote'>) => Promise<void>;
    onClose: () => void;
    title?: string;
}

export const UniversalPaymentForm: React.FC<UniversalPaymentFormProps> = ({ 
    invoiceId, 
    truckHiringNoteId,
    customerId, 
    grandTotal, 
    balanceDue, 
    onSave, 
    onClose,
    title
}) => {
    console.log('UniversalPaymentForm received customerId:', customerId);
    const totalPaid = grandTotal - balanceDue;
    const isForInvoice = !!invoiceId;
    const isForTHN = !!truckHiringNoteId;

    const [payment, setPayment] = useState({
        invoiceId,
        truckHiringNoteId,
        ...(customerId && { customer: customerId }),
        amount: Math.abs(balanceDue), // Use absolute value for payment amount (gross amount)
        date: getCurrentDate(),
        type: PaymentType.RECEIPT,
        mode: PaymentMode.CASH,
        referenceNo: '',
        notes: '',
        // TDS fields
        tdsApplicable: false,
        tdsRate: 0,
        tdsAmount: 0,
        tdsDate: getCurrentDate(),
    });
    
    console.log('Initial payment state:', JSON.stringify(payment, null, 2));
    
    const [isSaving, setIsSaving] = useState(false);

    // Calculate TDS and net amount
    const grossAmount = payment.amount || 0;
    const tdsRate = payment.tdsApplicable ? (payment.tdsRate || 0) : 0;
    const calculatedTdsAmount = payment.tdsApplicable ? (grossAmount * (tdsRate / 100)) : 0;
    const netAmount = grossAmount - calculatedTdsAmount;

    // Validation rules
    const validationRules = {
        amount: { 
            required: true, 
            min: 0.01, 
            max: Math.abs(balanceDue),
            message: `Amount must be between ₹0.01 and ₹${Math.abs(balanceDue).toLocaleString('en-IN')}` 
        },
        date: fieldRules.date,
        type: { required: true, message: 'Payment type is required' },
        mode: { required: true, message: 'Payment mode is required' },
        referenceNo: {
            custom: (value: string) => {
                if (payment.mode !== PaymentMode.CASH && !value.trim()) {
                    return 'Reference number is required for non-cash payments';
                }
                return null;
            }
        },
        notes: fieldRules.notes,
        tdsRate: {
            custom: (value: number) => {
                if (payment.tdsApplicable && payment.type === PaymentType.RECEIPT) {
                    if (!value || value <= 0 || value > 100) {
                        return 'TDS rate must be between 0.01% and 100%';
                    }
                }
                return null;
            }
        }
    };

    // Form validation hook
    const {
        errors,
        isValid,
        validateForm: validateEntireForm,
        setFieldError,
        clearFieldError,
        setErrors
    } = useFormValidation({
        validationRules,
        validateOnChange: true,
        validateOnBlur: true,
        validateOnSubmit: true
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        // Clear error for this field
        clearFieldError(name);

        setPayment(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleValueChange = (fieldName: string, value: any) => {
        clearFieldError(fieldName);
        setPayment(prev => {
            const updated = {
                ...prev,
                [fieldName]: value,
            };
            // Auto-update TDS date when payment date changes
            if (fieldName === 'date' && updated.tdsApplicable) {
                updated.tdsDate = value;
            }
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const formErrors = validateEntireForm(payment);
        
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            // Focus on first error field
            const firstErrorField = Object.keys(formErrors)[0];
            const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
            element?.focus();
            return;
        }

        setIsSaving(true);
        try {
            // For Option 3a: Calculate net amount (gross - TDS) and prepare payment data
            const paymentToSave = {
                ...payment,
                amount: netAmount, // Send net amount after TDS deduction
                tdsAmount: calculatedTdsAmount,
                tdsDate: payment.tdsDate || payment.date,
            };

            // Clear TDS fields if not applicable
            if (!payment.tdsApplicable || payment.type !== PaymentType.RECEIPT) {
                delete paymentToSave.tdsApplicable;
                delete paymentToSave.tdsRate;
                delete paymentToSave.tdsAmount;
                delete paymentToSave.tdsDate;
            }

            console.log('Sending payment data:', JSON.stringify(paymentToSave, null, 2));
            await onSave(paymentToSave);
            onClose();
        } catch (error) {
            console.error('Failed to save payment', error);
            console.error('Payment data that failed:', JSON.stringify(payment, null, 2));
            setErrors({ general: 'Failed to save payment. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const quickAmounts = [
        { label: '25%', value: Math.abs(balanceDue) * 0.25 },
        { label: '50%', value: Math.abs(balanceDue) * 0.5 },
        { label: '75%', value: Math.abs(balanceDue) * 0.75 },
        { label: 'Full', value: Math.abs(balanceDue) }
    ];

    const setQuickAmount = (amount: number) => {
        setPayment(prev => ({ ...prev, amount }));
        if (errors.amount) {
            setErrors(prev => ({ ...prev, amount: '' }));
        }
    };

    const getDocumentType = () => {
        if (isForInvoice) return 'Invoice';
        if (isForTHN) return 'Truck Hiring Note';
        return 'Document';
    };

    const getDocumentNumber = () => {
        if (isForInvoice) return `INV-${invoiceId?.slice(-6)}`;
        if (isForTHN) return `THN-${truckHiringNoteId?.slice(-6)}`;
        return 'Unknown';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start p-4 overflow-y-auto" data-form-modal="true">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-4 sm:my-8 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <Card title={title || `Record Payment for ${getDocumentType()} ${getDocumentNumber()}`}>
                        {/* Payment Summary */}
                        <FormSection title="Payment Summary">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                                    <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 font-semibold">
                                        ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Already Paid</label>
                                    <div className="mt-1 p-3 border border-gray-300 rounded-md bg-green-50 font-semibold text-green-600">
                                        ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Balance Due</label>
                                    <div className="mt-1 p-3 border border-gray-300 rounded-md bg-red-50 font-semibold text-red-600">
                                        ₹{Math.abs(balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        {/* General Error Message */}
                        {errors.general && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                                <p className="text-red-600 text-sm">{errors.general}</p>
                            </div>
                        )}

                        {/* Payment Details */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ValidatedInput
                                    fieldName="date"
                                    validationRules={validationRules}
                                    value={payment.date}
                                    onValueChange={(value) => handleValueChange('date', value)}
                                    type="date"
                                    required
                                />
                                <div>
                                    <ValidatedInput
                                        fieldName="amount"
                                        validationRules={validationRules}
                                        value={payment.amount}
                                        onValueChange={(value) => handleValueChange('amount', value)}
                                        type="number"
                                        required
                                        min="0.01"
                                        max={Math.abs(balanceDue)}
                                        step="0.01"
                                        className="w-full text-lg py-3"
                                    />
                                    <div className="flex justify-center space-x-2 mt-3">
                                        {quickAmounts.map((quick, index) => (
                                            <Button
                                                key={index}
                                                type="button"
                                                variant="secondary"
                                                onClick={() => setQuickAmount(quick.value)}
                                                className="text-sm px-3 py-1.5 min-w-[60px]"
                                            >
                                                {quick.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ValidatedSelect
                                    fieldName="type"
                                    validationRules={validationRules}
                                    value={payment.type}
                                    onValueChange={(value) => handleValueChange('type', value)}
                                    required
                                >
                                    <option value={PaymentType.RECEIPT}>Receipt</option>
                                    <option value={PaymentType.ADVANCE}>Advance</option>
                                    <option value={PaymentType.PAYMENT}>Payment</option>
                                </ValidatedSelect>
                                <ValidatedSelect
                                    fieldName="mode"
                                    validationRules={validationRules}
                                    value={payment.mode}
                                    onValueChange={(value) => handleValueChange('mode', value)}
                                    required
                                >
                                    <option value={PaymentMode.CASH}>Cash</option>
                                    <option value={PaymentMode.CHEQUE}>Cheque</option>
                                    <option value={PaymentMode.NEFT}>NEFT</option>
                                    <option value={PaymentMode.RTGS}>RTGS</option>
                                    <option value={PaymentMode.UPI}>UPI</option>
                                </ValidatedSelect>
                            </div>

                            {payment.mode !== PaymentMode.CASH && (
                                <ValidatedInput
                                    fieldName="referenceNo"
                                    validationRules={validationRules}
                                    value={payment.referenceNo}
                                    onValueChange={(value) => handleValueChange('referenceNo', value)}
                                    required
                                    placeholder={
                                        payment.mode === PaymentMode.CHEQUE ? "Cheque number" :
                                        payment.mode === PaymentMode.NEFT ? "NEFT reference" :
                                        payment.mode === PaymentMode.RTGS ? "RTGS reference" :
                                        payment.mode === PaymentMode.UPI ? "UPI transaction ID" :
                                        "Reference number"
                                    }
                                />
                            )}

                            {/* TDS Section - Only for Receipts */}
                            {payment.type === PaymentType.RECEIPT && (
                                <FormSection title="TDS (Tax Deducted at Source)">
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="tdsApplicable"
                                                checked={payment.tdsApplicable || false}
                                                onChange={(e) => handleValueChange('tdsApplicable', e.target.checked)}
                                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="tdsApplicable" className="text-sm font-medium text-gray-700">
                                                TDS Applicable
                                            </label>
                                        </div>

                                        {payment.tdsApplicable && (
                                            <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                                                <ValidatedInput
                                                    fieldName="tdsRate"
                                                    validationRules={validationRules}
                                                    value={payment.tdsRate || ''}
                                                    onValueChange={(value) => handleValueChange('tdsRate', parseFloat(value) || 0)}
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    required
                                                    placeholder="TDS Rate (%)"
                                                    label="TDS Rate (%)"
                                                />
                                                <ValidatedInput
                                                    fieldName="tdsDate"
                                                    validationRules={validationRules}
                                                    value={payment.tdsDate || payment.date}
                                                    onValueChange={(value) => handleValueChange('tdsDate', value)}
                                                    type="date"
                                                    required
                                                    label="TDS Date"
                                                />
                                                
                                                {/* TDS Calculation Display */}
                                                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Gross Payment Amount:</span>
                                                        <span className="font-semibold">₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">TDS Amount ({tdsRate}%):</span>
                                                        <span className="font-semibold text-red-600">- ₹{calculatedTdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="border-t border-gray-300 pt-2 flex justify-between">
                                                        <span className="text-gray-700 font-medium">Net Amount Received:</span>
                                                        <span className="font-bold text-green-600">₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </FormSection>
                            )}

                            <ValidatedTextarea
                                fieldName="notes"
                                validationRules={validationRules}
                                value={payment.notes}
                                onValueChange={(value) => handleValueChange('notes', value)}
                                rows={3}
                                placeholder="Additional payment notes or remarks"
                            />
                        </div>

                        {/* Payment Summary */}
                        <FormSection title="Payment Summary">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        {payment.tdsApplicable ? 'Net Payment Amount (After TDS)' : 'Payment Amount'}
                                    </label>
                                    <div className="mt-1 p-3 border border-gray-300 rounded-md bg-white font-semibold text-lg">
                                        ₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    {payment.tdsApplicable && (
                                        <div className="mt-1 text-xs text-gray-500">
                                            Gross: ₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} - TDS: ₹{calculatedTdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Remaining Balance</label>
                                    <div className="mt-1 p-3 border border-gray-300 rounded-md bg-white font-semibold text-lg text-red-600">
                                        ₹{(Math.abs(balanceDue) - netAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </FormSection>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-2 pt-6 mt-6 border-t">
                            <Button 
                                type="button" 
                                variant="secondary" 
                                onClick={onClose} 
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isSaving || payment.amount <= 0}
                            >
                                {isSaving ? 'Recording Payment...' : 'Record Payment'}
                            </Button>
                        </div>
                    </Card>
                </form>
            </div>
        </div>
    );
};
