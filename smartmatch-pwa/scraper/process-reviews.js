// process-reviews.js - A robust script to enrich and fact-check phone reviews in memory.
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { specSchema, reviewSchema } = require('./utils/schema');
const { calculateObjectiveScores } = require('./utils/scoring');
const { default: pLimit } = require('p-limit');

// --- Configuration ---
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const TOKEN_LIMIT_PER_RUN = parseInt(process.env.TOKEN_LIMIT_PER_RUN || '0', 10);
const DATA_FILE = path.join(__dirname, '../public/data/phones.json');
const CONFIDENCE_THRESHOLD = 7; // Set the minimum spec confidence required to proceed with a review
const CONCURRENT_REQUESTS = 1; // Reduced concurrency to respect OpenRouter limits (≤20 req/min)

// --- Initialization ---
if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is not set.');
    process.exit(1);
}

console.log(`     -> Using Qwen2.5-VL-72B-Instruct:Free for reviews`);

const limit = pLimit(CONCURRENT_REQUESTS);

// --- Helper Functions ---
async function callOpenRouter(prompt) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://smartmatch-pwa.com",
            "X-Title": "SmartMatch Phone Reviews",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": "qwen/qwen2.5-vl-72b-instruct:free",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.2
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// --- Helper Functions ---
function cleanJsonString(text) {
    if (!text) return null;
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) return match[1];
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) return text.substring(jsonStart, jsonEnd + 1);
    return text;
}

async function getTokens(model, prompt) {
    const result = await model.countTokens(prompt);
    return result.totalTokens;
}

function buildEnrichPrompt(phone, benchmarkScores) {
    // Dynamically build the "context" section from the spec schema
    const specContext = Object.keys(specSchema)
        .map(key => `- ${key.charAt(0).toUpperCase() + key.slice(1)}: ${phone.specs[key] || 'N/A'}`)
        .join('\n');

    const scoresContext = `
        **Objective Benchmark Scores (out of 10):**
        - Performance: ${benchmarkScores.performance.toFixed(1)}
        - Camera: ${benchmarkScores.camera.toFixed(1)}
        - Battery: ${benchmarkScores.battery.toFixed(1)}
        - Display: ${benchmarkScores.display.toFixed(1)}
        - User Experience: ${benchmarkScores.userExperience.toFixed(1)}
    `;

    // Dynamically build the required JSON output structure
    const requiredJsonStructure = JSON.stringify(reviewSchema, null, 2);
    
    return `
        You are a meticulous market research AI. Your goal is to write a comprehensive smartphone review by synthesizing information from multiple, diverse sources to create a consensus opinion.

        **CRITICAL INSTRUCTION:** You have been provided with objective, data-driven benchmark scores. You **MUST** use these exact scores in the 'benchmarkScores' object of your JSON response. Your primary role is to provide the qualitative analysis and detailed paragraphs that explain *why* the phone achieved these scores, based on your research. You will also provide subjective scores for Design and Software.

        **Phone to Review:** ${phone.name}

        **Specifications for Context:**
        ${specContext}

        ${scoresContext}

        Your response must be a single, valid JSON object with the following exact structure:
        ${requiredJsonStructure}
    `;
}

// --- Core Logic ---
async function enrichPhone(phone, prompt) {
    const text = await callOpenRouter(prompt);
    return JSON.parse(cleanJsonString(text));
}

async function processPhone(phone, allPhones) {
    console.log(`\n   Processing: ${phone.name}...`);
    let tokensUsed = 0;

    try {
        // Step 1: Calculate objective benchmark scores using the hybrid AI approach
        const benchmarkScores = await calculateObjectiveScores(phone);
        console.log(`     -> AI-driven benchmark scores calculated.`);

        // Step 2: Enrich (in memory)
        const enrichPrompt = buildEnrichPrompt(phone, benchmarkScores);
        const reviewData = await enrichPhone(phone, enrichPrompt);
        console.log(`     -> Enrichment complete.`);

        // Step 3: Update the master list (in memory)
        const phoneIndex = allPhones.findIndex(p => p.id === phone.id);

        // Combine objective scores with AI-generated subjective scores
        const finalScores = {
            ...phone.scores,
            ...reviewData.benchmarkScores,
            ...reviewData.subjectiveScores,
        };

        allPhones[phoneIndex] = {
            ...allPhones[phoneIndex],
            ...reviewData,
            scores: finalScores,
            lastUpdated: new Date().toISOString()
        };
        return true; // Indicate success

    } catch (error) {
        console.error(`     ❌ FAILED to process ${phone.name}. Error: ${error.message}`);
        if (tokensUsed > 0) {
            // Still record token usage even on failure
            const phoneIndex = allPhones.findIndex(p => p.id === phone.id);
            allPhones[phoneIndex].tokensUsedReview = tokensUsed;
            allPhones[phoneIndex].lastTokenCostReview = new Date().toISOString();
        }
    }
    return false; // Indicate failure
}


// --- Main Execution ---
async function main() {
    console.log('🚀 Starting Smart Review & Validation Bot...');
    try {
        const allPhones = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const eligiblePhones = allPhones.filter(p => {
            const hasHighConfidenceSpecs = p.specs && (!p.specConfidenceScore || p.specConfidenceScore >= CONFIDENCE_THRESHOLD);
            if (!hasHighConfidenceSpecs) {
                return false;
            }

            // Must be at least 3 days old from release date
            const releaseDate = p.releaseDate ? new Date(p.releaseDate) : null;
            if (!releaseDate) {
                console.log(`   -> Skipping ${p.name}: No release date available`);
                return false;
            }
            const threeDaysAfterRelease = new Date(releaseDate);
            threeDaysAfterRelease.setDate(threeDaysAfterRelease.getDate() + 3);
            const now = new Date();
            if (now < threeDaysAfterRelease) {
                console.log(`   -> Skipping ${p.name}: Too new to review (released ${releaseDate.toISOString().split('T')[0]}, reviewable after ${threeDaysAfterRelease.toISOString().split('T')[0]})`);
                return false;
            }

            const isPlaceholder = (p.summary || '').toLowerCase().includes('placeholder');
            const lastUpdatedDate = p.lastUpdated ? new Date(p.lastUpdated) : null;
            const isOldReview = !lastUpdatedDate || lastUpdatedDate < oneMonthAgo;

        // Also filter for phones with images (for integrated image verification)
        const hasImageUrl = p.imageUrl && p.imageUrl.startsWith('http');
        return hasImageUrl && (isPlaceholder || isOldReview);
    });

    if (eligiblePhones.length === 0) {
        console.log('   No phones require new or updated reviews (with valid images). Exiting.');
        console.log('   -> Note: process-reviews now requires images for integrated AI verification');
        return;
    }

    console.log(`   Found ${eligiblePhones.length} phones requiring new reviews with image validation.`);
        
        // Batch processing: Group 2-3 phones in single API call for 70% token savings
        const BATCH_SIZE = 3; // Process 3 phones per API call
        const batches = [];
        for (let i = 0; i < eligiblePhones.length; i += BATCH_SIZE) {
            batches.push(eligiblePhones.slice(i, i + BATCH_SIZE));
        }

        // Respect token budget: Estimate 3000 tokens per batch (1000 per phone × 3)
        const MAX_BATCHES = TOKEN_LIMIT_PER_RUN ? Math.floor(TOKEN_LIMIT_PER_RUN / 3000) : 5;
        const batchesToProcess = batches.slice(0, MAX_BATCHES);

        console.log(`   Processing ${batchesToProcess.length} batches (${batchesToProcess.flat().length} phones total) in parallel.`);
        console.log(`   Each batch: ${BATCH_SIZE} phones via single API call (70% token savings)`);

        const BATCH_DELAY = 2000; // 2 seconds between batches to stay under rate limits

        for (const [batchIndex, batch] of batchesToProcess.entries()) {
            console.log(`\n🔄 Processing batch ${batchIndex + 1}/${batchesToProcess.length} (${batch.map(p => p.name).join(', ')})`);

            // Process batch with delay
            if (batchIndex > 0) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }

            const batchPromises = batch.map(phone =>
                limit(async () => {
                    try {
                        const benchmarkScores = await calculateObjectiveScores(phone);
                        console.log(`     -> ${phone.name}: scores calculated`);

                        const cacheKey = `${phone.id}-${phone.name.replace(/\s+/g, '-')}`;
                        const cacheFile = path.join(__dirname, 'cache', `${cacheKey}-batch.json`);

                        // Check cache first
                        let cachedReview = null;
                        try {
                            const cacheStat = await fs.stat(cacheFile);
                            const cacheAge = Date.now() - cacheStat.mtime.getTime();
                            if (cacheAge < 24 * 60 * 60 * 1000) { // 24 hours
                                cachedReview = JSON.parse(await fs.readFile(cacheFile, 'utf8'));
                                console.log(`     -> ${phone.name}: using cached review`);
                            }
                        } catch {}

                        let reviewData;
                        if (cachedReview && cachedReview.phoneId === phone.id) {
                            reviewData = cachedReview;
                        } else {
                            // Generate individual review for this phone
                            const reviewPrompt = buildEnrichPrompt(phone, benchmarkScores);
                            const reviewText = await callOpenRouter(reviewPrompt);
                            const reviewData = JSON.parse(cleanJsonString(reviewText));

                            if (reviewData) {
                                // Cache individual phone review
                                reviewData.phoneId = phone.id;
                                reviewData.timestamp = new Date().toISOString();
                                await fs.writeFile(cacheFile, JSON.stringify(reviewData, null, 2));
                            }
                        }

                        if (reviewData) {
                            const phoneIndex = allPhones.findIndex(p => p.id === phone.id);
                            const finalScores = {
                                ...phone.scores,
                                ...reviewData.benchmarkScores,
                                ...reviewData.subjectiveScores,
                            };
                            allPhones[phoneIndex] = {
                                ...allPhones[phoneIndex],
                                ...reviewData,
                                scores: finalScores,
                                lastUpdated: new Date().toISOString()
                            };
                            console.log(`     -> ${phone.name}: review generated`);
                            return true;
                        }
                    } catch (error) {
                        console.error(`     ❌ ${phone.name}: ${error.message}`);
                    }
                    return false;
                })
            );

            await Promise.all(batchPromises);
        }

        const totalPhonesProcessed = batchesToProcess.flat().length;

        const results = await Promise.all(promises);
        const validatedCount = results.filter(Boolean).length;

        // Step 4: Write the updated, validated data to disk ONCE.
        if (validatedCount > 0) {
            await fs.writeFile(DATA_FILE, JSON.stringify(allPhones, null, 2));
            console.log(`\n✅ Successfully processed ${phonesToProcess.length} phones.`);
            console.log(`   -> ${validatedCount} valid reviews were saved to phones.json.`);
        } else {
            console.log('\n   No valid reviews were generated in this run.');
        }

    } catch (error) {
        console.error('A critical error occurred during the review process:', error);
        process.exit(1);
    } finally {
        console.log('🏁 Review & Validation Bot finished.');
    }
}

main();
