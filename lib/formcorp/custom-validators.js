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

  // Validators to export
  formcorp.customValidators = {
    validVerificationResult: validVerificationResult
  };

}());
