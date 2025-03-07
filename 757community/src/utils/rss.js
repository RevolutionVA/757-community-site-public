import Parser from 'rss-parser';

// Create a new RSS parser instance
const parser = new Parser();

/**
 * Fetches and parses an RSS feed from a given URL
 * @param {string} url - The URL of the RSS feed
 * @returns {Promise<Array>} - A promise that resolves to an array of feed items
 */
export async function fetchRssFeed(url) {
  try {
    const feed = await parser.parseURL(url);
    return feed.items || [];
  } catch (error) {
    console.error(`Error fetching RSS feed from ${url}:`, error);
    return [];
  }
}

/**
 * Formats a date object to a readable string
 * @param {Date} date - The date to format
 * @returns {string} - The formatted date string
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Checks if a date is in the future
 * @param {Date} date - The date to check
 * @returns {boolean} - True if the date is in the future
 */
export function isFutureDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(date);
  return eventDate >= today;
}

/**
 * Checks if a date is within the next N months
 * @param {Date} date - The date to check
 * @param {number} months - The number of months to check
 * @returns {boolean} - True if the date is within the next N months
 */
export function isWithinNextMonths(date, months = 6) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(today);
  futureDate.setMonth(today.getMonth() + months);
  
  const eventDate = new Date(date);
  return eventDate >= today && eventDate <= futureDate;
} 