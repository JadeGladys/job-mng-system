module.exports = {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "jsdom",
    roots: ["<rootDir>/src"],
    setupFilesAfterEnv: ["<rootDir>/src/test/setupTests.ts"],
    testMatch: ["**/__tests__/**/*.test.ts?(x)", "**/?(*.)+(spec|test).ts?(x)"],
    transform: {
        "^.+\\.(ts|tsx)$": [
            "ts-jest",
            {
                useESM: true,
                tsconfig: "<rootDir>/tsconfig.test.json",
            },
        ],
    },
    moduleNameMapper: {
        "^(.+)\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
};
