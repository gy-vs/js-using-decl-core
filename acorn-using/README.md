# acorn-using

[Acorn](https://github.com/acornjs/acorn) plugin that adds support for
[explicit resource management](https://github.com/tc39/proposal-explicit-resource-management)
(`using` and `await using` declarations) without modifying the core
parser.

## Usage

```js
var acorn = require("acorn");
var usingDeclarations = require("acorn-using");

var Parser = acorn.Parser.extend(usingDeclarations);
var ast = Parser.parse("using handle = open(path)", {ecmaVersion: 2026});
```

## Syntax

The plugin recognizes the following forms:

```js
using handle = open(path)
await using conn = connect()
for (using resource of resources) { ... }
```

They are parsed into `VariableDeclaration` nodes whose `kind` is
`"using"` or `"await using"`, so the output shape stays consistent
with `var`/`let`/`const` declarations.

`using` remains a normal identifier everywhere else:

- `using`, `using = 1`, `using.foo()`, `function using() {}` and
  similar code keeps parsing as before.
- A line break between `using` and the binding name ends the
  statement, so `using\nx = 1` is two statements, not a declaration.
- In a `for` header, `for (using of xs)` keeps parsing `using` as the
  loop variable. The same holds for `for (using in xs)`.

Bindings must be plain identifiers and must have an initializer
(except directly before `in`/`of` in a `for` header). Destructuring
(`using {a} = b`) and missing initializers (`using x`) are syntax
errors. Note that `using [a] = b` is not a declaration at all — it
keeps its existing meaning as a member-expression assignment, exactly
like the spec's lookahead rules prescribe.

`await using` declarations are only recognized where `await` is
allowed (async functions, module top level with a recent enough
`ecmaVersion`).
