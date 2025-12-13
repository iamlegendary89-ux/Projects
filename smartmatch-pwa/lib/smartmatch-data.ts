export const QUESTIONS = [
    {
        id: "stylePreference",
        text: "Which ecosystem do you prefer?",
        answers: [
            { text: "iOS (Apple)", value: "iOS Ecosystem" },
            { text: "Android", value: "Android Customization" },
            { text: "No Preference", value: "Any" },
        ],
    },
    {
        id: "primaryUsage",
        text: "What is your primary use case?",
        answers: [
            { text: "Gaming & Entertainment", value: "Gaming & Entertainment" },
            { text: "Photography & Social Media", value: "Photography & Social" },
            { text: "Work & Productivity", value: "Work & Productivity" },
            { text: "General Daily Use", value: "General" },
        ],
    },
    {
        id: "budget",
        text: "What is your budget range?",
        answers: [
            { text: "Budget (<$400)", value: "Budget (<$400)" },
            { text: "Mid-range ($400-$700)", value: "Mid-range ($400-$700)" },
            { text: "Premium ($700-$1000)", value: "Premium ($700-$1000)" },
            { text: "Flagship (No Limit)", value: "Flagship (No Limit)" },
        ],
    },
    {
        id: "cameraImportance",
        text: "How important is the camera to you?",
        answers: [
            { text: "Essential - I need the best", value: "Essential" },
            { text: "Important - Good photos matter", value: "Important" },
            { text: "Nice to have", value: "Nice to have" },
            { text: "Not a priority", value: "Not important" },
        ],
    },
    {
        id: "batteryImportance",
        text: "How important is battery life?",
        answers: [
            { text: "All Day+ (Heavy User)", value: "All day+" },
            { text: "Full Day (Reliable)", value: "Full day" },
            { text: "Most of Day is fine", value: "Most of day" },
            { text: "Flexible / I carry a charger", value: "Flexible" },
        ],
    },
];

export const ARCHETYPES = {
    // Keep existing archetypes for now as they might be used elsewhere or for fallback
    visionary: {
        id: "visionary",
        name: "Visionary Photographer",
        color: "#00D4FF",
        description: "You see the world in frames. This phone understands your eye.",
        matchRules: { camera: 10, battery: 5, performance: 7 },
    },
    endurance: {
        id: "endurance",
        name: "Endurance Athlete",
        color: "#FF4D4D",
        description: "You never stop. Neither should your phone.",
        matchRules: { battery: 10, durability: 9, performance: 6 },
    },
    investor: {
        id: "investor",
        name: "Value Investor",
        color: "#00FF94",
        description: "Maximum return on investment. Smart choices only.",
        matchRules: { value: 10, longevity: 8, price: 9 },
    },
    purist: {
        id: "purist",
        name: "Digital Purist",
        color: "#FFFFFF",
        description: "Clean software, no bloat. Just the essence.",
        matchRules: { software: 10, design: 8, camera: 6 },
    },
};
