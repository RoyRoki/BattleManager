/**
 * Device detection utilities
 */

/**
 * Check if the current device is an iPhone or iPod
 * @returns true if the device is an iPhone or iPod
 */
export const isIPhone = (): boolean => {
  return /iPhone|iPod/.test(navigator.userAgent);
};





