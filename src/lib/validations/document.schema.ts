import { z } from 'zod';

export const signerInputSchema = z.object({
  name: z.string().trim().min(1, 'Signer name is required'),
  email: z.string().trim().email('Invalid email address'),
  orderIndex: z.number().int().min(0).default(0),
});

export const fieldInputSchema = z.object({
  signerId: z.string().uuid('Invalid signer ID'),
  type: z.enum(['signature', 'date']),
  page: z.number().int().min(1, 'Page must be >= 1'),
  x: z.number().min(0).max(1, 'x must be between 0 and 1'),
  y: z.number().min(0).max(1, 'y must be between 0 and 1'),
  width: z.number().gt(0).max(1, 'width must be between 0 and 1'),
  height: z.number().gt(0).max(1, 'height must be between 0 and 1'),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title too long'),
  signingOrder: z.enum(['sequential', 'parallel']).default('sequential'),
  verificationMethod: z.enum(['email_otp', 'aadhaar_otp']).default('email_otp'),
  signatureMethod: z.enum(['draw', 'typed', 'aadhaar_esign', 'auto_seal']).default('draw'),
  expiryDays: z.coerce.number().int().min(1).max(90).default(7),
});

export const saveFieldsSchema = z.object({
  fields: z.array(fieldInputSchema).min(1, 'At least one field is required'),
});

export const saveSignersSchema = z.object({
  signers: z.array(signerInputSchema).min(1, 'At least one signer is required'),
});
