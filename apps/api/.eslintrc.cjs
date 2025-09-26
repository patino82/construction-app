module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "standard-with-typescript"
  ],
  rules: {
    "@typescript-eslint/strict-boolean-expressions": "off",
    "@typescript-eslint/no-floating-promises": ["error", { "ignoreIIFE": true }]
  }
};
