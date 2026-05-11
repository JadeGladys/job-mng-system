module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/src"],
    testMatch: ["**/tests/**/*.test.ts"],
    setupFiles: ["<rootDir>/src/tests/setupTestEnv.ts"],
    moduleFileExtensions: ["ts", "js", "json"],
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                tsconfig: {
                    isolatedModules: true,
                },
                diagnostics: {
                    ignoreCodes: [151002],
                },
            },
        ],
    },
};
