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
      return !comparisons.In(field, comparisonValue, dataId);
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
   * Initialise the logic piece
   * @param {object} fc
   */
  var init = function (fc) {

    /**
     * {object} Object of form schema components.
     */
    var components = {};

    /**
     * Initialise the logic 'class' for the specified form schema
     */
    var init = function () {
      fc.log('Initialise logic for form');
      if (_.isObject(fc.schema.stage)) {
        getComponents(fc.schema.stage);
      }
      fc.log('Finished initialising logic for form');
    };

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
     * Determins whether an object is a field.
     * @param {obj}
     * @return {boolean}
     */
    var isField = function (obj) {
      return _.isObject(obj) && !_.isUndefined(obj.type) && !_.isUndefined(obj.config) && _.isString(obj.type) && _.isObject(obj.config);
    };

    /**
     * Retrieves an element ID
     * @param {obj} object
     * @return {string}
     */
    var getId = function (obj) {
      if (_.isString(obj)) {
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
    }

    /**
     * Recursively iterates over a form schema object and pulls out all components
     * (stages, pages, sections, fields).
     * @param {obj}
     * @param {string|null|undefined}
     */
    var getComponents = function (obj, belongsTo) {
      if (_.isUndefined(belongsTo) || !_.isString(belongsTo) || belongsTo.length === 0) {
        // Defaults belongsTo to null - element doesn't belong to anything
        belongsTo = null;
      }

      if (_.isObject(obj)) {
        if (_.isArray(obj)) {
          // If an array, iterate through each element, and if an object is found, keep recursing
          for (var iterator = 0; iterator < obj.length; iterator += 1) {
            if (_.isObject(obj[iterator])) {
              getComponents(obj[iterator], belongsTo);
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
          }

          // Save the object to the components list
          var id = null;
          if (!_.isNull(save)) {
            if (!_.isNull(belongsTo)) {
              // If the element belongs to another (i.e. field belongs to a section), store it
              save._belongsTo = belongsTo;
            }

            id = getId(obj);
            if (_.isString(id) && id.length > 0) {
              components[id] = save;
            }
          }

          // Iterate through each item and recursively retrieve components
          _.each(obj, function (item) {
            if (_.isObject(item)) {
              getComponents(item, _.isString(id) ? id : belongsTo);
            }
          });
        }
      }
    };

    /**
     * Recursively checks a boolean logic operator to check if a component should be visible
     * @param {obj} object
     * @param string condition
     * @returns boolean
     */
    var checkLogic = function (obj, condition) {
      if (typeof obj !== 'object') {
        log('checkLogic object parameter not object');
        log(obj);
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
            valid = checkLogic(rule);
          } else {
            operator = rule.operator;
            value = rule.value;
            fieldId = rule.field;
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
                valid = comparisons.isNotNull(field);
                break;
              case 'is_empty':
                valid = comparisons.isEmpty(field);
                break;
              case 'is_not_empty':
                valid = comparisons.isNotEmpty(field);
                break;
              default:
                log('Unknown operator: ' + operator);
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

    var isPageValid = function (pageId) {};

    var isComponentVisible = function (component, key, tagKey) {};

    var isSectionVisible = function (section) {};

    var isFieldVisible = function (field) {};

    var isSectionValid = function (section) {};

    var isFieldValid = function (field) {};

    var getNextPage = function (pageId) {};

    var isCompletionPage = function (pageId) {};

    var getFirstPage = function () {};

    var getCurrentPage = function () {};

    // 'Public' methods to return
    return {
      init: init,
      checkLogic: checkLogic,
      isPageValid: isPageValid,
      isSectionVisible: isSectionVisible,
      isFieldVisible: isFieldVisible,
      isSectionValid: isSectionValid,
      isFieldValid: isFieldValid,
      getNextPage: getNextPage,
      isCompletionPage: isCompletionPage,
      getFirstPage: getFirstPage,
      getCurrentPage: getCurrentPage,
      components: components
    };
  };

  // Functions to expose
  formcorp.logic = {
    init: init,
    comparisons: comparisons
  };
}());
