import { Phone, QuizAnswers, ScoreVector } from '../types';

// Helper to calculate dot product of two vectors
const dotProduct = (vecA: number[], vecB: number[]): number => {
  return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
};

// Helper to calculate magnitude of a vector
const magnitude = (vec: number[]): number => {
  return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
};

// Cosine similarity function
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  const magA = magnitude(vecA);
  const magB = magnitude(vecB);
  if (magA === 0 || magB === 0) {
    return 0;
  }
  return dotProduct(vecA, vecB) / (magA * magB);
};

// Convert a ScoreVector object to a consistent array format
export const toVectorArray = (scores: ScoreVector): number[] => {
  return [scores.price, scores.performance, scores.camera, scores.battery, scores.design, scores.software];
};

// Generate a user preference vector from quiz answers
export const generateUserVector = (answers: QuizAnswers): ScoreVector => {
  const userScores: ScoreVector = { price: 50, performance: 50, camera: 50, battery: 50, design: 50, software: 50 };

  // 1. Budget
  switch (answers.budget) {
    case "Budget (<$500)": userScores.price = 95; break;
    case "Mid-Range ($500-$900)": userScores.price = 70; break;
    case "Premium (>$900)": userScores.price = 40; break;
  }

  // 2. Camera Importance
  switch (answers.cameraImportance) {
    case "Top Priority": userScores.camera = 95; break;
    case "Important": userScores.camera = 70; break;
    case "Not a Factor": userScores.camera = 30; break;
  }

  // 3. Battery Importance
  switch (answers.batteryImportance) {
    case "Essential": userScores.battery = 95; break;
    case "Important": userScores.battery = 75; break;
    case "Not a Factor": userScores.battery = 30; break;
  }

  // 4. Primary Usage
  switch (answers.primaryUsage) {
    case "Gaming & Pro Apps": userScores.performance = 95; break;
    case "Social & Streaming": userScores.performance = 75; userScores.camera = Math.max(userScores.camera, 75); break;
    case "Basics (Calls, Texts)": userScores.performance = 50; break;
  }

  // 5. Style Preference
  switch (answers.stylePreference) {
    case "Simple & Seamless (iOS)":
      userScores.design = 90;
      userScores.software = 85;
      break;
    case "Customizable (Android)":
      userScores.design = 60;
      userScores.software = 95;
      break;
    case "No Preference":
      // Keep base scores, as user is neutral on style
      break;
  }
  
  return userScores;
};

const generateMatchExplanation = (phone: Phone, userVector: ScoreVector): string => {
  const phoneVector = phone.scores;
  const userPriorities = Object.entries(userVector)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, 2)
    .map(([key]) => key as keyof ScoreVector);

  const topPriority = userPriorities[0];
  const secondPriority = userPriorities[1];

  const topScore = phoneVector[topPriority];
  const secondScore = phoneVector[secondPriority];

  let explanation = `This phone is a great match for you. You prioritized **${topPriority}** and **${secondPriority}**, and this phone excels in those areas.`;

  if (topScore > 85 && secondScore > 85) {
    explanation += ` It has outstanding scores for both ${topPriority} (${(topScore / 10).toFixed(1)}/10) and ${secondPriority} (${(secondScore / 10).toFixed(1)}/10).`;
  } else if (topScore > 85) {
    explanation += ` It has an outstanding ${topPriority} score of ${(topScore / 10).toFixed(1)}/10.`;
  } else {
    explanation += ` It scores well for both ${topPriority} (${(topScore / 10).toFixed(1)}/10) and ${secondPriority} (${(secondScore / 10).toFixed(1)}/10).`;
  }

  return explanation;
};

export const getRecommendations = (answers: QuizAnswers, phonesDB: Phone[], userVector?: ScoreVector): Phone[] => {
  const userPreferenceVector = userVector || generateUserVector(answers);
  const userVectorArray = toVectorArray(userPreferenceVector);

  // --- Bug Fix: Only consider phones that have been fully reviewed ---
  const reviewedPhones = phonesDB.filter(phone => !phone.summary.toLowerCase().includes('placeholder summary'));

  // Filter phones by OS preference first
  const filteredPhones = answers.os === 'No Preference'
    ? reviewedPhones
    : reviewedPhones.filter(phone => phone.os === answers.os);

  const phonesWithScores = filteredPhones.map(phone => {
    const phoneVectorArray = toVectorArray(phone.scores);
    const similarity = cosineSimilarity(userVectorArray, phoneVectorArray);
    return { ...phone, similarity };
  });

  phonesWithScores.sort((a, b) => b.similarity - a.similarity);

  const top3 = phonesWithScores.slice(0, 3);
  
  return top3.map(phone => ({ ...phone, matchExplanation: generateMatchExplanation(phone, userPreferenceVector) }));
};