import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    react: "src/react/index.ts",
    server: "src/server.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
})
