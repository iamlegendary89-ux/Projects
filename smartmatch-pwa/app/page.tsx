import { getAllPhones } from "@/lib/phones";
import OnyxOrchestrator from "@/components/onyx-ui/OnyxOrchestrator";

export default async function SoulMatchPage() {
    const phones = await getAllPhones();

    return <OnyxOrchestrator phones={phones} />;
}
