/**
 * FormCorp Helper class
 * @author Alex Berriman <aberriman@formcorp.com.au>
 */

(function() {
  'use strict';

  if (typeof formcorp === 'object' && typeof formcorp.helpers !== 'undefined') {
    return;
  }

  /**
   * Order an object recursively.
   * @param {object} obj
   * @param {string|null} column
   * @return {object}
   */
  var orderObject = function (obj, column) {
    if (_.isUndefined(column)) {
      column = 'order';
    }

    if (_.isObject(obj)) {
      // Recursively order children
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (_.isArray(obj[key]) && obj[key].length > 0 && _.has(obj[key][0], column)) {
            // Array and children have the order column
            obj[key] = orderObjectChildren(obj[key], column);
          } else {
            // Is not an array, recursively call the order of object
            obj[key] = orderObject(obj[key], column);
          }
        }
      }
    }

    return obj;
  };

  /**
   * Order the child elements of the master object.
   * @param {object} object
   * @param {string|null} column
   * @return {object}
   */
  var orderObjectChildren = function (object, column) {
    if (_.isUndefined(column)) {
      column = 'order';
    }

    // Construct a 2-dimensional array (so pages with same order don't override each other)
    var orderedObject = [];

    _.each(object, function (item) {
      var order = _.isUndefined(item[column]) ? 0 : item[column];
      if (_.isUndefined(orderedObject[order])) {
        orderedObject[order] = [];
      }
      orderedObject[order].push(item);
    });

    // Flatten the two-dimensional array in to a single array
    var objects = [];
    _.each(orderedObject, function (obj) {
      _.each(obj, function (item) {
        objects.push(item);
      })
    });

    return objects;
  };

  /**
   * Convert a string to a json object (or if already an object, return)
   * @param {object|string} item
   * @return {object|boolean}
   */
  var getJson = function (item) {
    if (_.isObject(item)) {
      // If already an object, simply return
      return item;
    }

    if (_.isString(item) && item.length > 0) {
      // If a string, try to convert to json and return
      try {
        var json = JSON.parse(item);
        return json;
      } catch (e) {

      }
    }

    return false;
  }

  // Public functions and properties to return
  formcorp.helpers = {
    orderObject: orderObject,
    getJson: getJson
  };
}());
