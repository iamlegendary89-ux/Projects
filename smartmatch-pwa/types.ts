export interface ReviewAspect {
  details: string;
  score: number;
  justification: string;
}

export interface NewerModelComparison {
  isNewerModelAvailable: boolean;
  newerModelName: string | null;
  comparisonSummary: string | null;
}

export interface SoftwareUpdateInfo {
  latestOS: string;
  updateStatus: string;
}

export interface PriceInfo {
  price: number | null;
  originalPrice: number | null;
  purchaseUrl: string;
  details: string;
}

export interface RegionalPrices {
  USD: number | null;
  EUR: number | null;
  GBP: number | null;
  INR: number | null;
}

export interface LocalOffer {
  retailer: string;
  price: string;
  url: string;
}
export interface PhoneSpecs {
  processor: string;
  ram: string;
  storage: string;
  display: string;
  battery: string;
  charging: string;
  mainCamera: string;
  frontCamera: string;
  os: string;
  dimensions: string;
  weight: string;
  popularityScore?: number;
  lowestCurrentPriceUSD?: number;
}

export interface Phone {
  id: number;
  name: string;
  brand: string;
  releaseDate: string;
  os: 'iOS' | 'Android';
  category?: string;
  classification?: string;
  ranking: number;
  scores: ScoreVector;
  pros: string[];
  cons: string[];
  summary: string;
  imageUrl: string | null;
  badImageUrls?: string[];
  purchaseUrl: string;
  regionalPrices?: RegionalPrices;
  priceLastChecked?: string | null;
  // Optional detailed review fields
  performanceReview?: ReviewAspect;
  cameraReview?: ReviewAspect;
  batteryReview?: ReviewAspect;
  displayReview?: ReviewAspect;
  userExperienceReview?: ReviewAspect;
  newerModelComparison?: NewerModelComparison;
  specConfidenceScore?: number;
  reviewConfidenceScore?: number;
  valueForMoneyScore?: number;
  sourcesSummary?: string;
  lastUpdated?: string;
  softwareUpdateInfo?: SoftwareUpdateInfo;
  specs?: PhoneSpecs;
  // Token usage tracking
  tokensUsedReview?: number;
  tokensUsedSpecs?: number;
  lastTokenCostReview?: string;
  lastTokenCostSpecs?: string;
  // This field is added dynamically in the recommendation service
  matchExplanation?: string;
}

export interface ScoreVector {
  price: number;
  performance: number;
  camera: number;
  battery: number;
  design: number;
  software: number;
}

export type QuizAnswers = {
  budget: string;
  cameraImportance: string;
  batteryImportance: string;
  primaryUsage: string;
  stylePreference: string;
  os: 'iOS' | 'Android' | 'No Preference';
  countryCode?: string | null;
};

export interface QuizQuestion {
  id: keyof QuizAnswers;
  text: string;
  options: string[];
}
