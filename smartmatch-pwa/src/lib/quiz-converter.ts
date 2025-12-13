/**
 * smartMatch Oracle v1.1 - Quiz Preference Converter
 * 
 * Converts QuizAnswers to smartMatch UserPreferences
 */

import type { QuizAnswers } from "@/types";
import type { UserPreferences } from "@/lib/canonical-types";

/**
 * Convert quiz answers to smartMatch user preferences
 */
export function convertQuizTosmartMatchPreferences(quiz: QuizAnswers): UserPreferences {
    const prefs: UserPreferences = {
        priorities: {},
        ecosystem: mapEcosystemPreference(quiz.stylePreference),
        useCase: mapUseCase(quiz.primaryUsage)
    };

    // Map budget
    const budget = mapBudget(quiz.budget);
    if (budget) {
        prefs.maxBudget = budget;
    }

    // Map camera importance
    prefs.priorities.camera = mapImportanceToScore(quiz.cameraImportance);

    // Map battery importance
    prefs.priorities.battery = mapBatteryToScore(quiz.batteryImportance);

    // Map primary usage to performance
    prefs.priorities.performance = mapUsageToPerformance(quiz.primaryUsage);

    // Set default priorities for other attributes
    prefs.priorities.design = 5; // Default mid-range
    prefs.priorities.software = 6; //Default slightly important
    prefs.priorities.price = mapBudgetToPrice(quiz.budget);
    prefs.priorities.charging = mapBatteryToCharging(quiz.batteryImportance);
    prefs.priorities.thermals = mapUsageToThermals(quiz.primaryUsage);

    return prefs;
}

/**
 * Map ecosystem preference from quiz to smartMatch format
 */
function mapEcosystemPreference(style: string): "iOS" | "Android" | "Any" {
    if (style === "iOS Ecosystem") return "iOS";
    if (style === "Android Customization") return "Android";
    return "Any";
}

/**
 * Map use case from quiz to smartMatch format
 */
function mapUseCase(usage: string): "Gaming" | "Photography" | "Content Creation" | "General" {
    if (usage === "Gaming & Entertainment") return "Gaming";
    if (usage === "Photography & Social") return "Photography";
    if (usage === "Work & Productivity") return "Content Creation";
    return "General";
}

/**
 * Map budget string to max budget number
 */
function mapBudget(budget: string): number | undefined {
    if (budget.includes("Budget (<$400)")) return 400;
    if (budget.includes("Mid-range ($400-$700)")) return 700;
    if (budget.includes("Premium ($700-$1000)")) return 1000;
    // Flagship has no budget limit
    return undefined;
}

/**
 * Map importance string to 0-10 score
 */
function mapImportanceToScore(importance: string): number {
    if (importance === "Essential") return 10;
    if (importance === "Important") return 8;
    if (importance === "Nice to have") return 5;
    return 2; // Not important
}

/**
 * Map battery importance to 0-10 score
 */
function mapBatteryToScore(battery: string): number {
    if (battery === "All day+") return 10;
    if (battery === "Full day") return 8;
    if (battery === "Most of day") return 6;
    return 4; // Flexible
}

/**
 * Map usage to performance score
 */
function mapUsageToPerformance(usage: string): number {
    if (usage === "Gaming & Entertainment") return 10;
    if (usage === "Photography & Social") return 7;
    if (usage === "Work & Productivity") return 7;
    return 5; // Calls & Messaging
}

/**
 * Map budget to price priority
 */
function mapBudgetToPrice(budget: string): number {
    if (budget.includes("Budget")) return 10; // Price is critical
    if (budget.includes("Mid-range")) return 7; // Price is important
    if (budget.includes("Premium")) return 4; // Price is less important
    return 2; // Flagship - price not a concern
}

/**
 * Map battery importance to charging priority
 */
function mapBatteryToCharging(battery: string): number {
    if (battery === "Flexible") return 9; // Need fast charging
    if (battery === "Most of day") return 7; // Charging helps
    if (battery === "Full day") return 5; // Charging nice to have
    return 3; // All day+ - battery so good charging less critical
}

/**
 * Map usage to thermals priority
 */
function mapUsageToThermals(usage: string): number {
    if (usage === "Gaming & Entertainment") return 9; // Gaming heats up phones
    if (usage === "Photography & Social") return 4; // Some concern
    return 3; // Low concern
}
