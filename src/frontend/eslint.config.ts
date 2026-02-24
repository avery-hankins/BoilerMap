import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/frontend/src/*.{ts, tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  {
    ignores: ["dist/*"],
  },
  ...tseslint.configs.recommended,
  pluginReact.configs.flat!.recommended as any,
]);
