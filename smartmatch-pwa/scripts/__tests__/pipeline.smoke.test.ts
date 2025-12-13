import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Pipeline Smoke Tests", () => {
  const SCRIPTS_DIR = path.join(__dirname, "..");

  it("all pipeline scripts exist", () => {
    const required = [
      "pipeline.ts",
      "discovery.ts",
      "enrichment.ts",
      "OSET.ts",
      "sync.ts",
      "generate-report.ts",
      "clean-logs.ts",
    ];

    for (const script of required) {
      const exists = fs.existsSync(path.join(SCRIPTS_DIR, script));
      expect(exists, `${script} should exist`).toBe(true);
    }
  });

  it("config files exist", () => {
    const required = [
      "data/phones.json",
      "package.json",
      "tsconfig.json",
    ];

    for (const file of required) {
      const exists = fs.existsSync(path.join(process.cwd(), file));
      expect(exists, `${file} should exist`).toBe(true);
    }
  });

  it("phones.json has valid structure", () => {
    const phonesPath = path.join(process.cwd(), "data/phones.json");
    const content = JSON.parse(fs.readFileSync(phonesPath, "utf-8"));

    expect(content.brands).toBeDefined();
    expect(typeof content.brands).toBe("object");
    expect(Object.keys(content.brands).length).toBeGreaterThan(0);
  });
});
