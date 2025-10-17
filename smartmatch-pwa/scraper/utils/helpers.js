// scraper/utils/helpers.js

function cleanJsonString(text) {
    if (!text) return null;
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) return match[1].trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) return text.substring(jsonStart, jsonEnd + 1);
    return text;
}

function normalizePhoneName(name) {
    return name
        .toLowerCase()
        .replace(/\(.*\)/g, '') // Remove text in parentheses
        .replace(/pro max/g, 'pro max')
        .replace(/plus/g, '+')
        .replace(/[\s-]+/g, ' ') // Replace spaces and hyphens with a single space
        .trim();
}

module.exports = {
    cleanJsonString,
    normalizePhoneName,
};
