import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Existing code debt: surfaced as warnings so new code can be held to a
    // zero-error bar in CI. Tighten these back to "error" as the debt is paid down.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // Vendored shadcn/ui primitives — keep them as generated upstream.
    files: ["components/ui/**"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["tailwind.config.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "public/sw*", "public/swe-worker*"]),
])

export default eslintConfig
