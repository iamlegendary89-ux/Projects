const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../public/data/phones.json');

async function validate() {
  console.log('🔬 Starting JSON validation...');
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const phones = JSON.parse(data);

    if (!Array.isArray(phones)) {
      throw new Error('JSON is not an array.');
    }

    for (const phone of phones) {
      // If the phone still has a placeholder summary, it hasn't been enriched yet.
      // We only perform basic validation on these entries.
      if (phone.summary && phone.summary.toLowerCase().includes('placeholder summary')) {
        if (typeof phone.id !== 'number') throw new Error(`Invalid id for placeholder phone: ${phone.name || 'N/A'}`);
        if (typeof phone.name !== 'string' || phone.name.trim() === '') throw new Error(`Invalid name for placeholder phone with id: ${phone.id}`);
        continue; // Skip strict validation for this entry
      }

      // --- Strict Validation for Enriched Phones ---
      if (typeof phone.id !== 'number') throw new Error(`Invalid id for phone: ${phone.name}`);
      if (typeof phone.name !== 'string' || phone.name.trim() === '') throw new Error(`Invalid name for phone with id: ${phone.id}`);
      if (typeof phone.brand !== 'string' || phone.brand.trim() === '') throw new Error(`Invalid brand for phone: ${phone.name}`);
      if (typeof phone.releaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(phone.releaseDate)) throw new Error(`Invalid releaseDate for phone: ${phone.name}`);
      if (phone.os !== 'iOS' && phone.os !== 'Android') throw new Error(`Invalid OS for phone: ${phone.name}`);
      if (typeof phone.ranking !== 'number' || phone.ranking < 0 || phone.ranking > 10) throw new Error(`Invalid ranking for phone: ${phone.name}`);
      if (typeof phone.summary !== 'string' || phone.summary.trim() === '') throw new Error(`Invalid summary for phone: ${phone.name}`);
      if (typeof phone.imageUrl !== 'string' || phone.imageUrl.trim() === '') throw new Error(`Invalid imageUrl for phone: ${phone.name}`);
    }

    console.log('✅ JSON validation successful. All phone entries are valid.');
  } catch (error) {
    console.error('❌ JSON validation failed:', error.message);
    process.exit(1);
  }
}

validate();
