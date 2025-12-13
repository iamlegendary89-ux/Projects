// VARIANT 2: Class-based with typed keys
// More structured, extends easily

type MetricKey = 'scrapeSuccess' | 'scrapeFailed' | 'heroSuccess' | 'heroSkipped' | 'heroFailed';

export class Telemetry {
    private metrics: Record<MetricKey, number> = {
        scrapeSuccess: 0, scrapeFailed: 0,
        heroSuccess: 0, heroSkipped: 0, heroFailed: 0,
    };
    private startTime = Date.now();

    increment(key: MetricKey) { this.metrics[key]++; }

    get(key: MetricKey) { return this.metrics[key]; }

    logSummary() {
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
        const { scrapeSuccess, scrapeFailed, heroSuccess, heroSkipped, heroFailed } = this.metrics;

        console.log(`\n📊 Telemetry Summary`);
        console.log(`   Scrape: ${scrapeSuccess}/${scrapeSuccess + scrapeFailed}`);
        console.log(`   Hero: ${heroSuccess}/${heroSuccess + heroSkipped + heroFailed}`);
        console.log(`   Duration: ${duration}s\n`);
    }
}

export function createTelemetry() { return new Telemetry(); }
