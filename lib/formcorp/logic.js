/**
 * FormCorp Logic evaluation
 * @author Alex Berriman <aberriman@formcorp.com.au>
 */

(function () {
  'use strict';

  if (typeof formcorp === 'object' && typeof formcorp.logic !== 'undefined') {
    return;
  }

  // Comparison functions
  var comparisons = {
    /**
     * Returns whether two values are equal.
     *
     * @param field
     * @param comparisonValue
     * @returns {boolean}
     */
    equal: function (field, comparisonValue) {
      if (field === undefined) {
        return false;
      }

      return field === comparisonValue;
    },

    /**
     * Returns whether two values are not equal equal.
     * @param field
     * @param comparisonValue
     * @returns {boolean}
     */
    notEqual: function (field, comparisonValue) {
      return field !== comparisonValue;
    },

    /**
     * Checks whether a string exists within an array
     * @param field
     * @param comparisonValue
     * @param dataId
     * @returns {boolean}
     */
    in: function (field, comparisonValue, dataId) {
      if (field === undefined) {
        return false;
      }

      var x,
        value,
        json,
        el;

      // If the field is hidden, should ALWAYS return false (otherwise returns false positives)
      if (typeof dataId === 'string' && dataId.length > 0) {
        //dataId = getDataId(dataId);
        //if (!fieldIsVisible(dataId)) {
        //  return false;
        //}
      }

      // Attempt to typecast string to json
      try {
        json = JSON.parse(field);
        field = json;
      } catch (ignore) {
      }

      // Field can be string
      if (typeof field === 'string') {
        if (typeof comparisonValue === 'object') {
          for (x = 0; x < comparisonValue.length; x += 1) {
            value = comparisonValue[x];
            if (field === value) {
              return true;
            }
          }
        }
      } else if (field && comparisonValue && typeof field === "object" && typeof comparisonValue === "object") {
        // Check an array of values against an array of values
        for (x = 0; x < comparisonValue.length; x += 1) {
          try {
            if (field && field.indexOf(comparisonValue[x]) === -1) {
              return false;
            }
          } catch (ignore) {
          }
        }

        return true;
      }

      return false;
    },

    /**
     * Make sure a value does not exist within a set
     * @param field
     * @param comparisonValue
     * @param dataId
     * @returns {boolean}
     */
    notIn: function (field, comparisonValue, dataId) {
      return !comparisons.in(field, comparisonValue, dataId);
    },

    /**
     * Checks to see if a value against a field has been set
     * @param field
     * @returns {boolean}
     */
    notNull: function (field) {
      if (field === undefined) {
        return false;
      }

      if (typeof field === 'string') {
        return field.length > 0;
      }
    },

    /**
     * Checks to see if a value against a field has been set
     * @param field
     * @returns {boolean}
     */
    isNull: function (field) {
      if (field === undefined) {
        return true;
      }

      if (typeof field === 'string') {
        return field.length === 0;
      }

      return false;
    },

    /**
     * Checks to see if a value is not empty.
     * @param field
     * @returns {boolean}
     */
    isNotEmpty: function (field) {
      if (field === undefined) {
        return false;
      }

      if (typeof field === 'string') {
        return field.length > 0;
      } else if (typeof field === 'object') {
        if (_.isArray(field)) {
          return field.length > 0;
        } else {
          return Object.keys(field).length > 0;
        }
      }
    },

    /**
     * Checks to see if a value is empty.
     * @param field
     * @returns {boolean}
     */
    isEmpty: function (field) {
      if (field === undefined) {
        return false;
      }

      if (typeof field === 'string') {
        return field.length === 0;
      } else if (typeof field === 'object') {
        if (_.isArray(field)) {
          return field.length === 0;
        } else {
          return Object.keys(field).length === 0;
        }
      }
    },

    /**
     * Check if a value does not contain another value.
     * @param field
     * @param comparisonValue
     * @returns boolean
     */
    contains: function (field, comparisonValue) {
      if (field === undefined) {
        return false;
      }

      return field.indexOf(comparisonValue) > -1;
    },

    /**
     * Check if a value contains another value.
     * @param field
     * @param comparisonValue
     * @returns boolean
     */
    notContains: function (field, comparisonValue) {
      if (field === undefined) {
        return false;
      }

      return field.indexOf(comparisonValue) === -1;
    },

    /**
     * Returns whether one value is greater than another.
     * @param field
     * @param comparisonValue
     * @returns {boolean}
     */
    greater: function (field, comparisonValue) {
      return $.isNumeric(field) && $.isNumeric(comparisonValue) && field > comparisonValue;
    },

    /**
     * Returns whether one value is greater or equal to another.
     * @param field
     * @param comparisonValue
     * @returns {boolean}
     */
    greaterOrEqual: function (field, comparisonValue) {
      return $.isNumeric(field) && $.isNumeric(comparisonValue) && field >= comparisonValue;
    },

    /**
     * Returns whether one value is less than another.
     * @param field
     * @param comparisonValue
     * @returns {boolean}
     */
    less: function (field, comparisonValue) {
      return $.isNumeric(field) && $.isNumeric(comparisonValue) && field < comparisonValue;
    },

    /**
     * Returns whether one value is less than or equal to another.
     * @param field
     * @param comparisonValue
     * @returns {boolean}
     */
    lessOrEqual: function (field, comparisonValue) {
      return $.isNumeric(field) && $.isNumeric(comparisonValue) && field <= comparisonValue;
    },
  };

  /**
   * Checks whether an input is a number
   * @param {mixed} input
   * @return {boolean}
   */
  var isNumber = function (input) {
    return typeof input !== 'undefined' && !_.isNaN(input) && _.isFinite(input);
  };

  // Custom validators for specific field types
  var validators;

  /**
   * Initialise the logic piece
   * @param {object} fc
   */
  var init = function (fc) {
    // Initialise the custom validators once everything loaded
    validators = {
      emailVerification: [formcorp.customValidators.validVerificationResult],
      smsVerification: [formcorp.customValidators.validVerificationResult],
      creditCard: [formcorp.customValidators.isValidCreditCard]
    };

    /**
     * {object} Object of form schema components.
     */
    var components = {};

    /**
     * Field errors
     */
    var errors = {};

    /**
     * Ordered schema
     */
    var schema;

    /**
     * @const {object} Field error descriptors
     */
    var ERROR = {
      NOT_SET: 'The field has not been set.',
      EMPTY: 'The field value cannot be empty.'
    };

    /**
     * Initialise the logic 'class' for the specified form schema
     */
    var init = function () {
      if (_.isObject(fc.schema.stage)) {
        getComponents(fc.schema.stage);

        // Need to store an ordered version of the schema
        schema = formcorp.helpers.orderObject(fc.schema);
      }
    };

    /**
     * Clear errors for a given field.
     * @param {string} fieldId
     */
    var clearErrors = function (fieldId) {
      errors[fieldId] = [];
    };

    /**
     * Fetch the components of an ID string (grouplet, id, iteration)
     * @param {string} dataId
     * @return {object}
     */
    var getIdComponents = function(dataId) {
      var idComponents = {};
      if (!_.isString(dataId)) {
        return idComponents;
      }

      if (dataId.indexOf(fc.constants.prefixSeparator) < 0) {
        // If a simple ID, return
        idComponents.id = dataId;

        return idComponents;
      }

      var parts = dataId.split(fc.constants.prefixSeparator);
      if (formcorp.logic._CONST.GROUPLET_FIELD_LOGIC_REGEX.test(dataId)) {
        // Non-repeatable grouplet
        idComponents.grouplet = parts[0];
        idComponents.id = parts[1];

        return idComponents;
      }

      if (formcorp.logic._CONST.GROUPLET_FIELD_REGEX.test(dataId)) {
        idComponents.grouplet = parts[0];
        idComponents.iteration = parts[1];
        idComponents.id = parts[2];

        return idComponents;
      }

      return idComponents;
    };

    /**
     * Add an error for a given field.
     * @param {string} fieldId
     * @param {integer=} iteration
     */
    var addError = function (fieldId, error, belongsTo, iteration) {
      if (!_.isArray(errors[fieldId])) {
        errors[fieldId] = [];
      }

      var errorObj = {
        msg: error,
      };

      if (_.isString(belongsTo) && belongsTo.length > 0) {
        // If field belongs to another, add
        errorObj._belongsTo = belongsTo;
      }

      if (_.isInteger(iteration)) {
        errorObj._iteration = iteration;
      }

      errors[fieldId].push(errorObj);
    };

    /**
     * Retrieve field errors.
     * @param {string} fieldId
     * @param {string|undefined} belongsTo
     * @return {array}
     */
    var getErrors = function (fieldId, belongsTo, iteration) {
      var fieldId = getIdComponents(fieldId);
      if (!_.isUndefined(fieldId.grouplet)) {
        belongsTo = fieldId.grouplet;
      }

      if (!_.isUndefined(fieldId.iteration)) {
        iteration = fieldId.iteration;
      }

      var localErrors = !_.isUndefined(errors[fieldId.id]) && _.isArray(errors[fieldId.id]) ? errors[fieldId.id] : [];
      return _.filter(localErrors, function (obj) {
        if (_.isString(belongsTo) && belongsTo.length > 0) {
          // If belongs to parameter was passed through, make sure there is a match
          return _.isString(obj._belongsTo) && obj._belongsTo === belongsTo;
        }

        // If no belongs to parameter was passed through, only return errors with no _belongsTo parameter set
        return _.isUndefined(obj._belongsTo);
      });
    };

    /**
     * Checks whether or not a field has a set of errors.
     * @param {string} fieldId
     * @param {string|undefined} belongsTo
     * @return {boolean}
     */
    var hasErrors = function (fieldId, belongsTo) {
      return getErrors(fieldId, belongsTo).length > 0;
    }

    /**
     * Determins whether an object is a stage.
     * @param {obj}
     * @return {boolean}
     */
    var isStage = function (obj) {
      return _.isObject(obj) && !_.isUndefined(obj.page) && _.isArray(obj.page);
    };

    /**
     * Determins whether an object is a page.
     * @param {obj}
     * @return {boolean}
     */
    var isPage = function (obj) {
      return _.isObject(obj) && !_.isUndefined(obj.section) && _.isArray(obj.section);
    };

    /**
     * Determins whether an object is a section.
     * @param {obj}
     * @return {boolean}
     */
    var isSection = function (obj) {
      return _.isObject(obj) && !_.isUndefined(obj.field) && _.isArray(obj.field);
    };

    /**
     * Determines whether an object is a field.
     * @param {obj}
     * @return {boolean}
     */
    var isField = function (obj) {
      return _.isObject(obj) && !_.isUndefined(obj.type) && !_.isUndefined(obj.config) && _.isString(obj.type) && _.isObject(obj.config);
    };

    /**
     * Checks whether an ID is in reference to grouplet logic. In the form:
     * groupletId_fieldId
     * @param {string} fieldId
     * @return {boolean}
     */
    var isGroupletLogicFieldId = function (fieldId) {
      return _.isString(fieldId) && formcorp.logic._CONST.GROUPLET_FIELD_LOGIC_REGEX.test(fieldId);
    };

    /**
     * When given a field ID in the format groupletId_fieldId, insert an iteration
     * in the middle to become groupletId_iterationN_fieldId
     * @param {string} fieldId
     * @param {number} iteration
     * @return {string}
     */
    var insertIteratorToGroupletId = function (fieldId, iteration) {
      var components = fieldId.split(fc.constants.prefixSeparator);

      if (!_.isArray(components) || components.length < 2) {
        return fieldId;
      }

      var groupletId = components[0];
      var fieldId = components[1];

      return [groupletId, iteration, fieldId].join(fc.constants.prefixSeparator);
    };

    /**
     * Retrieves an element ID
     * @param {obj} object
     * @return {string}
     */
    var getId = function (obj) {
      if (_.isString(obj)) {
        var groupletSearchPattern = new RegExp('([0-9a-f]+)' + fc.constants.prefixSeparator + '([0-9a-f]+)');
        var match = obj.match(groupletSearchPattern);

        if (_.isArray(match) && match.length > 0) {
          // Return the grouplet field ID (fieldId_groupletFieldId)
          return match[2];
        }

        return obj;
      }

      if (_.isObject(obj)) {
        if (!_.isUndefined(obj._id) && !_.isUndefined(obj._id.$id)) {
          return obj._id.$id;
        }

        if (!_.isUndefined(obj.$id)) {
          return obj.$id;
        }
      }
    };

    /**
     * Add a component object.
     * @param {string} id
     * @param {object} obj
     */
    var addComponent = function (id, obj) {
      if (!_.isArray(components[id])) {
        components[id] = [];
      }

      if (!_.includes(components[id], obj)) {
        // Only add the component if it's not already within the array
        components[id].push(obj);
      }
    };

    /**
     * Recursively iterates over a form schema object and pulls out all components
     * (stages, pages, sections, fields).
     * @param {obj}
     * @param {string|null|undefined}
     */
    var getComponents = function (obj, belongsTo, isGrouplet) {
      if (_.isUndefined(belongsTo) || !_.isString(belongsTo) || belongsTo.length === 0) {
        // Defaults belongsTo to null - element doesn't belong to anything
        belongsTo = null;
      }

      if (!_.isBoolean(isGrouplet)) {
        isGrouplet = false;
      }

      if (_.isObject(obj)) {
        if (_.isArray(obj)) {
          // If an array, iterate through each element, and if an object is found, keep recursing
          for (var iterator = 0; iterator < obj.length; iterator += 1) {
            if (_.isObject(obj[iterator])) {
              getComponents(obj[iterator], belongsTo, isGrouplet);
            }
          }
        } else {
          // An object is detected, run checks on it
          var save = null;
          if (isStage(obj)) {
            save = _.extend({'_type': 'stage'}, obj);
          } else if (isPage(obj)) {
            save = _.extend({'_type': 'page'}, obj);
          } else if (isSection(obj)) {
            save = _.extend({'_type': 'section'}, obj);
          } else if (isField(obj)) {
            save = _.extend({'_type': 'field'}, obj);

            // If a grouplet, need to fetch all of the grouplet fields
            if (obj.type === 'grouplet' && _.isObject(obj.config) && _.isObject(obj.config.grouplet)) {
              var grouplet = obj.config.grouplet;
              if (_.isArray(grouplet.field) && grouplet.field.length > 0) {
                isGrouplet = true;
                getComponents(grouplet.field, getId(obj), isGrouplet);
              }
            }
          }

          // Save the object to the components list
          var id = null;
          if (!_.isNull(save)) {
            if (!_.isNull(belongsTo)) {
              // If the element belongs to another (i.e. field belongs to a section), store it
              save._belongsTo = belongsTo;
            }

            // Default the ID to the ID of the object
            id = getId(obj);

            if (isGrouplet === true && save.type !== 'grouplet') {
              save._inGrouplet = true;
            }

            if (_.isString(id) && id.length > 0) {
              // Save the top level object
              addComponent(id, save);
            }
          }

          // Iterate through each item and recursively retrieve components
          if (!isGrouplet) {
            _.each(obj, function (item) {
              if (_.isObject(item)) {
                getComponents(item, _.isString(id) ? id : belongsTo, isGrouplet);
              }
            });
          }
        }
      }
    };

    /**
     * Retrieve a schema component by ID
     * @param {string} id
     * @param {string} belongsTo
     * @param {integer=} iteration
     * @returns {boolean|object}
     */
    var getComponent = function (id, belongsTo, iteration) {
      if (!_.isString(id)) {
        // If ID is not a string, return false
        return false;
      }

      if (!formcorp.logic.isNumber(iteration)) {
        iteration = false;
      }

      if (id.indexOf(formcorp.logic._CONST.GROUPLET_FIELD_SEPARATOR) >= 0) {
        // If the component is given as a complete grouplet ID (groupletId_n_fieldId)
        // then retrieve the grouplet and field ID out.
        // The field belongs to the grouplet
        var match = id.match(formcorp.logic._CONST.GROUPLET_FIELD_REGEX);
        if (_.isArray(match)) {
          belongsTo = match[1];

          if (match.length === 4) {
            // Repeatable grouplet
            iteration = match[2];
            id = match[3];
          } else if (match.length === 3) {
            // Non-repeatable grouplet
            id = match[2];
          }
        }
      }

      var finalId = getId(id); // Ensure ID in correct format
      if (!_.isArray(components[finalId]) || components[finalId].length === 0) {
        return false;
      }

      var found = {};
      if (!_.isString(belongsTo) || belongsTo.length === 0) {
        // If no belongs to parameter specified, return the first element
        found = _.first(components[finalId]);
      } else {
        // Look for the component that matches the belong to request
        found = _.find(components[finalId], function (component) {
          return component._belongsTo === getId(belongsTo);
        });
      }

      if (iteration !== false && _.isObject(found)) {
        // Add the iteration through
        found._iteration = parseInt(iteration);
      }

      return _.isUndefined(found) ? false : found;
    };

    /**
     * Recursively checks a boolean logic operator to check if a component should be visible
     * @param {obj} object
     * @param {string} condition
     * @param {=number} iteration
     * @returns boolean
     */
    var checkLogic = function (obj, condition, iteration) {
      if (!_.isObject(obj) && !_.isString(obj)) {
        return true;
      }

      obj = formcorp.helpers.getJson(obj);
      if (!_.isObject(obj)) {
        fc.log('Unable to convert to json');
        return true;
      }

      // Default condition to end if not set
      if (typeof condition !== 'string' || ['AND', 'OR'].indexOf(condition) == -1) {
        condition = 'AND';
      }

      // Default the condition to AND unless specified as OR
      if (typeof obj.condition === 'string') {
        condition = obj.condition;
        if (obj.condition !== 'OR') {
          condition = 'AND';
        }
      }

      var rule, valid = true;

      // Rule specific vars
      var operator, value, fieldId, field;

      if (typeof obj.rules === 'object' && _.isArray(obj.rules) && obj.rules.length > 0) {
        for (var iterator = 0; iterator < obj.rules.length; iterator += 1) {
          rule = obj.rules[iterator];

          if (typeof rule.rules === 'object') {
            // Nested ruleset, need to look recursively
            valid = checkLogic(rule, null, iteration);
          } else {
            operator = rule.operator;
            value = rule.value;
            fieldId = rule.field;

            // Grouplets can contain logic with conditionals set to other grouplet values
            // In this case, as the iterator is going to be dynamic, the logic returned by
            // the server is simply in the form: groupletId_fieldId: value
            // Because of this, the iterator needs to be manually inserted into the fieldId
            // for comparison checks (i.e. to retrieve the value)
            if (typeof iteration !== 'undefined' && !_.isNaN(iteration) && _.isFinite(iteration) && isGroupletLogicFieldId(fieldId)) {
              fieldId = insertIteratorToGroupletId(fieldId, iteration);
            }
            field = fc.getValue(fieldId);

            switch (operator) {
              case 'in':
                valid = comparisons.in(field, value, fieldId);
                break;
              case 'not_in':
                valid = comparisons.notIn(field, value, fieldId);
                break;
              case 'equal':
                valid = comparisons.equal(field, value);
                break;
              case 'not_equal':
                valid = comparisons.notEqual(field, value);
                break;
              case 'less':
                valid = comparisons.less(field, value);
                break;
              case 'less_or_equal':
                valid = comparisons.lessOrEqual(field, value);
                break;
              case 'greater':
                valid = comparisons.greater(field, value);
                break;
              case 'greater_or_equal':
                valid = comparisons.greaterOrEqual(field, value);
                break;
              case 'contains':
                valid = comparisons.contains(field, value);
                break;
              case 'not_contains':
                valid = comparisons.notContains(field, value);
                break;
              case 'is_null':
                valid = comparisons.isNull(field);
                break;
              case 'is_not_null':
                valid = comparisons.notNull(field);
                break;
              case 'is_empty':
                valid = comparisons.isEmpty(field);
                break;
              case 'is_not_empty':
                valid = comparisons.isNotEmpty(field);
                break;
              default:
                fc.log('Unknown operator: ' + operator);
            }
          }

          // If the rule check is valid and the check is a boolean OR operator, return true
          if (valid === true && condition === 'OR') {
            return true;
          }

          // If the rule check is false with a boolean AND operator, return false
          if (valid === false && condition === 'AND') {
            return false;
          }
        }

        // If iterated through all rules (with an OR) condition, and not one was true, return false
        if (condition === 'OR') {
          return false;
        }
      }

      // At this stage, the condition was AND and wasn't invalidated, therefore should return true
      return true;
    };

    /**
     * Checks to see if a page is valid.
     * @param {string} pageId
     * @return {boolean}
     */
    var isPageValid = function (pageId) {
      var page = getComponent(pageId);
      if (page === false) {
        return false;
      }

      if (_.isUndefined(page.section) || !_.isArray(page.section) || page.section.length === 0) {
        // If no sections set within the page, it's valid
        return true;
      }

      return _.every(page.section, function (section) {
        if (isComponentVisible(section)) {
          // If the section is visible, return if it's valid
          var valid = isSectionValid(section);
          console.log(section);
          console.log(valid);
          return valid;
        }

        // Section is not visible, it's automatically valid
        return true;
      });
    };

    /**
     * Checks whether or not a component is visible.
     * @param {object} component
     * @param {string} key
     * @param {tagKey} tagKey
     * @param {null|string} belongsTo
     * @param {null|number} iteration
     * @return {boolean}
     */
    var isComponentVisible = function (component, key, tagKey, belongsTo, iteration) {
      // If component is a string, attempt to retrieve from components
      if (_.isString(component)) {
        component = getComponent(component);
        if (component === false) {
          return false;
        }
      }

      if (!_.isObject(component)) {
        // Component must be an object
        return false;
      }

      // Set default parameter values
      if (!_.isString(key) || key.length === 0) {
        key = 'visibility';
      }

      if (!_.isString(tagKey) || tagKey.length === 0) {
        tagKey = 'tags';
      }

      // Look for component tags
      var tags;
      if (_.has(component, tagKey) && _.isArray(component[tagKey]) && component[tagKey].length > 0) {
        // If the component has a set of tags associated with it, need to cross reference against the set form tags
        tags = component[tagKey];
      }

      if (_.isArray(tags) && tags.length > 0 && !fc.hasTags(tags)) {
        // Component has tags that aren't set on the form
        return false;
      }

      if (_.has(component, key)) {
        // If the component has visibility options, check to see if it should be shown
        var visibility = formcorp.helpers.getJson(component[key]);

        // If a visibility component is set, need to evaluate it.
        if (_.isObject(visibility) && Object.keys(visibility).length > 0 && !checkLogic(visibility, null, iteration)) {
          console.log('visibility doesnt pass');
          return false;
        }
      }

      return true;
    };

    /**
     * Checks if a page section is valid (all visible fields have correct values
     * set).
     * @param {object} section
     * @return {boolean}
     */
    var isSectionValid = function (section) {
      if (!_.isObject(section)) {
        return false;
      }

      if (_.isUndefined(section.field) || !_.isArray(section.field) || section.field.length === 0) {
        // If no fields are set within the section, it's valid
        return true;
      }

      return _.every(section.field, function (field) {
        if (isComponentVisible(field.config)) {
          if (field.type === 'grouplet') {
            var groupletValid = isGroupletValid(field);
            console.log(field);
            console.log(groupletValid);

            return groupletValid;
          } else if (!isFieldValid(field)) {
            // If the component is visible and not valid, return false
            console.log('SHES NOT VALID :(((((((((((((');
            console.log(field);
            return false;
          }
        }

        // Component is either hidden or valid, return true
        return true;
      });
    };

    /**
     * Check if a repeatable grouplet is valid
     * @param {object} grouplet
     * @return {boolean}
     */
    var isRepeatableGroupletValid = function (grouplet) {
      var id = getId(grouplet);
      var values = getValue(id);
      if (!_.isArray(values) || values.length === 0) {
        return false;
      }

      var rows = values.length;
      console.log("ROWS:\n===================");
      console.log(rows);
      var groupletFields = getComponentsThatBelongTo(getId(grouplet));
      console.log(groupletFields);

      // Iterate through every row and check if valid
      for (var row = 0; row < rows; row++) {
        if (!_.every(groupletFields, function (field) {
          if (_.isObject(field.config) && isComponentVisible(field.config, 'visibility', 'tags', id, row)) {
            console.log('component is visible');
            console.log(field);
            if (!isFieldValid(field, getId(grouplet), row)) {
              console.log('field is not valid');
              console.log(field);
              return false;
            }
          }

          return true;
        })) {
          console.log('shes false boys');
          return false;
        }
      }

      console.log('shes TRUE boys');
      return true;
    };

    /**
     * Checks if a grouplet field is valid (by checking if all fields within
     * the grouplet are valid)
     * @param {object|string} grouplet
     * @return {boolean}
     */
    var isGroupletValid = function (grouplet) {
      // If the field is repeatable, need to check each row
      var repeatable = fc.getConfig(grouplet, 'repeatable', false);
      if (repeatable) {
        console.log('check repeatable grouplet');
        var isValid = isRepeatableGroupletValid(grouplet);
        console.log(isValid);
        return isValid;
      }
      console.log('not repeatable');

      // Get components that belongs to the grouplet
      var groupletFields = getComponentsThatBelongTo(getId(grouplet));

      return _.every(groupletFields, function (field) {
        if (_.isObject(field.config) && isComponentVisible(field.config)) {
          if (!isFieldValid(field, getId(grouplet))) {
            return false;
          }
        }

        return true;
      });
    };

    /**
     * Checks if a field's custom validators are valid.
     * @param {object} field
     * @return {boolean}
     */
    var validCustomValidators = function (field, value) {
      var validators = fc.getConfig(field, 'validators', []);
      if (_.isString(validators) && validators.length > 0) {
        // If validators is a string, attempt to decode to JSON
        try {
          validators = JSON.parse(validators);
        } catch (e) {
          fc.log('Malformed validator for field: ' + getId(field));
          fc.log(field);
          return false;
        }
      }

      // Fetch default value if not set
      if (_.isUndefined(value)) {
        value = fc.getValue(getId(field));
      }

      if (_.isArray(validators) && validators.length > 0) {
        // Every validator has to pass, or the field is invalid
        var isValid = _.every(validators, function (validator) {
          // Check to see if validator passes

          var type = fc.toCamelCase(validator.type);
          var callback = window;

          try {
            var callbackFunction = 'formcorp.logic.validators.' + type;

            // Convert the string to a function call
            var callbackSplit = callbackFunction.split('.');
            for (var i = 0; i < callbackSplit.length; i += 1) {
              callback = callback[callbackSplit[i]];
            }

            if (!_.isFunction(callback)) {
              // Check to make sure the callback is a callbable function
              return false;
            }

            // Call the validator, and if false invalidate
            var result = callback(validator.params, value);
            if (_.isBoolean(result) && !result) {
              addError(getId(field), validator.error);

              return false;
            }

            return true;
          } catch (e) {
          }
        });

        return isValid;
      }

      return true;
    };

    /**
     * Components are stored differently, and may now 'belong to' another field
     * (could belong to a grouplet, for example). This affects the ID in which
     * the value of the component is stored. Need to calculate the ID prior
     * to performing the lookup.
     * @param {string} id
     * @param {string|undefined} belongsTo
     * @param {!integer} iteration
     * @return {mixed}
     */
    var getValue = function(id, belongsTo, iteration) {
      var ids = [];
      if (_.isString(belongsTo) && belongsTo.length > 0) {
        // If belongs to a field (i.e. a grouplet, append to ids)
        ids.push(getId(belongsTo));
      }

      if (_.isNumber(iteration)) {
        // For repeatable grouplets
        ids.push(iteration);
      }

      ids.push(getId(id));

      var id = ids.join(fc.constants.prefixSeparator);

      return fc.getValue(id);
    }

    /**
     * Checks if a field is valid.
     * @param {object} field
     * @param {string} belongsTo
     * @param {null|number} iteration
     * @return {boolean}
     */
    var isFieldValid = function (field, belongsTo, iteration) {
      if (_.isString(field)) {
        // A field ID was passed through, try to fetch the component
        field = getComponent(field, belongsTo);
      }

      if (!_.isInteger(iteration) && _.isInteger(field._iteration)) {
        // Dynamically sent the iteration
        iteration = field._iteration;
      }

      // If belongs top parameter not set and the field is in a grouplet set dynamically
      if ((!_.isString(belongsTo) || belongsTo.length === 0) && field._inGrouplet === true) {
        // If belongs to grouplet, add
        belongsTo = field._belongsTo;
      }

      if (field === false || !_.isObject(field)) {
        // If unable to retrieve a field, return false
        return false;
      }

      // If the field type is a grouplet, return true
      var fieldId = getId(field);
      console.log(fieldId);

      // Clear errors for the given fields
      clearErrors(fieldId);

      if (fc.getConfig(field, 'required', false)) {
        // If the field is required, run various integrity checks
        var value = getValue(fieldId, belongsTo, iteration);
        if (_.isUndefined(value)) {
          // If no value is defined, field is not valid
          addError(fieldId, ERROR.NOT_SET, belongsTo, iteration);

          return false;
        } else if (_.isString(value) && value.length === 0) {
          // Value is an empty string, not valid
          addError(fieldId, ERROR.EMPTY, belongsTo), iteration;

          return false;
        } else {
          // If the field has custom cloud validators set, need to check it
          if (!validCustomValidators(field, value)) {
            // All of the validators do not pass
            return false;
          }
        }

        // Check for custom validators for the selected field type
        if (_.has(field, 'type')) {
          var fieldType = field['type'];
          if (_.has(validators, fieldType) && _.isArray(validators[fieldType]) && validators[fieldType].length > 0) {

            var customValidated = _.every(validators[fieldType], function (validator) {
              if (!_.isFunction(validator)) {
                return true;
              }
              return validator(value, getId(field), fc);
            });

            if (!customValidated) {
              return false;
            }
          }
        }
      }

      // If the end has been reached, the field is deemed valid
      return true;
    };

    /**
     * Retrieve the next page
     * @param {string} pageId
     * @return {string|null}
     */
    var getNextPage = function (pageId) {
      var page = getComponent(pageId);
      if (!_.isObject(page)) {
        return false;
      }

      if (_.isBoolean(page.completion) && page.completion) {
        // Completion pages don't have a next page
        return false;
      }

      if (_.isObject(page.toCondition) && !_.isArray(page.toCondition) && Object.keys(page.toCondition).length > 0) {
        // If the page has conditional logic set dictating where it should go, investigate it
        var foundId;
        _.find(page.toCondition, function(logic, targetId) {
          // Iterate through until the target page is found
          if (checkLogic(logic)) {
            foundId = targetId;
            return true;
          }

          return false;
        });

        if (_.isString(foundId) && foundId.length > 0) {
          // If a page was found, return it
          return foundId;
        }
      }

      // Retrieve the direction the form should flow
      var formFlow = fc.getSetting('flow', 'vertical');
      var foundPage = false;

      if (_.isArray(schema.stage) && schema.stage.length > 0) {
        // Iterate through every stage/page and look for match
        for (var x = 0; x < schema.stage.length; x += 1) {
          var stage = schema.stage[x];
          if (_.isArray(stage.page) && stage.page.length > 0) {
            // If vertical, only iterate downwards (i.e. 0-1), otherwise assume horizontal and iterate over all of the elements
            for (var y = 0; y < stage.page.length; y += 1) {
              if (foundPage && y < (formFlow === 'vertical' ? 1 : stage.page.length)) {
                // If previously found the page, ready to return
                return getId(stage.page[y]);
              }

              if (getId(stage.page[y]) === pageId) {
                // If found the target page, mark as such
                foundPage = true;
              }
            }
          }
        }
      }

      // No next page was found
      return false;
    };

    /**
     * Returns true if a page is a completion page (i.e. no next page)
     * @param {string} pageId
     * @return {boolean}
     */
    var isCompletionPage = function (pageId) {
      return getNextPage(getId(pageId)) === false;
    };

    /**
     * Returns true if a page is deemed to be a 'hardcoded' completion page.
     * @param page
     * @returns {boolean}
     */
    var isHardCodedCompletionPage = function (pageId) {
      var page = getComponent(getId(pageId));
      if (_.isUndefined(page)) {
        return false;
      }

      return page.completion === true || (_.isString(page.completion) && ["1", "true"].indexOf(page.completion.toLowerCase()) !== -1);
    };

    /**
     * Retrieve the first page of a schema for a given channel.
     * @param {string|null} channel
     * @return {object|null}
     */
    var getFirstPage = function (channel) {
      if (_.isUndefined(channel)) {
        // If no channel set, default to form channel
        channel = fc.channel;
      }

      if (channel !== fc.constants.defaultChannel && _.isString(channel) && channel.length > 0) {
        // A channel has been set, attempt to retrieve it
        if (_.has(schema, 'channel') && _.isArray(schema.channel) && schema.channel.length > 0) {
          var foundChannel;
          _.each(schema.channel, function (item) {
            if (_.isString(item.name) && item.name === channel && _.isString(item.default) && _.isObject(getComponent(item.default))) {
              foundChannel = getComponent(item.default);
            }
          });

          if (_.isObject(foundChannel)) {
            // If a channel was found, return it
            return foundChannel;
          }
        }
      }

      // At this stage, nothing has been found - return the first page of the form (by looking at the ordered schema)
      if (_.isArray(schema.stage) && schema.stage.length > 0) {
        var stage = schema.stage[0];
        if (_.isArray(stage.page) && stage.page.length > 0) {
          return stage.page[0];
        }
      }
    };

    /**
     * Retrieves the 'current' page (or the page the user should be on)
     * @return {string}
     */
    var getCurrentPage = function () {
      var currentPage = getFirstPage();
      if (!_.isObject(currentPage)) {
        return false;
      }

      var nextPage;
      while (true) {
        // Keep iterating through the next page until a page is not valid
        if (!isPageValid(getId(currentPage))) {
          return currentPage;
        }

        // Retrieve the next page
        nextPage = getNextPage(getId(currentPage));
        if (nextPage === false) {
          break;
        }

        currentPage = nextPage;
      }

      return getId(currentPage);
    };

    /**
     * Retrieve the page 'trail'. If the user is on the 10th page, will return
     * an array of the first 10 pages.
     * @return {array}
     */
    var getPageTrail = function () {
      var pages = [];
      var currentPage = getFirstPage();
      if (!_.isObject(currentPage)) {
        return false;
      }
      pages.push(getId(currentPage));

      var nextPage;
      while (true) {
        // Keep iterating through the next page until a page is not valid
        if (!isPageValid(getId(currentPage))) {
          return pages;
        }

        // Retrieve the next page
        nextPage = getNextPage(getId(currentPage));
        if (nextPage === false) {
          break;
        }
        pages.push(getId(nextPage));

        currentPage = nextPage;
      }

      return pages;
    };

    /**
     * Retrieve all components that belong to a given field.
     * @param {string} id
     * @param {string} type
     * @param {string} fieldType
     * @return {array}
     */
    var getComponentsThatBelongTo = function (id, type, fieldType) {
      var found = [];
      _.each(components, function (fields) {
        var belongTo = _.filter(fields, function (component) {
          if (component._belongsTo === getId(id)) {
            // Found a component that belongs to target
            if (_.isString(type) && type.length > 0) {
              // If a type was specified, only return components that match
              return component._type === type;
            }

            if (_.isString(fieldType) && fieldType.length > 0) {
              // If a field type was passed through, only return fields of that type
              return component.type === fieldType;
            }

            return true;
          }

          return false;
        });

        if (_.isArray(belongTo) && belongTo.length > 0) {
          // If found objects, concatenate to found array
          found = _.union(found, belongTo);
        }
      });

      return found;
    };

    /**
     * Returns an array of sections that belong to a page.
     * @param {string} pageId
     * @param {boolean} returnIds
     * @return {array} Either array of section objects or section IDs dependent on returnIds parameter
     */
    var getPageSections = function (pageId, returnIds) {
      if (!_.isString(pageId)) {
        return [];
      }

      if (!_.isBoolean(returnIds)) {
        // Default return type to array of objects
        returnIds = false;
      }

      var sections = [];
      _.forEach(components, function (component) {
        var matches = _.filter(component, function (o) {
          return o._type === 'section' && o._belongsTo === pageId;
        });

        if (matches.length > 0) {
          // If sections were found, append to the array
          sections.push.apply(sections, matches);
        }
      });

      if (!returnIds) {
        // Return array of section objects
        return sections;
      }

      return _.map(sections, function (section) {
        return getId(section._id);
      });
    };

    /**
     * Return all grouplet IDs that exist within a page
     * @param {string} pageId
     * @return {array}
     */
    var getPageGrouplets = function (pageId, returnIds) {
      if (!_.isBoolean(returnIds)) {
        returnIds = false;
      }

      var pageSections = getPageSections(pageId, true);
      var sectionId;
      var grouplets = [];

      for (var i = 0, l = pageSections.length; i < l; i++) {
        // Iterate through the sections within a page and return the grouplets
        sectionId = pageSections[i];
        var sectionGrouplets = getComponentsThatBelongTo(sectionId, null, 'grouplet');

        if (_.isArray(sectionGrouplets) && sectionGrouplets.length > 0) {
          grouplets = grouplets.concat(sectionGrouplets);
        }
      }

      if (!returnIds) {
        // Return the entire array of objects
        return grouplets;
      }

      return _.map(grouplets, function (grouplet) {
        return getId(grouplet._id);
      });
    };

    /**
     * Returns an array of fields that belong to a page.
     * @param {string} pageId
     * @param {boolean} returnIds
     * @return {array} Either array of field objects or field IDs dependent on returnIds parameter
     */
    var getPageFields = function (pageId, returnIds) {
      if (!_.isString(pageId)) {
        return [];
      }

      if (!_.isBoolean(returnIds)) {
        returnIds = false;
      }

      // Retrieve page components, defined by page sections and page grouplets
      var pageComponents = Array.prototype.concat(
        getPageSections(pageId, true),
        getPageGrouplets(pageId, true)
      );
      console.log('PAGE SECTIONS');
      console.log(pageComponents);
      if (pageComponents.length === 0) {
        // If no page sections found, return empty array (as no fields exist)
        return [];
      }

      // Fetch fields that belong within a section on the page (or belongs to a grouplet on that page)
      var fields = [];
      _.forEach(components, function (component) {
        var matches = _.filter(component, function (o) {
          return o._type === 'field' && _.includes(pageComponents, o._belongsTo);
        });

        if (matches.length > 0) {
          // If sections were found, append to the array
          fields.push.apply(fields, matches);
        }
      });

      console.log('PAGE FIELDS');
      console.log(fields);

      if (!returnIds) {
        return fields;
      }

      return _.map(fields, function (field) {
        return getId(field._id);
      });
    };

    /**
     * Retrieves errors that have been detected for a given page.
     * @param {string} pageId
     * @param {boolean} returnIds
     * @return {array}
     */
    var getPageErrors = function (pageId, returnIds) {
      if (!_.isString(pageId) || pageId.length === 0) {
        return [];
      }

      if (!_.isBoolean(returnIds)) {
        returnIds = false;
      }

      // Retrieve the page fields, and then only filter fields that have been shown to error
      var pageFields = getPageFields(pageId, true);
      if (!_.isArray(pageFields) || pageFields.length === 0) {
        return [];
      }

      // Trigger page errors to be stored
      _.each(pageFields, function (id) {
        isFieldValid(id);
      });

      // Filter out fields that don't have errors set
      var localErrors = _.filter(pageFields, function (fieldId) {
        return _.has(errors, fieldId) && isComponentVisible(fieldId) && _.isArray(errors[fieldId]) && errors[fieldId].length > 0;
      });

      if (returnIds) {
        return localErrors;
      }

      return _.pick(errors, localErrors);
    };

    // 'Public' methods to return
    return {
      init: init,
      checkLogic: checkLogic,
      isComponentVisible: isComponentVisible,
      isPageValid: isPageValid,
      isSectionValid: isSectionValid,
      isFieldValid: isFieldValid,
      getNextPage: getNextPage,
      isCompletionPage: isCompletionPage,
      isHardCodedCompletionPage: isHardCodedCompletionPage,
      getFirstPage: getFirstPage,
      getCurrentPage: getCurrentPage,
      getErrors: getErrors,
      getPageTrail: getPageTrail,
      getComponent: getComponent,
      getPageSections: getPageSections,
      getPageFields: getPageFields,
      getPageErrors: getPageErrors,
      components: components,
      errors: errors,
      addError: addError,
      validators: validators,

      // Constants
      ERROR: ERROR
    };
  };

  var validators = {
    /**
     * Tests if a value is within a particular range.
     * @param params
     * @param value
     * @returns {boolean}
     */
    range: function (params, value) {
      if (!$.isNumeric(value)) {
        return false;
      }

      var min = parseFloat(params[0]),
        max = parseFloat(params[1]),
        val = parseFloat(value);

      return val >= min && val <= max;
    },

    /**
     * Tests if above a minimum value.
     * @param params
     * @param value
     * @returns {boolean}
     */
    min: function (params, value) {
      // Replace commas
      value = value.replace(/\,/g, '');

      if (!$.isNumeric(value)) {
        return false;
      }

      return parseFloat(value) >= parseFloat(params[0]);
    },

    /**
     * Test if below minimum value.
     * @param params
     * @param value
     * @returns {boolean}
     */
    max: function (params, value) {
      // Replace commas
      value = value.replace(/\,/g, '');

      if (!$.isNumeric(value)) {
        return false;
      }

      return parseFloat(value) <= parseFloat(params[0]);
    },

    /**
     * Test a string against a regular expression.
     * @param params
     * @param value
     * @returns {boolean|*}
     */
    regularExpression: function (params, value) {
      var re = new RegExp(params[0]);
      return re.test(value);
    },

    /**
     * Verifies whether an ABN is valid
     * @param value
     * @returns boolean
     */
    validAbn: function (value) {
      if (value.replace(/[^0-9]/g, '').length === 0) {
        // If no value set, return true
        return true;
      }

      var hash = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
        total = 0,
        iterator,
        abn = value.replace(/[\s]+/g, ''),
        abnArr = abn.split("");

      if (/[^0-9]/.test(abn)) {
        return false
      }

      if (abn.length !== 11) {
        return false;
      }

      // Subtract 1 from the first digit
      abnArr[0] = parseInt(abnArr[0]) - 1;

      // Calculate the total
      for (iterator = 0; iterator < 11; iterator += 1) {
        total += parseInt(abnArr[iterator]) * hash[iterator];
      }

      // Return true if divisible by 89
      return total % 89 === 0;
    },

    /**
     * Verifies whether an ACN is valid
     * @param value
     * @returns boolean
     */
    validAcn: function (value) {
      if (value.replace(/[^0-9]/g, '').length === 0) {
        // If no value set, return true
        return true;
      }

      var hash = [8, 7, 6, 5, 4, 3, 2, 1],
        total = 0,
        iterator,
        acn = value.replace(/[\s]+/g, '', value),
        acnArr = acn.split(""),
        divisor,
        complement;

      if (/[^0-9]/.test(acn)) {
        return false
      }

      if (acn.length !== 9) {
        return false;
      }

      // Calculate the total
      for (iterator = 0; iterator < 8; iterator += 1) {
        total += parseInt(acnArr[iterator]) * hash[iterator];
      }

      // Calculate the complement
      divisor = total % 10;
      complement = (10 - divisor) % 10;

      // Verify against the check digit
      return complement === parseInt(acnArr[8]);
    },

    /**
     * Checks whether a value is a valid ABN or ACN
     * @param value
     */
    validAcnOrAbn: function (value) {
      return validAbn(value) || validAcn(value);
    },

    /**
     * Checks whether a value is a valid TFN.
     *
     * @param value
     * @returns {boolean}
     */
    validTFN: function (value) {
      if (value.replace(/[^0-9]/g, '').length === 0) {
        // If no value set, return true
        return true;
      }

      // Test to ensure a 9 digit value
      if (!/^\d{9}$/g.test(value)) {
        return false;
      }

      // Test the checksum
      var hash = [1, 4, 3, 7, 5, 8, 6, 9, 10],
        total = 0,
        iterator,
        exemptionCodes = [
          '333333333',
          '444444441',
          '444444442',
          '555555555',
          '666666666',
          '777777777',
          '888888888',
          '987654321',
          '000000000',
          '111111111'
        ];

      // Test if an exemption code supplied
      if (exemptionCodes.indexOf(value) >= 0) {
        return true;
      }

      // Calculate the total
      for (iterator = 0; iterator < 9; iterator += 1) {
        total += value[iterator] * hash[iterator];
      }

      // Return true if divisible by 11
      return total % 11 === 0;
     }
  };

  // Functions to expose
  formcorp.logic = {
    init: init,
    comparisons: comparisons,
    validators: validators,
    isNumber: isNumber,
    _CONST: {
      GROUPLET_FIELD_REGEX: new RegExp('([0-9a-f]{24})\_([0-9]+)\_([0-9a-f]{24})'),
      GROUPLET_FIELD_LOGIC_REGEX: new RegExp('([0-9a-f]{24})\_([0-9a-f]{24})'),
      GROUPLET_FIELD_SEPARATOR: '_'
    }
  };
}());
