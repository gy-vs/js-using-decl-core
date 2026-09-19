(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('acorn')) :
  typeof define === 'function' && define.amd ? define(['acorn'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, (global.acorn = global.acorn || {}, global.acorn.using = factory(global.acorn)));
})(this, (function (acorn) { 'use strict';

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


  var BIND_LEXICAL = 2; // see acorn's src/scopeflags.js
  var loopLabel = {kind: "loop"};

  // Result tags for recognizing (or failing to recognize, with a
  // reason) a using declaration while scanning ahead.

  var NO_MATCH = null;
  var MATCH = {match: true};

  // A token as returned by the lookahead tokenizer, augmented with the
  // tokenizer's containsEsc flag at the moment it was produced.

  var PeekToken = function PeekToken(tokenizer, token) {
    this.type = token.type;
    this.value = token.value;
    this.start = token.start;
    this.end = token.end;
    this.containsEsc = tokenizer.containsEsc;
  };
  PeekToken.prototype.isContextual = function isContextual (name) {
    return this.type === acorn.tokTypes.name && this.value === name && !this.containsEsc
  };

  // Read up to `max` tokens starting at `pos`, without mutating the
  // active parser's state.

  function tokenizeFrom(parser, pos, max) {
    var tokenizer = new parser.constructor(
      Object.assign({}, parser.options, {
        onToken: null,
        onComment: null,
        locations: false,
        ranges: false
      }),
      parser.input,
      pos
    );
    tokenizer.lastTokEnd = tokenizer.lastTokStart = pos;
    var tokens = [];
    for (var i = 0; i < max; i++) {
      var token = tokenizer.getToken();
      tokens.push(new PeekToken(tokenizer, token));
      if (token.type === acorn.tokTypes.eof) { break }
    }
    return tokens
  }

  function hasNoLineBreak(parser, left, right) {
    return !acorn.lineBreak.test(parser.input.slice(left, right))
  }

  // Whether an identifier token can be the binding of a using
  // declaration. Keyword token types cannot, and in for-heads the
  // identifier `of` names the variable in `for (using of xs)`.

  function isBindingIdentifier(token, isFor) {
    return token.type === acorn.tokTypes.name &&
      !(isFor && token.value === "of" && !token.containsEsc)
  }

  // Given the end position of a `using` identifier, decide whether the
  // tokens after it form a declaration tail:
  //
  //   BindingIdentifier = ...      (statements)
  //   BindingIdentifier of ...     (for-heads)
  //
  // Returns NO_MATCH, BAD_BINDING (destructuring or keyword), or MATCH.

  function matchUsingTail(parser, usingEnd, isFor) {
    var ref = tokenizeFrom(parser, usingEnd, 2);
    var binding = ref[0];
    var tail = ref[1];
    if (!hasNoLineBreak(parser, usingEnd, binding.start)) { return NO_MATCH }
    if (!isBindingIdentifier(binding, isFor))
      { return {badBinding: binding.start} }
    if (tail.type === acorn.tokTypes.eq || isFor && tail.isContextual("of")) { return MATCH }
    return NO_MATCH
  }

  // Classify the current token as the start of a using statement.
  // Returns "using", "await using", NO_MATCH, or BAD_BINDING.

  pp.classifyUsingStart = function() {
    if (this.type !== acorn.tokTypes.name || this.containsEsc) { return NO_MATCH }
    if (this.value === "using") {
      var match = matchUsingTail(this, this.end, false);
      return match === MATCH ? "using" : match
    }
    if (this.value === "await") {
      var ref = tokenizeFrom(this, this.end, 1);
      var using = ref[0];
      if (!using.isContextual("using")) { return NO_MATCH }
      if (!hasNoLineBreak(this, this.end, using.start)) { return NO_MATCH }
      var match$1 = matchUsingTail(this, using.end, false);
      return match$1 === MATCH ? "await using" : match$1
    }
    return NO_MATCH
  };

  // Match a for-head of one of the shapes:
  //
  //   using Identifier of
  //   await using Identifier of
  //
  // Returns NO_MATCH, BAD_BINDING or {kind}.

  pp.peekUsingForHead = function() {
    if (this.type !== acorn.tokTypes.name || this.containsEsc) { return NO_MATCH }
    if (this.value === "using") {
      var ref = tokenizeFrom(this, this.end, 2);
      var binding = ref[0];
      var of = ref[1];
      if (!hasNoLineBreak(this, this.end, binding.start)) { return NO_MATCH }
      if (!isBindingIdentifier(binding, true))
        { return {badBinding: binding.start} }
      return of.isContextual("of") ? {kind: "using"} : NO_MATCH
    }
    if (this.value === "await") {
      var ref$1 = tokenizeFrom(this, this.end, 3);
      var using = ref$1[0];
      var binding$1 = ref$1[1];
      var of$1 = ref$1[2];
      if (!using.isContextual("using")) { return NO_MATCH }
      if (!hasNoLineBreak(this, this.end, using.start)) { return NO_MATCH }
      if (!hasNoLineBreak(this, using.end, binding$1.start)) { return NO_MATCH }
      if (!isBindingIdentifier(binding$1, true))
        { return {badBinding: binding$1.start} }
      return of$1.isContextual("of") ? {kind: "await using"} : NO_MATCH
    }
    return NO_MATCH
  };

  // Parse the single declarator of a using declaration, assuming the
  // `using` (and leading `await`) token has already been consumed.

  pp.parseUsingBinding = function(kind, startPos, startLoc) {
    var declaration = startPos == null
      ? this.startNode()
      : this.startNodeAt(startPos, startLoc);
    declaration.kind = kind;
    var declarator = this.startNode();
    declarator.id = this.parseIdent();
    this.checkLValSimple(declarator.id, BIND_LEXICAL, undefined);
    declarator.init = null;
    declaration.declarations = [this.finishNode(declarator, "VariableDeclarator")];
    return declaration
  };

  // Statement dispatch ----------------------------------------------------

  var originalParseStatement = pp.parseStatement;

  pp.parseStatement = function(context, topLevel, exports) {
    var kind = null;
    if (this.type === acorn.tokTypes.name) {
      var match = this.classifyUsingStart();
      if (match && match.badBinding != null)
        { this.raise(match.badBinding, "Using declarations can only bind an identifier"); }
      if (match === "using" || match === "await using") { kind = match; }
    }
    if (kind) {
      if (context) { this.unexpected(); }
      if (kind === "await using" && !this.canAwait) { this.unexpected(); }
      if (kind === "await using") { this.next(); } // consume `await`
      var startPos = this.start, startLoc = this.startLoc;
      this.next(); // consume `using`
      var declaration = this.parseUsingBinding(kind, startPos, startLoc);
      if (this.eat(acorn.tokTypes.comma))
        { this.raise(this.start, "Using declarations may not have more than one declaration"); }
      if (!this.eat(acorn.tokTypes.eq))
        { this.raise(this.lastTokEnd, "Using declarations require an initializer expression"); }
      declaration.declarations[0].init = this.parseMaybeAssign();
      this.semicolon();
      return this.finishNode(declaration, "VariableDeclaration")
    }
    return originalParseStatement.call(this, context, topLevel, exports)
  };

  // For-head dispatch ------------------------------------------------------

  pp.parseForStatement;

  pp.parseForStatement = function(node) {
    this.next(); // `for`
    var awaitAt = (this.options.ecmaVersion >= 9 && this.canAwait && this.eatContextual("await")) ? this.lastTokStart : -1;
    this.labels.push(loopLabel);
    this.enterScope(0);
    this.expect(acorn.tokTypes.parenL);

    if (this.type !== acorn.tokTypes.semi) {
      var match = this.peekUsingForHead();
      if (match && match.badBinding != null)
        { this.raise(match.badBinding, "Using declarations can only bind an identifier"); }
      if (match && match.kind) {
        var kind = match.kind;
        if (kind === "await using") {
          // `for (await using ...)`: a for-await's `await` is only
          // consumed when it directly follows `for`.
          if (awaitAt > -1) { this.unexpected(awaitAt); }
          this.next(); // consume `await`
        }
        var startPos = this.start, startLoc = this.startLoc;
        this.next(); // consume `using`
        var init = this.parseUsingBinding(kind, startPos, startLoc);
        if (this.eat(acorn.tokTypes.comma))
          { this.raise(this.start, "Using declarations may not have more than one declaration"); }
        this.finishNode(init, "VariableDeclaration");
        if (!this.isContextual("of")) { this.unexpected(); }
        var result = this.parseForIn(node, init);
        result.await = kind === "await using" || awaitAt > -1;
        return result
      }
    }

    return this.parseForStatementTail(node, awaitAt)
  };

  // Copy of the original parseForStatement body starting right after
  // `for [await] (` has been consumed.

  pp.parseForStatementTail = function(node, awaitAt) {
    if (this.type === acorn.tokTypes.semi) {
      if (awaitAt > -1) { this.unexpected(awaitAt); }
      return this.parseFor(node, null)
    }
    var isLet = this.isLet();
    if (this.type === acorn.tokTypes._var || this.type === acorn.tokTypes._const || isLet) {
      var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
      this.next();
      this.parseVar(init$1, true, kind);
      this.finishNode(init$1, "VariableDeclaration");
      if ((this.type === acorn.tokTypes._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init$1.declarations.length === 1) {
        if (this.options.ecmaVersion >= 9) {
          if (this.type === acorn.tokTypes._in) {
            if (awaitAt > -1) { this.unexpected(awaitAt); }
          } else { node.await = awaitAt > -1; }
        }
        return this.parseForIn(node, init$1)
      }
      if (awaitAt > -1) { this.unexpected(awaitAt); }
      return this.parseFor(node, init$1)
    }
    var startsWithLet = this.isContextual("let"), isForOf = false;
    var refDestructuringErrors = {
      shorthandAssign: -1,
      trailingComma: -1,
      parenthesizedAssign: -1,
      parenthesizedBind: -1,
      doubleProto: -1
    };
    var init = this.parseExpression(awaitAt > -1 ? "await" : true, refDestructuringErrors);
    if (this.type === acorn.tokTypes._in || (isForOf = this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
      if (this.options.ecmaVersion >= 9) {
        if (this.type === acorn.tokTypes._in) {
          if (awaitAt > -1) { this.unexpected(awaitAt); }
        } else { node.await = awaitAt > -1; }
      }
      if (startsWithLet && isForOf) { this.raise(init.start, "The left-hand side of a for-of loop may not start with 'let'."); }
      this.toAssignable(init, false, refDestructuringErrors);
      this.checkLValPattern(init);
      return this.parseForIn(node, init)
    } else {
      this.checkExpressionErrors(refDestructuringErrors, true);
    }
    if (awaitAt > -1) { this.unexpected(awaitAt); }
    return this.parseFor(node, init)
  };

  function index(Parser) {
    return /*@__PURE__*/(function (Parser) {
      function anonymous () {
        Parser.apply(this, arguments);
      }if ( Parser ) anonymous.__proto__ = Parser;
      anonymous.prototype = Object.create( Parser && Parser.prototype );
      anonymous.prototype.constructor = anonymous;

      

      return anonymous;
    }(Parser))
  }

  return index;

}));
