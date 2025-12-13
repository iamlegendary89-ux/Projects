import Link from "next/link";
import { getRankings } from "@/lib/actions";

export default async function RankingsPage() {
    const rankings = await getRankings();

    return (
        <main className="min-h-screen p-8">
            <div className="max-w-4xl mx-auto">
                <Link
                    href="/"
                    className="text-sm text-pure-light/50 hover:text-onyx-primary mb-8 block"
                >
                    ← Back Home
                </Link>

                <h1 className="text-4xl font-bold mb-8">All Phones Ranked</h1>

                <div className="space-y-4">
                    {rankings.map((phone, i) => (
                        <Link
                            key={phone.id}
                            href={`/phone/${phone.id}`}
                            className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:border-onyx-primary/50 transition"
                        >
                            <div className="text-2xl font-bold text-onyx-primary w-12">
                                #{i + 1}
                            </div>
                            <div className="flex-1">
                                <h2 className="font-medium">{phone.model}</h2>
                                <p className="text-sm text-pure-light/60">{phone.brand}</p>
                            </div>
                            <div className="text-xl font-bold">
                                {phone.overallScore ? parseFloat(phone.overallScore).toFixed(1) : "—"}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
