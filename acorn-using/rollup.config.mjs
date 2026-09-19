import buble from "@rollup/plugin-buble"

export default {
  external: ["acorn"],
  input: "acorn-using/src/index.js",
  output: [
    {
      file: "acorn-using/dist/acorn-using.js",
      format: "umd",
      name: "acorn.using",
      globals: {acorn: "acorn"}
    },
    {
      file: "acorn-using/dist/acorn-using.mjs",
      format: "es",
      globals: {acorn: "acorn"}
    }
  ],
  plugins: [
    buble({transforms: {dangerousForOf: true}})
  ]
}
