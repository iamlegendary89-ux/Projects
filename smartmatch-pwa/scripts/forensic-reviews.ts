
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";

interface FileMetrics {
  phone: string;
  file: string;
  sizeBytes: number;
  wordCount: number;
  hasSpecs: boolean;
  hasReview: boolean;
  isDuplicate: boolean;
  anomaly?: string;
}

async function analyze() {
  const root = "data/content";
  let phones: string[] = [];
  try {
    phones = await readdir(root);
  } catch (e) {
    console.error("Root data/content not found");
    return;
  }

  const report: FileMetrics[] = [];
  const contentHashes = new Map<string, string>(); // rough duplication check using snippet

  console.log(`🔍 Scanning ${phones.length} phone directories...`);

  for (const phone of phones) {
    const dir = join(root, phone);
    // Ensure it's a directory
    try {
      if (!(await stat(dir)).isDirectory()) { continue; }
    } catch { continue; }

    const files = await readdir(dir);

    for (const file of files) {
      if (!file.endsWith(".txt")) { continue; }

      const path = join(dir, file);
      const stats = await stat(path);
      const content = await readFile(path, "utf-8");

      const sizeBytes = stats.size;
      const wordCount = content.split(/\s+/).length;

      // Quality Checks
      let anomaly: string | undefined = undefined;
      if (sizeBytes < 100) { anomaly = "CRITICAL: File too small (<100b)"; }
      else if (sizeBytes > 500000) { anomaly = "WARNING: File suspiciously large (>500kb)"; }
      else if (wordCount < 50) { anomaly = "CRITICAL: Low word count (<50)"; }
      else if (content.includes("Lorem Ipsum")) { anomaly = "CRITICAL: Placeholder text found"; }
      else if (content.includes("403 Forbidden") || content.includes("Access Denied")) { anomaly = "CRITICAL: Scrape bloackage detected"; }

      // Duplication Check (First 100 chars hash)
      const signature = content.substring(0, 100).trim();
      const isDuplicate = contentHashes.has(signature) && contentHashes.get(signature) !== `${phone}/${file}`;
      if (isDuplicate) {
        anomaly = `WARNING: Possible duplicate content of ${contentHashes.get(signature)}`;
      } else {
        contentHashes.set(signature, `${phone}/${file}`);
      }

      const metric: FileMetrics = {
        phone,
        file,
        sizeBytes,
        wordCount,
        hasSpecs: testKeyword(content, ["specification", "specs", "display", "processor", "ram"]),
        hasReview: testKeyword(content, ["verdict", "conclusion", "pros", "cons", "review"]),
        isDuplicate,
      };
      if (anomaly) {
        metric.anomaly = anomaly;
      }
      report.push(metric);
    }
  }

  generateReport(report);
}

function testKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function generateReport(metrics: FileMetrics[]) {
  const issues = metrics.filter(m => m.anomaly);
  const valid = metrics.filter(m => !m.anomaly);

  console.log("\n📊 FORENSIC ANALYSIS SUMMARY");
  console.log("============================");
  console.log(`Total Files Scanned: ${metrics.length}`);
  console.log(`Healthy Files:       ${valid.length}`);
  console.log(`Anomalies Found:     ${issues.length}`);

  if (issues.length > 0) {
    console.log("\n🚨 ANOMALIES DETECTED:");
    issues.forEach(m => {
      console.log(`[${m.phone}] ${m.file} -> ${m.anomaly} (Size: ${m.sizeBytes}b, Words: ${m.wordCount})`);
    });
  } else {
    console.log("\n✅ No critical anomalies detected.");
  }

  // Check completeness per phone
  // Fix Set iteration for old targets
  const phones = Array.from(new Set(metrics.map(m => m.phone)));
  console.log("\n📱 PHONE COMPLETENESS CHECK:");
  phones.forEach(p => {
    const phoneFiles = metrics.filter(m => m.phone === p);
    const reviewCount = phoneFiles.filter(m => m.hasReview).length;
    const specCount = phoneFiles.filter(m => m.hasSpecs).length;
    const status = reviewCount >= 3 ? "✅" : reviewCount > 0 ? "⚠️" : "❌";
    console.log(`${status} ${p}: ${phoneFiles.length} files (${reviewCount} reviews, ${specCount} specs)`);
  });
}

analyze().catch(console.error);
