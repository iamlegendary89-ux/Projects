/**
 * V4 Few-Shot - Multiple examples for pattern learning
 * Strategy: Provide 2 complete examples to teach output format
 * Goal: Better format compliance, consistent scoring scale
 */
export function buildPrompt(reviewCount: number, phoneName: string, reviewsText: string): string {
    return `Analyze smartphone reviews and output JSON. Follow these examples exactly.

EXAMPLE 1 (Flagship phone with 8 sources):
Input: iPhone 15 Pro reviews from GSMArena, DXOMark, The Verge, etc.
Output:
{
  "summary_1_page": "The iPhone 15 Pro marks Apple's transition to titanium, reducing weight by 19g while maintaining premium durability. All 8 sources praise the A17 Pro chip's gaming performance, with GSMArena measuring sustained 95% performance after 30 minutes. The 48MP main camera receives universal acclaim, with DXOMark awarding 154 points. Battery life improvements are modest at 10%, with charging still capped at 20W – a consistent criticism across sources. USB-C adoption is welcomed but limited to USB 2 speeds on base model. Software receives praise for iOS 17 features, though some Android-first features like RCS are noted as overdue.",
  "pros": ["Titanium frame reduces weight significantly (GSMArena, The Verge, PhoneArena)", "A17 Pro delivers exceptional sustained gaming performance (NotebookCheck, GSMArena)", "48MP camera with excellent Portrait mode (DXOMark score 154, praised by 6 sources)", "USB-C finally adopted (universal praise)", "7 years of software support (Apple confirmation cited by all)"],
  "cons": ["20W charging remains slow vs competition (criticized by all 8 sources)", "USB 2 speeds on base model is disappointing (The Verge, Android Authority)", "Price increase in most markets (5 sources mention)", "Limited customization vs Android (3 sources)", "No charger in box continues (universal complaint)"],
  "attributes": [
    {"name": "Camera", "score": 9.35, "explanation": "DXOMark 154 (top 10 globally). GSMArena and The Verge praise 24MP default mode. Minor low-light weakness vs S24 Ultra noted by 3 sources."},
    {"name": "Battery Endurance", "score": 7.80, "explanation": "GSMArena measured 86h endurance rating. 20W charging criticized universally. Good efficiency from 3nm chip."},
    {"name": "Performance", "score": 9.65, "explanation": "A17 Pro leads in sustained performance per NotebookCheck thermal testing. Geekbench 7200 multi-core."},
    {"name": "Display", "score": 9.20, "explanation": "ProMotion 120Hz, 2000 nits peak. DisplayMate A+ rating. PWM-free at high brightness."},
    {"name": "Software Experience", "score": 9.40, "explanation": "iOS 17 praised for StandBy and widgets. 7 years updates confirmed. Minor bugs in initial release noted by 2 sources."},
    {"name": "Design & Build", "score": 9.10, "explanation": "Titanium praised universally. Action button well-received. 19g lighter than 14 Pro."},
    {"name": "Longevity Value", "score": 8.90, "explanation": "7-year support class-leading. High resale value historically. Price increase hurts value proposition."}
  ],
  "antutu": 1528000,
  "geekbench": 7200,
  "dxocamera": 154,
  "dxodisplay": 149,
  "batteryActiveUse": 14.5,
  "softwareSupportYears": 7,
  "currentPrice": {"usd": "$999", "eur": "€1199"},
  "launchPrice": {"usd": "$999"}
}

EXAMPLE 2 (Midrange phone with 5 sources):
Input: Pixel 8a reviews
Output:
{
  "summary_1_page": "The Pixel 8a delivers Google's AI features at $499, making it the best value Android recommendation per all 5 sources. Tensor G3 enables on-device AI tasks, though gaming performance lags flagships. Camera maintains Pixel's computational photography excellence on a budget. Battery life improved to 13h active use. Display upgraded to 120Hz but brightness lower than 8 Pro. 7 years of updates matches flagships – unusual for this price point.",
  "pros": ["7 years of updates at $499 (all sources highlight)", "Best-in-class computational photography (GSMArena, DXOMark)", "Tensor G3 enables full AI features (praised by 4 sources)", "120Hz display upgrade (The Verge, Android Central)", "Clean Android experience (universal praise)"],
  "cons": ["Gaming performance below competition (NotebookCheck, GSMArena benchmarks)", "Lower peak brightness than 8 Pro (3 sources)", "Slower charging at 18W (criticized by all)", "Plastic back feels less premium (2 sources)", "Tensor runs warm under load (thermal concerns in 3 reviews)"],
  "attributes": [
    {"name": "Camera", "score": 8.60, "explanation": "DXOMark 135. Excellent computational photography. Night Sight praised. Less versatile than flagship ultrawides."},
    {"name": "Battery Endurance", "score": 7.40, "explanation": "GSMArena 91h endurance. 13h active use. 18W charging is slow. Tensor efficiency improved."},
    {"name": "Performance", "score": 7.20, "explanation": "Tensor G3 good for AI, weak for gaming. Geekbench 4800. Thermal throttling noted."},
    {"name": "Display", "score": 8.10, "explanation": "120Hz OLED upgrade. 1400 nits peak (lower than Pro). Good color accuracy."},
    {"name": "Software Experience", "score": 9.50, "explanation": "Pure Android with AI features. 7 years updates. Feature drops praised."},
    {"name": "Design & Build", "score": 7.00, "explanation": "Plastic back divisive. Gorilla Glass 3 front. IP67 rating. Lightweight."},
    {"name": "Longevity Value", "score": 9.20, "explanation": "7 years at $499 is exceptional. Best value proposition in Android per all sources."}
  ],
  "antutu": 892000,
  "geekbench": 4800,
  "dxocamera": 135,
  "dxodisplay": null,
  "batteryActiveUse": 13.0,
  "softwareSupportYears": 7,
  "currentPrice": {"usd": "$499", "eur": "€549"},
  "launchPrice": {"usd": "$499"}
}

NOW ANALYZE: ${phoneName}
Sources: ${reviewCount}
Follow the exact format above. JSON only, no markdown.

SCORING WEIGHTS:
Camera: main(38%), lowlight(32%), video(20%), selfie(10%)
Battery: efficiency(38%), capacity(32%), charging(18%), degradation(12%)
Performance: sustained(44%), peak(34%), thermals(18%), npu(4%)
Display: comfort(34%), brightness(30%), color(22%), refresh(10%), hdr(4%)
Software: clean(46%), updates(28%), features(18%), bugs(8%)
Design: weight(38%), materials(34%), haptics(18%), durability(10%)
Longevity: policy(58%), price_perf(32%), resale(10%)

Weight GSMArena/DXOMark/NotebookCheck 1.5x.
Missing data = score 5.00, explanation "Not mentioned in any reviews".

${reviewsText}`;
}
