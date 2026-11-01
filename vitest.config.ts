import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
        exclude: ["node_modules", "dist", "src/devkit/**"],
        environment: "node",
        testTimeout: 30_000,
        hookTimeout: 30_000
    }
});
