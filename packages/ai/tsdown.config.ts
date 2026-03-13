import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/chat.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: false,
  clean: true,
  minify: false,
  fixedExtension: false,
  deps: {
    neverBundle: ["ai", "@ai-sdk/openai"],
  },
});
