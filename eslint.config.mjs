import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships native flat configs — no FlatCompat/eslintrc shim.
const config = [
  { ignores: [".next/**", "node_modules/**", "public/**", "next-env.d.ts"] },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Rule 2: config is read through src/lib/env.ts, never process.env directly.
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Read config through src/lib/env.ts, never process.env directly (Rule 2).",
        },
      ],
    },
  },
  {
    // The sanctioned readers: env.ts itself; middleware.ts, which runs in the edge
    // runtime; and next.config.ts, which is evaluated at build time. None of the
    // three can import a `server-only` module.
    files: ["src/lib/env.ts", "middleware.ts", "next.config.ts"],
    rules: { "no-restricted-properties": "off" },
  },
];

export default config;
