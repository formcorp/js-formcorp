/**
 * FormCorp Green ID integration.
 *
 * @author Alex Berriman <aberriman@formcorp.com.au>
 * @website www.formcorp.com.au
 */

/*global jQuery,fc*/

var fcGreenID = (function ($) {
  "use strict";

  var values = {};
  var initialised = {};
  var fc;

  /**
   * The keys of various greenID specific config elements
   * @type {{address: string, country: string, dob: string, email: string, firstName: string, integrationId: string, middleName: string, postcode: string, state: string, suburb: string, title: string}}
   */
  var configKeys = {
    'address': 'greenIDAddress',
    'country': 'greenIDCountry',
    'dob': 'greenIDDOB',
    'email': 'greenIDEmail',
    'firstName': 'greenIDFirstName',
    'integrationId': 'greenIDIntegration',
    'middleName': 'greenIDMiddleName',
    'postcode': 'greenIDPostcode',
    'state': 'greenIDState',
    'suburb': 'greenIDSuburb',
    'title': 'greenIDTitle',
    'surname': 'greenIDSurname'
    },

    /**
     * GreenID hashed values to prevent duplicate initialisation.
     * @type {object}
     */
    hashedValues = {},
    hashedMaster = {},
    hashMap = {},

    /**
     * Fields that are required
     * @type {string[]}
     */
    requiredFields = ['address', 'country', 'firstName', 'postcode', 'state', 'suburb', 'surname'],

    /**
     * Fields already initialised
     */
    alreadyInitialised = {},

    /**
     * Compute a hash of a string
     * @param str string
     * @returns string
     */
    hash = function (str) {
      var hash = 0, i, chr, len;
      if (str.length === 0) return hash;
      for (i = 0, len = str.length; i < len; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
      }

      return hash;
    },

    /**
     * Update the summary HTML
     * @param fieldId
     */
    updateSummary = function (fieldId, returnString, updateDom) {
      // Update the summary div
      var fieldContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"]'),
        summaryContainer,
        summaryHtml = '',
        nameHtml = '',
        addressHtml = '',
        value = fc.getValue(fieldId),
        values;

      // Ensure values have been set
      if (value === undefined || value.values === undefined) {
        return;
      }

      values = value.values;

      // If the return string is not specified, default it to false
      if (typeof returnString !== 'boolean') {
        returnString = false;
      }

      // Default the updateDom parameter to true
      if (typeof updateDom !== 'boolean') {
        updateDom = true;
      }

      // If the field doesn't exist, do nothing
      if (fieldContainer.length > 0) {
        summaryContainer = fieldContainer.find('.fc-greenid-value-summary');

        // First line: name
        if (typeof values.title === 'string' && values.title.length > 0) {
          // Title
          nameHtml += (nameHtml.length > 0 ? ' ' : '') + values.title;
        }

        if (typeof values.firstName === 'string' && values.firstName.length > 0) {
          // First name
          nameHtml += (nameHtml.length > 0 ? ' ' : '') + values.firstName;
        }

        if (typeof values.middleName === 'string' && values.middleName.length > 0) {
          // Middle name
          nameHtml += (nameHtml.length > 0 ? ' ' : '') + values.middleName;
        }

        if (typeof values.surname === 'string' && values.surname.length > 0) {
          // Surname
          nameHtml += (nameHtml.length > 0 ? ' ' : '') + values.surname;
        }

        // Second line: address
        if (typeof values.address === 'string' && values.address.length > 0) {
          // Address
          addressHtml += (addressHtml.length > 0 ? ' ' : '') + values.address;
        }

        if (typeof values.suburb === 'string' && values.suburb.length > 0) {
          // Suburb
          addressHtml += (addressHtml.length > 0 ? ', ' : '') + values.suburb;
        }

        if (typeof values.postcode === 'string' && values.postcode.length > 0) {
          // Postcode
          addressHtml += (addressHtml.length > 0 ? ', ' : '') + values.postcode;
        }

        if (typeof values.state === 'string' && values.state.length > 0) {
          // State
          addressHtml += (addressHtml.length > 0 ? '<br>' : '') + values.state;
        }

        if (typeof values.country === 'string' && values.country.length > 0) {
          // Country
          addressHtml += (addressHtml.length > 0 ? ', ' : '') + values.country;
        }

        summaryHtml = '<p>' + nameHtml + '<br>' + addressHtml + '</p>';

        // Update the DOM when required
        if (updateDom) {
          summaryContainer.html(summaryHtml);
        }

        // If opting to return
        if (returnString) {
          return summaryHtml;
        }
      }

      // Return an empty string if got this far
      if (returnString) {
        return '';
      }
    },

    /**
     * Fetch the greenID field
     * @returns {*}
     */
    getGreenIdFields = function () {
      // If already retrieved, return
      if (fcGreenID.field !== undefined) {
        return fcGreenID.field;
      }

      var fieldId,
        fields = [];

      // Iterate through each field definition and return if matches
      for (fieldId in fc.fieldSchema) {
        if (fc.fieldSchema.hasOwnProperty(fieldId) && fc.fieldSchema[fieldId].type === 'greenIdVerification') {
          fields.push(fc.fieldSchema[fieldId]);
        }
      }

      return fields;
    },

    /**
     * Retrieves the value for a field.
     * @param fieldId
     * @returns {*}
     */
    getValue = function (fieldId) {
      // If invalid value passed through, return nothing
      if (fieldId.length === 0) {
        return '';
      }

      return fc.getValue(fieldId) !== undefined ? fc.getValue(fieldId) : '';
    },

    /**
     * Initialises greenID verification
     * @param fieldId
     * @param values
     * @param errorCallback
     */
    initialiseGreenIDVerification = function (fieldId, values, callback, errorCallback) {
      fcGreenID.values[fieldId] = values;
      fcGreenID.initialised[fieldId] = true;

      // Calculate and store the user hash
      var userHash = fc.greenID.userHash(values);
      var hashString = hash(JSON.stringify(userHash));

      if ('undefined' === typeof hashedValues[hashString]) {
        hashedValues[hashString] = [];
      }
      if (hashedValues[hashString].indexOf(fieldId) < 0) {
        hashedValues[hashString].push(fieldId);
      }

      if (typeof hashedMaster[hashString] === 'undefined') {
        hashedMaster[hashString] = fieldId;
      }

      hashMap[fieldId] = hashString;

      fc.api('greenid/gateway/init', values, 'POST', function (data) {
        // Ensure the server returned a valid response
        if (typeof data !== 'object') {
          return;
        }

        if (typeof data.success === 'boolean' && !data.success) {
          var save = {
            result: data.result,
            values: values
          };

          // Update the value detailsrenderGreenIdField
          fc.setVirtualValue(data.fieldId, save);

          // Trigger the callback prior to updating the DOM
          if (typeof callback === 'function') {
            callback(fieldId, data);
          }
          return;
        }

        // If process
        if (typeof fc.getValue(data.fieldId) === 'undefined') {
          fc.fields[data.fieldId] = {};
        }

        // Update the value details
        fc.fields[data.fieldId].result = data.result;
        fc.fields[data.fieldId].values = values;
        fc.saveQueue[data.fieldId] = fc.fields[data.fieldId];

        // Trigger the callback prior to updating the DOM
        if (typeof callback === 'function') {
          callback(fieldId, data);
        }

        // Update the summary table
        updateSummary(data.fieldId);
      }, function (data) {
        // Error function callback
        // When verification can't be initialised, provide enough details to allow the user to re-initialise
        if (typeof fc.fields[fieldId] === 'undefined') {
          fc.fields[fieldId] = {};
        }

        // Update the value details
        fc.fields[fieldId].result = {};
        fc.fields[fieldId].values = values;

        fc.saveQueue[fieldId] = fc.fields[fieldId];

        // Update the summary table
        updateSummary(fieldId);

        // Call the error callback if it was passed through
        if (typeof errorCallback === 'function') {
          errorCallback(data);
        }
      });
    },

    /**
     * Checks for a base greenID object
     * @param data
     * @returns boolean
     */
    validBaseObject = function (data) {
      return typeof data === 'object' && typeof data.result === 'object';
    },

    /**
     * Checks for a valid source result.
     * @param data
     * @returns boolean
     */
    validSources = function (data) {
      return validBaseObject(data) && typeof data.result.sources === 'object';
    },

    /**
     * Returns true if a valid verification result was returned from the server.
     * @param data
     * @param verificationType
     * @returns boolean
     */
    validResponse = function (data, verificationType) {
      return validSources(data) && typeof data.result.sources[verificationType] === 'object';
    },

    /**
     * Get the state of a verification attempt (i.e. verified, locked_out)
     * @param field
     * @param verificationType
     * @returns {*}
     */
    getSourceState = function (field, verificationType) {
      var fieldObj = typeof field === 'string' ? fc.getValue(field) : field;

      if (fieldObj === undefined || !validResponse(fieldObj, verificationType) || fieldObj.result.sources[verificationType].state === undefined) {
        return '';
      }

      return fieldObj.result.sources[verificationType].state;
    },

    /**
     * Checks to see if a verification has passed.
     * @param fieldId
     * @param verificationType
     * @returns boolean
     */
    passedValidation = function (fieldId, verificationType) {
      var field = fc.getValue(fieldId);

      // Check to make sure the field is in the correct format
      if (field === undefined || !validResponse(field, verificationType) || field.result.sources[verificationType].passed === undefined) {
        return false;
      }

      return ['true', true].indexOf(field.result.sources[verificationType].passed) > -1;
    },

    /**
     * Display the loading container.
     * @param container
     */
    displayLoadingWidget = function (container) {
      var loaderContainer = container.find('.fc-loader-container');

      // Add the class if it doesn't exist
      if (!container.hasClass('fc-loading-widget')) {
        container.addClass('fc-loading-widget');
      }

      // Only add the container if it doesn't exist
      if (loaderContainer.length === 0) {
        container.prepend('<div class="fc-loader-container"><div class="fc-loader-bg"></div><div class="fc-loader-content"><div class="fc-loader-wrapper"><div class="fc-loader"></div><div class="loader-section section-left"></div><div class="loader-section section-right"></div></div></div></div>');
      }
    },

    /**
     * Remove the loading widget.
     * @param container
     */
    removeLoadingWidget = function (container) {
      var loaderContainer = container.find('.fc-loader-container');

      // Remove the class if it exists
      if (container.hasClass('fc-loading-widget')) {
        container.removeClass('fc-loading-widget');
      }

      // Remove the loader container
      if (loaderContainer.length > 0) {
        loaderContainer.remove();
      }
    },

    /**
     * Display an error dialog on a container.
     * @param container
     * @param message
     */
    showError = function (container, message) {
      var errorContainer = container.find('.fc-error-widget');

      if (errorContainer.length > 0) {
        // Set the text for the error
        errorContainer.find('.alert').html(message);
        return;
      }

      container.append('<div class="fc-error-widget"><div class="alert alert-danger" role="alert">' + message + '</div></div>');
    },

    /**
     * Hide the error alert from the user.
     * @param container
     */
    hideError = function (container) {
      var errorContainer = container.find('.fc-error-widget');

      if (errorContainer.length > 0) {
        errorContainer.remove();
      }
    },

    /**
     * Update the DOM with the field verification status.
     * @param fieldId
     */
    updateIsVerified = function (fieldId) {
      var fieldContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"]'),
        verifiedClass = 'fc-is-verified',
        notVerifiedClass = 'fc-not-verified',
        verificationErrorClass = 'fc-verification-error',
        skippedClass = 'fc-skipped-verification',
        alreadyInitialisedClass = 'fc-already-initialised-verification',
        automaticFail = false;

      // Ensure the field container is found.
      if (fieldContainer.length === 0) {
        return;
      }

      // Update the DOM with the field verification status.
      if (fcGreenID.hasSkipped(fieldId)) {
        fieldContainer.removeClass(notVerifiedClass).removeClass(alreadyInitialisedClass).removeClass(verificationErrorClass).removeClass(verifiedClass).addClass(skippedClass);
      } else if (fcGreenID.isVerified(fieldId)) {
        // Verification has succeeded.
        fieldContainer.removeClass(notVerifiedClass).removeClass(alreadyInitialisedClass).removeClass(verificationErrorClass).removeClass(skippedClass).addClass(verifiedClass);
      } else if (fcGreenID.hasFailed(fieldId) || fcGreenID.amountOfAvailableSources(fieldId) === 0) {
        // Verification has failed.
        fieldContainer.removeClass(notVerifiedClass).removeClass(alreadyInitialisedClass).removeClass(verifiedClass).removeClass(skippedClass).addClass(verificationErrorClass);
      } else {
        // Verification has not completed.
        fieldContainer.removeClass(verifiedClass).removeClass(alreadyInitialisedClass).removeClass(verificationErrorClass).removeClass(skippedClass).addClass(notVerifiedClass);
      }
    },

    /**
     * Verify a license number for a given state.
     * @param licenseType
     * @param fieldId
     * @param requiredFields
     */
    verifyLicense = function (licenseType, fieldId, requiredFields) {
      var schema = fc.fieldSchema[fieldId],
        fieldValue = fc.getValue(fieldId),
        childContainer,
        tos,
        values = {},
        value,
        input,
        key,
        postData = {};

      // Ensure the field exists
      if (schema === undefined || typeof fieldValue !== 'object') {
        return;
      }

      // Fetch the container inside the DOM
      childContainer = $(fc.jQueryContainer).find('.fc-child-options[data-for="' + fieldId + '"]');
      if (childContainer.length === 0) {
        return;
      }

      // Ensure required fields are found
      for (key in requiredFields) {
        if (requiredFields.hasOwnProperty(key)) {
          input = childContainer.find('.' + requiredFields[key] + ' input');

          // Ensure elements exist
          if (input.length === 0) {
            showError(childContainer, 'Required field \'' + key + '\' not found.');
            return;
          }

          // Ensure elements have an appropriate value
          value = input.val();
          if (value === null || value.length === 0) {
            showError(childContainer, 'Please ensure all form fields are correctly filled out.');
            return;
          }

          values[key] = input.val();
          postData[key] = value;
        }
      }

      // Ensure the user agrees to the terms and conditions
      tos = childContainer.find('.tos input:checked').length > 0;
      if (!tos) {
        showError(childContainer, 'You must read and agree to the terms and conditions prior to verification.');
        return false;
      }

      // If the user has got this far, remove all errors
      hideError(childContainer);

      // Append the necessary post data
      postData.verificationUserId = fieldValue.result.userId;
      postData.fieldId = fieldId;

      // Display loading widget to the user
      displayLoadingWidget(childContainer);

      // Send the request to the server to attempt to verify the license plate
      fc.api('greenid/gateway/verify-' + licenseType, postData, 'POST', function (data) {
        var licenseOptionContainer,
          greenIDOptionsContainer,
          sourceState;

        removeLoadingWidget(childContainer);

        // Check if the server raised an exception
        if (typeof data === 'object' && typeof data.success === 'boolean' && typeof data.message === 'string' && !data.success) {
          showError(childContainer, data.message);
          return false;
        }

        // Check if a valid result was received
        if (!validResponse(data, licenseType)) {
          showError(childContainer, '<strong>Eek!</strong> An invalid result was returned from the server. Please contact support@formcorp.com.au');
          return;
        }

        // Update the value of the verification
        var update = fc.getValue(data.fieldId);
        update.result = data.result;
        fc.setVirtualValue(data.fieldId, update);

        // Containers to act on
        licenseOptionContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-drivers-license');
        greenIDOptionsContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-greenid-drivers-license');

        // Check if the verification passed
        if (!passedValidation(fieldId, licenseType)) {
          sourceState = getSourceState(fieldId, licenseType);
          if (['LOCKED_OUT', 'FAILED'].indexOf(sourceState) > -1) {
            // Slide the container up
            greenIDOptionsContainer.slideUp();
            licenseOptionContainer.addClass('fc-locked-out');
            fcGreenID.setProgress(data.fieldId);
            updateIsVerified(fieldId);

          } else {
            showError(childContainer, '<strong>Oops!</strong> We were unable to verify your licence. Please double-check your details and try re-submitting.');
          }

          return;
        }

        // Slide the container up
        greenIDOptionsContainer.slideUp();
        licenseOptionContainer.addClass('fc-verified');
        fcGreenID.setProgress(data.fieldId);

        // Call to update is verified
        updateIsVerified(fieldId);
      });
    },

    /**
     * Verify a NSW license plate
     * @param fieldId
     * @returns {*}
     */
    verifyNSWLicense = function (fieldId) {
      var requiredFields = {
        'licenseNumber': 'drivers-license',
        'cardNumber': 'card-number',
        'surname': 'surname'
      };

      verifyLicense('nswrego', fieldId, requiredFields);
    },

    /**
     * Verify an ACT issued license
     * @param fieldId
     */
    verifyACTLicense = function (fieldId) {
      var requiredFields = {
        'licenseNumber': 'drivers-license',
        'dateOfBirth': 'dob',
        'firstName': 'first-name',
        'surname': 'surname'
      };

      verifyLicense('actrego', fieldId, requiredFields);
    },

    /**
     * Verify a Queensland license.
     * @param fieldId
     */
    verifyQLDLicense = function (fieldId) {
      var requiredFields = {
        'licenseNumber': 'drivers-license',
        'dateOfBirth': 'dob',
        'firstName': 'first-name',
        'surname': 'surname'
      };

      verifyLicense('qldrego', fieldId, requiredFields);
    },

    /**
     * Verify a South Australian issued license
     * @param fieldId
     */
    verifySALicense = function (fieldId) {
      var requiredFields = {
        'licenseNumber': 'drivers-license',
        'dateOfBirth': 'dob',
        'surname': 'surname'
      };

      verifyLicense('sarego', fieldId, requiredFields);
    },

    /**
     * Verify a Victoria issued drivers license.
     * @param fieldId
     */
    verifyVicLicense = function (fieldId) {
      var requiredFields = {
        'licenseNumber': 'drivers-license',
        'dateOfBirth': 'dob',
        'surname': 'surname',
        'address1': 'vic_address_1',
        'address2': 'vic_address_2',
        'address3': 'vic_address_3'
      };

      verifyLicense('vicrego', fieldId, requiredFields);
    },

    /**
     * Verify a WA issued drivers license.
     * @param fieldId
     */
    verifyWALicense = function (fieldId) {
      var requiredFields = {
        'licenseNumber': 'drivers-license',
        'dateOfBirth': 'dob',
        'expiry': 'expiry'
      };

      verifyLicense('warego', fieldId, requiredFields);
    },

    /**
     * Verify a user's passport credentials
     * @param fieldId
     */
    verifyPassport = function (fieldId) {
      var schema = fc.fieldSchema[fieldId],
        fieldValue = fc.getValue(fieldId),
        childContainer,
        tos,
        values = {},
        value,
        input,
        key,
        postData = {},
        countryOfBirth,
        sourceState,
        requiredFields = {
          'passportNumber': 'passport-number',
          'givenName': 'given-name',
          'familyName': 'family-name',
          'dateOfBirth': 'dob',
          'familyNameAtBirth': 'family-name-at-birth',
          'placeOfBirth': 'place-of-birth'
        };

      // Ensure the field exists
      if (schema === undefined || typeof fieldValue !== 'object') {
        return;
      }

      // Fetch the container inside the DOM
      childContainer = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"] .fc-greenid-options');
      if (childContainer.length === 0) {
        return;
      }

      // Ensure required fields are found
      for (key in requiredFields) {
        if (requiredFields.hasOwnProperty(key)) {
          input = childContainer.find('.' + requiredFields[key] + ' input');

          // Ensure elements exist
          if (input.length === 0) {
            showError(childContainer, 'Required field \'' + key + '\' not found.');
            return;
          }

          // Ensure elements have an appropriate value
          value = input.val();
          if (value === null || value.length === 0) {
            showError(childContainer, 'Please ensure all form fields are correctly filled out.');
            return;
          }

          values[key] = input.val();
          postData[key] = value;
        }
      }

      // Set optional data
      postData.middleNames = childContainer.find('.middle-names input').val();

      // Select the country of birth
      countryOfBirth = childContainer.find('.country-birth select option:selected');
      if (countryOfBirth.length === 0 || countryOfBirth.val().length === 0) {
        showError(childContainer, 'Please ensure all form fields are correctly filled out.');
        return;
      }
      postData.countryOfBirth = countryOfBirth.val();

      // Select citizenship fields (when not Australia) and ensure values are set
      if (postData.countryOfBirth !== '1') {
        postData.firstNameAtCitizenship = childContainer.find('.first-name-at-citizenship input').val();
        postData.surnameAtCitizenship = childContainer.find('.surname-at-citizenship input').val();

        if (postData.firstNameAtCitizenship.length === 0 || postData.surnameAtCitizenship.length === 0) {
          showError(childContainer, 'Please ensure all form fields are correctly filled out.');
          return;
        }
      }

      // Ensure the user agrees to the terms and conditions
      tos = childContainer.find('.tos input:checked').length > 0;
      if (!tos) {
        showError(childContainer, 'You must read and agree to the terms and conditions prior to verification.');
        return false;
      }

      // If the user has got this far, remove all errors
      hideError(childContainer);

      // Append the necessary post data
      postData.verificationUserId = fieldValue.result.userId;
      postData.fieldId = fieldId;

      // Display loading widget to the user
      displayLoadingWidget(childContainer);

      // Send the request to the server to attempt to verify the license plate
      fc.api('greenid/gateway/verify-passport', postData, 'POST', function (data) {
        var optionContainer,
          greenIDOptionsContainer;

        removeLoadingWidget(childContainer);

        // Check if the server raised an exception
        if (typeof data === 'object' && typeof data.success === 'boolean' && typeof data.message === 'string' && !data.success) {
          showError(childContainer, data.message);
          return false;
        }

        // Check if a valid result was received
        if (!validResponse(data, 'passport')) {
          showError(childContainer, '<strong>Eek!</strong> An invalid result was returned from the server. Please contact support@formcorp.com.au');
          return;
        }

        // Update the value of the verification
        var update = fc.getValue(data.fieldId);
        update.result = data.result;
        fc.setVirtualValue(data.fieldId, update);

        // Containers to act on
        optionContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-passport-verification');
        greenIDOptionsContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-greenid-options');

        // Check if the verification passed
        if (!passedValidation(fieldId, 'passport')) {
          sourceState = getSourceState(fieldId, 'passport');
          if (['LOCKED_OUT', 'FAILED'].indexOf(sourceState) > -1) {
            // Slide the container up
            greenIDOptionsContainer.slideUp();
            optionContainer.addClass('fc-locked-out');
            fcGreenID.setProgress(data.fieldId);
            updateIsVerified(fieldId);

          } else {
            showError(childContainer, '<strong>Oops!</strong> We were unable to verify your passport. Please double-check your details and try re-submitting.');
          }

          return;
        }

        // Slide the container up
        greenIDOptionsContainer.slideUp();
        optionContainer.addClass('fc-verified');
        fcGreenID.setProgress(data.fieldId);

        // Call to update is verified
        updateIsVerified(fieldId);
      });
    },

    /**
     * Verify a user's visa credentials.
     * @param fieldId
     */
    verifyVisa = function (fieldId) {
      var schema = fc.fieldSchema[fieldId],
        fieldValue = fc.getValue(fieldId),
        childContainer,
        tos,
        values = {},
        value,
        input,
        key,
        postData = {},
        countryOfBirth,
        requiredFields = {
          'visaNumber': 'visa-number',
          'familyName': 'family-name',
          'dateOfBirth': 'dob',
          'country': 'country-passport',
        };

      // Ensure the field exists
      if (schema === undefined || typeof fieldValue !== 'object') {
        return;
      }

      // Fetch the container inside the DOM
      childContainer = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"] .fc-greenid-options');
      if (childContainer.length === 0) {
        return;
      }

      // Ensure required fields are found
      for (key in requiredFields) {
        if (requiredFields.hasOwnProperty(key)) {
          input = childContainer.find('.' + requiredFields[key] + ' input');

          // Attempt to find select value
          if (input.length === 0) {
            input = childContainer.find('.' + requiredFields[key] + ' select option:selected');
            if (input.length === 0 || input.val().length === 0) {
              showError(childContainer, 'Required field \'' + key + '\' not found.');
              return;
            }
          }

          // Ensure elements exist
          if (input.length === 0) {
            showError(childContainer, 'Required field \'' + key + '\' not found.');
            return;
          }

          // Ensure elements have an appropriate value
          value = input.val();
          if (value === null || value.length === 0) {
            showError(childContainer, 'Please ensure all form fields are correctly filled out.');
            return;
          }

          values[key] = input.val();
          postData[key] = value;
        }
      }

      // Ensure the user agrees to the terms and conditions
      tos = childContainer.find('.tos input:checked').length > 0;
      if (!tos) {
        showError(childContainer, 'You must read and agree to the terms and conditions prior to verification.');
        return false;
      }

      // If the user has got this far, remove all errors
      hideError(childContainer);

      // Append the necessary post data
      postData.verificationUserId = fieldValue.result.userId;
      postData.fieldId = fieldId;

      // Display loading widget to the user
      displayLoadingWidget(childContainer);

      // Send the request to the server to attempt to verify the licence plate
      fc.api('greenid/gateway/verify-visa', postData, 'POST', function (data) {
        var optionContainer,
          greenIDOptionsContainer;

        removeLoadingWidget(childContainer);

        // Check if the server raised an exception
        if (typeof data === 'object' && typeof data.success === 'boolean' && typeof data.message === 'string' && !data.success) {
          showError(childContainer, data.message);
          return false;
        }

        // Check if a valid result was received
        if (!validResponse(data, 'visa')) {
          showError(childContainer, '<strong>Eek!</strong> An invalid result was returned from the server. Please contact support@formcorp.com.au');
          return;
        }

        // Update the value of the verification
        var update = fc.getValue(data.fieldId);
        update.result = data.result;
        fc.setVirtualValue(data.fieldId, update);

        // Check if the verification passed
        if (!passedValidation(fieldId, 'visa')) {
          showError(childContainer, '<strong>Oops!</strong> We were unable to verify your visa. Please double-check your details and try re-submitting.');
          return;
        }

        // Containers to act on
        optionContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-visa-verification');
        greenIDOptionsContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-greenid-options');

        // Slide the container up
        greenIDOptionsContainer.slideUp();
        optionContainer.addClass('fc-verified');
        fcGreenID.setProgress(data.fieldId);

        // Call to update is verified
        updateIsVerified(fieldId);
      });
    },

    /**
     * Initialise the greenID DOM field
     * @param fieldId
     */
    initGreenIdDOMField = function (fieldId) {
      var schema = fc.fieldSchema[fieldId],
        value = fc.getValue(fieldId),
        percentage,
        init,
        error,
        rootId,
        prefix,
        fieldSelector = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"]'),
        initSelector,
        parts,
        values = $.extend({}, fc.fields),
        iteratorSchema,
        referenceId,
        greenIDValues = {},
        key,
        searchFieldId,
        userHash,
        container,
        requireInitialisation = false;

      // Ensure the greenID field exists within the DOM
      if (fieldSelector.length === 0) {
        console.log('Unable to locate greenID field in DOM');
        return;
      }

      // If repeatable, need to fetch the values from the repeatable array
      parts = fieldId.split(fc.constants.prefixSeparator);
      if (parts.length >= 2) {
        iteratorSchema = fc.fieldSchema[parts[0]];
        if (iteratorSchema !== undefined) {
          referenceId = fc.getConfig(iteratorSchema, 'sourceField', '');
          if (referenceId.length > 0 && fc.getValue(referenceId) !== undefined && typeof fc.getValue(referenceId)[parts[1]] === 'object') {
            $.extend(values, fc.getValue(referenceId)[parts[1]]);
          }
        }
      }

      // Need to create a dictionary of values to send to greenID
      if (schema !== undefined) {
        for (key in fc.greenID.configKeys) {
          if (fc.greenID.configKeys.hasOwnProperty(key)) {
            searchFieldId = fc.getConfig(schema, fc.greenID.configKeys[key], '');
            if (searchFieldId.length > 0 && values[searchFieldId] !== undefined && typeof values[searchFieldId] !== 'object') {
              greenIDValues[key] = values[searchFieldId];
            }
          }
        }
      }

      // Call to initialise the greenID component. Sometimes the initial verification check will
      // automatically be triggered, and the greenID field will have already been initialised.
      // In this case, the init() function can be triggered, however otherwise it will need to be
      // initialised here first prior to setting the progress etc.
      init = function () {
        // If schema or value not initialised, do nothing
        if (schema === undefined) {
          return;
        }

        var sourcesRequired,
          sourcesRequiredContainer,
          sourcesRequiredContainer,
          hashString;

          // If value.values is not defined, being initialised for the first time, need to set it
          // If value.values is defined, previously initiasied, and need to calculate the hash
          if (typeof hashMap[fieldId] !== 'undefined') {
            // Previously set in the hash map, otherwise need to calculate
            hashString = hashMap[fieldId];
          } else {
            hashString = hash(JSON.stringify(fc.greenID.userHash(value.values)));
          }

          if (typeof hashedValues[hashString] === 'object' && hashedValues[hashString].length > 1 && hashedMaster[hashString] !== fieldId) {
            // Already initialised for this user, need to update
            // Mark the value as a duplicate
            var existingValue = fc.getValue(fieldId);
            existingValue.result.outcome = "DUPLICATE";
            fc.setVirtualValue(fieldId, existingValue);

            fieldSelector.addClass('fc-already-initialised-verification');
            return;
          }

          if (typeof hashedMaster[hashString] === 'undefined') {
              hashedMaster[hashString] = fieldId;
          }

        // Update the container html
        fc.greenID.updateSummary(fieldId);

        // Set the progress bar percentage
        percentage = fc.greenID.getPercentage(fieldId);
        fc.greenID.setProgress(fieldId, percentage, true);

        // Update the amount of sources required
        sourcesRequiredContainer = $(fc.jQueryContainer).find('.fc-green-id-sources-required[data-for="' + fieldId + '"]');
        if (sourcesRequiredContainer.length > 0) {
          sourcesRequired = percentage >= 50 ? '<strong>one</strong> source' : '<strong>two</strong> sources';
          sourcesRequiredContainer.find('span').html(sourcesRequired);
        }
      };

      // When greenID can't be initialised properly, need to output this information to the user.
      // In this event, they should be able to try and re-initialise the verification, otherwise they'll
      // have to skip and complete manual verification.
      error = function () {
        // Update the container html
        fc.greenID.updateSummary(fieldId);
      };

      // When the user changes details about themselves, this effectively invalidates a previous greenID
      // verification attempt. The reason for this, is they can use one user to pass verification, and then
      // go back to try and fool the system in to thinking a different user verified.
      if (value !== undefined && value.values !== undefined && typeof value.values === typeof greenIDValues) {
        userHash = fc.greenID.userHash(value.values);
        var hashString = hash(JSON.stringify(userHash));
        if ('undefined' === typeof hashedValues[hashString]) {
          hashedValues[hashString] = [];
        }

        if (hashedValues[hashString].indexOf(fieldId) < 0) {
          hashedValues[hashString].push(fieldId);
        }

        if (typeof hashedMaster[hashString] === 'undefined') {
            hashedMaster[hashString] = fieldId;
        }

        if (userHash !== fc.greenID.userHash(greenIDValues)) {
          requireInitialisation = true;

          // Update the DOM to show the initialising screen
          fieldSelector.find('.fc-green-id-el').remove();
          fieldSelector.find('.fc-fieldgroup').prepend('<div class="fc-init-green-id"></div>');
        }
      }

      if (!requireInitialisation) {
        // If initialisation is unknown, look for an indicator in the DOM
        initSelector = fieldSelector.find('.fc-init-green-id');

        // If not initialising, render the greenID.
        if (initSelector.length === 0) {
          init();
          return;
        }
      }

      // Display the loading widget
      if (fieldId !== undefined && typeof fieldId === 'string' && fieldId.length > 0) {
        container = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"]');
        if (container.length > 0) {
          displayLoadingWidget(container);
        }
      }

      // Append the field id
      greenIDValues.fieldId = fieldId;

      // Determine the prefix to use
      prefix = fieldId.replace(fc.getId(fc.fieldSchema[fieldId]), '');

      // Shoot off the greenID initialisation request to the server
      fc.greenID.initialiseGreenIDVerification(fieldId, greenIDValues, function (dataId, data) {
        var html, fieldSelector;

        // When a valid result is returned by the server, output accordingly
        if (typeof data === 'object') {
          if (data.result !== undefined && typeof data.result === 'object') {
            html = fc.renderGreenIdField(fc.fieldSchema[fieldId], prefix, true);
            fieldSelector = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"]');
            if (fieldSelector.length > 0) {
              fieldSelector.find('.fc-init-green-id').remove();
              fieldSelector.find('.fc-green-id-el').remove();
              fieldSelector.find('.fc-fieldgroup').prepend(html);
              init();

              // Mark as not initialised
              fieldSelector.addClass('fc-not-verified');
            }
          } else if (typeof data.success === 'boolean' && !data.success) {
            // There was an error when initialising, need to output to the user
            fieldSelector = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"]');
            html = '<div class="fc-green"';
            if (fieldSelector.length > 0) {
              fieldSelector.find('.fc-init-green-id').remove();
              fieldSelector.find('.fc-green-id-el').remove();
              showError(fieldSelector.find('.fc-fieldgroup'), 'There was an error initialising electronic verification. Please confirm your details or attempt a different verification method.');

              // Mark as not initialised
              fieldSelector.addClass('fc-not-verified');
            }
          }
        }

        // Hide the loading widget (as all initialisation done at this point)
        removeLoadingWidget(container);
      }, function () {
        // greenID failed to initialise for the selected field.
        var html, fieldSelector;
        console.log('unable to render greenID');

        // Register the HTML allowing the user to re-initialise
        html = fc.renderGreenIdField(fc.fieldSchema[fieldId], prefix, true);
        html += '<div class="fc-green-failed-initialisation">';
        html += '<div class="alert alert-danger" role="alert">Unfortunately greenID verification failed to initialise.</div>';
        html += '<h5>What now?</h5>';
        html += '<p>You can try to re-initialise greenID using the below button. If that still fails, you can skip verification using the options above, but you will have to manually attach verification documents to your application.</p>';
        html += '<div class="fc-greenid-reinit"><input type="submit" value="Re-initialise" data-for="' + fieldId + '" class="fc-btn"></div>';
        html += '<div class="fc-green-id-skip-container"><input type="submit" value="Skip verification" data-for="' + fieldId + '" class="fc-btn fc-skip-green-id"></div>';
        html += '<div class="fc-clear"></div>';
        html += '</div>';

        fieldSelector = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"]');
        if (fieldSelector.length > 0) {
          fieldSelector.find('.fc-init-green-id').remove();
          fieldSelector.find('.fc-green-id-el').remove();
          fieldSelector.find('.fc-fieldgroup').prepend(html);
          error();

          // Mark as not initialised
          fieldSelector.addClass('fc-not-verified');
        }
        error();

        // Hide the loading widget (as all initialisation done at this point)
        removeLoadingWidget(container);
      });

    },

    /**
     * Skip verification for a given field
     * @param dataId
     */
    skipVerification = function (dataId) {
      var value,
        schema,
        optionsContainer,
        failedContainer,
        container;

      if (confirm('Are you sure you want to skip digital verification for this user?')) {
        if (dataId !== undefined && typeof dataId === 'string') {
          container = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + dataId + '"]');
          value = fc.getValue(dataId);
          schema = fc.fieldSchema[dataId];

          // Only continue if the container exists within the DOM
          if (container.length > 0) {
            // If a valid value is found, set the outcome to skipped
            if (typeof value === 'object' && typeof value.result === 'object') {
              value.result.outcome = 'SKIPPED';
              fc.setVirtualValue(dataId, value);

              updateIsVerified(dataId);
            }

            // Hide the failed container
            failedContainer = container.find('.fc-green-failed-initialisation');
            if (failedContainer.length > 0) {
              failedContainer.remove();
            }

            // Delete the options container
            optionsContainer = container.find('.fc-greenid-options');
            if (optionsContainer.length > 0) {
              optionsContainer.remove();
            }
          }
        }
      }
    },

    /**
     * Register the Green ID event listeners
     */
    registerGreenIDEventListeners = function () {
      // Open a TOS link in a new window
      $(fc.jQueryContainer).on('click', '.fc-field-greenIdVerification .tos a', function () {
        var href = $(this).attr('href'), win;
        if (typeof href === 'string' && href.length > 0) {
          win = window.open(href, '_blank');
          win.focus();
        }

        return false;
      });

      // Skip verification
      $(fc.jQueryContainer).on('click', '.fc-skip-green-id', function () {
        var dataId = $(this).attr('data-for');
        skipVerification(dataId);

        return false;
      });

      // Re-initialise greenID
      $(fc.jQueryContainer).on('click', '.fc-greenid-reinit input[type=submit]', function () {
        var dataId = $(this).attr('data-for'),
          container;

        // If data ID passed through, attempt to re-initialise
        if (dataId !== undefined && typeof dataId === 'string' && dataId.length > 0) {
          container = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + dataId + '"] .fc-fieldgroup');
          if (container.length > 0) {
            container.html(fc.initGreenIdFieldInDOM(dataId));
            fcGreenID.initGreenIdDOMField(dataId);
          }
        }

        return false;
      });

      fc.domContainer.on(fc.jsEvents.onFieldSuccess, function () {
        var greenIdFields = getGreenIdFields(),
          key,
          values,
          greenIDIterator,
          fieldId,
          field,
          iterator,
          validForm = true;

        // If no greenID fields, return and do nothing
        if (typeof greenIdFields !== 'object' || greenIdFields.length === 0) {
          return;
        }

        // Iterate through each greenID field
        for (greenIDIterator = 0; greenIDIterator < greenIdFields.length; greenIDIterator += 1) {
          field = greenIdFields[greenIDIterator];

          // Reset default values on each field iteration
          values = {};
          validForm = true;

          // Fetch all of the appropriate values
          for (key in configKeys) {
            if (configKeys.hasOwnProperty(key)) {
              fieldId = fc.getConfig(field, configKeys[key], '');
              if (fieldId.length >= 24) {
                // Needs to be a valid mongo id
                values[key] = getValue(fieldId);
              } else {
                values[key] = "";
              }
            }
          }

          var hashString = hash(JSON.stringify(values));

          // Add the greenID field id
          values.fieldId = fc.getId(field);

          // Iterate through and attempt to invalidate a field
          for (iterator = 0; iterator < requiredFields.length; iterator += 1) {
            fieldId = requiredFields[iterator];

            // If a required field isn't set, return false
            if (values[fieldId] === undefined || values[fieldId].length === 0) {
              validForm = false;
              break;
            }
          }

          // If the form is valid, attempt to initialise greenID verification
          if (validForm && (typeof alreadyInitialised[hashString] !== 'boolean' || !alreadyInitialised[hashString])) {
            alreadyInitialised[hashString] = true;
            initialiseGreenIDVerification(fieldId, values);
          }
        }
      });

      // Attempt to verify a user's details
      $(fc.jQueryContainer).on('click', '.green-id-verify .fc-btn', function () {
        // If no current state, do nothing.
        if (typeof fcGreenID.currentState === undefined) {
          return false;
        }

        var fieldId = $(this).attr('data-for');

        // Make sure the field exists
        if (typeof fieldId !== 'string' || fc.fieldSchema[fieldId] === undefined) {
          return false;
        }

        // What action to complete
        if (fcGreenID.currentState !== undefined) {
          switch (fcGreenID.currentState) {
            // NSW drivers license verification
            case 'stateNSW':
              verifyNSWLicense(fieldId);
              break;
            case 'stateACT':
              verifyACTLicense(fieldId);
              break;
            case 'stateQLD':
              verifyQLDLicense(fieldId);
              break;
            case 'stateSA':
              verifySALicense(fieldId);
              break;
            case 'stateVIC':
              verifyVicLicense(fieldId);
              break;
            case 'stateWA':
              verifyWALicense(fieldId);
              break;
            case 'verifyPassport':
              verifyPassport(fieldId);
              break;
            case 'verifyVisa':
              verifyVisa(fieldId);
              break;
            default:
              console.log('Unknown current greenID state: ' + fcGreenID.currentState);
              break;
          }
        }

        return false;
      });
    };

  /**
   * Initialise the analytics
   */
  var init = function (instance) {
    values = {};
    initialised = {};
    fc = instance;

    registerGreenIDEventListeners();
  };

  /**
   * Initialise all greenID field DOM elements
   */
  var initGreenIdDOMFields = function () {
    if (fc.greenID === undefined) {
      return;
    }

    var greenIdFields = fc.domContainer.find('.fc-field-greenIdVerification');

    if (greenIdFields.length > 0) {
      greenIdFields.each(function () {
        var dataId = $(this).attr('fc-data-group');
        fcGreenID.initGreenIdDOMField(dataId);
      });
    }
  };

  /**
   * Retrieves the percentage of completion for a greenID verification instance.
   * @param fieldId
   * @returns int
   */
  var getPercentage = function (fieldId) {
    var schema = fc.fieldSchema[fieldId],
      value = fc.getValue(fieldId),
      sources = {
        low: ['aec', 'waec', 'AECDatabaseBean', 'asic', 'AsicPersonNameUCBean'],
        high: ['actrego', 'medibank', 'nswrego', 'passport', 'qldrego', 'sarego', 'vicrego', 'visa', 'warego'],
      },
      source,
      iterator,
      key,
      percentage = 0;

    // If not initialised,
    if (schema === undefined || value === undefined || !validBaseObject(value)) {
      return 0;
    }

    // If already verified, mark as 100%
    if (typeof value.result.outcome === 'string' && ['VERIFIED', 'PENDING', 'VERIFIED_WITH_CHANGES'].indexOf(value.result.outcome) > -1) {
      return 100;
    }

    // If no sources defined, do nothing
    if (typeof value.result !== 'object' || value.result.sources === undefined) {
      return 0;
    }

    // If one source left, mark as 60%
    if (typeof value.result.sources === 'object') {
      for (iterator = 0; iterator < sources.length; iterator += 1) {
        source = sources[iterator];
        if (typeof value.result.sources[source] === 'object' && value.result.sources[source].oneSourceLeft !== undefined) {
          // If one source is not left, break the for loop (only need to check a single field, not all)
          if ([true, 'true'].indexOf(value.result.sources[source].oneSourceLeft) > -1) {
            return 60;
          } else {
            break;
          }
        }
      }
    }

    // Increment the sources accordingly (for low)
    for (iterator = 0; iterator < sources.low.length; iterator += 1) {
      source = sources.low[iterator];
      if (typeof value.result.sources[source] === 'object' && [true, 'true'].indexOf(value.result.sources[source].passed) > -1) {
        percentage += 50;
      }
    }

    // Increment the sources accordingly (for high)
    for (iterator = 0; iterator < sources.high.length; iterator += 1) {
      source = sources.high[iterator];
      if (typeof value.result.sources[source] === 'object' && [true, 'true'].indexOf(value.result.sources[source].passed) > -1) {
        percentage += 50;
      }
    }

    // If percentage > 100, bring it back
    if (percentage > 90) {
      percentage = 90;
    }

    // If nothing has passed, return 5% - hey, they've initialised the field, worth something, no? :)
    return percentage;
  };

  /**
   * Returns true if a field has successfully verified with greenID
   * @param fieldId
   * @returns true
   */
  var isVerified = function (fieldId) {
    return getPercentage(fieldId) >= 100;
  };

  /**
   * Checks to see if the user has been locked out of verifying.
   * @param fieldId
   * @returns {boolean}
   */
  var isLockedOut = function (fieldId) {
    var value = fc.getValue(fieldId);

    return value !== undefined && value.result !== undefined && value.result.outcome === 'LOCKED_OUT';
  };

  /**
   * Gets the amount of available sources left.
   * @param fieldId
   * @returns {*}
   */
  var amountOfAvailableSources = function (fieldId) {
    var value = fc.getValue(fieldId),
      groups = {
        'licence': ['actrego', 'nswrego', 'qldrego', 'sarego', 'vicrego', 'warego'],
        'passport': ['passport']
      },
      key,
      iterator;

    if (value === undefined || typeof value.result !== 'object') {
      return -1;
    }

    for (key in groups) {
      // Iterate through each group
      if (groups.hasOwnProperty(key) && typeof groups[key] === 'object' && groups[key].length > 0) {
        for (iterator = 0; iterator < groups[key].length; iterator += 1) {
          // Iterate through each source
          if (['LOCKED_OUT', 'FAILED'].indexOf(getSourceState(fieldId, groups[key][iterator])) > -1) {
            delete groups[key];
            break;
          } else if (passedValidation(fieldId, groups[key][iterator])) {
            delete groups[key];
            break;
          }
        }
      }
    }

    return Object.keys(groups).length;
  };

  /**
   * Calculates the amount of sources required to pass verification
   * @param fieldId
   * @returns {boolean}
   */
  var sourcesRequired = function (fieldId) {
    var percentage = getPercentage(fieldId);

    switch (true) {
      case percentage <= 33:
        return 2;
      case percentage <= 50:
      case percentage <= 67:
        return 1;
      case percentage > 67:
        return 0;
    }
  };

  /**
   * Checks to see if a user has skipped verification
   * @param fieldId
   * @return boolean
   */
  var hasSkipped = function (fieldId) {
    var value = fc.getValue(fieldId);

    return typeof value === 'object' && typeof value.result === 'object' && value.result.outcome === 'SKIPPED';
  };

  /**
   * Check to see if the verification has failed.
   * @param fieldId
   * @return boolean
   */
  var hasFailed = function (fieldId) {
    // If amount of sources left is less than the sources needed to verify, has failed
    if (fcGreenID.amountOfAvailableSources(fieldId) < fcGreenID.sourcesRequired(fieldId)) {
      return true;
    }

    return (!isVerified(fieldId) && getPercentage(fieldId) >= 80) || isLockedOut(fieldId) || amountOfAvailableSources(fieldId) === 0;
  };

  /**
   * Checks to see if a field is allowed to pass validation.
   * @param fieldId
   * @return boolean
   */
  var passesValidation = function (fieldId) {
    return isVerified(fieldId) || hasFailed(fieldId) || hasSkipped(fieldId) || amountOfAvailableSources(fieldId) === 0;
  };


  /**
   * Set the progress bar DOM width
   * @param fieldId
   * @param percentage
   * @param updateVerified
   */
  var setProgress = function (fieldId, percentage, updateVerified) {
    var fieldContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"]'),
      progressContainer;

    // Default updateVerified
    if (typeof updateVerified !== 'boolean') {
      updateVerified = false;
    }

    // If no percentage specified, fetch for the field
    if (percentage === undefined) {
      percentage = getPercentage(fieldId);
    }

    // If want to update the DOM with the verification status, do it now.
    if (updateVerified === true) {
      updateIsVerified(fieldId);
    }

    // If unable to retrieve the field from within the DOM, do nothing
    if (fieldContainer.length === 0) {
      return;
    }

    // Attempt to fetch the progress bar DOM container element
    progressContainer = fieldContainer.find('.fc-greenid-progress');
    if (progressContainer.length === 0) {
      return;
    }

    progressContainer.find('.progress-bar').animate({
      width: percentage + '%'
    }, 500).html(percentage + '%');
  };

  /**
   * Return element from an array
   * @param obj
   * @param key
   * @param defaultValue
   * @returns {*}
   */
  var getElementFromObj = function (obj, key, defaultValue) {
    if (typeof defaultValue !== 'string') {
      defaultValue = '';
    }

    return obj.hasOwnProperty(key) ? obj[key] : defaultValue;
  };

  /**
   * Calculate a user hash string from an object of key=>value vars
   * @param details
   * @returns {*}
   */
  var userHash = function (details) {
    if (typeof details !== 'object') {
      return false;
    }

    return [
      getElementFromObj(details, 'firstName'),
      getElementFromObj(details, 'surname'),
      getElementFromObj(details, 'dob'),
      getElementFromObj(details, 'address'),
      getElementFromObj(details, 'suburb'),
      getElementFromObj(details, 'state'),
      getElementFromObj(details, 'postcode'),
      getElementFromObj(details, 'country')
    ].join(',');
  };

  /**
   * Return class methods
   */
  return {
    values: values,
    initialised: initialised,
    init: init,
    hasFailed: hasFailed,
    passesValidation: passesValidation,
    hasSkipped: hasSkipped,
    sourcesRequired: sourcesRequired,
    amountOfAvailableSources: amountOfAvailableSources,
    isLockedOut: isLockedOut,
    isVerified: isVerified,
    getPercentage: getPercentage,
    userHash: userHash,
    getElementFromObj: getElementFromObj,
    setProgress: setProgress,
    configKeys: configKeys,
    initialiseGreenIDVerification: initialiseGreenIDVerification,
    updateSummary: updateSummary,
    initGreenIdDOMField: initGreenIdDOMField,
    skipVerification: skipVerification,
    initGreenIdDOMFields: initGreenIdDOMFields
  };

}(jQuery));

// Register greenID custom validators
formcorp.customValidators.greenIdVerification = function (value, fieldId) {
  if (!fcGreenID.passesValidation(fieldId)) {
    // If validation doesn't pass, need to output the error
    fc.logic.addError(fieldId, 'You must attempt electronic verification.');
    return false;
  }

  return true;
};

formcorp.libCallbacks['lib.formcorp.greenId'] = function (fc) {
  // Configure the validation callbacks
  fc.logic.validators.greenIdVerification = [];
  fc.logic.validators.greenIdVerification.push(formcorp.customValidators.greenIdVerification);

  // Configure greenID
  fc.greenID = fcGreenID;
  fc.greenID.init(fc);
  fc.greenID.initGreenIdDOMFields();
};


(function ($) {
  'use strict';
  $(fc.jQueryContainer).trigger(fc.jsEvents.onGreenIdLoaded);
}(jQuery));
