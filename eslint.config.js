// Algorisys shared ESLint config for SolidJS + TypeScript + zen-ui (ESLint 9 flat config).
// Copy to the frontend root. Dev dependencies:
//   npm i -D eslint@9 @eslint/js@9 typescript-eslint eslint-plugin-solid globals
// Gate: `npm run lint` (eslint .) must report nothing (AGENTS.md section 6).
// The frontend package.json needs "type": "module" (Vite projects have it). Add generated files
// (e.g. a generated .d.ts) to the ignores below rather than disabling rules for them.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import solid from "eslint-plugin-solid/configs/typescript";
import globals from "globals";

// Keeps components looking the way zen-ui designed them (AGENTS.md, Frontend conventions).
// The message is written for the agent that broke the rule: it says what to do instead.
const zenUi = [
  {
    // A component's own look comes from its props and the --zen-* tokens, never from style=.
    selector: "JSXOpeningElement[name.name=/^[A-Z]/] > JSXAttribute[name.name='style']",
    message:
      "Don't restyle components with style=. Use the component's variant, size or color props, or change a --zen-* token. For placement (margin, width, grid area), wrap it in a layout element.",
  },
  {
    // Colours come from tokens, so light and dark themes keep working.
    selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
    message: "No hard-coded colours. Use a token, e.g. var(--zen-color-primary).",
  },
  {
    selector: "Literal[value=/^(rgb|rgba|hsl|hsla)\\(/]",
    message: "No hard-coded colours. Use a token, e.g. var(--zen-color-primary).",
  },
];

export default tseslint.config(
  { ignores: ["dist/", "vendor/", "node_modules/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    ...solid,
    languageOptions: { globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      "no-restricted-syntax": ["error", ...zenUi],
      // Only zen-ui supplies UI components.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@kobalte/*", "@ark-ui/*", "solid-ui", "@suid/*", "@hope-ui/*", "corvu", "@corvu/*"],
              message: "Use components from @algorisys/zen-ui-solid (AGENTS.md, The stack).",
            },
          ],
        },
      ],
      // Data fetching goes through the one API client module.
      "no-restricted-globals": ["error", { name: "fetch", message: "Call the API through the project's API client module (AGENTS.md, Frontend conventions)." }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Build and test scripts run in Node.
    files: ["scripts/**/*.{js,mjs}", "*.config.{js,mjs}"],
    languageOptions: { globals: globals.node },
  },
  {
    // The API client module is where fetch is allowed. Adjust the path to the project's.
    files: ["src/api.ts", "src/api/**/*.ts"],
    rules: { "no-restricted-globals": "off" },
  },
);
