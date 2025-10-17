const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../public/data/phones.json');

console.log('🔬 Starting JSON validation...');

// Helper functions
function isValidImageUrl(url) {
  if (!url || url === "#") return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' &&
           (url.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)) &&
           !url.includes('google') &&
           !url.includes('data:image');
  } catch {
    return false;
  }
}

function isValidPurchaseUrl(url) {
  if (!url) return true; // Optional
  try {
    const urlObj = new URL(url);
    return urlObj.protocol.startsWith('http');
  } catch {
    return false;
  }
}

/**
 * Checks if an image URL is considered low quality (e.g., a placeholder).
 * @param {string} url The image URL to check.
 * @returns {boolean} True if the image is low quality.
 */
function isLowQualityImage(url) {
  if (!url || url === "#") {
    return true;
  }

  // Prevent embeds and Google images
  if (!url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
      url.includes('google') ||
      url.includes('data:image')) {
    return true;
  }

  // Add other known placeholder domains
  const placeholderDomains = ['picsum.photos'];
  try {
    const domain = new URL(url).hostname;
    return placeholderDomains.some(placeholder => domain.includes(placeholder));
  } catch (e) {
    // Invalid URL is also considered low quality
    return true;
  }
}

function isValidPrice(price) {
  return typeof price === 'number' && price > 0 && price < 20000;
}

// Load and validate phones data
const phonesData = JSON.parse(fs.readFileSync('../public/data/phones.json', 'utf8'));

let errors = [];

for (const phone of phonesData) {
  // Check if phone is already enriched (has been processed by AI)
  const isEnriched = phone.summary &&
                     !phone.summary.toLowerCase().includes('placeholder summary') &&
                     phone.regionalPrices?.USD?.price > 0 &&
                     phone.pros && phone.cons &&
                     phone.confidenceScore > 0;

  if (!phone.id || (typeof phone.id !== 'string' && typeof phone.id !== 'number')) {
    errors.push(`Missing or invalid ID for phone: ${phone.name || 'Unknown'}`);
  }

  if (!phone.name || typeof phone.name !== 'string') {
    errors.push(`Missing or invalid name for phone: ${phone.id || 'Unknown'}`);
  }

  // Only validate enriched phones for strict criteria
  if (isEnriched) {
    if (!isValidImageUrl(phone.imageUrl)) {
      errors.push(`Invalid imageUrl for phone: ${phone.name || phone.id}`);
      console.log(`   → Invalid imageUrl: "${phone.imageUrl}"`);
    }

    if (phone.regionalPrices?.USD?.price && !isValidPrice(phone.regionalPrices.USD.price)) {
      errors.push(`Invalid USD price for phone: ${phone.name || phone.id}`);
    }

    if (phone.purchaseUrl && !isValidPurchaseUrl(phone.purchaseUrl)) {
      errors.push(`Invalid purchaseUrl for phone: ${phone.name || phone.id}`);
    }

    // Score validation
    if (phone.scores) {
      for (const [key, score] of Object.entries(phone.scores)) {
        if (typeof score !== 'number' || score < 0 || score > 100) {
          errors.push(`Invalid score (${key}: ${score}) for phone: ${phone.name || phone.id}`);
        }
      }
    }

    // Confidence score validation
    if (phone.reviewConfidenceScore !== undefined && (phone.reviewConfidenceScore < 1 || phone.reviewConfidenceScore > 10)) {
      errors.push(`Invalid confidence score for phone: ${phone.name || phone.id}`);
    }
  } else if (isLowQualityImage(phone.imageUrl)) {
    // Basic validation - unenriched phones should at least have valid placeholders
    console.log(`   → Unenriched phone ${phone.name || phone.id} has poor image quality, will be reprocessed`);
  }
}

if (errors.length > 0) {
  console.log('\n❌ JSON validation failed with', errors.length, 'error(s):');
  errors.forEach(error => console.log('  -', error));
  console.log('\n🔧 Fix the errors above and run validation again.');
  process.exit(1);
}

console.log('✅ JSON validation passed! No errors found.');
console.log(`   Validated ${phonesData.length} phones.`);
