import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [".artifacts/**"],
  },
];

export default eslintConfig;
