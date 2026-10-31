import { z } from 'zod';

export const otpSendSchema = z.object({
  clientTimestamp: z.number().optional(),
});

export const otpVerifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

const MAX_PNG_BYTES = 300 * 1024; // 300 KB
const MAX_PHOTO_BYTES = 1024 * 1024; // 1 MB

export const signatureSubmitSchema = z.object({
  consent: z.literal(true, {
    errorMap: () => ({ message: 'You must explicitly consent to electronically sign this document' }),
  }),
  signatureMethod: z.enum(['draw', 'typed']),
  typedFont: z.enum(['Dancing Script', 'Caveat', 'Pacifico']).optional(),
  signaturePngBase64: z
    .string()
    .min(1, 'Signature image is required')
    .refine((val) => val.startsWith('data:image/png;base64,'), {
      message: 'Signature must be a PNG data URL (data:image/png;base64,...)',
    })
    .refine(
      (val) => {
        const base64Data = val.replace(/^data:image\/png;base64,/, '');
        const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
        return sizeInBytes <= MAX_PNG_BYTES;
      },
      {
        message: 'Signature image must not exceed 300 KB',
      }
    ),
  signerPhotoBase64: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return (
          val.startsWith('data:image/jpeg;base64,') ||
          val.startsWith('data:image/png;base64,') ||
          val.startsWith('data:image/webp;base64,')
        );
      },
      { message: 'Signer photo must be a valid image data URL' }
    ),
  geoLocation: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      accuracy: z.number().optional(),
    })
    .optional(),
});
