// pulse-anomaly-calculator.js - Calculates a stability index for the latest AI pipeline run.
const fs = require('fs');
const path = require('path');

const PULSE_REPORT_FILE = path.join(__dirname, 'pulse-report.json');
const STATUS_FILE = path.join(__dirname, '../PULSE_STATUS.md');

function calculateStabilityIndex(session) {
    if (!session) return 0;

    let score = 100;

    // 1. Failure Rate (up to 40 points)
    const totalAttempts = session.phonesProcessed + session.failures;
    if (totalAttempts > 0) {
        const failurePercentage = (session.failures / totalAttempts) * 100;
        if (failurePercentage > 50) score -= 40;
        else if (failurePercentage > 20) score -= 25;
        else if (failurePercentage > 5) score -= 10;
    }

    // 2. Average Confidence (up to 30 points)
    if (session.avgConfidence < 4) score -= 30;
    else if (session.avgConfidence < 6) score -= 15;
    else if (session.avgConfidence < 8) score -= 5;

    // 3. Cache Hit Ratio (up to 20 points)
    const hitRatio = parseFloat(session.hitRatio);
    if (hitRatio < 10) score -= 20;
    else if (hitRatio < 30) score -= 10;
    else if (hitRatio < 50) score -= 5;
    
    // 4. Efficiency (up to 10 points)
    if (session.efficiency === 'Poor') score -= 10;

    return Math.max(0, Math.round(score));
}

function main() {
    console.log('🔍 Calculating Pulse Anomaly Score...');
    try {
        const report = JSON.parse(fs.readFileSync(PULSE_REPORT_FILE, 'utf8'));
        const latestSession = report.sessions && report.sessions.length > 0 ? report.sessions[report.sessions.length - 1] : null;

        if (!latestSession) {
            throw new Error("No session data found in pulse report.");
        }

        const stabilityIndex = calculateStabilityIndex(latestSession);
        console.log(`   - Stability Index: ${stabilityIndex}/100`);

        const badge = `🧮 Tokens: ${latestSession.tokensUsed} | ⚙️ Confidence: ${latestSession.avgConfidence}/10 | 📈 Cache: ${latestSession.hitRatio} | 📉 Failures: ${latestSession.failures} | 💡 Stability: ${stabilityIndex}/100`;
        const content = `# SmartMatch AI Pulse Status\n\n${badge}\n\n*Last updated: ${new Date().toLocaleString()}*`;
        
        fs.writeFileSync(STATUS_FILE, content);
        console.log('✅ Pulse status badge updated with anomaly score.');

    } catch (e) {
        console.error('❌ Failed to calculate anomaly score:', e.message);
        const errorBadge = `🧮 Status: Error | ⚙️ Could not calculate pulse | 📈 N/A`;
        const content = `# SmartMatch AI Pulse Status\n\n${errorBadge}\n\n*Last updated: ${new Date().toLocaleString()}*`;
        fs.writeFileSync(STATUS_FILE, content);
    }
}

main();
