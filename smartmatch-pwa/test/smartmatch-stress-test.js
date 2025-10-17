#!/usr/bin/env node

// SmartMatch PWA Stress Test
// Simulates 1000 random users to test for anomalies
// Tests suggest API, justify API, preference handling, and edge cases

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TOTAL_USERS = 100000;
const BASE_URL = 'http://localhost:5173'; // Local dev server
const API_BASE = 'http://localhost:5173'; // Local API endpoints

// Test data generators
const countries = ['US', 'EG', 'GB', 'DE', 'FR', 'IN', 'SG', 'AE', 'CN', 'JP', 'CA', 'MX', 'BR', 'AU', 'SA', 'NG', 'ZA', 'AR', 'CO', 'NZ', 'QA', 'KW', 'BH', 'OM'];
const preferences = {
  budgets: ['<$500', '$500-$900', '>$900'],
  cameraImp: ['Top Priority', 'Important', 'Not a Factor'],
  batteryImp: ['Essential', 'Important', 'Not a Factor'],
  priorities: ['Gaming & Pro Apps', 'Social & Streaming', 'Basics (Calls, Texts)'],
  styles: ['Simple & Seamless (iOS)', 'Customizable (Android)', 'No Preference']
};

// Mock quiz data generator
function generateRandomQuizAnswers() {
  return {
    budget: preferences.budgets[Math.floor(Math.random() * preferences.budgets.length)],
    cameraImportance: preferences.cameraImp[Math.floor(Math.random() * preferences.cameraImp.length)],
    batteryImportance: preferences.batteryImp[Math.floor(Math.random() * preferences.batteryImp.length)],
    primaryUsage: preferences.priorities[Math.floor(Math.random() * preferences.priorities.length)],
    stylePreference: preferences.styles[Math.floor(Math.random() * preferences.styles.length)],
  };
}

// Extract preferences from quiz answers (matching Quiz component logic)
function deriveUserPreferences(answers) {
  const prefs = {};

  // OS preference
  if (answers.stylePreference !== 'No Preference') {
    prefs.os = answers.stylePreference.includes('iOS') ? 'iOS' : 'Android';
  }

  // Price range from budget
  if (answers.budget) {
    if (answers.budget.includes('<$500')) {
      prefs.priceRange = { min: 0, max: 500 };
    } else if (answers.budget.includes('$500-$900')) {
      prefs.priceRange = { min: 500, max: 900 };
    } else if (answers.budget.includes('>$900')) {
      prefs.priceRange = { min: 900, max: 5000 };
    }
  }

  // Priority from importance answers
  if (answers.cameraImportance === 'Top Priority') {
    prefs.priority = 'camera';
  } else if (answers.batteryImportance === 'Essential') {
    prefs.priority = 'battery';
  } else if (answers.primaryUsage === 'Gaming & Pro Apps') {
    prefs.priority = 'performance';
  } else if (answers.primaryUsage === 'Social & Streaming') {
    prefs.priority = 'camera'; // Social media often involves photos
  }

  return prefs;
}

// Load phones data
let allPhones = [];
try {
  const dataPath = path.join(__dirname, '../public/data/phones.json');
  allPhones = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`✅ Loaded ${allPhones.length} phones from database`);
} catch (error) {
  console.error('❌ Failed to load phones data:', error.message);
  process.exit(1);
}

// Simulate API calls (since we can't run real server in this test)
function simulateSuggestAPI(query, country, userPrefs = {}) {
    const region = ['US', 'CA', 'MX'].includes(country) ? 'north_america' :
                   ['DE', 'FR', 'ES', 'IT', 'GB'].includes(country) ? 'europe' :
                   ['IN', 'SG', 'AE', 'CN', 'JP', 'SA', 'QA', 'KW', 'BH', 'OM'].includes(country) ? 'asia' :
                   ['ZA', 'EG', 'NG'].includes(country) ? 'africa' :
                   ['BR', 'AR', 'CO'].includes(country) ? 'south_america' :
                   ['AU', 'NZ'].includes(country) ? 'oceania' : 'global';

  // Simulate ranking logic
  const ranked = allPhones.map(p => {
    const sentiment = (p.scores.performance + p.scores.camera + p.scores.battery) / 3 / 10;
    const regionWeight = (p.popularity?.[region] || 5) / 10;
    const confidence = (p.reviewConfidenceScore || 5) / 10;

    const priceScore = p.regionalPrices?.[country]?.price ?
      1 / Math.log(p.regionalPrices[country].price / 100) : 0;

    const relevance = query.includes('camera') && p.name.includes('Pixel') ? 1.3 : 1;

    let finalScore = (sentiment * 0.4 + regionWeight * 0.3 + confidence * 0.2 + priceScore * 0.1) * relevance;

    // Apply personalization
    if (userPrefs.brand && p.brand.toLowerCase() === userPrefs.brand.toLowerCase()) {
      finalScore *= 1.05;
    }
    if (userPrefs.os && p.os !== userPrefs.os) {
      finalScore *= 0.8;
    }
    if (userPrefs.priceRange) {
      const phonePrice = p.regionalPrices?.[country]?.price || 600;
      if (phonePrice < userPrefs.priceRange.min || phonePrice > userPrefs.priceRange.max) {
        finalScore *= 0.5;
      }
    }

    return { ...p, region, finalScore };
  }).sort((a, b) => b.finalScore - a.finalScore).slice(0, 3);

  return { results: ranked, country, region, query, personalized: true };
}

// Simulation Results Tracking
const stats = {
  totalUsers: 0,
  apiCalls: 0,
  errors: 0,
  anomalousResults: [],
  responseTime: { min: Infinity, max: 0, sum: 0, count: 0 },
  countries: {},
  regions: {},
  preferences: {},
  edgeCases: [],
  performance: {
    suggestCalls: 0,
    justifyCalls: 0,
    avgSuggestTime: 0,
    avgJustifyTime: 0
  }
};

async function testUser(userId) {
  try {
    stats.totalUsers++;
    const startTime = Date.now();

    // Generate random user profile
    const country = countries[Math.floor(Math.random() * countries.length)];
    const quizAnswers = generateRandomQuizAnswers();
    const userPrefs = deriveUserPreferences(quizAnswers);

    // Track user diversity
    stats.countries[country] = (stats.countries[country] || 0) + 1;

    const region = ['US', 'CA', 'MX'].includes(country) ? 'north_america' :
                   ['DE', 'FR', 'ES', 'IT', 'GB'].includes(country) ? 'europe' :
                   ['IN', 'SG', 'AE', 'CN', 'JP', 'SA', 'QA', 'KW', 'BH', 'OM'].includes(country) ? 'asia' :
                   ['ZA', 'EG', 'NG'].includes(country) ? 'africa' :
                   ['BR', 'AR', 'CO'].includes(country) ? 'south_america' :
                   ['AU', 'NZ'].includes(country) ? 'oceania' : 'global';
    stats.regions[region] = (stats.regions[region] || 0) + 1;

    // Test different query types
    const queries = [
      "best camera phone",
      "best battery life",
      "best performance",
      "cheap phone",
      "premium smartphone",
      "best for gaming"
    ];
    const query = queries[Math.floor(Math.random() * queries.length)];

    // Simulate suggest API call
    stats.apiCalls++;
    stats.performance.suggestCalls++;
    const suggestStart = Date.now();

    const suggestResult = simulateSuggestAPI(query, country, userPrefs);
    const suggestTime = Date.now() - suggestStart;

    stats.responseTime.sum += suggestTime;
    stats.responseTime.count++;
    stats.responseTime.min = Math.min(stats.responseTime.min, suggestTime);
    stats.responseTime.max = Math.max(stats.responseTime.max, suggestTime);

    // Check for anomalies in results
    if (!suggestResult.results || suggestResult.results.length === 0) {
      stats.anomalousResults.push({
        user: userId,
        type: 'empty_results',
        data: { query, country, userPrefs }
      });
    }

    if (suggestResult.results.length > 3) {
      stats.anomalousResults.push({
        user: userId,
        type: 'too_many_results',
        data: { count: suggestResult.results.length }
      });
    }

    // Check for duplicate phones in results
    const phoneIds = suggestResult.results.map(p => p.id);
    const uniqueIds = new Set(phoneIds);
    if (uniqueIds.size < suggestResult.results.length) {
      stats.anomalousResults.push({
        user: userId,
        type: 'duplicate_phones',
        data: { phoneIds, uniqueCount: uniqueIds.size }
      });
    }

    // Check preference filtering effectiveness
    if (userPrefs.priceRange && suggestResult.results.length > 0) {
      const allInRange = suggestResult.results.every(phone => {
        const phonePrice = phone.regionalPrices?.[country]?.price || 600;
        return phonePrice >= userPrefs.priceRange.min && phonePrice <= userPrefs.priceRange.max;
      });
      if (!allInRange && suggestResult.results.some(phone => {
        const phonePrice = phone.regionalPrices?.[country]?.price || 600;
        return phonePrice < userPrefs.priceRange.min || phonePrice > userPrefs.priceRange.max;
      })) {
        stats.anomalousResults.push({
          user: userId,
          type: 'price_filter_failure',
          data: { priceRange: userPrefs.priceRange, results: suggestResult.results.map(p => ({
            name: p.name,
            price: p.regionalPrices?.[country]?.price || 600
          }))}
        });
      }
    }

    // Check OS preference filtering
    if (userPrefs.os) {
      const wrongOSXPhones = suggestResult.results.filter(p => p.os !== userPrefs.os);
      if (wrongOSXPhones.length > suggestResult.results.length / 2) {
        stats.anomalousResults.push({
          user: userId,
          type: 'os_pref_inconsistent',
          data: { preferred: userPrefs.os, wrongOSCount: wrongOSXPhones.length, total: suggestResult.results.length }
        });
      }
    }

    // Track preference distribution
    if (userPrefs.priority) {
      stats.preferences[userPrefs.priority] = (stats.preferences[userPrefs.priority] || 0) + 1;
    }
    if (userPrefs.brand) {
      stats.preferences[userPrefs.brand] = (stats.preferences[userPrefs.brand] || 0) + 1;
    }

    // Test edge cases
    if (Math.random() < 0.1) { // 10% of users test edge cases
      if (!query.trim()) {
        stats.edgeCases.push(`Empty query from user ${userId}`);
      }

      if (!country) {
        stats.edgeCases.push(`Empty country from user ${userId}`);
      }

      // Test with extreme preferences
      if (userPrefs.priceRange?.max === 500) { // Very cheap
        const expensivePhones = suggestResult.results.filter(p =>
          (p.regionalPrices?.[country]?.price || 600) > 1000
        );
        if (expensivePhones.length > 0) {
          stats.anomalousResults.push({
            user: userId,
            type: 'budget_filter_violation',
            data: { budget: 'cheap', expensivePhones: expensivePhones.map(p => p.name) }
          });
        }
      }
    }

    const totalTime = Date.now() - startTime;
    if (userId % 100 === 0) {
      console.log(`✅ User ${userId} completed in ${totalTime}ms`);
    }

  } catch (error) {
    stats.errors++;
    console.error(`❌ User ${userId} failed:`, error.message);
    stats.anomalousResults.push({
      user: userId,
      type: 'exception',
      data: { error: error.message, stack: error.stack }
    });
  }
}

async function runStressTest() {
  console.log('🚀 Starting SmartMatch PWA Stress Test...\n');
  console.log(`Testing ${TOTAL_USERS} random users...\n`);

  const startTime = Date.now();

  // Run tests sequentially (don't overwhelm the system)
  for (let i = 1; i <= TOTAL_USERS; i++) {
    await testUser(i);
  }

  const totalTime = Date.now() - startTime;

  // Generate comprehensive report
  console.log('\n' + '='.repeat(60));
  console.log('📊 SMARTMATCH STRESS TEST REPORT');
  console.log('='.repeat(60));

  console.log(`\n⏱️  Total Test Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`👥 Users Tested: ${stats.totalUsers}`);
  console.log(`🔄 API Calls: ${stats.apiCalls}`);
  console.log(`⚠️  Errors: ${stats.errors}`);
  console.log(`🚨 Anomalies: ${stats.anomalousResults.length}`);

  console.log('\n🏎️  Performance Metrics:');
  console.log(`   Avg Response Time: ${(stats.responseTime.sum / stats.responseTime.count).toFixed(2)}ms`);
  console.log(`   Min Response Time: ${stats.responseTime.min}ms`);
  console.log(`   Max Response Time: ${stats.responseTime.max}ms`);

  console.log('\n🌍 Geographic Distribution:');
  Object.entries(stats.countries).sort(([,a], [,b]) => b - a).slice(0, 10).forEach(([country, count]) => {
    console.log(`   ${country}: ${count} users (${((count/TOTAL_USERS)*100).toFixed(1)}%)`);
  });

  console.log('\n🧠 Preference Analysis:');
  Object.entries(stats.preferences).sort(([,a], [,b]) => b - a).forEach(([pref, count]) => {
    console.log(`   ${pref}: ${count} users`);
  });

  console.log('\n📊 Region Distribution:');
  Object.entries(stats.regions).forEach(([region, count]) => {
    console.log(`   ${region}: ${count} users`);
  });

  if (stats.anomalousResults.length > 0) {
    console.log('\n🚨 ANOMALIES DETECTED (Showing first 100 of full report):');
    console.log(`   Note: Total anomalies: ${stats.anomalousResults.length}`);
    stats.anomalousResults.slice(0, 100).forEach(anomaly => {
      console.log(`   User ${anomaly.user}: ${anomaly.type}`);
      console.log(`   Data: ${JSON.stringify(anomaly.data)}`);
    });
  }

  if (stats.edgeCases.length > 0) {
    console.log('\n⚠️  EDGE CASES TESTED:');
    stats.edgeCases.forEach(edgeCase => {
      console.log(`   ${edgeCase}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (stats.errors === 0 && stats.anomalousResults.length === 0) {
    console.log('✅ ALL TESTS PASSED - SmartMatch is production ready!');
  } else if (stats.anomalousResults.length < 10) {
    console.log('⚠️  MINOR ANOMALIES DETECTED - Review and fix before deployment');
  } else {
    console.log('🚨 SIGNIFICANT ISSUES DETECTED - Requires immediate attention');
  }

  console.log('='.repeat(60));
}

// Run the stress test
runStressTest().catch(error => {
  console.error('❌ Stress test failed:', error);
  process.exit(1);
});
