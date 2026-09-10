import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Demote noisy rules to warnings. Tighten when the codebase is ready.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "react/no-unescaped-entities": "warn",
      // React 19's new rules are noisy in this codebase; demote for now.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/component-hook-factories": "warn",
      "react-hooks/config": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/unsupported-syntax": "warn",
      "react-hooks/use-memo": "warn",
      // Legacy var/const patterns — demote while migrating the codebase.
      "no-var": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-use-before-define": "warn",
      "@typescript-eslint/no-use-before-define": "warn",
    },
  },
]);

export default eslintConfig;
