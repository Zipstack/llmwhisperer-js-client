import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default [
  eslintConfigPrettier,
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { languageOptions: { globals: globals.node } },
  { ignores: ["dist/", "lib/", "deps/"] },
];
