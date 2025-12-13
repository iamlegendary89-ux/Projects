export interface ReviewAspect {
  details: string;
  score: number;
  justification: string;
}

export interface NewerModelComparison {
  isNewerModelAvailable: boolean;
  newerModelName?: string;
  comparisonSummary?: string;
}

export interface SoftwareUpdateInfo {
  latestOS: string;
  updateStatus: string;
  lastChecked: string; // ISO 8601 date string
}

export interface PriceInfo {
  price: number | null;
  originalPrice: number | null;
  purchaseUrl: string;
  details: string;
}

export interface RegionalPrices {
  USD: PriceInfo;
  EUR: PriceInfo | null;
  GBP: PriceInfo | null;
  INR: PriceInfo | null;
}

export interface LocalOffer {
  retailer: string;
  price: string;
  url: string;
}
export interface Phone {
  id: number;
  name: string;
  brand: string;
  releaseDate: string;
  os: 'iOS' | 'Android';
  ranking: number;
  scores: ScoreVector;
  pros: string[];
  cons: string[];
  summary: string;
  imageUrl: string;
  purchaseUrl: string;
  regionalPrices?: RegionalPrices;
  // Optional detailed review fields
  performanceReview?: ReviewAspect;
  cameraReview?: ReviewAspect;
  batteryReview?: ReviewAspect;
  displayReview?: ReviewAspect;
  userExperienceReview?: ReviewAspect;
  newerModelComparison?: NewerModelComparison;
  reviewConfidenceScore?: number;
  lastUpdated?: string;
  priceLastChecked?: string;
  popularity?: {
    global: number;
    north_america: number;
    europe: number;
    asia: number;
  };
  softwareUpdateInfo?: SoftwareUpdateInfo;
  // This field is added dynamically in the recommendation service
  matchExplanation?: string;
  similarity?: number;
  liveOffers?: LocalOffer[];
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
