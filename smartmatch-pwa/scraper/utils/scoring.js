const fs = require('fs').promises;
const path = require('path');

let metrics;

/**
 * Loads assessment benchmarks from JSON file with caching.
 * @returns {Promise<object>} Benchmarks object
 */
async function loadMetrics() {
    if (!metrics) {
        const metricsPath = path.join(__dirname, '../../public/data/metrics.json');
        try {
            metrics = JSON.parse(await fs.readFile(metricsPath, 'utf8'));
        } catch (error) {
            console.error('Failed to load metrics:', error);
            throw error;
        }
    }
    return metrics.benchmarks;
}

/**
 * Safely clamps a score between 1-10.
 * @param {number} score - Raw score to clamp
 * @returns {number} Clamped score between 1-10
 */
function clampScore(score) {
    return Math.max(1, Math.min(10, score));
}

/**
 * Linear interpolation with bounds checking.
 * @param {number} value - Value to interpolate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} scoreMin - Minimum score
 * @param {number} scoreMax - Maximum score
 * @returns {number} Interpolated score
 */
function interpolate(value, min, max, scoreMin, scoreMax) {
    if (typeof value !== 'number' || isNaN(value)) return scoreMin;
    if (value <= min) return scoreMin;
    if (value >= max) return scoreMax;
    return scoreMin + ((value - min) / (max - min)) * (scoreMax - scoreMin);
}

/**
 * Scores processor based on keyword matching with fallback.
 * @param {string} processorName - Processor name string
 * @param {object} specs - Additional specs for context
 * @returns {number} Score between 1-10
 */
function scoreProcessor(processorName, specs = {}) {
    const benchmarks = metrics.benchmarks.processor;
    if (!processorName || typeof processorName !== 'string') return 5;

    const name = processorName.toLowerCase();

    // Check tier keywords with scoring
    if (benchmarks.topTierKeywords.some(kw => name.includes(kw.toLowerCase()))) return 10;
    if (benchmarks.highTierKeywords.some(kw => name.includes(kw.toLowerCase()))) return 8.5;
    if (benchmarks.midTierKeywords.some(kw => name.includes(kw.toLowerCase()))) return 6.5;
    if (benchmarks.entryTierKeywords.some(kw => name.includes(kw.toLowerCase()))) return 4.5;

    // Bonus for efficiency features (potential future enhancement)
    return 5; // Default for unknown processors
}

/**
 * Enhanced battery scoring with proper weighting.
 * @param {object} parsedBattery - Battery specs
 * @param {object} parsedCharging - Charging specs
 * @returns {number} Score between 1-10
 */
function scoreBattery(parsedBattery, parsedCharging) {
    const benchmarks = metrics.benchmarks.battery;

    if (!parsedBattery || !parsedCharging) return 5;

    // Weight capacity more heavily (60% vs 40% for charging)
    const capacityWeight = 0.6;
    const chargingWeight = 0.4;

    const capacityScore = interpolate(
        parsedBattery.capacity,
        benchmarks.capacity.poor,
        benchmarks.capacity.excellent,
        1, 5
    );

    const chargingScore = interpolate(
        parsedCharging.wired,
        benchmarks.wiredCharging.poor,
        benchmarks.wiredCharging.excellent,
        1, 5
    );

    const combinedScore = (capacityScore * capacityWeight) + (chargingScore * chargingWeight);
    // Multiply by 2 to scale to 1-10 range since individual scores are 1-5
    return clampScore(combinedScore * 2);
}

/**
 * Intelligent display scoring considering both specs.
 * @param {object} parsedDisplay - Display specs
 * @returns {number} Score between 1-10
 */
function scoreDisplay(parsedDisplay) {
    const benchmarks = metrics.benchmarks.display;

    if (!parsedDisplay) return 5;

    // Weight brightness more for outdoor use, refresh rate for gaming/smoothness
    const brightnessWeight = 0.7;
    const refreshRateWeight = 0.3;

    const brightnessScore = interpolate(
        parsedDisplay.brightness,
        benchmarks.peakBrightness.poor,
        benchmarks.peakBrightness.excellent,
        1, 5
    );

    const refreshRateScore = interpolate(
        parsedDisplay.refreshRate,
        benchmarks.refreshRate.poor,
        benchmarks.refreshRate.excellent,
        1, 5
    );

    const combinedScore = (brightnessScore * brightnessWeight) + (refreshRateScore * refreshRateWeight);
    return clampScore(combinedScore * 2);
}

/**
 * Enhanced camera scoring with nuanced feature evaluation.
 * @param {object} parsedCamera - Camera specs
 * @returns {number} Score between 1-10
 */
function scoreCamera(parsedCamera) {
    const benchmarks = metrics.benchmarks.camera;

    if (!parsedCamera) return 5;

    // Base sensor score
    const sensorScore = interpolate(
        parsedCamera.mainSensorMP,
        benchmarks.mainSensorMP.poor,
        benchmarks.mainSensorMP.excellent,
        1, 5
    );

    // More intelligent feature scoring
    let featureScore = 0;

    // Telephoto: +2 for presence, +1 bonus for periscope
    if (parsedCamera.hasTelephoto) {
        featureScore += 2;
        // Assume periscope if telephoto MP is high (rough heuristic)
        if (parsedCamera.telephotoMP >= 12) featureScore += 1;
    }

    // Ultrawide: +1.5 for general ultrawide
    if (parsedCamera.hasUltrawide) featureScore += 1.5;

    // Bonus for high ultrawide MP (48MP+ ultrawide = 0.5 extra)
    if (parsedCamera.ultrawideMP >= 48) featureScore += 0.5;

    // Cap feature score at 4 to leave room for sensor quality
    featureScore = Math.min(4, featureScore);

    const totalScore = sensorScore + featureScore;
    return clampScore(totalScore * 2); // Scale to 1-10
}

/**
 * Comprehensive user experience scoring.
 * @param {object} parsedBuild - Build specs
 * @param {object} parsedCharging - Charging specs
 * @param {object} specs - Full specs for additional factors
 * @returns {number} Score between 1-10
 */
function scoreUserExperience(parsedBuild, parsedCharging, specs = {}) {
    const benchmarks = metrics.benchmarks.userExperience;
    let score = 5; // Start with neutral baseline

    if (!parsedBuild || !parsedCharging) return score;

    // Dust/water resistance (IP68 premium, IP67/X7 decent)
    if (parsedBuild.ipRating) {
        const ip = parsedBuild.ipRating.toLowerCase();
        if (ip === 'ip68') score += 2;
        else if (ip.includes('ip6') || ip.includes('ip7') || ip.includes('ip8')) score += 1;
    }

    // Fast wireless charging capability
    if (parsedCharging.wireless >= benchmarks.fastWirelessCharging) {
        score += 1.5;
    }

    // Build quality indicators from specs
    if (specs.dimensions && specs.weight) {
        // Prefer lighter phones (<200g bonus, >250g penalty)
        const weight = parseFloat(specs.weight) || 0;
        if (weight > 0) {
            if (weight < 200) score += 0.5;
            else if (weight > 250) score -= 0.5;
        }
    }

    // Software support indication (rough heuristic from OS string)
    if (specs.os && specs.os.includes('15')) score += 0.5; // Latest Android
    if (specs.os && specs.os.includes('18')) score += 0.5; // Latest iOS

    return clampScore(score);
}


async function calculateObjectiveScores(phone) {
    await loadMetrics();

    const { specs } = phone;
    const parsed = phone.parsedSpecs; // Use the pre-parsed specs
    
    if (!specs || !parsed) {
        console.warn(`     -> Specs or parsed specs missing for ${phone.name}. Cannot calculate objective scores.`);
        return { performance: 5, battery: 5, display: 5, camera: 5, userExperience: 5, design: 5, software: 5 };
    }

    const scores = {
        performance: scoreProcessor(specs.processor, specs),
        battery: scoreBattery(parsed.battery, parsed.charging),
        display: scoreDisplay(parsed.display),
        camera: scoreCamera(parsed.camera),
        userExperience: scoreUserExperience(parsed.build, parsed.charging, specs),
        // Design and Software are more subjective and will be handled by the AI
        design: 5,
        software: 5,
    };

    return scores;
}

module.exports = { calculateObjectiveScores };
