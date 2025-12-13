
import { readFile, writeFile } from "fs/promises";

interface UrlEntry {
    cse?: string;
    archive?: string;
    source?: string;
}

interface PhoneEntry {
    releaseDate?: string;
    urls?: Record<string, UrlEntry[]>;
}

interface PhonesConfig {
    brands: Record<string, Record<string, PhoneEntry>>;
}

async function analyze() {
  const path = "data/phones.json";
  const outputPath = "logs/link-analysis-output.txt";
  let output = "";

  const log = (msg: string) => {
    console.log(msg);
    output += msg + "\n";
  };

  log(`🔍 Reading ${path}...`);

  let data: PhonesConfig;
  try {
    const content = await readFile(path, "utf-8");
    data = JSON.parse(content);
  } catch (e) {
    console.error("Failed to read phones.json", e);
    return;
  }

  let totalPhones = 0;
  let totalLinks = 0;
  const domainCounts: Record<string, number> = {};
  const brokenLinks: string[] = [];
  const duplicateLinks = new Map<string, string[]>();
  const linkTypes = { cse: 0, archive: 0, source: 0 };
  const phonesWithNoLinks: string[] = [];

  for (const brand in data.brands) {
    for (const model in data.brands[brand]) {
      const phoneId = `${brand} ${model}`;
      totalPhones++;
      const entry = data.brands[brand][model];

      if (!entry) {continue;}

      if (!entry.urls || Object.keys(entry.urls).length === 0) {
        phonesWithNoLinks.push(phoneId);
        continue;
      }

      for (const key in entry.urls) {
        const urlEntries = entry.urls[key];
        if (!Array.isArray(urlEntries)) {continue;}

        urlEntries.forEach((u, idx) => {
          const location = `${phoneId} [${key}][${idx}]`;

          // Check link types
          if (u.cse) {
            linkTypes.cse++;
            analyzeUrl(u.cse, location, domainCounts, duplicateLinks, brokenLinks);
          }
          if (u.archive) {
            linkTypes.archive++;
            analyzeUrl(u.archive, location, domainCounts, duplicateLinks, brokenLinks);
          }
          if (u.source) {
            linkTypes.source++;
            // analyzeUrl(u.source, location, domainCounts, duplicateLinks, brokenLinks); // Source is just a string, not a URL
          }

          if (!u.cse && !u.archive) {
            brokenLinks.push(`${location}: No actionable links (CSE/Archive)`);
          }
        });
      }
    }
  }

  // Calculate duplicates > 1
  const actualDuplicates = [...duplicateLinks.entries()].filter(([, locs]) => locs.length > 1);
  totalLinks = linkTypes.cse + linkTypes.archive; // Source is metadata

  log("\n📊 LINK ANALYSIS SUMMARY");
  log("========================");
  log(`Total Phones:       ${totalPhones}`);
  log(`Phones w/o Links:   ${phonesWithNoLinks.length}`);
  log(`Total Actionable Links: ${totalLinks}`);
  log(`  - CSE Links:      ${linkTypes.cse}`);
  log(`  - Archive Links:  ${linkTypes.archive}`);
  log(`  - Source Labels:  ${linkTypes.source}`);

  log("\n🌐 TOP 10 DOMAINS:");
  Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([d, c]) => log(`  - ${d}: ${c}`));

  if (phonesWithNoLinks.length > 0) {
    log("\n⚠️ PHONES WITH NO LINKS (Sample):");
    phonesWithNoLinks.slice(0, 10).forEach(p => log(`  - ${p}`));
    if (phonesWithNoLinks.length > 10) {log(`  ... and ${phonesWithNoLinks.length - 10} more`);}
  }

  if (brokenLinks.length > 0) {
    log(`\n❌ BROKEN/EMPTY ENTRIES: ${brokenLinks.length}`);
    brokenLinks.slice(0, 5).forEach(b => log(`  - ${b}`));
    if (brokenLinks.length > 5) {log(`  ...and ${brokenLinks.length - 5} more`);}
  }

  if (actualDuplicates.length > 0) {
    log(`\n👯 DUPLICATE LINKS (${actualDuplicates.length}):`);
    actualDuplicates.slice(0, 5).forEach(([url, locs]) => {
      log(`  - ${url} (Seen ${locs.length} times)`);
    });
    if (actualDuplicates.length > 5) {log(`  ...and ${actualDuplicates.length - 5} more`);}
  }

  await writeFile(outputPath, output, "utf-8");
  console.log(`\n✅ Report saved to ${outputPath}`);
}

function analyzeUrl(url: string, location: string, domains: Record<string, number>, duplicates: Map<string, string[]>, broken: string[]) {
  if (!url || typeof url !== "string") {return;}

  // Normalize
  const cleanUrl = url.trim();
  if (cleanUrl.length === 0 || cleanUrl === "N/A") {
    broken.push(`${location}: Invalid URL "${url}"`);
    return;
  }

  try {
    const u = new URL(cleanUrl);
    const domain = u.hostname.replace(/^www\./, "");
    domains[domain] = (domains[domain] || 0) + 1;

    // Track duplicates (globally across the file)
    if (!duplicates.has(cleanUrl)) {duplicates.set(cleanUrl, []);}
        duplicates.get(cleanUrl)!.push(location);

  } catch {
    broken.push(`${location}: Malformed URL "${url}"`);
  }
}

analyze().catch(console.error);
