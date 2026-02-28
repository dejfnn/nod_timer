/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          strict: true,
          baseUrl: ".",
          paths: { "@/*": ["src/*"] },
          jsx: "react-jsx",
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(drizzle-orm|expo-sqlite|expo-router|expo-status-bar)/)",
  ],
};
