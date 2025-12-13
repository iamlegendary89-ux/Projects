import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

// Since pipeline.ts uses execSync and is designed to run as a script,
// we test exported logic patterns and file operations

describe("Pipeline Configuration", () => {
  const SCRIPTS_DIR = path.join(process.cwd(), "scripts");

  it("should have all required pipeline scripts", () => {
    const requiredScripts = [
      "pipeline.ts",
      "discovery.ts",
      "enrichment.ts",
      "OSET.ts",
      "sync.ts",
      "generate-report.ts",
      "clean-logs.ts",
    ];

    for (const script of requiredScripts) {
      const exists = fs.existsSync(path.join(SCRIPTS_DIR, script));
      expect(exists, `${script} should exist`).toBe(true);
    }
  });

  it("should have valid phones.json", () => {
    const phonesPath = path.join(process.cwd(), "data/phones.json");
    expect(fs.existsSync(phonesPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(phonesPath, "utf-8"));
    expect(content.brands).toBeDefined();
    expect(typeof content.brands).toBe("object");
  });

  it("should have pipeline config with correct structure", async () => {
    const pipelineContent = fs.readFileSync(
      path.join(SCRIPTS_DIR, "pipeline.ts"),
      "utf-8",
    );

    // Check for key configuration
    expect(pipelineContent).toContain("CONFIG");
    expect(pipelineContent).toContain("PATHS");
    expect(pipelineContent).toContain("THRESHOLDS");
    expect(pipelineContent).toContain("RETRY");
  });
});

describe("Pipeline File Operations", () => {
  const DATA_DIR = path.join(process.cwd(), "data");
  const LOGS_DIR = path.join(process.cwd(), "logs");

  it("should have data directory", () => {
    expect(fs.existsSync(DATA_DIR)).toBe(true);
  });

  it("should have logs directory or be able to create it", () => {
    // logs directory may or may not exist
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    expect(fs.existsSync(LOGS_DIR)).toBe(true);
  });

  it("should have processed-phones.json", () => {
    const processedPath = path.join(DATA_DIR, "processed-phones.json");
    expect(fs.existsSync(processedPath)).toBe(true);
  });
});

describe("Pipeline Retry Logic", () => {
  // Test the retry pattern used in pipeline.ts
  const MAX_ATTEMPTS = 2;
  const DELAY_MS = 100;

  async function runWithRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = MAX_ATTEMPTS,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      }
    }

    throw lastError;
  }

  it("should succeed on first try", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await runWithRetry(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry and succeed on second try", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");

    const result = await runWithRetry(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should throw after max retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    await expect(runWithRetry(fn, 2)).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("Pipeline Time Utilities", () => {
  function time(): string {
    return new Date().toISOString().slice(11, 19);
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  it("should format time as HH:MM:SS", () => {
    const result = time();
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it("should sleep for specified duration", async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(45);
    expect(elapsed).toBeLessThan(150);
  });
});

describe("Pipeline Environment", () => {
  it("should have required environment for scripts", () => {
    // Check node version
    const nodeVersion = parseInt(process.versions.node.split(".")[0]!, 10);
    expect(nodeVersion).toBeGreaterThanOrEqual(18);
  });

  it("should have package.json with pipeline scripts", () => {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    expect(pkg.scripts.pipeline).toBeDefined();
    expect(pkg.scripts["pipeline:discover"]).toBeDefined();
    expect(pkg.scripts["pipeline:enrich"]).toBeDefined();
    expect(pkg.scripts["pipeline:sync"]).toBeDefined();
  });
});
