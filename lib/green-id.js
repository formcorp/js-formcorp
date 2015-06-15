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
         * Checks to see if a verification has passed.
         * @param fieldId
         * @param verificationType
         * @returns boolean
         */
        passedValidation = function (fieldId, verificationType) {
            var field = fc.fields[fieldId];
            
            // Check to make sure the field is in the correct format
            if (field === undefined || !validResponse(field, verificationType) || field.result.sources[verificationType].passed === undefined) {
                console.log('HURR');
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
         * Verify a NSW license plate
         * @param fieldId
         * @returns {*}
         */
        verifyNSWLicense = function (fieldId) {
            var schema = fc.fieldSchema[fieldId],
                fieldValue = fc.fields[fieldId],
                childContainer,
                licenseNumber,
                cardNumber,
                surname,
                postData,
                tos;
            
            // Ensure the field exists
            if (schema === undefined || typeof fieldValue !== 'object') {
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
                showError(childContainer, 'Please fill out all of the required form fields before submitting.');
                return;
            }
            
            if (licenseNumber.length === 0 || cardNumber.length === 0 || surname.length === 0) {
                showError(childContainer, 'Please fill out all of the required form fields before submitting.');
                return false;
            }
            
            // Ensure the user agrees to the terms and conditions
            tos = childContainer.find('.tos input:checked').length > 0;
            if (!tos) {
                showError(childContainer, 'You must read and agree to the terms and conditions prior to verification.');
                return false;
            }
            
            // If the user has got this far, remove all errors
            hideError(childContainer);
            
            // Format the post data
            postData = {
                verificationToken: fieldValue.result.userToken,
                surname: surname,
                licenseNumber: licenseNumber,
                cardNumber: cardNumber,
                fieldId: fieldId
            };
            
            // Display loading widget to the user
            displayLoadingWidget(childContainer);
            
            // Send the request to the server to attempt to verify the license plate
            fc.api('greenid/gateway/verify-nsw', postData, 'POST', function (data) {
                var licenseOptionContainer,
                    greenIDOptionsContainer;
                
                removeLoadingWidget(childContainer);
                
                // Check if the server raised an exception
                if (typeof data === 'object' && typeof data.success === 'boolean' && typeof data.message === 'string' && !data.success) {
                    showError(childContainer, data.message);
                    return false;
                }
                
                // Check if a valid result was received
                if (!validResponse(data, 'nswrego')) {
                    showError(childContainer, '<strong>Eek!</strong> An invalid result was returned from the server. Please contact support@formcorp.com.au');
                    return;
                }
                
                // Update the value of the verification
                fc.fields[data.fieldId].result = data.result;
                fc.saveQueue[data.fieldId] = fc.fields[data.fieldId];
                
                // Check if the verification passed
                if (!passedValidation(fieldId, 'nswrego')) {
                    showError(childContainer, '<strong>Oops!</strong> We were unable to verify your license. Please double-check your details and try re-submitting.');
                    return;
                }
                
                // Containers to act on
                licenseOptionContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-drivers-license');
                greenIDOptionsContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-greenid-drivers-license');
                
                // Slide the container up
                greenIDOptionsContainer.slideUp();
                licenseOptionContainer.addClass('fc-verified');
                fcGreenID.setProgress(data.fieldId);
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
        },
        
        /**
         * Retrieves the percentage of completion for a greenID verification instance.
         * @param fieldId
         * @returns int
         */
        getPercentage: function (fieldId) {
            var schema = fc.fieldSchema[fieldId],
                value = fc.fields[fieldId],
                sources = ['actrego', 'nswrego', 'passport', 'qldrego'],
                source,
                iterator;
            
            // If not initialised, 
            if (schema === undefined || value === undefined || !validBaseObject(value)) {
                return 0;
            }
            
            // If already verified, mark as 100%
            if (typeof value.result.outcome === 'string' && value.result.outcome === 'VERIFIED') {
                return 100;
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
            
            // If one source left on VIC rego, mark as 40%
            if (validSources(value) && value.result.sources['vicrego'] !== undefined && value.result.sources['vicrego'].oneSourceLeft !== undefined && ['true', true].indexOf(value.result.sources['vicrego'].oneSourceLeft) > -1) {
                return 30;
            }
            
            // If nothing has passed, return 5% - hey, they've initialised the field, worth something, no? :)
            return 5;
        },
        
        /**
         * Returns true if a field has successfully verified with greenID
         * @param fieldId
         * @returns true
         */
        isVerified: function (fieldId) {
            return this.getPercentage(fieldId) === 100;
        },
        
        /**
         * Set the progress bar DOM width
         * @param fieldId
         * @param percentage
         */
        setProgress: function (fieldId, percentage) {
            var fieldContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"]'),
                progressContainer;
                
            // If no percentage specified, fetch for the field
            if (percentage === undefined) {
                percentage = this.getPercentage(fieldId);
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
        },
    };

}(jQuery));

(function ($) {
    'use strict';
    console.log('trigger loaded');
    console.log(fc.jsEvents.onGreenIdLoaded);
    $(fc.jQueryContainer).trigger(fc.jsEvents.onGreenIdLoaded);
}(jQuery));