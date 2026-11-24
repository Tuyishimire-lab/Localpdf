import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated test coverage and copied third-party WASM/worker assets:
    "coverage/**",
    "public/pdf/**",
    "public/tesseract/**",
    "public/wasm/**",
  ]),
]);

export default eslintConfig;
