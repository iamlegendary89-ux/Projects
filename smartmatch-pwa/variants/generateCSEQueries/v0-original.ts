// ORIGINAL: generateCSEQueries
// Extracted by LZFOF v1.0

type VariantExclusions = Record<string, string[]>;

const VARIANT_EXCLUSIONS: VariantExclusions = {
    "galaxy s25": ["edge", "fe", "ultra", "plus", "+"],
    "galaxy s24": ["edge", "fe", "ultra", "plus", "+"],
    "iphone 15 pro": ["max"],
    "iphone 15": ["pro", "plus", "max"],
    "13": ["r", "pro"],
};

export function generateCSEQueries(brand: string, model: string, sourceType: string): string[] {
    const fullName = `${brand} ${model}`;
    const brandLower = brand.toLowerCase();
    const modelLower = model.toLowerCase();

    const queryStrategies: Record<string, string[]> = {
        gsmarena_specs: [
            `site:gsmarena.com ${fullName} specs -forum`,
            `site:gsmarena.com ${fullName} specifications -forum`,
            `site:gsmarena.com ${brandLower}-${modelLower}*.php -forum`,
            `site:gsmarena.com intitle:"${fullName}" -forum -news`,
        ],
        gsmarena_review: [
            `site:gsmarena.com ${fullName} review -forum`,
            `site:gsmarena.com ${fullName} hands-on -forum`,
            `site:gsmarena.com intitle:"${fullName}" -forum -specs`,
            `site:gsmarena.com ${brand} ${model} review -forum`,
        ],
        phonearena_review: [
            `site:phonearena.com ${fullName} review`,
            `site:phonearena.com intitle:"${fullName}"`,
            `site:phonearena.com ${brand} ${model} review`,
        ],
        dxomark_review: [
            `site:dxomark.com ${brand} ${model}`,
            `site:dxomark.com smartphones ${brand} ${model}`,
        ],
        theverge_review: [
            `site:theverge.com ${fullName} review`,
            `site:theverge.com ${fullName} hands-on`,
            `site:theverge.com ${brand} ${model} review`,
        ],
        androidcentral_review: [
            `site:androidcentral.com ${fullName} review`,
            `site:androidcentral.com ${brand} ${model} review`,
        ],
        androidauthority_review: [
            `site:androidauthority.com ${fullName} review`,
            `site:androidauthority.com ${brand} ${model} review`,
        ],
        tomsguide_review: [
            `site:tomsguide.com ${fullName} review`,
            `site:tomsguide.com ${brand} ${model} review`,
        ],
        techradar_review: [
            `site:techradar.com ${fullName} review`,
            `site:techradar.com ${brand} ${model} review`,
        ],
        notebookcheck_review: [
            `site:notebookcheck.net ${fullName} review`,
            `site:notebookcheck.net ${brand} ${model} review`,
        ],
    };

    let queries = queryStrategies[sourceType] ||
        [`${brand} ${model} ${sourceType.replace(/_/g, " ")} review`];

    const exclusions = VARIANT_EXCLUSIONS[modelLower] || [];
    if (exclusions.length > 0) {
        const modelHasVariant = exclusions.some(ex =>
            modelLower.includes(ex.toLowerCase()) ||
            modelLower.includes(ex.toLowerCase().replace(/"/g, "")),
        );

        if (!modelHasVariant) {
            const exclusionString = exclusions.map(ex => {
                const cleanEx = ex.replace(/"/g, "").replace(/\\/g, "");
                return `-intitle:"${cleanEx}" -inurl:${cleanEx}`;
            }).join(" ");
            queries = queries.map(q => `${q} ${exclusionString}`);
        }
    }

    return queries;
}
