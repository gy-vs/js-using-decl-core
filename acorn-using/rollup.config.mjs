import buble from "@rollup/plugin-buble"

export default [
  {
    input: "acorn-using/src/index.js",
    output: [
      {
        file: "acorn-using/dist/acorn-using.js",
        format: "umd",
        name: "acornUsing",
        exports: "default"
      },
      {
        file: "acorn-using/dist/acorn-using.mjs",
        format: "es"
      }
    ],
    plugins: [
      buble({transforms: {dangerousForOf: true}})
    ]
  }
]
