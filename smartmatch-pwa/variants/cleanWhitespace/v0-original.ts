// ORIGINAL: Production implementation
// Extracted by LZFOF v1.0.0

function cleanWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/^\s+|\s+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
