import Link from "next/link";
import { getRankings } from "@/lib/actions";

export default async function HomePage() {
  const rankings = await getRankings();
  const topPhones = rankings.slice(0, 3);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <header className="text-center py-16">
          <h1 className="text-5xl font-bold mb-4">SmartMatch</h1>
          <p className="text-xl text-pure-light/70 mb-8">
            Find the smartphone you&apos;ll love long-term
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/quiz"
              className="inline-block px-8 py-4 bg-onyx-primary text-void-black font-semibold rounded-lg hover:opacity-90 transition"
            >
              Take the Quiz
            </Link>
            <Link
              href="/rankings"
              className="inline-block px-8 py-4 bg-white/10 text-pure-light font-semibold rounded-lg hover:bg-white/20 transition"
            >
              Browse All Phones
            </Link>
          </div>
        </header>

        {/* Top 3 Preview */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Top Rated
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topPhones.map((phone, i) => (
              <Link
                key={phone.id}
                href={`/phone/${phone.id}`}
                className="block p-6 bg-white/5 rounded-xl border border-white/10 hover:border-onyx-primary/50 transition"
              >
                <div className="text-3xl font-bold text-onyx-primary mb-2">
                  #{i + 1}
                </div>
                <h3 className="text-lg font-medium">{phone.model}</h3>
                <p className="text-sm text-pure-light/60">{phone.brand}</p>
                <div className="mt-4 text-2xl font-bold">
                  {phone.overallScore ? parseFloat(phone.overallScore).toFixed(1) : "—"}/10
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
