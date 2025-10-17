// metrics.js - Helper utilities for median calculations and delta checking
const fs = require('fs').promises;
const path = require('path');

/**
 * Calculates the median of an array of numbers.
 * @param {number[]} arr - Array of numbers
 * @returns {number} The median value, or 0 if array is empty
 */
function median(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Checks if two spec objects have significant differences in core features.
 * @param {object} specs1 - First specs object
 * @param {object} specs2 - Second specs object
 * @returns {boolean} True if core specs differ significantly
 */
function hasSignificantSpecChanges(specs1, specs2) {
  const coreFields = ['cpu', 'ram', 'battery_mAh', 'camera_main_mp'];

  for (const field of coreFields) {
    if (specs1[field] !== specs2[field]) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if price change is significant (> 3%)
 * @param {number} oldPrice - Previous price
 * @param {number} newPrice - Current price
 * @returns {boolean} True if price change > 3%
 */
function hasSignificantPriceChange(oldPrice, newPrice) {
  if (!oldPrice || !newPrice) return false;
  const change = Math.abs((newPrice - oldPrice) / oldPrice);
  return change > 0.03;
}

/**
 * Computes median ratings for each category
 * @param {object} flashData - Flash AI output
 * @returns {object} Object with median scores for each category
 */
function computeMedianRatings(flashData) {
  const medians = {};
  if (flashData.ratings) {
    for (const [category, ratings] of Object.entries(flashData.ratings)) {
      medians[category] = median(ratings);
    }
  }
  return medians;
}

/**
 * Determines update type based on delta check
 * @param {object} cachedFlash - Previous Flash data
 * @param {object} newFlash - Current Flash data
 * @returns {string} 'value' for price-only update, 'full' for full Pro synthesis, 'none' if no changes
 */
function determineUpdateType(cachedFlash, newFlash) {
  if (!cachedFlash || !newFlash) return 'none';

  // Check for significant price change
  if (hasSignificantPriceChange(cachedFlash.priceUSD, newFlash.priceUSD)) {
    return 'value';
  }

  // Check for core spec changes
  if (hasSignificantSpecChanges(cachedFlash.specs, newFlash.specs)) {
    return 'full';
  }

  // Check if enough time has passed (7 days threshold)
  const cacheAge = (Date.now() - (cachedFlash.timestamp || 0)) / (1000 * 60 * 60 * 24);
  if (cacheAge >= 7) {
    return 'full';
  }

  return 'none';
}

module.exports = {
  median,
  hasSignificantSpecChanges,
  hasSignificantPriceChange,
  computeMedianRatings,
  determineUpdateType
};
