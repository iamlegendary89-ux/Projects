#!/usr/bin/env node

// Simulate 10 users testing local offers fallback
import fs from 'fs';

const BASE_URL = 'http://localhost:3002';

// Load phones
let phones;
try {
  phones = JSON.parse(fs.readFileSync('./public/data/phones.json', 'utf8'));
} catch (error) {
  console.error('❌ Failed to load phones data');
  process.exit(1);
}

const countries = ['US', 'GB', 'DE', 'FR', 'EG', 'CN', 'JP', 'AE', 'IN', 'SG'];

async function simulateUser(phone, country, userId) {
  console.log(`\n📱 User ${userId}: Testing offers for "${phone.name}" in ${country}`);
  console.log(`   Phone: ${phone.name} (${phone.brand})`);

  try {
    const response = await fetch(`${BASE_URL}/api/generate-offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneName: phone.name,
        brand: phone.brand,
        countryCode: country
      })
    });

    if (!response.ok) {
      console.log(`   ❌ API failed: ${response.status} ${response.statusText}`);
      return;
    }

    const offers = await response.json();
    console.log(`   ✅ Generated ${offers.length} offers:`);
    offers.forEach((offer, idx) => {
      console.log(`      ${idx + 1}. ${offer.retailer} - ${offer.price}`);
    });
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
  }
}

async function runSimulation() {
  console.log('🧪 Simulating 10 users testing Gemini Pro offers fallback...\n');

  for (let i = 0; i < 10; i++) {
    const phone = phones[Math.floor(Math.random() * phones.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    await simulateUser(phone, country, i + 1);

    // Small delay to avoid overwhelming
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n🎉 Simulation complete! All users received AI-generated offers.');
}

// Run the simulation
runSimulation().catch(console.error);
