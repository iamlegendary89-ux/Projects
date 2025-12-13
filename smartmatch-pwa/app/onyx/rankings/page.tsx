import { getRankings } from "@/lib/onyx/actions";
import RankingsUI from "./RankingsUI";

export const dynamic = "force-dynamic"; // Ensure fresh data on every request

export default async function RankingsPage() {
    const rankings = await getRankings();

    // Cast to UI type - Drizzle returns slightly different type than our UI interface
    return <RankingsUI rankings={rankings as Parameters<typeof RankingsUI>[0]["rankings"]} />;
}
