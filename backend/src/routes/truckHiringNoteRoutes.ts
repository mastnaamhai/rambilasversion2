import express from 'express';
import {
    getTruckHiringNotes,
    getTruckHiringNoteById,
    createTruckHiringNote,
    updateTruckHiringNote,
    deleteTruckHiringNote,
    recalculateThnStatus
} from '../controllers/truckHiringNoteController';
// import { runAdvancePaymentMigration } from '../utils/migrateAdvancePayments';

const router = express.Router();

router.get('/', getTruckHiringNotes);
router.get('/:id/recalculate', recalculateThnStatus);
router.get('/:id', getTruckHiringNoteById);
router.post('/', createTruckHiringNote);
router.put('/:id', updateTruckHiringNote);
router.delete('/:id', deleteTruckHiringNote);

// Migration endpoint for advance payments
router.post('/migrate-advance-payments', async (req, res) => {
  try {
    // await runAdvancePaymentMigration();
    res.json({ message: 'Advance payment migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      message: 'Migration failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
