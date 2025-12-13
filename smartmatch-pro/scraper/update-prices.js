// update-prices.js - A lightweight script to update phone prices daily.
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI, googleSearchRetrieval } = require('@google/generative-ai');
const { default: pLimit } = require('p-limit');
console.log('googleSearchRetrieval:', googleSearchRetrieval);

if (!process.env.API_KEY) {
    console.error('API_KEY is not set.');
    process.exit(1);
}

const DATA_FILE = path.join(__dirname, '../public/data/phones.json');
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

function cleanJsonString(text) {
    if (!text) return null;
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) return match[1];
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) return text.substring(jsonStart, jsonEnd + 1);
    return text;
}

async function main() {
    console.log('🤖 Starting Daily Price Update Bot...');
    try {
        const allPhones = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const reviewedPhones = allPhones.filter(p => !(p.summary && p.summary.toLowerCase().includes('placeholder summary')));
        
        if (reviewedPhones.length === 0) { 
            console.log('   No reviewed phones to update prices for. Exiting.');
            return;
        }

        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const phonesToUpdate = reviewedPhones.filter(p => {
            // If priceLastChecked doesn't exist or is older than a day, it needs an update.
            return !p.priceLastChecked || new Date(p.priceLastChecked) < oneDayAgo;
        });

        if (phonesToUpdate.length === 0) {
            console.log('   All phone prices are up to date. Exiting.');
            return;
        }

        console.log(`   Found ${phonesToUpdate.length} phones due for a price update.`);
        let pricesUpdated = 0;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        // Function to process one phone
        async function processPhonePrice(phone) {
            try {
                const prompt = `For "${phone.name}", extract USD numeric only: {price: 0}.`;

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    tools: [{ google_search: {} }]
                });
                const response = result.response;
                const text = response.text();

                // Parse price with regex from the response text
                const priceMatch = text.match(/\$?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/);
                let price = null;
                if (priceMatch) {
                    price = parseFloat(priceMatch[0].replace(/,/g, ''));
                    console.log(`Tool triggered for ${phone.name}, real price queried: \$${price}`);
                }

                return { phone, price };
            } catch (error) {
                console.error(`🎯 Tool trigger failed for ${phone.name}: ${error.message}`);
                return { phone, price: null };
            }
        }

        const limit = pLimit(2);
        console.log(`Processing ${phonesToUpdate.length} phones concurrently (max 2 at a time).`);

        const results = await Promise.all(phonesToUpdate.map(phone => limit(() => processPhonePrice(phone))));

        for (const res of results) {
            const { phone, price } = res;

            if (price) {
                const phoneIndex = allPhones.findIndex(p => p.id === phone.id);
                allPhones[phoneIndex].regionalPrices = {
                    USD: { price, originalPrice: null, purchaseUrl: "#", details: "Parsed from AI response" },
                    EUR: null,
                    GBP: null,
                    INR: null
                };
                allPhones[phoneIndex].purchaseUrl = "#";
                allPhones[phoneIndex].priceLastChecked = new Date().toISOString();
                pricesUpdated++;
                console.log(`✅ Updated ${phone.name} price to $${price}`);
            } else {
                console.warn(`⚠️ Could not find a valid price for ${phone.name}.`);
            }
        }

        if (pricesUpdated > 0) {
            await fs.writeFile(DATA_FILE, JSON.stringify(allPhones, null, 2));
            console.log(`\n✅ Successfully updated prices for ${pricesUpdated} phones.`);
        } else {
            console.log('\n   No prices were updated in this run.');
        }

    } catch (error) {
        console.error('An error occurred during the price update process:', error);
        process.exit(1);
    } finally {
        console.log('🏁 Daily Price Update Bot finished.');
    }
}

main();
