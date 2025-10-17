// acquire-data.js - A streamlined script to discover new phones and enrich them with specs in a single pass.
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { specSchema, parsedSpecSchema } = require('./utils/schema');
const { cleanJsonString, normalizePhoneName } = require('./utils/helpers');

// Initialize Gemini for AI-powered spec synthesis
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(CUSTOM_SEARCH_API_KEY);

// --- Configuration ---
const API_KEY = process.env.API_KEY;
const CUSTOM_SEARCH_API_KEY = process.env.CUSTOM_SEARCH_API_KEY;
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;
const DATA_FILE = path.join(__dirname, '../public/data/phones.json');
const CACHE_DIR = path.join(__dirname, 'cache');

// --- Initialization ---
if (!CUSTOM_SEARCH_API_KEY) {
    console.error('CUSTOM_SEARCH_API_KEY is not set.');
    process.exit(1);
}
if (!SEARCH_ENGINE_ID) {
    console.error('SEARCH_ENGINE_ID is not set.');
    process.exit(1);
}
if (!API_KEY) {
    console.error('API_KEY is not set.');
    process.exit(1);
}

// Note: Custom Search functionality remains via Google Custom Search API for phone discovery
// Qwen will be used for spec synthesis (when implemented)
// console.log(`     -> Data acquisition initialized`);

// --- Helper Functions ---
async function getSpecsForPhone(phoneName, existingPhoneData = {}) {
    const { id: phoneId } = existingPhoneData;
    const cacheId = phoneId || phoneName.replace(/\s+/g, '-').toLowerCase();
    const cacheFile = path.join(CACHE_DIR, `${cacheId}-specs.json`);

    // Step 1: Check cache first
    try {
        const cachedData = await fs.readFile(cacheFile, 'utf8');
        const stats = await fs.stat(cacheFile);
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        if (stats.mtime > threeDaysAgo) {
            console.log(`     -> CACHE HIT for ${phoneName}. Using cached data.`);
            return JSON.parse(cachedData);
        }
    } catch (e) {
        // Cache miss or read error, proceed to API call
    }

    console.log(`     -> CACHE MISS. Fetching new specs for: ${phoneName}...`);

    const requiredJsonStructure = JSON.stringify({
        specs: specSchema,
        parsedSpecs: parsedSpecSchema,
        releaseDate: "<string, e.g., '2024-10-13'>",
        specConfidenceScore: "<number, 1-10>"
    }, null, 2);

    const prompt = `
        You are a meticulous data verification and extraction AI. Your task is to find, verify, and parse the key technical specifications for the smartphone "${phoneName}".

        **Research Mandate:**
        1.  **Find Authoritative Sources:** Use your search capabilities to find the official specs. Prioritize the manufacturer's official website and GSMArena.
        2.  **Synthesize Data:** Consolidate the information from at least two reliable sources to ensure accuracy.
        3.  **Extract and Parse:** Populate both the descriptive 'specs' object and the structured 'parsedSpecs' object with the data you find.
        4.  **Rate Confidence:** Based on the quality and consistency of your sources, provide a confidence score.

        Provide the output as a single, valid JSON object with the following exact structure:
        ${requiredJsonStructure}
    `;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }]
    });
    const text = result.response.text();
    const specData = JSON.parse(cleanJsonString(text));

    // Step 3: Save successful API result to cache
    if (specData && specData.specs) {
        await fs.writeFile(cacheFile, JSON.stringify(specData, null, 2));
    }

    return specData;
}

async function getImageUrlFromGoogleSearch(phone) {
    if (!CUSTOM_SEARCH_API_KEY || !SEARCH_ENGINE_ID) {
        console.log('     -> Google Custom Search API credentials not found. Skipping.');
        return null;
    }
    console.log(`     -> Searching for image via Google Custom Search API for: ${phone.name}...`);
    const query = `${phone.name} phone gsmarena front view OR front-back`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${CUSTOM_SEARCH_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&searchType=image&num=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const imageUrl = data.items[0].link;
            // Avoid blacklisted URLs
            if (phone.badImageUrls && phone.badImageUrls.includes(imageUrl)) {
                console.log('     -> Found a blacklisted URL. Ignoring.');
                return null;
            }
            console.log('       ✅ Found high-quality image via API.');
            return imageUrl;
        }
    } catch (error) {
        console.error('       ❌ Google Custom Search API error:', error.message);
    }
    return null;
}

async function getImageUrlFromAI(phone) {
    console.log(`     -> Falling back to AI for image search for: ${phone.name}...`);
    const badUrls = phone.badImageUrls || [];
    let blacklistInstruction = '';
    if (badUrls.length > 0) {
        blacklistInstruction = `
        CRITICAL: The following image URLs have failed in the past and must not be used:
        - ${badUrls.join('\n- ')}
        `;
    }

    const prompt = `Find the official manufacturer image for "${phone.name}". The image should be a front view or front-back view, similar to a GSMArena main image. Provide a direct .jpg/.png URL only, no Google redirect.${blacklistInstruction}`;

    const result = await model.generateContent(prompt);
    // We expect a clean URL, so we do less cleaning.
    return result.response.text().trim();
}

// --- Main Execution ---
async function main() {
    console.log('🛰️ Starting Data Acquisition Bot...');
    await fs.mkdir(CACHE_DIR, { recursive: true });
    try {
        const allPhones = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const existingPhoneNames = allPhones.map(p => normalizePhoneName(p.name));
        let maxId = Math.max(...allPhones.map(p => p.id), 0);

        // === Part 1: Discover New Phones with Strategic Prompts ===
        console.log('   Discovering new phones...');
        
        const discoveryMissions = [
            "Identify 2 recently released flagship 'Camera Oriented' smartphones.",
            "Identify 2 new or upcoming 'Gaming Phone' models generating buzz.",
            "Find 3 popular 'Mid-range' phones released in the last 3-6 months known for good value.",
            "Find 3 'Budget' phones that have been recently released with a focus on large battery capacity.",
            "Identify 2 'Productivity Powerhouse' or 'Foldable' phones that are new to the market."
        ];
        const selectedMission = discoveryMissions[Math.floor(Math.random() * discoveryMissions.length)];
        console.log(`   -> Current Mission: "${selectedMission}"`);

        const discoveryPrompt = `
            You are a market research AI specializing in the smartphone industry.
            Your task is to execute the following request: "${selectedMission}"

            CRITICAL: Only include phones that have been officially released and have confirmed specifications available. Do not include purely rumored devices.

            Here is a list of smartphones already in our database. Do not include any of these models in your response:
            - ${existingPhoneNames.join('\n- ')}

            Use your search capabilities to find relevant devices.
            
            Respond with a single, valid JSON object with the following exact structure:
            {
              "new_phones": [
                "<string, e.g., 'Samsung Galaxy S26 Ultra'>",
                "<string, e.g., 'Google Pixel 11 Pro'>"
              ]
            }
        `;
        const discoveryResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: discoveryPrompt }] }],
            tools: [{ googleSearch: {} }]
        });
        const discoveryData = JSON.parse(cleanJsonString(discoveryResult.response.text()));
        const discoveredNames = discoveryData.new_phones || [];

        if (discoveredNames.length > 0) {
            console.log(`   Discovered ${discoveredNames.length} new phones. Now fetching specs...`);
            for (const phoneName of discoveredNames) {
                const normalizedNewName = normalizePhoneName(phoneName);
                if (existingPhoneNames.includes(normalizedNewName)) {
                    console.log(`     -> Duplicate found for "${phoneName}". Skipping.`);
                    continue;
                }

                try {
                    const specData = await getSpecsForPhone(phoneName);
                    if (specData && specData.specs) {
                        maxId++;
                        const newPhone = {
                            id: maxId,
                            name: phoneName,
                            summary: "This is a placeholder summary. An AI script would generate a detailed review here.",
                            ...specData,
                            lastTokenCostSpecs: new Date().toISOString()
                        };
                        allPhones.push(newPhone);
                        console.log(`       ✅ Successfully added ${phoneName} with specs.`);
                    }
                } catch (error) {
                    console.error(`       ❌ Failed to fetch specs for ${phoneName}. Error: ${error.message}`);
                }
            }
        } else {
            console.log('   No new phones were discovered.');
        }

        // === Part 2: Enrich Existing Placeholders (Self-healing) ===
        const phonesToProcess = allPhones.filter(p => !p.specs || !p.imageUrl);
        if (phonesToProcess.length > 0) {
            console.log(`\n   Found ${phonesToProcess.length} existing phones needing spec/image enrichment.`);
            for (const phone of phonesToProcess) {
                const phoneIndex = allPhones.findIndex(p => p.id === phone.id);
                
                // Enrich specs if missing
                if (!phone.specs) {
                    try {
                        const specData = await getSpecsForPhone(phone.name, phone);
                        if (specData && specData.specs) {
                            allPhones[phoneIndex] = { ...allPhones[phoneIndex], ...specData };
                            console.log(`       ✅ Successfully enriched specs for ${phone.name}.`);
                        }
                    } catch (error) {
                        console.error(`       ❌ Failed to enrich specs for ${phone.name}. Error: ${error.message}`);
                    }
                }

                // Enrich image if missing and specs are present
                if (allPhones[phoneIndex].specs && !allPhones[phoneIndex].imageUrl) {
                     try {
                        // Layer 1: Google Custom Search API
                        let imageUrl = await getImageUrlFromGoogleSearch(allPhones[phoneIndex]);
                        
                        // Layer 2: AI Fallback
                        if (!imageUrl) {
                            imageUrl = await getImageUrlFromAI(allPhones[phoneIndex]);
                        }

                        if (imageUrl) {
                            allPhones[phoneIndex].imageUrl = imageUrl;
                            console.log(`       ✅ Successfully found image for ${phone.name}.`);
                        }
                    } catch (error) {
                        console.error(`       ❌ Failed to find image for ${phone.name}. Error: ${error.message}`);
                    }
                }
            }
        } else {
            console.log('   No existing phones needed spec or image enrichment.');
        }

        // === Part 3: Final Write ===
        console.log('\n   Writing updated phone data to file...');
        await fs.writeFile(DATA_FILE, JSON.stringify(allPhones, null, 2));
        console.log('   ✅ Data acquisition and enrichment complete!');
    } catch (error) {
        console.error('❌ Error in main execution:', error.message);
    }
}

main();
