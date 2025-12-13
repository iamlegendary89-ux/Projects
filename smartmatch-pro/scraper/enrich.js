// enrich.js - Backend Script to Enrich Phone Data with AI Analysis
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
// Use the official, correct package name
const { GoogleGenerativeAI, googleSearchRetrieval } = require('@google/generative-ai');
const { default: pLimit } = require('p-limit');
console.log('pLimit:', pLimit);

// --- Pre-flight check for API Key ---
if (!process.env.API_KEY) {
    console.error('\n❌ ERROR: API_KEY is not set in the environment.');
    console.error('Please create a .env file in the scraper/ directory with your API_KEY, or set it as a repository secret named API_KEY for GitHub Actions.\n');
    process.exit(1);
}

const DATA_FILE = path.join(__dirname, '../public/data/phones.json');
const PLACEHOLDER_SUMMARY_FRAGMENT = "placeholder summary";
// Set a token limit per run to dynamically process as many phones as possible.
// This is safer and more efficient than a fixed number of phones.
const TOKEN_LIMIT_PER_RUN = 100000;


// --- Gemini AI Configuration ---
const genAI = new GoogleGenerativeAI(process.env.API_KEY);


/**
 * Converts a price in USD to a score from 1-100.
 * The lower the price, the higher the score.
 * @param {number} price
 * @returns {number} A score between 1 and 100.
 */
function calculatePriceScore(price) {
    if (typeof price !== 'number' || price <= 0) return 50; // Default score if price is invalid
    if (price < 400) return 95;
    if (price < 700) return 80;
    if (price < 1000) return 60;
    if (price < 1200) return 40;
    return 20;
}

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

/**
 * Checks if an image URL is considered low quality (e.g., a placeholder).
 * @param {string} url The image URL to check.
 * @returns {boolean} True if the image is low quality.
 */
function isLowQualityImage(url) {
    if (!url || url === "#") {
        return true;
    }
    // Add other known placeholder domains if needed
    const placeholderDomains = ['picsum.photos'];
    try {
        const domain = new URL(url).hostname;
        return placeholderDomains.some(placeholder => domain.includes(placeholder));
    } catch (e) {
        // Invalid URL is also considered low quality
        return true;
    }
}


// --- Process a single phone using AI ---
async function processPhone(phone, model) {
  console.log(`Analyzing: ${phone.name}...`);
  const prompt = `Act as a phone review expert specializing in in-depth, structured analysis for the smartphone model: "${phone.name}".

Use live web search to retrieve up-to-date information (within the last month) before generating results.
Search the web for "${phone.name}" reviews, prices, and availability.
Cite only data verified through current search results.

Your Task:
Ground with Google Search for live search capabilities to find and summarize the latest reviews as of today's date from authoritative mobile technology websites (e.g., GSMArena, CNET, Tom's Guide) and user feedback from forums (e.g., Reddit's r/Android or r/Apple). In your analysis, you should also incorporate the key findings and consensus from top YouTube reviewers (e.g., MKBHD, Mrwhosetheboss), which you can find summarized in tech articles and forums. You must also find the **best currently available price in USD** (new or refurbished from a reputable retailer) and a **direct purchase link** for it.

For the image, you must find a **high-quality, public, direct image URL**. Follow these rules STRICTLY:
1.  **Source Priority:** First, search for official product images on the manufacturer's website (e.g., apple.com, samsung.com) or a major retailer (e.g., Best Buy). If none are suitable, a high-quality, clean press image from a top-tier review site like gsmarena.com is acceptable.
2.  **Image Content:** The image must be a clean, front-facing or 3/4 view product shot, preferably on a white or neutral background. It must NOT have any watermarks, logos (other than the phone's own brand), or text overlays.
3.  **URL Format:** The URL MUST be a direct link to the image file itself. It must end in ".jpg", ".png", or ".webp".
4.  **INVALID URLs:** Do NOT provide URLs from Google Images search results (e.g., google.com/imgres?...), data URIs (data:image/...), or links to web pages (HTML files).
5.  **Fallback:** If you cannot find an image URL that meets all these criteria, return an empty string "" for the "imageUrl" field.

Generate a detailed review and output it as a single, valid JSON object.

Output Format Rules:
- The final output MUST be a single JSON object, with no other text or markdown formatting.
- All scores must be between 1 and 10.
- The 'overallScore' MUST be the mathematical average of the five individual aspect scores, rounded to one decimal place.
- The JSON object must have the following exact structure:
{
  "releaseDate": "<string, in 'YYYY-MM-DD' format>",
  "category": "<string, one of: 'Mainstream All-Rounder', 'Camera-Focused', 'Gaming Powerhouse', 'Budget Value', 'Productivity Foldable'>",
  "popularity": {
    "global": <number, 1-10 score for worldwide popularity/brand recognition>,
    "north_america": <number, 1-10 score for North American popularity>,
    "europe": <number, 1-10 score for European popularity>,
    "asia": <number, 1-10 score for Asian popularity>
  },
  "confidenceScore": <number, from 1 to 10, representing how much high-quality, recent information you were able to find. 10 means multiple, consistent, authoritative reviews. Below 5 means information was sparse or conflicting.>,
  "imageUrl": "<string>",
  "regionalPrices": {
    "USD": { "price": <number>, "originalPrice": <number | null>, "purchaseUrl": "<string>", "details": "<string>" },
    "EUR": { "price": <number | null>, "originalPrice": <number | null>, "purchaseUrl": "<string>", "details": "<string>" },
    "GBP": { "price": <number | null>, "originalPrice": <number | null>, "purchaseUrl": "<string>", "details": "<string>" },    "INR": { "price": <number | null>, "originalPrice": <number | null>, "purchaseUrl": "<string>", "details": "<string>" }
  },
  "performance": { 
    "details": "<string: Detail processor, RAM, and multitasking/gaming performance. Include benchmark scores (e.g., Geekbench 6). Crucially, compare its speed and responsiveness to the standards set by newer, more current flagship phones.>", 
    "score": <number>, 
    "justification": "<string: A justification for the score that reflects its performance against current ${new Date().getFullYear()} standards. e.g., 'Still very fast, but no longer top-tier'>" 
  },
  "camera": { 
    "details": "<string: Describe camera specs, photo/video quality in various lighting, and unique features. Highlight strengths/weaknesses from reviews and user feedback. Crucially, compare its photo and video capabilities to the standards set by newer, more current flagship phones.>", 
    "score": <number>, 
    "justification": "<string: A justification for the score that reflects its performance against current ${new Date().getFullYear()} standards. e.g., 'Versatile zoom; top-tier low-light'>" 
  },
  "battery": { 
    "details": "<string: Specify battery capacity, screen-on time, and test results from reviews. Include charging speeds. Crucially, compare its endurance and charging speed to the standards set by newer, more current flagship phones.>", 
    "score": <number>, 
    "justification": "<string: A justification for the score that reflects its performance against current ${new Date().getFullYear()} standards. e.g., 'Good for its time, but average compared to modern flagships'>" 
  },
  "display": { 
    "details": "<string: Detail display specs (size, type, refresh rate, brightness in nits), color accuracy, and usability (e.g., HDR). Cite review/user feedback.>", 
    "score": <number>, 
    "justification": "<string: e.g., 'Fluid and bright; excellent for media'>" 
  },
  "userExperience": { 
    "details": "<string: Discuss OS version, software features, update longevity, design ergonomics, and any bugs or user complaints from forums.>", 
    "score": <number>, 
    "justification": "<string: e.g., 'Polished; AI useful'>" 
  },
  "overallVerdict": {
    "summary": "<string: Summarize the phone's target audience, key strengths/weaknesses, and recommendation (e.g., 'Buy for...; skip if...').>",
    "overallScore": <number>
  },
  "pros": ["<string: A concise point-by-point list of positives>"],
  "cons": ["<string: A concise point-by-point list of negatives>"],
  "newerModelComparison": {
    "isNewerModelAvailable": <boolean>,
    "newerModelName": "<string, if available>",
    "comparisonSummary": "<string, if available: Briefly compare key spec differences like processor, camera, or battery.>"
  }
}

**Phone Model to Review:** ${phone.name}

Generate the JSON object now.`;
        
        // Use the modern syntax for the official SDK, including the Google Search tool
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }]
        });
        const response = result.response;
        const text = response.text();

        // Track token usage to stay within limits (this will be accumulated in main function)
        const usage = response.usageMetadata;
        const tokensUsed = usage && usage.totalTokenCount ? usage.totalTokenCount : 0;
        
        // Add detailed logging for debugging in GitHub Actions
        console.log(`   Raw AI response for ${phone.name}:\n---\n${text}\n---`);

        const cleanedText = cleanJsonString(text);
        if (!cleanedText) {
            throw new Error("AI response was empty or could not be reliably cleaned.");
        }
        
        const analysis = JSON.parse(cleanedText);
        
        // Validate the structure of the AI response
        if (analysis.performance && analysis.camera && analysis.battery && analysis.display && analysis.userExperience && analysis.overallVerdict && analysis.pros && analysis.cons && analysis.regionalPrices?.USD && analysis.imageUrl !== undefined && analysis.newerModelComparison && analysis.confidenceScore !== undefined && analysis.releaseDate && analysis.category && analysis.popularity) {
            
            // --- Confidence Score Check ---
            if (analysis.confidenceScore < 5) {
                console.warn(`   ⚠️ Low confidence score (${analysis.confidenceScore}/10) for ${phone.name}. Skipping update and will retry in a future run.`);
                return { success: false, name: phone.name, tokensUsed, reason: 'low confidence' };
            }

            return { success: true, phone, analysis, tokensUsed };
        } else {
             console.error(`   ❌ Failed to get valid analysis from Gemini for ${phone.name}. The returned JSON was missing required fields.`);
             return { success: false, name: phone.name, tokensUsed, reason: 'invalid json' };
        }

}


// --- Main Enrichment Logic ---
async function main() {
  console.log('🤖 Starting Analyst Bot...');
  try {
    const allPhones = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));

        const today = new Date();

        const phonesToEnrich = allPhones.filter(p => {
            // Always review placeholder phones first.
            const needsInitialReview = p.summary && p.summary.toLowerCase().includes(PLACEHOLDER_SUMMARY_FRAGMENT);
            if (needsInitialReview) {
                return true;
            }

            // Always re-review phones with bad images.
            const hasBadImage = isLowQualityImage(p.imageUrl);
            if (hasBadImage) {
                console.log(`   -> Flagging "${p.name}" for re-review due to low-quality image.`);
                return true;
            }

            // If it's a reviewed phone, check the dynamic update schedule.
            const releaseDate = p.releaseDate ? new Date(p.releaseDate) : new Date(0);
            const lastUpdated = p.lastUpdated ? new Date(p.lastUpdated) : null;

            if (!lastUpdated) return true; // Should be reviewed if it's missing a timestamp

            const daysSinceRelease = (today - releaseDate) / (1000 * 60 * 60 * 24);
            const daysSinceLastUpdate = (today - lastUpdated) / (1000 * 60 * 60 * 24);

            // Rule 1: New phones (released in the last 7 days) -> check daily.
            if (daysSinceRelease <= 7 && daysSinceLastUpdate >= 1) {
                console.log(`   -> Flagging "${p.name}" for daily update (new release).`);
                return true;
            }

            // Rule 2: Recent phones (released between 8 and 22 days ago) -> check every 3 days.
            if (daysSinceRelease > 7 && daysSinceRelease <= 22 && daysSinceLastUpdate >= 3) {
                console.log(`   -> Flagging "${p.name}" for 3-day update (recent release).`);
                return true;
            }

            // Rule 3: All other phones -> check monthly.
            if (daysSinceRelease > 22 && daysSinceLastUpdate >= 30) {
                console.log(`   -> Flagging "${p.name}" for monthly update.`);
                return true;
            }

        });

    // Sort by release date to prioritize newest phones for enrichment
    phonesToEnrich.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

    console.log(`   Found ${phonesToEnrich.length} phones needing reviews. Processing dynamically based on a token limit of ${TOKEN_LIMIT_PER_RUN}.`);

    let hasChanges = false;
    let totalTokensUsed = 0;
    let phonesProcessed = 0;
    
    // Get the model once, reuse for all phones
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-pro",
            systemInstruction: "You are a truthful AI analyst. Never guess, fabricate information, or provide data you are unsure about. If information is speculative or unknown, explicitly state it and assign a low confidence score.",
            // tools: [{ google_search: { dynamic_retrieval_config: { mode: 'AUTO' } } }]
        });

    // Use p-limit for parallel processing of up to 10 phones with max 2 concurrent calls
    const limit = pLimit(2);
        const phonesToProcess = phonesToEnrich.slice(0, 10);
        console.log(`Processing ${phonesToProcess.length} phones concurrently (max 2 at a time).`);



    const results = await Promise.all(phonesToProcess.map(phone => limit(() => processPhone(phone, model))));

    for (const res of results) {
      if (res.success) {
        totalTokensUsed += res.tokensUsed;
        console.log(`✅ Successfully processed ${res.name}. Tokens used: ${res.tokensUsed}`);
        const phoneIndex = allPhones.findIndex(p => p.id === res.phone.id);
        if (phoneIndex !== -1) {
          const analysis = res.analysis;
          allPhones[phoneIndex] = {
            ...allPhones[phoneIndex],
            summary: analysis.overallVerdict.summary,
            popularity: analysis.popularity,
            category: analysis.category,
            pros: analysis.pros,
            cons: analysis.cons,
            ranking: parseFloat(analysis.overallVerdict.overallScore.toFixed(1)),
            imageUrl: analysis.imageUrl,
            purchaseUrl: analysis.regionalPrices.USD.purchaseUrl,
            releaseDate: analysis.releaseDate,
            reviewConfidenceScore: analysis.confidenceScore,
            lastUpdated: new Date().toISOString(),
            regionalPrices: analysis.regionalPrices,
            currentPrice: undefined,
            performanceReview: analysis.performance,
            cameraReview: analysis.camera,
            batteryReview: analysis.battery,
            displayReview: analysis.display,
            userExperienceReview: analysis.userExperience,
            newerModelComparison: analysis.newerModelComparison,
            scores: {
              price: calculatePriceScore(analysis.regionalPrices.USD.price),
              performance: analysis.performance.score * 10,
              camera: analysis.camera.score * 10,
              battery: analysis.battery.score * 10,
              design: analysis.display.score * 10,
              software: analysis.userExperience.score * 10,
            },
          };
          phonesProcessed++;
          hasChanges = true;
        }
      } else {
        console.error(`❌ Failed to process ${res.name}: ${res.reason}`);
      }
    }

    if (hasChanges) {
        await fs.writeFile(DATA_FILE, JSON.stringify(allPhones, null, 2));
        console.log(`\n✅ Database updated with ${phonesProcessed} new reviews.`);
    } else {
        console.log(`\nNo changes were made to the database this run.`);
    }

    const remainingCount = phonesToEnrich.length - phonesProcessed;
    if (remainingCount > 0) {
      console.log(`   ${remainingCount} phones still need reviews and will be processed in future runs.`);
    }

  } catch (error) {
    console.error('An error occurred during the main enrichment process:', error);
    process.exit(1);
  } finally {
    console.log('🏁 Analyst Bot finished.');
  }
}

main();
