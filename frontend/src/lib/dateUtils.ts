/**
 * Utility functions for date handling
 */

/**
 * Safely formats a timestamp to a locale date string
 * @param timestamp - The timestamp to format (can be number, string, or undefined)
 * @returns Formatted date string or 'Not set' if invalid
 */
export function formatDateSafely(timestamp: number | string | undefined): string {
  if (!timestamp) return 'Not set'
  
  const timestampNum = Number(timestamp)
  if (isNaN(timestampNum) || timestampNum <= 0) return 'Not set'
  
  const date = new Date(timestampNum)
  return isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString()
}

/**
 * Safely formats a timestamp to a locale date and time string
 * @param timestamp - The timestamp to format (can be number, string, or undefined)
 * @returns Formatted date and time string or 'Not set' if invalid
 */
export function formatDateTimeSafely(timestamp: number | string | undefined): string {
  if (!timestamp) return 'Not set'
  
  const timestampNum = Number(timestamp)
  if (isNaN(timestampNum) || timestampNum <= 0) return 'Not set'
  
  const date = new Date(timestampNum)
  return isNaN(date.getTime()) ? 'Not set' : date.toLocaleString()
}
