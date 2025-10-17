#!/usr/bin/env node
// smartmatch-pipeline.js - Minimal cost-free SmartMatch data pipeline
// Node.js 18+ with fetch, dotenv, minimal dependencies

require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');

// Configuration
const GOOGLE_API_KEY = process.env.CUSTOM_SEARCH_API_KEY; // Google Custom Search API key
const GOOGLE_SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID; // Google Custom Search Engine ID
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // OpenRouter API key
const PHONES_FILE = path.join(__dirname, '../public/data/phones.json');

// Rate limiting - OpenRouter free tier: ≤20 req/min, ≤50 req/day
const REQUEST_DELAY_MS = 3000; // 3 seconds between requests
const MAX_REQUESTS_PER_RUN = 3; // Conservative limit (reduced from 5 for safety)

// Validate required environment variables
if (!GOOGLE_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    console.error('❌ ERROR: Missing Google Custom Search API credentials');
    console.error('   Set CUSTOM_SEARCH_API_KEY and SEARCH_ENGINE_ID in .env file');
    console.error('   Visit: https://console.cloud.google.com/apis/credentials');
    process.exit(1);
}

if (!OPENROUTER_API_KEY) {
    console.error('❌ ERROR: Missing OpenRouter API key');
    console.error('   Set OPENROUTER_API_KEY in .env file');
    console.error('   Visit: https://openrouter.ai/keys');
    process.exit(1);
}

// Log configuration status
console.log(`✅ Configuration loaded:`);
console.log(`   📍 Output file: ${path.relative(process.cwd(), PHONES_FILE)}`);
console.log(`   ⚡ Rate limiting: ${REQUEST_DELAY_MS / 1000}s delay, ≤${MAX_REQUESTS_PER_RUN} phones`);
console.log('');

// ===== UTILITY FUNCTIONS =====

/**
 * Sleep/delay function for rate limiting
 * @param {number} ms - Milliseconds to wait
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean JSON string that might be wrapped in markdown
 * @param {string} text - Raw API response text
 * @returns {string|null} Clean JSON string or null
 */
function cleanJsonString(text) {
    if (!text) return null;
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) return match[1];
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) return text.substring(jsonStart, jsonEnd + 1);
    const arrayStart = text.indexOf('[');
    const arrayEnd = text.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1) return text.substring(arrayStart, arrayEnd + 1);
    return text;
}

/**
 * Google Custom Search API discovery Query
 * @param {string} query - Search query for phones
 * @param {number} numResults - Number of results to fetch (max 10)
 * @returns {Promise<Array>} Array of discovery objects
 */
async function discoverPhones(query = 'samsung galaxy s25 OR iphone 17 OR google pixel 10 OR xiaomi 15 flagship smartphone', numResults = 5) {
    console.log(`🔍 Discovering phones with query: "${query}"`);

    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${Math.min(numResults, 5)}`;

    // Note: In production, don't log the full URL with API key
    console.log(`   API URL: ${url.substring(0, 120)}...`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Google Search API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            console.log('   No phones discovered');
            return [];
        }

    // Extract smartphone reviews from trusted sites
    const discoveries = data.items
        .filter(item => {
            const title = item.title.toLowerCase();
            const url = item.link.toLowerCase();

                // Check if URL belongs to our trusted sites
                const trustedSites = [
                    'phonearena.com', 'theverge.com', 'techradar.com',
                    'tomsguide.com', 'trustedreviews.com', 'dxomark.com',
                    'rtings.com', 'consumerreports.org'
                ];

                const isFromTrustedSite = trustedSites.some(site => url.includes(site));

                // Check if it's actually about a smartphone
                const smartphoneKeywords = ['phone', 'android', 'ios', 'smartphone', 'galaxy', 'iphone', 'pixel', 'xiaomi'];
                const hasPhoneKeywords = smartphoneKeywords.some(keyword =>
                    title.includes(keyword) || item.snippet.toLowerCase().includes(keyword)
                );

                return isFromTrustedSite && hasPhoneKeywords;
            })
            .slice(0, 3) // Take max 3 phones
            .map(item => {
                // Extract phone name more intelligently from various site formats
                let phoneName = item.title.split(' review')[0].trim(); // Remove "review" suffix
                phoneName = phoneName.split(' vs ')[0].trim(); // Take first comparison
                phoneName = phoneName.split(' - ')[0].trim(); // Remove site suffix

                // Clean up common prefixes/suffixes
                phoneName = phoneName.replace(/^(new |best |review:?\s*)/i, '');
                phoneName = phoneName.replace(/(\s+review|\s+specs?|[\|:]\s*$)/i, '');

                // Try to extract specific manufacturers
                const brands = ['Samsung Galaxy', 'iPhone', 'Google Pixel', 'Xiaomi', 'OnePlus', 'Sony Xperia', 'Huawei'];
                for (const brand of brands) {
                    if (phoneName.includes(brand.toLowerCase()) || item.snippet.toLowerCase().includes(brand.toLowerCase())) {
                        // Extract model name after brand
                        const modelMatch = phoneName.match(new RegExp(brand + '\\s+[\\w\\d\\s-]+', 'i'));
                        if (modelMatch) {
                            phoneName = modelMatch[0].trim();
                            break;
                        }
                    }
                }

                return {
                    phone_name: phoneName || item.title.split(' ')[0] + ' Phone', // Fallback
                    title: item.title,
                    snippet: item.snippet,
                    url: item.link,
                    discovered_at: new Date().toISOString()
                };
            });

        if (discoveries.length === 0) {
            console.log('   No valid smartphone pages found in results');
            return [];
        }

        console.log(`   ✅ Discovered ${discoveries.length} phones`);
        discoveries.forEach(item => console.log(`      - ${item.phone_name}`));

        return discoveries;

    } catch (error) {
        console.error(`   ❌ Discovery failed:`, error.message);
        return [];
    }
}

/**
 * Send grounded search results to Qwen 2.5 VL 72B for analysis and scoring
 * @param {Array} discoveries - Array of discovered phones with grounding data
 * @returns {Promise<Array>} Array of analyzed phones with reviews and scores
 */
async function analyzePhones(discoveries) {
    console.log(`🤖 Analyzing ${discoveries.length} phones with Qwen AI`);

    if (discoveries.length === 0) {
        return [];
    }

    const analyzedPhones = [];
    const maxToProcess = Math.min(discoveries.length, MAX_REQUESTS_PER_RUN);

    for (let i = 0; i < maxToProcess; i++) {
        const discovery = discoveries[i];
        console.log(`\n   🔄 Analyzing ${i + 1}/${maxToProcess}: ${discovery.phone_name}`);

        try {
            // Prepare the grounded data for Qwen analysis
            const systemMessage = 'You are SmartMatch, a neutral smartphone analysis assistant. You extract only factual data and return clean, valid JSON.';

            const userMessage = `Analyze the grounded search results for this smartphone.

Write a factual summary (≤ 3 sentences) and rate it realistically vs 2025 flagship standards using numerical benchmarks:
- Performance: CPU score (0-10) based on typical flagship performance
- Camera: Megapixel/depth (0-10) based on 2025 camera tech
- Battery: Capacity/efficiency (0-10) based on endurance hours
- Display: Resolution/brightness (0-10) based on OLED quality
- Software: Ecosystem/updates (0-10) based on Android/iOS quality
- Value: Features vs price (0-10) based on market positioning

Use the URL content to estimate realistic scores. Return one JSON object:

{
  "phone_name": "",
  "summary": "",
  "scores": {
    "performance": 0,
    "camera": 0,
    "battery": 7,
    "display": 9,
    "software": 8,
    "value": 6
  },
  "overall_score": 7.3
}

Grounded Data:
Phone: ${discovery.phone_name}
Title: ${discovery.title}
Snippet: ${discovery.snippet}
URL: ${discovery.url}`;

            // OpenRouter API call to Qwen 2.5 VL 72B
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://smartmatch-pwa.com",
                    "X-Title": "SmartMatch Minimal Pipeline",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "qwen/qwen2.5-vl-72b-instruct:free",
                    "messages": [
                        {
                            "role": "system",
                            "content": systemMessage
                        },
                        {
                            "role": "user",
                            "content": userMessage
                        }
                    ],
                    "temperature": 0.2 // Deterministic scoring
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const rawText = data.choices[0].message.content;
            const cleanJson = cleanJsonString(rawText);

            if (!cleanJson) {
                throw new Error('Failed to extract JSON from Qwen response');
            }

            // Handle both array and single object responses
            let analysisArray;
            try {
                const parsed = JSON.parse(cleanJson);
                if (Array.isArray(parsed)) {
                    analysisArray = parsed;
                } else {
                    // Single object response - convert to array
                    analysisArray = [parsed];
                }
            } catch (parseError) {
                console.log(`   🔍 Raw response: ${rawText.substring(0, 200)}...`);
                throw new Error(`JSON parse error: ${parseError.message}`);
            }

            if (!analysisArray || analysisArray.length === 0) {
                throw new Error('No valid phone analysis data received');
            }

            // Merge analysis with original discovery data
            const analyzedPhone = {
                ...discovery,
                ...analysisArray[0], // Qwen returns array with one object
                analyzed_at: new Date().toISOString()
            };

            analyzedPhones.push(analyzedPhone);
            console.log(`   ✅ Analysis complete - Overall Score: ${analyzedPhone.overall_score}/10`);

            // Rate limiting delay - OpenRouter free tier compliance
            if (i < maxToProcess - 1) {
                console.log(`   ⏳ Waiting ${REQUEST_DELAY_MS}ms for rate limiting...`);
                await delay(REQUEST_DELAY_MS);
            }

        } catch (error) {
            console.error(`     ❌ Analysis failed for ${discovery.phone_name}:`, error.message);
            // Continue to next phone instead of failing completely
        }
    }

    return analyzedPhones;
}

/**
 * Save results to persistent storage
 * @param {Array} phones - Array of analyzed phones to save
 */
async function savePhones(phones) {
    console.log(`💾 Saving ${phones.length} phones to ${path.relative(process.cwd(), PHONES_FILE)}`);

    try {
        await fs.mkdir(path.dirname(PHONES_FILE), { recursive: true });
        await fs.writeFile(PHONES_FILE, JSON.stringify(phones, null, 2));
        console.log('   ✅ Data saved successfully');
    } catch (error) {
        console.error('   ❌ Save failed:', error.message);
        throw error;
    }
}

/**
 * Load existing phones data if available
 * @returns {Promise<Array>} Array of existing phones or empty array
 */
async function loadExistingPhones() {
    try {
        const data = await fs.readFile(PHONES_FILE, 'utf8');
        const phones = JSON.parse(data);
        console.log(`📖 Loaded ${phones.length} existing phones from cache`);
        return phones;
    } catch (error) {
        console.log('📝 No existing phone data found (starting fresh)');
        return [];
    }
}

// ===== MAIN EXECUTION =====

async function main() {
    console.log('🚀 Starting SmartMatch Minimal Pipeline\n');

    try {
        // Step 1: Discover latest phones via Google Custom Search
        const discoveries = await discoverPhones();

        if (discoveries.length === 0) {
            console.log('🏁 Pipeline finished - no phones discovered');
            return;
        }

        // Step 2: Analyze each phone with Qwen AI
        const analyzedPhones = await analyzePhones(discoveries);

        // Step 3: Save complete results
        await savePhones(analyzedPhones);

        console.log(`\n🏆 Pipeline Complete!`);
        console.log(`   📊 Processed ${analyzedPhones.length} phones successfully`);
        console.log(`   🏆 Top scorer: ${analyzedPhones[0]?.phone_name || 'N/A'} (${analyzedPhones[0]?.overall_score || 'N/A'}/10)`);
        console.log(`   📁 Data saved to: ${PHONES_FILE}`);

    } catch (error) {
        console.error('\n❌ Pipeline failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { discoverPhones, analyzePhones, savePhones };
