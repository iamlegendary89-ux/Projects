import Link from "next/link";
import { getQuizResult } from "@/lib/quiz-actions";

interface ResultPageProps {
    searchParams: Promise<Record<string, string | undefined>>;
}

/**
 * R.E.A.L.™ Result Page
 * 
 * Shows matched phone with archetype, confidence, and regret warnings
 */
export default async function ResultPage({ searchParams }: ResultPageProps) {
    const params = await searchParams;

    if (!params.traits) {
        return (
            <main className="min-h-screen p-8 flex items-center justify-center">
                <div className="max-w-xl text-center">
                    <h1 className="text-4xl font-bold mb-4">No Quiz Data</h1>
                    <p className="text-pure-light/70 mb-8">
                        Complete the R.E.A.L.™ quiz to see your personalized recommendation.
                    </p>
                    <Link
                        href="/quiz"
                        className="inline-block px-6 py-3 bg-onyx-primary text-void-black font-semibold rounded-lg hover:opacity-90 transition"
                    >
                        Start Quiz
                    </Link>
                </div>
            </main>
        );
    }

    const mode = (params.mode as "ultra-fast" | "gold-standard") || "ultra-fast";
    const result = await getQuizResult(params.traits, mode);
    const isUltraFast = mode === "ultra-fast";

    return (
        <main className="min-h-screen p-8">
            <div className="max-w-2xl mx-auto pt-6">
                {/* Mode Badge */}
                <div className="flex justify-center mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isUltraFast
                            ? "bg-onyx-primary/20 text-onyx-primary"
                            : "bg-accent-violet/20 text-accent-violet"
                        }`}>
                        {isUltraFast ? "⚡ Ultra-Fast Result" : "🏆 Gold Standard Result"}
                    </span>
                </div>

                {/* Archetype Card */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-3 px-5 py-3 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-3xl">{result.archetype.profile.icon}</span>
                        <div className="text-left">
                            <div className="font-semibold">{result.archetype.profile.label}</div>
                            <div className="text-xs text-pure-light/50">{result.archetype.profile.tagline}</div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-onyx-primary text-sm uppercase tracking-wider mb-3">
                    Your Perfect Match
                </p>

                <h1 className="text-4xl md:text-5xl font-bold text-center mb-2">
                    {result.phone.name}
                </h1>

                <p className="text-center text-pure-light/60 mb-6">
                    {result.phone.brand}
                </p>

                {/* Match Score Ring */}
                <div className="text-center mb-6">
                    <div className={`inline-block px-8 py-5 rounded-2xl border ${isUltraFast
                            ? "bg-onyx-primary/10 border-onyx-primary/30"
                            : "bg-accent-violet/10 border-accent-violet/30"
                        }`}>
                        <span className={`text-5xl font-bold ${isUltraFast ? "text-onyx-primary" : "text-accent-violet"
                            }`}>
                            {result.matchPercent}%
                        </span>
                        <span className="text-pure-light/60 ml-2">match</span>
                    </div>
                </div>

                {/* Confidence Meter */}
                <div className="flex justify-center items-center gap-3 mb-6">
                    <span className="text-sm text-pure-light/50">Confidence</span>
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${isUltraFast ? "bg-onyx-primary" : "bg-accent-violet"
                                }`}
                            style={{ width: `${result.confidence * 100}%` }}
                        />
                    </div>
                    <span className="text-sm text-pure-light/50">
                        {Math.round(result.confidence * 100)}%
                    </span>
                </div>

                {/* Top Attributes */}
                <div className="flex justify-center gap-2 mb-8">
                    {result.topAttributes.map(({ name, label }) => (
                        <span
                            key={name}
                            className="px-3 py-1.5 bg-white/5 rounded-full text-xs text-pure-light/70 border border-white/10"
                        >
                            {label}
                        </span>
                    ))}
                </div>

                {/* Why This Phone */}
                <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
                    <h2 className="text-lg font-semibold mb-4">Why this phone?</h2>
                    <ul className="space-y-3">
                        {result.reasons.map((reason, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="text-green-400 mt-0.5">✓</span>
                                <span className="text-pure-light/80">{reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Regret Warnings */}
                {result.regretWarnings.length > 0 && (
                    <div className="bg-amber-500/10 rounded-xl p-6 mb-6 border border-amber-500/20">
                        <h2 className="text-lg font-semibold text-amber-400 mb-4">⚠️ Things to Consider</h2>
                        <ul className="space-y-2">
                            {result.regretWarnings.map((warning, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span className="text-amber-400 mt-0.5">•</span>
                                    <span className="text-pure-light/70">{warning}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Gold Standard Upsell (for Ultra-Fast users) */}
                {isUltraFast && (
                    <div className="bg-accent-violet/10 rounded-xl p-4 mb-6 border border-accent-violet/20 text-center">
                        <p className="text-sm text-pure-light/70 mb-2">
                            Want higher confidence? Try the
                        </p>
                        <Link
                            href="/quiz?mode=gold-standard&step=1"
                            className="inline-flex items-center gap-2 text-accent-violet hover:underline font-medium"
                        >
                            🏆 Gold Standard Quiz
                        </Link>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href={`/phone/${result.phone.id}`}
                        className={`px-6 py-3 font-semibold rounded-lg transition text-center ${isUltraFast
                                ? "bg-onyx-primary text-void-black hover:opacity-90"
                                : "bg-accent-violet text-void-black hover:opacity-90"
                            }`}
                    >
                        View Full Details
                    </Link>
                    <Link
                        href="/quiz"
                        className="px-6 py-3 bg-white/10 text-pure-light font-semibold rounded-lg hover:bg-white/20 transition text-center"
                    >
                        Retake Quiz
                    </Link>
                </div>

                {/* Phone Score */}
                <p className="text-center text-pure-light/30 text-sm mt-8">
                    SmartMatch Score: {result.phone.score ? parseFloat(result.phone.score).toFixed(1) : "—"}/10
                </p>
            </div>
        </main>
    );
}
