/**
 * FormCorp Custom Validators class
 * @author Alex Berriman <aberriman@formcorp.com.au>
 */

(function() {
  'use strict';

  if (typeof formcorp === 'object' && typeof formcorp.customValidators !== 'undefined') {
    return;
  }

  /**
   * A valid verification result from the server must be minimum 48 char string.
   * @param {string} value
   * @return {boolean}
   */
  var validVerificationResult = function (value) {
    if (!_.isString(value)) {
      return false;
    }

    return value.length >= 48;
  };

  /**
   * Credit card validator
   * @param {object} value
   * @return {boolean}
   */
  var isValidCreditCard = function (value) {
    if (!_.isObject(value) || !_.has(value, 'success')) {
      return false;
    }

    if (_.isBoolean(value.success)) {
      return value.success;
    }

    if (_.isString(value.success) && value.success === 'true') {
      return true;
    }

    return false;
  };

  // Validators to export
  formcorp.customValidators = {
    validVerificationResult: validVerificationResult,
    isValidCreditCard: isValidCreditCard
  };

}());
