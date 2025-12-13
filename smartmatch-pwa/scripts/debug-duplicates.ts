
import { readFile } from "fs/promises";

async function investigate() {
  const path = "worker/data/phones.json"; // Fixed path
  const raw = await readFile(path, "utf-8");
  const data = JSON.parse(raw);

  const u1 = "https://www.androidauthority.com/samsung-galaxy-z-flip-7-review-3582634/";
  const u2 = "https://www.phonearena.com/reviews/honor-magic-7-pro-review_id6754";
  const targetUrls = [u1, u2];

  const findings: Record<string, string[]> = {
    [u1]: [],
    [u2]: [],
  };

  for (const brand in data.brands) {
    for (const model in data.brands[brand]) {
      const ph = data.brands[brand][model];
      const urls = ph.urls || {};
      for (const key in urls) {
         
        urls[key].forEach((u: any) => {
          if (targetUrls.includes(u.cse)) {
            const list = findings[u.cse];
            if (list) {list.push(`${brand} ${model} [${key}]`);}
          }
        });
      }
    }
  }

  console.log("--- DUPLICATION VICTIMS ---");
  console.log("URL 1: Z Flip 7 Review (Android Authority)");
  findings[u1]?.forEach((p: string) => console.log(`  - ${p}`));

  console.log("\nURL 2: Honor Magic 7 Pro Review (PhoneArena)");
  findings[u2]?.forEach((p: string) => console.log(`  - ${p}`));
}

investigate();
