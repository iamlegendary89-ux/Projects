// test-recommendations.js - A script to test the recommendation logic with random inputs.
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../public/data/phones.json');

// --- Mirrored Logic from recommendationService.ts ---

const dotProduct = (vecA, vecB) => vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
const magnitude = (vec) => Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));

const cosineSimilarity = (vecA, vecB) => {
  const magA = magnitude(vecA);
  const magB = magnitude(vecB);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(vecA, vecB) / (magA * magB);
};

const toVectorArray = (scores) => [scores.price, scores.performance, scores.camera, scores.battery, scores.design, scores.software];

const generateUserVector = (answers) => {
  const userScores = { price: 50, performance: 50, camera: 50, battery: 50, design: 50, software: 50 };
  switch (answers.budget) {
    case "Budget (<$500)": userScores.price = 95; break;
    case "Mid-Range ($500-$900)": userScores.price = 70; break;
    case "Premium (>$900)": userScores.price = 40; break;
  }
  switch (answers.cameraImportance) {
    case "Top Priority": userScores.camera = 95; break;
    case "Important": userScores.camera = 70; break;
    case "Not a Factor": userScores.camera = 30; break;
  }
  switch (answers.batteryImportance) {
    case "Essential": userScores.battery = 95; break;
    case "Important": userScores.battery = 75; break;
    case "Not a Factor": userScores.battery = 30; break;
  }
  switch (answers.primaryUsage) {
    case "Gaming & Pro Apps": userScores.performance = 95; break;
    case "Social & Streaming": userScores.performance = 75; userScores.camera = Math.max(userScores.camera, 75); break;
    case "Basics (Calls, Texts)": userScores.performance = 50; break;
  }
  switch (answers.stylePreference) {
    case "Simple & Seamless (iOS)": userScores.design = 90; userScores.software = 85; break;
    case "Customizable (Android)": userScores.design = 60; userScores.software = 95; break;
  }
  return userScores;
};

const getRegionFromCountryCode = (countryCode) => {
    const europe = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'];
    if (['US', 'CA', 'MX'].includes(countryCode)) return 'north_america';
    if (europe.includes(countryCode)) return 'europe';
    if (countryCode) return 'asia'; // Default to asia for other codes for this simulation
    return 'global';
};
const getRecommendations = (answers, phonesDB, userVector) => {
  const userPreferenceVector = generateUserVector(answers);
  const userVectorArray = toVectorArray(userPreferenceVector);
  const reviewedPhones = phonesDB.filter(phone => !phone.summary.toLowerCase().includes('placeholder summary'));

  let filteredByContext = reviewedPhones;

  // --- New Contextual Filtering Logic ---
  if (answers.primaryUsage === "Gaming & Pro Apps") {
    // If the user is a gamer, strongly prefer gaming phones.
    const gamingPhones = reviewedPhones.filter(p => p.category === 'Gaming Powerhouse');
    // If we find any gaming phones, we ONLY recommend from that pool.
    if (gamingPhones.length > 0) {
      filteredByContext = gamingPhones;
      console.log("   (Context Applied: Prioritizing 'Gaming Powerhouse' phones)");
    }
  } else if (answers.cameraImportance === "Top Priority") {
    // If camera is top priority, strongly prefer camera-focused phones.
    const cameraPhones = reviewedPhones.filter(p => p.category === 'Camera-Focused');
    if (cameraPhones.length > 0) {
      filteredByContext = cameraPhones;
      console.log("   (Context Applied: Prioritizing 'Camera-Focused' phones)");
    }
  } else {
    // For all other users, EXCLUDE hardcore gaming phones from recommendations.
    filteredByContext = reviewedPhones.filter(p => p.category !== 'Gaming Powerhouse');
  }

  // Apply OS preference after contextual filtering
  const finalFilteredPhones = answers.os === 'No Preference' ? filteredByContext : filteredByContext.filter(phone => phone.os === answers.os);

  const phonesWithScores = finalFilteredPhones.map(phone => {
    const phoneVectorArray = toVectorArray(phone.scores);
    const similarity = cosineSimilarity(userVectorArray, phoneVectorArray);
    return { ...phone, similarity };
  });

  phonesWithScores.sort((a, b) => {
    // Primary sort: by similarity score (descending)
    if (Math.abs(b.similarity - a.similarity) > 0.001) { // If similarity is meaningfully different
        return b.similarity - a.similarity;
    }
    // Secondary sort (tie-breaker): by REGIONAL popularity score (descending)
    const region = getRegionFromCountryCode(answers.countryCode);
    const popularityA = a.popularity?.[region] || a.popularity?.global || 0;
    const popularityB = b.popularity?.[region] || b.popularity?.global || 0;

    return popularityB - popularityA;
  });

  return phonesWithScores.slice(0, 3);
};

// --- Mirrored Quiz Questions from Quiz.tsx ---

const quizQuestions = {
  budget: ["Budget (<$500)", "Mid-Range ($500-$900)", "Premium (>$900)"],
  cameraImportance: ["Top Priority", "Important", "Not a Factor"],
  batteryImportance: ["Essential", "Important", "Not a Factor"],
  primaryUsage: ["Gaming & Pro Apps", "Social & Streaming", "Basics (Calls, Texts)"],
  stylePreference: ["Simple & Seamless (iOS)", "Customizable (Android)", "No Preference"],
};

// --- Test Logic ---

function getRandomAnswer(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function generateRandomAnswers() {
  const answers = {};
  for (const key in quizQuestions) {
    answers[key] = getRandomAnswer(quizQuestions[key]);
  }
  // Auto-set OS
  if (answers.stylePreference.includes('iOS')) answers.os = 'iOS';
  else if (answers.stylePreference.includes('Android')) answers.os = 'Android';
  else answers.os = 'No Preference';

  // Simulate a random location for testing regional popularity
  const regions = ['US', 'DE', 'IN', null]; // North America, Europe, Asia, Global
  answers.countryCode = regions[Math.floor(Math.random() * regions.length)];
  return answers;
}

async function runTest(testNumber) {
  console.log(`\n--- 🧪 Test Run #${testNumber} ---`);
  const phonesDB = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  const randomAnswers = generateRandomAnswers();
  
  console.log("📝 Random User Answers:");
  console.log(randomAnswers);

  const recommendations = getRecommendations(randomAnswers, phonesDB, generateUserVector(randomAnswers));

  console.log("\n🏆 Top 3 Recommendations:");
  if (recommendations.length === 0) {
    console.log("   No recommendations found for this combination.");
  } else {
    recommendations.forEach((phone, index) => {
        const region = getRegionFromCountryCode(randomAnswers.countryCode);
        const regionalPop = phone.popularity?.[region] || phone.popularity?.global;
      console.log(
        `   ${index + 1}. ${phone.name} (Category: ${phone.category}, Similarity: ${phone.similarity.toFixed(4)}, Pop. [${region}]: ${regionalPop || 'N/A'})`
        );
    });
  }
  console.log(`--- End of Test Run #${testNumber} ---`);
}

async function main() {
  console.log("🚀 Starting Recommendation Logic Test Suite...");
  const numberOfTests = 5; // Run 5 different random tests
  for (let i = 1; i <= numberOfTests; i++) {
    await runTest(i);
  }
  console.log("\n✅ Test suite finished.");
}

main().catch(error => {
  console.error("An error occurred during the test run:", error);
  process.exit(1);
});
