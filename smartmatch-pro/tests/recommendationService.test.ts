
import { describe, it, expect } from 'vitest';
import { generateUserVector, getRecommendations } from '../services/recommendationService';
import { QuizAnswers, Phone } from '../types';

describe('recommendationService', () => {
  describe('generateUserVector', () => {
    it('should generate a user vector based on quiz answers', () => {
      const answers: QuizAnswers = {
        budget: 'Premium (>$900)',
        cameraImportance: 'Top Priority',
        batteryImportance: 'Essential',
        primaryUsage: 'Gaming & Pro Apps',
        stylePreference: 'Simple & Seamless (iOS)',
        os: 'iOS',
      };

      const userVector = generateUserVector(answers);

      expect(userVector.price).toBe(40);
      expect(userVector.camera).toBe(95);
      expect(userVector.battery).toBe(95);
      expect(userVector.performance).toBe(95);
      expect(userVector.design).toBe(90);
      expect(userVector.software).toBe(85);
    });
  });

  describe('getRecommendations', () => {
    const phonesDB: Phone[] = [
      {
        id: 1,
        name: 'Phone A',
        brand: 'Brand A',
        os: 'iOS',
        scores: { price: 80, performance: 90, camera: 85, battery: 80, design: 90, software: 90 },
        ranking: 85,
        summary: 'A great phone.',
        imageUrl: '',
      },
      {
        id: 2,
        name: 'Phone B',
        brand: 'Brand B',
        os: 'Android',
        scores: { price: 90, performance: 80, camera: 80, battery: 90, design: 80, software: 80 },
        ranking: 83,
        summary: 'Another great phone.',
        imageUrl: '',
      },
      {
        id: 3,
        name: 'Phone C',
        brand: 'Brand C',
        os: 'iOS',
        scores: { price: 70, performance: 95, camera: 90, battery: 85, design: 85, software: 85 },
        ranking: 88,
        summary: 'The best phone.',
        imageUrl: '',
      },
    ];

    it('should return the top recommendations based on cosine similarity', () => {
      const answers: QuizAnswers = {
        budget: 'Premium (>$900)',
        cameraImportance: 'Top Priority',
        batteryImportance: 'Essential',
        primaryUsage: 'Gaming & Pro Apps',
        stylePreference: 'Simple & Seamless (iOS)',
        os: 'iOS',
      };

      const recommendations = getRecommendations(answers, phonesDB);

      expect(recommendations).toHaveLength(2); // Only 2 iOS phones in the DB
      expect(recommendations[0].name).toBe('Phone C');
      expect(recommendations[1].name).toBe('Phone A');
    });
  });
});
