/**
 * FormCorp Green ID integration.
 *
 * @author Alex Berriman <aberriman@formcorp.com.au>
 * @website www.formcorp.com.au
 */

/*global jQuery,fc*/

var fcGreenID = (function ($) {
    "use strict";

    // If formcorp not initialised, return empty
    if (!fc) {
        return {};
    }

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
         * Fields that are required
         * @type {string[]}
         */
        requiredFields = ['address', 'country', 'firstName', 'postcode', 'state', 'suburb', 'surname'],

        /**
         * Fetch the greenID field
         * @returns {*}
         */
        getGreenIdField = function () {
            // If already retrieved, return
            if (fcGreenID.field !== undefined) {
                return fcGreenID.field;
            }

            var fieldId;

            // Iterate through each field definition and return if matches
            for (fieldId in fc.fieldSchema) {
                if (fc.fieldSchema.hasOwnProperty(fieldId) && fc.fieldSchema[fieldId].type === 'greenIdVerification') {
                    fcGreenID.field = fc.fieldSchema[fieldId];
                    return fcGreenID.field;
                }
            }
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

            return fc.fields[fieldId] !== undefined ? fc.fields[fieldId] : '';
        },

        /**
         * Initialises greenID verification
         * @param values
         */
        initialiseGreenIDVerification = function (values) {
            fcGreenID.initialised = true;

            fc.api('greenid/gateway/init', values, 'POST', function (data) {
                // Ensure the server returned a valid response
                if (typeof data !== 'object' || typeof data.result === undefined) {
                    return;
                }
                
                // If process
                if (typeof fc.fields[data.fieldId] === 'undefined') {
                    fc.fields[data.fieldId] = {};                
                }

                fc.fields[data.fieldId].result = data.result;
                fc.saveQueue[data.fieldId] = fc.fields[data.fieldId];
            });
        },

        verifyNSWLicense = function (fieldId) {
            var schema = fc.fieldSchema[fieldId],
                childContainer,
                licenseNumber,
                cardNumber,
                surname;
            
            // Ensure the field exists
            if (schema === undefined) {
                return;
            }
            
            // Fetch the container inside the DOM
            childContainer = $(fc.jQueryContainer).find('.fc-child-options[data-for="' + fieldId + '"]');
            if (childContainer.length === 0) {
                console.log('Child container not found.');
                return;
            }
            
            // Fetch values to send up to remote API
            licenseNumber = childContainer.find('.drivers-license input').val();
            cardNumber = childContainer.find('.card-number input').val();
            surname = childContainer.find('.surname input').val();
            
            // Ensure values exist for all
            if (typeof licenseNumber !== 'string' || typeof cardNumber !== 'string' || typeof surname !== 'string') {
                console.log('NSW values not equal string');
                return;
            }
            
            // @todo: show error dialog
            if (licenseNumber.length === 0 || cardNumber.length === 0 || surname.length === 0) {
                console.log ('Missing values');
                return false;
            }
            
            console.log('prepare to send up to remote API');
        },

        /**
         * Register the Green ID event listeners
         */
        registerGreenIDEventListeners = function () {
            $(fc.jQueryContainer).on(fc.jsEvents.onFieldSuccess, function () {
                // If already initialised, do nothing
                if (fcGreenID.initialised !== undefined && fcGreenID.initialised === true) {
                    return;
                }

                var field = getGreenIdField(),
                    key,
                    values = {},
                    fieldId,
                    iterator,
                    validForm = true;

                // Fetch all of the appropriate values
                for (key in configKeys) {
                    if (configKeys.hasOwnProperty(key)) {
                        fieldId = fc.getConfig(field, configKeys[key], '');
                        values[key] = getValue(fieldId);
                    }
                }
                
                // If previously initialised, do nothing (@todo: look in to doing something?)
                fieldId = fc.getId(field);
                if (typeof fc.fields[fieldId] === 'object' && typeof fc.fields[fieldId].result === 'object') {
                    console.log('Previously initialised, do nothing.');
                    return;
                }
                
                // Add the greenID field id
                values.fieldId = fc.getId(field);

                // Iterate through and attempt to invalidate a field
                for (iterator = 0; iterator < requiredFields.length; iterator += 1) {
                    fieldId = requiredFields[iterator];

                    // If a required field isn't set, return false
                    if (values[fieldId] === undefined || values[fieldId].length === 0) {
                        console.log(fieldId + ': empty');
                        validForm = false;
                        break;
                    }
                }

                // If the form is valid, attempt to initialise greenID verification
                if (validForm) {
                    initialiseGreenIDVerification(values);
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
                    console.log('field ID does not exist.');
                    return false;
                }
                
                // What action to complete
                switch (fcGreenID.currentState) {
                    // NSW drivers license verification
                    case 'stateNSW':
                        verifyNSWLicense(fieldId);
                        break;
                    default:
                        console.log('Unknown current greenID state: ' + fcGreenID.currentState);
                        break;
                }
                
                return false;
            });
        };


    /**
     * Return class methods
     */
    return {

        /**
         * Initialise the analytics
         */
        init: function () {
            registerGreenIDEventListeners();
            console.log('init1123');
        }
    };

}(jQuery));

(function ($) {
    'use strict';
    $(fc.jQueryContainer).trigger(fc.jsEvents.onGreenIdLoaded);
}(jQuery));