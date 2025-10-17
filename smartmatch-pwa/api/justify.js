import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  try {
    const { results, country, region } = JSON.parse(req.body || "{}");

    if (!results?.length) {
      return res.status(400).json({ error: "No results to justify" });
    }

    if (!country || !region) {
      return res.status(400).json({ error: "Country and region required" });
    }

    const prompt = `You are SmartMatch AI, a helpful phone recommendation assistant.

Explain why each of the following phones is a great choice for users in ${country} (${region} region). Focus on practical benefits relevant to that location.

Requirements:
- Keep tone natural, concise, and localized (no marketing fluff)
- Include 1 practical reason per device
- Consider regional pricing, availability, and preferences
- Base explanations on device features and category

Phones to explain:
${results.map((r, i) => `${i + 1}. ${r.name} - ${r.category}`).join("\n")}

Format: Numbered list, one line per device.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: "You are a concise, practical AI that explains phone recommendations with real value for users."
    });

    const response = await model.generateContent(prompt);
    const text = response.response.text();

    // Parse the response into structured explanations
    const explanations = text.trim().split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/^(\d+)\.\s*(.+)$/);
        return match ? { id: parseInt(match[1]), text: match[2].trim() } : null;
      })
      .filter(Boolean);

    res.status(200).json({
      explanations,
      country,
      region,
      generated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Justification API error:', error);
    res.status(500).json({
      error: 'Failed to generate explanations',
      details: error.message
    });
  }
}
