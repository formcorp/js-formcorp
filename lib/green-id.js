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
            console.log('attempt to initialise');
            fcGreenID.initialised = true;
            console.log(values);

            fc.api('greenid/gateway/init', values, 'POST', function (data) {
                console.log(data);
            });
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
                console.log(validForm);
                if (validForm) {
                    initialiseGreenIDVerification(values);
                }
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