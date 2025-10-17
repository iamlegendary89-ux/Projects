const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  try {
    const { query, country = "US", userPrefs = {} } = JSON.parse(req.body || "{}");

    // Get country from Vercel headers (fallback to provided country)
    const detectedCountry = req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || country;
    const dataPath = path.join(process.cwd(), "public/data/phones.json");
    const phones = JSON.parse(fs.readFileSync(dataPath, "utf8"));

    // map country → region group
    const region =
      ["US", "CA", "MX"].includes(country) ? "north_america" :
      ["DE", "FR", "ES", "IT", "GB"].includes(country) ? "europe" :
      ["IN", "SG", "AE", "CN", "JP"].includes(country) ? "asia" : "global";

    // quick text match
    const keywords = query.toLowerCase().split(" ");

    const ranked = phones
      .map(p => {
        // Calculate sentiment as average of key scores (normalized to 0-1)
        const sentiment =
          (p.scores.performance + p.scores.camera + p.scores.battery) / 3 / 10;

        // Region-based popularity weight
        const regionWeight = (p.popularity[region] || p.popularity.global || 5) / 10;

        // Review confidence (fallback to 5 if not available)
        const confidence = (p.reviewConfidenceScore || 5) / 10;

        // Price scoring (lower price = higher score, with logarithmic scaling)
        const priceObj = p.regionalPrices[country] ||
                        p.regionalPrices.USD ||
                        p.regionalPrices.EUR ||
                        p.regionalPrices.INR;
        const priceScore = priceObj?.price ? 1 / Math.log(priceObj.price / 100) : 0;

        // Relevance boost for keyword matches in phone name
        const relevance = keywords.some(k => p.name.toLowerCase().includes(k) ||
                                           p.brand.toLowerCase().includes(k) ||
                                           p.category.toLowerCase().includes(k)) ? 1.3 : 1;

        // Final weighted score combining all factors
        const finalScore =
          (sentiment * 0.4 + regionWeight * 0.3 + confidence * 0.2 + priceScore * 0.1) *
          relevance;

        return { ...p, region, finalScore };
      });

    // Apply personalization boosts and filters
    let personalized = ranked.map(p => {
      let boostedScore = p.finalScore;

      // Brand preference boost (1.05x multiplier if matches favorite brand)
      if (userPrefs.brand && p.brand.toLowerCase() === userPrefs.brand.toLowerCase()) {
        boostedScore *= 1.05;
      }

      // OS preference filter
      if (userPrefs.os && p.os !== userPrefs.os) {
        boostedScore *= 0.8; // Slight penalty for wrong OS
      }

      // Price range filtering
      const phonePrice = (p.regionalPrices[country] ||
                          p.regionalPrices.USD ||
                          p.regionalPrices.EUR ||
                          p.regionalPrices.INR)?.price || 0;

      if (userPrefs.priceRange) {
        const { min, max } = userPrefs.priceRange;
        if (phonePrice < min || phonePrice > max) {
          boostedScore *= 0.5; // Significant penalty if outside price range
        }
      }

      // Priority-based re-ranking for specific attributes
      if (userPrefs.priority) {
        const priorityBoosts = {
          camera: (p.scores.camera / 10) * 0.15,      // Boost camera-focused phones
          performance: (p.scores.performance / 10) * 0.15, // Boost performance phones
          battery: (p.scores.battery / 10) * 0.15,    // Boost battery life phones
          design: (p.scores.design / 10) * 0.1        // Boost design-focused phones
        };
        boostedScore += priorityBoosts[userPrefs.priority] || 0;
      }

      // Regional preference weighting (geographic preferences)
      const regionalPreferences = {
        north_america: { camera: 0.05, performance: 0.05 },     // Balanced but gaming-focused
        europe: { camera: 0.08, battery: 0.04 },                // Camera priority, good battery
        asia: { battery: 0.08, performance: 0.05 },             // Battery intensive use, gaming
        global: { performance: 0.03, camera: 0.03 }             // Balanced global
      };

      const regionPrefs = regionalPreferences[region] || regionalPreferences.global;
      if (regionPrefs.camera) boostedScore += (p.scores.camera / 10) * regionPrefs.camera;
      if (regionPrefs.performance) boostedScore += (p.scores.performance / 10) * regionPrefs.performance;
      if (regionPrefs.battery) boostedScore += (p.scores.battery / 10) * regionPrefs.battery;

      return { ...p, finalScore: boostedScore };
    });

    // Re-sort after personalization
    personalized = personalized.sort((a, b) => b.finalScore - a.finalScore).slice(0, 3);

    res.status(200).json({
      country,
      region,
      query,
      results: personalized,
      personalized: true
    });

  } catch (error) {
    console.error('Suggest API error:', error);
    res.status(500).json({
      error: 'Failed to process suggestion request',
      details: error.message
    });
  }
}
