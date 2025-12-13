// ORIGINAL: createTelemetry
// Extracted by LZFOF v1.0.0

interface Metrics {
  scrapeSuccess: number;
  scrapeFailed: number;
  heroSuccess: number;
  heroSkipped: number;
  heroFailed: number;
  startTime: number;
}

type MetricKey = keyof Omit<Metrics, 'startTime'>;

export interface TelemetryInstance {
  increment: (key: MetricKey) => void;
  logSummary: () => void;
}

export function createTelemetry(): TelemetryInstance {
  const metrics: Metrics = {
    scrapeSuccess: 0,
    scrapeFailed: 0,
    heroSuccess: 0,
    heroSkipped: 0,
    heroFailed: 0,
    startTime: Date.now(),
  };

  return {
    increment: (key: MetricKey) => {
      metrics[key]++;
    },
    logSummary: () => {
      const durationSeconds = (Date.now() - metrics.startTime) / 1000;
      console.log("\n📊 TELEMETRY SUMMARY");
      console.log(`   Scrape Success:    ${metrics.scrapeSuccess}/${metrics.scrapeSuccess + metrics.scrapeFailed}`);
      console.log(`   Hero Images:       ${metrics.heroSuccess} success, ${metrics.heroSkipped} skipped, ${metrics.heroFailed} failed`);
      console.log(`   Duration:          ${durationSeconds.toFixed(1)}s\n`);
    },
  };
}
