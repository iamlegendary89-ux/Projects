// discover.js - Backend Script to Discover New Phones with AI
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI, googleSearchRetrieval } = require('@google/generative-ai');

// --- Pre-flight check for API Key ---
if (!process.env.API_KEY) {
    console.error('\n❌ ERROR: API_KEY is not set in the environment.');
    console.error('Please create a .env file in the scraper/ directory with your API_KEY, or set it as a repository secret named API_KEY for GitHub Actions.\n');
    process.exit(1);
}

const DATA_FILE = path.join(__dirname, '../public/data/phones.json');

// --- Gemini AI Configuration ---
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

/**
 * Extracts a JSON object from a string, which might be wrapped in markdown.
 * @param {string} text The raw text from the AI model.
 * @returns {string | null} The cleaned JSON string or null.
 */
function cleanJsonString(text) {
    if (!text) return null;
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) {
        return match[1];
    }
    // Handle cases where the JSON is not in a code block but might have surrounding text
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
        return text.substring(jsonStart, jsonEnd + 1);
    }
    return text; // Return text as-is if no clear JSON found, JSON.parse will handle it
}


// --- Main Discovery Logic ---
async function main() {
  console.log('🤖 Starting Phone Discovery Bot...');
  try {
    const allPhones = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    const existingPhoneNames = new Set(allPhones.map(p => p.name.toLowerCase()));

    const discoveryPrompts = [
      "Ground with Google Search for live search capabilities, list the top 10 flagship phones from the last 2 years known for performance and camera quality.",
      "Ground with Google Search for live search capabilities, list the top 10 best-value budget phones released in the last 2 years under $500.",
      "Ground with Google Search for live search capabilities, list the top 10 'camera phones' praised by photography experts in the last 2 years.",
      "Ground with Google Search for live search capabilities, list the top 10 gaming phones with the best performance and battery life from the last 2 years.",
      "Ground with Google Search for live search capabilities, list the 10 most popular mid-range phones from the last 2 years."
    ];

    const allDiscoveredPhones = new Map();
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    for (const prompt of discoveryPrompts) {
        console.log(`   Querying AI with prompt: "${prompt.substring(0, 80)}..."`);
        const fullPrompt = `${prompt}
        Provide the list as a single, valid JSON object.
        The object should have one key, "phones", which is an array of objects.
        Each object in the array must have three keys: "name" (the full model name), "brand", and "releaseDate" (in "YYYY-MM-DD" format).
        Do not include any other text or markdown formatting. Just the raw JSON object.`;

        const result = await model.generateContent({
            contents: [{role: 'user', parts: [{text: fullPrompt}]}],
            tools: [{ google_search: {} }]
        });
        const response = result.response;
        const responseText = response.text();
        
        const cleanedText = cleanJsonString(responseText);
        if (!cleanedText) {
            console.warn(`   ⚠️ AI response for a prompt was empty or could not be cleaned. Skipping.`);
            continue;
        }
        try {
            const parsedResponse = JSON.parse(cleanedText);
            const discoveredPhones = parsedResponse.phones;

            if (discoveredPhones && discoveredPhones.length > 0) {
                for (const phone of discoveredPhones) {
                    if (phone.name && phone.brand && phone.releaseDate) {
                        // Use a map to automatically handle duplicates across different prompts
                        allDiscoveredPhones.set(phone.name.toLowerCase(), phone);
                    }
                }
            }
        } catch (e) {
            console.warn(`   ⚠️ Failed to parse JSON for a prompt. Skipping. Error: ${e.message}`);
        }
    }

    const uniqueDiscoveredPhones = Array.from(allDiscoveredPhones.values());
    // --- New Feature: Sort by release date to prioritize newest phones ---
    uniqueDiscoveredPhones.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

    console.log(`   AI returned a total of ${uniqueDiscoveredPhones.length} unique phones across all prompts.`);
    
    let newPhonesAdded = 0;
    let maxId = allPhones.reduce((max, p) => Math.max(max, p.id), 0);

    for (const discoveredPhone of uniqueDiscoveredPhones) {
        if (!existingPhoneNames.has(discoveredPhone.name.toLowerCase())) {
            maxId++;
            const newPhone = {
                id: maxId,
                name: discoveredPhone.name,
                brand: discoveredPhone.brand,
                releaseDate: discoveredPhone.releaseDate,
                os: discoveredPhone.name.toLowerCase().includes('iphone') ? 'iOS' : 'Android',
                ranking: 0,
                scores: { "price": 50, "performance": 50, "camera": 50, "battery": 50, "design": 50, "software": 50 },
                pros: [],
                cons: [],
                summary: "This is a placeholder summary. An AI script would generate a detailed review here.",
                imageUrl: "", // Will be populated by the enrich script
                purchaseUrl: "#",
                performanceReview: null,
                cameraReview: null,
                batteryReview: null,
                displayReview: null,
                userExperienceReview: null
            };
            allPhones.push(newPhone);
            existingPhoneNames.add(newPhone.name.toLowerCase());
            console.log(`   ➕ Added new phone: ${newPhone.name}`);
            newPhonesAdded++;
        }
    }

    if (newPhonesAdded > 0) {
        // Sort the entire database by release date to maintain chronological order
        allPhones.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
        await fs.writeFile(DATA_FILE, JSON.stringify(allPhones, null, 2));
        console.log(`\n✅ Database updated with ${newPhonesAdded} new phones.`);
    } else {
        console.log('\n   Database is already up to date. No new phones were added.');
    }

  } catch (error) {
    console.error('An error occurred during the discovery process:', error);
    process.exit(1);
  } finally {
    console.log('🏁 Phone Discovery Bot finished.');
  }
}

main();
