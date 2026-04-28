import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    // e2e/** is excluded while the Playwright suite is being rewritten —
    // see docs/focus-mode-todo.md §4. Re-include once the suite is functional.
    ignores: [".artifacts/**", "e2e/**"],
  },
];

export default eslintConfig;
