import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    // Mock nanoid — ESM-only package, not compatible with Jest CommonJS runtime.
    // Tests that need unique IDs use the mock which returns predictable values.
    "^nanoid$": "<rootDir>/src/__mocks__/nanoid.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default createJestConfig(config);