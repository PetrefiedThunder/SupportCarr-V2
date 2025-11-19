import { z } from 'zod';

/**
 * Location Schema
 */
const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
});

/**
 * Create Rescue Request Schema
 */
export const CreateRescueSchema = z.object({
  type: z.enum([
    'dead_battery',
    'flat_tire',
    'mechanical_issue',
    'accident',
    'other',
  ]),
  description: z.string().min(10).max(500).optional(),
  pickupLocation: LocationSchema,
  dropoffLocation: LocationSchema.optional(),
});

export type CreateRescueDTO = z.infer<typeof CreateRescueSchema>;

/**
 * Update Rescue Status Schema
 */
export const UpdateRescueStatusSchema = z.object({
  status: z.enum([
    'requested',
    'matched',
    'accepted',
    'en_route',
    'arrived',
    'in_progress',
    'completed',
    'cancelled',
  ]),
});

export type UpdateRescueStatusDTO = z.infer<typeof UpdateRescueStatusSchema>;

/**
 * Cancel Rescue Schema
 */
export const CancelRescueSchema = z.object({
  reason: z.string().min(5).max(200).optional(),
});

export type CancelRescueDTO = z.infer<typeof CancelRescueSchema>;

/**
 * Rate Rescue Schema
 */
export const RateRescueSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5).max(500).optional(),
});

export type RateRescueDTO = z.infer<typeof RateRescueSchema>;

/**
 * Rescue ID Params Schema
 */
export const RescueIdParamsSchema = z.object({
  rescueId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid rescue ID'),
});

export type RescueIdParams = z.infer<typeof RescueIdParamsSchema>;
