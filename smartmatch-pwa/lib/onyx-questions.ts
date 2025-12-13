
// Sync with worker/src/data/questions-v4.ts

export interface QuestionOption {
    id: string;
    text: string;
    icon?: string;
}

export interface Question {
    id: string;
    text: string;
    options: QuestionOption[];
}

export const ONYX_QUESTIONS: Record<string, Question> = {
    // --- Discriminators ---
    "q_01": {
        id: "q_01",
        text: "What matters most to you in a phone?",
        options: [
            { id: "o1", text: "Balance everything" },
            { id: "o2", text: "Camera quality" },
            { id: "o3", text: "Battery life" },
            { id: "o4", text: "Speed and smoothness" },
            { id: "o5", text: "Long-term value" }
        ]
    },
    "q_02": {
        id: "q_02",
        text: "How do you usually use your phone?",
        options: [
            { id: "o1", text: "Social + browsing" },
            { id: "o2", text: "Photography / Content Creation" },
            { id: "o3", text: "Gaming" },
            { id: "o4", text: "Work / Productivity" },
            { id: "o5", text: "Light Use (calls, messages)" }
        ]
    },
    "q_03": {
        id: "q_03",
        text: "What annoys you the most?",
        options: [
            { id: "o1", text: "Lag or stutter" },
            { id: "o2", text: "Bad battery" },
            { id: "o3", text: "Poor camera results" },
            { id: "o4", text: "Complicated UI" },
            { id: "o5", text: "Short lifespan / low durability" }
        ]
    },
    "q_04": {
        id: "q_04",
        text: "Your ideal phone feel?",
        options: [
            { id: "o1", text: "Sleek / premium" },
            { id: "o2", text: "Rugged / durable" },
            { id: "o3", text: "Doesn't matter" },
            { id: "o4", text: "Light and compact" }
        ]
    },

    // --- Clarifiers ---
    "q_05": {
        id: "q_05",
        text: "How sensitive are you to phone heating?",
        options: [
            { id: "o1", text: "I hate heat" },
            { id: "o2", text: "Normal" },
            { id: "o3", text: "I don't care" }
        ]
    },
    "q_06": {
        id: "q_06",
        text: "Do you shoot at night often?",
        options: [
            { id: "o1", text: "Frequently" },
            { id: "o2", text: "Sometimes" },
            { id: "o3", text: "Rarely" }
        ]
    },
    "q_07": {
        id: "q_07",
        text: "Do you multitask heavily?",
        options: [
            { id: "o1", text: "Heavy" },
            { id: "o2", text: "Moderate" },
            { id: "o3", text: "Minimal" }
        ]
    },
    "q_08": {
        id: "q_08",
        text: "Would you pay more for longevity?",
        options: [
            { id: "o1", text: "Yes" },
            { id: "o2", text: "Maybe" },
            { id: "o3", text: "No" }
        ]
    },
    "q_09": {
        id: "q_09",
        text: "Do you need wireless charging?",
        options: [
            { id: "o1", text: "Important" },
            { id: "o2", text: "Nice to have" },
            { id: "o3", text: "Don't care" }
        ]
    },
    "q_10": {
        id: "q_10",
        text: "Which screen type do you prefer?",
        options: [
            { id: "o1", text: "Vibrant / saturated" },
            { id: "o2", text: "Natural / accurate" },
            { id: "o3", text: "No preference" }
        ]
    },
    "q_11": {
        id: "q_11",
        text: "Do you keep phones for many years?",
        options: [
            { id: "o1", text: "3-5 years" },
            { id: "o2", text: "2 years" },
            { id: "o3", text: "<1 year" }
        ]
    },
    "q_12": {
        id: "q_12",
        text: "Do you take a lot of video?",
        options: [
            { id: "o1", text: "Heavy" },
            { id: "o2", text: "Medium" },
            { id: "o3", text: "Minimal" }
        ]
    },
    "q_13": {
        id: "q_13",
        text: "Your comfort with large phones?",
        options: [
            { id: "o1", text: "Small" },
            { id: "o2", text: "Medium" },
            { id: "o3", text: "Large" }
        ]
    },
    "q_14": {
        id: "q_14",
        text: "How much do you game weekly?",
        options: [
            { id: "o1", text: "Heavy" },
            { id: "o2", text: "Occasional" },
            { id: "o3", text: "Rare" }
        ]
    },
    "q_15": {
        id: "q_15",
        text: "Do you switch between apps quickly?",
        options: [
            { id: "o1", text: "Yes" },
            { id: "o2", text: "Sometimes" },
            { id: "o3", text: "No" }
        ]
    },
    "q_16": {
        id: "q_16",
        text: "Do you care about OS update length?",
        options: [
            { id: "o1", text: "Very important" },
            { id: "o2", text: "Somewhat" },
            { id: "o3", text: "No" }
        ]
    },
    // --- Dealbreakers ---
    "q_17": {
        id: "q_17",
        text: "Which operating system must your phone have?",
        options: [
            { id: "o1", text: "iOS only" },
            { id: "o2", text: "Android only" },
            { id: "o3", text: "No preference" }
        ]
    },
    "q_18": {
        id: "q_18",
        text: "What is your max comfortable phone size?",
        options: [
            { id: "o1", text: "Compact" },
            { id: "o2", text: "Medium" },
            { id: "o3", text: "Large" },
            { id: "o4", text: "No preference" }
        ]
    },
    "q_19": {
        id: "q_19",
        text: "Budget preference?",
        options: [
            { id: "o1", text: "<  $300" },
            { id: "o2", text: "$300 - $600" },
            { id: "o3", text: "$600 - $900" },
            { id: "o4", text: "$900+ / No Limit" }
        ]
    },
    // --- Tie Breakers ---
    "q_20": {
        id: "q_20",
        text: "Which matters more?",
        options: [
            { id: "o1", text: "Smoothness" },
            { id: "o2", text: "Battery" },
            { id: "o3", text: "Camera" }
        ]
    },
    "q_21": {
        id: "q_21",
        text: "Aesthetic preference?",
        options: [
            { id: "o1", text: "Minimal" },
            { id: "o2", text: "Bold" },
            { id: "o3", text: "Don't care" }
        ]
    },
    "q_22": {
        id: "q_22",
        text: "Do you value small improvements?",
        options: [
            { id: "o1", text: "High sensitivity" },
            { id: "o2", text: "Medium" },
            { id: "o3", text: "Low" }
        ]
    }
};
