import Link from "next/link";
import { getPhoneDetails } from "@/lib/actions";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function PhonePage({ params }: PageProps) {
    const { slug } = await params;
    const phone = await getPhoneDetails(slug);

    if (!phone) {
        notFound();
    }

    // Parse scores from string to display
    const parseScore = (score: string | null) =>
        score ? parseFloat(score).toFixed(1) : "—";

    // Get pros/cons from fullData or direct fields
    const pros = phone.pros || [];
    const cons = phone.cons || [];

    return (
        <main className="min-h-screen p-8">
            <div className="max-w-4xl mx-auto">
                <Link
                    href="/rankings"
                    className="text-sm text-pure-light/50 hover:text-onyx-primary mb-8 block"
                >
                    ← Back to Rankings
                </Link>

                {/* Header */}
                <div className="mb-12">
                    <p className="text-sm text-onyx-primary uppercase tracking-wider mb-2">
                        {phone.brand}
                    </p>
                    <h1 className="text-4xl font-bold mb-4">{phone.model}</h1>
                    <div className="text-5xl font-bold text-onyx-primary mb-4">
                        {parseScore(phone.overallScore)}/10
                    </div>
                    {phone.summary && (
                        <p className="text-pure-light/70">{phone.summary}</p>
                    )}
                </div>

                {/* 7-Attribute Scores (Sacred Rule #6) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {[
                        { label: "Camera", value: phone.cameraScore },
                        { label: "Battery", value: phone.batteryScore },
                        { label: "Performance", value: phone.performanceScore },
                        { label: "Software", value: phone.softwareScore },
                        { label: "Design", value: phone.designScore },
                        { label: "Display", value: phone.displayScore },
                        { label: "Longevity", value: phone.longevityScore },
                    ].map(({ label, value }) => (
                        <div
                            key={label}
                            className="p-4 bg-white/5 rounded-lg text-center"
                        >
                            <div className="text-2xl font-bold text-onyx-primary">
                                {parseScore(value)}
                            </div>
                            <div className="text-sm text-pure-light/60">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Pros & Cons */}
                {(pros.length > 0 || cons.length > 0) && (
                    <div className="grid md:grid-cols-2 gap-8 mb-12">
                        {pros.length > 0 && (
                            <div className="p-6 bg-green-500/10 rounded-xl border border-green-500/20">
                                <h2 className="text-lg font-semibold text-green-400 mb-4">Pros</h2>
                                <ul className="space-y-2">
                                    {pros.map((pro, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-green-400">✓</span>
                                            <span>{pro}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {cons.length > 0 && (
                            <div className="p-6 bg-red-500/10 rounded-xl border border-red-500/20">
                                <h2 className="text-lg font-semibold text-red-400 mb-4">Cons</h2>
                                <ul className="space-y-2">
                                    {cons.map((con, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-red-400">✗</span>
                                            <span>{con}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
