import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import TruckHiringNote from '../models/truckHiringNote';
import Payment from '../models/payment';
import NumberingConfig from '../models/numbering';
import { createTruckHiringNoteSchema, updateTruckHiringNoteSchema } from '../utils/validation';
import { THNStatus, PaymentType, PaymentMode } from '../types';
import { updateThnStatus } from './paymentController';

export const getTruckHiringNotes = asyncHandler(async (req: Request, res: Response) => {
  // Recalculate all THNs to ensure paid amounts are accurate (especially after fixing double-counting bug)
  // This runs in parallel for better performance
  const notes = await TruckHiringNote.find().populate('payments').sort({ thnNumber: -1 });
  await Promise.all(notes.map(note => updateThnStatus(note._id.toString())));
  // Fetch again with updated values
  const updatedNotes = await TruckHiringNote.find().populate('payments').sort({ thnNumber: -1 });
  console.log(`Returning ${updatedNotes.length} THNs with statuses:`, updatedNotes.map(n => ({ thnNumber: n.thnNumber, status: n.status, paidAmount: n.paidAmount, balanceAmount: n.balanceAmount })));
  res.json(updatedNotes);
});

export const getTruckHiringNoteById = asyncHandler(async (req: Request, res: Response) => {
  const note = await TruckHiringNote.findById(req.params.id).populate('payments');
  if (note) {
    // Recalculate status to ensure data is up-to-date
    await updateThnStatus(req.params.id);
    // Fetch again with updated values
    const updatedNote = await TruckHiringNote.findById(req.params.id).populate('payments');
    res.json(updatedNote || note);
  } else {
    res.status(404);
    throw new Error('Truck Hiring Note not found');
  }
});

export const createTruckHiringNote = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('Received THN data:', JSON.stringify(req.body, null, 2));
    
    const noteData = createTruckHiringNoteSchema.parse(req.body);
    console.log('Validated data:', JSON.stringify(noteData, null, 2));
    
    // Generate THN number
    let nextThnNumber = Date.now(); // Fallback
    const config = await NumberingConfig.findOne({ type: 'truckHiringNoteId' });
    if (config) {
      nextThnNumber = config.currentNumber;
      config.currentNumber = config.currentNumber + 1;
      await config.save();
    }
    console.log('Generated THN number:', nextThnNumber);
    
    const totalAmount = noteData.freightRate + (noteData.additionalCharges || 0);
    const advanceAmount = noteData.advanceAmount || 0;
    const balanceAmount = Math.max(0, totalAmount - advanceAmount); // Ensure balance is never negative
    
    // Determine initial status based on advance payment
    let initialStatus = THNStatus.UNPAID;
    if (balanceAmount <= 0) {
      initialStatus = THNStatus.PAID;
    } else if (advanceAmount > 0) {
      initialStatus = THNStatus.PARTIALLY_PAID;
    }

    const note = new TruckHiringNote({
      thnNumber: nextThnNumber,
      ...noteData,
      advanceAmount,
      balanceAmount,
      additionalCharges: noteData.additionalCharges || 0,
      status: initialStatus,
      paidAmount: advanceAmount, // Set paidAmount to include advance payment
      payments: []
    });

    const newNote = await note.save();
    console.log('Saved THN:', newNote._id);

    // If there's an advance amount, create a corresponding Payment record
    if (advanceAmount > 0) {
      try {
        console.log(`Creating advance payment record for THN ${newNote.thnNumber} with amount ${advanceAmount}`);
        
        // Generate payment number
        let paymentNumber = Date.now(); // Fallback
        const paymentConfig = await NumberingConfig.findOne({ type: 'paymentId' });
        if (paymentConfig) {
          paymentNumber = paymentConfig.currentNumber;
          paymentConfig.currentNumber = paymentConfig.currentNumber + 1;
          await paymentConfig.save();
        }
        
        const advancePayment = new Payment({
          paymentNumber,
          truckHiringNoteId: newNote._id,
          customer: null, // THN payments don't have customers
          date: noteData.date,
          amount: advanceAmount,
          type: PaymentType.ADVANCE,
          mode: noteData.paymentMode as PaymentMode || PaymentMode.CASH,
          referenceNo: `THN-${newNote.thnNumber}-ADVANCE`,
          notes: `Advance payment for THN #${newNote.thnNumber}`
        });

        const savedAdvancePayment = await advancePayment.save();
        console.log('Saved advance payment:', savedAdvancePayment._id);

        // Update THN to include this payment
        await TruckHiringNote.findByIdAndUpdate(newNote._id, {
          $push: { payments: savedAdvancePayment._id }
        });

        console.log('Updated THN with advance payment reference');
      } catch (paymentError) {
        console.error('Error creating advance payment record:', paymentError);
        // Don't fail the THN creation if payment record creation fails
        // The advance amount is still recorded in the THN itself
      }
    }

    // Populate the THN with payments before returning
    const populatedNote = await TruckHiringNote.findById(newNote._id)
      .populate('payments');
    
    res.status(201).json(populatedNote);
  } catch (error) {
    console.error('Error creating THN:', error);
    
    // Handle validation errors specifically
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationErrors: { [key: string]: string[] } = {};
      if ((error as any).errors) {
        Object.keys((error as any).errors).forEach(key => {
          validationErrors[key] = [(error as any).errors[key].message];
        });
      }
      
      res.status(400).json({
        message: 'Validation failed',
        errors: {
          fieldErrors: validationErrors
        }
      });
      return;
    }
    
    // Handle Zod validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      const zodErrors: { [key: string]: string[] } = {};
      if ((error as any).issues) {
        (error as any).issues.forEach((issue: any) => {
          const field = issue.path.join('.');
          if (!zodErrors[field]) zodErrors[field] = [];
          zodErrors[field].push(issue.message);
        });
      }
      
      res.status(400).json({
        message: 'Validation failed',
        errors: {
          fieldErrors: zodErrors
        }
      });
      return;
    }
    
    res.status(500).json({ 
      message: 'Failed to create truck hiring note', 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    });
  }
});

export const updateTruckHiringNote = asyncHandler(async (req: Request, res: Response) => {
  const updateData = updateTruckHiringNoteSchema.parse(req.body);
  const { freightRate, advanceAmount, additionalCharges } = updateData;

  const existingNote = await TruckHiringNote.findById(req.params.id);
  if (!existingNote) {
    res.status(404);
    throw new Error('Truck Hiring Note not found');
  }

  // Recalculate balance if financial fields are updated
  if (freightRate !== undefined || advanceAmount !== undefined || additionalCharges !== undefined) {
    const newFreightRate = freightRate !== undefined ? freightRate : existingNote.freightRate;
    const newAdvanceAmount = advanceAmount !== undefined ? advanceAmount : existingNote.advanceAmount;
    const newAdditionalCharges = additionalCharges !== undefined ? additionalCharges : (existingNote.additionalCharges || 0);
    
    (updateData as any).freightRate = newFreightRate;
    (updateData as any).advanceAmount = newAdvanceAmount;
    (updateData as any).additionalCharges = newAdditionalCharges;
    (updateData as any).balanceAmount = Math.max(0, newFreightRate + newAdditionalCharges - newAdvanceAmount); // Ensure balance is never negative

    // Handle advance amount changes
    if (advanceAmount !== undefined && advanceAmount !== existingNote.advanceAmount) {
      console.log(`Advance amount changed from ${existingNote.advanceAmount} to ${advanceAmount}`);
      
      // Find existing advance payment record
      const existingAdvancePayment = await Payment.findOne({
        truckHiringNoteId: req.params.id,
        type: PaymentType.ADVANCE,
        referenceNo: `THN-${existingNote.thnNumber}-ADVANCE`
      });

      if (advanceAmount > 0) {
        if (existingAdvancePayment) {
          // Update existing advance payment
          await Payment.findByIdAndUpdate(existingAdvancePayment._id, {
            amount: advanceAmount,
            date: updateData.date || existingNote.date
          });
          console.log('Updated existing advance payment record');
        } else {
          // Create new advance payment record
          try {
            // Generate payment number
        let paymentNumber = Date.now(); // Fallback
        const paymentConfig = await NumberingConfig.findOne({ type: 'paymentId' });
        if (paymentConfig) {
          paymentNumber = paymentConfig.currentNumber;
          paymentConfig.currentNumber = paymentConfig.currentNumber + 1;
          await paymentConfig.save();
        }
            
            const advancePayment = new Payment({
              paymentNumber,
              truckHiringNoteId: req.params.id,
              customer: null, // THN payments don't have customers
              date: updateData.date || existingNote.date,
              amount: advanceAmount,
              type: PaymentType.ADVANCE,
              mode: (updateData.paymentMode || existingNote.paymentMode) as PaymentMode || PaymentMode.CASH,
              referenceNo: `THN-${existingNote.thnNumber}-ADVANCE`,
              notes: `Advance payment for THN #${existingNote.thnNumber}`
            });

            const savedAdvancePayment = await advancePayment.save();
            console.log('Created new advance payment record:', savedAdvancePayment._id);

            // Update THN to include this payment
            await TruckHiringNote.findByIdAndUpdate(req.params.id, {
              $push: { payments: savedAdvancePayment._id }
            });
          } catch (paymentError) {
            console.error('Error creating advance payment record during update:', paymentError);
          }
        }
      } else if (advanceAmount === 0 && existingAdvancePayment) {
        // Remove advance payment record if advance amount is set to 0
        await Payment.findByIdAndDelete(existingAdvancePayment._id);
        await TruckHiringNote.findByIdAndUpdate(req.params.id, {
          $pull: { payments: existingAdvancePayment._id }
        });
        console.log('Removed advance payment record');
      }
    }
  }

  const updatedNote = await TruckHiringNote.findByIdAndUpdate(req.params.id, updateData, { new: true })
    .populate('payments');

  if (!updatedNote) {
    res.status(404);
    throw new Error('Truck Hiring Note not found');
  }

  // Always recalculate status after update to ensure accuracy
  await updateThnStatus(req.params.id);

  // Fetch the updated note with recalculated values
  const recalculatedNote = await TruckHiringNote.findById(req.params.id).populate('payments');
  res.json(recalculatedNote || updatedNote);
});

export const recalculateThnStatus = asyncHandler(async (req: Request, res: Response) => {
  const thnId = req.params.id;
  await updateThnStatus(thnId);
  const updatedNote = await TruckHiringNote.findById(thnId).populate('payments');
  if (updatedNote) {
    res.json(updatedNote);
  } else {
    res.status(404);
    throw new Error('Truck Hiring Note not found');
  }
});

export const deleteTruckHiringNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await TruckHiringNote.findById(req.params.id);
  
  if (!note) {
    res.status(404);
    throw new Error('Truck Hiring Note not found');
  }

  // Delete associated payment records
  await Payment.deleteMany({ truckHiringNoteId: req.params.id });
  console.log(`Deleted payment records for THN ${note.thnNumber}`);

  await TruckHiringNote.findByIdAndDelete(req.params.id);
  res.json({ message: 'Truck Hiring Note deleted successfully' });
});
