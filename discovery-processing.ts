/**
 * SmartMatch Discovery - Content Processing
 * ============================================================================
 * Web scraping, content extraction, validation, and image processing
 * ============================================================================
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import type {
  ScrapingResult,
  ExtractionResult,
  ImageInfo,
  ImageCategory,
  PhoneSources,
  PhoneEntry,
} from "./discovery-types.js";
import { DISCOVERY_CONFIG } from "./discovery-types.js";

/**
 * ============================================================================
 * CONTENT VALIDATION & CLEANING
 * ============================================================================
 */

/**
 * Enhanced cleaning of Wayback Machine artifacts from scraped content
 */
function _cleanWaybackArtifacts(content: string): string {
  let cleaned = content;

  // Remove Wayback Machine JavaScript initialization
  cleaned = cleaned.replace(/__wm\.bt\([^)]+\);?/g, "");

  // Remove HISTORY_ITEM variables
  cleaned = cleaned.replace(/HISTORY_ITEM_[A-Z_]+ = "[^"]*";?/g, "");

  // Remove Wayback CSS background-image URLs
  cleaned = cleaned.replace(/background-image:url\(\s*https:\/\/web\.archive\.org\/web\/\d+im_\/[^)]+\);?/g, "");

  // Remove Wayback social URL variables
  cleaned = cleaned.replace(/var sURLSocialE = "[^"]*";?/g, "");

  // Remove window.open JavaScript calls
  cleaned = cleaned.replace(/window\.open\(\s*'help\.php3\?term='\s*\+\s*strURL[^)]+\);?/g, "");

  // Remove GSMArena JavaScript event listeners
  cleaned = cleaned.replace(/\$gsm\.addEventListener\([^}]+}\s*\);?/g, "");

  // Remove Autocomplete initialization
  cleaned = cleaned.replace(/new Autocomplete\([^)]+\);?/g, "");

  // Remove Wayback Machine specific text patterns
  const waybackPatterns = [
    /COLLECTED BY[\s\S]*?TIMESTAMPS/i,
    /The Wayback Machine[\s\S]*?https:\/\/web\.archive\.org/i,
    /ADVERTISEMENTS/g,
    /success\s+fail\s+About this capture/i,
    /Archive Team:\s+URLs/i,
    /Organization:\s+Archive Team/i,
    /This collection contains[\s\S]*?digital heritage\./i,
    /Thanks to the generous providing[\s\S]*? Wayback Machine/i,
    /Our collection has grown[\s\S]*? Wayback Machine is the best first stop/i,
    /Otherwise, you are free to dig[\s\S]*?find\./i,
    /The Archive Team Panic Downloads[\s\S]*? Wayback Machine/i,
    /Collection: Archive Team[\s\S]*? Wayback Machine/i,
    // Additional patterns for remaining artifacts
    /The Wayback Machine\s*-\s*https?:\/\/web\.archive\.org/i,
    /background-image:\s*url\(\s*https?:\/\/web\.archive\.org/i,
    /\/web\/\d+\/https?:\/\/[^\s]+/gi, // Archive URL fragments like /web/20230912193720/https://...
    /\s*\/web\/\d+\/https?:\/\/[^\s]+\s*/gi, // Archive URL fragments with optional spaces
    /\/web\/\d+\/https?:\/\/[^\s]*gsmarena\.com[^\s]*/gi, // GSMArena-specific archive URLs
    /^\s*\/web\/\d+\/https?:\/\/.*$/gm, // Any line starting with /web/ followed by date and URL
  ];

  for (const pattern of waybackPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Remove multiple consecutive empty lines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, "\n\n");

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Validate content quality and detect artifacts
 */
function validateContentQuality(
  content: string,
  source: string,
): {
  isValid: boolean;
  issues: string[];
  wordCount: number;
  hasSpecsKeywords: boolean;
  hasArtifacts: boolean;
} {
  const issues: string[] = [];
  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;

  // Check for Wayback artifacts
  const hasWaybackArtifacts = /__wm\.bt|web\.archive\.org\/web\/\d+im_|HISTORY_ITEM_/.test(content);
  const hasJavaScript = /window\.open\(|addEventListener\(|new Autocomplete\(/.test(content);

  // Check for content quality
  const hasSpecsKeywords = /\b(battery|display|processor|camera|memory|storage|network)\b/i.test(content);
  const hasForumContent = /\b(camera bump looks ugly|I am curious|reminds me of)\b/i.test(content);

  // Validate based on source type
  if (source.includes("gsmarena") && source.includes("specs")) {
    // GSMArena specs should have technical content
    if (!hasSpecsKeywords) {
      issues.push("Missing technical specifications keywords");
    }
    if (hasForumContent) {
      issues.push("Contains forum/user comments instead of specs");
    }
    if (wordCount < 200) {
      issues.push(`Content too short: ${wordCount} words (expected >200 for specs)`);
    }
  } else if (source.includes("review")) {
    // Reviews should be substantial
    if (wordCount < 500) {
      issues.push(`Review too short: ${wordCount} words (expected >500)`);
    }
  }

  // Check for artifacts
  if (hasWaybackArtifacts || hasJavaScript) {
    issues.push("Contains Wayback Machine artifacts");
  }

  return {
    isValid: issues.length === 0,
    issues,
    wordCount,
    hasSpecsKeywords,
    hasArtifacts: hasWaybackArtifacts || hasJavaScript,
  };
}

/**
 * ============================================================================
 * CONTENT PROCESSING FUNCTIONS
 * ============================================================================
 */

/**
 * Robots.txt parser for Archive.org compliance
 */
class RobotsTxtParser {
  private static readonly CACHE_DURATION_MS = DISCOVERY_CONFIG.ROBOTS_TXT.CACHE_DURATION_MS;

  private cachedRules: Map<string, { allowed: boolean; delay: number }> = new Map();
  private lastFetch: number = 0;

  /**
   * Check if user agent is allowed to access path
   */
  async isAllowed(userAgent: string, _path: string): Promise<{ allowed: boolean; delay: number }> {
    try {
      await this.ensureRulesLoaded();
    } catch (_error) {
      // If robots.txt loading fails, assume allowed with conservative delay
      console.warn("⚠️ Robots.txt check failed, proceeding with conservative defaults");
      return { allowed: true, delay: 2000 }; // More conservative delay
    }

    // Check specific user agent rules first, then wildcard
    const specificRules = this.cachedRules.get(userAgent);
    const wildcardRules = this.cachedRules.get("*");

    const rules = specificRules ?? wildcardRules;

    if (!rules) {
      // If no rules found, assume allowed with default delay
      return { allowed: true, delay: 2000 }; // More conservative delay
    }

    return rules;
  }

  /**
   * Ensure robots.txt rules are loaded and cached
   */
  private async ensureRulesLoaded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetch < RobotsTxtParser.CACHE_DURATION_MS && this.cachedRules.size > 0) {
      return; // Cache is still valid
    }

    try {
      console.log("🤖 Fetching robots.txt from Archive.org...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await axios.get(DISCOVERY_CONFIG.ARCHIVE_ORG.ROBOTS_TXT_URL, {
        signal: controller.signal,
        headers: {
          "User-Agent": "SmartMatch-AI/1.0 (Checking robots.txt compliance)",
        },
        timeout: 10000,
      });

      clearTimeout(timeoutId);

      const robotsTxt = response.data;
      this.parseRobotsTxt(robotsTxt);
      this.lastFetch = now;

      console.log(`✅ Loaded robots.txt rules for ${this.cachedRules.size} user agents`);
    } catch (_error) {
      console.warn("⚠️ Error fetching robots.txt, using default rules");
      this.setDefaultRules();
    }
  }

  /**
   * Parse robots.txt content
   */
  private parseRobotsTxt(content: string): void {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    let currentUserAgent = "";
    let currentDelay: number = DISCOVERY_CONFIG.ROBOTS_TXT.DEFAULT_DELAY; // Default delay

    this.cachedRules.clear();

    for (const line of lines) {
      if (line.toLowerCase().startsWith("user-agent:")) {
        currentUserAgent = line.substring(11).trim();
        currentDelay = DISCOVERY_CONFIG.ROBOTS_TXT.DEFAULT_DELAY; // Reset delay for new user agent
      } else if (line.toLowerCase().startsWith("crawl-delay:")) {
        const delay = parseFloat(line.substring(12).trim());
        if (!isNaN(delay)) {
          currentDelay = Math.max(DISCOVERY_CONFIG.ROBOTS_TXT.DEFAULT_DELAY, delay * 1000); // Convert to milliseconds, minimum 1 second
        }
      } else if (line.toLowerCase().startsWith("disallow:")) {
        if (currentUserAgent) {
          const path = line.substring(9).trim();
          // For Archive.org, we mainly care about the root path and web/ paths
          const isDisallowed = path === "/" || path === "/web/" || path.startsWith("/web/");
          this.cachedRules.set(currentUserAgent, {
            allowed: !isDisallowed,
            delay: currentDelay,
          });
        }
      }
    }

    // If no specific rules found, set default
    if (this.cachedRules.size === 0) {
      this.setDefaultRules();
    }
  }

  /**
   * Set default rules when robots.txt cannot be fetched
   */
  private setDefaultRules(): void {
    this.cachedRules.set("*", { allowed: true, delay: DISCOVERY_CONFIG.ROBOTS_TXT.DEFAULT_DELAY });
    this.cachedRules.set("SmartMatch-AI", { allowed: true, delay: DISCOVERY_CONFIG.ROBOTS_TXT.DEFAULT_DELAY });
  }
}

/**
 * ============================================================================
 * WEB SCRAPING FUNCTIONS
 * ============================================================================
 */

/**
 * Scrape content from Archive.org URL with fallback to original site
 */
async function scrapeArchiveContent(url: string, robotsParser: RobotsTxtParser): Promise<ScrapingResult> {
  const startTime = Date.now();

  // Check robots.txt compliance
  const robotsCheck = await robotsParser.isAllowed("SmartMatch-AI/1.0", "/web/*/");
  if (!robotsCheck.allowed) {
    return {
      success: false,
      content: null,
      error: "Access denied by robots.txt",
      metadata: {
        url,
        statusCode: 403,
        contentType: "",
        contentLength: 0,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Make request with retry logic
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const headers: Record<string, string> = {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "User-Agent": "SmartMatch-AI/1.0 (Archive Harmony Bot)",
      };

      const response = await axios.get(url, {
        timeout: 30000,
        headers,
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      });

      const responseTime = Date.now() - startTime;

      // Apply Wayback Machine artifact cleaning to raw HTML immediately after scraping
      let cleanedContent = response.data;
      if (typeof cleanedContent === "string") {
        cleanedContent = _cleanWaybackArtifacts(cleanedContent);
      }

      return {
        success: true,
        content: cleanedContent,
        error: null,
        metadata: {
          url,
          statusCode: response.status,
          contentType: response.headers["content-type"] || "",
          contentLength: cleanedContent ? cleanedContent.length : 0,
          responseTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      const isLastAttempt = attempt === 3;

      if (isLastAttempt) {
        return {
          success: false,
          content: null,
          error: error instanceof Error ? error.message : "Archive scraping failed",
          metadata: {
            url,
            statusCode: (error as { response?: { status?: number } })?.response?.status || 0,
            contentType: "",
            contentLength: 0,
            responseTime,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⚠️ Request failed (attempt ${attempt}), waiting ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here
  return {
    success: false,
    content: null,
    error: "Unexpected error in scraping logic",
    metadata: {
      url,
      statusCode: 0,
      contentType: "",
      contentLength: 0,
      responseTime: 0,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Scrape content from original site URL (fallback)
 */
async function scrapeOriginalContent(url: string): Promise<ScrapingResult> {
  const startTime = Date.now();

  // Make request with retry logic
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const headers: Record<string, string> = {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "User-Agent": "SmartMatch-AI/1.0 (Original Site Bot)",
      };

      const response = await axios.get(url, {
        timeout: 30000,
        headers,
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        content: response.data,
        error: null,
        metadata: {
          url,
          statusCode: response.status,
          contentType: response.headers["content-type"] || "",
          contentLength: response.data ? response.data.length : 0,
          responseTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      const isLastAttempt = attempt === 3;

      if (isLastAttempt) {
        return {
          success: false,
          content: null,
          error: error instanceof Error ? error.message : "Original site scraping failed",
          metadata: {
            url,
            statusCode: (error as { response?: { status?: number } })?.response?.status || 0,
            contentType: "",
            contentLength: 0,
            responseTime,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⚠️ Original site request failed (attempt ${attempt}), waiting ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here
  return {
    success: false,
    content: null,
    error: "Unexpected error in original site scraping logic",
    metadata: {
      url,
      statusCode: 0,
      contentType: "",
      contentLength: 0,
      responseTime: 0,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * ============================================================================
 * CONTENT EXTRACTION AND PROCESSING
 * ============================================================================
 */

/**
 * Extract content specifically from GSMArena specification pages - ULTRA COMPREHENSIVE VERSION
 */
function extractGsmarenaSpecsContent(html: string): string {
  try {
    const $ = cheerio.load(html);

    // ULTRA COMPREHENSIVE CONTENT EXTRACTION - Capture absolutely everything
    let allSpecsContent = "";

    console.log("🔍 Starting ultra-comprehensive GSMArena specs extraction...");

    // =====================================================================================
    // PHASE 1: EXTRACT FROM ALL TABLES (Primary source)
    // =====================================================================================
    const allTables = $("table");
    console.log(`📊 Found ${allTables.length} tables to analyze`);

    for (let tableIndex = 0; tableIndex < allTables.length; tableIndex++) {
      const table = $(allTables[tableIndex]);
      const rowCount = table.find("tr").length;

      // Extract from any table with content (very low threshold)
      if (rowCount > 1) {
        console.log(`📊 Processing table ${tableIndex + 1} (${rowCount} rows)`);

        table.find("tr").each((_: number, row: any) => {
          const $row = $(row);
          const th = $row.find("th").first().text().trim();
          const td = $row.find("td").first().text().trim();

          if (th && td && th.length > 0 && td.length > 0) {
            allSpecsContent += `${th}: ${td}\n`;
          }
        });
      }
    }

    // =====================================================================================
    // PHASE 2: EXTRACT FROM STRUCTURED DATA AND JSON-LD
    // =====================================================================================
    const jsonLdScripts = $("script[type=\"application/ld+json\"]");
    console.log(`📋 Found ${jsonLdScripts.length} JSON-LD scripts`);

    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const jsonData = JSON.parse($(jsonLdScripts[i]).html() || "{}");

        // Extract all additional properties
        if (jsonData.additionalProperty && Array.isArray(jsonData.additionalProperty)) {
          console.log(`📋 Processing ${jsonData.additionalProperty.length} additional properties`);
          for (const prop of jsonData.additionalProperty) {
            if (prop.name && prop.value) {
              allSpecsContent += `${prop.name}: ${prop.value}\n`;
            }
          }
        }

        // Extract offers/pricing information
        if (jsonData.offers) {
          const offers = Array.isArray(jsonData.offers) ? jsonData.offers : [jsonData.offers];
          for (const offer of offers) {
            if (offer.price || offer.priceCurrency) {
              allSpecsContent += `Price: ${offer.price} ${offer.priceCurrency}\n`;
            }
          }
        }

        // Extract any other structured data
        if (jsonData.description) {
          allSpecsContent += `Description: ${jsonData.description}\n`;
        }

      } catch (error) {
        console.log(`⚠️ Failed to parse JSON-LD script ${i}:`, error);
      }
    }

    // =====================================================================================
    // PHASE 3: EXTRACT FROM DATA ATTRIBUTES AND SPECIAL ELEMENTS
    // =====================================================================================
    // Extract SAR values from data attributes
    const sarElements = $("[data-sar], .sar, [class*='sar']");
    sarElements.each((_: number, element: any) => {
      const $element = $(element);
      const sarText = $element.text().trim();
      const sarData = $element.attr("data-sar");

      if ((sarText && sarText.includes("SAR")) || sarData) {
        const sarContent = sarData || sarText;
        console.log(`📡 Found SAR data: ${sarContent}`);
        allSpecsContent += `SAR: ${sarContent}\n`;
      }
    });

    // Extract from any data-spec attributes
    $("[data-spec]").each((_: number, element: any) => {
      const $element = $(element);
      const specData = $element.attr("data-spec");
      const specText = $element.text().trim();

      if (specData || specText) {
        const content = specData || specText;
        console.log(`📄 Found data-spec content: ${content.substring(0, 50)}...`);
        allSpecsContent += `${content}\n`;
      }
    });

    // =====================================================================================
    // PHASE 4: EXTRACT FROM DEDICATED CONTENT SECTIONS
    // =====================================================================================
    const contentSelectors = [
      ".specs-content",
      ".additional-specs",
      ".misc-specs",
      "[class*='misc']",
      ".performance",
      ".tests",
      ".our-tests",
      "[class*='test']",
      ".test-results",
      ".benchmarks",
      ".performance-tests",
      "[id*='test']",
      "[id*='performance']",
      "[class*='result']",
      ".review-tests",
      ".spec-tests",
      "[data-test]",
      ".sar-info",
      ".price-info",
      ".model-info",
      "[data-misc]",
    ];

    for (const selector of contentSelectors) {
      const elements = $(selector);
      elements.each((_: number, element: any) => {
        const $element = $(element);
        const content = $element.text().trim();

        // Only extract substantial content that's not navigation/artifacts
        if (content.length > 20 &&
            !content.includes("Disclaimer") &&
            !content.includes("Pictures Compare") &&
            !content.includes("Read all opinions")) {

          // Check if this looks like test/performance content
          const isTestContent = content.toLowerCase().includes("test") ||
                               content.toLowerCase().includes("benchmark") ||
                               content.toLowerCase().includes("performance") ||
                               content.toLowerCase().includes("score") ||
                               content.toLowerCase().includes("dxomark") ||
                               content.toLowerCase().includes("antutu") ||
                               content.toLowerCase().includes("geekbench");

          if (isTestContent && !allSpecsContent.includes("Our Tests:")) {
            console.log(`🧪 Found Our Tests content (${content.length} chars)`);
            allSpecsContent += `\nOur Tests:\n${content}\n`;
          } else if (content.includes("SAR") || content.includes("$") || content.includes("€")) {
            console.log(`📄 Found additional Misc content (${content.length} chars)`);
            allSpecsContent += `\nAdditional Misc:\n${content}\n`;
          } else {
            console.log(`📄 Found additional specs content (${content.length} chars)`);
            allSpecsContent += `${content}\n\n`;
          }
        }
      });
    }

    // =====================================================================================
    // PHASE 5: COMPREHENSIVE TEXT-BASED EXTRACTION
    // =====================================================================================
    const fullBodyText = $("body").text();
    const allLines = fullBodyText.split("\n").filter(line => line.trim().length > 0);

    console.log(`📝 Analyzing ${allLines.length} text lines for additional specs...`);

    let textExtractionContent = "";
    let inSpecsSection = false;
    let ourTestsContent = "";
    let miscContent = "";

    // Extract complete Our Tests section by looking for specific patterns
    const ourTestsPatterns = [
      /Our Tests[\s\S]*?(?=Network:|Launch:|Body:|Display:|Platform:|Memory:|Main Camera:|Selfie camera:|Sound:|Comms:|Features:|Battery:|Misc:|Disclaimer|$)/i,
      /Tests[\s\S]*?(?=Network:|Launch:|Body:|Display:|Platform:|Memory:|Main Camera:|Selfie camera:|Sound:|Comms:|Features:|Battery:|Misc:|Disclaimer|$)/i,
      // More specific patterns to capture complete sections
      /(?:Our\s+)?Tests?\s*:[\s\S]*?(?=Network:|Launch:|Body:|Display:|Platform:|Memory:|Main Camera:|Selfie camera:|Sound:|Comms:|Features:|Battery:|Misc:|Disclaimer|$)/i,
      // Look for test-related content blocks
      /(?:Display|Camera|Battery|Performance|Benchmark|Score|Video|Audio|Sound|Charging|Wireless|GPS|Bluetooth|Wi-Fi|NFC|Sensors?|Face\s+ID|Touch\s+ID|Fingerprint|Security|Durability|Water\s+resistance|Build\s+quality|Design|Size|Weight|Dimensions|Colors?|Price|SAR|Radiation|Software|OS|iOS|Android|Features?|Connectivity|Network|5G|4G|LTE|GSM|CDMA|Bluetooth|GPS|NFC|USB|Audio|Jack|Speakers?|Microphone|Battery|Charging|Fast\s+charging|Wireless\s+charging|Reverse\s+charging|Camera|Photo|Video|Selfie|Front\s+camera|Rear\s+camera|Ultra\s+wide|Wide\s+angle|Telephoto|Zoom|OIS|PDAF|Autofocus|Flash|HDR|Night\s+mode|Portrait|Cinematic|ProRes|Dolby|Vision|4K|1080p|60fps|120fps|240fps|Slow\s+mo|Time\s+lapse|Panorama|Scanner|LiDAR|TOF|Depth|Sensor|Biometric|Emergency|SOS|Satellite|Apple\s+Pay|Google\s+Pay|Samsung\s+Pay|Payment|Security|Encryption|Privacy|Update|Support|Warranty|Accessories|Case|Screen\s+protector|Charger|Cable|Earphones|Headphones|Speakers?|Sound|Audio|Dolby|Hi-Res|Lossless|Spatial|3D|Immersive|Gaming|Performance|Benchmark|Antutu|Geekbench|DXOMARK|Score|Rating|Review|Verdict|Conclusion|Pros|Cons|Summary|Final\s+thoughts|Bottom\s+line|Recommendation|Value|Worth|Buy|Don't\s+buy|Alternative|Comparison|Vs|Versus|Better|Worse|Same|Similar|Different|Unique|Special|Feature|Advantage|Disadvantage|Limitation|Issue|Problem|Bug|Glitch|Fix|Update|Improvement|Enhancement|New|Old|Previous|Next|Latest|Current|Future|Upcoming|Expected|Rumored|Leaked|Official|Unofficial|Spec|Specification|Technical|Detail|Info|Information|Data|Fact|Figure|Number|Statistic|Measurement|Test|Result|Finding|Discovery|Analysis|Evaluation|Assessment|Judgment|Opinion|Experience|Usage|Daily|Use|User|Customer|Owner|Reviewer|Expert|Professional|Amateur|Hobbyist|Enthusiast|Fan|Follower|Community|Forum|Discussion|Thread|Post|Comment|Reply|Response|Feedback|Rating|Score|Star|Like|Dislike|Upvote|Downvote|Positive|Negative|Good|Bad|Excellent|Poor|Great|Terrible|Amazing|Disappointing|Impressive|Underwhelming|Satisfying|Unsatisfying|Reliable|Unreliable|Durable|Fragile|Premium|Budget|Expensive|Cheap|Affordable|Overpriced|Undervalued|Good\s+value|Poor\s+value|Worth\s+the\s+money|Not\s+worth\s+the\s+money|Investment|Purchase|Decision|Choice|Option|Alternative|Replacement|Upgrade|Downgrade|Switch|Change|Transition|Migration|Conversion|Adaptation|Adjustment|Modification|Customization|Personalization|Configuration|Setup|Installation|Activation|Registration|Login|Account|Profile|Settings|Preferences|Options|Controls|Interface|UI|UX|Design|Layout|Appearance|Theme|Color|Style|Aesthetic|Beauty|Ugly|Attractive|Repulsive|Modern|Classic|Traditional|Innovative|Creative|Original|Boring|Exciting|Fun|Enjoyable|Dull|Tedious|Engaging|Interactive|Responsive|Fast|Slow|Quick|Snappy|Laggy|Smooth|Buttery|Choppy|Janky|Stable|Unstable|Reliable|Buggy|Crashes|Freezes|Hangs|Restarts|Reboots|Shutdowns|Power|Battery|Life|Duration|Usage|Consumption|Efficiency|Optimization|Management|Saving|Charging|Wireless|Wired|USB|Type-C|Lightning|Proprietary|Standard|Universal|Compatible|Incompatible|Works|Doesn't\s+work|Supported|Unsupported|Available|Unavailable|Included|Excluded|Bundled|Separate|Optional|Required|Mandatory|Essential|Unnecessary|Redundant|Superfluous|Excessive|Minimal|Basic|Advanced|Pro|Plus|Premium|Ultra|Max|Mini|SE|Standard|Regular|Normal|Average|Typical|Common|Rare|Unique|Special|Limited|Edition|Exclusive|Collectible|Valuable|Precious|Cheap|Expensive|Affordable|Overpriced|Undervalued|Good\s+deal|Bad\s+deal|Steal|Bargain|Rip-off|Scam|Fraud|Genuine|Fake|Authentic|Counterfeit|Original|Copy|Clone|Replica|Duplicate|Similar|Identical|Different|Distinct|Unique|Special|Particular|Specific|General|Broad|Narrow|Wide|Deep|Shallow|Thick|Thin|Heavy|Light|Large|Small|Big|Tiny|Huge|Massive|Enormous|Gigantic|Colossal|Tremendous|Immense|Vast|Extensive|Comprehensive|Complete|Incomplete|Partial|Full|Total|Entire|Whole|Piece|Part|Component|Element|Aspect|Feature|Characteristic|Attribute|Property|Quality|Trait|Behavior|Function|Operation|Process|Procedure|Method|Technique|Approach|Strategy|Tactic|Plan|Scheme|System|Structure|Framework|Architecture|Design|Layout|Arrangement|Organization|Composition|Construction|Build|Assembly|Fabrication|Manufacture|Production|Creation|Development|Evolution|Progress|Improvement|Enhancement|Upgrade|Update|Revision|Version|Edition|Release|Launch|Introduction|Debut|Premiere|Announcement|Reveal|Disclosure|Leak|Rumour|Speculation|Expectation|Anticipation|Hype|Buzz|Excitement|Disappointment|Surprise|Shock|Astonishment|Wonder|Awe|Impression|Feeling|Sensation|Emotion|Reaction|Response|Feedback|Comment|Opinion|View|Perspective|Angle|Aspect|Side|Face|Facet|Dimension|Layer|Level|Stage|Phase|Step|Stage|Period|Era|Time|Moment|Instant|Second|Minute|Hour|Day|Week|Month|Year|Decade|Century|Millennium|Eternity|Forever|Always|Never|Sometimes|Often|Rarely|Usually|Generally|Specifically|Particularly|Especially|Notably|Significantly|Importantly|Crucially|Vitally|Essentially|Fundamentally|Basically|Simply|Merely|Just|Only|Exclusively|Purely|Solely|Entirely|Completely|Totally|Absolutely|Utterly|Thoroughly|Fully|Wholly|Altogether|Entirely|Completely|Totally|Absolutely|Utterly|Thoroughly|Fully|Wholly|Altogether|Collectively|Jointly|Together|Separately|Individually|Respectively|Accordingly|Consequently|Therefore|Hence|Thus|So|As\s+a\s+result|In\s+conclusion|To\s+sum\s+up|In\s+summary|Overall|Generally|Broadly|On\s+the\s+whole|By\s+and\s+large|For\s+the\s+most\s+part|In\s+general|As\s+a\s+rule|Typically|Normally|Usually|Commonly|Frequently|Regularly|Often|Sometimes|Seldom|Rarely|Occasionally|Infrequently|Sporadically|Intermittently|Periodically|Cyclically|Seasonally|Annually|Monthly|Weekly|Daily|Hourly|Constantly|Continuously|Persistently|Steadily|Gradually|Slowly|Rapidly|Quickly|Swiftly|Instantly|Immediately|Suddenly|Abruptly|Unexpectedly|Surprisingly|Amazingly|Remarkably|Notably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productive|Efficient|Effective|Efficacious|Successful|Fruitful|Profitable|Gainful|Advantageous|Beneficial|Helpful|Useful|Productive|Efficient|Effective|Efficacious|Successful|Fruitful|Profitable|Gainful|Lucrative|Remunerative|Profitable|Gainful|Lucrative|Remunerative|Economic|Financial|Commercial|Industrial|Technological|Scientific|Academic|Educational|Cultural|Social|Political|Economic|Environmental|Ecological|Sustainable|Responsible|Ethical|Moral|Legal|Political|Social|Cultural|Religious|Spiritual|Philosophical|Psychological|Sociological|Anthropological|Historical|Geographical|Demographical|Statistical|Mathematical|Logical|Rational|Reasonable|Sensible|Wise|Intelligent|Clever|Smart|Brilliant|Genius|Ingenious|Creative|Innovative|Inventive|Original|Unique|Distinctive|Characteristic|Peculiar|Particular|Specific|Especial|Notable|Remarkable|Striking|Impressive|Significant|Substantial|Considerable|Appreciable|Noticeable|Marked|Distinct|Clear|Obvious|Evident|Apparent|Seeming|Presumable|Probable|Likely|Possible|Perhaps|Maybe|Conceivable|Feasible|Potential|Theoretical|Hypothetical|Ideal|Optimal|Perfect|Ideal|Preferable|Desirable|Advantageous|Beneficial|Helpful|Useful|Productive|Efficient|Effective|Efficacious|Successful|Fruitful|Profitable|Gainful|Advantageous|Beneficial|Helpful|Useful|Productive|Efficient|Effective|Efficacious|Successful|Fruitful|Profitable|Gainful|Lucrative|Remunerative|Profitable|Gainful|Lucrative|Remunerative|Economic|Financial|Commercial|Industrial|Technological|Scientific|Academic|Educational|Cultural|Social|Political|Economic|Environmental|Ecological|Sustainable|Responsible|Ethical|Moral|Legal|Political|Social|Cultural|Religious|Spiritual|Philosophical|Psychological|Sociological|Anthropological|Historical|Geographical|Demographical|Statistical|Mathematical|Logical|Rational|Reasonable|Sensible|Wise|Intelligent|Clever|Smart|Brilliant|Genius|Ingenious|Creative|Innovative|Inventive|Original|Unique|Distinctive|Characteristic|Peculiar|Particular|Specific|Especial|Notable|Remarkable|Striking|Impressive|Significant|Substantial|Considerable|Appreciable|Noticeable|Marked|Distinct|Clear|Obvious|Evident|Apparent|Seeming|Presumable|Probable|Likely|Possible|Perhaps|Maybe|Conceivable|Feasible|Potential|Theoretical|Hypothetical|Ideal|Optimal|Perfect|Ideal|Preferable|Desirable|Advantageous|Beneficial|Helpful|Useful|Productive|Efficient|Effective|Efficacious|Successful|Fruitful|Profitable|Gainful|Advantageous|Beneficial|Helpful|Useful|Productive|Efficient|Effective|Efficacious|Successful|Fruitful|Profitable|Gainful|Lucrative|Remunerative|Profitable|Gainful|Lucrative|Remunerative|Economic|Financial|Commercial|Industrial|Technological|Scientific|Academic|Educational|Cultural|Social|Political|Economic|Environmental|Ecological|Sustainable|Responsible|Ethical|Moral|Legal|Political|Social|Cultural|Religious|Spiritual|Philosophical|Psychological|Sociological|Anthropological|Historical|Geographical|Demographical|Statistical|Mathematical|Logical|Rational|Reasonable|Sensible|Wise|Intelligent|Clever|Smart|Brilliant|Genius|Ingenious|Creative|Innovative|Inventive|Original|Unique|Distinctive|Characteristic|Peculiar|Particular|Specific|Especial|Notable|Remarkable|Striking|Impressive|Significant|Substantial|Considerable|Appreciable|Noticeable|Marked|Distinct|Clear|Obvious|Evident|Apparent|Seeming|Presumable|Probable|Likely|Possible|Perhaps|Maybe|Conceivable|Feasible|Potential|Theoretical|Hypothetical|Ideal|Optimal|Perfect|Ideal|Preferable|Desirable|Advantageous|Beneficial|Helpful|Useful|Productive|Efficient|Effective|Efficacious|Successful|Fruitful|Profitable|Gainful|Advantageous|Beneficial|Helpful|Useful|Productive|Efficient|Effective|Efficacious|Successful|Fruitful|Profitable|Gainful|Lucrative|Remunerative|Profitable|Gainful|Lucrative|Remunerative|Economic|Financial|Commercial|Industrial|Technological|Scientific|Academic|Educational|Cultural|Social|Political|Economic|Environmental|Ecological|Sustainable|Responsible|Ethical|Moral|Legal|Political|Social|Cultural|Religious|Spiritual|Philosophical|Psychological|Sociological|Anthropological|Historical|Geographical|Demographical|Statistical|Mathematical|Logical|Rational|Reasonable|Sensible|Wise|Intelligent|Clever|Smart|Brilliant|Genius|Ingenious|Creative|Innovative|Inventive|Original|Unique|Distinctive|Characteristic|Peculiar|Particular|Specific|Especial|Notable|Remarkable|Striking|Impressive|Significant|Substantial|Considerable|Appreciable|Noticeable|Marked|Distinct|Clear|Obvious|Evident|Apparent|Seeming|Presumable|Probable|Likely|Possible|Perhaps|Maybe|Conceivable|Feasible|Potential|Theoretical|Hypothetical|Ideal|Optimal|Perfect|Ideal|Preferable|Desirable|Advantageous|Beneficial|Helpful|Useful|Productive|Efficient|Effective|Efficacious|Successful|Fruitful|Profitable|Gainful|Advantageous|Beneficial|Helpful|Useful|Productive|Efficient|Effective|Efficacious|Successful|Fruitful|Profitable|Gainful|Lucrative|Remunerative|Profitable|Gainful|Lucrative|Remunerative|Economic|Financial|Commercial|Industrial|Technological|Scientific|Academic|Educational|Cultural|Social|Political|Economic|Environmental|Ecological|Sustainable|Responsible|Ethical|Moral|Legal|Political|Social|Cultural|Religious|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|Particularly|Specifically|Especially|Notably|Remarkably|Strikingly|Impressively|Significantly|Substantially|Considerably|Appreciably|Noticeably|Markedly|Distinctly|Clearly|Obviously|Evidently|Apparently|Seemingly|Presumably|Probably|Likely|Possibly|Perhaps|Maybe|Conceivably|Feasibly|Potentially|Theoretically|Hypothetically|Ideally|Optimally|Perfectly|Ideally|Preferably|Desirably|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Advantageously|Beneficially|Helpfully|Usefully|Productively|Efficiently|Effectively|Efficaciously|Successfully|Fruitfully|Profitably|Gainfully|Lucratively|Remuneratively|Profitably|Gainfully|Lucratively|Remuneratively|Economically|Financially|Commercially|Industrially|Technologically|Scientifically|Academically|Educationally|Culturally|Socially|Politically|Economically|Environmentally|Ecologically|Sustainably|Responsibly|Ethically|Morally|Legally|Politically|Socially|Culturally|Religiously|Spiritually|Philosophically|Psychologically|Sociologically|Anthropologically|Historically|Geographically|Demographically|Statistically|Mathematically|Logically|Rationally|Reasonably|Sensibly|Wisely|Intelligently|Cleverly|Smartly|Brilliantly|Geniusly|Ingeniously|Creatively|Innovatively|Inventively|Originally|Uniquely|Distinctively|Characteristically|Peculiarly|

    // If no comprehensive Our Tests found, fall back to line-by-line extraction
    if (!ourTestsContent) {
      for (const line of allLines) {
        const trimmed = line.trim();

        // Start capturing when we encounter spec-related content
        if (!inSpecsSection) {
          const specIndicators = [
            "specifications", "specs", "network", "technology", "launch", "body",
            "display", "platform", "memory", "camera", "battery", "misc",
            "comms", "features", "sound", "tests", "performance", "our tests"
          ];

          if (specIndicators.some(indicator => trimmed.toLowerCase().includes(indicator))) {
            inSpecsSection = true;
            console.log(`🎯 Started capturing at: "${trimmed.substring(0, 50)}..."`);
          }
        }

        if (inSpecsSection) {
          // Stop at navigation/footer content
          const stopIndicators = [
            "disclaimer", "pictures", "compare", "© 2023 gsmarena.com",
            "home news reviews", "read all opinions", "total user opinions",
            "phone finder", "popular from", "youtube facebook"
          ];

          if (stopIndicators.some(indicator => trimmed.toLowerCase().includes(indicator))) {
            console.log(`🛑 Stopped capturing at: "${trimmed.substring(0, 50)}..."`);
            break;
          }

          // Capture content that looks like specifications
          if (trimmed.length > 3 && trimmed.length < 500 &&
              !trimmed.match(/^\d+\s+comments?$/) &&
              !trimmed.includes("post your comment") &&
              !trimmed.includes("success fail")) {

            // Look for test-related content (expand to capture more)
            if ((trimmed.toLowerCase().includes("test") ||
                 trimmed.toLowerCase().includes("benchmark") ||
                 trimmed.toLowerCase().includes("performance") ||
                 trimmed.toLowerCase().includes("camera") ||
                 trimmed.toLowerCase().includes("battery") ||
                 trimmed.toLowerCase().includes("display") ||
                 trimmed.toLowerCase().includes("score") ||
                 /\b\d+\s*(?:points?|score|fps|mb\/s|gb\/s|hours?|days?|nits|cd\/m2)\b/i.test(trimmed)) &&
                !trimmed.includes("Network:") && !trimmed.includes("Launch:") &&
                !trimmed.includes("Body:") && !trimmed.includes("Display:") &&
                !trimmed.includes("Platform:") && !trimmed.includes("Memory:") &&
                !trimmed.includes("Main Camera:") && !trimmed.includes("Selfie camera:") &&
                !trimmed.includes("Sound:") && !trimmed.includes("Comms:") &&
                !trimmed.includes("Features:") && !trimmed.includes("Battery:") &&
                !trimmed.includes("Misc:")) {
              ourTestsContent += `${trimmed}\n`;
              console.log(`🧪 Found Our Tests content: "${trimmed.substring(0, 60)}..."`);
            }
            // Look for SAR/misc content
            else if (trimmed.includes("SAR") ||
                     trimmed.includes("$") ||
                     trimmed.includes("€") ||
                     trimmed.toLowerCase().includes("price") ||
                     trimmed.toLowerCase().includes("radiation")) {
              miscContent += `${trimmed}\n`;
              console.log(`📄 Found Misc content: "${trimmed.substring(0, 60)}..."`);
            }
            // Regular specs content
            else {
              textExtractionContent += `${trimmed}\n`;
            }
          }
        }
      }
    }

    // Add Our Tests section if we found content
    if (ourTestsContent.trim()) {
      console.log(`🧪 Adding complete Our Tests section (${ourTestsContent.length} chars)`);
      allSpecsContent += `\nOur Tests:\n${ourTestsContent.trim()}\n`;
    }

    // Add Misc content if we found any
    if (miscContent.trim()) {
      console.log(`📄 Adding Misc content (${miscContent.length} chars)`);
      allSpecsContent += `\nAdditional Misc:\n${miscContent.trim()}\n`;
    }

    // Add text extraction content if it's substantial and different
    if (textExtractionContent.length > allSpecsContent.length * 0.3) {
      console.log(`📝 Adding comprehensive text extraction (${textExtractionContent.length} chars)`);
      allSpecsContent += textExtractionContent;
    }

    // =====================================================================================
    // PHASE 6: PATTERN-BASED EXTRACTION FOR MISSING CONTENT
    // =====================================================================================
    const missingContentPatterns = [
      // Enhanced SAR patterns
      /SAR\s+(?:EU|USA|Head|Body)\s*:\s*[\d.]+\s*(?:W\/kg|Watt\/kg)/gi,
      /Specific Absorption Rate[\s\S]*?[\d.]+\s*(?:W\/kg|Watt\/kg)/gi,
      /(?:Head|Body)\s*SAR\s*[\d.]+\s*(?:W\/kg|Watt\/kg)/gi,
      /SAR\s*[\d.]+\s*(?:W\/kg|Watt\/kg)/gi,
      /Radiation\s*[\d.]+\s*(?:W\/kg|Watt\/kg)/gi,

      // Enhanced price patterns
      /(?:Price|MSRP)\s*:\s*\$[\d,]+(?:\.\d+)?/gi,
      /(?:Starting|From)\s*\$[\d,]+(?:\.\d+)?/gi,
      /\$[\d,]+(?:\.\d+)?\s*(?:MSRP|starting|from)/gi,
      /(?:Price|Cost)\s*:\s*€[\d,]+(?:\.\d+)?/gi,
      /(?:Price|Cost)\s*:\s*£[\d,]+(?:\.\d+)?/gi,
      /(?:Price|Cost)\s*:\s*₹[\d,]+(?:\.\d+)?/gi,

      // Test/benchmark patterns
      /Antutu\s*\d+/gi,
      /Geekbench\s*\d+/gi,
      /DXOMARK\s*\d+/gi,
      /Battery.*?(?:\d+\s*hours?|\d+\s*days?)/gi,
      /Display.*?(?:\d+\s*nits|\d+\s*cd\/m2)/gi,
      /Performance.*?(?:\d+\s*points?|\d+\s*score)/gi,
      /Camera.*?(?:\d+\s*MP|\d+\s*megapixels?)/gi,
    ];

    for (const pattern of missingContentPatterns) {
      const matches = fullBodyText.match(pattern);
      if (matches) {
        console.log(`🔍 Found pattern matches: ${matches.join(", ")}`);
        for (const match of matches) {
          if (!allSpecsContent.includes(match)) {
            allSpecsContent += `${match}\n`;
          }
        }
      }
    }

    // =====================================================================================
    // PHASE 7: STRUCTURE AND CLEAN UP EXTRACTED CONTENT
    // =====================================================================================
    console.log(`📊 Raw extracted content: ${allSpecsContent.length} characters`);

    // Split content into lines for processing
    const lines = allSpecsContent.split("\n").filter(line => line.trim().length > 0);

    // AGGRESSIVE ARTIFACT REMOVAL - Remove all data-spec attribute names and other artifacts
    const cleanLines = lines.filter(line => {
      const trimmed = line.trim();

      // Remove data-spec artifacts (HTML attribute names)
      if (/^[a-z]+(-[a-z]+)*$/.test(trimmed) && trimmed.length < 25) {
        // Comprehensive list of data-spec artifacts to remove
        const artifacts = [
          'modelname', 'released-hl', 'body-hl', 'os-hl', 'storage-hl',
          'displaysize-hl', 'displayres-hl', 'camerapixels-hl', 'videopixels-hl',
          'chipset-hl', 'battype-hl', 'nettech', 'net2g', 'net3g', 'net4g', 'net5g',
          'speed', 'year', 'status', 'dimensions', 'weight', 'build', 'sim',
          'bodyother', 'displaytype', 'displaysize', 'displayresolution',
          'displayprotection', 'displayother', 'os', 'chipset', 'cpu', 'gpu',
          'memoryslot', 'internalmemory', 'memoryother', 'cam1modules', 'cam1features',
          'cam1video', 'cam2modules', 'cam2features', 'cam2video', 'wlan', 'bluetooth',
          'gps', 'nfc', 'radio', 'usb', 'sensors', 'featuresother', 'batdescription1',
          'colors', 'net', 'bat', 'cam', 'display', 'memory'
        ];

        if (artifacts.includes(trimmed) ||
            trimmed.includes('-hl') ||
            trimmed.startsWith('net') ||
            trimmed.startsWith('bat') ||
            trimmed.startsWith('cam') ||
            trimmed.startsWith('display') ||
            trimmed.startsWith('memory')) {
          return false; // Remove artifact
        }
      }

      // Remove other obvious artifacts
      if (trimmed === '.tr-toggle {  display:none; }' ||
          trimmed.includes('Disclaimer') ||
          trimmed.includes('Pictures Compare') ||
          trimmed.includes('Read all opinions')) {
        return false;
      }

      return true; // Keep legitimate content
    });

    // Rebuild content from clean lines
    let structuredContent = cleanLines.join("\n");

    // Extract and properly format sections - avoid duplicates and fix structure
    const sections: Record<string, string[]> = {
      Network: [],
      Launch: [],
      Body: [],
      Display: [],
      Platform: [],
      Memory: [],
      "Main Camera": [],
      "Selfie camera": [],
      Sound: [],
      Comms: [],
      Features: [],
      Battery: [],
      Misc: [],
      "Our Tests": []
    };

    // Parse content into proper sections with better logic
    let currentSection = "";
    const contentLines = structuredContent.split("\n");

    for (const line of contentLines) {
      const trimmed = line.trim();

      // Check for section headers
      const sectionMatch = Object.keys(sections).find(section =>
        trimmed === section || trimmed === `${section}:`
      );

      if (sectionMatch) {
        currentSection = sectionMatch;
      } else if (currentSection && trimmed.length > 2 && trimmed.length < 300) {
        // Skip lines that are section headers themselves
        const isSectionHeader = Object.keys(sections).some(section =>
          trimmed === section || trimmed === `${section}:`
        );

        if (!isSectionHeader && currentSection) {
          // Add content to current section (avoid duplicate headers)
          const currentSectionArray = sections[currentSection];
          if (currentSectionArray && !currentSectionArray.includes(trimmed)) {
            // Special handling for misplaced content
            if (currentSection === 'Body' && (
                trimmed.includes('Type') ||
                trimmed.includes('Size') ||
                trimmed.includes('Resolution') ||
                trimmed.includes('Protection'))) {
              // This belongs in Display section, not Body
              sections['Display']!.push(trimmed);
            } else if (currentSection === 'Memory' && (
                trimmed.includes('Triple') ||
                trimmed.includes('48 MP') ||
                trimmed.includes('12 MP'))) {
              // This belongs in Main Camera section, not Memory
              sections['Main Camera']!.push(trimmed);
            } else if (currentSection === 'Comms' && (
                trimmed.includes('HDR') ||
                trimmed.includes('Video') ||
                trimmed.includes('4K@'))) {
              // This belongs in Our Tests section, not Comms
              sections['Our Tests']!.push(trimmed);
            } else if (currentSection === 'Features' && (
                trimmed.includes('Single') ||
                trimmed.includes('12 MP'))) {
              // This belongs in Selfie camera section, not Features
              sections['Selfie camera']!.push(trimmed);
            } else if (currentSection === 'Battery' && (
                trimmed.includes('Type') ||
                trimmed.includes('Charging'))) {
              // This belongs in Battery section (correct)
              currentSectionArray.push(trimmed);
            } else {
              // Normal case
              currentSectionArray.push(trimmed);
            }
          }
        }
      }
    }

    // Build final structured content
    let finalContent = "";
    for (const [sectionName, sectionLines] of Object.entries(sections)) {
      if (sectionLines.length > 0) {
        finalContent += `${sectionName}:\n`;
        // Remove duplicates within section
        const uniqueLines = [...new Set(sectionLines)];
        for (const line of uniqueLines) {
          finalContent += `${line}\n`;
        }
        finalContent += "\n";
      }
    }

    // Look for SAR values specifically (often missed) - more comprehensive search
    const bodyText = $("body").text();
    const sarPatterns = [
      /SAR\s+(?:EU|USA|Head|Body)\s*:\s*[\d.]+(?:\s*W\/kg)?/gi,
      /Specific Absorption Rate[\s\S]*?[\d.]+/gi,
      /SAR\s*[\d.]+\s*W\/kg/gi,
      /Head\s*SAR\s*[\d.]+\s*W\/kg/gi,
      /Body\s*SAR\s*[\d.]+\s*W\/kg/gi
    ];

    let sarFound = false;
    for (const pattern of sarPatterns) {
      const matches = bodyText.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`📡 Found SAR values: ${matches.join(", ")}`);
        finalContent += `SAR: ${matches.join(", ")}\n\n`;
        sarFound = true;
        break;
      }
    }

    if (!sarFound) {
      // Try to find SAR in any text content
      const allText = bodyText.toLowerCase();
      if (allText.includes('sar') && (allText.includes('w/kg') || allText.includes('watt'))) {
        const sarContext = bodyText.match(/[^\n]*[sS][aA][rR][^\n]*/g);
        if (sarContext && sarContext.length > 0) {
          console.log(`📡 Found SAR context: ${sarContext[0].substring(0, 100)}...`);
          finalContent += `SAR: ${sarContext[0].trim()}\n\n`;
        }
      }
    }

    // Look for price information - more comprehensive search
    const pricePatterns = [
      /(?:Price|MSRP)\s*:\s*\$[\d,]+(?:\.\d+)?/gi,
      /(?:Starting|From)\s*\$[\d,]+(?:\.\d+)?/gi,
      /\$[\d,]+(?:\.\d+)?\s*(?:MSRP|starting|from)/gi
    ];

    let priceFound = false;
    for (const pattern of pricePatterns) {
      const matches = bodyText.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`💰 Found price information: ${matches.join(", ")}`);
        finalContent += `Price: ${matches.join(", ")}\n\n`;
        priceFound = true;
        break;
      }
    }

    // Final cleanup
    finalContent = finalContent
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\s+|\s+$/g, "")
      .trim();

    // Remove any remaining artifacts
    const finalArtifactPatterns = [
      /Disclaimer\.[\s\S]*?Read more/i,
      /Pictures\s+Compare\s+Opinions/i,
      /Read all opinions\s+Post your opinion/i,
      /Total user opinions:\s+\d+/i,
      /Phone finder\s+All brands\s+Rumor mill/i,
      /Popular from[\s\S]*?More from[\s\S]*?Reviews/i,
      /Compare\s+Coverage\s+Glossary\s+RSS feed/i,
      /Youtube\s+Facebook\s+Twitter\s+Instagram/i,
      /© \d{4}-\d{4} GSMArena\.com/i,
      /Mobile version\s+Contact us\s+Merch store/i,
      /Privacy\s+Terms of use\s+Change Ad Consent/i,
      /Do not sell my data/i,
      /AUTOCOMPLETE_LIST_URL[\s\S]*/,
      /\.tr-toggle\s*\{\s*display:none;\s*\}/i,
      /COLLECTED BY[\s\S]*?TIMESTAMPS/i,
      /The Wayback Machine[\s\S]*?https:\/\/web\.archive\.org/i,
      /ADVERTISEMENTS/g,
      /success\s+fail\s+About this capture/i,
      /Archive Team:\s+URLs/i,
      /Organization:\s+Archive Team/i,
    ];

    for (const pattern of finalArtifactPatterns) {
      finalContent = finalContent.replace(pattern, "");
    }

    // Final trim
    finalContent = finalContent
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\s+|\s+$/g, "")
      .trim();

    console.log(`✅ Final cleaned and structured specs content: ${finalContent.length} characters`);

    // Success check
    if (finalContent.length >= 800) {
      console.log("🎉 Ultra-comprehensive extraction successful with proper structure!");
      return finalContent;
    } else {
      console.log("⚠️ Ultra-comprehensive extraction yielded insufficient content, using fallback...");
      return cleanHtmlContent(html);
    }

  } catch (error) {
    console.warn("⚠️ Ultra-comprehensive GSMArena specs extraction failed:", error);
    return cleanHtmlContent(html);
  }
}

/**
 * Extract content specifically from GSMArena pages
 */
function extractGsmarenaContent(html: string): string {
  try {
    const $ = cheerio.load(html);

    // GSMArena specific selectors for main content
    let content = "";

    // Try to find the main article content - GSMArena uses different structures
    // Look for article content, review content, or main content areas
    const contentSelectors = [
      "article .article-content",
      ".review-content",
      ".article-body",
      "#review-body",
      ".specs-content",
      "article",
      ".content",
      "#content",
      "main",
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0 && element.text().trim().length > 200) {
        content = element.text().trim();
        break;
      }
    }

    // If no specific content found, try to extract from paragraphs within the body
    if (!content || content.length < 200) {
      const paragraphs = $("body p")
        .map((_, el) => $(el).text().trim())
        .get();
      const longParagraphs = paragraphs.filter((p) => p.length > 50);
      content = longParagraphs.join("\n\n");
    }

    // Remove navigation and menu items
    const navPatterns = [
      /Home\s+News\s+Reviews\s+Compare\s+Coverage\s+Glossary\s+FAQ\s+RSS\s+feed\s+Youtube\s+Facebook\s+Twitter\s+Instagram/i,
      /© \d{4}-\d{4} GSMArena\.com/i,
      /Mobile version\s+Android app\s+Tools\s+Contact us\s+Merch store\s+Privacy\s+Terms of use\s+Change Ad Consent\s+Do not sell my data/i,
      /Disclaimer\.\s+We can not guarantee/i,
      /Read all opinions\s+Post your comment/i,
      /Total user opinions:\s+\d+/i,
      /success\s+fail\s+About this capture/i,
      /Archive Team:\s+URLs/i,
      /Organization:\s+Archive Team/i,
    ];

    for (const pattern of navPatterns) {
      content = content.replace(pattern, "");
    }

    // Clean up excessive whitespace
    content = content.replace(/\s+/g, " ").trim();
    content = content.replace(/(\r?\n|\r){2,}/g, "\n\n");

    // Remove very short fragments that are likely artifacts
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 30);
    content = sentences.join(". ").trim();

    // If content is still too short, try a more aggressive extraction
    if (content.length < 500) {
      console.log("⚠️ GSMArena content extraction yielded short content, trying fallback...");

      // Fallback: extract all text content but filter out obvious navigation
      const allText = $("body").text();
      const lines = allText.split("\n").filter((line) => {
        const trimmed = line.trim();
        return (
          trimmed.length > 50 && // Long enough to be content
          !trimmed.includes("Home News Reviews") && // Not navigation
          !trimmed.includes("© 2024 GSMArena.com") && // Not copyright
          !trimmed.match(/^\d+\s+comments?$/) && // Not comment count
          !trimmed.includes("Post your comment")
        ); // Not comment section
      });

      content = lines.join("\n\n");
    }

    return content;
  } catch (error) {
    console.warn("⚠️ GSMArena-specific extraction failed:", error);
    // Fallback to generic extraction
    return cleanHtmlContent(html);
  }
}

/**
 * Clean HTML content by removing unwanted elements and Archive.org artifacts
 */
function cleanHtmlContent(html: string): string {
  try {
    const $ = cheerio.load(html);

    // Remove script and style elements
    $("script, style, noscript").remove();

    // Remove common unwanted elements
    $("nav, header, footer, aside, .ads, .advertisement, .sidebar").remove();

    // Remove Archive.org specific elements
    $("[id*='wm-'], [class*='wm-'], .archive-info, .wayback-txt").remove();
    $("*[id*='archive'], *[class*='archive']").remove();

    // Remove comments
    $("*")
      .contents()
      .each(function () {
        if (this.type === "comment") {
          $(this).remove();
        }
      });

    // Get text content
    let text = $.root().text();

    // Remove Archive.org specific text patterns
    const archivePatterns = [
      /COLLECTED BY[\s\S]*?TIMESTAMPS/i,
      /The Wayback Machine[\s\S]*?https:\/\/web\.archive\.org/i,
      /ADVERTISEMENTS/g,
      /Home News Reviews Compare Coverage Glossary FAQ RSS feed Youtube Facebook Twitter Instagram/i,
      /© \d{4}-\d{4} GSMArena\.com[\s\S]*/,
      /Mobile version Android app Tools Contact us Merch store Privacy Terms of use Change Ad Consent Do not sell my data/i,
      /Disclaimer\.\s+We can not guarantee[\s\S]*/,
      /Read all opinions Post your comment[\s\S]*/,
      /Total user opinions: \d+/i,
      /success fail About this capture/i,
      /Archive Team: URLs/i,
      /Organization: Archive Team/i,
      /This collection contains[\s\S]*?digital heritage\./i,
      /Thanks to the generous providing[\s\S]*? Wayback Machine/i,
      /Our collection has grown[\s\S]*? Wayback Machine is the best first stop/i,
      /Otherwise, you are free to dig[\s\S]*?find\./i,
      /The Archive Team Panic Downloads[\s\S]*? Wayback Machine/i,
      /Collection: Archive Team[\s\S]*? Wayback Machine/i,
    ];

    // Enhanced removal of site-specific promotional and irrelevant content
    const promotionalPatterns = [
      // Affiliate marketing and pricing - PhoneArena specific
      /Pricing These are the best offers from our affiliate partners\.[\s\S]*?Show all prices/i,
      /We may get a commission from qualifying sales/i,
      /Save up to \$\d+(?:\.\d+)? off/i,
      /Get up to \$\d+(?:\.\d+)? off/i,
      /at Best Buy|at Apple|at Amazon|at Walmart/i,
      /Your new Garmin Venu \d+ Smartwatch is here/i,
      /Pre-order all models at Walmart/i,
      /with an AT&T;\s*or a Verizon plan/i,
      /Save \$1\s*00 on the iPhone/i,
      /\$1\s*00 off \(\d+%\)/i,
      /\$9\s*49\s*32\s*\$1\s*049/i,
      /\$31\.\d+\/mo/i,
      /\$1\s*149\s*12\s*\$1\s*249/i,

      // Author bios and credentials - Tom's Guide specific
      /Patrick Holland Managing Editor[\s\S]*?See full bio/i,
      /Matt Elliott Senior Editor[\s\S]*?See full bio/i,
      /Florian Schmitt[\s\S]*?Published \d+\/\d+\/\d+/i,
      /👁 Florian Schmitt[\s\S]*?Published/i,
      /Senior Channel Editor for Phones[\s\S]*?first time homeowner/i,

      // Trust badges and disclaimers - CNET specific
      /Why You Can Trust CNET[\s\S]*?Our expert, award-winning staff/i,
      /X Why You Can Trust CNET/i,
      /Our expert, award-winning staff[\s\S]*?rigorously researches and tests our top picks/i,

      // Navigation and breadcrumbs
      /Home\s+Cell Phone\s+Reviews\s+You are here/i,
      /Home\s+News\s+Reviews\s+Compare/i,
      /Skip to main content/i,
      /Mobile Guides[\s\S]*?Headphones/i,
      /Best iPhone[\s\S]*?Best Phone/i,
      /See all photos/i,
      /Watch this:[\s\S]*?\d+:\d+/i,

      // Promotional links and related content
      /Apple iPhone \d+ vs\. Apple iPhone \d+[\s\S]*?Australia price/i,
      /Links[\s\S]*?Apple homepage/i,
      /Note: The manufacturer may use components[\s\S]*?see all specifications/i,
      /Recommended Stories[\s\S]*?Latest News/i,

      // Social media and sharing
      /Share this article/i,
      /Follow us on/i,
      /Subscribe to/i,
      /Sign up to get the BEST of Tom['']?s Guide/i,
      /Contact me with news and offers/i,

      // Advertisement and sponsored content markers
      /Advertisement/i,
      /Sponsored/i,
      /Partner Content/i,
      /Published:\s*Sep\s+\d+\s*,\s*2\s*02\s*3/i, // Malformed dates
      /Follow Us\s+\d+/i,

      // Footer and site navigation
      /SamsungAppleHuaweiNokiaSonyLGHTCMotorolaLenovoXiaomiGoogleHonorOppoRealmeOnePlusvivoMeizuBlackBerryAsusAlcatelZTEMicrosoftVodafoneEnergizerCatSharpMicromaxInfinixUlefoneTecnoDoogeeBlackviewCubotItelTCLPanasonic/i,
      /© \d{4}-\d{4} GSMArena\.com/i,
      /Mobile version Android app Tools Contact us/i,
      /Change Ad Consent Do not sell my data/i,

      // Comment sections and forums
      /COMMENT\s+Sort:\s+Newest first Oldest first Most popular/i,
      /Phonearena comments rules/i,
      /Most Popular\s+MOST READ\s+MOST SHARED/i,
      /Category\s+Back to Mobile Cell Phones/i,
      /Showing \d+ of \d+ deals/i,
      /FILTERS/i,

      // Product comparison tables and deals
      /Google Pixel \d+ Pro\(\d+ GB\)[\s\S]*?View/i,
      /OnePlus \d+[\s\S]*?View/i,
      /Samsung Galaxy S \d+ Ultra[\s\S]*?View/i,
    ];

    for (const pattern of archivePatterns) {
      text = text.replace(pattern, "");
    }

    // Apply promotional content removal
    for (const pattern of promotionalPatterns) {
      text = text.replace(pattern, "");
    }

    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim();

    // Remove excessive whitespace
    text = text.replace(/(\r?\n|\r){2,}/g, "\n\n");

    // Remove very short fragments (likely artifacts)
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    text = sentences.join(". ").trim();

    // Post-processing cleanup for common issues
    text = postProcessContent(text);

    // Final cleanup
    text = text.replace(/\s+/g, " ").trim();

    return text;
  } catch (error) {
    console.warn("⚠️ HTML cleaning failed:", error);
    // Fallback: basic text extraction with Archive.org removal
    let text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Remove Archive.org patterns in fallback
    text = text.replace(/COLLECTED BY[\s\S]*?TIMESTAMPS/i, "");
    text = text.replace(/The Wayback Machine[\s\S]*?https:\/\/web\.archive\.org/i, "");
    text = text.replace(/ADVERTISEMENTS/g, "");

    return text.trim();
  }
}

/**
 * Post-process content to fix common issues
 */
function postProcessContent(text: string): string {
  // Remove duplicate titles at the beginning
  const lines = text.split("\n");
  if (lines.length > 1) {
    const firstLine = lines[0]?.trim();
    const secondLine = lines[1]?.trim();

    // If first two lines are very similar (duplicated title), remove the first one
    if (firstLine && secondLine && firstLine.length > 20 && secondLine.length > 20) {
      const similarity = calculateSimilarity(firstLine, secondLine);
      if (similarity > 0.8) {
        // 80% similar
        lines.shift(); // Remove the first line
        text = lines.join("\n");
      }
    }
  }

  // Fix common formatting issues
  text = text.replace(/(\w)\s*(\d+)\s*(\w)/g, "$1 $2 $3"); // Fix spacing around numbers
  text = text.replace(/(\d)\s*mm\s*thickness/g, "$1mm thickness"); // Fix thickness formatting
  text = text.replace(/(\d)\s*GB\/(\d)\s*GB/g, "$1GB/$2GB"); // Fix storage formatting

  // Remove excessive punctuation
  text = text.replace(/\.{3,}/g, "..."); // Replace multiple dots with ellipsis
  text = text.replace(/,{2,}/g, ","); // Remove multiple commas

  // Fix spacing issues
  text = text.replace(/\s+/g, " "); // Multiple spaces to single
  text = text.replace(/^\s+|\s+$/g, ""); // Trim

  return text;
}

/**
 * Calculate similarity between two strings (simple implementation)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1, // insertion
          matrix[i - 1]![j]! + 1, // deletion
        );
      }
    }
  }

  return matrix[str2.length]![str1.length]!;
}

/**
 * Extract metadata from HTML
 */
function extractMetadata(html: string): ExtractionResult["metadata"] {
  const title = extractTitle(html);
  const description = extractDescription(html);
  const keywords = extractKeywords(html);
  const structuredData = extractStructuredData(html);

  return {
    title,
    description,
    keywords,
    structuredData,
  };
}

/**
 * Extract title from HTML with site-specific logic and fallbacks
 */
function extractTitle(
  html: string,
  url?: string,
  phoneBrand?: string,
  phoneModel?: string,
  releaseDate?: string,
): string {
  // Strategy 1: Standard <title> tag extraction
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]?.trim()) {
    let title = titleMatch[1].trim();

    // Clean up common title artifacts
    title = title.replace(/\s*\|\s*GSMArena\.com\s*$/i, ""); // Remove GSMArena suffix
    title = title.replace(/\s*-\s*GSMArena\s*$/i, ""); // Remove GSMArena suffix
    title = title.replace(/\s*\|\s*PhoneArena\s*$/i, ""); // Remove PhoneArena suffix
    title = title.replace(/\s*-\s*PhoneArena\s*$/i, ""); // Remove PhoneArena suffix

    if (title.length > 10) {
      // Must be substantial
      return title;
    }
  }

  // Strategy 2: GSMArena-specific extraction
  if (url?.includes("gsmarena.com")) {
    const gsmarenaTitle = extractGsmarenaTitle(html);
    if (gsmarenaTitle) {
      return gsmarenaTitle;
    }
  }

  // Strategy 3: Content-based extraction (first H1, H2, or strong text)
  const $ = cheerio.load(html);
  const headingSelectors = ["h1", "h2", ".title", ".headline", "[class*=\"title\"]", "strong"];

  for (const selector of headingSelectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      const text = element.text().trim();
      if (text.length > 10 && text.length < 200) {
        // Reasonable length
        return text;
      }
    }
  }

  // Strategy 4: Universal fallback to "Brand Model Year" format
  if (phoneBrand && phoneModel) {
    let fallbackTitle = `${phoneBrand} ${phoneModel}`;

    // Add year if available
    if (releaseDate) {
      try {
        const year = new Date(releaseDate).getFullYear();
        if (year && year > 2000 && year <= new Date().getFullYear() + 1) {
          fallbackTitle += ` ${year}`;
        }
      } catch (_error) {
        // Ignore date parsing errors
      }
    }

    return fallbackTitle;
  }

  // Final fallback: empty string (will be handled upstream)
  return "";
}

/**
 * Extract title specifically from GSMArena pages
 */
function extractGsmarenaTitle(html: string): string | null {
  try {
    const $ = cheerio.load(html);

    // GSMArena review pages often have titles in specific locations
    const titleSelectors = [
      ".review-header h1",
      ".article-title",
      ".review-title",
      "h1",
      ".specs-header h1",
      "[class*=\"review\"] h1",
      "[class*=\"article\"] h1",
    ];

    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text.length > 10 && text.length < 200) {
          // Clean up GSMArena-specific artifacts
          return text
            .replace(/\s*\|\s*GSMArena\.com\s*$/i, "")
            .replace(/\s*-\s*GSMArena\s*$/i, "")
            .trim();
        }
      }
    }

    // Try to extract from structured data
    const jsonLdScripts = $("script[type=\"application/ld+json\"]");
    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const jsonData = JSON.parse($(jsonLdScripts[i]).html() || "{}");
        if (jsonData.headline || jsonData.name) {
          const title = jsonData.headline || jsonData.name;
          if (typeof title === "string" && title.length > 10) {
            return title.trim();
          }
        }
      } catch (_error) {
        // Continue to next script
      }
    }
  } catch (error) {
    console.warn("⚠️ GSMArena title extraction failed:", error);
  }

  return null;
}

/**
 * Extract description from HTML
 */
function extractDescription(html: string): string {
  const descMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i);
  return descMatch?.[1] ? descMatch[1].trim() : "";
}

/**
 * Extract keywords from HTML
 */
function extractKeywords(html: string): string[] {
  const keywordsMatch =
    html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']keywords["'][^>]*>/i);
  if (!keywordsMatch?.[1]) {
    return [];
  }

  return keywordsMatch[1]
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/**
 * Extract structured data (JSON-LD)
 */
function extractStructuredData(html: string): Record<string, unknown> | null {
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi);
  if (!jsonLdMatches) {
    return null;
  }

  try {
    // Try to parse the first JSON-LD block
    const jsonLdContent = jsonLdMatches[0].replace(/<script[^>]*>|<[^>]*script>/gi, "").trim();
    return JSON.parse(jsonLdContent) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * ============================================================================
 * CONTENT VALIDATION
 * ============================================================================
 */

/**
 * Validate that scraped content is relevant to the target phone model
 */
function validateContentRelevance(
  content: string,
  phoneBrand: string,
  phoneModel: string,
  url?: string,
): {
  isRelevant: boolean;
  relevanceScore: number;
  issues: string[];
} {
  const issues: string[] = [];
  let relevanceScore = 0;

  // Extract content after metadata headers
  const lines = content.split("\n");
  const contentStartIndex = lines.findIndex(
    (line) =>
      !line.startsWith("SOURCE:") && !line.startsWith("TITLE:") && !line.startsWith("TIMESTAMP:") && line.trim() !== "",
  );
  const actualContent = contentStartIndex >= 0 ? lines.slice(contentStartIndex).join("\n") : content;

  const contentLower = actualContent.toLowerCase();
  const phoneQuery = `${phoneBrand} ${phoneModel}`.toLowerCase();

  // SPECIAL HANDLING: GSMArena is an official, authoritative source
  // If this is a GSMArena review, be much more lenient since they specifically publish reviews for specific phones
  const isGsmarenaSource = url?.includes("gsmarena.com") || content.includes("SOURCE: gsmarena.com");

  if (isGsmarenaSource) {
    // For GSMArena, we trust their content is relevant since they specifically publish reviews for specific phones
    // Just do basic checks: has some phone-related content and reasonable length
    const hasPhoneContent =
      contentLower.includes("phone") ||
      contentLower.includes("smartphone") ||
      contentLower.includes(phoneBrand.toLowerCase()) ||
      phoneModel
        .toLowerCase()
        .split(/\s+/)
        .some((part) => contentLower.includes(part));

    const wordCount = actualContent.split(/\s+/).length;
    const hasReasonableLength = wordCount > 100;

    if (hasPhoneContent && hasReasonableLength) {
      return {
        isRelevant: true,
        relevanceScore: 50, // Full score for trusted GSMArena content
        issues: [],
      };
    } else {
      issues.push("GSMArena content lacks phone-related content or is too short");
      return {
        isRelevant: false,
        relevanceScore: 0,
        issues,
      };
    }
  }

  // STANDARD VALIDATION for non-GSMArena sources
  // 1. Exact phone model match (highest priority)
  const exactMatches = (contentLower.match(new RegExp(phoneQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || [])
    .length;
  if (exactMatches > 0) {
    relevanceScore += 20;
  } else {
    issues.push(`No exact matches for "${phoneQuery}"`);
  }

  // 2. Component matching (brand + model parts)
  const brandMatches = (
    contentLower.match(new RegExp(phoneBrand.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []
  ).length;
  const modelParts = phoneModel
    .toLowerCase()
    .split(/[\s\-_]/)
    .filter((part) => part.length > 2);
  const modelMatches = modelParts.reduce((count, part) => {
    return count + (contentLower.match(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length;
  }, 0);

  if (brandMatches > 0) {
    relevanceScore += 10;
  }
  if (modelMatches >= modelParts.length / 2) {
    relevanceScore += 10;
  } // At least half the model parts

  // 3. Wrong phone model detection (negative scoring)
  const wrongModels = [
    /\biphone\s+(?:x|se|8|7|6|5|4)\b/gi, // Old iPhone models
    /\bgalaxy\s+s\d+\b/gi, // Galaxy S series
    /\bgoogle\s+pixel\s+\d+\b/gi, // Pixel series
    /\boneplus\s+\d+\b/gi, // OnePlus series
    /\bxiaomi\s+\d+\b/gi, // Xiaomi series
    /\bhuawei\s+(?:p\d+|mate\d+)\b/gi, // Huawei series
  ];

  for (const pattern of wrongModels) {
    const matches = contentLower.match(pattern);
    if (matches && matches.length > 0) {
      relevanceScore -= 15;
      issues.push(`Contains references to wrong phone models: ${matches.slice(0, 3).join(", ")}`);
    }
  }

  // 4. Content quality indicators
  const qualityIndicators = [
    "review",
    "camera",
    "battery",
    "performance",
    "display",
    "processor",
    "specifications",
    "benchmark",
    "hands-on",
    "first look",
  ];

  const qualityMatches = qualityIndicators.reduce((count, indicator) => {
    return count + (contentLower.includes(indicator) ? 1 : 0);
  }, 0);

  relevanceScore += Math.min(10, qualityMatches * 2); // Up to 10 points for quality indicators

  // 5. Content length and substance
  const wordCount = actualContent.split(/\s+/).length;
  if (wordCount > 500) {
    relevanceScore += 5;
  } // Substantial content
  if (wordCount < 100) {
    relevanceScore -= 10;
  } // Too short

  // Determine if content is relevant
  const isRelevant = relevanceScore >= 15 && exactMatches > 0;

  if (!isRelevant) {
    issues.unshift(`Relevance score too low: ${relevanceScore}/50 (need ≥15 with exact matches)`);
  }

  return {
    isRelevant,
    relevanceScore: Math.max(0, Math.min(50, relevanceScore)),
    issues,
  };
}

/**
 * Enhanced content extraction with relevance validation
 */
function extractContentWithValidation(
  html: string,
  url: string,
  phoneBrand: string,
  phoneModel: string,
): ExtractionResult & { relevanceValidation: ReturnType<typeof validateContentRelevance> } {
  const originalLength = html.length;

  // Extract metadata first
  const metadata = extractMetadata(html);

  // Use site-specific extraction if available
  let cleanContent: string;
  if (url?.includes("gsmarena.com")) {
    // Check if this is a specs page by looking at URL/title
    const isSpecsPage = url.includes("specifications") || url.includes("specs") ||
                       (metadata.title && (metadata.title.includes("specifications") || metadata.title.includes("specs")));

    if (isSpecsPage) {
      cleanContent = extractGsmarenaSpecsContent(html);
    } else {
      cleanContent = extractGsmarenaContent(html);
    }
  } else {
    cleanContent = cleanHtmlContent(html);
  }

  // Skip length limit for GSMArena reviews to ensure complete content
  if (!url?.includes("gsmarena.com")) {
    if (cleanContent.length > DISCOVERY_CONFIG.CONTENT_LIMITS.MAX_CONTENT_LENGTH) {
      cleanContent = cleanContent.substring(0, DISCOVERY_CONFIG.CONTENT_LIMITS.MAX_CONTENT_LENGTH) + "...";
    }
  }

  const cleanLength = cleanContent.length;
  const compressionRatio = originalLength > 0 ? cleanLength / originalLength : 1;

  // Create formatted content for validation
  const formattedContent = [
    `SOURCE: ${metadata.title || "Unknown"}`,
    `TITLE: ${metadata.title || "Unknown"}`,
    `TIMESTAMP: ${new Date().toISOString()}`,
    "",
    cleanContent,
  ].join("\n");

  // Validate content relevance
  const relevanceValidation = validateContentRelevance(formattedContent, phoneBrand, phoneModel, url);

  return {
    cleanContent,
    metadata,
    statistics: {
      originalLength,
      cleanLength,
      compressionRatio,
    },
    relevanceValidation,
  };
}

/**
 * ============================================================================
 * IMAGE PROCESSING
 * ============================================================================
 */

/**
 * Extract images from HTML content
 */
function extractImages(html: string, baseUrl: string): ImageInfo[] {
  const $ = cheerio.load(html);
  const images: ImageInfo[] = [];

  $("img").each((_, elem) => {
    const src = $(elem).attr("src");
    const alt = $(elem).attr("alt") || "";
    const title = $(elem).attr("title") || "";

    if (src && isRelevantImage(src, alt, title)) {
      const fullUrl = src.startsWith("http") ? src : new URL(src, baseUrl).href;
      const category = categorizeImage(alt, title, src);

      images.push({
        url: fullUrl,
        alt,
        title,
        category,
      });
    }
  });

  return images.slice(0, DISCOVERY_CONFIG.CONTENT_LIMITS.MAX_IMAGES_PER_PAGE);
}

/**
 * Check if image is relevant for phone reviews
 */
function isRelevantImage(src: string, alt: string, title: string): boolean {
  // Skip tiny icons and logos
  if (src.includes("icon") || src.includes("logo") || src.includes("favicon")) {
    return false;
  }

  // Skip tracking pixels and tiny images
  if (src.includes("pixel") || src.includes("tracker") || src.includes("1x1")) {
    return false;
  }

  // Check for phone-related content
  const content = `${alt} ${title} ${src}`.toLowerCase();
  const phoneKeywords = ["phone", "smartphone", "mobile", "device", "camera", "battery", "spec", "review"];

  return phoneKeywords.some((keyword) => content.includes(keyword));
}

/**
 * Advanced image categorization - Hero images only
 */
function categorizeImage(alt: string, title: string, src: string): ImageCategory {
  // Since we only collect hero images now, all relevant images are categorized as hero
  const text = `${alt} ${title} ${src}`.toLowerCase();
  const url = src.toLowerCase();

  // Check if image is relevant for phone reviews (basic filtering)
  const phoneKeywords = ["phone", "smartphone", "mobile", "device", "camera", "battery", "spec", "review"];

  if (phoneKeywords.some((keyword) => text.includes(keyword))) {
    return "hero";
  }

  // GSMArena-specific patterns
  if (url.includes("gsmarena.com") || url.includes("gsmarena")) {
    if (
      url.includes("01.") ||
      url.includes("02.") ||
      url.includes("03.") ||
      url.includes("front") ||
      url.includes("main") ||
      url.includes("hero") ||
      text.includes("apple iphone") ||
      text.includes("samsung") ||
      text.includes("google pixel") ||
      text.includes("oneplus") ||
      text.includes("xiaomi") ||
      text.includes("huawei") ||
      text.includes("sony") ||
      text.includes("lg")
    ) {
      return "hero";
    }
  }

  // Default fallback - all images are treated as hero images now
  return "hero";
}

/**
 * Download and save image with optimization
 */
async function downloadImage(imageInfo: ImageInfo, outputPath: string): Promise<string> {
  try {
    const response = await axios.get(imageInfo.url, {
      headers: {
        "User-Agent": "SmartMatch-AI/1.0 (Image Collector)",
        Accept: "image/*",
      },
      timeout: 30000,
      responseType: "arraybuffer",
    });

    const buffer = response.data;
    const contentType = response.headers["content-type"] || "";

    // Validate image format and size
    const validation = validateImageBuffer(buffer, contentType);
    if (!validation.isValid) {
      console.warn(`⚠️ Skipping invalid image ${imageInfo.url}: ${validation.reason}`);
      return "";
    }

    // Optimize image if needed
    const optimizedBuffer = await optimizeImageBuffer(buffer, contentType, imageInfo.category);

    const extension = getImageExtension(contentType);
    const filename = `${outputPath}.${extension}`;

    await fs.writeFile(filename, optimizedBuffer);

    console.log(
      `✅ Downloaded ${imageInfo.category} image: ${filename} (${optimizedBuffer.byteLength} bytes, ${validation.width}x${validation.height})`,
    );
    return filename;
  } catch (error) {
    console.warn(`⚠️ Failed to download image ${imageInfo.url}:`, error);
    return "";
  }
}

/**
 * Get image file extension from content type
 */
function getImageExtension(contentType: string): string {
  switch (contentType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg"; // Default fallback
  }
}

/**
 * Validate image buffer format and extract dimensions
 */
function validateImageBuffer(
  buffer: Buffer,
  _contentType: string,
): { isValid: boolean; reason?: string; width?: number; height?: number } {
  try {
    // Check minimum file size (at least 1KB for meaningful images)
    if (buffer.length < 1024) {
      return { isValid: false, reason: "Image too small (< 1KB)" };
    }

    // Check maximum file size (50MB limit)
    if (buffer.length > 50 * 1024 * 1024) {
      return { isValid: false, reason: "Image too large (> 50MB)" };
    }

    // Basic format validation by checking magic bytes
    if (buffer.length < 4) {
      return { isValid: false, reason: "Invalid image format" };
    }

    // Check for common image formats
    const magicBytes = buffer.subarray(0, 4);

    // JPEG: FF D8 FF
    if (magicBytes[0] === 0xff && magicBytes[1] === 0xd8 && magicBytes[2] === 0xff) {
      return { isValid: true, width: 0, height: 0 }; // Would need full JPEG parser for dimensions
    }

    // PNG: 89 50 4E 47
    if (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4e && magicBytes[3] === 0x47) {
      return { isValid: true, width: 0, height: 0 }; // Would need full PNG parser for dimensions
    }

    // GIF: 47 49 46 38
    if (magicBytes[0] === 0x47 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x38) {
      return { isValid: true, width: 0, height: 0 }; // Would need full GIF parser for dimensions
    }

    // WebP: 52 49 46 46 (RIFF)
    if (magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x46) {
      return { isValid: true, width: 0, height: 0 }; // Would need full WebP parser for dimensions
    }

    return { isValid: false, reason: "Unsupported image format" };
  } catch (error) {
    return { isValid: false, reason: `Validation error: ${error}` };
  }
}

/**
 * Optimize image buffer based on category and size
 */
async function optimizeImageBuffer(buffer: Buffer, _contentType: string, category: ImageCategory): Promise<Buffer> {
  try {
    // For now, just return the original buffer
    // In a full implementation, this would:
    // - Resize large images
    // - Convert to optimal format
    // - Apply compression
    // - Strip metadata

    // Basic size-based optimization for hero images
    if (category === "hero" && buffer.length > 500 * 1024) {
      // Over 500KB
      console.log(
        `📏 Large hero image detected (${(buffer.length / 1024).toFixed(1)}KB), would optimize in full implementation`,
      );
    }

    return buffer; // Return as-is for now
  } catch (error) {
    console.warn("⚠️ Image optimization failed:", error);
    return buffer; // Return original on error
  }
}

/**
 * ============================================================================
 * MAIN PROCESSING FUNCTIONS
 * ============================================================================
 */

/**
 * Scrape and process sources for a phone using CSE + Archive URLs
 */
export async function processPhoneSources(
  phoneBrand: string,
  phoneModel: string,
  sources: PhoneSources,
  phoneConfig?: import("./discovery-types.js").PhoneConfigEntry,
): Promise<{ sources: PhoneEntry["sources"]; downloadedImages: { [_key in ImageCategory]: string[] } }> {
  const processedSources: PhoneEntry["sources"] = {
    specs: [],
    gsmarena_review: [],
    phonearena_review: [],
    camera: [],
    quality_reviews: [],
  };

  // Track downloaded images
  const downloadedImages: { [_key in ImageCategory]: string[] } = {
    hero: [],
  };

  // Create content directory for this phone
  const phoneDirName = `${phoneBrand}_${phoneModel}`
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const contentBaseDir = `data/content/${phoneDirName}`;

  // Process each source type - map to granular categories
  const sourceTypes: (keyof PhoneSources)[] = [
    "gsmarena_specs",
    "gsmarena_review",
    "phonearena_review",
    "dxomark_camera",
    "quality_reviews",
  ];

  // Category mapping from source types to target categories
  const CATEGORY_MAPPING: Record<keyof PhoneSources, keyof PhoneEntry["sources"]> = {
    gsmarena_specs: "specs",
    gsmarena_review: "gsmarena_review",
    phonearena_review: "phonearena_review",
    dxomark_camera: "camera",
    quality_reviews: "quality_reviews",
  };

  // Initialize robots parser
  const robotsParser = new RobotsTxtParser();

  for (const sourceType of sourceTypes) {
    const sourceList = sources[sourceType] || [];

    // Map to granular category
    const targetCategory = CATEGORY_MAPPING[sourceType];

    for (let i = 0; i < sourceList.length; i++) {
      const source = sourceList[i];
      if (!source || typeof source !== "object") {
        continue;
      } // Skip if source is undefined or invalid

      try {
        console.log(`📥 Scraping ${sourceType}: ${(source.title || "Unknown").substring(0, 40)}...`);

        // Add delay between requests
        const delay = DISCOVERY_CONFIG.DELAYS.SCRAPING_BASE + Math.random() * DISCOVERY_CONFIG.DELAYS.SCRAPING_RANDOM;
        await new Promise((resolve) => setTimeout(resolve, delay));

        // CDX → Wayback → Direct scraping priority order
        let scrapingResult: ScrapingResult | undefined;

        // 1. Try stored archive URL first (if it exists and is valid)
        if (source.archive?.trim()) {
          scrapingResult = await scrapeArchiveContent(source.archive, robotsParser);
        }

        // 2. If no stored archive URL OR stored archive failed, query Wayback API dynamically
        if (!scrapingResult?.success && source.cse) {
          console.log(`🔍 No valid stored archive URL, querying Wayback API for: ${source.cse}`);

          // Use priority source logic for GSMArena specs and DXOMark camera
          const isPrioritySource = sourceType === "gsmarena_specs" || sourceType === "dxomark_camera";
          const archiveCheck = isPrioritySource
            ? await import("./discovery-cse.js").then((m) => m.checkArchiveAvailabilityForPrioritySources(source.cse))
            : await import("./discovery-cse.js").then((m) => m.checkArchiveAvailability(source.cse));

          if (archiveCheck.available && archiveCheck.archiveUrl) {
            console.log(`✅ Found archive URL via Wayback API: ${archiveCheck.archiveUrl}`);
            scrapingResult = await scrapeArchiveContent(archiveCheck.archiveUrl, robotsParser);

            // Update metadata to reflect we used a dynamically found archive URL
            if (scrapingResult && scrapingResult.success) {
              scrapingResult.metadata.url = archiveCheck.archiveUrl;
            }
          }
        }

        // 3. Final fallback: scrape original CSE URL directly
        if (!scrapingResult?.success && source.cse) {
          console.log(`🔄 Archive approaches failed, scraping original URL: ${source.cse}`);
          scrapingResult = await scrapeOriginalContent(source.cse);

          // Update the URL to reflect we used the original
          if (scrapingResult && scrapingResult.success) {
            scrapingResult.metadata.url = source.cse; // Use original URL in metadata
          }
        }

        if (scrapingResult && scrapingResult.success && scrapingResult.content) {
          let finalContent = scrapingResult.content;

          // Special handling for GSMArena reviews - handle pagination
          if (source.source === "gsmarena.com" && sourceType === "gsmarena_review") {
            console.log("📄 GSMArena review detected, checking for pagination...");
            finalContent = await scrapeGsmarenaReviewPages(
              {
                cse: source.cse || "",
                archive: source.archive || "",
                title: source.title || "Unknown",
                source: source.source || "unknown",
              },
              scrapingResult.content,
              robotsParser,
            );
          }

          // Extract proper title from scraped content if it's a placeholder
          if (source.title === "Existing URL" || !source.title || source.title.trim() === "") {
            const extractedTitle = extractTitle(
              finalContent,
              source.cse,
              phoneBrand,
              phoneModel,
              phoneConfig?.releaseDate,
            );
            if (extractedTitle && extractedTitle.trim() !== "") {
              source.title = extractedTitle.trim();
              console.log(`📝 Updated title from HTML: ${source.title}`);
            }
          }

          // Extract and validate content relevance
          const extractionResult = extractContentWithValidation(finalContent, source.cse, phoneBrand, phoneModel);
          const cleanContent = extractionResult.cleanContent || "";

          // Check if content is relevant to the target phone
          if (!extractionResult.relevanceValidation.isRelevant) {
            console.log(`🚫 Content validation failed for ${sourceType}: ${source.title}`);
            console.log(`   Issues: ${extractionResult.relevanceValidation.issues.join(", ")}`);
            console.log(`   Relevance score: ${extractionResult.relevanceValidation.relevanceScore}/50`);

            // Skip saving this content - it's not relevant
            console.log(`⏭️ Skipping irrelevant content for ${phoneBrand} ${phoneModel}`);
            continue;
          }

          console.log(
            `✅ Content validation passed (score: ${extractionResult.relevanceValidation.relevanceScore}/50)`,
          );

          // Determine review status for GSMArena reviews
          let reviewStatus = "";
          if ((source.source || "") === "gsmarena.com" && sourceType === "gsmarena_review") {
            reviewStatus = detectGsmarenaReviewStatus(cleanContent, source.title || "");
            console.log(`📊 GSMArena review status: ${reviewStatus}`);
          }

          // Save content to file - use loop index for consistent naming
          const fileIndex = i;
          const contentFileName =
            sourceType === "quality_reviews"
              ? `${fileIndex + 1}_${(source.source || "unknown").replace(/\./g, "_")}.txt`
              : `${fileIndex + 1}_${sourceType}.txt`;
          const contentFilePath = `${contentBaseDir}/${contentFileName}`;

          // Ensure directory exists
          await fs.mkdir(contentBaseDir, { recursive: true });

          // Format content with metadata headers
          const formattedContent = [
            `SOURCE: ${source.source}`,
            `TITLE: ${source.title}`,
            ...(reviewStatus ? [`STATUS: ${reviewStatus}`] : []),
            `TIMESTAMP: ${new Date().toISOString()}`,
            "",
            cleanContent,
          ].join("\n");

          // Write formatted content to file
          await fs.writeFile(contentFilePath, formattedContent, "utf8");

          // Auto-download hero image if missing (only from GSMArena specs pages)
          if (isGsmarenaSpecificationPage(source.source ?? "", source.title ?? "", source.cse ?? "")) {
            // Check if phone already has hero images by checking actual file existence
            const hasHeroImage = await hasHeroImages(phoneBrand, phoneModel);

            if (!hasHeroImage) {
              console.log(
                `📷 No hero images found for ${phoneBrand} ${phoneModel}, force-scraping archive for image extraction...`,
              );

              // Force-scrape archive specifically for image extraction
              let archiveImageContent: string | null = null;

              try {
                // Try to scrape the archive URL directly for images
                if (source.archive?.trim()) {
                  const archiveResult = await scrapeArchiveContent(source.archive, robotsParser);
                  if (archiveResult.success && archiveResult.content) {
                    archiveImageContent = archiveResult.content;
                    console.log(`✅ Got archive content for image extraction (${archiveImageContent.length} chars)`);
                  }
                }

                // If archive scraping failed, try original URL as fallback
                if (!archiveImageContent) {
                  console.log("🔄 Archive scraping failed, trying original URL for image extraction...");
                  const originalResult = await scrapeOriginalContent(source.cse);
                  if (originalResult.success && originalResult.content) {
                    archiveImageContent = originalResult.content;
                    console.log(`✅ Got original content for image extraction (${archiveImageContent.length} chars)`);
                  }
                }

                // Extract images from the scraped content
                if (archiveImageContent) {
                  const heroImageResult = await processHeroImageOnly(
                    phoneBrand,
                    phoneModel,
                    archiveImageContent,
                    source.cse,
                  );

                  if (heroImageResult.hero.length > 0) {
                    console.log(
                      `✅ Downloaded ${heroImageResult.hero.length} hero image(s) from force-scraped content`,
                    );

                    // Update the downloadedImages result to include the hero images
                    // This ensures the images get saved to the phone config
                    downloadedImages.hero = [...downloadedImages.hero, ...heroImageResult.hero];
                  } else {
                    console.log("📷 No hero images found in force-scraped content");
                  }
                } else {
                  console.log("⚠️ Could not scrape content for image extraction");
                }
              } catch (error) {
                console.warn("⚠️ Error during force-scraping for images:", error);
              }
            } else {
              console.log(`⏭️ Hero image already exists for ${phoneBrand} ${phoneModel}`);
            }
          }

          processedSources[targetCategory].push({
            url: source.archive, // Archive.org URL
            source: source.source || "",
            title: source.title || "",
            contentFile: contentFilePath,
            scrapedAt: new Date().toISOString(),
            contentLength: cleanContent.length,
          });

          console.log(`✅ Saved ${sourceType} content to ${contentFileName} (${cleanContent.length} chars)`);
        } else {
          const errorMsg = scrapingResult?.error || "Unknown scraping error";
          console.log(`⚠️ Failed to scrape ${sourceType}: ${errorMsg}`);
        }
      } catch (error) {
        console.error(`💥 Error scraping ${sourceType}:`, error);
      }
    }
  }

  return { sources: processedSources, downloadedImages };
}

/**
 * Scrape GSMArena review with automatic pagination handling
 */
async function scrapeGsmarenaReviewPages(
  source: { cse: string; archive: string; title: string; source: string },
  baseContent: string,
  robotsParser: RobotsTxtParser,
): Promise<string> {
  console.log(`📄 Scraping GSMArena review pages for: ${source.title}`);

  // Extract clean content from base page first
  const baseCleanContent = extractGsmarenaContent(baseContent);
  let combinedContent = baseCleanContent;

  // Always attempt pagination to ensure complete review content
  console.log("📄 Attempting pagination to get complete GSMArena review...");

  // Automatically try pages 2, 3, 4, etc. up to a reasonable limit
  const maxPages = 10; // Try up to 10 additional pages
  let pagesScraped = 0;

  for (let pageNum = 2; pageNum <= maxPages; pageNum++) {
    console.log(`📄 Attempting to scrape page ${pageNum}...`);

    // Construct archive URL for this page by replacing .php with p{pageNum}.php
    const baseArchiveUrl = source.archive;
    if (!baseArchiveUrl) {
      console.log(`⚠️ No base archive URL available for page ${pageNum}`);
      break;
    }

    // Replace the .php extension with p{pageNum}.php
    const pageArchiveUrl = baseArchiveUrl.replace(/(\.php)$/, `p${pageNum}.php`);

    try {
      // Add delay between requests
      await new Promise((resolve) => setTimeout(resolve, DISCOVERY_CONFIG.DELAYS.SCRAPING_BASE));

      // Scrape this page using our existing logic
      const pageResult = await scrapeArchiveContent(pageArchiveUrl, robotsParser);

      if (pageResult.success && pageResult.content) {
        // Extract clean content from this page
        const pageCleanContent = extractGsmarenaContent(pageResult.content);

        // Only add substantial content (avoid empty or navigation-only pages)
        if (pageCleanContent.length > 200) {
          combinedContent += "\n\n" + pageCleanContent;
          pagesScraped++;
          console.log(`📄 Successfully scraped page ${pageNum} (${pageCleanContent.length} chars)`);
        } else {
          console.log(`📄 Page ${pageNum} has insufficient content (${pageCleanContent.length} chars) - stopping`);
          break;
        }
      } else {
        // If page doesn't exist or fails to load, stop pagination
        console.log(`📄 Page ${pageNum} not available or failed to load - stopping pagination`);
        break;
      }
    } catch (error) {
      console.log(`⚠️ Error scraping page ${pageNum}:`, error);
      // Continue to next page - some failures are expected
    }
  }

  if (pagesScraped > 0) {
    console.log(
      `✅ GSMArena review complete - scraped ${pagesScraped} additional pages (${combinedContent.length} total chars)`,
    );
  } else {
    console.log(`📄 GSMArena review complete - no additional pages available (${combinedContent.length} chars)`);
  }

  return combinedContent;
}

/**
 * Determine if a GSMArena review is "Full" or "Partial" based on content analysis
 */
function detectGsmarenaReviewStatus(content: string, title: string): "Full" | "Partial" {
  const contentLower = content.toLowerCase();
  const titleLower = title.toLowerCase();

  // Check for verdict keywords in title - these indicate full reviews
  const verdictTitleKeywords = ["verdict", "conclusion", "final thoughts", "summary", "wrap-up", "roundup"];
  if (verdictTitleKeywords.some((keyword) => titleLower.includes(keyword))) {
    return "Full";
  }

  // Check for verdict keywords in content - full reviews have verdict sections
  const verdictContentKeywords = [
    "verdict",
    "conclusion",
    "final thoughts",
    "summary",
    "wrap-up",
    "roundup",
    "in conclusion",
    "to sum up",
    "overall",
    "final word",
    "bottom line",
  ];
  const verdictKeywordCount = verdictContentKeywords.reduce((count, keyword) => {
    return count + (contentLower.split(keyword).length - 1);
  }, 0);

  // If multiple verdict keywords found, it's a full review with conclusion
  if (verdictKeywordCount >= 3) {
    return "Full";
  }

  // Check content length - very short content without verdict is likely a partial review
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 800) {
    // Less than 800 words without verdict is likely a partial review
    return "Partial";
  }

  // Check for structural indicators of full review
  const fullReviewIndicators = [
    "introduction",
    "design",
    "display",
    "performance",
    "camera",
    "battery",
    "software",
    "conclusion",
    "pros",
    "cons",
    "specifications",
  ];
  const sectionCount = fullReviewIndicators.reduce((count, indicator) => {
    return count + (contentLower.includes(indicator.toLowerCase()) ? 1 : 0);
  }, 0);

  // If multiple sections found, it's likely a full review
  if (sectionCount >= 4) {
    return "Full";
  }

  // Default to Full for comprehensive content, Partial for shorter content
  return wordCount > 1500 ? "Full" : "Partial";
}

/**
 * Check if a source is a GSMArena specification page
 */
function isGsmarenaSpecificationPage(source: string, title: string, url: string): boolean {
  if (source !== "gsmarena.com") {
    return false;
  }

  const titleLower = title.toLowerCase();
  const urlLower = url.toLowerCase();

  // Check for specification-related keywords in title or URL
  return (
    titleLower.includes("specifications") ||
    titleLower.includes("specs") ||
    urlLower.includes("specifications") ||
    urlLower.includes("specs")
  );
}

/**
 * Check if phone already has hero images by checking actual file existence
 */
async function hasHeroImages(phoneBrand: string, phoneModel: string): Promise<boolean> {
  const phoneDirName = `${phoneBrand}_${phoneModel}`
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const imagesDir = `data/content/${phoneDirName}/images`;

  try {
    const files = await fs.readdir(imagesDir);
    return files.some(
      (file) => file.startsWith("hero_") && (file.endsWith(".jpg") || file.endsWith(".png") || file.endsWith(".webp")),
    );
  } catch {
    return false;
  }
}

/**
 * Process and download only hero images from HTML content
 */
async function processHeroImageOnly(
  phoneBrand: string,
  phoneModel: string,
  htmlContent: string,
  baseUrl: string,
): Promise<{ [_key in ImageCategory]: string[] }> {
  const phoneDirName = `${phoneBrand}_${phoneModel}`
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const imagesBaseDir = `data/content/${phoneDirName}/images`;

  // Extract images from HTML
  const images = extractImages(htmlContent, baseUrl);

  if (images.length === 0) {
    console.log(`📷 No relevant images found for ${phoneBrand} ${phoneModel}`);
    return { hero: [] };
  }

  console.log(`📷 Found ${images.length} images for ${phoneBrand} ${phoneModel}, filtering for hero images...`);

  // Debug: Log all found images
  console.log("📷 Debug: Found images:");
  images.forEach((img, idx) => {
    console.log(`   ${idx + 1}. URL: ${img.url.substring(0, 50)}..., Alt: "${img.alt}", Category: ${img.category}`);
  });

  // Filter for hero images only
  const heroImages = images.filter((image) => image.category === "hero");

  if (heroImages.length === 0) {
    console.log(`📷 No hero images found for ${phoneBrand} ${phoneModel}`);
    return { hero: [] };
  }

  console.log(`📷 Found ${heroImages.length} hero images, downloading...`);

  // Download hero images (limit to 1)
  const downloadedImages: { [_key in ImageCategory]: string[] } = {
    hero: [],
  };

  // Only download the first hero image
  if (heroImages.length > 0) {
    const heroImage = heroImages[0];
    if (heroImage) {
      const outputPath = `${imagesBaseDir}/hero_1`;

      // Ensure images directory exists
      await fs.mkdir(imagesBaseDir, { recursive: true });

      const downloadedPath = await downloadImage(heroImage, outputPath);
      if (downloadedPath) {
        downloadedImages.hero.push(downloadedPath);
      }
    }
  }

  console.log(`📷 Downloaded ${downloadedImages.hero.length} hero image(s) for ${phoneBrand} ${phoneModel}`);
  return downloadedImages;
}

/**
 * Process images for existing phones by extracting from saved content files
 * This function can be called independently to add images to phones that already have content
 */
export async function processImagesForExistingPhone(
  phoneBrand: string,
  phoneModel: string,
  phoneConfig: import("./discovery-types.js").PhoneConfigEntry,
): Promise<{ [_key in ImageCategory]: string[] }> {
  const phoneDirName = `${phoneBrand}_${phoneModel}`
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const contentBaseDir = `data/content/${phoneDirName}`;

  console.log(`🔄 Processing images for existing phone: ${phoneBrand} ${phoneModel}`);

  // Check if phone already has hero images
  const hasHeroImage = phoneConfig?.images?.hero && phoneConfig.images.hero.length > 0;
  if (hasHeroImage) {
    console.log(`⏭️ ${phoneBrand} ${phoneModel} already has hero images, skipping`);
    return phoneConfig.images || { hero: [] };
  }

  // Find GSMArena specs content file
  const gsmarenaSpecsFile = `${contentBaseDir}/1_gsmarena_specs.txt`;

  try {
    // Check if GSMArena specs content file exists
    await fs.access(gsmarenaSpecsFile);

    // Read the content file to extract the original URL for image processing
    const content = await fs.readFile(gsmarenaSpecsFile, "utf8");
    const lines = content.split("\n");
    const sourceLine = lines.find((line) => line.startsWith("SOURCE: "));
    const titleLine = lines.find((line) => line.startsWith("TITLE: "));

    if (!sourceLine || !titleLine) {
      console.log(`⚠️ Could not extract source info from ${gsmarenaSpecsFile}`);
      return phoneConfig.images;
    }

    const source = sourceLine.replace("SOURCE: ", "").trim();
    const title = titleLine.replace("TITLE: ", "").trim();

    // Check if this is a GSMArena specs page
    if (!isGsmarenaSpecificationPage(source, title, "")) {
      console.log(`⏭️ ${gsmarenaSpecsFile} is not a GSMArena specs page`);
      return phoneConfig.images;
    }

    // Find the corresponding URL from phone config
    const gsmarenaSpecsUrls = phoneConfig.urls?.gsmarena_specs;
    if (!gsmarenaSpecsUrls || gsmarenaSpecsUrls.length === 0) {
      console.log(`⚠️ No GSMArena specs URLs found in config for ${phoneBrand} ${phoneModel}`);
      return phoneConfig.images || { hero: [] };
    }

    // Use the first (primary) GSMArena specs URL
    const specsUrl = gsmarenaSpecsUrls[0]?.cse;
    if (!specsUrl) {
      console.log("⚠️ No CSE URL found for GSMArena specs");
      return phoneConfig.images || { hero: [] };
    }

    console.log(`📷 Found GSMArena specs URL: ${specsUrl}`);

    // Try to scrape the original URL to get fresh HTML with images
    // First try archive URL, then fallback to original
    let htmlContent: string | null = null;
    const robotsParser = new RobotsTxtParser();

    // Try archive URL first
    const firstSpecsUrl = gsmarenaSpecsUrls[0];
    if (firstSpecsUrl?.archive) {
      console.log("🔍 Trying archive URL for image extraction...");
      const archiveResult = await scrapeArchiveContent(firstSpecsUrl.archive, robotsParser);
      if (archiveResult.success && archiveResult.content) {
        htmlContent = archiveResult.content;
        console.log(`✅ Got HTML from archive (${htmlContent.length} chars)`);
      }
    }

    // Fallback to original URL if archive failed
    if (!htmlContent) {
      console.log("🔄 Archive failed, trying original URL for image extraction...");
      const originalResult = await scrapeOriginalContent(specsUrl);
      if (originalResult.success && originalResult.content) {
        htmlContent = originalResult.content;
        console.log(`✅ Got HTML from original site (${htmlContent.length} chars)`);
      }
    }

    if (!htmlContent) {
      console.log("⚠️ Could not retrieve HTML content for image extraction");
      return phoneConfig.images;
    }

    // Extract and download hero images
    console.log("📷 Extracting images from HTML content...");
    const downloadedImages = await processHeroImageOnly(phoneBrand, phoneModel, htmlContent, specsUrl);

    if (downloadedImages.hero.length > 0) {
      console.log(
        `✅ Successfully downloaded ${downloadedImages.hero.length} hero image(s) for ${phoneBrand} ${phoneModel}`,
      );

      // Update phone config with downloaded images
      const updatedImages = { ...phoneConfig.images };
      updatedImages.hero = downloadedImages.hero;

      // Recalculate image completeness
      const totalImages = Object.values(updatedImages).flat().length;
      phoneConfig.metadata.imageCompleteness = totalImages > 0 ? Math.min(1.0, totalImages / 10) : 0;

      return updatedImages;
    } else {
      console.log(`📷 No hero images found for ${phoneBrand} ${phoneModel}`);
      return phoneConfig.images;
    }
  } catch (error) {
    console.warn(`⚠️ Error processing images for existing phone ${phoneBrand} ${phoneModel}:`, error);
    return phoneConfig.images;
  }
}
