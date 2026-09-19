// Acorn plugin for explicit resource management (`using` and
// `await using` declarations).
//
// Adds support for the ECMAScript 2026 explicit resource management
// syntax without touching the core parser:
//
//     using handle = open(path)
//     await using conn = connect()
//     for (using resource of resources) ...
//
// The declarations are represented as `VariableDeclaration` nodes
// whose `kind` is `"using"` or `"await using"`.
//
// `using` remains a normal identifier everywhere else. `using = 1`,
// `using.foo()`, `function using() {}`, `for (using of xs)`, and a
// line break between `using` and the would-be binding name all keep
// their existing meaning.

// Same pattern as acorn's own skipWhiteSpace, which is not part of
// the public API.
const skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g

// Must match BIND_LEXICAL from acorn's scopeflags.js (not public either).
const BIND_LEXICAL = 2

export default function usingDeclarations(Parser) {
  const tt = Parser.acorn.tokTypes
  const lineBreak = Parser.acorn.lineBreak
  const isIdentifierStart = Parser.acorn.isIdentifierStart
  const isIdentifierChar = Parser.acorn.isIdentifierChar
  const parseStatement = Parser.prototype.parseStatement
  const parseForStatement = Parser.prototype.parseForStatement

  return class extends Parser {
    // Find the position of the next non-whitespace character after
    // `pos`, skipping comments. Returns -1 when a line terminator is
    // crossed — `using` and its binding name may not be separated by
    // a line break. (Named to avoid clashing with acorn's own
    // `skipSpace` tokenizer method.)
    nextNonSpaceNoLineBreak(pos) {
      skipWhiteSpace.lastIndex = pos
      let skipped = skipWhiteSpace.exec(this.input)[0]
      return lineBreak.test(skipped) ? -1 : pos + skipped.length
    }

    // Find the position of the next non-whitespace character after
    // `pos`, skipping comments. Line breaks are allowed.
    nextNonSpace(pos) {
      skipWhiteSpace.lastIndex = pos
      return pos + skipWhiteSpace.exec(this.input)[0].length
    }

    // If the input at `pos` starts with `word`, followed by a character
    // that cannot continue an identifier, return the position directly
    // after the word. Otherwise return -1.
    skipWord(pos, word) {
      if (this.input.slice(pos, pos + word.length) !== word) return -1
      let ch = this.input.charCodeAt(pos + word.length)
      // `usingX` and `using\uXXXX` are single identifiers, not `using`.
      return isIdentifierChar(ch, true) || ch === 92 ? -1 : pos + word.length
    }

    // Test whether the word starting at `pos` can be the binding name
    // of a using declaration: an identifier that is not a keyword.
    // Inside a `for` header, `of` is excluded so that
    // `for (using of xs)` keeps parsing `using` as the loop variable.
    isUsingBindingName(pos, isFor) {
      let ch = this.input.charCodeAt(pos)
      if (ch === 92) return true // "\uXXXX" escape, validated by parseIdent
      if (!isIdentifierStart(ch, true) && !(ch > 0xd7ff && ch < 0xdc00)) return false
      let end = pos + 1
      while (isIdentifierChar(ch = this.input.charCodeAt(end), true)) ++end
      // An escape or astral character can never be part of a keyword.
      if (ch === 92 || ch > 0xd7ff && ch < 0xdc00) return true
      let word = this.input.slice(pos, end)
      if (this.keywords.test(word) || word === "await") return false
      return !(isFor && word === "of")
    }

    // Whether the current statement is a `using` declaration: the
    // `using` identifier directly followed, on the same line, by a
    // binding name.
    isUsingDeclaration() {
      if (!this.isContextual("using")) return false
      let pos = this.nextNonSpaceNoLineBreak(this.pos)
      return pos !== -1 && this.isUsingBindingName(pos, false)
    }

    // Whether the current statement is an `await using` declaration.
    // No line break is allowed between `await` and `using` either.
    isAwaitUsingDeclaration() {
      if (!this.canAwait || !this.isContextual("await")) return false
      let pos = this.nextNonSpaceNoLineBreak(this.pos)
      if (pos === -1) return false
      pos = this.skipWord(pos, "using")
      if (pos === -1) return false
      pos = this.nextNonSpaceNoLineBreak(pos)
      return pos !== -1 && this.isUsingBindingName(pos, false)
    }

    // Whether this `for` statement's header starts a `using`
    // declaration (`for (using x ...`).
    isForUsingDeclaration() {
      let pos = this.nextNonSpace(this.pos)
      if (this.input.charCodeAt(pos) !== 40) return false // "("
      pos = this.skipWord(this.nextNonSpace(pos + 1), "using")
      if (pos === -1) return false
      pos = this.nextNonSpaceNoLineBreak(pos)
      return pos !== -1 && this.isUsingBindingName(pos, true)
    }

    // Parse the binding list of a using declaration. Mirrors
    // `parseVar`, but using declarations may only bind plain
    // identifiers and require an initializer (except directly before
    // `in`/`of` in a `for` header).
    parseUsingDeclarators(node, isFor, kind) {
      node.declarations = []
      node.kind = kind
      for (;;) {
        let decl = this.startNode()
        if (this.type === tt.bracketL || this.type === tt.braceL)
          this.raise(this.start, "Destructuring is not supported in using declarations")
        decl.id = this.parseIdent()
        this.checkLValPattern(decl.id, BIND_LEXICAL, false)
        if (this.eat(tt.eq)) {
          decl.init = this.parseMaybeAssign(isFor)
        } else if (!(isFor && (this.type === tt._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))))) {
          this.raise(this.lastTokEnd, "Missing initializer in using declaration")
        } else {
          decl.init = null
        }
        node.declarations.push(this.finishNode(decl, "VariableDeclarator"))
        if (!this.eat(tt.comma)) break
      }
      return node
    }

    parseStatement(context, topLevel, exports) {
      let kind
      if (this.isUsingDeclaration()) {
        kind = "using"
      } else if (this.isAwaitUsingDeclaration()) {
        kind = "await using"
      } else {
        return parseStatement.call(this, context, topLevel, exports)
      }
      // Like `let` and `const`, using declarations are not allowed in
      // single-statement positions (e.g. as the body of an `if`).
      if (context) this.unexpected()
      let node = this.startNode()
      this.next() // `using` or `await`
      if (kind === "await using") this.next() // `using`
      this.parseUsingDeclarators(node, false, kind)
      this.semicolon()
      return this.finishNode(node, "VariableDeclaration")
    }

    parseForStatement(node) {
      if (!this.isForUsingDeclaration()) return parseForStatement.call(this, node)
      this.next() // `for`
      this.labels.push({kind: "loop"})
      this.enterScope(0)
      this.expect(tt.parenL)
      let init = this.startNode()
      this.next() // `using`
      this.parseUsingDeclarators(init, true, "using")
      this.finishNode(init, "VariableDeclaration")
      if ((this.type === tt._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) &&
          init.declarations.length === 1)
        return this.parseForIn(node, init)
      return this.parseFor(node, init)
    }
  }
}
