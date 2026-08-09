import { defineConfig } from "tsdown";

export default defineConfig({
    root: "./src",
    outDir: "./dist",
    entry: "./src/index.ts",
    dts: true,
    format: 'esm',
    platform: 'neutral',
    deps: {
        onlyBundle: ["@vladfrangu/async_event_emitter"]
    },
    minify: false
});