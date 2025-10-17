// scraper/utils/schema.js - The single source of truth for our data structures.

// Defines the objective, factual data we gather first.
// This is our "Top 10" list of essential specifications.
const specSchema = {
  processor: "<string, e.g., 'Snapdragon 8 Gen 4'>",
  ram: "<string, e.g., '12GB LPDDR5X'>",
  storage: "<string, e.g., '256GB UFS 4.0'>",
  display: "<string, e.g., '6.8-inch Dynamic AMOLED 2X, 120Hz, HDR10+, 2600 nits (peak)'>",
  battery: "<string, e.g., '5000mAh'>",
  charging: "<string, e.g., '45W wired, 15W wireless, 4.5W reverse wireless'>",
  mainCamera: "<string, e.g., '200 MP (wide) + 10 MP (periscope telephoto) + 10 MP (telephoto) + 12 MP (ultrawide)'>",
  frontCamera: "<string, e.g., '12 MP (wide)'>",
  os: "<string, e.g., 'Android 15, One UI 7'>",
  dimensions: "<string, e.g., '162.3 x 79 x 8.6 mm'>",
  weight: "<string, e.g., '232 g'>",
  popularityScore: "<number, 1-10, representing market buzz and search interest>",
  lowestCurrentPriceUSD: "<number, e.g., 1199>"
};

const parsedSpecSchema = {
    battery: { capacity: "<number, in mAh>" },
    charging: { wired: "<number, in watts>", wireless: "<number, in watts, 0 if not present>" },
    display: { refreshRate: "<number, in Hz>", brightness: "<number, in nits peak>" },
    camera: { mainSensorMP: "<number>", hasTelephoto: "<boolean>", hasUltrawide: "<boolean>" },
    build: { ipRating: "<string, e.g., 'IP68' or null>" }
};

// Defines the subjective, analytical data we generate in the review.
const reviewSchema = {
  summary: "<string, 1-2 paragraph overview based on the consensus>",
  category: "<string, e.g., 'Flagship', 'Flagship Killer', 'Mid-range', 'Budget'>",
  classification: "<string, e.g., 'Camera Oriented', 'Gaming Phone', 'Productivity Powerhouse', 'Compact Flagship'>",
  
  detailedReview: {
    performance: "<string, detailed paragraph explaining the performance score>",
    camera: "<string, detailed paragraph explaining the camera score>",
    battery: "<string, detailed paragraph explaining the battery score>",
    display: "<string, detailed paragraph explaining the display score>",
    designAndBuild: "<string, detailed paragraph about the phone's physical design, materials, and durability>",
    softwareAndExperience: "<string, detailed paragraph about the OS, features, and general user experience>"
  },

  pros: ["<string>", "<string>", "<string>"],
  cons: ["<string>", "<string>", "<string>"],

  verdict: {
    targetAudience: "<string, who is the ideal user for this phone?>",
    whoShouldAvoid: "<string, who should probably not buy this phone?>",
    keyCompetitors: ["<string, e.g., 'Samsung Galaxy S25 Ultra'>", "<string, e.g., 'Google Pixel 10 Pro'>"],
    finalThought: "<string, a concluding sentence on the phone's place in the market>"
  },

  benchmarkScores: {
    performance: "<number, 1-10, based on processor benchmarks>",
    camera: "<number, 1-10, based on sensor size and features>",
    battery: "<number, 1-10, based on capacity and charging speed>",
    display: "<number, 1-10, based on brightness and refresh rate>",
    userExperience: "<number, 1-10, based on features like IP rating and charging options>"
  },

  subjectiveScores: {
      design: "<number, 1-10, AI's assessment of aesthetics and ergonomics>",
      software: "<number, 1-10, AI's assessment of the OS skin and features>"
  },

  valueForMoneyScore: "<number, 1-10, assessing if the phone's features and performance justify its price point>",
  reviewConfidenceScore: "<number, 1-10, rating your confidence based on source quality and consistency>",
  sourcesSummary: "<string, e.g., 'Synthesized from 4 expert reviews and Reddit user feedback'>"
};

module.exports = { specSchema, reviewSchema, parsedSpecSchema };
