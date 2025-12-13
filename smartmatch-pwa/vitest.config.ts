import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: [
            "tests/**/*.test.ts",
            "scripts/__tests__/**/*.test.ts",
            "lib/__tests__/**/*.test.ts",
            "src/lib/__tests__/**/*.test.ts"
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["scripts/enrichment-v2.ts"],
            exclude: [
                "node_modules/",
                "tests/",
                "**/*.config.{js,ts}",
                "**/*.d.ts",
            ],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80,
            },
        },
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "./"),
        },
    },
});
