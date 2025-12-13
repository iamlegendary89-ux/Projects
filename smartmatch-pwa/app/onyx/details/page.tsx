import { getPhoneDetails } from "@/lib/onyx/actions";
import DetailsUI from "./DetailsUI";

export const dynamic = "force-dynamic";

export default async function DetailsPage() {
    // For this prototype, we default to the iPhone 15 Pro.
    // In a real route (app/onyx/phone/[slug]/page.tsx), we would use params.slug
    const phone = await getPhoneDetails("apple_iphone_15_pro");

    // The DB row contains the full JSON blob in `full_data`
    // Cast to UI type - DB returns unknown for jsonb columns
    const phoneData = (phone?.full_data ?? null) as Parameters<typeof DetailsUI>[0]["data"];

    return <DetailsUI data={phoneData} />;
}

