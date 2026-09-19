if (typeof exports !== "undefined") {
  var driver = require("./driver.js");
}

// Tests for the acorn-using plugin (explicit resource management).
//
// All tests in this file are tagged with `usingPlugin` so that the
// normal and loose parsers skip them (see test/run.js); they only run
// against acorn with the plugin extended in.

function test(code, ast, options) {
  options = options || {};
  options.usingPlugin = true;
  driver.test(code, ast, options);
}

function testFail(code, message, options) {
  options = options || {};
  options.usingPlugin = true;
  driver.testFail(code, message, options);
}

//-----------------------------------------------------------------------------
// using declarations
//-----------------------------------------------------------------------------

test("using handle = open(path)", {
  "type": "Program",
  "start": 0,
  "end": 25,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 25,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 6,
          "end": 25,
          "id": {
            "type": "Identifier",
            "start": 6,
            "end": 12,
            "name": "handle"
          },
          "init": {
            "type": "CallExpression",
            "start": 15,
            "end": 25,
            "callee": {
              "type": "Identifier",
              "start": 15,
              "end": 19,
              "name": "open"
            },
            "arguments": [
              {
                "type": "Identifier",
                "start": 20,
                "end": 24,
                "name": "path"
              }
            ]
          }
        }
      ],
      "kind": "using"
    }
  ]
}, {ecmaVersion: 6});

test("using x = 1, y = 2", {
  "type": "Program",
  "start": 0,
  "end": 18,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 18,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 6,
          "end": 11,
          "id": {
            "type": "Identifier",
            "start": 6,
            "end": 7,
            "name": "x"
          },
          "init": {
            "type": "Literal",
            "start": 10,
            "end": 11,
            "value": 1,
            "raw": "1"
          }
        },
        {
          "type": "VariableDeclarator",
          "start": 13,
          "end": 18,
          "id": {
            "type": "Identifier",
            "start": 13,
            "end": 14,
            "name": "y"
          },
          "init": {
            "type": "Literal",
            "start": 17,
            "end": 18,
            "value": 2,
            "raw": "2"
          }
        }
      ],
      "kind": "using"
    }
  ]
}, {ecmaVersion: 6});

test("{ using x = f() }", {
  "type": "Program",
  "start": 0,
  "end": 17,
  "body": [
    {
      "type": "BlockStatement",
      "start": 0,
      "end": 17,
      "body": [
        {
          "type": "VariableDeclaration",
          "start": 2,
          "end": 15,
          "declarations": [
            {
              "type": "VariableDeclarator",
              "start": 8,
              "end": 15,
              "id": {
                "type": "Identifier",
                "start": 8,
                "end": 9,
                "name": "x"
              },
              "init": {
                "type": "CallExpression",
                "start": 12,
                "end": 15,
                "callee": {
                  "type": "Identifier",
                  "start": 12,
                  "end": 13,
                  "name": "f"
                },
                "arguments": []
              }
            }
          ],
          "kind": "using"
        }
      ]
    }
  ]
}, {ecmaVersion: 6});

test("using a = 1\nfoo(a)", {
  "type": "Program",
  "start": 0,
  "end": 18,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 11,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 6,
          "end": 11,
          "id": {
            "type": "Identifier",
            "start": 6,
            "end": 7,
            "name": "a"
          },
          "init": {
            "type": "Literal",
            "start": 10,
            "end": 11,
            "value": 1,
            "raw": "1"
          }
        }
      ],
      "kind": "using"
    },
    {
      "type": "ExpressionStatement",
      "start": 12,
      "end": 18,
      "expression": {
        "type": "CallExpression",
        "start": 12,
        "end": 18,
        "callee": {
          "type": "Identifier",
          "start": 12,
          "end": 15,
          "name": "foo"
        },
        "arguments": [
          {
            "type": "Identifier",
            "start": 16,
            "end": 17,
            "name": "a"
          }
        ]
      }
    }
  ]
}, {ecmaVersion: 6});

// `using` itself may be used as the binding name.
test("using using = using", {
  "type": "Program",
  "start": 0,
  "end": 19,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 19,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 6,
          "end": 19,
          "id": {
            "type": "Identifier",
            "start": 6,
            "end": 11,
            "name": "using"
          },
          "init": {
            "type": "Identifier",
            "start": 14,
            "end": 19,
            "name": "using"
          }
        }
      ],
      "kind": "using"
    }
  ]
}, {ecmaVersion: 6});

// `of` is a plain identifier at statement level.
test("using of = 1", {
  "type": "Program",
  "start": 0,
  "end": 12,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 12,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 6,
          "end": 12,
          "id": {
            "type": "Identifier",
            "start": 6,
            "end": 8,
            "name": "of"
          },
          "init": {
            "type": "Literal",
            "start": 11,
            "end": 12,
            "value": 1,
            "raw": "1"
          }
        }
      ],
      "kind": "using"
    }
  ]
}, {ecmaVersion: 6});

// Comments between `using` and the binding name are allowed.
test("using /* c */ x = 1", {
  "type": "Program",
  "start": 0,
  "end": 19,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 19,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 14,
          "end": 19,
          "id": {
            "type": "Identifier",
            "start": 14,
            "end": 15,
            "name": "x"
          },
          "init": {
            "type": "Literal",
            "start": 18,
            "end": 19,
            "value": 1,
            "raw": "1"
          }
        }
      ],
      "kind": "using"
    }
  ]
}, {ecmaVersion: 6});

// Escaped and astral identifiers as binding names.
test("using \\u0061bc = 1", {
  "type": "Program",
  "start": 0,
  "end": 18,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 18,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 6,
          "end": 18,
          "id": {
            "type": "Identifier",
            "start": 6,
            "end": 14,
            "name": "abc"
          },
          "init": {
            "type": "Literal",
            "start": 17,
            "end": 18,
            "value": 1,
            "raw": "1"
          }
        }
      ],
      "kind": "using"
    }
  ]
}, {ecmaVersion: 6});

test("using \u{20000}\u{20001} = 1", {
  "type": "Program",
  "start": 0,
  "end": 14,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 14,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 6,
          "end": 14,
          "id": {
            "type": "Identifier",
            "start": 6,
            "end": 10,
            "name": "\u{20000}\u{20001}"
          },
          "init": {
            "type": "Literal",
            "start": 13,
            "end": 14,
            "value": 1,
            "raw": "1"
          }
        }
      ],
      "kind": "using"
    }
  ]
}, {ecmaVersion: 6});

//-----------------------------------------------------------------------------
// await using declarations
//-----------------------------------------------------------------------------

test("async function f() { await using conn = connect() }", {
  "type": "Program",
  "start": 0,
  "end": 51,
  "body": [
    {
      "type": "FunctionDeclaration",
      "start": 0,
      "end": 51,
      "id": {
        "type": "Identifier",
        "start": 15,
        "end": 16,
        "name": "f"
      },
      "generator": false,
      "async": true,
      "params": [],
      "body": {
        "type": "BlockStatement",
        "start": 19,
        "end": 51,
        "body": [
          {
            "type": "VariableDeclaration",
            "start": 21,
            "end": 49,
            "declarations": [
              {
                "type": "VariableDeclarator",
                "start": 33,
                "end": 49,
                "id": {
                  "type": "Identifier",
                  "start": 33,
                  "end": 37,
                  "name": "conn"
                },
                "init": {
                  "type": "CallExpression",
                  "start": 40,
                  "end": 49,
                  "callee": {
                    "type": "Identifier",
                    "start": 40,
                    "end": 47,
                    "name": "connect"
                  },
                  "arguments": []
                }
              }
            ],
            "kind": "await using"
          }
        ]
      }
    }
  ]
}, {ecmaVersion: 8});

test("await using x = y", {
  "type": "Program",
  "start": 0,
  "end": 17,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 17,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 12,
          "end": 17,
          "id": {
            "type": "Identifier",
            "start": 12,
            "end": 13,
            "name": "x"
          },
          "init": {
            "type": "Identifier",
            "start": 16,
            "end": 17,
            "name": "y"
          }
        }
      ],
      "kind": "await using"
    }
  ]
}, {ecmaVersion: 2022, sourceType: "module"});

//-----------------------------------------------------------------------------
// using declarations in for statement headers
//-----------------------------------------------------------------------------

test("for (using r of resources) {}", {
  "type": "Program",
  "start": 0,
  "end": 29,
  "body": [
    {
      "type": "ForOfStatement",
      "start": 0,
      "end": 29,
      "left": {
        "type": "VariableDeclaration",
        "start": 5,
        "end": 12,
        "declarations": [
          {
            "type": "VariableDeclarator",
            "start": 11,
            "end": 12,
            "id": {
              "type": "Identifier",
              "start": 11,
              "end": 12,
              "name": "r"
            },
            "init": null
          }
        ],
        "kind": "using"
      },
      "right": {
        "type": "Identifier",
        "start": 16,
        "end": 25,
        "name": "resources"
      },
      "body": {
        "type": "BlockStatement",
        "start": 27,
        "end": 29,
        "body": []
      }
    }
  ]
}, {ecmaVersion: 6});

test("for (using r in obj) {}", {
  "type": "Program",
  "start": 0,
  "end": 23,
  "body": [
    {
      "type": "ForInStatement",
      "start": 0,
      "end": 23,
      "left": {
        "type": "VariableDeclaration",
        "start": 5,
        "end": 12,
        "declarations": [
          {
            "type": "VariableDeclarator",
            "start": 11,
            "end": 12,
            "id": {
              "type": "Identifier",
              "start": 11,
              "end": 12,
              "name": "r"
            },
            "init": null
          }
        ],
        "kind": "using"
      },
      "right": {
        "type": "Identifier",
        "start": 16,
        "end": 19,
        "name": "obj"
      },
      "body": {
        "type": "BlockStatement",
        "start": 21,
        "end": 23,
        "body": []
      }
    }
  ]
}, {ecmaVersion: 6});

test("for (using i = 0; i < 3; i++) {}", {
  "type": "Program",
  "start": 0,
  "end": 32,
  "body": [
    {
      "type": "ForStatement",
      "start": 0,
      "end": 32,
      "init": {
        "type": "VariableDeclaration",
        "start": 5,
        "end": 16,
        "declarations": [
          {
            "type": "VariableDeclarator",
            "start": 11,
            "end": 16,
            "id": {
              "type": "Identifier",
              "start": 11,
              "end": 12,
              "name": "i"
            },
            "init": {
              "type": "Literal",
              "start": 15,
              "end": 16,
              "value": 0,
              "raw": "0"
            }
          }
        ],
        "kind": "using"
      },
      "test": {
        "type": "BinaryExpression",
        "start": 18,
        "end": 23,
        "left": {
          "type": "Identifier",
          "start": 18,
          "end": 19,
          "name": "i"
        },
        "operator": "<",
        "right": {
          "type": "Literal",
          "start": 22,
          "end": 23,
          "value": 3,
          "raw": "3"
        }
      },
      "update": {
        "type": "UpdateExpression",
        "start": 25,
        "end": 28,
        "operator": "++",
        "argument": {
          "type": "Identifier",
          "start": 25,
          "end": 26,
          "name": "i"
        },
        "prefix": false
      },
      "body": {
        "type": "BlockStatement",
        "start": 30,
        "end": 32,
        "body": []
      }
    }
  ]
}, {ecmaVersion: 6});

//-----------------------------------------------------------------------------
// `using` keeps working as a plain identifier
//-----------------------------------------------------------------------------

test("using", {
  "type": "Program",
  "start": 0,
  "end": 5,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 5,
      "expression": {
        "type": "Identifier",
        "start": 0,
        "end": 5,
        "name": "using"
      }
    }
  ]
}, {ecmaVersion: 6});

test("using = 1", {
  "type": "Program",
  "start": 0,
  "end": 9,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 9,
      "expression": {
        "type": "AssignmentExpression",
        "start": 0,
        "end": 9,
        "operator": "=",
        "left": {
          "type": "Identifier",
          "start": 0,
          "end": 5,
          "name": "using"
        },
        "right": {
          "type": "Literal",
          "start": 8,
          "end": 9,
          "value": 1,
          "raw": "1"
        }
      }
    }
  ]
}, {ecmaVersion: 6});

test("using.foo()", {
  "type": "Program",
  "start": 0,
  "end": 11,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 11,
      "expression": {
        "type": "CallExpression",
        "start": 0,
        "end": 11,
        "callee": {
          "type": "MemberExpression",
          "start": 0,
          "end": 9,
          "object": {
            "type": "Identifier",
            "start": 0,
            "end": 5,
            "name": "using"
          },
          "property": {
            "type": "Identifier",
            "start": 6,
            "end": 9,
            "name": "foo"
          },
          "computed": false
        },
        "arguments": []
      }
    }
  ]
}, {ecmaVersion: 6});

test("function using() {}", {
  "type": "Program",
  "start": 0,
  "end": 19,
  "body": [
    {
      "type": "FunctionDeclaration",
      "start": 0,
      "end": 19,
      "id": {
        "type": "Identifier",
        "start": 9,
        "end": 14,
        "name": "using"
      },
      "generator": false,
      "params": [],
      "body": {
        "type": "BlockStatement",
        "start": 17,
        "end": 19,
        "body": []
      }
    }
  ]
}, {ecmaVersion: 6});

// A line break between `using` and the name means two statements.
test("using\nx = 1", {
  "type": "Program",
  "start": 0,
  "end": 11,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 5,
      "expression": {
        "type": "Identifier",
        "start": 0,
        "end": 5,
        "name": "using"
      }
    },
    {
      "type": "ExpressionStatement",
      "start": 6,
      "end": 11,
      "expression": {
        "type": "AssignmentExpression",
        "start": 6,
        "end": 11,
        "operator": "=",
        "left": {
          "type": "Identifier",
          "start": 6,
          "end": 7,
          "name": "x"
        },
        "right": {
          "type": "Literal",
          "start": 10,
          "end": 11,
          "value": 1,
          "raw": "1"
        }
      }
    }
  ]
}, {ecmaVersion: 6});

// A line break inside a comment between `using` and the name as well.
test("using /* \n */ x = 1", {
  "type": "Program",
  "start": 0,
  "end": 19,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 5,
      "expression": {
        "type": "Identifier",
        "start": 0,
        "end": 5,
        "name": "using"
      }
    },
    {
      "type": "ExpressionStatement",
      "start": 14,
      "end": 19,
      "expression": {
        "type": "AssignmentExpression",
        "start": 14,
        "end": 19,
        "operator": "=",
        "left": {
          "type": "Identifier",
          "start": 14,
          "end": 15,
          "name": "x"
        },
        "right": {
          "type": "Literal",
          "start": 18,
          "end": 19,
          "value": 1,
          "raw": "1"
        }
      }
    }
  ]
}, {ecmaVersion: 6});

test("using: x = 1", {
  "type": "Program",
  "start": 0,
  "end": 12,
  "body": [
    {
      "type": "LabeledStatement",
      "start": 0,
      "end": 12,
      "label": {
        "type": "Identifier",
        "start": 0,
        "end": 5,
        "name": "using"
      },
      "body": {
        "type": "ExpressionStatement",
        "start": 7,
        "end": 12,
        "expression": {
          "type": "AssignmentExpression",
          "start": 7,
          "end": 12,
          "operator": "=",
          "left": {
            "type": "Identifier",
            "start": 7,
            "end": 8,
            "name": "x"
          },
          "right": {
            "type": "Literal",
            "start": 11,
            "end": 12,
            "value": 1,
            "raw": "1"
          }
        }
      }
    }
  ]
}, {ecmaVersion: 6});

test("using => x", {
  "type": "Program",
  "start": 0,
  "end": 10,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 10,
      "expression": {
        "type": "ArrowFunctionExpression",
        "start": 0,
        "end": 10,
        "id": null,
        "expression": true,
        "generator": false,
        "params": [
          {
            "type": "Identifier",
            "start": 0,
            "end": 5,
            "name": "using"
          }
        ],
        "body": {
          "type": "Identifier",
          "start": 9,
          "end": 10,
          "name": "x"
        }
      }
    }
  ]
}, {ecmaVersion: 6});

test("using instanceof Foo", {
  "type": "Program",
  "start": 0,
  "end": 20,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 20,
      "expression": {
        "type": "BinaryExpression",
        "start": 0,
        "end": 20,
        "left": {
          "type": "Identifier",
          "start": 0,
          "end": 5,
          "name": "using"
        },
        "operator": "instanceof",
        "right": {
          "type": "Identifier",
          "start": 17,
          "end": 20,
          "name": "Foo"
        }
      }
    }
  ]
}, {ecmaVersion: 6});

// `using [x] = y` is not a declaration but a member-expression
// assignment (this is also what the spec's lookahead rules produce).
test("using[0] = 1", {
  "type": "Program",
  "start": 0,
  "end": 12,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 12,
      "expression": {
        "type": "AssignmentExpression",
        "start": 0,
        "end": 12,
        "operator": "=",
        "left": {
          "type": "MemberExpression",
          "start": 0,
          "end": 8,
          "object": {
            "type": "Identifier",
            "start": 0,
            "end": 5,
            "name": "using"
          },
          "property": {
            "type": "Literal",
            "start": 6,
            "end": 7,
            "value": 0,
            "raw": "0"
          },
          "computed": true
        },
        "right": {
          "type": "Literal",
          "start": 11,
          "end": 12,
          "value": 1,
          "raw": "1"
        }
      }
    }
  ]
}, {ecmaVersion: 6});

test("var using = 1", {
  "type": "Program",
  "start": 0,
  "end": 13,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 13,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 4,
          "end": 13,
          "id": {
            "type": "Identifier",
            "start": 4,
            "end": 9,
            "name": "using"
          },
          "init": {
            "type": "Literal",
            "start": 12,
            "end": 13,
            "value": 1,
            "raw": "1"
          }
        }
      ],
      "kind": "var"
    }
  ]
}, {ecmaVersion: 6});

test("class using {}", {
  "type": "Program",
  "start": 0,
  "end": 14,
  "body": [
    {
      "type": "ClassDeclaration",
      "start": 0,
      "end": 14,
      "id": {
        "type": "Identifier",
        "start": 6,
        "end": 11,
        "name": "using"
      },
      "superClass": null,
      "body": {
        "type": "ClassBody",
        "start": 12,
        "end": 14,
        "body": []
      }
    }
  ]
}, {ecmaVersion: 6});

test("x = using", {
  "type": "Program",
  "start": 0,
  "end": 9,
  "body": [
    {
      "type": "ExpressionStatement",
      "start": 0,
      "end": 9,
      "expression": {
        "type": "AssignmentExpression",
        "start": 0,
        "end": 9,
        "operator": "=",
        "left": {
          "type": "Identifier",
          "start": 0,
          "end": 1,
          "name": "x"
        },
        "right": {
          "type": "Identifier",
          "start": 4,
          "end": 9,
          "name": "using"
        }
      }
    }
  ]
}, {ecmaVersion: 6});

// An assignment to `using` is allowed in single-statement positions
// (only declarations are disallowed there).
test("if (x) using = 1", {
  "type": "Program",
  "start": 0,
  "end": 16,
  "body": [
    {
      "type": "IfStatement",
      "start": 0,
      "end": 16,
      "test": {
        "type": "Identifier",
        "start": 4,
        "end": 5,
        "name": "x"
      },
      "consequent": {
        "type": "ExpressionStatement",
        "start": 7,
        "end": 16,
        "expression": {
          "type": "AssignmentExpression",
          "start": 7,
          "end": 16,
          "operator": "=",
          "left": {
            "type": "Identifier",
            "start": 7,
            "end": 12,
            "name": "using"
          },
          "right": {
            "type": "Literal",
            "start": 15,
            "end": 16,
            "value": 1,
            "raw": "1"
          }
        }
      },
      "alternate": null
    }
  ]
}, {ecmaVersion: 6});

//-----------------------------------------------------------------------------
// `using` as the loop variable of for-in / for-of
//-----------------------------------------------------------------------------

test("for (using of xs) {}", {
  "type": "Program",
  "start": 0,
  "end": 20,
  "body": [
    {
      "type": "ForOfStatement",
      "start": 0,
      "end": 20,
      "left": {
        "type": "Identifier",
        "start": 5,
        "end": 10,
        "name": "using"
      },
      "right": {
        "type": "Identifier",
        "start": 14,
        "end": 16,
        "name": "xs"
      },
      "body": {
        "type": "BlockStatement",
        "start": 18,
        "end": 20,
        "body": []
      }
    }
  ]
}, {ecmaVersion: 6});

test("for (using in obj) {}", {
  "type": "Program",
  "start": 0,
  "end": 21,
  "body": [
    {
      "type": "ForInStatement",
      "start": 0,
      "end": 21,
      "left": {
        "type": "Identifier",
        "start": 5,
        "end": 10,
        "name": "using"
      },
      "right": {
        "type": "Identifier",
        "start": 14,
        "end": 17,
        "name": "obj"
      },
      "body": {
        "type": "BlockStatement",
        "start": 19,
        "end": 21,
        "body": []
      }
    }
  ]
}, {ecmaVersion: 6});

// The first `of` ends the loop variable, the second is the iterated value.
test("for (using of of) {}", {
  "type": "Program",
  "start": 0,
  "end": 20,
  "body": [
    {
      "type": "ForOfStatement",
      "start": 0,
      "end": 20,
      "left": {
        "type": "Identifier",
        "start": 5,
        "end": 10,
        "name": "using"
      },
      "right": {
        "type": "Identifier",
        "start": 14,
        "end": 16,
        "name": "of"
      },
      "body": {
        "type": "BlockStatement",
        "start": 18,
        "end": 20,
        "body": []
      }
    }
  ]
}, {ecmaVersion: 6});

test("for (using = 0; using < 3; using++) {}", {
  "type": "Program",
  "start": 0,
  "end": 38,
  "body": [
    {
      "type": "ForStatement",
      "start": 0,
      "end": 38,
      "init": {
        "type": "AssignmentExpression",
        "start": 5,
        "end": 14,
        "operator": "=",
        "left": {
          "type": "Identifier",
          "start": 5,
          "end": 10,
          "name": "using"
        },
        "right": {
          "type": "Literal",
          "start": 13,
          "end": 14,
          "value": 0,
          "raw": "0"
        }
      },
      "test": {
        "type": "BinaryExpression",
        "start": 16,
        "end": 25,
        "left": {
          "type": "Identifier",
          "start": 16,
          "end": 21,
          "name": "using"
        },
        "operator": "<",
        "right": {
          "type": "Literal",
          "start": 24,
          "end": 25,
          "value": 3,
          "raw": "3"
        }
      },
      "update": {
        "type": "UpdateExpression",
        "start": 27,
        "end": 34,
        "operator": "++",
        "argument": {
          "type": "Identifier",
          "start": 27,
          "end": 32,
          "name": "using"
        },
        "prefix": false
      },
      "body": {
        "type": "BlockStatement",
        "start": 36,
        "end": 38,
        "body": []
      }
    }
  ]
}, {ecmaVersion: 6});

//-----------------------------------------------------------------------------
// `await using` disambiguation: `await` keeps its expression meaning
//-----------------------------------------------------------------------------

test("async function f() { await using }", {
  "type": "Program",
  "start": 0,
  "end": 34,
  "body": [
    {
      "type": "FunctionDeclaration",
      "start": 0,
      "end": 34,
      "id": {
        "type": "Identifier",
        "start": 15,
        "end": 16,
        "name": "f"
      },
      "generator": false,
      "async": true,
      "params": [],
      "body": {
        "type": "BlockStatement",
        "start": 19,
        "end": 34,
        "body": [
          {
            "type": "ExpressionStatement",
            "start": 21,
            "end": 32,
            "expression": {
              "type": "AwaitExpression",
              "start": 21,
              "end": 32,
              "argument": {
                "type": "Identifier",
                "start": 27,
                "end": 32,
                "name": "using"
              }
            }
          }
        ]
      }
    }
  ]
}, {ecmaVersion: 8});

test("async function f() { await using.x }", {
  "type": "Program",
  "start": 0,
  "end": 36,
  "body": [
    {
      "type": "FunctionDeclaration",
      "start": 0,
      "end": 36,
      "id": {
        "type": "Identifier",
        "start": 15,
        "end": 16,
        "name": "f"
      },
      "generator": false,
      "async": true,
      "params": [],
      "body": {
        "type": "BlockStatement",
        "start": 19,
        "end": 36,
        "body": [
          {
            "type": "ExpressionStatement",
            "start": 21,
            "end": 34,
            "expression": {
              "type": "AwaitExpression",
              "start": 21,
              "end": 34,
              "argument": {
                "type": "MemberExpression",
                "start": 27,
                "end": 34,
                "object": {
                  "type": "Identifier",
                  "start": 27,
                  "end": 32,
                  "name": "using"
                },
                "property": {
                  "type": "Identifier",
                  "start": 33,
                  "end": 34,
                  "name": "x"
                },
                "computed": false
              }
            }
          }
        ]
      }
    }
  ]
}, {ecmaVersion: 8});

// A line break between `using` and the name: `await using` is an
// await-expression statement, `x = 1` is the next statement.
test("async function f() { await using\nx = 1 }", {
  "type": "Program",
  "start": 0,
  "end": 40,
  "body": [
    {
      "type": "FunctionDeclaration",
      "start": 0,
      "end": 40,
      "id": {
        "type": "Identifier",
        "start": 15,
        "end": 16,
        "name": "f"
      },
      "generator": false,
      "async": true,
      "params": [],
      "body": {
        "type": "BlockStatement",
        "start": 19,
        "end": 40,
        "body": [
          {
            "type": "ExpressionStatement",
            "start": 21,
            "end": 32,
            "expression": {
              "type": "AwaitExpression",
              "start": 21,
              "end": 32,
              "argument": {
                "type": "Identifier",
                "start": 27,
                "end": 32,
                "name": "using"
              }
            }
          },
          {
            "type": "ExpressionStatement",
            "start": 33,
            "end": 38,
            "expression": {
              "type": "AssignmentExpression",
              "start": 33,
              "end": 38,
              "operator": "=",
              "left": {
                "type": "Identifier",
                "start": 33,
                "end": 34,
                "name": "x"
              },
              "right": {
                "type": "Literal",
                "start": 37,
                "end": 38,
                "value": 1,
                "raw": "1"
              }
            }
          }
        ]
      }
    }
  ]
}, {ecmaVersion: 8});

//-----------------------------------------------------------------------------
// Syntax errors
//-----------------------------------------------------------------------------

// Missing initializer.
testFail("using x",
         "Missing initializer in using declaration (1:7)",
         {ecmaVersion: 6});

testFail("using x, y = 1",
         "Missing initializer in using declaration (1:7)",
         {ecmaVersion: 6});

testFail("async function f() { await using x }",
         "Missing initializer in using declaration (1:34)",
         {ecmaVersion: 8});

// Destructuring is not a valid using binding.
testFail("using {x} = y",
         "Unexpected token (1:6)",
         {ecmaVersion: 6});

testFail("using x = 1, [y] = z",
         "Destructuring is not supported in using declarations (1:13)",
         {ecmaVersion: 6});

// Redeclaration, like `let`/`const`.
testFail("using x = 1; using x = 2",
         "Identifier 'x' has already been declared (1:19)",
         {ecmaVersion: 6});

// Declarations are not allowed in single-statement positions.
testFail("if (x) using y = 1",
         "Unexpected token (1:7)",
         {ecmaVersion: 6});

testFail("label: using x = 1",
         "Unexpected token (1:7)",
         {ecmaVersion: 6});

// `await` cannot be the binding name of a using declaration.
testFail("using await = 1",
         "Unexpected token (1:6)",
         {ecmaVersion: 6});

// An escaped `using` is a plain identifier, not the declaration keyword.
testFail("us\\u0069ng x = 1",
         "Unexpected token (1:11)",
         {ecmaVersion: 6});

// An initializer is not allowed in a for-of header.
testFail("for (using x = 1 of y) {}",
         "for-of loop variable declaration may not have an initializer (1:5)",
         {ecmaVersion: 6});

// No line break allowed between `using` and the binding name, not
// even in a for header.
testFail("for (using\nx of y) {}",
         "Unexpected token (2:0)",
         {ecmaVersion: 6});

// No line break allowed between `await` and `using` either.
testFail("async function f() { await\nusing x = 1 }",
         "Unexpected token (2:6)",
         {ecmaVersion: 8});
