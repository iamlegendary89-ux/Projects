// verify-links.js - A script to check for broken image and purchase URLs.
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../public/data/phones.json');
const TIMEOUT = 10000; // 10 seconds timeout for requests

/**
 * Checks if a URL is alive and returns a 2xx status code.
 * @param {string} url The URL to check.
 * @returns {Promise<boolean>} True if the URL is valid, false otherwise.
 */
async function isUrlAlive(url) {
  if (!url || !url.startsWith('http')) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    
    clearTimeout(timeoutId);
    return response.ok; // Status code is in the 200-299 range
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`   ⚠️  Timeout checking URL: ${url}`);
    } else {
      console.warn(`   ⚠️  Error checking URL: ${url} (${error.message})`);
    }
    return false;
  }
}

async function main() {
  console.log('🔗 Starting Link Verification Bot...');
  try {
    const allPhones = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    let hasChanges = false;

    for (const phone of allPhones) {
      // Skip placeholder phones
      if (phone.summary && phone.summary.toLowerCase().includes("placeholder summary")) {
        continue;
      }

      // 1. Verify Image URL
      const isImageAlive = await isUrlAlive(phone.imageUrl);
      if (!isImageAlive) {
        console.log(`   ❌ Broken image URL found for "${phone.name}". Flagging for re-enrichment.`);
        phone.imageUrl = ""; // Invalidate the URL
        hasChanges = true;
      }

      // 2. Verify Purchase URLs
      if (phone.regionalPrices) {
        for (const region in phone.regionalPrices) {
          const priceInfo = phone.regionalPrices[region];
          if (priceInfo && priceInfo.purchaseUrl) {
            const isPurchaseLinkAlive = await isUrlAlive(priceInfo.purchaseUrl);
            if (!isPurchaseLinkAlive) {
              console.log(`   ❌ Broken ${region} purchase URL for "${phone.name}". Flagging for price update.`);
              phone.regionalPrices[region] = null; // Invalidate the price entry
              phone.priceLastChecked = null; // Invalidate the timestamp to trigger re-fetch
              hasChanges = true;
            }
          }
        }
      }
    }

    if (hasChanges) {
      await fs.writeFile(DATA_FILE, JSON.stringify(allPhones, null, 2));
      console.log('\n✅ Database updated with invalidated links.');
    } else {
      console.log('\n✅ All links verified and working.');
    }
  } catch (error) {
    console.error('An error occurred during the link verification process:', error);
    process.exit(1);
  } finally {
    console.log('🏁 Link Verification Bot finished.');
  }
}

main();