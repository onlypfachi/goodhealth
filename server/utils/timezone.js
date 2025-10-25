/**
 * Timezone Utility for Zimbabwe (CAT - Central Africa Time)
 * UTC+2 hours
 */

/**
 * Get current date/time in Zimbabwe timezone
 * @returns {Date} Current date adjusted to CAT (UTC+2)
 */
export function getZimbabweTime() {
  const now = new Date();
  // Add 2 hours for CAT timezone
  const zimbabweTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
  return zimbabweTime;
}

/**
 * Get current date in Zimbabwe timezone (YYYY-MM-DD)
 * @returns {string} Current date in Zimbabwe
 */
export function getZimbabweDate() {
  const zimTime = getZimbabweTime();
  return zimTime.toISOString().split('T')[0];
}

/**
 * Get current time in Zimbabwe timezone (HH:MM:SS)
 * @returns {string} Current time in Zimbabwe
 */
export function getZimbabweTimeString() {
  const zimTime = getZimbabweTime();
  return zimTime.toISOString().split('T')[1].split('.')[0];
}

/**
 * Get current datetime in Zimbabwe timezone (YYYY-MM-DD HH:MM:SS)
 * @returns {string} Current datetime in Zimbabwe
 */
export function getZimbabweDatetime() {
  const zimTime = getZimbabweTime();
  return zimTime.toISOString().replace('T', ' ').split('.')[0];
}

/**
 * Convert UTC date to Zimbabwe date
 * @param {string|Date} utcDate - UTC date
 * @returns {string} Zimbabwe date (YYYY-MM-DD)
 */
export function utcToZimbabweDate(utcDate) {
  const date = new Date(utcDate);
  const zimDate = new Date(date.getTime() + (2 * 60 * 60 * 1000));
  return zimDate.toISOString().split('T')[0];
}

/**
 * Get "today" in Zimbabwe timezone for SQL queries
 * Use this instead of date('now') or CURRENT_DATE
 * @returns {string} Today's date in Zimbabwe (YYYY-MM-DD)
 */
export function getTodayZimbabwe() {
  return getZimbabweDate();
}

/**
 * SQLite datetime modifier for Zimbabwe time
 * Add this to datetime('now') queries: datetime('now', '+2 hours')
 */
export const ZIMBABWE_TIME_MODIFIER = '+2 hours';

/**
 * Get Zimbabwe time for SQLite INSERT
 * @returns {string} Datetime string for SQLite
 */
export function getSQLiteZimbabweTime() {
  return getZimbabweDatetime();
}

/**
 * Format time difference in human-readable format
 * @param {number} minutes - Minutes ago
 * @returns {string} Formatted time (e.g., "5 min ago", "2 hours ago")
 */
export function formatTimeAgo(minutes) {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${Math.floor(minutes)} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
  return `${Math.floor(minutes / 1440)} days ago`;
}

/**
 * Format Zimbabwe time for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted Zimbabwe time
 */
export function formatZimbabweTime(date) {
  const zimTime = new Date(new Date(date).getTime() + (2 * 60 * 60 * 1000));
  return zimTime.toLocaleString('en-ZW', {
    timeZone: 'Africa/Harare',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Check if date is today in Zimbabwe timezone
 * @param {string} date - Date to check (YYYY-MM-DD)
 * @returns {boolean} True if date is today in Zimbabwe
 */
export function isToday(date) {
  return date === getZimbabweDate();
}

/**
 * Get next business day in Zimbabwe (skip weekends)
 * @param {string} fromDate - Starting date (YYYY-MM-DD)
 * @returns {string} Next business day
 */
export function getNextBusinessDay(fromDate = null) {
  let date = fromDate ? new Date(fromDate) : getZimbabweTime();

  // Move to next day
  date.setDate(date.getDate() + 1);

  // Skip weekends
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split('T')[0];
}

export default {
  getZimbabweTime,
  getZimbabweDate,
  getZimbabweTimeString,
  getZimbabweDatetime,
  utcToZimbabweDate,
  getTodayZimbabwe,
  ZIMBABWE_TIME_MODIFIER,
  getSQLiteZimbabweTime,
  formatTimeAgo,
  formatZimbabweTime,
  isToday,
  getNextBusinessDay
};
