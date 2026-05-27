/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testRegex: "\\.test\\.tsx?$",
  testPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  setupFiles: ["<rootDir>/jest.setup.ts"],
};
