import objectValues from '../polyfills/objectValues';
import inspect from '../jsutils/inspect';
import invariant from '../jsutils/invariant';
import { print } from '../language/printer';
import { printBlockString } from '../language/blockString';
import { isIntrospectionType } from '../type/introspection';
import { GraphQLString, isSpecifiedScalarType } from '../type/scalars';
import { GraphQLDirective, DEFAULT_DEPRECATION_REASON, isSpecifiedDirective } from '../type/directives';
import { isScalarType, isObjectType, isInterfaceType, isUnionType, isEnumType, isInputObjectType } from '../type/definition';
import { astFromValue } from '../utilities/astFromValue';

/**
 * Accepts options as a second argument:
 *
 *    - commentDescriptions:
 *        Provide true to use preceding comments as the description.
 *
 */
export function printSchema(schema, options) {
  return printFilteredSchema(schema, function (n) {
    return !isSpecifiedDirective(n);
  }, isDefinedType, options);
}
export function printIntrospectionSchema(schema, options) {
  return printFilteredSchema(schema, isSpecifiedDirective, isIntrospectionType, options);
}

function isDefinedType(type) {
  return !isSpecifiedScalarType(type) && !isIntrospectionType(type);
}

function printFilteredSchema(schema, directiveFilter, typeFilter, options) {
  var directives = schema.getDirectives().filter(directiveFilter);
  var typeMap = schema.getTypeMap();
  var types = objectValues(typeMap).sort(function (type1, type2) {
    return type1.name.localeCompare(type2.name);
  }).filter(typeFilter);
  return [printSchemaDefinition(schema)].concat(directives.map(function (directive) {
    return printDirective(directive, options);
  }), types.map(function (type) {
    return printType(type, options);
  })).filter(Boolean).join('\n\n') + '\n';
}

function printSchemaDefinition(schema) {
  if (isSchemaOfCommonNames(schema)) {
    return;
  }

  var operationTypes = [];
  var queryType = schema.getQueryType();

  if (queryType) {
    operationTypes.push("  query: ".concat(queryType.name));
  }

  var mutationType = schema.getMutationType();

  if (mutationType) {
    operationTypes.push("  mutation: ".concat(mutationType.name));
  }

  var subscriptionType = schema.getSubscriptionType();

  if (subscriptionType) {
    operationTypes.push("  subscription: ".concat(subscriptionType.name));
  }

  return "schema {\n".concat(operationTypes.join('\n'), "\n}");
}
/**
 * GraphQL schema define root types for each type of operation. These types are
 * the same as any other type and can be named in any manner, however there is
 * a common naming convention:
 *
 *   schema {
 *     query: Query
 *     mutation: Mutation
 *   }
 *
 * When using this naming convention, the schema description can be omitted.
 */


function isSchemaOfCommonNames(schema) {
  var queryType = schema.getQueryType();

  if (queryType && queryType.name !== 'Query') {
    return false;
  }

  var mutationType = schema.getMutationType();

  if (mutationType && mutationType.name !== 'Mutation') {
    return false;
  }

  var subscriptionType = schema.getSubscriptionType();

  if (subscriptionType && subscriptionType.name !== 'Subscription') {
    return false;
  }

  return true;
}

export function printType(type, options) {
  if (isScalarType(type)) {
    return printScalar(type, options);
  } else if (isObjectType(type)) {
    return printObject(type, options);
  } else if (isInterfaceType(type)) {
    return printInterface(type, options);
  } else if (isUnionType(type)) {
    return printUnion(type, options);
  } else if (isEnumType(type)) {
    return printEnum(type, options);
  } else if (isInputObjectType(type)) {
    return printInputObject(type, options);
  } // Not reachable. All possible types have been considered.


  /* istanbul ignore next */
  invariant(false, 'Unexpected type: ' + inspect(type));
}

function printScalar(type, options) {
  return printDescription(options, type) + "scalar ".concat(type.name);
}

function printImplementedInterfaces(type) {
  var interfaces = type.getInterfaces();
  return interfaces.length ? ' implements ' + interfaces.map(function (i) {
    return i.name;
  }).join(' & ') : '';
}

function printObject(type, options) {
  return printDescription(options, type) + "type ".concat(type.name) + printImplementedInterfaces(type) + printFields(options, type);
}

function printInterface(type, options) {
  return printDescription(options, type) + "interface ".concat(type.name) + printImplementedInterfaces(type) + printFields(options, type);
}

function printUnion(type, options) {
  var types = type.getTypes();
  var possibleTypes = types.length ? ' = ' + types.join(' | ') : '';
  return printDescription(options, type) + 'union ' + type.name + possibleTypes;
}

function printEnum(type, options) {
  var values = type.getValues().map(function (value, i) {
    return printDescription(options, value, '  ', !i) + '  ' + value.name + printDeprecated(value);
  });
  return printDescription(options, type) + "enum ".concat(type.name) + printBlock(values);
}

function printInputObject(type, options) {
  var fields = objectValues(type.getFields()).map(function (f, i) {
    return printDescription(options, f, '  ', !i) + '  ' + printInputValue(f);
  });
  return printDescription(options, type) + "input ".concat(type.name) + printBlock(fields);
}

function printFields(options, type) {
  var fields = objectValues(type.getFields()).map(function (f, i) {
    return printDescription(options, f, '  ', !i) + '  ' + f.name + printArgs(options, f.args, '  ') + ': ' + String(f.type) + printDeprecated(f);
  });
  return printBlock(fields);
}

function printBlock(items) {
  return items.length !== 0 ? ' {\n' + items.join('\n') + '\n}' : '';
}

function printArgs(options, args) {
  var indentation = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

  if (args.length === 0) {
    return '';
  } // If every arg does not have a description, print them on one line.


  if (args.every(function (arg) {
    return !arg.description;
  })) {
    return '(' + args.map(printInputValue).join(', ') + ')';
  }

  return '(\n' + args.map(function (arg, i) {
    return printDescription(options, arg, '  ' + indentation, !i) + '  ' + indentation + printInputValue(arg);
  }).join('\n') + '\n' + indentation + ')';
}

function printInputValue(arg) {
  var defaultAST = astFromValue(arg.defaultValue, arg.type);
  var argDecl = arg.name + ': ' + String(arg.type);

  if (defaultAST) {
    argDecl += " = ".concat(print(defaultAST));
  }

  return argDecl;
}

function printDirective(directive, options) {
  return printDescription(options, directive) + 'directive @' + directive.name + printArgs(options, directive.args) + (directive.isRepeatable ? ' repeatable' : '') + ' on ' + directive.locations.join(' | ');
}

function printDeprecated(fieldOrEnumVal) {
  if (!fieldOrEnumVal.isDeprecated) {
    return '';
  }

  var reason = fieldOrEnumVal.deprecationReason;
  var reasonAST = astFromValue(reason, GraphQLString);

  if (reasonAST && reason !== DEFAULT_DEPRECATION_REASON) {
    return ' @deprecated(reason: ' + print(reasonAST) + ')';
  }

  return ' @deprecated';
}

function printDescription(options, def) {
  var indentation = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  var firstInBlock = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
  var description = def.description;

  if (description == null) {
    return '';
  }

  if (options && options.commentDescriptions) {
    return printDescriptionWithComments(description, indentation, firstInBlock);
  }

  var preferMultipleLines = description.length > 70;
  var blockString = printBlockString(description, '', preferMultipleLines);
  var prefix = indentation && !firstInBlock ? '\n' + indentation : indentation;
  return prefix + blockString.replace(/\n/g, '\n' + indentation) + '\n';
}

function printDescriptionWithComments(description, indentation, firstInBlock) {
  var prefix = indentation && !firstInBlock ? '\n' : '';
  var comment = description.split('\n').map(function (line) {
    return indentation + (line !== '' ? '# ' + line : '#');
  }).join('\n');
  return prefix + comment + '\n';
}
