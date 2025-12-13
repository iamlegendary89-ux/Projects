
import { readFile, writeFile } from "fs/promises";

async function cleanParams() {
  const path = "data/phones.json";
  const data = JSON.parse(await readFile(path, "utf-8"));
  let cleanCount = 0;

  const poisonedUrls = [
    "https://www.androidauthority.com/samsung-galaxy-z-flip-7-review-3582634/",
    "https://www.phonearena.com/reviews/honor-magic-7-pro-review_id6754",
  ];

  for (const brand in data.brands) {
    for (const model in data.brands[brand]) {
      const entry = data.brands[brand][model];
      if (!entry.urls) {continue;}

      let isPoisoned = false;
      for (const key in entry.urls) {
        entry.urls[key].forEach((u: any) => {
          if (poisonedUrls.includes(u.cse)) {
            isPoisoned = true;
          }
        });
      }

      if (isPoisoned) {
        console.log(`🧹 Cleaning poisoned entry: ${brand} ${model}`);
        entry.urls = {}; // Nuke it to force re-discovery
        cleanCount++;
      }
    }
  }

  if (cleanCount > 0) {
    await writeFile(path, JSON.stringify(data, null, 2));
    console.log(`\n✅ Cleaned ${cleanCount} phones. Run discovery again to repopulate.`);
  } else {
    console.log("\n✨ No poisoned phones found.");
  }
}

cleanParams();
