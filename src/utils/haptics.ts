/**
 * Trigger lightweight haptic feedback on devices that support vibration API.
 */
export function triggerHaptic(pattern: number | number[] = 25): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore unsupported vibration errors
  }
}
