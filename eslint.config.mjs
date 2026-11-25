import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: [
            "**/node_modules/**",
            "**/.next/**",
            "**/dist/**",
            "**/build/**"
        ]
    },
    {
        files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        ...js.configs.recommended
    }
];