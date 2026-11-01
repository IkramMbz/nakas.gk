import { defineConfig } from "oxlint";

export default defineConfig({
    plugins: [
        "typescript",
        "react",
        "import",
        "unicorn",
        "jsx-a11y",
        "vitest",
        "oxc",
        "node",
        "promise"
    ],
    env: { browser: true, node: true, es2024: true },
    ignorePatterns: [
        "dist/",
        "node_modules/",
        "playground/dist/",
        "src/avatars/assets/",
        "src/avatars/registry.generated.ts",
        "src/agents/skills.generated.ts",
        "src/ui/styles.generated.ts"
    ],
    categories: { correctness: "error", suspicious: "warn" },
    options: { denyWarnings: true, typeAware: true, typeCheck: true },
    rules: {
        "no-console": "error",
        "no-debugger": "error",
        "no-alert": "error",
        eqeqeq: ["error", "smart"],
        "no-var": "error",
        "prefer-const": "error",
        "no-unused-vars": "off",
        "no-eval": "error",
        "no-implied-eval": "error",
        "no-new-func": "error",
        "typescript/no-unused-vars": "error",
        "typescript/no-explicit-any": "error",
        "typescript/no-floating-promises": "error",
        "typescript/no-misused-promises": "error",
        "typescript/await-thenable": "error",
        "typescript/no-non-null-assertion": "error",
        "react/jsx-key": "error",
        "react/jsx-no-target-blank": "error",
        "react/jsx-no-script-url": "error",
        "react/no-danger": "error",
        "react/rules-of-hooks": "error",
        "react/refs": "error",
        "react/exhaustive-deps": "error",
        "react/react-in-jsx-scope": "off",
        "import/no-unassigned-import": "error"
    },
    overrides: [
        {
            files: ["scripts/**", "src/devkit/bin/**", "src/avatars/scripts/**"],
            rules: { "no-console": "off" }
        },
        {
            files: ["**/*.test.{ts,tsx,mjs}", "tests/**"],
            rules: {
                "typescript/no-non-null-assertion": "off",
                "typescript/no-unsafe-type-assertion": "off",
                "no-console": "off"
            }
        },
        {
            // Intentional side-effect entry point: `import "nakas-gk/auto"`.
            files: ["src/auto.ts"],
            rules: { "import/no-unassigned-import": "off" }
        }
    ]
});
