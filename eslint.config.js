import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  {
    ignores: [
      "build/",
      ".react-router/",
      ".generated/",
      ".cache/",
      ".lighthouseci/",
      "node_modules/",
      "public/",
      "media/",
      "schemas/",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  {
    files: ["scripts/**", "*.config.js", "**/*.server.js", "app/routes.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["app/**/*.{js,jsx}"],
    ...reactHooks.configs.flat["recommended-latest"],
  },
];
