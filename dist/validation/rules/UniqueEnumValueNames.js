"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UniqueEnumValueNames = UniqueEnumValueNames;

var _GraphQLError = require("../../error/GraphQLError");

var _definition = require("../../type/definition");

/**
 * Unique enum value names
 *
 * A GraphQL enum type is only valid if all its values are uniquely named.
 */
function UniqueEnumValueNames(context) {
  var schema = context.getSchema();
  var existingTypeMap = schema ? schema.getTypeMap() : Object.create(null);
  var knownValueNames = Object.create(null);
  return {
    EnumTypeDefinition: checkValueUniqueness,
    EnumTypeExtension: checkValueUniqueness
  };

  function checkValueUniqueness(node) {
    var typeName = node.name.value;

    if (!knownValueNames[typeName]) {
      knownValueNames[typeName] = Object.create(null);
    }

    if (node.values) {
      var valueNames = knownValueNames[typeName];

      for (var _i2 = 0, _node$values2 = node.values; _i2 < _node$values2.length; _i2++) {
        var valueDef = _node$values2[_i2];
        var valueName = valueDef.name.value;
        var existingType = existingTypeMap[typeName];

        if ((0, _definition.isEnumType)(existingType) && existingType.getValue(valueName)) {
          context.reportError(new _GraphQLError.GraphQLError("Enum value \"".concat(typeName, ".").concat(valueName, "\" already exists in the schema. It cannot also be defined in this type extension."), valueDef.name));
        } else if (valueNames[valueName]) {
          context.reportError(new _GraphQLError.GraphQLError("Enum value \"".concat(typeName, ".").concat(valueName, "\" can only be defined once."), [valueNames[valueName], valueDef.name]));
        } else {
          valueNames[valueName] = valueDef.name;
        }
      }
    }

    return false;
  }
}
