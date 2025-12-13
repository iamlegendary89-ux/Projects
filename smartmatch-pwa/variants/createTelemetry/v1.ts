// VARIANT 1: Minimal telemetry - inline metrics object
// Removes createTelemetry wrapper

interface Metrics {
    scrapeSuccess: number;
    scrapeFailed: number;
    heroSuccess: number;
    heroSkipped: number;
    heroFailed: number;
    startTime: number;
}

export function createTelemetry() {
    const metrics: Metrics = {
        scrapeSuccess: 0, scrapeFailed: 0,
        heroSuccess: 0, heroSkipped: 0, heroFailed: 0,
        startTime: Date.now(),
    };

    return {
        increment: (key: keyof Omit<Metrics, 'startTime'>) => { metrics[key]++; },
        logSummary: () => {
            const sec = (Date.now() - metrics.startTime) / 1000;
            console.log(`\n📊 Telemetry Summary`);
            console.log(`   Scrape: ${metrics.scrapeSuccess} success, ${metrics.scrapeFailed} failed`);
            console.log(`   Hero: ${metrics.heroSuccess} success, ${metrics.heroSkipped} skipped, ${metrics.heroFailed} failed`);
            console.log(`   Duration: ${sec.toFixed(1)}s\n`);
        },
    };
}
