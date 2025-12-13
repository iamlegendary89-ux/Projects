
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: resolve(__dirname, ".env.local") });

async function testCSE() {
    const apiKey = process.env["GOOGLE_CSE_API_KEY"];
    const cx = process.env["GOOGLE_CSE_ID"];

    console.log("--- START TEST ---");
    console.log(`API Key present: ${!!apiKey}`);
    console.log(`CX present: ${!!cx}`);

    if (!apiKey || !cx) {
        console.error("Missing credentials!");
        return;
    }

    const query = "OnePlus 13 review";
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=1`;

    console.log(`Querying: ${url.replace(apiKey, "API_KEY")}`);

    try {
        const res = await axios.get(url);
        const items = res.data.items || [];
        console.log(`Found ${items.length} results.`);
        if (items.length > 0) {
            console.log(`First result: ${items[0].link}`);
        }
    } catch (err: any) {
        console.error("Search failed!");
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error(`Data: ${JSON.stringify(err.response.data)}`);
        } else {
            console.error(`Error: ${err.message}`);
        }
    }
    console.log("--- END TEST ---");
}

testCSE().catch(e => console.error("Fatal:", e));
