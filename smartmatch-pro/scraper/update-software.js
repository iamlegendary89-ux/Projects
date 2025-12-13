// update-software.js - A lightweight script to update phone software information daily.
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI, googleSearchRetrieval } = require('@google/generative-ai');

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
    console.log('🤖 Starting Daily Software Update Bot...');
    try {
        const allPhones = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
        const reviewedPhones = allPhones.filter(p => !(p.summary && p.summary.toLowerCase().includes('placeholder summary')));

        if (reviewedPhones.length === 0) {
            console.log('   No reviewed phones to update software for. Exiting.');
            return;
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const phonesToCheck = reviewedPhones.filter(p => {
            // If softwareLastChecked doesn't exist or is older than 30 days, it needs a check.
            return !p.softwareLastChecked || new Date(p.softwareLastChecked) < thirtyDaysAgo;
        });

        if (phonesToCheck.length === 0) {
            console.log('   No phones due for a software update check. Exiting.');
            return;
        }

        console.log(`   Found ${phonesToCheck.length} phones due for a software update check.`);
        let softwareUpdated = 0;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

        for (const phone of phonesToCheck) {
            console.log(`   Checking software for: ${phone.name}...`);
            try {
                const prompt = `Ground with Google Search for live search capabilities, find the latest official software/OS version available for the "${phone.name}".
                
                Provide the output as a single, valid JSON object with the following exact structure:
                {
                  "softwareUpdateInfo": {
                    "latestOS": "<string, e.g., 'iOS 18.1' or 'Android 15 with One UI 7.0'>",
                    "updateStatus": "<string, e.g., 'Receiving regular security updates.' or 'End of life, no longer receiving updates.' or 'Expected to receive updates until 2031.'>"
                  }
                }`;

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    tools: [{ google_search: {} }]
                });
                const response = result.response;
                const text = response.text();
                const cleanedText = cleanJsonString(text);
                const analysis = JSON.parse(cleanedText);

                if (analysis && analysis.softwareUpdateInfo && analysis.softwareUpdateInfo.latestOS) {
                    const phoneIndex = allPhones.findIndex(p => p.id === phone.id);
                    // Update the software info and the dedicated timestamp
                    allPhones[phoneIndex].softwareLastChecked = new Date().toISOString();
                    allPhones[phoneIndex].softwareUpdateInfo = analysis.softwareUpdateInfo;
                    softwareUpdated++;
                    console.log(`     ✅ Updated software to ${analysis.softwareUpdateInfo.latestOS}`);
                } else {
                    console.warn(`     ⚠️ Could not find a valid software update for ${phone.name}.`);
                }
            } catch (error) {
                console.error(`     ❌ Failed to update software for ${phone.name}. Error: ${error.message}`);
            }
        }

        if (softwareUpdated > 0) {
            await fs.writeFile(DATA_FILE, JSON.stringify(allPhones, null, 2));
            console.log(`\n✅ Successfully updated software for ${softwareUpdated} phones.`);
        } else {
            console.log('\n   No software was updated in this run.');
        }

    } catch (error) {
        console.error('An error occurred during the software update process:', error);
        process.exit(1);
    } finally {
        console.log('🏁 Daily Software Update Bot finished.');
    }
}

main();
