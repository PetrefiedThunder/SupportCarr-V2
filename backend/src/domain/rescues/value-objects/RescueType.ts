/**
 * Rescue Type Value Object
 *
 * Represents the type of rescue service needed
 */
export enum RescueType {
  FLAT_TIRE = 'flat_tire',
  DEAD_BATTERY = 'dead_battery',
  OUT_OF_CHARGE = 'out_of_charge',
  BREAKDOWN = 'breakdown',
  TRANSPORT = 'transport',
  OTHER = 'other',
}

/**
 * Rescue type metadata
 */
interface IRescueTypeMetadata {
  displayName: string;
  description: string;
  estimatedDuration: number; // in minutes
  basePrice: number; // in cents
}

/**
 * Metadata for each rescue type
 */
export const RESCUE_TYPE_METADATA: Record<RescueType, IRescueTypeMetadata> = {
  [RescueType.FLAT_TIRE]: {
    displayName: 'Flat Tire',
    description: 'Assistance with flat tire repair or replacement',
    estimatedDuration: 30,
    basePrice: 2500, // $25.00
  },
  [RescueType.DEAD_BATTERY]: {
    displayName: 'Dead Battery',
    description: 'Battery jump-start or replacement',
    estimatedDuration: 20,
    basePrice: 2000, // $20.00
  },
  [RescueType.OUT_OF_CHARGE]: {
    displayName: 'Out of Charge',
    description: 'E-bike battery charging or transport to charging station',
    estimatedDuration: 25,
    basePrice: 2000, // $20.00
  },
  [RescueType.BREAKDOWN]: {
    displayName: 'Breakdown',
    description: 'General mechanical breakdown assistance',
    estimatedDuration: 45,
    basePrice: 3500, // $35.00
  },
  [RescueType.TRANSPORT]: {
    displayName: 'Transport',
    description: 'Transport bike to destination',
    estimatedDuration: 60,
    basePrice: 4000, // $40.00
  },
  [RescueType.OTHER]: {
    displayName: 'Other',
    description: 'Other rescue services',
    estimatedDuration: 30,
    basePrice: 2500, // $25.00
  },
};

/**
 * Get metadata for rescue type
 */
export function getRescueTypeMetadata(type: RescueType): IRescueTypeMetadata {
  return RESCUE_TYPE_METADATA[type];
}

/**
 * Get base price for rescue type
 */
export function getBasePrice(type: RescueType): number {
  return RESCUE_TYPE_METADATA[type].basePrice;
}

/**
 * Get estimated duration for rescue type
 */
export function getEstimatedDuration(type: RescueType): number {
  return RESCUE_TYPE_METADATA[type].estimatedDuration;
}
