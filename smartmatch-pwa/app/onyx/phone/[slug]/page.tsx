import { getPhoneDetails } from "@/lib/onyx/actions";
import { getRegretData } from "@/lib/onyx/regret-actions";
import DetailsUI from "../../details/DetailsUI";

export const dynamic = "force-dynamic";

export default async function DynamicDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
    // Next.js 15+: params is now a Promise and must be awaited
    const { slug } = await params;
    const phone = await getPhoneDetails(slug);
    const regretData = await getRegretData(slug);

    // The DB row contains the full JSON blob in `full_data`
    const phoneData = phone?.full_data || null;

    if (!phoneData) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold mb-4 text-red-500">System Error</h1>
                <p className="text-white/50 mb-8 text-center max-w-md">
                    Device signature <span className="text-white font-mono bg-white/10 px-2 py-1 rounded">{slug}</span> not found in the Onyx Registry.
                </p>
                <a href="/onyx/rankings" className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                    Return to Registry
                </a>
            </div>
        );
    }

    return <DetailsUI data={phoneData} phoneId={slug} regretData={regretData} />;
}

