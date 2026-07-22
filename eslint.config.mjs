// Flat config. ESLint 10 dropped .eslintrc support and Next 16 removed
// `next lint`, so linting now runs through the ESLint CLI directly.
import coreWebVitals from "eslint-config-next/core-web-vitals"
import typescript from "eslint-config-next/typescript"

const config = [
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

            // eslint-plugin-react-hooks v6 added the React Compiler rules.
            // They flag ~110 pre-existing sites: dialogs that reset state on
            // open, hooks that load settings from localStorage on mount, and
            // the three.js visualization layer, which mutates camera, scene
            // and material objects by design. Converting those is a refactor
            // of ~40 components, so they are warnings for now — a backlog that
            // stays visible without blocking the build. rules-of-hooks stays
            // an error: it catches genuine crashes.
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/immutability": "warn",
            "react-hooks/refs": "warn",
            "react-hooks/preserve-manual-memoization": "warn",
            "react-hooks/purity": "warn",
            "react-hooks/static-components": "warn",
        },
    },
]

export default config
