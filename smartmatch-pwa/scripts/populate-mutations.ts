// Populate mutation test expected values
import fs from "fs";

const testFile = "./tests/addDays.test.json";
const data = JSON.parse(fs.readFileSync(testFile, "utf8"));

// Original addDays function
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0] || "";
}

let populated = 0;
for (const c of data.cases) {
  if (c.expected === null) {
    try {
      const args = Array.isArray(c.input) ? c.input : [c.input];
      c.expected = addDays(args[0], args[1]);
      populated++;
    } catch (e) {
      c.expected = "ERROR";
      populated++;
    }
  }
}

fs.writeFileSync(testFile, JSON.stringify(data, null, 2));
console.log(`✅ Populated ${populated} mutation expected values`);
