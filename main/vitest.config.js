"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        include: ["src/test/**/*.test.ts"],
        exclude: ["e2e/**", "dist/**", "node_modules/**"],
    },
});
//# sourceMappingURL=vitest.config.js.map