const { calculateObjectiveScores } = require('./scoring');

// Unit tests for scoring functions
const mocha = require('mocha');
const { describe, it } = mocha;
const { expect } = require('chai');

describe('Scoring System Tests', () => {
  it('calculateObjectiveScores returns valid score structure', async () => {
    const mockPhone = {
      name: 'Test Phone',
      specs: {
        processor: 'Snapdragon 8 Gen 3',
        ram: '8GB',
        storage: '128GB'
      },
      parsedSpecs: {
        battery: { capacity: 4000 },
        charging: { wired: 65, wireless: 0 },
        display: { brightness: 1000, refreshRate: 90 },
        camera: { mainSensorMP: 50, hasTelephoto: true, hasUltrawide: false },
        build: { ipRating: null }
      }
    };

    const scores = await calculateObjectiveScores(mockPhone);

    expect(scores).toHaveProperty('performance');
    expect(scores).toHaveProperty('battery');
    expect(scores).toHaveProperty('display');
    expect(scores).toHaveProperty('camera');
    expect(scores).toHaveProperty('userExperience');
    expect(scores).toHaveProperty('design', 5);
    expect(scores).toHaveProperty('software', 5);

    // Verify all scores are between 1-10
    Object.values(scores).forEach(score => {
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  it('calculateObjectiveScores handles missing specs gracefully', async () => {
    const mockPhone = {
      name: 'Incomplete Phone',
      specs: null,
      parsedSpecs: null
    };

    const scores = await calculateObjectiveScores(mockPhone);

    // Should return default scores
    expect(scores.performance).toBe(5);
    expect(scores.battery).toBe(5);
    expect(scores.display).toBe(5);
    expect(scores.camera).toBe(5);
    expect(scores.userExperience).toBe(5);
  });

  it('processor scoring works correctly', async () => {
    await require('./scoring').loadMetrics(); // Load metrics first

    const { scoreProcessor } = require('./scoring');

    // Test tier recognition
    expect(scoreProcessor('Snapdragon 8 Elite')).toBe(10);
    expect(scoreProcessor('A18 Pro')).toBe(8.5);
    expect(scoreProcessor('Dimensity 7400')).toBe(4.5);
    expect(scoreProcessor('Unknown Processor')).toBe(5);
  });

  it('camera scoring accounts for features', async () => {
    await require('./scoring').loadMetrics(); // Load metrics first

    const { scoreCamera } = require('./scoring');

    // High MP sensor with features should score higher
    const highEndCamera = {
      mainSensorMP: 50,
      hasTelephoto: true,
      telephotoMP: 12,
      hasUltrawide: true,
      ultrawideMP: 48
    };

    // Basic camera should score lower
    const basicCamera = {
      mainSensorMP: 12,
      hasTelephoto: false,
      hasUltrawide: false
    };

    const highScore = scoreCamera(highEndCamera);
    const basicScore = scoreCamera(basicCamera);

    expect(highScore).toBeGreaterThan(basicScore);
    expect(highScore).toBeGreaterThanOrEqual(6);
    expect(highScore).toBeLessThanOrEqual(10);
  });

  it('battery scoring with proper weighting', async () => {
    await require('./scoring').loadMetrics(); // Load metrics first

    const { scoreBattery } = require('./scoring');

    // High capacity, fast charging
    const premiumBattery = {
      capacity: 5000,
      wired: 120,
      wireless: 50
    };

    // Low capacity, slow charging
    const budgetBattery = {
      capacity: 3000,
      wired: 25,
      wireless: 0
    };

    const premiumScore = scoreBattery(
      { capacity: premiumBattery.capacity },
      { wired: premiumBattery.wired, wireless: premiumBattery.wireless }
    );
    const budgetScore = scoreBattery(
      { capacity: budgetBattery.capacity },
      { wired: budgetBattery.wired, wireless: budgetBattery.wireless }
    );

    expect(premiumScore).toBeGreaterThan(budgetScore);
    expect(premiumScore).toBeGreaterThan(7);
    expect(budgetScore).toBeLessThan(4);
  });
});
