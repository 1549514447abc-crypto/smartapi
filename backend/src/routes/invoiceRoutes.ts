import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth';
import {
  applyInvoice,
  getMyApplications,
  getInvoiceQuota,
  getAllApplications,
  updateApplicationStatus,
  getInvoiceStats,
  getUserInvoiceStats
} from '../controllers/invoiceController';

const router = Router();

// User routes (require authentication)
router.post('/apply', authenticate, applyInvoice);
router.get('/my', authenticate, getMyApplications);
router.get('/quota', authenticate, getInvoiceQuota);

// Admin routes
router.get('/admin', authenticate, adminOnly, getAllApplications);
router.get('/admin/stats', authenticate, adminOnly, getInvoiceStats);
router.get('/admin/user/:userId/stats', authenticate, adminOnly, getUserInvoiceStats);
router.put('/admin/:id/status', authenticate, adminOnly, updateApplicationStatus);

export default router;
