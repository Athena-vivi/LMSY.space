import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Dev-only scratch dirs: draft scripts, DB/R2 backups and one-off tooling.
    // They are run standalone (node ..., scripts/*.mjs) and must not block the
    // app typecheck / lint / next build.
    "temp/**",
    "backups/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
