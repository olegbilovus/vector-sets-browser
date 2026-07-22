// Flat config. ESLint 10 dropped .eslintrc support and Next 16 removed
// `next lint`, so linting now runs through the ESLint CLI directly.
import coreWebVitals from "eslint-config-next/core-web-vitals"
import typescript from "eslint-config-next/typescript"

export default [
    {
        ignores: [
            ".next/**",
            "node_modules/**",
            "next-env.d.ts",
            "public/**",
        ],
    },
    ...coreWebVitals,
    ...typescript,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/ban-ts-comment": [
                "error",
                {
                    "ts-ignore": "allow-with-description",
                    "ts-expect-error": true,
                    "ts-nocheck": false,
                    "ts-check": false,
                },
            ],
        },
    },
]
