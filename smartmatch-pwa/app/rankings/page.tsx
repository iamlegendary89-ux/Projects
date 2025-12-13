
import { getAllPhones } from "@/lib/phones";
import { RankingsTable } from "@/components/onyx-ui/screens/RankingsTable";

export const metadata = {
    title: "Smartphone Rankings | SoulMatch",
    description: "Objective smartphone rankings based on AI analysis of expert reviews.",
};

export default async function RankingsPage() {
    const phones = await getAllPhones();
    console.log(`[RankingsPage] Phones loaded: ${phones?.length ?? 'undefined'}`);
    if (!phones) { console.error("[RankingsPage] Phones is null/undefined!"); }

    return (
        <main className="min-h-screen bg-void-black text-pure-light overflow-x-hidden selection:bg-onyx-primary/30">
            {/* Background Ambience */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-onyx-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-accent-violet/5 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
            </div>

            <div className="relative z-10 pt-8 pb-20">
                <RankingsTable phones={phones} />
            </div>
        </main>
    );
}
