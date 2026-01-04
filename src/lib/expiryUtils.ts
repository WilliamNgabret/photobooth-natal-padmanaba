import { config } from './config';

/**
 * Calculate remaining time until expiry
 */
export function getExpiryInfo(createdAt: string): {
  isExpired: boolean;
  remainingMs: number;
  remainingFormatted: string;
  expiresAt: Date;
} {
  const created = new Date(createdAt);
  const expiresAt = new Date(created.getTime() + config.PHOTO_EXPIRY_HOURS * 60 * 60 * 1000);
  const now = new Date();
  const remainingMs = expiresAt.getTime() - now.getTime();
  const isExpired = remainingMs <= 0;

  return {
    isExpired,
    remainingMs: Math.max(0, remainingMs),
    remainingFormatted: formatRemainingTime(remainingMs),
    expiresAt,
  };
}

/**
 * Format remaining time as HH:MM:SS
 */
export function formatRemainingTime(ms: number): string {
  if (ms <= 0) return '00:00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map(v => v.toString().padStart(2, '0'))
    .join(':');
}

/**
 * Check if a photo is expired based on its created_at timestamp
 */
export function isPhotoExpired(createdAt: string): boolean {
  return getExpiryInfo(createdAt).isExpired;
}
