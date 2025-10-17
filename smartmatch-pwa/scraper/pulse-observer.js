// pulse-observer.js - SmartMatch Pulse Observer (Zero-Cost Pro+)
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const PULSE_REPORT = path.join(__dirname, 'pulse-report.json');
const METRICS_FILE = path.join(__dirname, '../public/data/metrics.json');

// Pulse Observer Monitor
class PulseObserver {
    constructor() {
        this.report = {};
    }

    // Load current metrics
    async loadMetrics() {
        try {
            const data = await fsPromises.readFile(METRICS_FILE, 'utf8');
            return JSON.parse(data);
        } catch {
            return { tokensUsed: 0, cacheHits: 0, confidenceMean: 0, runs: 0 };
        }
    }

    // Load existing pulse report
    async loadReport() {
        try {
            const data = await fsPromises.readFile(PULSE_REPORT, 'utf8');
            const report = JSON.parse(data);

            // Ensure numeric fields are properly initialized
            report.sessions = report.sessions || [];
            report.totalTokens = Number.isFinite(report.totalTokens) ? report.totalTokens : 0;
            report.totalCacheHits = Number.isFinite(report.totalCacheHits) ? report.totalCacheHits : 0;
            report.totalPhones = Number.isFinite(report.totalPhones) ? report.totalPhones : 0;
            report.avgConfidence = Number.isFinite(report.avgConfidence) ? report.avgConfidence : 0;

            return report;
        } catch {
            return {
                sessions: [],
                totalTokens: 0,
                totalCacheHits: 0,
                totalPhones: 0,
                avgConfidence: 0,
                lastUpdated: null
            };
        }
    }

    // Monitor current session
    async monitorSession() {
        console.log('\n🔄 SmartMatch Pulse Observer\n');

        const metrics = await this.loadMetrics();
        const timestamp = new Date().toISOString();
        const sessionId = `session-${Date.now()}`;

        // Calculate derived stats
        const cacheMisses = metrics.runs - metrics.cacheHits;
        const hitRatio = metrics.runs > 0 ? ((metrics.cacheHits / metrics.runs) * 100).toFixed(1) : 0;
        const efficiency = cacheMisses > 0 ? (metrics.tokensUsed / cacheMisses).toFixed(0) : 0;
        const tokenLimit = process.env.TOKEN_LIMIT_PER_RUN ? parseInt(process.env.TOKEN_LIMIT_PER_RUN, 10) : 20000;
        const budgetUsed = tokenLimit > 0 ? ((metrics.tokensUsed / tokenLimit) * 100).toFixed(0) : 0;

        // Current session data
        const session = {
            id: sessionId,
            timestamp,
            tokensUsed: metrics.tokensUsed || 0,
            tokensPerPhone: efficiency || 0,
            cacheHits: metrics.cacheHits || 0,
            cacheMisses: cacheMisses || 0,
            hitRatio: `${hitRatio}%`,
            avgConfidence: metrics.confidenceMean ? metrics.confidenceMean.toFixed(1) : '0.0',
            runs: metrics.runs || 0,
            processedPhones: metrics.runs || 0, // Approximation from runs
        };

        // Console output
        console.log('📊 Current Session Metrics');
        console.log(`   Tokens Used:     ${session.tokensUsed} total`);
        console.log(`   Tokens/Phone:    ${session.tokensPerPhone} avg`);
        console.log(`   Cache Hits:      ${session.cacheHits}`);
        console.log(`   Cache Misses:    ${session.cacheMisses}`);
        console.log(`   Hit Ratio:       ${session.hitRatio}`);
        console.log(`   AVG Confidence:  ${session.avgConfidence}/10`);
        console.log(`   Phones Processed: ${session.processedPhones}`);
        console.log(`   Efficiency:       ${session.efficiency}`);

        // Performance analysis
        const perfLevel = session.tokensPerPhone < 5000 ? 'Excellent' :
                         session.tokensPerPhone < 10000 ? 'Good' : 'Needs Optimization';

        console.log(`   Efficiency:       ${perfLevel}`);

        // Update pulse report
        await this.updateReport(session);

        return session;
    }

    // Update pulse report
    async updateReport(session) {
        const report = await this.loadReport();

        // Ensure sessions array exists and is an array
        report.sessions = Array.isArray(report.sessions) ? report.sessions : [];

        // Ensure numeric fields are initialized
        report.totalTokens = Number.isFinite(report.totalTokens) ? report.totalTokens : 0;
        report.totalCacheHits = Number.isFinite(report.totalCacheHits) ? report.totalCacheHits : 0;
        report.totalPhones = Number.isFinite(report.totalPhones) ? report.totalPhones : 0;

        // Add session
        report.sessions.push(session);
        report.totalTokens = (report.totalTokens || 0) + session.tokensUsed;
        report.totalCacheHits = (report.totalCacheHits || 0) + session.cacheHits;
        report.totalPhones = (report.totalPhones || 0) + session.processedPhones;
        report.avgConfidence = report.sessions.length > 0 ?
            (report.sessions.reduce((sum, s) => sum + parseFloat(s.avgConfidence || 0), 0) / report.sessions.length).toFixed(1) : 0;
        report.lastUpdated = session.timestamp;

        // Keep only last 10 sessions
        if (report.sessions.length > 10) {
            report.sessions = report.sessions.slice(-10);
        }

        await fsPromises.writeFile(PULSE_REPORT, JSON.stringify(report, null, 2));

        console.log('\n📈 Pulse Report Updated');
        console.log(`   Sessions Recorded: ${report.sessions.length}`);
        console.log(`   Total Tokens:      ${report.totalTokens}`);
        console.log(`   Total Cache Hits:  ${report.totalCacheHits}`);
        console.log(`   Total Phones:      ${report.totalPhones}`);
        console.log(`   Overall Confidence: ${report.avgConfidence}/10`);
    }

    // Display historical analysis
    async showHistory() {
        const report = await this.loadReport();

        console.log('\n📈 Pulse History (Last 10 Sessions)');

        if (report.sessions.length === 0) {
            console.log('   No sessions recorded yet');
            return;
        }

        report.sessions.forEach((session, i) => {
            const idx = (i + 1).toString().padStart(2, ' ');
            console.log(`   ${idx}. ${new Date(session.timestamp).toLocaleString()}`);
            console.log(`       Tokens: ${session.tokensUsed} | Hit Ratio: ${session.hitRatio}`);
            console.log(`       Phones: ${session.processedPhones} | Confidence: ${session.avgConfidence}`);
        });
    }
}

const OUTPUT_FILE = path.join(__dirname, "pulse-report.json");

// Main execution - Always creates output file to prevent workflow failures
async function main() {
    try {
        const observer = new PulseObserver();
        const session = await observer.monitorSession();
        await observer.showHistory();

        console.log('\n✅ Pulse Observer Complete\n');
    } catch (err) {
        console.error('❌ Pulse Observer failed:', err.message);

        // Try to load existing report first to preserve any successful data
        let existingReport = null;
        try {
            existingReport = JSON.parse(await fsPromises.readFile(PULSE_REPORT, 'utf8').catch(() => null));
        } catch {}

        const fallbackReport = existingReport || {
            sessions: [],
            totalTokens: 0,
            totalCacheHits: 0,
            totalPhones: 0,
            avgConfidence: 0,
            lastUpdated: null
        };

        // Update with error info
        fallbackReport.timestamp = new Date().toISOString();
        fallbackReport.status = "Error state - fallback data";
        fallbackReport.error = err.message;
        fallbackReport.cacheHealth = "⚠️ Error state";

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fallbackReport, null, 2));
        console.log('📄 Created fallback report');
    }
}

if (require.main === module) {
    main();
}

module.exports = { PulseObserver };
