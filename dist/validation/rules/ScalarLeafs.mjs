import inspect from '../../jsutils/inspect';
import { GraphQLError } from '../../error/GraphQLError';
import { getNamedType, isLeafType } from '../../type/definition';
export function noSubselectionAllowedMessage(fieldName, type) {
  return "Field \"".concat(fieldName, "\" must not have a selection since type \"").concat(type, "\" has no subfields.");
}
export function requiredSubselectionMessage(fieldName, type) {
  return "Field \"".concat(fieldName, "\" of type \"").concat(type, "\" must have a selection of subfields. Did you mean \"").concat(fieldName, " { ... }\"?");
}
/**
 * Scalar leafs
 *
 * A GraphQL document is valid only if all leaf fields (fields without
 * sub selections) are of scalar or enum types.
 */

export function ScalarLeafs(context) {
  return {
    Field: function Field(node) {
      var type = context.getType();
      var selectionSet = node.selectionSet;

      if (type) {
        if (isLeafType(getNamedType(type))) {
          if (selectionSet) {
            var fieldName = node.name.value;
            var typeStr = inspect(type);
            context.reportError(new GraphQLError("Field \"".concat(fieldName, "\" must not have a selection since type \"").concat(typeStr, "\" has no subfields."), selectionSet));
          }
        } else if (!selectionSet) {
          var _fieldName = node.name.value;

          var _typeStr = inspect(type);

          context.reportError(new GraphQLError("Field \"".concat(_fieldName, "\" of type \"").concat(_typeStr, "\" must have a selection of subfields. Did you mean \"").concat(_fieldName, " { ... }\"?"), node));
        }
      }
    }
  };
}
