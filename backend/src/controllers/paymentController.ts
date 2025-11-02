import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Payment from '../models/payment';
import Invoice from '../models/invoice';
import TruckHiringNote from '../models/truckHiringNote';
import { updateInvoiceStatus } from '../utils/invoiceUtils';
import NumberingConfig from '../models/numbering';
import { THNStatus, PaymentType } from '../types';
import mongoose from 'mongoose';
// THN status update function
export const updateThnStatus = async (thnId: string) => {
  try {
    console.log(`Updating THN status for ID: ${thnId}`);
    const thn = await TruckHiringNote.findById(thnId);
    if (thn) {
      console.log(`Found THN: ${thn.thnNumber}, Freight: ${thn.freightRate}, Additional: ${thn.additionalCharges || 0}`);
      
      const totalPaid = await Payment.aggregate([
        { $match: { truckHiringNoteId: new mongoose.Types.ObjectId(thnId) } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      console.log(`Payment aggregation result:`, totalPaid);
    
    const paidAmount = totalPaid.length > 0 ? totalPaid[0].total : 0;
    const totalAmount = thn.freightRate + (thn.additionalCharges || 0);
    
    // Check if advance payment record exists
    // Advance payments are stored as Payment records, so they're already included in paidAmount
    // Only add advanceAmount if no advance payment record exists (edge case for old data)
    const advancePaymentExists = await Payment.findOne({
      truckHiringNoteId: new mongoose.Types.ObjectId(thnId),
      type: PaymentType.ADVANCE
    });
    
    // If advance payment record exists, it's already included in paidAmount
    // Otherwise, add the advance amount (for backward compatibility with old records)
    const totalPaidAmount = advancePaymentExists ? paidAmount : (paidAmount + (thn.advanceAmount || 0));
    const balanceAmount = Math.max(0, totalAmount - totalPaidAmount); // Ensure balance is never negative
    
    console.log(`Calculated - Paid from records: ${paidAmount}, Advance from THN: ${thn.advanceAmount || 0}, Advance payment record exists: ${!!advancePaymentExists}, Total Paid: ${totalPaidAmount}, Total: ${totalAmount}, Balance: ${balanceAmount}`);
    
    let status = THNStatus.UNPAID;
    if (balanceAmount <= 0) {
      status = THNStatus.PAID;
    } else if (totalPaidAmount > 0) {
      status = THNStatus.PARTIALLY_PAID;
    }
    
    console.log(`Updating THN with status: ${status}`);
    
      await TruckHiringNote.findByIdAndUpdate(thnId, { 
        paidAmount: totalPaidAmount, 
        balanceAmount, 
        status 
      }, { runValidators: false });
      
      console.log(`THN status updated successfully`);
    } else {
      console.log(`THN not found with ID: ${thnId}`);
    }
  } catch (error) {
    console.error(`Error updating THN status for ${thnId}:`, error);
  }
};
import { createPaymentSchema, updatePaymentSchema } from '../utils/validation';

export const getPayments = asyncHandler(async (req: Request, res: Response) => {
  const payments = await Payment.find()
    .populate('customer')
    .populate({
      path: 'invoiceId',
      populate: {
        path: 'customer',
        model: 'Customer'
      }
    })
    .populate('truckHiringNoteId');
  res.json(payments);
});

export const getPaymentById = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findById(req.params.id).populate('invoiceId');
  if (payment) {
    res.json(payment);
  } else {
    res.status(404);
    throw new Error('Payment not found');
  }
});

export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('Payment creation request body:', JSON.stringify(req.body, null, 2));
    const paymentData = createPaymentSchema.parse(req.body);
    console.log('Parsed payment data:', JSON.stringify(paymentData, null, 2));
    
    // Validate customer ID is a valid ObjectId (only if provided and not empty)
    if (paymentData.customer && paymentData.customer.trim() && !paymentData.customer.match(/^[0-9a-fA-F]{24}$/)) {
      console.error('Invalid customer ID:', paymentData.customer);
      res.status(400).json({
        message: 'Invalid customer ID format',
        error: 'Customer ID must be a valid MongoDB ObjectId'
      });
      return;
    }
    
    const { invoiceId, truckHiringNoteId } = paymentData;

    // Handle TDS calculation (Option 3a: TDS deducted from payment amount)
    let finalAmount = paymentData.amount;
    let tdsAmount = paymentData.tdsAmount;
    let tdsDate = paymentData.tdsDate || paymentData.date;

    if (paymentData.tdsApplicable && paymentData.type === PaymentType.RECEIPT) {
      // Validate TDS rate is provided
      if (!paymentData.tdsRate && paymentData.tdsRate !== 0) {
        res.status(400).json({
          message: 'Validation failed',
          error: 'TDS rate is required when TDS is applicable'
        });
        return;
      }

      // Calculate TDS amount if not provided
      if (tdsAmount === undefined || tdsAmount === null) {
        tdsAmount = paymentData.amount * (paymentData.tdsRate! / 100);
      }

      // For Option 3a: payment.amount should be NET amount (gross - TDS)
      // If frontend sent gross amount, calculate net; otherwise use amount as-is (assuming it's already net)
      // Note: Frontend should send net amount, but we'll handle both cases
      // For now, assuming amount is gross if tdsAmount was not provided
      if (paymentData.tdsAmount === undefined) {
        finalAmount = paymentData.amount - tdsAmount;
      } else {
        // Frontend already calculated net, so amount is already net
        finalAmount = paymentData.amount;
      }
    } else {
      // Clear TDS fields if not applicable
      tdsAmount = undefined;
      paymentData.tdsRate = undefined;
      tdsDate = undefined;
    }

    // Generate payment number
    let paymentNumber = Date.now(); // Fallback
    const config = await NumberingConfig.findOne({ type: 'paymentId' });
    if (config) {
      paymentNumber = config.currentNumber;
      config.currentNumber = config.currentNumber + 1;
      await config.save();
    }
    
    const payment = new Payment({
      ...paymentData,
      amount: finalAmount, // Store net amount after TDS deduction
      tdsAmount,
      tdsDate,
      paymentNumber
    });
    const newPayment = await payment.save();
    console.log('Payment saved successfully:', newPayment._id);

  if (invoiceId) {
    await Invoice.findByIdAndUpdate(invoiceId, {
      $push: { payments: newPayment._id }
    }, { runValidators: false });
    await updateInvoiceStatus(invoiceId);
  } else if (truckHiringNoteId) {
    await TruckHiringNote.findByIdAndUpdate(truckHiringNoteId, {
      $push: { payments: newPayment._id }
    }, { runValidators: false });
    await updateThnStatus(truckHiringNoteId);
  }

    const populatedPayment = await Payment.findById(newPayment._id)
      .populate('customer')
      .populate('invoiceId')
      .populate('truckHiringNoteId');

    console.log('Payment created successfully:', populatedPayment?._id);
    res.status(201).json(populatedPayment);
  } catch (error) {
    console.error('Error creating payment:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    
    // Handle validation errors specifically
    if (error instanceof Error && error.name === 'ZodError') {
      const validationErrors: { [key: string]: string[] } = {};
      if ((error as any).issues) {
        (error as any).issues.forEach((issue: any) => {
          const field = issue.path.join('.');
          if (!validationErrors[field]) {
            validationErrors[field] = [];
          }
          validationErrors[field].push(issue.message);
        });
      }
      
      console.error('Validation errors:', validationErrors);
      
      res.status(400).json({
        message: 'Validation failed',
        errors: {
          fieldErrors: validationErrors
        }
      });
      return;
    }
    
    // Handle other errors
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return;
  }
});

export const updatePayment = asyncHandler(async (req: Request, res: Response) => {
  const paymentData = updatePaymentSchema.parse(req.body);
  
  // Handle TDS calculation for updates (Option 3a: TDS deducted from payment amount)
  let updateData: any = { ...paymentData };
  
  if (paymentData.tdsApplicable !== undefined && paymentData.tdsApplicable && paymentData.type === PaymentType.RECEIPT) {
    // Validate TDS rate is provided
    if (paymentData.tdsRate === undefined && paymentData.tdsRate !== 0) {
      res.status(400).json({
        message: 'Validation failed',
        error: 'TDS rate is required when TDS is applicable'
      });
      return;
    }

    // Calculate TDS amount if not provided
    let tdsAmount = paymentData.tdsAmount;
    if (tdsAmount === undefined || tdsAmount === null) {
      const baseAmount = paymentData.amount !== undefined ? paymentData.amount : 
                        (await Payment.findById(req.params.id))?.amount || 0;
      tdsAmount = baseAmount * ((paymentData.tdsRate || 0) / 100);
    }

    // For Option 3a: adjust amount to net (gross - TDS)
    // If amount is being updated, assume it's gross if tdsAmount wasn't provided
    if (paymentData.amount !== undefined && paymentData.tdsAmount === undefined) {
      updateData.amount = paymentData.amount - tdsAmount;
    }
    
    updateData.tdsAmount = tdsAmount;
    updateData.tdsDate = paymentData.tdsDate || paymentData.date;
  } else if (paymentData.tdsApplicable === false) {
    // Clear TDS fields if TDS is disabled
    updateData.tdsAmount = undefined;
    updateData.tdsRate = undefined;
    updateData.tdsDate = undefined;
  }

  const updatedPayment = await Payment.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!updatedPayment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  if (updatedPayment.invoiceId) {
    await updateInvoiceStatus(updatedPayment.invoiceId.toString());
  } else if (updatedPayment.truckHiringNoteId) {
    await updateThnStatus(updatedPayment.truckHiringNoteId.toString());
  }

  res.json(updatedPayment);
});

export const deletePayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findByIdAndDelete(req.params.id);

  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  if (payment.invoiceId) {
    const invoiceId = payment.invoiceId.toString();
    await Invoice.findByIdAndUpdate(invoiceId, { $pull: { payments: payment._id } });
    await updateInvoiceStatus(invoiceId);
  } else if (payment.truckHiringNoteId) {
    const thnId = payment.truckHiringNoteId.toString();
    await TruckHiringNote.findByIdAndUpdate(thnId, { $pull: { payments: payment._id } });
    await updateThnStatus(thnId);
  }

  res.json({ message: 'Deleted Payment' });
});
