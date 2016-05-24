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

    // 'Public' methods to return
    return {
      checkLogic: checkLogic
    };
  };

  // Functions to expose
  formcorp.logic = {
    init: init,
    comparisons: comparisons
  };
}());
