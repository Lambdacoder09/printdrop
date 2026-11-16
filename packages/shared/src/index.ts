import { z } from 'zod';

// ==========================================
// ENUMS & CONSTANTS
// ==========================================

export const JobStatus = {
  SUBMITTED: 'SUBMITTED',
  RECEIVED: 'RECEIVED',
  REVIEWING: 'REVIEWING',
  BILLED: 'BILLED',
  PAID: 'PAID',
  PRINTING: 'PRINTING',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type JobStatusType = (typeof JobStatus)[keyof typeof JobStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  DIRECT_UPI: 'DIRECT_UPI',
  GATEWAY: 'GATEWAY',
} as const;

export type PaymentMethodType = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  REJECTED: 'REJECTED',
} as const;

export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ServiceType = {
  BW_PAGE: 'BW_PAGE',
  COLOR_PAGE: 'COLOR_PAGE',
  PHOTOCOPY: 'PHOTOCOPY',
  SCANNING: 'SCANNING',
  LAMINATION: 'LAMINATION',
} as const;

export type ServiceTypeValue = (typeof ServiceType)[keyof typeof ServiceType];

export const PrintSides = {
  SINGLE: 'SINGLE',
  DOUBLE_LONG: 'DOUBLE_LONG',
  DOUBLE_SHORT: 'DOUBLE_SHORT',
} as const;

export type PrintSidesType = (typeof PrintSides)[keyof typeof PrintSides];

export const PrintColorMode = {
  BW: 'BW',
  COLOR: 'COLOR',
} as const;

export type PrintColorModeType = (typeof PrintColorMode)[keyof typeof PrintColorMode];

// ==========================================
// MODELS & INTERFACES
// ==========================================

export interface Shop {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  phone: string;
  email?: string;
  upiId?: string;
  address?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  pricing: ShopPricing;
  createdAt: string;
  updatedAt: string;
}

export interface ShopPricing {
  bwPageRate: number;      // in ₹ (e.g. 2.0)
  colorPageRate: number;   // in ₹ (e.g. 10.0)
  photocopyRate: number;  // in ₹ (e.g. 2.0)
  scanningRate: number;   // in ₹ (e.g. 5.0)
  laminationRate: number; // in ₹ (e.g. 20.0)
}

export interface Device {
  id: string;
  shopId: string;
  deviceName: string;
  machineFingerprint: string;
  status: 'ACTIVE' | 'REVOKED';
  activatedAt: string;
  lastSeenAt?: string;
}

export interface JobDocument {
  id: string;
  jobId: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  pageCount?: number;
  storageKey: string;
  previewUrl?: string;
  downloadUrl?: string;
  colorMode: PrintColorModeType;
  sides: PrintSidesType;
  copies: number;
  pageRange?: string; // e.g. "1-5, 8"
  createdAt: string;
}

export interface Job {
  id: string;
  shopId: string;
  accessCode: string; // 4-digit code shown to customer for quick counter identification
  customerName: string;
  customerPhone?: string;
  documents: JobDocument[];
  status: JobStatusType;
  totalEstimatedPages: number;
  billingAmount?: number;
  paymentMethod?: PaymentMethodType;
  paymentStatus: PaymentStatusType;
  paymentUpiRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  jobId: string;
  shopId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID';
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  service: ServiceTypeValue;
  quantity: number;
  rate: number;
  amount: number;
}

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

export const CreateJobSchema = z.object({
  shopSlug: z.string().min(2),
  customerName: z.string().min(2, 'Name is required'),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

export const UpdateJobBillingSchema = z.object({
  jobId: z.string().uuid(),
  amount: z.number().nonnegative(),
  items: z.array(
    z.object({
      description: z.string(),
      service: z.nativeEnum(ServiceType),
      quantity: z.number().positive(),
      rate: z.number().nonnegative(),
      amount: z.number().nonnegative(),
    })
  ),
});

export type UpdateJobBillingInput = z.infer<typeof UpdateJobBillingSchema>;

export const ConfirmPaymentSchema = z.object({
  jobId: z.string().uuid(),
  method: z.nativeEnum(PaymentMethod),
  upiRef: z.string().optional(),
});

export type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentSchema>;

export const UpdateJobStatusSchema = z.object({
  status: z.nativeEnum(JobStatus),
});

export type UpdateJobStatusInput = z.infer<typeof UpdateJobStatusSchema>;

// ==========================================
// WEBSOCKET & SSE EVENT TYPES
// ==========================================

export const SocketEvents = {
  SHOP_JOIN: 'shop:join',
  CUSTOMER_JOIN: 'customer:join',
  JOB_CREATED: 'job:created',
  JOB_STATUS_UPDATED: 'job:status_updated',
  JOB_BILLED: 'job:billed',
  PAYMENT_CONFIRMED: 'payment:confirmed',
  DEVICE_PULSE: 'device:pulse',
} as const;

export * from './firebase';
export * from './security';
export * from './pageRange';
