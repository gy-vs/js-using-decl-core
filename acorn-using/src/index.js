// Acorn plugin: Explicit Resource Management (`using` declarations)
//
// Supports:
//   using handle = open(path)
//   await using conn = connect()
//   for (using r of resources) ...
//   for await (using r of resources) ...
//
// Produced nodes keep the shape of VariableDeclaration /
// VariableDeclarator, with `kind` set to "using" or "await using".
//
// `using` remains an ordinary identifier everywhere it does not form
// a declaration. In particular:
//
//   using;                      // identifier expression
//   using = 1;                  // identifier expression
//   using.foo();                // member expression
//   function using() {}         // function named using
//   using
//   x = 1;                      // two statements (no line continuations)
//   for (using of xs) ...       // using is the loop variable

import {tokTypes as tt, lineBreak} from "acorn"

const BIND_LEXICAL = 2 // see acorn's src/scopeflags.js
const loopLabel = {kind: "loop"}

// A token as returned by the lookahead tokenizer, augmented with the
// tokenizer's containsEsc flag at the moment it was produced.

class PeekToken {
  constructor(tokenizer, token) {
    this.type = token.type
    this.value = token.value
    this.start = token.start
    this.end = token.end
    this.containsEsc = tokenizer.containsEsc
  }
  isContextual(name) {
    return this.type === tt.name && this.value === name && !this.containsEsc
  }
}

export default function usingPlugin(InnerParser) {
  const pp = InnerParser.prototype

  // Read up to `max` tokens starting at `pos`, without mutating the
  // active parser's state.

  function tokenizeFrom(parser, pos, max) {
    let tokenizer = new InnerParser(
      Object.assign({}, parser.options, {
        onToken: null,
        onComment: null,
        locations: false,
        ranges: false
      }),
      parser.input,
      pos
    )
    tokenizer.lastTokEnd = tokenizer.lastTokStart = pos
    let tokens = []
    for (let i = 0; i < max; i++) {
      let token = tokenizer.getToken()
      tokens.push(new PeekToken(tokenizer, token))
      if (token.type === tt.eof) break
    }
    return tokens
  }

  function hasNoLineBreak(parser, left, right) {
    return !lineBreak.test(parser.input.slice(left, right))
  }

  // In statement position, decide what follows a contextual `using`
  // (whose end is `usingEnd`):
  //
  //   {decl: true}        BindingIdentifier =
  //   {missingInit: pos}  BindingIdentifier followed by anything else
  //   {badBinding: pos}   destructuring pattern ({ or [)
  //   null                not a using declaration (identifier usage)
  //
  // A line terminator between `using` and the next token always wins:
  // the `using` is an expression statement of its own.

  function matchUsingStatementTail(parser, usingEnd) {
    let [binding, tail] = tokenizeFrom(parser, usingEnd, 2)
    if (!hasNoLineBreak(parser, usingEnd, binding.start)) return null
    if (binding.type === tt.braceL || binding.type === tt.bracketL)
      return {badBinding: binding.start}
    if (binding.type !== tt.name) return null
    return tail.type === tt.eq
      ? {decl: true}
      : {missingInit: binding.end}
  }

  // Classify the current token as the start of a using statement.
  // Returns a descriptor from matchUsingStatementTail augmented with a
  // `kind` ("using" / "await using"), or null when the token is just
  // an identifier.

  pp.classifyUsingStart = function() {
    if (this.type !== tt.name || this.containsEsc) return null
    if (this.value === "using") {
      let match = matchUsingStatementTail(this, this.end)
      if (match && match.decl) match.kind = "using"
      return match
    }
    if (this.value === "await") {
      let [using] = tokenizeFrom(this, this.end, 1)
      if (!using.isContextual("using")) return null
      if (!hasNoLineBreak(this, this.end, using.start)) return null
      let match = matchUsingStatementTail(this, using.end)
      if (match && match.decl) match.kind = "await using"
      return match
    }
    return null
  }

  // From the position right after a `for` keyword, check whether the
  // loop head introduces a using binding:
  //
  //   for (using BindingIdentifier of ...)
  //   for (await using BindingIdentifier of ...)
  //   for await (using BindingIdentifier of ...)
  //   for await (await using BindingIdentifier of ...)
  //
  // Returns null (not a using-for), {badBinding: pos}, or
  // {forAwait, declAwait}. `for (using of xs)` is deliberately not
  // recognized, so that `using` stays the loop variable name.

  pp.peekUsingForHead = function() {
    let toks = tokenizeFrom(this, this.end, 6)
    let i = 0
    let forAwait = false
    if (toks[i] && toks[i].isContextual("await") &&
        this.options.ecmaVersion >= 9 && this.canAwait) {
      forAwait = true
      i++
    }
    if (!toks[i] || toks[i].type !== tt.parenL) return null
    i++

    let declAwait = false
    if (toks[i] && toks[i].isContextual("await") &&
        this.options.ecmaVersion >= 9 && this.canAwait) {
      declAwait = true
      i++
    }
    let using = toks[i]
    if (!using || !using.isContextual("using")) return null
    let binding = toks[i + 1], of = toks[i + 2]
    if (!binding || !hasNoLineBreak(this, using.end, binding.start)) return null
    if (declAwait && !hasNoLineBreak(this, toks[i - 1].end, using.start)) return null
    if (binding.type === tt.braceL || binding.type === tt.bracketL)
      return {badBinding: binding.start}
    if (binding.type !== tt.name) return null
    if (binding.isContextual("of")) return null // for (using of xs)
    // Any token other than `of` is an error once `using Identifier`
    // started the head (`using Identifier` cannot be an expression);
    // parseUsingForHead raises a dedicated message for it.
    return {forAwait, declAwait, of: !!of && of.isContextual("of")}
  }

  pp.parseUsingBinding = function(kind, startPos, startLoc) {
    let declaration = this.startNodeAt(startPos, startLoc)
    declaration.kind = kind
    let declarator = this.startNode()
    declarator.id = this.parseIdent()
    this.checkLValSimple(declarator.id, BIND_LEXICAL, undefined)
    declarator.init = null
    declaration.declarations = [this.finishNode(declarator, "VariableDeclarator")]
    return declaration
  }

  // Statement dispatch --------------------------------------------------

  const originalParseStatement = pp.parseStatement

  pp.parseStatement = function(context, topLevel, exports) {
    let match = this.type === tt.name ? this.classifyUsingStart() : null
    if (match) {
      if (match.badBinding != null)
        this.raise(match.badBinding, "Using declarations can only bind an identifier")
      if (match.missingInit != null)
        this.raise(match.missingInit, "Using declarations require an initializer expression")
      if (match.decl) {
        let kind = match.kind
        if (context) this.unexpected()
        if (kind === "await using" && !this.canAwait) this.unexpected()
        if (kind === "await using") this.next() // consume `await`
        let startPos = this.start, startLoc = this.startLoc
        this.next() // consume `using`
        let declaration = this.parseUsingBinding(kind, startPos, startLoc)
        if (this.eat(tt.comma))
          this.raise(this.start, "Using declarations may not have more than one declaration")
        if (!this.eat(tt.eq))
          this.raise(this.lastTokEnd, "Using declarations require an initializer expression")
        declaration.declarations[0].init = this.parseMaybeAssign()
        this.semicolon()
        return this.finishNode(declaration, "VariableDeclaration")
      }
    }
    return originalParseStatement.call(this, context, topLevel, exports)
  }

  // For-head dispatch ----------------------------------------------------

  const originalParseForStatement = pp.parseForStatement

  pp.parseForStatement = function(node) {
    let head = this.type === tt._for ? this.peekUsingForHead() : null
    if (!head)
      return originalParseForStatement.call(this, node)
    if (head.badBinding != null)
      this.raise(head.badBinding, "Using declarations can only bind an identifier")

    this.next() // `for`
    if (head.forAwait) this.next() // `await`
    this.labels.push(loopLabel)
    this.enterScope(0)
    this.expect(tt.parenL)
    let startPos = this.start, startLoc = this.startLoc
    if (head.declAwait) {
      this.next() // `await`
      startPos = this.start
      startLoc = this.startLoc
    }
    this.next() // `using`
    let kind = head.declAwait ? "await using" : "using"
    let init = this.parseUsingBinding(kind, startPos, startLoc)
    if (this.eat(tt.comma))
      this.raise(this.start, "Using declarations may not have more than one declaration")
    this.finishNode(init, "VariableDeclaration")
    if (!this.isContextual("of"))
      this.raise(this.start, "Using declarations in for statement heads require an 'of' clause")
    let result = this.parseForIn(node, init)
    if (this.options.ecmaVersion >= 9)
      result.await = head.forAwait || head.declAwait
    return result
  }

  return class extends InnerParser {}
}
