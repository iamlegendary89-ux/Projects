import Link from "next/link";
import { submitQuizStep } from "@/lib/quiz-actions";
import questionsData from "@/public/questions.json";
import { createNeutralVector } from "@/lib/core/traits";

interface QuizPageProps {
    searchParams: Promise<Record<string, string | undefined>>;
}

type QuizMode = "ultra-fast" | "gold-standard";

/**
 * R.E.A.L.™ Quiz Page
 * 
 * Two modes:
 * - Ultra-Fast: 9 questions, ~91-93% accuracy, 45-60s
 * - Gold Standard: 15 questions, ~97-98% accuracy, 90-120s
 */
export default async function QuizPage({ searchParams }: QuizPageProps) {
    const params = await searchParams;
    const step = parseInt(params.step || "0");
    const mode = (params.mode as QuizMode) || null;

    // Parse traits from URL (or create neutral)
    const traitsJson = params.traits || JSON.stringify(createNeutralVector());
    const answeredJson = params.answered || "[]";

    // Mode selection screen
    if (!mode || step === 0) {
        return (
            <main className="min-h-screen p-8 flex items-center justify-center">
                <div className="max-w-xl w-full">
                    <Link
                        href="/"
                        className="text-sm text-pure-light/50 hover:text-onyx-primary mb-8 block"
                    >
                        ← Back Home
                    </Link>

                    <div className="text-center mb-12">
                        <h1 className="text-3xl font-bold mb-2">R.E.A.L.™ Quiz</h1>
                        <p className="text-pure-light/60">
                            Regret-Eliminating Adaptive Logic
                        </p>
                    </div>

                    <p className="text-center text-pure-light/70 mb-8">
                        Choose your experience:
                    </p>

                    <div className="space-y-4">
                        <Link
                            href="/quiz?mode=ultra-fast&step=1"
                            className="block p-6 bg-gradient-to-r from-onyx-primary/20 to-accent-indigo/20 rounded-xl border border-onyx-primary/30 hover:border-onyx-primary/60 transition-all"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xl font-bold">⚡ Ultra-Fast</span>
                                <span className="text-sm text-onyx-primary">~45 seconds</span>
                            </div>
                            <p className="text-sm text-pure-light/60 mb-2">
                                9 essential questions • 91-93% accuracy
                            </p>
                            <p className="text-xs text-pure-light/40">
                                Perfect for quick recommendations
                            </p>
                        </Link>

                        <Link
                            href="/quiz?mode=gold-standard&step=1"
                            className="block p-6 bg-gradient-to-r from-accent-violet/20 to-accent-indigo/20 rounded-xl border border-accent-violet/30 hover:border-accent-violet/60 transition-all"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xl font-bold">🏆 Gold Standard</span>
                                <span className="text-sm text-accent-violet">~90 seconds</span>
                            </div>
                            <p className="text-sm text-pure-light/60 mb-2">
                                15 refined questions • 97-98% accuracy
                            </p>
                            <p className="text-xs text-pure-light/40">
                                Maximum confidence for power users
                            </p>
                        </Link>
                    </div>

                    <p className="text-center text-pure-light/30 text-xs mt-8">
                        Both modes use the same AI-powered matching engine
                    </p>
                </div>
            </main>
        );
    }

    // Get questions for current mode
    const modeConfig = questionsData.modes[mode];
    const questionIds = modeConfig.questionIds;
    const totalQuestions = questionIds.length;

    // Get current question
    const currentQuestionId = questionIds[step - 1];
    const question = questionsData.questions.find(q => q.id === currentQuestionId);

    if (!question || step > totalQuestions) {
        return (
            <main className="min-h-screen p-8 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Quiz Complete</h1>
                    <Link
                        href={`/result?traits=${encodeURIComponent(traitsJson)}&mode=${mode}`}
                        className="text-onyx-primary hover:underline"
                    >
                        See Your Results
                    </Link>
                </div>
            </main>
        );
    }

    const progress = (step / totalQuestions) * 100;
    const isUltraFast = mode === "ultra-fast";

    return (
        <main className="min-h-screen p-8 flex items-center justify-center">
            <div className="max-w-xl w-full">
                <Link
                    href="/quiz"
                    className="text-sm text-pure-light/50 hover:text-onyx-primary mb-6 block"
                >
                    ← Change Mode
                </Link>

                {/* Mode Badge */}
                <div className="flex justify-center mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isUltraFast
                            ? "bg-onyx-primary/20 text-onyx-primary"
                            : "bg-accent-violet/20 text-accent-violet"
                        }`}>
                        {isUltraFast ? "⚡ Ultra-Fast" : "🏆 Gold Standard"}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-white/10 rounded-full mb-8">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isUltraFast ? "bg-onyx-primary" : "bg-accent-violet"
                            }`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Question */}
                <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center leading-tight">
                    {question.text}
                </h1>

                {/* Answer Options */}
                <div className="space-y-3">
                    {question.options.map((option, i) => (
                        <form key={i} action={submitQuizStep}>
                            <input type="hidden" name="step" value={step} />
                            <input type="hidden" name="mode" value={mode} />
                            <input type="hidden" name="questionId" value={question.id} />
                            <input type="hidden" name="traits" value={traitsJson} />
                            <input type="hidden" name="answered" value={answeredJson} />
                            <input type="hidden" name="delta" value={JSON.stringify(option.delta)} />
                            <input type="hidden" name="totalQuestions" value={totalQuestions} />

                            <button
                                type="submit"
                                className={`w-full p-4 text-left rounded-lg border transition-all duration-200 ${isUltraFast
                                        ? "bg-white/5 border-white/10 hover:border-onyx-primary/50 hover:bg-onyx-primary/10"
                                        : "bg-white/5 border-white/10 hover:border-accent-violet/50 hover:bg-accent-violet/10"
                                    }`}
                            >
                                {option.label}
                            </button>
                        </form>
                    ))}
                </div>

                {/* Question counter */}
                <p className="text-center text-pure-light/40 mt-8">
                    Question {step} of {totalQuestions}
                </p>

                {/* Category hint */}
                {"category" in question && (
                    <p className="text-center text-pure-light/20 text-xs mt-2 capitalize">
                        {String(question.category).replace(/-/g, " ")}
                    </p>
                )}
            </div>
        </main>
    );
}
