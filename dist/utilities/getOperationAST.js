"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getOperationAST = getOperationAST;

var _kinds = require("../language/kinds");

/**
 * Returns an operation AST given a document AST and optionally an operation
 * name. If a name is not provided, an operation is only returned if only one is
 * provided in the document.
 */
function getOperationAST(documentAST, operationName) {
  var operation = null;

  for (var _i2 = 0, _documentAST$definiti2 = documentAST.definitions; _i2 < _documentAST$definiti2.length; _i2++) {
    var definition = _documentAST$definiti2[_i2];

    if (definition.kind === _kinds.Kind.OPERATION_DEFINITION) {
      if (operationName == null) {
        // If no operation name was provided, only return an Operation if there
        // is one defined in the document. Upon encountering the second, return
        // null.
        if (operation) {
          return null;
        }

        operation = definition;
      } else if (definition.name && definition.name.value === operationName) {
        return definition;
      }
    }
  }

  return operation;
}
