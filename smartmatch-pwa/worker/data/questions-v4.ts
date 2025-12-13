
import { Question } from '../core/types';

// 🌑 LATENT TRAIT INDEX (Reference)
// 0: opticalDepth
// 1: nightPreference
// 2: detailSensitivity
// 3: colorAccuracyBias
// 4: videoStabilityPriority
// 5: enduranceBias
// 6: chargingSpeedBias
// 7: lowHeatTolerance
// 8: thermalTolerance
// 9: performanceDemand
// 10: sustainedPerfDemand
// 11: microStutterSensitivity
// 12: ecosystemLockIn
// 13: simplicityPreference
// 14: taskSwitchingDemand
// 15: productivityBias
// 16: designSensitivity
// 17: durabilityPriority
// 18: sizePreferenceSmall
// 19: sizePreferenceLarge
// 20: longTermOwnershipBias
// 21: supportHorizonSensitivity
// 22: resaleAwareness
// 23: featureAffinity
// 24: wirelessChargeImportance
// 25: displayColorPreference
// 26: displayBrightnessPreference
// 27: marginalGainSensitivity

export const TRAIT_INDICES: Record<string, number> = {
    opticalDepth: 0,
    nightPreference: 1,
    detailSensitivity: 2,
    colorAccuracyBias: 3,
    videoStabilityPriority: 4,
    enduranceBias: 5,
    chargingSpeedBias: 6,
    lowHeatTolerance: 7,
    thermalTolerance: 8,
    performanceDemand: 9,
    sustainedPerfDemand: 10,
    microStutterSensitivity: 11,
    ecosystemLockIn: 12,
    simplicityPreference: 13,
    taskSwitchingDemand: 14,
    productivityBias: 15,
    designSensitivity: 16,
    durabilityPriority: 17,
    sizePreferenceSmall: 18,
    sizePreferenceLarge: 19,
    longTermOwnershipBias: 20,
    supportHorizonSensitivity: 21,
    resaleAwareness: 22,
    featureAffinity: 23,
    wirelessChargeImportance: 24,
    displayColorPreference: 25,
    displayBrightnessPreference: 26,
    marginalGainSensitivity: 27
};

export const QUESTIONS_V4: Question[] = [
    // --- DISCRIMINATOR QUESTIONS (Q1-Q4) ---
    {
        id: "q_01",
        text: "What matters most to you in a phone?",
        category: "discriminator", // Variance 0.06
        options: [
            {
                id: "o1",
                text: "Balance everything",
                impacts: [
                    { traitIdx: 0, mu: 0.55, var: 0.06 },
                    { traitIdx: 1, mu: 0.50, var: 0.06 },
                    { traitIdx: 5, mu: 0.40, var: 0.06 },
                    { traitIdx: 9, mu: 0.45, var: 0.06 },
                    { traitIdx: 12, mu: 0.50, var: 0.06 },
                    { traitIdx: 21, mu: 0.50, var: 0.06 }
                ]
            },
            {
                id: "o2",
                text: "Camera quality",
                impacts: [
                    { traitIdx: 0, mu: 0.82, var: 0.06 },
                    { traitIdx: 1, mu: 0.90, var: 0.06 },
                    { traitIdx: 5, mu: 0.45, var: 0.06 },
                    { traitIdx: 9, mu: 0.50, var: 0.06 },
                    { traitIdx: 12, mu: 0.45, var: 0.06 },
                    { traitIdx: 21, mu: 0.48, var: 0.06 }
                ]
            },
            {
                id: "o3",
                text: "Battery life",
                impacts: [
                    { traitIdx: 0, mu: 0.40, var: 0.06 },
                    { traitIdx: 1, mu: 0.40, var: 0.06 },
                    { traitIdx: 5, mu: 0.85, var: 0.06 },
                    { traitIdx: 9, mu: 0.40, var: 0.06 },
                    { traitIdx: 12, mu: 0.50, var: 0.06 },
                    { traitIdx: 21, mu: 0.55, var: 0.06 }
                ]
            },
            {
                id: "o4",
                text: "Speed and smoothness",
                impacts: [
                    { traitIdx: 0, mu: 0.50, var: 0.06 },
                    { traitIdx: 1, mu: 0.48, var: 0.06 },
                    { traitIdx: 5, mu: 0.43, var: 0.06 },
                    { traitIdx: 9, mu: 0.88, var: 0.06 },
                    { traitIdx: 12, mu: 0.55, var: 0.06 },
                    { traitIdx: 21, mu: 0.60, var: 0.06 }
                ]
            },
            {
                id: "o5",
                text: "Long-term value",
                impacts: [
                    { traitIdx: 0, mu: 0.45, var: 0.06 },
                    { traitIdx: 1, mu: 0.45, var: 0.06 },
                    { traitIdx: 5, mu: 0.50, var: 0.06 },
                    { traitIdx: 9, mu: 0.55, var: 0.06 },
                    { traitIdx: 12, mu: 0.75, var: 0.06 },
                    { traitIdx: 21, mu: 0.90, var: 0.06 }
                ]
            }
        ]
    },
    {
        id: "q_02",
        text: "How do you usually use your phone?",
        category: "discriminator",
        options: [
            {
                id: "o1",
                text: "Social + browsing",
                impacts: [
                    { traitIdx: 9, mu: 0.40, var: 0.06 },
                    { traitIdx: 13, mu: 0.72, var: 0.06 },
                    { traitIdx: 26, mu: 0.60, var: 0.06 }
                ]
            },
            {
                id: "o2",
                text: "Photography / Content Creation",
                impacts: [
                    { traitIdx: 0, mu: 0.82, var: 0.06 },
                    { traitIdx: 2, mu: 0.78, var: 0.06 },
                    { traitIdx: 1, mu: 0.75, var: 0.06 },
                    { traitIdx: 3, mu: 0.80, var: 0.06 },
                    { traitIdx: 4, mu: 0.70, var: 0.06 }
                ]
            },
            {
                id: "o3",
                text: "Gaming",
                impacts: [
                    { traitIdx: 9, mu: 0.88, var: 0.06 },
                    { traitIdx: 10, mu: 0.90, var: 0.06 },
                    { traitIdx: 8, mu: 0.78, var: 0.06 },
                    { traitIdx: 11, mu: 0.85, var: 0.06 }
                ]
            },
            {
                id: "o4",
                text: "Work / Productivity",
                impacts: [
                    { traitIdx: 14, mu: 0.82, var: 0.06 },
                    { traitIdx: 15, mu: 0.85, var: 0.06 },
                    { traitIdx: 12, mu: 0.72, var: 0.06 }
                ]
            },
            {
                id: "o5",
                text: "Light Use (calls, messages)",
                impacts: [
                    { traitIdx: 13, mu: 0.88, var: 0.06 },
                    { traitIdx: 5, mu: 0.70, var: 0.06 },
                    { traitIdx: 20, mu: 0.78, var: 0.06 }
                ]
            }
        ]
    },
    {
        id: "q_03",
        text: "What annoys you the most?",
        category: "discriminator",
        options: [
            {
                id: "o1",
                text: "Lag or stutter",
                impacts: [
                    { traitIdx: 11, mu: 0.90, var: 0.06 },
                    { traitIdx: 9, mu: 0.82, var: 0.06 },
                    { traitIdx: 14, mu: 0.72, var: 0.06 }
                ]
            },
            {
                id: "o2",
                text: "Bad battery",
                impacts: [
                    { traitIdx: 5, mu: 0.88, var: 0.06 },
                    { traitIdx: 7, mu: 0.75, var: 0.06 },
                    { traitIdx: 6, mu: 0.72, var: 0.06 }
                ]
            },
            {
                id: "o3",
                text: "Poor camera results",
                impacts: [
                    { traitIdx: 2, mu: 0.85, var: 0.06 },
                    { traitIdx: 0, mu: 0.82, var: 0.06 },
                    { traitIdx: 1, mu: 0.83, var: 0.06 }
                ]
            },
            {
                id: "o4",
                text: "Complicated UI",
                impacts: [
                    { traitIdx: 13, mu: 0.90, var: 0.06 },
                    { traitIdx: 12, mu: 0.78, var: 0.06 }
                ]
            },
            {
                id: "o5",
                text: "Short lifespan / low durability",
                impacts: [
                    { traitIdx: 17, mu: 0.88, var: 0.06 },
                    { traitIdx: 20, mu: 0.80, var: 0.06 },
                    { traitIdx: 21, mu: 0.78, var: 0.06 }
                ]
            }
        ]
    },
    {
        id: "q_04",
        text: "Your ideal phone feel?",
        category: "discriminator",
        options: [
            {
                id: "o1",
                text: "Sleek / premium",
                impacts: [
                    { traitIdx: 16, mu: 0.90, var: 0.06 }
                ]
            },
            {
                id: "o2",
                text: "Rugged / durable",
                impacts: [
                    { traitIdx: 17, mu: 0.88, var: 0.06 }
                ]
            },
            {
                id: "o3",
                text: "Doesn't matter",
                impacts: [
                    { traitIdx: 16, mu: 0.55, var: 0.06 }
                ]
            },
            {
                id: "o4",
                text: "Light and compact",
                impacts: [
                    { traitIdx: 18, mu: 0.90, var: 0.06 }
                ]
            }
        ]
    },
    // --- CLARIFIER QUESTIONS (Q5-Q16) ---
    {
        id: "q_05",
        text: "How sensitive are you to phone heating?",
        category: "clarifier", // Variance 0.04
        options: [
            {
                id: "o1",
                text: "I hate heat",
                impacts: [
                    { traitIdx: 7, mu: 0.90, var: 0.04 },
                    { traitIdx: 10, mu: 0.60, var: 0.04 }
                ]
            },
            {
                id: "o2",
                text: "Normal",
                impacts: [] // No strong changes
            },
            {
                id: "o3",
                text: "I don't care",
                impacts: [
                    { traitIdx: 8, mu: 0.90, var: 0.04 },
                    { traitIdx: 10, mu: 0.82, var: 0.04 }
                ]
            }
        ]
    },
    {
        id: "q_06",
        text: "Do you shoot at night often?",
        category: "clarifier",
        options: [
            {
                id: "o1",
                text: "Frequently",
                impacts: [
                    { traitIdx: 1, mu: 0.90, var: 0.04 },
                    { traitIdx: 4, mu: 0.80, var: 0.04 } // stabilizationPriority used here? Blueprint says stabilizationPriority 0.80
                ]
            },
            {
                id: "o2",
                text: "Sometimes",
                impacts: [
                    { traitIdx: 1, mu: 0.70, var: 0.04 }
                ]
            },
            {
                id: "o3",
                text: "Rarely",
                impacts: [
                    { traitIdx: 1, mu: 0.55, var: 0.04 }
                ]
            }
        ]
    },
    {
        id: "q_07",
        text: "Do you multitask heavily?",
        category: "clarifier",
        options: [
            {
                id: "o1",
                text: "Heavy",
                impacts: [
                    { traitIdx: 14, mu: 0.90, var: 0.04 },
                    { traitIdx: 10, mu: 0.78, var: 0.04 }
                ]
            },
            {
                id: "o2",
                text: "Moderate",
                impacts: [
                    { traitIdx: 14, mu: 0.72, var: 0.04 }
                ]
            },
            {
                id: "o3",
                text: "Minimal",
                impacts: [
                    { traitIdx: 13, mu: 0.80, var: 0.04 }
                ]
            }
        ]
    },
    {
        id: "q_08",
        text: "Would you pay more for longevity?",
        category: "clarifier",
        options: [
            {
                id: "o1",
                text: "Yes",
                impacts: [
                    { traitIdx: 21, mu: 0.90, var: 0.04 },
                    { traitIdx: 20, mu: 0.85, var: 0.04 },
                    { traitIdx: 22, mu: 0.78, var: 0.04 }
                ]
            },
            {
                id: "o2",
                text: "Maybe",
                impacts: [
                    { traitIdx: 20, mu: 0.70, var: 0.04 }
                ]
            },
            {
                id: "o3",
                text: "No",
                impacts: [
                    { traitIdx: 27, mu: 0.80, var: 0.04 }
                ]
            }
        ]
    },
    {
        id: "q_09",
        text: "Do you need wireless charging?",
        category: "clarifier",
        options: [
            {
                id: "o1",
                text: "Important",
                impacts: [
                    { traitIdx: 24, mu: 0.88, var: 0.04 },
                    { traitIdx: 23, mu: 0.78, var: 0.04 }
                ]
            },
            {
                id: "o2",
                text: "Nice to have",
                impacts: [
                    { traitIdx: 24, mu: 0.68, var: 0.04 }
                ]
            },
            {
                id: "o3",
                text: "Don't care",
                impacts: [
                    { traitIdx: 24, mu: 0.50, var: 0.04 }
                ]
            }
        ]
    },
    {
        id: "q_10",
        text: "Which screen type do you prefer?",
        category: "clarifier",
        options: [
            {
                id: "o1",
                text: "Vibrant / saturated",
                impacts: [
                    { traitIdx: 25, mu: 0.88, var: 0.04 }
                ]
            },
            {
                id: "o2",
                text: "Natural / accurate",
                impacts: [
                    { traitIdx: 3, mu: 0.78, var: 0.04 },
                    { traitIdx: 25, mu: 0.65, var: 0.04 }
                ]
            },
            {
                id: "o3",
                text: "No preference",
                impacts: [
                    { traitIdx: 25, mu: 0.55, var: 0.04 }
                ]
            }
        ]
    },
    {
        id: "q_11",
        text: "Do you keep phones for many years?",
        category: "clarifier",
        options: [
            {
                id: "o1",
                text: "3-5 years",
                impacts: [
                    { traitIdx: 20, mu: 0.90, var: 0.04 },
                    { traitIdx: 17, mu: 0.78, var: 0.04 }
                ]
            },
            {
                id: "o2",
                text: "2 years",
                impacts: [
                    { traitIdx: 20, mu: 0.70, var: 0.04 }
                ]
            },
            {
                id: "o3",
                text: "<1 year",
                impacts: [
                    { traitIdx: 27, mu: 0.88, var: 0.04 }
                ]
            }
        ]
    },
    {
        id: "q_12",
        text: "Do you take a lot of video?",
        category: "clarifier",
        options: [
            {
                id: "o1",
                text: "Heavy",
                impacts: [
                    { traitIdx: 4, mu: 0.90, var: 0.04 },
                    { traitIdx: 3, mu: 0.80, var: 0.04 }
                ]
            },
            {
                id: "o2",
                text: "Medium",
                impacts: [
                    { traitIdx: 4, mu: 0.70, var: 0.04 }
                ]
            },
            {
                id: "o3",
                text: "Minimal",
                impacts: [
                    { traitIdx: 4, mu: 0.55, var: 0.04 }
                ]
            }
        ]
    },
    {
        id: "q_13",
        text: "Your comfort with large phones?",
        category: "clarifier",
        options: [
            {
                id: "o1",
                text: "Small",
                impacts: [
                    { traitIdx: 18, mu: 0.92, var: 0.04 }
                ]
            },
            {
                id: "o2",
                text: "Medium",
                impacts: []
            },
            {
                id: "o3",
                text: "Large",
                impacts: [
                    { traitIdx: 19, mu: 0.92, var: 0.04 }
                ]
            }
        ]
    },
    {
        id: "q_14",
        text: "How much do you game weekly?",
        category: "clarifier",
        options: [
            {
                id: "o1",
                text: "Heavy",
                impacts: [
                    { traitIdx: 9, mu: 0.90, var: 0.04 },
                    { traitIdx: 10, mu: 0.90, var: 0.04 },
                    { traitIdx: 8, mu: 0.82, var: 0.04 }
                ]
            },
            {
                id: "o2",
                text: "Occasional",
                impacts: [
                    { traitIdx: 10, mu: 0.72, var: 0.04 }
                ]
            },
            {
                id: "o3",
                text: "Rare",
                impacts: [
                    { traitIdx: 5, mu: 0.72, var: 0.04 }
                ]
            }
        ]
    },
    {
        id: "q_15",
        text: "Do you switch between apps quickly?",
        category: "clarifier",
        options: [
            {
                id: "o1",
                text: "Yes",
                impacts: [
                    { traitIdx: 14, mu: 0.90, var: 0.04 }
                ]
            },
            {
                id: "o2",
                text: "Sometimes",
                impacts: [
                    { traitIdx: 14, mu: 0.72, var: 0.04 }
                ]
            },
            {
                id: "o3",
                text: "No",
                impacts: [
                    { traitIdx: 13, mu: 0.78, var: 0.04 }
                ]
            }
        ]
    },
    {
        id: "q_16",
        text: "Do you care about OS update length?",
        category: "clarifier",
        options: [
            {
                id: "o1",
                text: "Very important",
                impacts: [
                    { traitIdx: 21, mu: 0.92, var: 0.04 }
                ]
            },
            {
                id: "o2",
                text: "Somewhat",
                impacts: [
                    { traitIdx: 21, mu: 0.75, var: 0.04 }
                ]
            },
            {
                id: "o3",
                text: "No",
                impacts: [
                    { traitIdx: 21, mu: 0.55, var: 0.04 }
                ]
            }
        ]
    },
    // --- DEALBREAKERS (Q17-Q19) ---
    {
        id: "q_17",
        text: "Which operating system must your phone have?",
        category: "dealbreaker",
        options: [
            { id: "o1", text: "iOS only", impacts: [] },
            { id: "o2", text: "Android only", impacts: [] },
            { id: "o3", text: "No preference", impacts: [] }
        ]
    },
    {
        id: "q_18",
        text: "What is your max comfortable phone size?",
        category: "dealbreaker",
        options: [
            { id: "o1", text: "Compact", impacts: [] },
            { id: "o2", text: "Medium", impacts: [] },
            { id: "o3", text: "Large", impacts: [] },
            { id: "o4", text: "No preference", impacts: [] }
        ]
    },
    {
        id: "q_19",
        text: "Budget preference?",
        category: "dealbreaker",
        options: [
            { id: "o1", text: "<  $300", impacts: [] },
            { id: "o2", text: "$300 - $600", impacts: [] },
            { id: "o3", text: "$600 - $900", impacts: [] },
            { id: "o4", text: "$900+ / No Limit", impacts: [] }
        ]
    },
    // --- TIE-BREAKERS (Q20-Q22) ---
    {
        id: "q_20",
        text: "Which matters more?",
        category: "tie_breaker", // Variance 0.03
        options: [
            {
                id: "o1",
                text: "Smoothness",
                impacts: [
                    { traitIdx: 11, mu: 0.92, var: 0.03 },
                    { traitIdx: 9, mu: 0.85, var: 0.03 }
                ]
            },
            {
                id: "o2",
                text: "Battery",
                impacts: [
                    { traitIdx: 5, mu: 0.92, var: 0.03 }
                ]
            },
            {
                id: "o3",
                text: "Camera",
                impacts: [
                    { traitIdx: 0, mu: 0.88, var: 0.03 },
                    { traitIdx: 2, mu: 0.82, var: 0.03 }
                ]
            }
        ]
    },
    {
        id: "q_21",
        text: "Aesthetic preference?",
        category: "tie_breaker",
        options: [
            {
                id: "o1",
                text: "Minimal",
                impacts: [
                    { traitIdx: 16, mu: 0.85, var: 0.03 }
                ]
            },
            {
                id: "o2",
                text: "Bold",
                impacts: [
                    { traitIdx: 16, mu: 0.92, var: 0.03 }
                ]
            },
            {
                id: "o3",
                text: "Don't care",
                impacts: [
                    { traitIdx: 16, mu: 0.55, var: 0.03 }
                ]
            }
        ]
    },
    {
        id: "q_22",
        text: "Do you value small improvements?",
        category: "tie_breaker",
        options: [
            {
                id: "o1",
                text: "High sensitivity",
                impacts: [
                    { traitIdx: 27, mu: 0.92, var: 0.03 }
                ]
            },
            {
                id: "o2",
                text: "Medium",
                impacts: [
                    { traitIdx: 27, mu: 0.72, var: 0.03 }
                ]
            },
            {
                id: "o3",
                text: "Low",
                impacts: [
                    { traitIdx: 27, mu: 0.55, var: 0.03 }
                ]
            }
        ]
    }
];
