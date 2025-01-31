import objectValues from '../../polyfills/objectValues';
import keyMap from '../../jsutils/keyMap';
import inspect from '../../jsutils/inspect';
import isInvalid from '../../jsutils/isInvalid';
import didYouMean from '../../jsutils/didYouMean';
import suggestionList from '../../jsutils/suggestionList';
import { GraphQLError } from '../../error/GraphQLError';
import { Kind } from '../../language/kinds';
import { print } from '../../language/printer';
import { isScalarType, isEnumType, isInputObjectType, isListType, isNonNullType, isRequiredInputField, getNullableType, getNamedType } from '../../type/definition';

/**
 * Value literals of correct type
 *
 * A GraphQL document is only valid if all value literals are of the type
 * expected at their position.
 */
export function ValuesOfCorrectType(context) {
  return {
    ListValue: function ListValue(node) {
      // Note: TypeInfo will traverse into a list's item type, so look to the
      // parent input type to check if it is a list.
      var type = getNullableType(context.getParentInputType());

      if (!isListType(type)) {
        isValidValueNode(context, node);
        return false; // Don't traverse further.
      }
    },
    ObjectValue: function ObjectValue(node) {
      var type = getNamedType(context.getInputType());

      if (!isInputObjectType(type)) {
        isValidValueNode(context, node);
        return false; // Don't traverse further.
      } // Ensure every required field exists.


      var fieldNodeMap = keyMap(node.fields, function (field) {
        return field.name.value;
      });

      for (var _i2 = 0, _objectValues2 = objectValues(type.getFields()); _i2 < _objectValues2.length; _i2++) {
        var fieldDef = _objectValues2[_i2];
        var fieldNode = fieldNodeMap[fieldDef.name];

        if (!fieldNode && isRequiredInputField(fieldDef)) {
          var typeStr = inspect(fieldDef.type);
          context.reportError(new GraphQLError("Field \"".concat(type.name, ".").concat(fieldDef.name, "\" of required type \"").concat(typeStr, "\" was not provided."), node));
        }
      }
    },
    ObjectField: function ObjectField(node) {
      var parentType = getNamedType(context.getParentInputType());
      var fieldType = context.getInputType();

      if (!fieldType && isInputObjectType(parentType)) {
        var suggestions = suggestionList(node.name.value, Object.keys(parentType.getFields()));
        context.reportError(new GraphQLError("Field \"".concat(node.name.value, "\" is not defined by type \"").concat(parentType.name, "\".") + didYouMean(suggestions), node));
      }
    },
    NullValue: function NullValue(node) {
      var type = context.getInputType();

      if (isNonNullType(type)) {
        context.reportError(new GraphQLError("Expected value of type \"".concat(inspect(type), "\", found ").concat(print(node), "."), node));
      }
    },
    EnumValue: function EnumValue(node) {
      return isValidValueNode(context, node);
    },
    IntValue: function IntValue(node) {
      return isValidValueNode(context, node);
    },
    FloatValue: function FloatValue(node) {
      return isValidValueNode(context, node);
    },
    StringValue: function StringValue(node) {
      return isValidValueNode(context, node);
    },
    BooleanValue: function BooleanValue(node) {
      return isValidValueNode(context, node);
    }
  };
}
/**
 * Any value literal may be a valid representation of a Scalar, depending on
 * that scalar type.
 */

function isValidValueNode(context, node) {
  // Report any error at the full type expected by the location.
  var locationType = context.getInputType();

  if (!locationType) {
    return;
  }

  var type = getNamedType(locationType);

  if (isEnumType(type)) {
    if (node.kind !== Kind.ENUM || !type.getValue(node.value)) {
      var allNames = type.getValues().map(function (value) {
        return value.name;
      });
      var suggestedValues = suggestionList(print(node), allNames);
      context.reportError(new GraphQLError("Expected value of type \"".concat(type.name, "\", found ").concat(print(node), ".") + didYouMean('the enum value', suggestedValues), node));
    }

    return;
  }

  if (!isScalarType(type)) {
    var typeStr = inspect(locationType);
    context.reportError(new GraphQLError("Expected value of type \"".concat(typeStr, "\", found ").concat(print(node), "."), node));
    return;
  } // Scalars determine if a literal value is valid via parseLiteral() which
  // may throw or return an invalid value to indicate failure.


  try {
    var parseResult = type.parseLiteral(node, undefined
    /* variables */
    );

    if (isInvalid(parseResult)) {
      var _typeStr = inspect(locationType);

      context.reportError(new GraphQLError("Expected value of type \"".concat(_typeStr, "\", found ").concat(print(node), "."), node));
    }
  } catch (error) {
    var _typeStr2 = inspect(locationType);

    if (error instanceof GraphQLError) {
      context.reportError(error);
    } else {
      context.reportError(new GraphQLError("Expected value of type \"".concat(_typeStr2, "\", found ").concat(print(node), "; ") + error.message, node, undefined, undefined, undefined, error));
    }
  }
}
