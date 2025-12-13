// deduplicate.js - A script to find and remove duplicate phone entries.
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../public/data/phones.json');

async function main() {
  console.log('🔍 Starting Deduplication Bot...');
  try {
    const allPhones = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    const phoneMap = new Map();
    const duplicates = [];

    // Iterate through phones to find the best entry for each name
    for (const phone of allPhones) {
      const nameKey = phone.name.toLowerCase();
      if (!phoneMap.has(nameKey)) {
        phoneMap.set(nameKey, phone);
      } else {
        const existingPhone = phoneMap.get(nameKey);
        // Keep the entry that has been reviewed (non-placeholder summary)
        if (existingPhone.summary.toLowerCase().includes('placeholder') && !phone.summary.toLowerCase().includes('placeholder')) {
          phoneMap.set(nameKey, phone);
          duplicates.push(existingPhone);
        } else {
          duplicates.push(phone);
        }
      }
    }

    if (duplicates.length > 0) {
      console.log(`   Found and removed ${duplicates.length} duplicate entries:`);
      duplicates.forEach(d => console.log(`     - Removed duplicate "${d.name}" (ID: ${d.id})`));
      
      const deduplicatedPhones = Array.from(phoneMap.values());
      deduplicatedPhones.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
      
      await fs.writeFile(DATA_FILE, JSON.stringify(deduplicatedPhones, null, 2));
      console.log('\n✅ Database deduplicated successfully.');
    } else {
      console.log('\n✅ No duplicate entries found.');
    }
  } catch (error) {
    console.error('An error occurred during the deduplication process:', error);
    process.exit(1);
  } finally {
    console.log('🏁 Deduplication Bot finished.');
  }
}

main();