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
  var validVerificationResult = function (value, fieldId, fc) {
    if (!_.isString(value)) {
      fc.logic.addError(fieldId, fc.logic.ERROR.NOT_SET);
      return false;
    }

    if (value.length < 48) {
      fc.logic.addError(fieldId, 'You must complete verification.');
      return false;
    }

    return true;
  };

  /**
   * Credit card validator
   * @param {object} value
   * @return {boolean}
   */
  var isValidCreditCard = function (value, fieldId, fc) {
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
