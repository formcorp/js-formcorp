/**
 * FormCorp JS SDK
 * @author Alex Berriman <alexb@fishvision.com>
 * @website http://www.formcorp.com.au/
 *
 * Ability to embed a JS client side form on to an external webpage.
 */

/*global define,exports,require,jQuery,document,console,window,setInterval,fcAnalytics,escape*/


if (!Date.now) {
    Date.now = function () {
        "use strict";
        return new Date().getTime();
    };
}

/**
 * Set up
 */
(function (factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        factory(require('jquery'));
    } else {
        factory(jQuery);
    }
}(function ($) {
    'use strict';

    var pluses = /\+/g,
        config;

    /**
     * Encode a string
     * @param s
     * @returns {*}
     */
    function encode(s) {
        return encodeURIComponent(s);
    }

    /**
     * Decode a string
     * @param s
     * @returns {*}
     */
    function decode(s) {
        return decodeURIComponent(s);
    }

    /**
     * Properly encode a cookie value
     * @param value
     * @returns {*}
     */
    function stringifyCookieValue(value) {
        return encode(typeof (config.json) === 'boolean' && config.json ? JSON.stringify(value) : String(value));
    }

    /**
     * Parse a cookie value
     * @param s
     * @returns {*}
     */
    function parseCookieValue(s) {
        if (s.indexOf('"') === 0) {
            // This is a quoted cookie as according to RFC2068, unescape...
            s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        try {
            // Replace server-side written pluses with spaces.
            // If we can't decode the cookie, ignore it, it's unusable.
            // If we can't parse the cookie, ignore it, it's unusable.
            s = decodeURIComponent(s.replace(pluses, ' '));
            return config.json ? JSON.parse(s) : s;
        } catch (ignore) {
        }
    }

    /**
     * Read a cookie value.
     * @param s
     * @param converter
     * @returns {*}
     */
    function read(s, converter) {
        var value = config.raw ? s : parseCookieValue(s);
        return $.isFunction(converter) ? converter(value) : value;
    }

    /**
     * Set/get cookies
     * @type {Function}
     */

    config = $.cookie = function (key, value, options) {
        var days, t, result, cookies, i, l, parts, name, cookie;

        // Write
        if (arguments.length > 1 && !$.isFunction(value)) {
            options = $.extend({}, config.defaults, options);

            if (typeof options.expires === 'number') {
                days = options.expires;
                options.expires = new Date();
                t = options.expires;
                t.setTime(+t + days * 864e+5);
            }

            document.cookie = [
                encode(key), '=', stringifyCookieValue(value),
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path ? '; path=' + options.path : '',
                options.domain ? '; domain=' + options.domain : '',
                options.secure ? '; secure' : ''
            ].join('');

            return (document.cookie);
        }

        // Read
        result = key ? undefined : {};
        cookies = document.cookie ? document.cookie.split('; ') : [];

        for (i = 0, l = cookies.length; i < l; i += 1) {
            parts = cookies[i].split('=');
            name = decode(parts.shift());
            cookie = parts.join('=');

            if (key && key === name) {
                // If second argument (value) is a function it's a converter...
                result = read(cookie, value);
                break;
            }

            // Prevent storing a cookie that we couldn't decode.
            if (!key) {
                cookie = read(cookie);
                if (cookie !== undefined) {
                    result[name] = cookie;
                }
            }
        }

        return result;
    };

    config.defaults = {};

    /**
     * Remove a cookie
     * @param key
     * @param options
     * @returns {boolean}
     */
    $.removeCookie = function (key, options) {
        if ($.cookie(key) === undefined) {
            return false;
        }

        // Must not alter options, thus extending a fresh object...
        $.cookie(key, '', $.extend({}, options, {expires: -1}));
        return !$.cookie(key);
    };

}));

/**
 * Main FC function
 */
var fc = (function ($) {
    'use strict';

    /**
     * Internal development occurs locally between ports 9000 and 9010
     * @type {boolean}
     */
    var scriptUrl = document.getElementById('fc-js-include').getAttribute('src'),
        isDev = scriptUrl.indexOf('192.168.') > -1,

        /**
         * The URL to query the API on (local dev defaults to port 9001)
         * @type {string}
         */
        apiUrl = !isDev ? '//api.formcorp.com.au/' : '//' + window.location.hostname + ':9001/',

        /**
         * The URL to query the CDN on (local dev defaults to port 9004)
         * @type {string}
         */
        cdnUrl = !isDev ? '//cdn.formcorp.com.au/js/' : '//' + window.location.hostname + ':9004/',

        /**
         * The URL of the Analytics javaqscript file
         * @type {string}
         */
        analyticsUrl = cdnUrl + 'analytics.js',

        /**
         * Separator for recursive grouplets
         * @type {string}
         */
        prefixSeparator = "_",

        /**
         * HTML encode a string.
         * @param html
         * @returns {*}
         */
        htmlEncode = function (html) {
            return document.createElement('a').appendChild(document.createTextNode(html)).parentNode.innerHTML;
        },

        /**
         * Load a css file on to the page
         *
         * @param file
         * @param media
         * @param cssId
         */
        loadCssFile = function (file, media, cssId) {
            var head, link;

            if (media === undefined) {
                media = 'all';
            }

            head = document.getElementsByTagName('head')[0];
            link = document.createElement('link');

            if (cssId !== undefined) {
                link.id = cssId;
            }

            link.rel = 'stylesheet';
            link.href = htmlEncode(file);
            link.media = media;
            head.appendChild(link);
        },

        /**
         * Load a javascript file
         * @param file
         */
        loadJsFile = function (filePath) {
            var file = document.createElement('script');

            file.setAttribute("type", "text/javascript");
            file.setAttribute("src", htmlEncode(filePath));

            $('body').append(file);
        },

        /**
         * Return the mongo id of an object instance.
         * @param obj
         * @returns {*}
         */
        getId = function (obj) {
            /*jslint nomen:true*/
            if (typeof obj === "object" && obj._id !== undefined && obj._id.$id !== undefined) {
                return obj._id.$id;
            }
            /*jslint nomen:false*/

            return "";
        },

        /**
         * Return a value from the field's configuration options.
         * @param field
         * @param key
         * @param defaultVal
         * @param jsonify
         * @returns {*}
         */
        getConfig = function (field, key, defaultVal, jsonify) {
            var json;

            if (defaultVal === undefined) {
                defaultVal = '';
            }

            if (jsonify === undefined) {
                jsonify = false;
            }

            if (field !== undefined && typeof field.config === 'object' && field.config[key] !== undefined) {
                if (jsonify) {
                    // Attempt to convert to json string
                    if (typeof field.config[key] === "string" && ['[', '{'].indexOf(field.config[key].substring(0, 1)) > -1) {
                        try {
                            json = $.parseJSON(field.config[key]);
                            field.config[key] = json;
                        } catch (ignore) {
                        }
                    }
                }

                return field.config[key];
            }

            return defaultVal;
        },

        /**
         * Fields optionally have a shortened label for use in summary tables/pdfs.
         * @param field
         * @returns {*}
         */
        getShortLabel = function (field) {
            return getConfig(field, 'shortLabel', '').length > 0 ? getConfig(field, 'shortLabel') : getConfig(field, 'label');
        },

        /**
         * Retrieve the credit card type from the credit card number
         * @param number
         * @returns {string}
         */
        getCreditCardType = function (number) {
            if (/^5[1-5]/.test(number)) {
                return fc.cardTypes.mastercard;
            }

            if (/^4/.test(number)) {
                return fc.cardTypes.visa;
            }

            if (/^3[47]/.test(number)) {
                return fc.cardTypes.amex;
            }

            return "";
        },

        /**
         * Send off an API call.
         * @param uri
         * @param data
         * @param type
         * @param callback
         */
        api = function (uri, data, type, callback) {
            if (type === undefined || typeof type !== 'string' || ['GET', 'POST', 'PUT'].indexOf(type.toUpperCase()) === -1) {
                type = 'GET';
            }
            type = type.toUpperCase();

            if (data === undefined) {
                data = {};
            }

            // Default session id
            if (data.sessionId === undefined) {
                data.sessionId = fc.sessionId;
            }

            // Default form id
            if (data.form_id === undefined) {
                data.form_id = fc.formId;
            }

            // Set the branch to use if defined
            if (data.branch === undefined && typeof fc.branch === 'string') {
                data.branch = fc.branch;
            }

            $.ajax({
                type: type,
                url: apiUrl + uri,
                data: data,
                beforeSend: function (request) {
                    request.setRequestHeader('Authorization', 'Bearer ' + fc.publicKey);
                },
                success: function (data) {
                    if (typeof data === 'string') {
                        try {
                            data = $.parseJSON(data);
                        } catch (ignore) {
                        }
                    }
                    callback(data);
                },
                error: function (data) {
                    callback(data);
                }
            });
        },

        /**
         * Checks whether a particular action has been processed (i.e. used for rendering actions only once)
         *
         * @param field
         * @param defaultValue
         * @returns {*}
         */
        processed = function (field, defaultValue) {
            if (defaultValue === undefined || typeof defaultValue !== "boolean") {
                defaultValue = false;
            }

            // If the value has been set, return it
            if (typeof fc.processedActions[field] === "boolean") {
                return fc.processedActions[field];
            }

            return defaultValue;
        },

        /**
         * Sort fields in to an array with keys based on tags against their values
         * @returns {Array}
         */
        getFieldTags = function () {
            var tags = [],
                key,
                value,
                parts,
                field,
                iterator,
                tag,
                tagParts;

            for (key in fc.fields) {
                if (fc.fields.hasOwnProperty(key)) {
                    tagParts = [];
                    value = fc.fields[key];
                    parts = key.split(prefixSeparator);

                    for (iterator = 0; iterator < parts.length; iterator += 1) {
                        field = fc.fieldSchema[parts[iterator]];
                        if (field === undefined) {
                            continue;
                        }

                        tag = getConfig(field, 'tag', "");
                        if (tag.length === 0) {
                            tag = getId(field);
                        }
                        tagParts.push(tag);
                    }

                    tag = tagParts.join('.');
                    tags[tag] = value;
                }
            }

            return tags;
        },

        /**
         * Return the value of a field element.
         * @param field
         * @returns {*}
         */
        getFieldValue = function (field) {
            var selector,
                values = [],
                dataId,
                val;

            // If not defined, return nothing
            if (!field || field.length === 0) {
                return;
            }

            if (field.is('input') || field.is('textarea')) {
                if (field.attr('type') === 'radio') {
                    // Radio lists
                    if ($('input[name=' + $(field).attr('name') + ']:checked').length > 0) {
                        return $('input[name=' + $(field).attr('name') + ']:checked').val();
                    }
                    return '';
                }

                if (field.attr('type') === 'checkbox') {
                    // Checkbox lists
                    selector = $('input[formcorp-data-id=' + $(field).attr('formcorp-data-id') + ']:checked');
                    if (selector.length === 0) {
                        return '';
                    }
                    values = [];
                    selector.each(function () {
                        values.push($(this).val());
                    });
                    return JSON.stringify(values);
                }

                dataId = $(field).attr('formcorp-data-id');
                if (fc.fieldSchema[dataId] !== undefined) {
                    // If read-only, do not record a value
                    return getConfig(fc.fieldSchema[dataId], 'readOnly', false) ? '' : field.val();
                }
            }

            if (field.is('select')) {
                return $(field).find('option:selected').text();
            }

            // Return the value for rendered buttons
            if (field.is('button')) {
                dataId = field.attr('formcorp-data-id');
                if (dataId) {
                    if (!getConfig(fc.fieldSchema[dataId], 'allowMultiple', false)) {
                        if (fc.fieldSchema[dataId].type === 'contentRadioList') {
                            return decodeURIComponent($('.fc-button.checked[formcorp-data-id="' + dataId + '"]').attr('data-field-value'));
                        }

                        // If a radio, can just get the button text
                        return $('.fc-button.checked[formcorp-data-id="' + dataId + '"]').text();
                    }

                    val = [];
                    // Otherwise if multiple are allowed, have to get all
                    $('.fc-button.checked[formcorp-data-id="' + dataId + '"]').each(function () {
                        val.push(decodeURIComponent($(this).attr('data-field-value')));
                    });

                    return val;
                }
            }

            // If a signature, set a string as the json value of the signature
            dataId = field.attr('fc-data-group');
            if ((fc.renderedSignatures !== undefined && fc.renderedSignatures[dataId] !== undefined) || field.hasClass(fc.config.signatureClass)) {
                if (dataId === undefined) {
                    // Attempt to load secondary data id if undefined (can run on parent and child element)
                    dataId = $(field).attr('formcorp-data-id');
                }

                if (fc.renderedSignatures !== undefined && fc.renderedSignatures[dataId] !== undefined) {
                    return fc.renderedSignatures[dataId].getSignatureString();
                }
            }

            return '';
        },

        /**
         * Returns true if a field is empty, false if not.
         * @param field
         * @returns {boolean}
         */
        fieldIsEmpty = function (field) {
            var value = getFieldValue(field);
            if (value === undefined) {
                return;
            }

            return !value || value.length === 0;
        },

        /**
         * Retrieve custom error validations from field.
         * @param field
         * @param value
         * @returns {Array}
         */
        getCustomErrors = function (field, value) {
            var errors = [],
                x,
                i,
                validator,
                callback,
                callbackSplit,
                error,
                type,
                callbackFunction,
                json;

            // If validators is a string (and starts with a json char to speed up), try to typecast to json
            if (typeof field.config.validators === "string" && ['[', '{'].indexOf(field.config.validators.substring(0, 1)) > -1) {
                try {
                    json = $.parseJSON(field.config.validators);
                    field.config.validators = json;
                } catch (ignore) {
                }
            }

            // If validators are set, attempt to validate
            if (typeof field.config.validators === 'object' && field.config.validators.length > 0) {
                for (x = 0; x < field.config.validators.length; x += 1) {
                    validator = field.config.validators[x];
                    type = fc.toCamelCase(validator.type);
                    callbackFunction = 'fc.validator' + type.substring(0, 1).toUpperCase() + type.substr(1);

                    // Convert string to function call
                    callback = window;
                    callbackSplit = callbackFunction.split('.');
                    for (i = 0; i < callbackSplit.length; i += 1) {
                        callback = callback[callbackSplit[i]];
                    }

                    // Call the callback function
                    if (!callback(validator.params, value)) {
                        error = typeof validator.error === 'string' && validator.error.length > 0 ? validator.error : fc.lang.defaultCustomValidationError;
                        errors.push(error);
                    }
                }
            }

            return errors;
        },

        /**
         * Returns a list of errors on a particular field.
         * @param id
         * @returns {Array}
         */
        fieldErrors = function (id) {
            var fieldSelector = $('.fc-field[fc-data-group="' + id + '"]'),
                dataId = id,
                section,
                field,
                value,
                errors = [],
                dataField,
                belongsTo,
                parentGrouplet,
                parentGroupletId,
                selector;

            if (fieldSelector.length === 0) {
                return [];
            }

            // If the field is hidden, not required to validate
            if (fieldSelector.hasClass('fc-hide')) {
                return [];
            }

            section = fieldSelector.parent();
            field = fc.fieldSchema[dataId];
            value = fc.fields[dataId] === undefined ? '' : fc.fields[dataId];

            // If section is hidden, return
            if (section.hasClass('fc-hide')) {
                return [];
            }

            // If belongs to a grouplet, and the parent grouplet is hidden, do not display
            selector = fieldSelector;
            do {
                belongsTo = selector.attr('fc-belongs-to');
                parentGrouplet = $('[fc-data-group="' + belongsTo + '"],[formcorp-data-id="' + belongsTo + '"]');

                // Fetch the id
                parentGroupletId = parentGrouplet.attr('fc-data-group');
                if (parentGroupletId === undefined) {
                    parentGroupletId = parentGrouplet.attr('formcorp-data-id');
                }

                // If an id/instance is defined, check if hidden (if hidden, do not render errors)
                if (parentGroupletId !== undefined) {
                    if (parentGrouplet.hasClass('fc-hide')) {
                        return [];
                    }
                    selector = $('[fc-data-group="' + belongsTo + '"],[formcorp-data-id="' + belongsTo + '"]');
                }
            } while (parentGroupletId !== undefined);

            // Test required data
            dataField = $('[fc-data-group="' + id + '"] [data-required="true"]');
            if (getConfig(field, 'required', false) && fieldIsEmpty(dataField)) {
                errors.push(fc.lang.emptyFieldError);
                return errors;
            }

            // Custom validators
            errors = errors.concat(getCustomErrors(field, value));

            return errors;
        },

        /**
         * Store an event locally to be logged
         * @param event
         * @param params
         */
        logEvent = function (event, params) {
            if (event === undefined) {
                return;
            }

            if (fc.analytics && fc.analytics.logEvent) {
                fc.analytics.logEvent(event, params);
            }
        },

        /**
         * Show the errors on the DOM for a given field.
         * @param dataId
         * @param errors
         */
        showFieldError = function (dataId, errors) {
            var dataGroup = $(fc.jQueryContainer).find('div[fc-data-group="' + dataId + '"]'),
                x,
                msg = '';

            // Trigger an event
            $(fc.jQueryContainer).trigger(fc.jsEvents.onFieldError, [dataId, errors]);

            dataGroup.addClass('fc-error');

            // If inline validation enabled, output error message(s)
            if (fc.config.inlineValidation === true) {
                for (x = 0; x < errors.length; x += 1) {
                    msg += errors[x] + '<br>';
                }
                dataGroup.find('.fc-error-text').html(msg);
            }
        },

        /**
         * Recursively retrieves grouplet field ids.
         * @param field
         * @returns {Array}
         */
        getGroupletFields = function (field) {
            if (field.type === "grouplet") {
                var grouplet = getConfig(field, "grouplet", {field: []}),
                    fieldIterator,
                    groupletField,
                    fields = [],
                    fieldId;

                /*jslint nomen: true*/
                fieldId = field._id.$id;
                /*jslint nomen: false*/

                for (fieldIterator = 0; fieldIterator < grouplet.field.length; fieldIterator += 1) {
                    groupletField = grouplet.field[fieldIterator];

                    // If grouplet within a groupler, need to recursively add
                    if (groupletField.type === "grouplet") {
                        fields.concat(getGroupletFields(groupletField));
                    } else {
                        /*jslint nomen: true*/
                        fields.push(fieldId + prefixSeparator + groupletField._id.$id);
                        /*jslint nomen: false*/
                    }
                }

                return fields;
            }

            return [];
        },

        /**
         * Returns the page id a field belongs to
         * @param fieldId
         * @returns {*}
         */
        getFieldPageId = function (fieldId) {
            if (fc.fieldPages === undefined) {
                fc.fieldPages = {};
            }

            if (fc.fieldPages[fieldId] !== undefined && typeof fc.fieldPages[fieldId] === "string") {
                return fc.fieldPages[fieldId];
            }

            var stageIterator, pageIterator, sectionIterator, fieldIterator, groupletIterator, page, section, field, groupletFields;

            for (stageIterator = 0; stageIterator < fc.schema.stage.length; stageIterator += 1) {
                for (pageIterator = 0; pageIterator < fc.schema.stage[stageIterator].page.length; pageIterator += 1) {
                    page = fc.schema.stage[stageIterator].page[pageIterator];
                    for (sectionIterator = 0; sectionIterator < page.section.length; sectionIterator += 1) {
                        if (typeof page.section[sectionIterator].field !== "object") {
                            continue;
                        }
                        section = page.section[sectionIterator];

                        for (fieldIterator = 0; fieldIterator < section.field.length; fieldIterator += 1) {
                            field = section.field[fieldIterator];
                            /*jslint nomen: true*/
                            fc.fieldPages[field._id.$id] = page._id.$id;
                            /*jslint nomen: false*/

                            // If field is a grouplet, need to get grouplet fields
                            if (field.type === "grouplet") {
                                groupletFields = getGroupletFields(field);
                                for (groupletIterator = 0; groupletIterator < groupletFields.length; groupletIterator += 1) {
                                    /*jslint nomen: true*/
                                    fc.fieldPages[groupletFields[groupletIterator]] = page._id.$id;
                                    /*jslint nomen: false*/
                                }
                            }
                        }
                    }
                }
            }

            if (fc.fieldPages[fieldId] !== undefined && typeof fc.fieldPages[fieldId] === "string") {
                return fc.fieldPages[fieldId];
            }

            return "";
        },

        /**
         * Remove the error on the DOM for a given field.
         * @param dataId
         */
        removeFieldError = function (dataId) {
            $(fc.jQueryContainer).trigger(fc.jsEvents.onFieldSuccess, [dataId]);
            $(fc.jQueryContainer).find('div[fc-data-group="' + dataId + '"]').removeClass('fc-error');
        },

        /**
         * 'god' fields do not require a value (i.e. rich text area)
         * @type {string[]}
         */
        godFields = ["richTextArea"],

        /**
         * Performs a simple check using the Luhn algorithm to determine if a credit card number is valid.
         * @param val
         * @returns {boolean}
         */
        luhnCheck = function (val) {
            var sum = 0, iterator, intVal;

            for (iterator = 0; iterator < val.length; iterator += 1) {
                intVal = parseInt(val.substr(iterator, 1), 10);
                if (iterator % 2 === 0) {
                    intVal *= 2;
                    if (intVal > 9) {
                        intVal = 1 + (intVal % 10);
                    }
                }
                sum += intVal;
            }
            return (sum % 10) === 0;
        },

        /**
         * Validate a credit card field
         * @param dataId
         * @param field
         * @param section
         * @returns {Array}
         */
        validCreditCardField = function (dataId, field, section) {
            var value = fc.fields[dataId] === undefined ? '' : fc.fields[dataId],
                errors = [],
                ccForm,
                cardName,
                cardNumber,
                expiryMonth,
                expiryYear,
                securityCode;

            // A value for the credit card indicates its all good (to be verified by server)
            if (value.length > 0) {
                return [];
            }

            // Fetch the cc form
            ccForm = $(fc.jQueryContainer).find('[fc-data-group="' + dataId + '"]');
            if (ccForm.length === 0) {
                console.log("[FC] Unable to locate CC form");
                return [];
            }

            // Map values to js variables
            cardName = ccForm.find('.fc-cc-name input');
            cardNumber = ccForm.find('.fc-cc-number input');
            expiryMonth = parseInt(ccForm.find('.fc-cc-expirydate option:selected').val(), 0);
            expiryYear = parseInt(ccForm.find('.fc-cc-expirydate-year option:selected').val(), 0);
            securityCode = ccForm.find('.fc-cc-ccv input');

            // Validate credit card name
            if (cardName.val().length === 0) {
                errors.push(fc.lang.creditCardMissingName);
            }

            // Validate credit card number
            cardNumber = cardNumber.val().replace(/[^0-9]/g, "", cardNumber);
            if (cardNumber.length === 0) {
                // Ensure a value was entered
                errors.push(fc.lang.creditCardMissingNumber);
            } else if (cardNumber.length < fc.config.creditCardNumberLimits[0] || cardNumber.length > fc.config.creditCardNumberLimits[1] || !luhnCheck(cardNumber)) {
                // Ensure the value was the correct limit
                errors.push(fc.lang.invalidCardFormat);
            }

            // Expiry - ensure values entered
            if (expiryMonth === undefined || expiryMonth.length === 0 || expiryYear === undefined || expiryYear.length === 0 || isNaN(expiryMonth) || isNaN(expiryYear)) {
                errors.push(fc.lang.creditCardMissingExpiryDate);
            } else if (expiryMonth < 1 || expiryMonth > 12) {
                // Check month within range 1 <= month <= 12
                errors.push(fc.lang.creditCardMissingExpiryDate);
            } else if (expiryYear < (new Date()).getFullYear() || expiryYear > ((new Date()).getFullYear() + 30)) {
                // Check year within range CURRENT_YEAR <= year <= (CURRENT_YEAR + 30)
                errors.push(fc.lang.creditCardMissingExpiryDate);
            } else if (expiryYear === (new Date()).getFullYear() && expiryMonth < ((new Date()).getMonth() + 1)) {
                errors.push(fc.lang.creditCardExpired);
            }

            // Validate security code - min and max length
            securityCode = securityCode.val().replace(/[^0-9]/g, "", securityCode);
            if (securityCode.length === 0 || securityCode.length > fc.config.maxCreditCardCodeLength) {
                errors.push(fc.lang.creditCardMissingSecurityCode);
            }

            return errors;
        },

        /**
         * Returns true if a field element exists within a modal window
         * @param obj
         * @returns {boolean}
         */
        inModal = function (obj) {
            return obj.parent().parent().parent().parent().attr("class").indexOf("fc-repeatable-container") > -1;
        },

        /**
         * Check the validity of the entire form.
         * @param rootElement
         * @returns {boolean}
         */
        validForm = function (rootElement, showErrors) {
            var errors = {},
                required;

            if (rootElement === undefined) {
                rootElement = fc.jQueryContainer;
            }

            // Whether to update the DOM with the errors or just return a bool
            if (typeof showErrors !== "boolean") {
                showErrors = true;
            }

            // Test if required fields have a value
            $(rootElement).find('.fc-field[fc-data-group]').each(function () {
                // If a repeatable field, ignore
                if ($(this).parent().attr("class").indexOf("repeatable") > -1) {
                    return;
                }

                // If the field is hidden, not required to validate
                if ($(this).hasClass('fc-hide')) {
                    return;
                }

                // If in modal, do nothing
                if (inModal($(this))) {
                    return;
                }

                var dataId = $(this).attr('fc-data-group'),
                    section = $(this).parent(),
                    field = fc.fieldSchema[dataId],
                    value = fc.fields[dataId] === undefined ? '' : fc.fields[dataId],
                    localErrors = [],
                    skipCheck = false;

                // If not required, do nothing
                if (getConfig(field, 'required', false) === false || getConfig(field, 'readOnly', false)) {
                    return;
                }

                // Check if the field requires a value
                if (typeof field.type === 'string' && godFields.indexOf(field.type) !== -1) {
                    return;
                }

                // If section is hidden, return
                if (section.hasClass('fc-hide')) {
                    return;
                }

                // If a credit card payment field, treat uniquely
                if (field.type === "creditCard") {
                    if (value.length === 0) {
                        localErrors.push(fc.lang.paymentRequired);
                    }
                    skipCheck = true;
                } else if (["emailVerification", "smsVerification"].indexOf(field.type) > -1) {
                    // If email or sms verification, check if verified
                    if (fc.fields[getId(field)] === undefined || fc.fields[getId(field)] !== '1') {
                        localErrors.push(fc.lang.fieldMustBeVerified);
                    } else {
                        // Successfully verified
                        skipCheck = true;
                    }
                } else if (field.type === "signature") {
                    // Signature fields need to be uniquely validated
                    if (fc.renderedSignatures === undefined || fc.renderedSignatures[dataId] === undefined) {
                        // Signature hasn't been initialised
                        localErrors.push("Field has not been initialised");
                    } else {
                        if (fc.renderedSignatures[dataId].validateForm() === false) {
                            // Attempt to validate the field
                            localErrors.push(fc.lang.emptyFieldError);
                        } else {
                            // Store the value
                            fc.fields[dataId] = fc.renderedSignatures[dataId].getSignatureString();
                        }
                    }
                    skipCheck = true;

                } else if (field.type === "grouplet") {
                    // Grouplet field as a whole doesn't need to be validated
                    return;
                }

                // If repeatable and required, check the amount of values
                if (!skipCheck && localErrors.length === 0) {
                    if (field.config !== undefined && typeof field.config.repeatable === 'boolean' && field.config.repeatable) {
                        required = $(this).attr('data-required');
                        if (required === 'true' && (typeof value !== 'object' || value.length === 0)) {
                            localErrors.push(fc.lang.emptyFieldError);
                        }
                    } else {
                        localErrors = fieldErrors(dataId);
                    }
                }

                // If have errors, output
                if (localErrors.length > 0) {
                    // Log error event
                    logEvent(fc.eventTypes.onFieldError, {
                        fieldId: dataId,
                        errors: localErrors
                    });

                    errors[dataId] = localErrors;
                    if (showErrors) {
                        showFieldError(dataId, localErrors);
                    }
                } else {
                    if (showErrors) {
                        removeFieldError(dataId);
                    }
                }
            });

            // Terminate when errors exist
            if (Object.keys(errors).length > 0) {
                return false;
            }
            return true;
        },

        /**
         * Finds and returns a page by its id.
         * @param pageId
         * @returns {*}
         */
        getPageById = function (pageId) {
            if (typeof fc.pages[pageId] === 'object') {
                return fc.pages[pageId];
            }

            var x,
                y,
                stage,
                page;

            for (x = 0; x < fc.schema.stage.length; x += 1) {
                stage = fc.schema.stage[x];
                if (typeof stage.page === 'object' && stage.page.length > 0) {
                    for (y = 0; y < stage.page.length; y += 1) {
                        page = stage.page[y];
                        /*jslint nomen: true*/
                        if (fc.pages[page._id.$id] === undefined) {
                            fc.pages[page._id.$id] = {
                                stage: stage,
                                page: page
                            };
                        }
                        /*jslint nomen: false*/
                    }
                }
            }

            return getPageById(pageId);
        },

        /**
         * Creates a dictionary of values for a grouplet against the original id.
         *
         * @param key
         * @param value
         */
        saveOriginalGroupletValue = function (key, value) {
            var parts, groupletId, fieldId;

            if (key.indexOf(prefixSeparator) > -1) {
                parts = key.split(prefixSeparator);
                if (parts.length > 1) {
                    // Retrieve the grouplet id second from the end
                    groupletId = parts[parts.length - 2];
                    fieldId = parts[parts.length - 1];

                    if (fc.fields[groupletId] === undefined) {
                        fc.fields[groupletId] = {};
                    }
                    fc.fields[groupletId][fieldId] = value;
                }
            }
        },

        /**
         * Converts an object to a literal boolean object string.
         * @param obj
         * @returns {*}
         */
        toBooleanLogic = function (obj) {
            var condition = '',
                x,
                rule,
                comparison,
                compare = '',
                json;

            if (!obj) {
                return;
            }

            if (obj.condition !== undefined) {
                compare = obj.condition.toLowerCase() === 'and' ? ' && ' : ' || ';
            }

            if (typeof obj.rules === 'object') {
                condition += '(';
                for (x = 0; x < obj.rules.length; x += 1) {
                    rule = obj.rules[x];

                    if (rule.condition !== undefined) {
                        rule.condition = rule.condition.toLowerCase() === 'and' ? ' && ' : ' || ';
                    } else {
                        rule.condition = compare;
                    }

                    // Optimise the AND/OR clause
                    if (rule.condition.length === 0) {
                        // Default to AND condition
                        rule.condition = ' && ';
                    }
                    if (x === 0) {
                        rule.condition = '';
                    }

                    // If have a comparison, add it to our condition string
                    if (typeof rule.field === 'string' && rule.value !== undefined) {
                        // Comparison function to call
                        comparison = 'fc.comparison';
                        if (typeof rule.operator === 'string' && rule.operator.length > 0) {
                            comparison += rule.operator.charAt(0).toUpperCase() + rule.operator.slice(1);
                        }

                        // Attempt to typecast to object from string
                        if (typeof rule.value === 'string' && ['[', '{'].indexOf(rule.value.substring(0, 1)) > -1) {
                            try {
                                json = $.parseJSON(rule.value);
                                rule.value = json;
                            } catch (ignore) {
                            }
                        }

                        // If object, cast to JSON string
                        if (typeof rule.value === 'object') {
                            rule.value = JSON.stringify(rule.value);
                        } else if (typeof rule.value === 'string') {
                            rule.value = '"' + rule.value + '"';
                        }

                        condition += rule.condition + comparison + '(fc.fields["' + rule.field + '"], ' + rule.value + ')';
                    }

                    // If have nested rules, call recursively
                    if (typeof rule.rules === 'object' && rule.rules.length > 0) {
                        condition += rule.condition + toBooleanLogic(rule);
                    }
                }
                condition += ')';
            }

            return condition;
        },

        /**
         * Update schema definitions for a set of fields
         * @param fields
         */
        updateFieldSchemas = function (fields) {
            var iterator, field, id, a, jsonDecode = ['visibility', 'validators'], toBoolean = ['visibility'], grouplet;

            for (iterator = 0; iterator < fields.length; iterator += 1) {
                field = fields[iterator];
                /*jslint nomen: true*/
                id = field._id.$id;
                /*jslint nomen: false*/

                // Add t field schema if doesn't already exist
                if (fc.fieldSchema[id] === undefined) {
                    // Decode configuration strings to json objects as required
                    for (a = 0; a < jsonDecode.length; a += 1) {
                        if (field.config[jsonDecode[a]] !== undefined && field.config[jsonDecode[a]].length > 0) {
                            field.config[jsonDecode[a]] = $.parseJSON(field.config[jsonDecode[a]]);

                            // Whether or not the object needs to be converted to boolean logic
                            if (toBoolean.indexOf(jsonDecode[a]) >= 0) {
                                field.config[jsonDecode[a]] = toBooleanLogic(field.config[jsonDecode[a]], true);
                            }
                        }
                    }

                    fc.fieldSchema[id] = field;
                }

                // If the field is a grouplet, need to recursively update the field schema
                if (field.type === "grouplet") {
                    grouplet = getConfig(field, 'grouplet', {field: []});
                    updateFieldSchemas(grouplet.field);
                }
            }
        },

        /**
         * Initialise data analytics
         */
        initAnalytics = function () {
            $(fc.jQueryContainer).on(fc.jsEvents.onAnalyticsLoaded, function () {
                fc.analytics = fcAnalytics;
                fc.analytics.init();
            });
            loadJsFile(analyticsUrl);
        },

        /**
         * Update field schema (object stores the configuration of each field for easy access)
         * @param stage
         */
        updateFieldSchema = function (stage) {
            var jsonDecode = ['visibility', 'validators'],
                toBoolean = ['visibility'],
                x,
                y,
                key,
                page,
                section,
                a;

            if (stage.page !== undefined) {
                // Iterate through each page
                for (x = 0; x < stage.page.length; x += 1) {
                    page = stage.page[x];
                    if (page.section === undefined) {
                        continue;
                    }

                    // Convert page to conditions to JS boolean logic
                    if (typeof page.toCondition === 'object' && Object.keys(page.toCondition).length > 0) {
                        for (key in page.toCondition) {
                            if (page.toCondition.hasOwnProperty(key)) {
                                try {
                                    page.toCondition[key] = toBooleanLogic($.parseJSON(page.toCondition[key]));
                                } catch (ignore) {
                                }
                            }
                        }
                    }

                    // Iterate through each section
                    for (y = 0; y < page.section.length; y += 1) {
                        section = page.section[y];
                        if (section.field === undefined || section.field.length === 0) {
                            continue;
                        }

                        // Are any object keys required to be decoded to a json object?
                        for (a = 0; a < jsonDecode.length; a += 1) {
                            if (typeof section[jsonDecode[a]] === 'string') {
                                try {
                                    section[jsonDecode[a]] = $.parseJSON(section[jsonDecode[a]]);
                                } catch (ignore) {
                                }
                            }
                        }

                        // Are any object keys required to be converted to boolean logic?
                        for (a = 0; a < toBoolean.length; a += 1) {
                            if (typeof section[toBoolean[a]] === 'object') {
                                section[toBoolean[a]] = toBooleanLogic(section[toBoolean[a]]);
                            }
                        }

                        // Append to object sections dictionary
                        /*jslint nomen: true*/
                        if (fc.sections[section._id.$id] === undefined) {
                            fc.sections[section._id.$id] = section;
                        }
                        /*jslint nomen: false*/

                        // Iterate through each field
                        updateFieldSchemas(section.field);
                    }
                }
            }
        },

        /**
         * Retrieves list of tags from a grouplet (used for templating)
         * @param fieldId
         * @returns {*}
         */
        getGroupletTags = function (fieldId) {
            var schema = fc.fieldSchema[fieldId],
                field,
                tags = {},
                counter,
                localField,
                tag;

            if (schema === undefined || schema.type !== "grouplet") {
                return [];
            }

            // Iterate through each field in the grouplet, if it has a tag, append to dict
            field = getConfig(schema, "grouplet");
            if (typeof field === "object" && field.field !== undefined && field.field.length > 0) {
                for (counter = 0; counter < field.field.length; counter += 1) {
                    localField = field.field[counter];
                    tag = getConfig(localField, "tag", "");
                    if (tag.length > 0) {
                        /*jslint nomen: true*/
                        tags[localField._id.$id] = tag;
                        /*jslint nomen: false*/
                    }
                }
            }

            return tags;
        },

        /**
         * Returns an array of values next to field's associated tags. Used for templating.
         *
         * @param row
         * @param tags
         * @returns {*}
         */
        getGroupletRowTags = function (row, tags) {
            var key, fieldIdParts, fieldId, vals = {};
            if (typeof row === "object") {
                for (key in row) {
                    if (row.hasOwnProperty(key)) {
                        // If the id is prefixed (i.e. grouplet-id_field-id), retrieve the field id
                        if (key.indexOf(prefixSeparator) > -1) {
                            fieldIdParts = key.split(prefixSeparator);
                            fieldId = fieldIdParts[fieldIdParts.length - 1];
                        } else {
                            fieldId = key;
                        }

                        // If a tag exists, add it
                        if (tags.hasOwnProperty(fieldId)) {
                            vals[tags[fieldId]] = row[key];
                        } else {
                            // Otherwise default to the field id
                            vals[fieldId] = row[key];
                        }
                    }
                }
            }

            return vals;
        },

        /**
         * Replace tokens with their value, for templating
         * @param layout
         * @param tokens
         * @returns {*}
         */
        replaceTokens = function (layout, tokens) {
            var replacements = layout.match(/\{\{([^\}]{0,})\}\}/g),
                replacement,
                token,
                index,
                re;

            for (index = 0; index < replacements.length; index += 1) {
                replacement = replacements[index];
                token = replacement.replace(/[\{\}]/g, "");
                re = new RegExp('\\{\\{' + token + '\\}\\}', "gi");

                // If the token exists, perform the replacement, else set to empty
                if (tokens.hasOwnProperty(token)) {
                    layout = layout.replace(re, tokens[token]);
                } else {
                    layout = layout.replace(re, "");
                }
            }

            return layout;
        },

        /**
         * Retrieve the payment amount for a credit card field, based on the default and conditional parameters
         *
         * @param fieldId
         * @returns {*}
         */
        getPaymentAmount = function (fieldId) {
            var schema, price, conditionalPrices, booleanLogic, conditionalPrice, iterator;

            // Retrieve the field schema
            schema = fc.fieldSchema[fieldId];
            if (schema === undefined) {
                return;
            }

            // Use the default price initially
            price = getConfig(schema, 'defaultPrice', 0);

            // Check to see if conditional prices were supplied and, if so iterate through them
            conditionalPrices = getConfig(schema, 'conditionalPrice', [], true);
            if (typeof conditionalPrices === "object" && conditionalPrices.length > 0) {
                for (iterator = 0; iterator < conditionalPrices.length; iterator += 1) {
                    conditionalPrice = conditionalPrices[iterator];

                    // If conditions passed through, check if true
                    if (typeof conditionalPrice.conditions === "object") {
                        booleanLogic = toBooleanLogic(conditionalPrice.conditions);
                        if (eval(booleanLogic)) {
                            price = conditionalPrice.price;
                        }
                    }
                }
            }

            return price;
        },

        /**
         * Renders a repeatable table
         * @param fieldId
         * @param rows
         * @returns {string}
         */
        renderRepeatableTable = function (fieldId, rows) {
            var html = '',
                index,
                tags = getGroupletTags(fieldId),
                field = fc.fieldSchema[fieldId],
                layout = getConfig(field, "summaryLayout", "");

            // Requires a summary layout to work
            if (layout.length === 0) {
                return "";
            }

            // Start the html output
            html += "<div class='fc-summary-table'>";
            html += "<table class='fc-summary'><tbody>";

            // Iterate through and render each row
            for (index = 0; index < rows.length; index += 1) {
                html += "<tr><td>opt</td><td>";
                html += replaceTokens(layout, getGroupletRowTags(rows[index], tags));
                html += "<div class='fc-summary-options' data-field-id='" + fieldId + "' data-index='" + index + "'><a href='#' class='fc-edit'>" + fc.lang.edit + "</a> &nbsp; <a href='#' class='fc-delete'>" + fc.lang.delete + "</a></div>";
                html += "</td></tr>";
            }
            html += "</tbody></table>";

            html += '</div>';
            return html;
        },

        /**
         * Set values on DOM from fields in JS
         */
        setFieldValues = function () {
            var fieldId,
                fieldGroup,
                value,
                schema,
                selector,
                iterator,
                el;

            $('div[fc-data-group]').each(function () {
                fieldId = $(this).attr('fc-data-group');

                if (fc.fields[fieldId] !== undefined) {
                    fieldGroup = $(this).find('.fc-fieldgroup');
                    value = fc.fields[fieldId];
                    schema = fc.fieldSchema[fieldId];

                    // If read-only and a default value set, use it
                    if (getConfig(schema, 'readOnly', false)) {
                        value = getConfig(schema, 'defaultValue', '');
                    }

                    if (typeof schema.config.repeatable === 'boolean' && schema.config.repeatable) {
                        // Restore a repeatable value
                        if (typeof value === 'object') {
                            $('[fc-data-group="' + fieldId + '"] .fc-summary').html(renderRepeatableTable(fieldId, value));
                        }
                    } else if (fieldGroup.find('input[type=text],textarea').length > 0) {
                        // Input type text
                        fieldGroup.find('input[type=text],textarea').val(value);
                    } else if (fieldGroup.find('select').length > 0) {
                        // Select box
                        fieldGroup.find('select').val(value);
                    } else if (fieldGroup.find('input[type=radio]').length > 0) {
                        // Radio options
                        fieldGroup.find('input[value="' + value + '"]').prop('checked', true);
                    } else {
                        // Set the button
                        selector = fieldGroup.find('.fc-fieldinput.fc-button[data-value="' + encodeURIComponent(value) + '"]');
                        if (selector.length > 0) {
                            selector.addClass('checked');
                        }
                    }

                    // If a content-option group, set the values accordingly
                    if (schema.type === 'contentRadioList') {
                        if (typeof value === 'object') {
                            // Checkbox list allows multiple selections
                            for (iterator = 0; iterator < value.length; iterator += 1) {
                                el = $('.fc-button[data-field-value="' + encodeURIComponent(value[iterator]) + '"]');
                                if (el && el.length > 0) {
                                    el.addClass('checked');
                                }
                            }
                        } else {
                            // Radio list allows only one selection
                            el = $('.fc-button[data-field-value="' + encodeURIComponent(value) + '"]');
                            if (el && el.length > 0) {
                                el.addClass('checked');
                            }
                        }
                    }
                }
            });
        },

        /**
         * Render a text field.
         * @param field
         * @returns {string}
         */
        renderTextfield = function (field, prefix) {
            if (prefix === undefined) {
                prefix = "";
            }

            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                fieldId = prefix + field._id.$id,
                html = '<input class="fc-fieldinput" type="text" formcorp-data-id="' + fieldId + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '">';
            /*jslint nomen: false*/
            return html;
        },

        /**
         * Render a dropdown field.
         * @param field
         * @returns {string}
         */
        renderDropdown = function (field, prefix) {
            if (prefix === undefined) {
                prefix = "";
            }

            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                fieldId = prefix + field._id.$id,
                html = '<select class="fc-fieldinput" formcorp-data-id="' + fieldId + '" data-required="' + required + '">',
                options = getConfig(field, 'options', ''),
                optGroupOpen = false,
                x,
                option,
                label;
            /*jslint nomen: false*/

            if (getConfig(field, 'placeholder', '').length > 0) {
                html += '<option value="" disabled selected>' + htmlEncode(getConfig(field, 'placeholder')) + '</option>';
            }

            if (options.length > 0) {
                options = options.split("\n");
                for (x = 0; x < options.length; x += 1) {
                    option = options[x];
                    option = option.replace(/(\r\n|\n|\r)/gm, "");
                    if (option.match(/^\[\[(.*?)\]\]$/g)) {
                        // Opt group tag
                        if (optGroupOpen) {
                            html += "</optgroup>";
                        }
                        label = option.substring(2, option.length - 2);
                        html += '<optgroup label="' + label + '">';
                    } else {
                        // Normal option tag
                        html += '<option value="' + htmlEncode(option) + '">' + htmlEncode(option) + '</option>';
                    }
                }

                if (optGroupOpen) {
                    html += '</optgroup>';
                }
            }

            html += '</select>';
            return html;
        },

        /**
         * Render a text area field.
         * @param field
         * @returns {string}
         */
        renderTextarea = function (field, prefix) {
            if (prefix === undefined) {
                prefix = "";
            }
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                fieldId = prefix + getId(field),
                html,
                value;

            // Default value
            value = getConfig(field, 'defaultValue', '').length > 0 ? getConfig(field, 'defaultValue') : '';
            html = '<textarea';

            // Whether or not the field is read only
            if (getConfig(field, 'readOnly', false)) {
                html += ' readonly';
            }

            html += ' class="fc-fieldinput" formcorp-data-id="' + fieldId + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '" rows="' + getConfig(field, 'rows', 3) + '">' + htmlEncode(value) + '</textarea>';
            return html;
        },

        /**
         * Render the content radio list
         * @param field
         * @param prefix
         * @returns {string}
         */
        renderContentRadioList = function (field, prefix) {
            if (!prefix) {
                prefix = '';
            }

            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                options = getConfig(field, 'options', ''),
                fieldId = prefix + field._id.$id,
                html = '',
                x,
                cssClass,
                option,
                checked,
                json,
                value,
                description,
                help,
                icon;
            /*jslint nomen: false*/

            if (options.length > 0) {
                options = options.split("\n");
                cssClass = getConfig(field, 'inline', false) === true ? 'fc-inline' : 'fc-block';

                html += '<div class="fc-col-' + htmlEncode(getConfig(field, 'boxesPerRow')) + '">';

                // Display as buttons
                for (x = 0; x < options.length; x += 1) {
                    option = options[x].replace(/(\r\n|\n|\r)/gm, "");

                    // Decode to a json object literal
                    description = "";
                    help = "";
                    value = "";
                    icon = "";
                    json = $.parseJSON(option);

                    // Map to local variables
                    try {
                        value = json[0] || "";
                        description = json[1] || "";
                        icon = json[2] || "";
                        help = json[3] || "";
                    } catch (ignore) {
                    }
                    checked = getConfig(field, 'default') === option ? ' checked' : '';

                    html += '<div class="fc-content-radio-item fc-col">';
                    html += '<div class="fc-content-title">' + htmlEncode(value) + '</div>'; //!fc-content-title
                    html += '<div class="fc-content-content">';
                    html += '<div class="fc-content-desc">' + description + '</div>'; //!fc-content-desc
                    html += '<div class="fc-content-icon"><i class="' + htmlEncode(icon) + '"></i></div>'; //!fc-content-icon
                    html += '<div class="fc-option-buttons ' + cssClass + '">';
                    html += '<button class="fc-fieldinput fc-button" id="' + getId(field) + '_' + x + '" formcorp-data-id="' + fieldId + '" data-value="' + encodeURIComponent(option) + '" data-field-value="' + encodeURIComponent(value) + '" data-required="' + required + '"' + checked + '>' + htmlEncode(getConfig(field, 'buttonText')) + '</button>';

                    if (help && help.length > 0) {
                        html += '<div class="fc-help">' + help + '</div>';
                    }

                    html += '</div>'; // !fc-content-content
                    html += '</div>'; //!fc-option-buttons
                    html += '</div>'; //!fc-content-radio-item
                }

                html += '</div>'; //!fc-col-x
            }

            return html;
        },

        /**
         * Render a radio list.
         * @param field
         * @returns {string}
         */
        renderRadioList = function (field, prefix) {
            if (prefix === undefined) {
                prefix = "";
            }

            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                options = getConfig(field, 'options', ''),
                fieldId = prefix + field._id.$id,
                html = '',
                x,
                cssClass,
                option,
                id,
                checked;
            /*jslint nomen: false*/

            if (options.length > 0) {
                options = options.split("\n");
                cssClass = getConfig(field, 'inline', false) === true ? 'fc-inline' : 'fc-block';

                if (getConfig(field, 'asButton', false)) {
                    html += '<div class="fc-radio-option-buttons">';

                    // Display as buttons
                    for (x = 0; x < options.length; x += 1) {
                        option = options[x].replace(/(\r\n|\n|\r)/gm, "");

                        checked = getConfig(field, 'default') === option ? ' checked' : '';

                        html += '<div class="fc-option-buttons ' + cssClass + '">';
                        html += '<button class="fc-fieldinput fc-button" id="' + getId(field) + '_' + x + '" formcorp-data-id="' + fieldId + '" data-value="' + encodeURIComponent(option) + '" data-required="' + required + '"' + checked + '>' + htmlEncode(option) + '</button>';
                        html += '</div>';
                    }
                    html += '</div>';

                } else {
                    // Display as standard radio buttons

                    for (x = 0; x < options.length; x += 1) {
                        option = options[x].replace(/(\r\n|\n|\r)/gm, "");
                        /*jslint nomen: true*/
                        id = field._id.$id + '_' + x;
                        /*jslint nomen: false*/
                        checked = getConfig(field, 'default') === option ? ' checked' : '';

                        html += '<div class="' + cssClass + '">';
                        html += '<input class="fc-fieldinput" type="radio" id="' + id + '" formcorp-data-id="' + fieldId + '" name="' + fieldId + '" value="' + htmlEncode(option) + '" data-required="' + required + '"' + checked + '>';
                        html += '<label for="' + id + '">' + htmlEncode(option) + '</label>';
                        html += '</div>';
                    }
                }
            }

            return html;
        },

        /**
         * Render a checkbox list.
         * @param field
         * @returns {string}
         */
        renderCheckboxList = function (field, prefix) {
            if (prefix === undefined) {
                prefix = "";
            }

            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                options = getConfig(field, 'options', ''),
                fieldId = prefix + field._id.$id,
                html = '',
                cssClass,
                x,
                option,
                id,
                json,
                savedValues = [];
            /*jslint nomen: false*/

            // Create an array of the field's values
            if (fc.fields[fieldId] !== undefined && typeof fc.fields[fieldId] === "string") {
                try {
                    json = $.parseJSON(fc.fields[fieldId]);
                    savedValues = json;
                } catch (ignore) {
                }
            } else if (typeof fc.fields[fieldId] === "object") {
                savedValues = fc.fields[fieldId];
            }

            if (options.length > 0) {
                options = options.split("\n");
                cssClass = getConfig(field, 'inline', false) === true ? 'fc-inline' : 'fc-block';
                for (x = 0; x < options.length; x += 1) {
                    option = options[x].replace(/(\r\n|\n|\r)/gm, "");
                    /*jslint nomen: true*/
                    id = field._id.$id + '_' + x;
                    /*jslint nomen: false*/

                    html += '<div class="' + cssClass + '">';
                    html += '<input class="fc-fieldinput" type="checkbox" id="' + id + '" formcorp-data-id="' + fieldId + '" name="' + fieldId + '[]" value="' + htmlEncode(option) + '" data-required="' + required + '"';

                    if (savedValues.indexOf(option) > -1) {
                        html += ' checked="checked"';
                    }

                    html += '>';
                    html += '<label for="' + id + '">' + htmlEncode(option) + '</label>';
                    html += '</div>';
                }
            }

            return html;
        },

        /**
         * Render a hidden field.
         * @param field
         * @returns {string}
         */
        renderHiddenField = function (field, prefix) {
            if (prefix === undefined) {
                prefix = "";
            }

            /*jslint nomen: true*/
            var fieldId = prefix + field._id.$id,
                html = '<input class="fc-fieldinput" type="hidden" formcorp-data-id="' + fieldId + '" value="' + getConfig(field, 'value') + '">';
            /*jslint nomen: false*/
            return html;
        },

        /**
         * Render a rich text area.
         * @param field
         * @returns {*}
         */
        renderRichText = function (field) {
            if (typeof field.config.rich !== 'string') {
                return '';
            }

            return '<div class="fc-richtext">' + field.config.rich + '</div>';
        },

        /**
         * Creates a dynamic form ready to send to a payment gateway
         * @param dataId
         * @param gateway
         * @param data
         * @returns {*|HTMLElement}
         */
        createDynamicFormFromData = function (dataId, gateway, data) {
            var form, input, key, schema, url;

            // Fetch the field schema
            schema = fc.fieldSchema[dataId];
            if (schema === undefined) {
                return;
            }

            // Check to see if should use the live or sandbox url
            url = getConfig(schema, 'environment', fc.environments.sandbox) === fc.environments.sandbox ? gateway.action.sandbox : gateway.action.live;

            // Instantiate the form
            form = $(document.createElement('form'));
            $(form).attr("action", url);
            $(form).attr("method", gateway.method);

            // Create the form attributes
            for (key in data) {
                if (data.hasOwnProperty(key)) {
                    input = $("<input>").attr("type", "hidden").attr("name", key).val(data[key]);
                    $(form).append($(input));
                }
            }


            return $(form);
        },

        /**
         * Send the payment request to formcorp
         * @param rootElement
         * @param gateway
         * @returns {boolean}
         */
        initPaycorpGateway = function (rootElement, gateway) {
            var data, form, month, cardType, cardNumber;

            // Ensure the client id is all good
            if (gateway.vars === undefined || typeof gateway.vars.clientId !== "string" || gateway.vars.clientId.length === 0) {
                console.log("Malformed paycorp client id");
            }

            // Format the month
            month = rootElement.find('.fc-cc-expirydate-month').val();
            if (month.length === 1) {
                month = '0' + month;
            }

            // Retrieve the card number and type
            cardNumber = rootElement.find('.fc-cc-number input').val().replace(/[^0-9]+/g, "");
            switch (getCreditCardType(cardNumber)) {
            case fc.cardTypes.mastercard:
                cardType = 'MASTERCARD';
                break;
            case fc.cardTypes.visa:
                cardType = 'VISA';
                break;
            case fc.cardTypes.amex:
                cardType = 'AMEX';
                break;
            default:
                cardType = 'MASTERCARD';
            }

            // Prepare the data to send to paycorp
            data = {
                clientIdHash: gateway.vars.clientId,
                cardType: cardType,
                cardHolderName: rootElement.find('.fc-cc-name input').val(),
                cardNo: cardNumber,
                cardExpiryMM: month,
                cardExpiryYYYY: rootElement.find('.fc-cc-expirydate-year').val(),
                cardSecureId: rootElement.find('.fc-cc-ccv input').val().replace(/[^0-9]+/g, ""),
                paymentAmount: getPaymentAmount(rootElement.attr('fc-data-group')),
                metaData1: rootElement.attr('fc-data-group'),
                metaData2: fc.sessionId
            };

            // Automatically generate a form
            form = createDynamicFormFromData(rootElement.attr('fc-data-group'), fc.gateways.paycorp, data);
            form.submit();

            return false;
        },

        /**
         * Register the event listeners for processing credit card payments
         */
        registerCreditCardListeners = function () {
            // Button to process a payment
            $(fc.jQueryContainer).on('click', '.fc-submit-payment .fc-btn', function () {
                var dataObjectId, rootElement, gateway, schema, localErrors;

                // Retrieve the field id the payment form belongs to
                dataObjectId = $(this).attr('data-for');
                if (dataObjectId === undefined) {
                    return false;
                }
                // Fetch the root credit card instance
                rootElement = $('[fc-data-group="' + dataObjectId + '"]');
                if (rootElement.length === 0) {
                    return false;
                }

                // Fetch the field schema
                schema = fc.fieldSchema[dataObjectId];
                if (schema === undefined) {
                    return false;
                }

                // Validate the payment form before going any further
                localErrors = validCreditCardField(dataObjectId, schema, rootElement.parent());
                // If have errors, output
                if (localErrors.length > 0) {
                    // Log error event
                    logEvent(fc.eventTypes.onFieldError, {
                        fieldId: dataObjectId,
                        errors: localErrors
                    });

                    // Show the error and return
                    showFieldError(dataObjectId, localErrors);
                    return false;
                }

                removeFieldError(dataObjectId);

                // What gateway to use
                gateway = getConfig(schema, 'paymentGateway', {}, true);
                if (typeof gateway.gateway !== "string") {
                    return false;
                }

                // What to do?
                switch (gateway.gateway) {
                case "paycorp":
                    initPaycorpGateway(rootElement, gateway);
                    break;
                default:
                    console.log("No gateway to use");
                    break;
                }

                return false;
            });

            fc.processedActions[fc.processes.creditCardListeners] = true;
        },

        /**
         * Render the payment summary table
         * @param field
         * @returns {string}
         */
        renderPaymentSummary = function (field) {
            var html, price;

            price = parseFloat(getPaymentAmount(getId(field))).toFixed(2);

            html = "<div class='fc-table-summary'>";

            // Render the payment summary title as required
            if (getConfig(field, 'paymentSummaryTitle', '').length > 0) {
                html += '<label>' + htmlEncode(getConfig(field, 'paymentSummaryTitle', '')) + '</label>';
            }

            // Render the payment summary description as required
            if (getConfig(field, 'paymentSummaryDescription', '').length > 0) {
                html += '<label>' + getConfig(field, 'paymentSummaryDescription', '') + '</label>';
            }

            html += '<table class="fc-table fc-summary"><thead><tr>';
            html += '<th>' + fc.lang.description + '</th><th class="fc-total">' + fc.lang.total + '</th></tr></thead>';

            // Table body
            html += '<tbody>';
            html += '<tr><td>' + fc.lang.paymentDescription + '<em class="fc-text-right fc-right">' + fc.lang.paymentSubTotal + '</em>';
            html += '</td><td>' + fc.lang.currencySymbol.concat(parseFloat(price / 11 * 10).toFixed(2)) + '</td></tr>';

            // Include the gst?
            if (getConfig(field, 'includeGST', false)) {
                html += '<tr><td class="fc-text-right"><em>' + fc.lang.paymentGst + '</em></td><td>';
                html += fc.lang.currencySymbol.concat(parseFloat(price / 11).toFixed(2)) + '</td></tr>';
            }

            html += '<tr><td class="fc-text-right"><em>' + fc.lang.paymentTotal + '</em></td><td>' + fc.lang.currencySymbol.concat(price) + '</td></tr>';
            html += '</tbody>';

            html += '</table>';
            html += '</div>';
            /*!fc-table-summary*/

            return html;
        },

        /**
         * Render a credit card form
         * @param field
         * @returns {string}
         */
        renderCreditCard = function (field) {
            var html = '',
                month,
                year,
                currentYear = (new Date()).getFullYear(),
                fieldValue,
                error;

            // Render the payment summary
            if (getConfig(field, 'showPaymentSummary', false)) {
                html += renderPaymentSummary(field);
            }

            // Render the label
            html += '<div class="fc-creditCard-header">';
            if (getConfig(field, 'showLabel', false) === true && getConfig(field, 'label', '').length > 0) {
                // Show the label
                html += '<label>' + htmlEncode(getConfig(field, 'label')) + '</label>';
            }

            if (getConfig(field, 'label', '').length > 0) {
                // Show the description
                html += getConfig(field, 'description');
            }

            html += '</div>';
            /*!fc-creditCard-header*/


            // Retrieve the field value and check to see if it's completed
            fieldValue = fc.fields[getId(field)];
            if (fieldValue !== undefined && fieldValue.length > 0) {
                // Successfully been completed, return a completion message
                html += '<div class="fc-payment">';
                html += '<div class="fc-success">' + fc.lang.creditCardSuccess + '</div>';
                html += '</div>';

                return html;
            }

            // If an error was passed through, check
            error = fc.getUrlParameter(fc.config.creditCardErrorUrlParam);
            if (error !== undefined && error.length > 0) {
                html += '<div class="fc-error"><label>' + htmlEncode(error) + '</label></div>';
            }

            // Register the credit card event listeners if not already done so
            if (!processed(fc.processes.creditCardListeners)) {
                registerCreditCardListeners();
            }

            // Initialise basic components
            html += '<div class="fc-payment">';
            html += '<div class="fc-cc-name"><label>' + fc.lang.creditCardNameText + '</label><input type="text" class="fc-fieldinput"></div>';
            html += '<div class="fc-cc-number"><label>' + fc.lang.creditCardNumberText + '</label><input type="text" class="fc-fieldinput"></div>';

            // Render the expiry dates
            html += '<div class="fc-cc-expirydate"><label>' + fc.lang.creditCardExpiryDateText + '</label>';
            html += '<select class="fc-cc-expirydate-month"><option value="" disabled selected>Please select...</option>';
            for (month = 1; month <= 12; month += 1) {
                html += '<option value="' + month + '">' + fc.lang.monthNames[month - 1] + '</option>';
            }
            html += '</select>';

            html += '<select class="fc-cc-expirydate-year"><option value="" disabled selected>Please select...</option>';
            for (year = currentYear; year <= currentYear + 20; year += 1) {
                html += '<option value="' + year + '">' + year + '</option>';
            }
            html += '</select></div>';

            // Render the security code
            html += '<div class="fc-cc-ccv">';
            html += '<label>' + fc.lang.creditCardSecurityCodeText + '</label><input type="text" class="fc-fieldinput">';
            if (fc.config.cvvImage === null) {
                html += '<img src="' + cdnUrl + '/img/cvv.gif" alt="cvv">';
            }
            html += '</div>';

            // Render the pay now button
            html += '<div class="fc-submit-payment">';
            html += '<input class="fc-btn" data-for="' + getId(field) + '" type="submit" value="' + fc.lang.payNow + '"><div class="fc-loading fc-hide"></div>';
            html += '</div>';

            html += '</div>';
            /*!fc-payment*/
            return html;
        },

        /**
         * Hide and reset a modal
         */
        hideModal = function () {
            fc.activeModalField = null;
            fc.modalState = null;
            fc.modalMeta = {};
            $('.fc-modal.fc-show').removeClass('fc-show');
        },

        /**
         * Verify a mobile or email
         * @param verificationCode
         * @returns {boolean}
         */
        verifyCode = function (verificationCode) {
            var schema,
                data;

            // Retrieve the field schema
            schema = fc.fieldSchema[fc.modalMeta.fieldId];
            if (schema === undefined) {
                return false;
            }

            // Send the request to the API server
            data = {
                fieldId: fc.modalMeta.fieldId,
                code: verificationCode
            };

            // Perform the API request
            $('.fc-modal .modal-footer .fc-loading').removeClass('fc-hide');
            $('.fc-modal .modal-footer .fc-error').html('').addClass('fc-hide');
            api('verification/verify', data, 'POST', function (data) {
                if (typeof data !== "object" || data.success === undefined) {
                    $('.fc-modal .modal-footer .fc-error').html('An unknown error occurred communicating with the API server').removeClass('fc-hide');
                } else if (!data.success && typeof data.message === "string") {
                    $('.fc-modal .modal-footer .fc-error').html(data.message).removeClass('fc-hide');
                } else if (data.success) {
                    // The field was successfully verified
                    $('[fc-data-group="' + fc.modalMeta.fieldId + '"]').addClass('fc-verified');
                    fc.fields[fc.modalMeta.fieldId] = '1';
                    hideModal();
                }

                $('.fc-modal .modal-footer .fc-loading').addClass('fc-hide');
            });
        },

        /**
         * Verify the user email input
         * @returns {boolean}
         */
        verifyEmailAddress = function () {
            verifyCode($('.fc-email-verification-submit input[type=text]').val());
        },

        /**
         * Show the email verification modal
         * @param fieldId
         * @returns {boolean}
         */
        showEmailVerificationModal = function (fieldId) {
            // Configure the modal
            fc.modalState = fc.states.EMAIL_VERIFICATION_CODE;
            fc.modalMeta = {
                fieldId: fieldId
            };

            var modalBody = '<p>To verify your email, input the code sent to your e-mail address in the area below, and click the \'Verify email\' button.</p>';
            modalBody += '<div class="fc-email-verification-submit"><input class="fc-fieldinput" type="text" placeholder="Enter verification code..."></div>';

            // Update the modal html and show it
            $('.fc-modal .modal-header h2').text("Success!");
            $('.fc-modal .modal-body').html(modalBody);
            $('.fc-modal .modal-footer .fc-btn-add').text("Verify email");
            $('.fc-modal').addClass('fc-show');
            return false;
        },

        /**
         * Poll the API intermittently to see if the field has been verified (if it has, update in real time)
         * @param dataId
         */
        waitForVerification = function (dataId) {
            // Need to poll the database intermittently and wait for verification
            api('verification/is-verified', {fieldId: dataId}, 'POST', function (data) {
                if (typeof data === "object" && data.success !== undefined && data.success === true) {
                    // The field has successfully been verified
                    $('[fc-data-group="' + dataId + '"]').addClass('fc-verified');
                    fc.fields[dataId] = '1';
                    hideModal();
                    return;
                }

                // The field has yet to be verified, poll again
                setTimeout(function () {
                    waitForVerification(dataId);
                }, 5000);
            });
        },

        /**
         * Register the email verification event listeners
         */
        registerEmailVerificationListeners = function () {
            // Send an email to the user
            $(fc.jQueryContainer).on('click', '.fc-email-verification .fc-send-email input[type=submit]', function () {
                var elParent = $(this).parent(),
                    data,
                    fieldId;

                elParent.find('.fc-loading').removeClass('fc-hide');
                fieldId = elParent.parent().attr('fc-belongs-to');

                // Data to send with the request
                data = {
                    field: fieldId
                };

                // Send the api callback
                api('verification/callback', data, 'POST', function (data) {
                    elParent.find('.fc-loading').addClass('fc-hide');

                    // On successful request, load a dialog to input the code
                    if (typeof data === "object" && data.success !== undefined && data.success) {
                        showEmailVerificationModal(fieldId);
                        waitForVerification(fieldId);
                    }
                });

                return false;
            });

            // Open the modal
            $(fc.jQueryContainer).on('click', '.fc-email-verification-modal', function () {
                var dataId = $(this).attr('data-for');
                showEmailVerificationModal(dataId);

                return false;
            });

            fc.processedActions[fc.processes.emailListeners] = true;
        },

        /**
         * Render the email verification field
         * @param field
         * @returns {string}
         */
        renderEmailVerification = function (field) {
            // Register the email verification event listeners if required
            if (!processed(fc.processes.emailListeners)) {
                registerEmailVerificationListeners();
            }

            /// Start formatting the html to output
            var html = '',
                fieldValue = fc.fields[getId(field)],
                verified = fieldValue !== undefined && fieldValue === '1';

            // If not verified, show the form to verify
            if (!verified) {
                html += '<div class="fc-email-verification" fc-belongs-to="' + getId(field) + '">';

                html += '<div class="fc-send-email">';
                html += '<input class="fc-btn" type="submit" value="' + fc.lang.sendEmail + '"><div class="fc-loading fc-hide"></div>';
                html += '<div class="fc-clear fc-verification-options">';
                html += '<p><small>Already have a verification code? Click <a href="#" class="fc-email-verification-modal" data-for="' + getId(field) + '">here</a> to validate.</small></p>';
                html += '</div></div>';

                html += '</div>';
                /*!fc-email-verification*/
            }

            // Success text
            html += '<div class="fc-success' + (verified ? ' fc-force-show' : '') + '">';
            html += fc.lang.fieldValidated;
            html += '</div>';
            /*!fc-success*/

            return html;
        },

        /**
         * Verify the mobile phone number
         * @returns {boolean}
         */
        verifyMobileNumber = function () {
            verifyCode($('.fc-sms-verification-submit input[type=text]').val());
        },

        /**
         * Show the email verification modal
         * @param fieldId
         * @returns {boolean}
         */
        showSmsVerificationModal = function (fieldId) {
            // Configure the modal
            fc.modalState = fc.states.SMS_VERIFICATION_CODE;
            fc.modalMeta = {
                fieldId: fieldId
            };

            var modalBody = '<p>To verify your mobile, input the code sent to you via SMS in the area below, and click the \'Verify mobile\' button.</p>';
            modalBody += '<div class="fc-sms-verification-submit"><input class="fc-fieldinput" type="text" placeholder="Enter verification code..."></div>';

            // Update the modal html and show it
            $('.fc-modal .modal-header h2').text("Success!");
            $('.fc-modal .modal-body').html(modalBody);
            $('.fc-modal .modal-footer .fc-btn-add').text("Verify mobile");
            $('.fc-modal').addClass('fc-show');
            return false;
        },

        /**
         * Register the event listeners for SMS verifications
         */
        registerSmsVerificationListeners = function () {
            // Send an email to the user
            $(fc.jQueryContainer).on('click', '.fc-sms-verification .fc-send-sms input[type=submit]', function () {
                var elParent = $(this).parent(),
                    data,
                    fieldId;

                elParent.find('.fc-loading').removeClass('fc-hide');
                fieldId = elParent.parent().attr('fc-belongs-to');

                // Data to send with the request
                data = {
                    field: fieldId
                };

                // Send the api callback
                api('verification/callback', data, 'POST', function (data) {
                    elParent.find('.fc-loading').addClass('fc-hide');

                    // On successful request, load a dialog to input the code
                    if (typeof data === "object" && data.success !== undefined && data.success) {
                        showSmsVerificationModal(fieldId);
                        waitForVerification(fieldId);
                    }
                });

                return false;
            });

            // Open the modal
            $(fc.jQueryContainer).on('click', '.fc-sms-verification-modal', function () {
                var dataId = $(this).attr('data-for');
                showSmsVerificationModal(dataId);

                return false;
            });

            fc.processedActions[fc.processes.emailListeners] = true;
        },

        /**
         * Render the sms verification field
         * @param field
         * @returns {string}
         */
        renderSmsVerification = function (field) {
            // Register the email verification event listeners if required
            if (!processed(fc.processes.smsListeners)) {
                registerSmsVerificationListeners();
            }

            /// Start formatting the html to output
            var html = '',
                fieldValue = fc.fields[getId(field)],
                verified = fieldValue !== undefined && fieldValue === '1';

            // If not verified, show the form to verify
            if (!verified) {
                html += '<div class="fc-sms-verification" fc-belongs-to="' + getId(field) + '">';

                html += '<div class="fc-send-sms">';
                html += '<input class="fc-btn" type="submit" value="' + fc.lang.sendSms + '"><div class="fc-loading fc-hide"></div>';
                html += '<div class="fc-clear fc-verification-options">';
                html += '<p><small>Already have a verification code? Click <a href="#" class="fc-sms-verification-modal" data-for="' + getId(field) + '">here</a> to validate.</small></p>';
                html += '</div></div>';

                html += '</div>';
                /*!fc-email-verification*/
            }

            // Success text
            html += '<div class="fc-success' + (verified ? ' fc-force-show' : '') + '">';
            html += fc.lang.fieldValidated;
            html += '</div>';
            /*!fc-success*/

            return html;
        },

        /**
         * Render a string on the review table
         *
         * @param field
         * @param value
         * @returns {string}
         */
        renderReviewTableString = function (field, value) {
            var html = "", json, iterator, val;

            // Do not render for particular types
            if (["emailVerification", "smsVerification", "signature", "creditCard"].indexOf(field.type) > -1) {
                return '';
            }

            // Do not render for readonly fields
            if (getConfig(field, 'readOnly', false)) {
                return '';
            }

            html += "<tr><td>" + getShortLabel(field) + "</td><td>";

            // If a string, output safely
            if (['[', '{'].indexOf(value.substring(0, 1)) > -1) {
                try {
                    json = $.parseJSON(value);
                    value = json;
                } catch (ignore) {
                }
            }

            // If string, output
            if (typeof value === "string") {
                html += htmlEncode(value);
            } else if (typeof value === "object") {
                html += "<ul class='fc-list'>";
                for (iterator = 0; iterator < value.length; iterator += 1) {
                    val = value[iterator];
                    html += "<li>" + htmlEncode(val) + "</li>";
                }
                html += "</ul>";
            }

            html += "</td></tr>";

            return html;
        },

        /**
         * Render an array'd value for the review table
         *
         * @param field
         * @param value
         */
        renderReviewTableArray = function (field, value) {
            var html = "", iterator, parts, key;

            // Array - repeatable grouplet
            for (iterator = 0; iterator < value.length; iterator += 1) {
                if (typeof value[iterator] === "object") {
                    html += "<tr><th colspan='2'>" + htmlEncode(getShortLabel(field)) + " #" + (iterator + 1) + "</th></tr>";

                    for (key in value[iterator]) {
                        if (value[iterator].hasOwnProperty(key)) {
                            if (value[iterator][key].length > 0) {
                                if (key.indexOf(prefixSeparator) > -1) {
                                    parts = key.split(prefixSeparator);
                                    html += "<tr><td>" + getShortLabel(fc.fieldSchema[parts[parts.length - 1]]);
                                    html += "</td><td>" + htmlEncode(value[iterator][key]) + "</td></tr>";
                                }
                            }
                        }
                    }
                }
            }

            return html;
        },

        renderReviewTableGrouplet,
        renderSummaryField,

        /**
         * Render the review table
         * @param fieldId
         * @returns {*}
         */
        renderReviewTable = function (fieldId) {
            var html, stageIterator, stage, pageIterator, page, sectionIterator, section, fieldIterator, field, pageHtml;

            html = '<div class="fc-form-summary fc-review-table">';
            html += '<table class="fc-table"><thead><tr><th class="fc-field-col">Field</th><th>Value</th></tr></thead><tbody>';

            // Loop through every page, output every field that has a value
            for (stageIterator = 0; stageIterator < fc.schema.stage.length; stageIterator += 1) {
                stage = fc.schema.stage[stageIterator];

                // Confirm the stage has a set of pages
                if (stage === undefined || stage.page === undefined || typeof stage.page !== "object") {
                    continue;
                }

                // Iterate through each page
                for (pageIterator = 0; pageIterator < stage.page.length; pageIterator += 1) {
                    page = stage.page[pageIterator];

                    // Confirm the page has a set of sections
                    if (page === undefined || page.section === undefined || typeof page.section !== "object") {
                        continue;
                    }

                    pageHtml = "";

                    // Iterate through each page section
                    for (sectionIterator = 0; sectionIterator < page.section.length; sectionIterator += 1) {
                        section = page.section[sectionIterator];

                        // Ensure the section has a set of fields
                        if (section === undefined || section.field === undefined || typeof section.field !== "object") {
                            continue;
                        }

                        // Iterate through each field
                        for (fieldIterator = 0; fieldIterator < section.field.length; fieldIterator += 1) {
                            field = section.field[fieldIterator];

                            pageHtml += renderSummaryField(field);
                        }
                    }

                    // If the page rendered any fields, display it
                    if (pageHtml.length > 0) {
                        html += "<tr><th colspan='2'>" + htmlEncode(page.label) + "</th></tr>";
                        html += pageHtml;
                    }
                }
            }

            html += '</tbody></table></div>';
            /*!fc-form-summary*/

            return html;
        },

        /**
         * Returns true if a page is deemed to be a submission page
         * @param page
         * @returns {boolean}
         */
        isSubmitPage = function (page) {
            if (typeof page !== "object" || page.completion === undefined) {
                return false;
            }

            return page.completion === true || (typeof page.completion === 'string' && ["1", "true"].indexOf(page.completion.toLowerCase()) !== -1);
        },

        /**
         * Deletes a session and forces the user to fill out a new application.
         * @param changeDom
         */
        deleteSession = function (changeDom) {
            if (typeof changeDom !== 'boolean') {
                changeDom = true;
            }

            $.removeCookie(fc.config.sessionIdName);

            if (changeDom) {
                $(fc.jQueryContainer + ' .render').html(fc.lang.sessionExpiredHtml);
                $(fc.jQueryContainer).trigger(fc.jsEvents.onFormExpired);
            }
            fc.expired = true;
        },

        /**
         * Intermittently check to see if the user has timed out
         */
        timeout = function () {
            if (fc.config.timeUserOut !== true) {
                return;
            }

            var timeSinceLastActivity = (new Date()).getTime() - fc.lastActivity,
                sessionExtension;

            if (timeSinceLastActivity > (fc.config.timeOutAfter * 1000)) {
                // The user's session has expired
                deleteSession();
            } else if (timeSinceLastActivity > (fc.config.timeOutWarning * 1000)) {
                // Display a warning to the user to see if they want to extend their session
                sessionExtension = confirm('Your session is about to expire. Do you want to extend your session?');
                timeSinceLastActivity = (new Date()).getTime() - fc.lastActivity;

                if (sessionExtension === true && timeSinceLastActivity < (fc.config.timeOutAfter * 1000)) {
                    api('page/ping', {}, 'put', function (data) {
                        if (typeof data === "object" && data.success === true) {
                            fc.lastActivity = (new Date()).getTime();
                        }
                    });
                } else {
                    // The user waited too long before extending their session
                    deleteSession();
                }
            }
        },

        /**
         * Given an input field, will traverse through the DOM to find the next form element
         *
         * @param currentField
         * @param mustBeEmpty
         * @returns {*}
         */
        nextVisibleField = function (currentField, mustBeEmpty) {
            var foundField = false,
                foundFieldId;

            // Only return fields whose value isnt empty
            if (!mustBeEmpty) {
                mustBeEmpty = true;
            }

            // Iterate through visible fields
            $('.fc-section:not(.fc-hide) div.fc-field:not(.fc-hide)').each(function () {
                var id = $(this).attr('fc-data-group');
                if (id === currentField) {
                    foundField = true;
                    return;
                }

                // If the field has been found, return the next
                if (foundField && !foundFieldId) {
                    if (mustBeEmpty && !fc.fields[id]) {
                        // If the field must be empty, only return if no value is found
                        foundFieldId = id;
                    } else if (!mustBeEmpty) {
                        // Otherwise, return the first field
                        foundFieldId = id;
                    }
                }
            });

            return foundFieldId;
        },

        renderGrouplet,
        renderFields,
        renderPageSections,
        generateRandomString,
        loadCssFiles,
        addModalWindow,
        pruneNonPageFields,
        removeInvisibleSectionFields,
        pruneInvisibleFields,
        fieldIsValid,
        formFieldsValid,
        checkAutoLoad,
        getFirstPage,
        loadSchema,
        hasNextPage,
        loadNextPage,
        processSaveQueue,
        showDeleteDialog,
        addRepeatableRow,
        deleteRepeatableRow,
        registerRepeatableGroupletListeners,
        registerOnePageListeners,
        registerEventListeners,
        nextPage,
        render,
        renderPage,
        flushVisibility,
        flushSectionVisibility,
        flushFieldVisibility,
        registerValueChangedListeners,
        valueChanged,
        validateModal,
        orderSchema,
        renderSignature,
        loadSignatureLibs,
        orderObject;

    /**
     * Load the libraries required for signature fields
     */
    loadSignatureLibs = function () {
        var sigBlock;

        // Event listener for initialising the signature
        $(fc.jQueryContainer).on(fc.jsEvents.onFinishRender, function () {
            var dataId;

            sigBlock = $(fc.jQueryContainer).find('.' + fc.config.signatureClass);
            if (sigBlock.length > 0) {
                sigBlock.each(function () {
                    dataId = sigBlock.attr('data-for');
                    fc.renderedSignatures[dataId] = sigBlock.signaturePad({
                        drawOnly: true,
                        onDrawEnd: function () {
                            var key, signature;

                            // Update and queue the signature for saving
                            for (key in fc.renderedSignatures) {
                                if (fc.renderedSignatures.hasOwnProperty(key)) {
                                    signature = fc.renderedSignatures[key].getSignatureString();
                                    if (fc.fields[key] === undefined || fc.fields[key] !== signature) {
                                        valueChanged(key, signature);
                                    }
                                }
                            }
                        }
                    });

                    // If a value has been set, restore it
                    if (fc.fields[dataId] !== undefined && fc.fields[dataId].length > 0) {
                        fc.renderedSignatures[dataId].regenerate(fc.fields[dataId]);
                    }
                });

            }
        });

        fc.processedActions[fc.processes.loadSignatureLibs] = true;
    };

    /**
     * Render the signature field
     * @param field
     * @returns {string}
     */
    renderSignature = function (field) {
        var html = '';

        // Initialise the signature libraries if required
        if (!processed(fc.processes.loadSignatureLibs)) {
            loadSignatureLibs();
        }

        html = '<div class="' + fc.config.signatureClass + '" formcorp-data-id="' + getId(field) + '" data-for="' + getId(field) + '"> <ul class="sigNav"> <li class="clearButton"><a href="#clear">Clear</a></li> </ul> <div class="sig sigWrapper"> <div class="typed"></div> <canvas class="pad" width="400" height="75"></canvas> <input type="hidden" name="output" class="output"> </div></div>';

        return html;
    };

    /**
     * Render a grouplet on the review table
     *
     * @param field
     * @param value
     * @returns {*}
     */
    renderReviewTableGrouplet = function (field, value) {
        var html = "", key;

        // Grouplet, need to recursively output
        for (key in value) {
            if (value.hasOwnProperty(key)) {
                html += renderSummaryField(fc.fieldSchema[key], value[key]);
            }
        }

        return html;
    };

    /**
     * Render review table field
     * @param field
     * @param value
     * @returns {string}
     */
    renderSummaryField = function (field, value) {
        var html = '', id, isValidObject, isValidString;

        // Retrieve the id of the field and its value
        id = getId(field);
        if (value === undefined) {
            value = fc.fields[id];
        }

        // If the valid is valid, proceed
        if (value !== undefined) {
            isValidObject = typeof value === "object" && (($.isArray(value) && value.length > 0) || !$.isEmptyObject(value));
            isValidString = typeof value === "string" && value.length > 0;

            // If object with enumerable keys or string with length greater than 0
            if (isValidObject || isValidString) {
                if (isValidString) {
                    html += renderReviewTableString(field, value);
                } else if (isValidObject) {
                    if ($.isArray(value)) {
                        html += renderReviewTableArray(field, value);
                    } else {
                        html += renderReviewTableGrouplet(field, value);
                    }
                }
            }
        }

        return html;
    };

    /**
     * Render a grouplet.
     * @param field
     * @returns {string}
     */
    renderGrouplet = function (field) {
        /*jslint nomen: true*/
        var fieldId = field._id.$id,
            html = '',
            fields;
        /*jslint nomen: false*/

        if (typeof field.config.grouplet === 'object') {
            fields = field.config.grouplet.field;
            html += renderFields(fields, field, [fieldId]);
        }

        // If the grouplet is repeatable, need to mark it as such
        if (getConfig(field, 'repeatable', false) === true) {
            html = '<div class="fc-data-repeatable-grouplet" formcorp-data-id="' + fieldId + '">' + html + '</div>';
        }

        return html;
    };

    /**
     * Render a collection of fields.
     * @param fields
     * @param section
     * @returns {string}
     */
    renderFields = function (fields, section, prefix) {
        var html = '',
            y,
            field,
            required,
            fieldHtml,
            dataId,
            fieldId;

        // Field id prefix (for grouplet fields that may be shown multiple times)
        if (prefix === undefined) {
            prefix = "";
        } else if (typeof prefix === "object") {
            prefix = prefix.join(prefixSeparator) + prefixSeparator;
        }

        for (y = 0; y < fields.length; y += 1) {
            field = fields[y];
            required = getConfig(field, 'required', false);
            /*jslint nomen: true*/
            fieldId = prefix + field._id.$id;
            fieldHtml = '<div class="';

            // If field has an associated tag, output it
            if (getConfig(field, 'tag', '').length > 0) {
                fieldHtml += 'fc-tag-' + getConfig(field, 'tag', '') + ' ';
            }

            // If field is repeatable, mark it as so
            if (getConfig(field, 'repeatable', false) === true) {
                fieldHtml += 'fc-repeatable-container ';
            }

            fieldHtml += 'fc-field fc-field-' + field.type + '" fc-data-group="' + fieldId + '" data-required="' + required + '"';

            // If a section was passed through, track which section the field belongs to
            if (section !== undefined && typeof section === "object") {
                fieldHtml += ' fc-belongs-to="' + section._id.$id + '"';
            }


            fieldHtml += '>';

            // Add to field class variable if doesnt exist
            dataId = fieldId;
            /*jslint nomen: false*/
            if (fc.fieldSchema[dataId] === undefined) {
                fc.fieldSchema[dataId] = field;
            }

            // Description text - show before the label (for certain fields)
            if (["creditCard"].indexOf(field.type) === -1) {
                if (fc.config.descriptionBeforeLabel === true && getConfig(field, 'description').replace(/(<([^>]+)>)/ig, "").length > 0) {
                    fieldHtml += '<div class="fc-desc">' + getConfig(field, 'description') + '</div>';
                }
            }

            fieldHtml += '<div class="fc-fieldcontainer">';

            // Field label - don't show in this position for certain fields
            if (["creditCard"].indexOf(field.type) === -1) {
                if (getConfig(field, 'showLabel', false) === true && getConfig(field, 'label', '').length > 0) {
                    fieldHtml += '<label>' + field.config.label + '</label>';
                }

                // Show the description after the label
                if (fc.config.descriptionBeforeLabel === false && getConfig(field, 'description').replace(/(<([^>]+)>)/ig, "").length > 0) {
                    fieldHtml += '<div class="fc-desc">' + getConfig(field, 'description') + '</div>';
                }
            }

            // Output a repeatable field
            if (getConfig(field, 'repeatable', false) === true) {
                fieldHtml += '<div class="fc-repeatable">';
                fieldHtml += '<div class="fc-summary"></div>';
                fieldHtml += '<div class="fc-link"><a href="#" class="fc-click" data-id="' + dataId + '">' + fc.lang.addFieldTextValue + '</a></div>';
            }

            fieldHtml += '<div class="fc-fieldgroup">';

            switch (field.type) {
            case 'text':
                fieldHtml += renderTextfield(field, prefix);
                break;
            case 'dropdown':
                fieldHtml += renderDropdown(field, prefix);
                break;
            case 'textarea':
                fieldHtml += renderTextarea(field, prefix);
                break;
            case 'radioList':
                fieldHtml += renderRadioList(field, prefix);
                break;
            case 'checkboxList':
                fieldHtml += renderCheckboxList(field, prefix);
                break;
            case 'hidden':
                fieldHtml += renderHiddenField(field, prefix);
                break;
            case 'richTextArea':
                fieldHtml += renderRichText(field, prefix);
                break;
            case 'grouplet':
                fieldHtml += renderGrouplet(field, prefix);
                break;
            case 'creditCard':
                fieldHtml += renderCreditCard(field, prefix);
                break;
            case 'emailVerification':
                fieldHtml += renderEmailVerification(field, prefix);
                break;
            case 'smsVerification':
                fieldHtml += renderSmsVerification(field, prefix);
                break;
            case 'reviewTable':
                fieldHtml += renderReviewTable(field, prefix);
                break;
            case 'signature':
                fieldHtml += renderSignature(field, prefix);
                break;
            case 'contentRadioList':
                fieldHtml += renderContentRadioList(field, prefix);
                break;
            default:
                console.log('Unknown field type: ' + field.type);
            }

            fieldHtml += '<div class="fc-error-text"></div>';

            // Help text
            if (getConfig(field, 'help').replace(/(<([^>]+)>)/ig, "").length > 0) {
                fieldHtml += '<div class="fc-help">' + getConfig(field, 'help') + '</div>';
            }

            if (getConfig(field, 'repeatable', false) === true) {
                fieldHtml += '</div>';
            }


            fieldHtml += '<div class="fc-empty"></div></div>';
            fieldHtml += '</div></div>';
            html += fieldHtml;
        }

        return html;
    };

    /**
     * Render page sections.
     * @param sections
     * @returns {string}
     */
    renderPageSections = function (sections) {
        var html = '',
            x,
            section,
            sectionHtml;

        for (x = 0; x < sections.length; x += 1) {
            section = sections[x];
            /*jslint nomen: true*/
            sectionHtml = '<div class="fc-section" formcorp-data-id="' + section._id.$id + '">';
            /*jslint nomen: false*/

            if (typeof section.label === 'string' && section.label.length > 0) {
                sectionHtml += '<h4>' + section.label + '</h4>';
            }

            if (typeof section.description === 'string' && section.description.length > 0) {
                sectionHtml += '<p>' + section.description + '</p>';
            }

            // Render the fields
            if (section.field !== undefined && section.field.length > 0) {
                sectionHtml += renderFields(section.field, section);
            }

            sectionHtml += '</div>';
            html += sectionHtml;
        }

        return html;
    };

    /**
     * Returns true when a next stage exists.
     * @returns {boolean}
     */
    hasNextPage = function () {
        return nextPage(false);
    };

    /**
     * Render a page.
     * @param page
     * @returns {string}
     */
    renderPage = function (page) {
        // Page details
        /*jslint nomen: true*/
        var pageDiv = '<div class="fc-page" data-page-id="' + page.page._id.$id + '"><form class="fc-form">',
            submitText = fc.lang.submitText,
            nextPageObj;
        /*jslint nomen: false*/

        pageDiv += '<h1>' + page.stage.label + '</h1>';
        page = page.page;

        /*jslint nomen: true*/
        fc.pageId = page._id.$id;
        /*jslint nomen: false*/
        if (typeof page.label === 'string' && page.label.length > 0) {
            pageDiv += '<h2>' + page.label + '</h2>';
        }
        if (typeof page.description === 'string' && page.description.length > 0) {
            pageDiv += '<h3>' + page.description + '</h3>';
        }

        // Render page sections
        if (page.section.length > 0) {
            pageDiv += renderPageSections(orderObject(page.section));
        }

        nextPageObj = nextPage(false, true);

        // Submit button when a next page exists, or no next page exists
        if (typeof nextPageObj === "object" || (isSubmitPage(page) === false && nextPageObj === false)) {
            // If the next stage is a completion page, alter the submission text
            if ((isSubmitPage(page) === false && nextPageObj === false) || (typeof nextPageObj.page === 'object' && isSubmitPage(nextPageObj.page))) {
                submitText = fc.lang.submitFormText;
            }

            pageDiv += '<div class="fc-pagination">';

            // Show the prev stage button
            if (fc.config.showPrevPageButton === true) {
                if (typeof fc.prevPages[fc.pageId] === "object") {
                    pageDiv += '<div class="fc-prev-page">';
                    pageDiv += '<input type="submit" value="' + fc.lang.prevButtonText + '" class="fc-btn">';
                    pageDiv += '</div>';
                }
            }

            // Output the submit button
            pageDiv += '<div class="fc-submit">';
            pageDiv += '<input type="submit" value="' + submitText + '" class="fc-btn">';
            pageDiv += '</div>';
        }

        pageDiv += '<div class="fc-break"></div></div>';

        // Close page div
        pageDiv += '</form></div>';

        return pageDiv;
    };

    /**
     * Flushses the visibility component of each section when the form state changes.
     */
    flushSectionVisibility = function () {
        $(fc.jQueryContainer).find('.fc-section').each(function () {
            var dataId = $(this).attr('formcorp-data-id'),
                section,
                visible;

            if (typeof dataId !== 'string' || dataId.length === 0 || typeof fc.sections[dataId] !== 'object') {
                return;
            }

            section = fc.sections[dataId];
            if (typeof section.visibility === 'string' && section.visibility.length > 0) {
                visible = eval(section.visibility);
                if (visible) {
                    $('div.fc-section[formcorp-data-id=' + dataId + ']').removeClass('fc-hide');
                } else {
                    $('div.fc-section[formcorp-data-id=' + dataId + ']').addClass('fc-hide');
                }
            }
        });
    };

    /**
     * Flushes the field visibility options. Should be triggered when the page is first rendered, and when a value
     * changes. A change in value represents a change in form state. When the form's state changes, the visibility of
     * certain fields may need to be altered.
     */
    flushFieldVisibility = function () {
        $(fc.jQueryContainer).find('.fc-field').each(function () {
            var dataId = $(this).attr('fc-data-group'),
                field,
                visible;

            if (typeof dataId !== 'string' || dataId.length === 0 || typeof fc.fieldSchema[dataId] !== 'object') {
                return;
            }

            // If field has a visibility configurative set, act on it
            field = fc.fieldSchema[dataId];
            if (typeof field.config.visibility === 'string' && field.config.visibility.length > 0) {
                visible = eval(field.config.visibility);
                if (typeof visible === 'boolean') {
                    if (visible) {
                        $('div[fc-data-group="' + dataId + '"]').removeClass('fc-hide');
                    } else {
                        $('div[fc-data-group="' + dataId + '"]').addClass('fc-hide');
                    }
                }
            }
        });
    };

    /**
     * Flushes the visibility of various components throughout the form.
     */
    flushVisibility = function () {
        flushSectionVisibility();
        flushFieldVisibility();
    };

    /**
     * Render a form stage
     * @param pageId
     * @param isNextPage
     */
    render = function (pageId, isNextPage) {
        // If expired, do not render anything
        if (fc.expired === true) {
            return;
        }

        var page = getPageById(pageId),
            html = '';
        if (page === undefined) {
            console.log('FC Error: Page not found');
        }

        if (typeof page.stage !== 'object') {
            return;
        }

        // Store the previous page
        if (isNextPage === true && fc.currentPage !== undefined) {
            fc.prevPages[pageId] = getPageById(fc.currentPage);
        }

        fc.currentPage = pageId;

        // Store field schema locally
        updateFieldSchema(page.stage);

        html += renderPage(page);

        if (!fc.config.onePage) {
            // Show form in stages
            $(fc.jQueryContainer + ' .render').html(html);
        } else {
            $(fc.jQueryContainer + ' .render').append(html);
            fc.pageOrders.push(pageId);
            $(fc.jQueryContainer).find('.fc-pagination').hide();
            $(fc.jQueryContainer).find('.fc-pagination:last').show();
        }

        // Set values from data array
        setFieldValues();

        // Flush the field/section visibility
        flushVisibility();

        // Update the hash, and ignore the hash change event
        fc.ignoreHashChangeEvent = true;
        window.location.hash = pageId;

        // Fire the event to signal form finished rendering
        $(fc.jQueryContainer).trigger(fc.jsEvents.onFinishRender);

        // Often various pages will be loaded at the same time (when no fields on that page are required)
        /*if (fc.config.autoLoadPages) {
         //checkAutoLoad();
         }*/
    };

    /**
     * Render the next page
     * @param shouldRender
     * @param returnPage
     * @param pageId
     * @returns {*}
     */
    nextPage = function (shouldRender, returnPage, pageId) {
        if (typeof shouldRender !== 'boolean') {
            shouldRender = true;
        }

        // By default, should return boolean value
        if (typeof returnPage !== 'boolean') {
            returnPage = false;
        }

        // If no page id specified, use the current page
        if (typeof pageId !== "string") {
            pageId = fc.currentPage;
        }

        var currentPage = getPageById(pageId),
            id,
            foundStage = false,
            x,
            condition,
            stage;

        if (typeof currentPage.page !== 'object') {
            return;
        }

        // If have custom rules determining the page to navigate to, attempt to process them
        if (typeof currentPage.page.toCondition === 'object' && Object.keys(currentPage.page.toCondition).length > 0) {
            for (id in currentPage.page.toCondition) {
                if (currentPage.page.toCondition.hasOwnProperty(id)) {
                    condition = currentPage.page.toCondition[id];
                    if (eval(condition)) {
                        if (shouldRender) {
                            render(id, true);
                        }
                        return returnPage ? getPageById(id) : true;
                    }
                }
            }
        }

        // Render the next page by default (first page in next stage)
        for (x = 0; x < fc.schema.stage.length; x += 1) {
            stage = fc.schema.stage[x];

            // If the stage that is to be rendered has been found, do so
            /*jslint nomen: true*/
            if (foundStage && typeof stage.page === 'object' && stage.page.length > 0) {
                if (shouldRender) {
                    render(stage.page[0]._id.$id, true);
                }
                return returnPage ? getPageById(stage.page[0]._id.$id) : true;
            }
            /*jslint nomen: false*/

            // If the current iterative stage is the stage of the currently rendered page, mark the next stage to be rendered
            /*jslint nomen: true*/
            if (stage._id.$id === currentPage.stage._id.$id) {
                foundStage = true;
            }
            /*jslint nomen: false*/
        }

        return false;
    };

    /**
     * Auto loads the next page
     */
    checkAutoLoad = function () {
        if (!fc.config.autoLoadPages) {
            return;
        }

        // If a next page exists and the current page is valid, load the next page
        if (hasNextPage() && validForm('[data-page-id="' + fc.currentPage + '"]', false)) {
            loadNextPage();
            return true;
        }

        return false;
    };

    /**
     * Function that is fired when a data value changes.
     * @param dataId
     * @param value
     */
    valueChanged = function (dataId, value) {
        var fieldSchema = fc.fieldSchema[dataId],
            errors,
            params,
            dataParams,
            parentId,
            parentField,
            pageId,
            nextField,
            pageDataId,
            foundPage = false,
            loadedNextPage = false,
            allowAutoLoad = false,
            page,
            topDistance,
            sessionId,
            el;

        // If unable to locate the field schema, do nothing (i.e. credit card field changes)
        if (fieldSchema === undefined) {
            return;
        }

        // If the value hasn't actually changed, return
        if (fc.fields[dataId] && fc.fields[dataId] === value) {
            return;
        }

        // Set the active page id to the page that the field belongs to, delete later pages
        fc.currentPage = getFieldPageId(dataId);
        $('.fc-page[data-page-id="' + fc.currentPage + '"] .fc-pagination').show();
        $('.fc-page').each(function () {
            pageDataId = $(this).attr('data-page-id');
            if (foundPage && pageDataId !== fc.currentPage) {
                $(this).remove();
            } else if (pageDataId === fc.currentPage) {
                foundPage = true;
            }
        });

        // Update the page orders
        if (fc.pageOrders.indexOf(fc.currentPage) !== fc.pageOrders.length - 1) {
            fc.pageOrders = fc.pageOrders.splice(0, fc.pageOrders.indexOf(fc.currentPage) + 1);
        }

        // If the item belongs to a repeatable object, do not store the changed value
        if (dataId.indexOf(prefixSeparator) > -1) {
            dataParams = dataId.split(prefixSeparator);
            parentId = dataParams[0];
            parentField = fc.fieldSchema[parentId];

            if (parentField !== undefined && getConfig(parentField, 'repeatable', false) === true) {
                return;
            }
        }

        // Don't perform operations on repeatable fields
        if (typeof fieldSchema.config.repeatable !== 'boolean' || !fieldSchema.config.repeatable) {
            fc.fields[dataId] = value;

            // If a grouplet, save the original state of the grouplet
            if (dataId.indexOf(prefixSeparator) > -1) {
                saveOriginalGroupletValue(dataId, value);
            }

            // Flush the field visibility options
            flushVisibility();

            // Check real time validation
            errors = fieldErrors(dataId);
            if (fc.config.realTimeValidation === true) {
                if (errors !== undefined && errors.length > 0) {
                    // Log the error event
                    logEvent(fc.eventTypes.onFieldError, {
                        fieldId: dataId,
                        errors: errors
                    });

                    showFieldError(dataId, errors);
                    return;
                }

                removeFieldError(dataId);
            }

            // Store the changed value for intermittent saving
            if (fc.config.saveInRealTime === true) {
                fc.saveQueue[dataId] = value;
            }

            // Need to get the next value field
            nextField = nextVisibleField(dataId);

            // Register the value changed event
            params = {
                fieldId: dataId,
                success: !errors || errors.length === 0
            };

            if (nextField) {
                params.nextField = nextField;
            }

            // If success, update the completion time
            if (params.success) {
                params.completionTime = (Date.now() - fc.lastCompletedTimestamp) / 1000;

                // If a hesitation time has been recorded, subtract it from the completion time
                if (fc.lastHesitationTime > 0) {
                    params.completionTime -= fc.lastHesitationTime;
                }

                // Update timestamps and mark the field as completed
                fc.lastCompletedField = dataId;
                fc.lastCompletedTimestamp = Date.now();
            }

            logEvent(fc.eventTypes.onValueChange, params);
        }

        // Check to see if the next page should be automatically loaded
        pageId = getFieldPageId(dataId);
        page = getPageById(pageId);
        allowAutoLoad = !page.page || !page.page.preventAutoLoad || page.page.preventAutoLoad !== '1';

        if (fc.config.autoLoadPages) {
            if (pageId === fc.currentPage && allowAutoLoad) {
                // Pages have the option of opting out of autoloading
                loadedNextPage = checkAutoLoad();
            }
        }

        // Scroll to the next field if required
        if (getConfig(fc.fieldSchema[dataId], 'allowAutoScroll', true) && fc.config.autoScrollToNextField && !loadedNextPage && nextField && nextField.length > 0) {
            // If the next field belongs to a different section, scroll to that section
            el = $('.fc-field[fc-data-group="' + nextField + '"]');

            if (el && el.length > 0) {
                sessionId = el.attr('fc-belongs-to');
                if (sessionId !== $('.fc-field[fc-data-group="' + dataId + '"]').attr('fc-belongs-to')) {
                    el = $('.fc-section[formcorp-data-id="' + sessionId + '"]');
                }

                if (el && el.length > 0) {
                    topDistance = parseInt(el.offset().top, 10) + fc.config.scrollOffset;
                    if (parseInt($(document).scrollTop(), 10) < topDistance) {
                        $('html,body').animate({
                            scrollTop: topDistance + "px"
                        }, fc.config.scrollDuration);
                    }
                }
            }
        }
    };

    /**
     * Register event listeners that fire when a form input field's value changes
     */
    registerValueChangedListeners = function () {
        // Input types text changed
        $(fc.jQueryContainer).on('change', 'input[type=text].fc-fieldinput, input[type=radio].fc-fieldinput', function () {
            var val = $(this).val(),
                id = $(this).attr('formcorp-data-id');

            if (val !== fc.fields[id]) {
                // Only trigger when the value has truly changed
                valueChanged(id, val);
            }
        });

        // Radio button clicks
        $(fc.jQueryContainer).on('click', '.fc-fieldinput.fc-button', function () {
            var val = $(this).text(),
                id = $(this).attr('formcorp-data-id'),
                parent = $(this).parent().parent(),
                fieldEl = $('.fc-field[fc-data-group="' + id + '"]'),
                alreadyChecked = $(this).hasClass('checked'),
                dataArray;

            // Reset the selected
            if (fc.fieldSchema[id].type === 'contentRadioList') {
                val = decodeURIComponent($(this).attr('data-field-value'));
                // If its a radio list, only allow one to be selected
                if (!getConfig(fc.fieldSchema[id], 'allowMultiple', false)) {
                    fieldEl.find('button.checked').removeClass('checked');
                } else {
                    // Checkbox list - allows multiple
                    dataArray = fc.fields[id] || [];
                    if (dataArray.indexOf(val) < 0) {
                        if (!alreadyChecked) {
                            // If the option hasn't been previously selected, add it
                            dataArray.push(val);
                        }
                    } else {
                        // Remove from element if already checked
                        if (alreadyChecked) {
                            delete dataArray[dataArray.indexOf(val)];
                        }
                    }

                    val = dataArray;
                }
            } else if (parent.hasClass('fc-radio-option-buttons')) {
                parent.find('.checked').removeClass('checked');
            }

            $(this).toggleClass('checked');
            valueChanged(id, val);

            return false;
        });

        // Dropdown box change
        $(fc.jQueryContainer).on('change', 'select.fc-fieldinput', function () {
            valueChanged($(this).attr('formcorp-data-id'), $(this).find('option:selected').val());
        });

        // Radio lists
        $(fc.jQueryContainer).on('change', '.fc-field-checkboxList :checkbox', function () {
            valueChanged($(this).attr('formcorp-data-id'), getFieldValue($(this)));
        });
    };

    /**
     * Attempts to validate the modal used for adding multi-value attributes.
     * @returns {boolean}
     */
    validateModal = function () {
        var valid = true,
            fieldId,
            value,
            field,
            customErrors;

        $('.fc-modal [formcorp-data-id]').each(function () {
            // If field is not required, no need to run any validations on it
            if ($(this).attr('data-required') !== 'true') {
                return;
            }

            // If empty and required, return false
            if (fieldIsEmpty($(this))) {
                valid = false;
                return;
            }

            fieldId = $(this).attr('formcorp-data-id');
            value = getFieldValue($(this));
            field = fc.fieldSchema[fieldId];

            // If custom errors exist, return false
            customErrors = getCustomErrors(field, value);
            if (customErrors.length > 0) {
                valid = false;
                return;
            }
        });

        return valid;
    };

    /**
     * Show the delete dialog
     * @returns {boolean}
     */
    showDeleteDialog = function () {
        $('.fc-modal .modal-header h2').text(fc.lang.deleteDialogHeader);
        $('.fc-modal .modal-body').html(fc.lang.deleteDigntoaryDialogText);
        $('.fc-modal .modal-footer .fc-btn-add').text(fc.lang.confirm);
        $('.fc-modal').addClass('fc-show');
        return false;
    };

    /**
     * Register the event listeners for repeatable grouplets
     */
    registerRepeatableGroupletListeners = function () {
        // Show delete dialog
        $(fc.jQueryContainer).on('click', '.fc-summary-options .fc-delete', function () {
            // Set the modal state
            fc.modalState = fc.states.DELETE_REPEATABLE;
            fc.modalMeta = {
                index: $(this).parent().attr('data-index'),
                fieldId: $(this).parent().attr('data-field-id')
            };

            showDeleteDialog();
            return false;
        });
    };

    /**
     * Add a repeatable row through a modal dialog
     * @returns {boolean}
     */
    addRepeatableRow = function () {
        var validModal = validateModal(),
            values = {};

        if (!validModal) {
            $('.fc-modal .modal-body > div').addClass('fc-error');
            return false;
        }

        $('.fc-modal .modal-body > div').removeClass('fc-error');

        // Build array of values
        $(fc.jQueryContainer).find('.fc-modal [formcorp-data-id]').each(function () {
            var dataId = $(this).attr('formcorp-data-id');
            values[dataId] = getFieldValue($(this));
        });

        // Add the values to the array
        if (typeof fc.fields[fc.activeModalField] !== 'object') {
            fc.fields[fc.activeModalField] = [];
        }
        fc.fields[fc.activeModalField].push(values);

        $('[fc-data-group="' + fc.activeModalField + '"] .fc-summary').html(renderRepeatableTable(fc.activeModalField, fc.fields[fc.activeModalField]));

        // Set to null to signify no repeatable grouplet is being displayed
        hideModal();
    };

    /**
     * Delete a repeatable row through a modal dialog
     */
    deleteRepeatableRow = function () {
        fc.fields[fc.modalMeta.fieldId].splice(fc.modalMeta.index, 1);

        // Set the html
        var html = renderRepeatableTable(fc.modalMeta.fieldId, fc.fields[fc.modalMeta.fieldId]);
        $('[fc-data-group="' + fc.modalMeta.fieldId + '"] .fc-summary').html(html);

        hideModal();
    };

    /**
     * Load the next page
     * @returns {boolean}
     */
    loadNextPage = function () {
        logEvent(fc.eventTypes.onNextPageClick);

        if (!validForm()) {
            logEvent(fc.eventTypes.onNextPageError);
            return false;
        }

        var formData = {},
            data,
            page,
            dataId,
            oldPage,
            newPage;

        // Build the form data array
        $('[formcorp-data-id]').each(function () {
            dataId = $(this).attr('formcorp-data-id');

            // If belongs to a grouplet, need to process uniquely - get the data id of the root grouplet and retrieve from saved field states
            if ($(this).hasClass('fc-data-repeatable-grouplet')) {
                if (formData[dataId] === undefined) {
                    formData[dataId] = fc.fields[dataId];
                }
            } else {
                // Regular fields can be added to the flat dictionary
                formData[dataId] = getFieldValue($(this));
                fc.fields[dataId] = formData[dataId];
            }
        });

        // Build the data object to send with the request
        data = {
            form_id: fc.formId,
            page_id: fc.pageId,
            form_values: formData
        };
        // Determine whether the application should be marked as complete
        page = nextPage(false, true);
        if ((typeof page.page === "object" && isSubmitPage(page.page)) || page === false) {
            data.complete = true;
        }

        // Submit the form fields
        $(fc.jQueryContainer).find('.fc-loading-screen').addClass('show');
        api('page/submit', data, 'put', function (data) {
            if (typeof data.success === 'boolean' && data.success) {
                // Update activity (server last active timestamp updated)
                fc.lastActivity = (new Date()).getTime();
                $(fc.jQueryContainer).find('.fc-loading-screen').removeClass('show');

                // If 'critical' errors were returned (validation errors on required fields), need to alert the user
                if (data.criticalErrors !== undefined && typeof data.criticalErrors === "object" && data.criticalErrors.length > 0) {
                    var x, field, sectionId, section, valid = false;
                    for (x = 0; x < data.criticalErrors.length; x += 1) {
                        field = $('.fc-field[fc-data-group="' + data.criticalErrors[x] + '"]');

                        // If the field exists and isn't hidden, user should not be able to proceed to next page (unless section invisible)
                        if (field.length > 0 && !field.hasClass('fc-hide')) {
                            sectionId = field.attr("fc-belongs-to");
                            section = $(fc.jQueryContainer).find('.fc-section[formcorp-data-id=' + sectionId + ']');

                            // If the section exists and is visible, do not proceed to the next stage
                            if (section.length > 0) {
                                if (!section.hasClass('fc-hide')) {
                                    return;
                                }
                                valid = true;
                            }

                            if (valid === false) {
                                console.log("[FC](1) Server side validation errors occurred, client should have caught this");
                                return;
                            }
                        }

                    }
                }

                // Render the next page if available
                if (hasNextPage()) {
                    oldPage = fc.currentPage;
                    nextPage();
                    newPage = fc.currentPage;

                    // Trigger the newpage event
                    $(fc.jQueryContainer).trigger(fc.jsEvents.onNextPage, [oldPage, newPage]);
                    $(fc.jQueryContainer).trigger(fc.jsEvents.onPageChange, [oldPage, newPage]);
                    logEvent(fc.eventTypes.onNextPageSuccess, {
                        from: oldPage,
                        to: newPage,
                        timeSpent: (Date.now() - fc.nextPageLoadedTimestamp) / 1000
                    });

                    fc.nextPageLoadedTimestamp = Date.now();

                    // If the application is complete, raise completion event
                    if (typeof page.page === "object" && isSubmitPage(page.page)) {
                        $(fc.jQueryContainer).trigger(fc.jsEvents.onFormComplete);
                        logEvent(fc.eventTypes.onFormComplete);
                    }
                    return;
                }

                // Form is deemed complete, output default completion message
                $(fc.jQueryContainer + ' .render').html(fc.lang.formCompleteHtml);
                $(fc.jQueryContainer).trigger(fc.jsEvents.onFormComplete);
                logEvent(fc.eventTypes.onFormComplete);
            } else {
                logEvent(fc.eventTypes.onNextPageError);
            }
        });
    };

    /**
     * Register event listeners specific for one page
     */
    registerOnePageListeners = function () {
        // When the user scrolls up/down, change the active page state depending on the offset
        $(document).on('scroll', function () {
            var iterator, offset, page, el;

            for (iterator = 0; iterator < fc.pageOrders.length; iterator += 1) {
                // Determine the offset of the page
                el = $('[data-page-id="' + fc.pageOrders[iterator] + '"]');
                if (el.length > 0) {
                    offset = parseInt($('[data-page-id="' + fc.pageOrders[iterator] + '"]').offset().top, 10);
                    offset += parseInt(fc.config.scrollOffset, 10) - fc.config.activePageOffset;

                    if ($(document).scrollTop() > offset) {
                        if (fc.activePage === undefined) {
                            fc.activePage = fc.pageOrders[iterator];
                        }

                        page = fc.pageOrders[iterator];
                    }
                }
            }

            // If a page was found and its different to the current page, fire off the change in state
            if (page !== undefined && fc.activePage !== page) {
                $(fc.jQueryContainer).trigger(fc.jsEvents.onPageChange, [fc.activePage, page]);
                fc.activePage = page;
            }
        });
    };

    /**
     * Register event listeners.
     */
    registerEventListeners = function () {
        // Submit a form page
        $(fc.jQueryContainer).on('click', 'div.fc-submit input[type=submit]', function () {
            loadNextPage();
            return false;
        });

        // When the form is complete, delete the session
        $(fc.jQueryContainer).on(fc.jsEvents.onFormComplete, function () {
            // @todo: rework, no timeout
            deleteSession(false);
        });

        // Previous page click
        $(fc.jQueryContainer).on('click', '.fc-prev-page', function () {
            if (fc.config.showPrevPageButton !== true) {
                return false;
            }

            $(fc.jQueryContainer).trigger(fc.jsEvents.onPrevPage);
            window.history.back();
            return false;
        });

        registerValueChangedListeners();

        // When the hash changes - navigate forward/backwards
        $(window).on('hashchange', function () {
            var pageId = window.location.hash.substr(1),
                pageDiv;

            if (fc.ignoreHashChangeEvent === false && fc.oldHash !== pageId && typeof fc.pages[pageId] === 'object') {
                render(pageId);
            }

            fc.oldHash = pageId;
            fc.ignoreHashChangeEvent = false;

            // Smooth scroll
            if (fc.config.smoothScroll) {
                setTimeout(function (pageId) {
                    var offset;

                    // If the last edited field disables scrolling, do not scroll
                    if (fc.lastCompletedField && fc.fieldSchema[fc.lastCompletedField] && !getConfig(fc.fieldSchema[fc.lastCompletedField], 'allowAutoScroll', true)) {
                        return;
                    }

                    // Only want to scroll once
                    if (fc.activeScroll.length > 0) {
                        return;
                    }
                    fc.activeScroll = pageId;

                    pageDiv = $('.fc-page:last');
                    if (pageDiv.length > 0 && pageDiv.attr('data-page-id') === pageId) {
                        offset = parseInt(pageDiv.offset().top, 10) + parseInt(fc.config.scrollOffset, 10);

                        // If at the top of the page, apply the initial offset
                        if ($(document).scrollTop() === 0) {
                            offset += fc.config.initialScrollOffset;
                        }

                        // Apply a conditional offset
                        if (fc.config.conditionalHtmlScrollOffset.class !== undefined) {
                            if ($('html').hasClass(fc.config.conditionalHtmlScrollOffset.class)) {
                                offset += fc.config.conditionalHtmlScrollOffset.offset;
                            }
                        }

                        $('html,body').animate({
                            scrollTop: offset + "px"
                        }, fc.config.scrollDuration, function () {
                            fc.activeScroll = "";
                        });
                    }

                }.bind(this, pageId), fc.config.scrollWait);
            }
        });

        // Add value for a repeatable group
        $(fc.jQueryContainer).on('click', '.fc-repeatable a.fc-click', function () {
            var dataId = $(this).attr('data-id'),
                html = $("<div />").append($('[fc-data-group="' + dataId + '"] > .fc-fieldcontainer').clone()).html();

            // Set current active modal
            fc.activeModalField = dataId;
            fc.modalState = fc.states.ADD_REPEATABLE;

            $('.fc-modal .modal-body').html(html);
            $('.fc-modal').addClass('fc-show');

            return false;
        });

        // Hide fc model
        $(fc.jQueryContainer).on('click', '.fc-modal .fc-btn-close', function () {
            $('.fc-modal.fc-show').removeClass('fc-show');
            return false;
        });

        // Add the value for the fc modal
        $(fc.jQueryContainer).on('click', '.fc-modal .fc-btn-add', function () {
            if (fc.modalState !== undefined && typeof fc.modalState === "string") {
                switch (fc.modalState) {
                case fc.states.DELETE_REPEATABLE:
                    deleteRepeatableRow();
                    break;
                case fc.states.ADD_REPEATABLE:
                    addRepeatableRow();
                    break;
                case fc.states.EMAIL_VERIFICATION_CODE:
                    verifyEmailAddress();
                    break;
                case fc.states.SMS_VERIFICATION_CODE:
                    verifyMobileNumber();
                    break;
                }
            }

            return false;
        });

        registerRepeatableGroupletListeners();

        if (fc.config.onePage) {
            registerOnePageListeners();
        }
    };

    /**
     * Generates a random string of length $length
     *
     * @param length
     * @returns {string}
     */
    generateRandomString = function (length) {
        var str = '',
            chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            x;

        for (x = 0; x < length; x += 1) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return str;
    };

    /**
     * Register the formcorp css files
     */
    loadCssFiles = function () {
        var cssId = 'formcorp-css',
            cssUri = 'formcorp.css',
            iterator;

        if ($('#' + cssId).length === 0) {
            loadCssFile(cdnUrl + cssUri);
        }

        $(fc.jQueryContainer).addClass('fc-container');
        addModalWindow();
        $(fc.jQueryContainer).prepend('<div class="fc-loading-screen"><div class="fc-loading-halo"></div></div>');

        // Load the required css files
        for (iterator = 0; iterator < fc.config.signatureLibCss.length; iterator += 1) {
            loadCssFile(fc.config.signatureLibCss[iterator]);
        }

        // Load the required js files
        for (iterator = 0; iterator < fc.config.signatureLibJs.length; iterator += 1) {
            loadJsFile(fc.config.signatureLibJs[iterator]);
        }

        fc.renderedSignatures = {};
    };

    /**
     * Add a modal window to the page
     */
    addModalWindow = function () {

        if ($('#fc-modal').length > 0) {
            return;
        }

        var modal = '<div class="fc-modal" id="fc-modal" aria-hidden="true">' +
            '<div class="modal-dialog">' +
            '<div class="modal-header">' +
            '<h2>' + fc.lang.addModalHeader + '</h2>' +
            '</div>' +
            '<div class="modal-body">' +
            '<p>One modal example here! :D</p>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<div class="fc-loading fc-hide"></div>' +
            '<div class="fc-error fc-hide"></div>' +
            '<a href="#" class="btn btn-danger fc-btn-close">' + fc.lang.closeModalText + '</a> ' +
            '<a href="#" class="btn btn-success fc-btn-add">' + fc.lang.addModalText + '</a> ' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';


        $(fc.jQueryContainer).prepend($(modal));
    };

    /**
     * Order schema numerically by data columns.
     * @param schema
     * @param orderColumn
     * @returns {*}
     */
    orderSchema = function (schema, orderColumn) {
        if (orderColumn === undefined) {
            orderColumn = 'order';
        }

        if (typeof schema === 'object') {
            var key;
            // Recursively order children
            for (key in schema) {
                if (schema.hasOwnProperty(key)) {
                    // Chilcren have order, try to order the object
                    if (!!schema[key] && typeof schema[key] === 'object' && schema[key][0] !== undefined && !!schema[key][0] && schema[key][0].order !== undefined) {
                        schema[key] = orderObject(schema[key]);
                    } else {
                        schema[key] = orderSchema(schema[key], orderColumn);
                    }
                }
            }
        }

        return schema;
    };

    /**
     * Orders an object numerically in ascending order by a given data column.
     * @param object
     * @returns {Array}
     */
    orderObject = function (object) {
        // Construct a 2-dimensional array (so pages with same order don't override each other)
        var orderedObject = [],
            key,
            order,
            objects = [],
            x;

        for (key in object) {
            if (object.hasOwnProperty(key)) {
                order = object[key].order !== undefined ? object[key].order : 0;
                if (orderedObject[order] === undefined) {
                    orderedObject[order] = [];
                    orderedObject[order].push(object[key]);
                }
            }
        }

        // Flatten the two-dimensional array in to a single array
        for (key in orderedObject) {
            if (orderedObject.hasOwnProperty(key)) {
                for (x = 0; x < orderedObject[key].length; x += 1) {
                    objects.push(orderedObject[key][x]);
                }
            }
        }

        return objects;
    };

    /**
     * Prune fields not on a current page
     * @param page
     * @param fields
     * @returns {{}}
     */
    pruneNonPageFields = function (page, fields) {
        var pageFields = [], section, x, y, field, obj = {};

        if (typeof page.page === "object" && typeof page.page.section === "object") {
            for (x = 0; x < page.page.section.length; x += 1) {
                section = page.page.section[x];
                if (typeof section.field === "object" && section.field.length > 0) {
                    for (y = 0; y < section.field.length; y += 1) {
                        field = section.field[y];
                        /*jslint nomen: true*/
                        pageFields.push(field._id.$id);
                        if (fields[field._id.$id] !== undefined) {
                            obj[field._id.$id] = fields[field._id.$id];
                        } else {
                            obj[field._id.$id] = "";
                        }
                        /*jslint nomen: false*/
                    }
                }
            }
        }

        return obj;
    };

    /**
     * Remove the fields from invisible sections from a data object (not DOM)
     * @param page
     * @param fields
     * @returns {*}
     */
    removeInvisibleSectionFields = function (page, fields) {
        var section, x, y, visible, field;

        if (typeof page.page === "object" && typeof page.page.section === "object") {
            for (x = 0; x < page.page.section.length; x += 1) {
                section = page.page.section[x];

                if (typeof section.visibility === 'string' && section.visibility.length > 0) {
                    visible = eval(section.visibility);
                    if (!visible) {
                        if (typeof section.field === "object" && section.field.length > 0) {
                            for (y = 0; y < section.field.length; y += 1) {
                                field = section.field[y];
                                /*jslint nomen: true*/
                                delete fields[field._id.$id];
                                /*jslint nomen: false*/
                            }
                        }
                    }
                }
            }
        }

        return fields;
    };

    /**
     * Remove invisible fields from an object
     * @param fields
     * @returns {*}
     */
    pruneInvisibleFields = function (fields) {
        if (typeof fields === "object") {
            var dataId, field, visible;
            for (dataId in fields) {
                if (fields.hasOwnProperty(dataId)) {
                    field = fc.fieldSchema[dataId];
                    if (field === undefined) {
                        continue;
                    }
                    if (typeof field.config.visibility === 'string' && field.config.visibility.length > 0) {
                        visible = eval(field.config.visibility);
                        if (typeof visible === 'boolean') {
                            if (!visible) {
                                delete fields[dataId];
                            }
                        }
                    }
                }
            }
        }

        return fields;
    };

    /**
     * Returns true if a field is valid.
     * @param dataId
     * @param value
     * @returns {boolean}
     */
    fieldIsValid = function (dataId, value) {
        var schema,
            customErrors,
            id,
            iterator,
            grouplet,
            val;

        // Can pass through either an id to retrieve the schema, or the schema itself
        try {
            if (typeof dataId === "string") {
                schema = fc.fieldSchema[dataId];
            } else if (typeof dataId === "object") {
                schema = dataId;
                dataId = getId(schema);
            }

            if (typeof schema !== "object") {
                return true;
            }
        } catch (ignore) {
        }

        // Return false if required and empty
        if (schema.config !== undefined && schema.config.required !== undefined) {
            if (schema.config.required && value === "") {
                return false;
            }
        }

        // If a grouplet, need to check each field within
        if (schema.type === "grouplet" && !getConfig(schema, "repeatable", false)) {
            grouplet = getConfig(schema, 'grouplet', {});
            if (grouplet.field !== undefined && typeof grouplet.field === "object" && grouplet.field.length > 0) {
                for (iterator = 0; iterator < grouplet.field.length; iterator += 1) {
                    /*jslint nomen:true*/
                    id = dataId + prefixSeparator + grouplet.field[iterator]._id.$id;
                    /*jslint nomen:false*/
                    val = (fc.fields[id] !== undefined) ? fc.fields[id] : "";
                    if (!fieldIsValid(grouplet.field[iterator], val)) {
                        return false;
                    }
                }
            }

            return true;
        }

        // Check custom validators
        customErrors = getCustomErrors(schema, value);
        if (customErrors.length > 0) {
            return false;
        }

        return true;
    };

    /**
     * Iterates through an object of dataId=>value pairs to determine if fields are valid.
     *
     * @param fields
     * @returns {boolean}
     */
    formFieldsValid = function (fields) {
        if (typeof fields !== "object") {
            return true;
        }

        var dataId;

        for (dataId in fields) {
            if (fields.hasOwnProperty(dataId)) {
                if (!fieldIsValid(dataId, fields[dataId])) {
                    return false;
                }
            }
        }

        return true;
    };

    /**
     * Retrieve the first page (if the user has an active session, the opening page might be later on in the process)
     * @returns {*}
     */
    getFirstPage = function () {
        /*jslint nomen: true*/
        var id = fc.schema.stage[0].page[0]._id.$id,
            page,
            nextPageObj,
            fields,
            valid;
        /*jslint nomen: false*/

        // Iterate through the pages until we come to one that isn't valid (meaning this is where our progress was)
        do {
            page = getPageById(id);
            if (page === undefined) {
                console.log('FC Error: Page not found');
                break;
            }

            if (typeof page.stage !== 'object') {
                break;
            }
            fc.currentPage = id;
            window.location.hash = id;

            // Store field schema locally
            updateFieldSchema(page.stage);
            fields = pruneNonPageFields(page, fc.fields);
            fields = removeInvisibleSectionFields(page, fields);
            fields = pruneInvisibleFields(fields);
            valid = formFieldsValid(fields);

            // If using a one page form structure, output
            if (fc.config.onePage) {
                render(id);
            }

            if (valid) {
                nextPageObj = nextPage(false, true);
                // @todo problem here - why we cant go back
                if (nextPageObj !== undefined && typeof nextPageObj === "object") {
                    /*jslint nomen: true*/
                    id = nextPageObj.page._id.$id;
                    /*jslint nomen: false*/
                    fc.prevPages[id] = page;
                } else {
                    valid = false;
                }
            }
        } while (valid);

        return id;
    };

    /**
     * Load the form schema/definition
     */
    loadSchema = function () {
        // Send off the API call
        api('form/schema', {}, 'post', function (data) {
            if (typeof data.error === 'boolean' && data.error) {
                console.log('FC Error: ' + data.message);
                return;
            }

            var key, firstPageId;

            // If data returned by the API server, set locally
            if (typeof data.data === 'object' && Object.keys(data.data).length > 0) {
                for (key in data.data) {
                    if (data.data.hasOwnProperty(key)) {
                        fc.fields[key] = data.data[key];

                        // If a grouplet, also store the entire state
                        if (key.indexOf(prefixSeparator) > -1) {
                            saveOriginalGroupletValue(key, data.data[key]);
                        }
                    }
                }
            }

            // Render the opening page for the form
            if (data.stage !== undefined) {
                fc.schema = orderSchema(data);
                if (typeof fc.schema.stage === 'object' && fc.schema.stage.length > 0 && typeof fc.schema.stage[0].page === 'object' && fc.schema.stage[0].page.length > 0) {
                    firstPageId = getFirstPage();

                    // If one page layout, getFirstPage() already rendered
                    if (!fc.config.onePage) {
                        render(firstPageId);
                    }
                }
            }

            $(fc.jQueryContainer).trigger(fc.jsEvents.onConnectionMade);
        });
    };

    /**
     * Process the save queue
     */
    processSaveQueue = function () {
        if (fc.config.saveInRealTime !== true) {
            return;
        }

        // Terminate if already running
        if (fc.saveQueueRunning === true) {
            console.log('[FC] Save queue is already running (slow server?)');
            return;
        }

        // Terminate if nothing to do
        if (Object.keys(fc.saveQueue).length === 0) {
            return;
        }

        // Store value locally, so we can remove later
        fc.saveQueueRunning = true;
        var temporaryQueue = fc.saveQueue,
            data = {
                form_id: fc.formId,
                page_id: fc.pageId,
                form_values: temporaryQueue
            };

        // Fire off the API call
        api('page/submit', data, 'put', function (data) {
            var key;
            if (typeof data === "object" && data.success === true) {
                // Update activity (server last active timestamp updated)
                fc.lastActivity = (new Date()).getTime();

                // Delete values from the save queue
                for (key in temporaryQueue) {
                    if (temporaryQueue.hasOwnProperty(key)) {
                        if (typeof fc.saveQueue[key] === "string" && fc.saveQueue[key] === temporaryQueue[key]) {
                            delete fc.saveQueue[key];
                        }
                    }
                }
            }

            fc.saveQueueRunning = false;
        });
    };

    return {

        /**
         * Initialise the formcorp object.
         * @param publicKey
         * @param container
         */
        init: function (publicKey, container) {
            this.publicKey = publicKey;
            this.container = container;
            this.jQueryContainer = '#' + container;

            // Temporary placeholders for objects to be populated
            this.fields = {};
            this.fieldSchema = {};
            this.sections = {};
            this.pages = {};
            this.saveQueueRunning = false;
            this.saveQueue = {};
            this.prevPages = {};
            this.lastActivity = (new Date()).getTime();
            this.expired = false;
            this.pageOrders = [];
            this.activeScroll = "";
            this.processedActions = {};
            this.analytics = false;
            this.lastCompletedField = '';
            this.lastCompletedTimestamp = Date.now();
            this.lastHesitationTime = -1;
            this.nextPageLoadedTimestamp = Date.now();

            /**
             * Register modal states
             * @type {{DELETE_REPEATABLE: string, ADD_REPEATABLE: string, EMAIL_VERIFICATION_CODE: string, SMS_VERIFICATION_CODE: string}}
             */
            this.states = {
                DELETE_REPEATABLE: 'deleteRepeatable',
                ADD_REPEATABLE: 'addRepeatableRow',
                EMAIL_VERIFICATION_CODE: 'emailVerificationCode',
                SMS_VERIFICATION_CODE: 'smsVerificationCode'
            };

            /**
             * Type of events
             * @type {{onFocus: string, onBlur: string, onValueChange: string, onNextStage: string, onFormInit: string, onMouseDown: string, onFieldError: string, onNextPageClick: string, onNextPageSuccess: string, onNextPageError: string, onFormComplete: string}}
             */
            this.eventTypes = {
                onFieldInit: 'onFieldInit',
                onFocus: 'onFocus',
                onBlur: 'onBlur',
                onValueChange: 'onValueChange',
                onNextStage: 'onNextStage',
                onFormInit: 'onFormInit',
                onMouseDown: 'onMouseDown',
                onFieldError: 'onFieldError',
                onNextPageClick: 'onNextPageClick',
                onNextPageSuccess: 'onNextPageSuccess',
                onNextPageError: 'onNextPageError',
                onFormComplete: 'onFormComplete'
            };

            /**
             * Javascript events to raise
             * @type {{onFormInit: string, onFormExpired: string, onValidationError: string, onFormComplete: string, onNextPage: string, onPrevPage: string, onConnectionMade: string}}
             */
            this.jsEvents = {
                onFormInit: 'OnFcInit',
                onFormExpired: 'onFormExpired',
                onValidationError: 'onValidationError',
                onFormComplete: 'onFormComplete',
                onNextPage: 'onNextPage',
                onPageChange: 'onPageChange',
                onPrevPage: 'onPrevPage',
                onConnectionMade: 'onFCConnectionMade',
                onFinishRender: 'onFinishFormRender',
                onFieldError: 'onFieldError',
                onFieldSuccess: 'onFieldSuccess',
                onAnalyticsLoaded: 'onAnalyticsLoaded'
            };

            /**
             * One time processes
             * @type {{emailListeners: string, smsListeners: string, creditCardListeners: string}}
             */
            this.processes = {
                emailListeners: 'emailListeners',
                smsListeners: 'smsListeners',
                creditCardListeners: 'creditCardListeners',
                loadSignatureLibs: 'loadSignatureLibs'
            };

            /**
             * Payment environments
             * @type {{live: string, sandbox: string}}
             */
            this.environments = {
                live: "Live",
                sandbox: "Sandbox"
            };

            /**
             * Payment gateways
             * @type {{paycorp: {method: string, action: string}}}
             */
            this.gateways = {
                paycorp: {
                    method: 'POST',
                    action: {
                        sandbox: 'https://test-merchants.paycorp.com.au/paycentre3/makeEntry',
                        live: 'https://merchants.paycorp.com.au/paycentre3/makeEntry'
                    }
                }
            };

            /**
             * Credit card types
             * @type {{visa: string, mastercard: string, amex: string}}
             */
            this.cardTypes = {
                visa: 'visa',
                mastercard: 'mastercard',
                amex: 'amex'
            };

            // Set config if not already done so
            if (fc.config === undefined) {
                this.setConfig();
            }

            // Set language if not already done so
            if (fc.lang === undefined) {
                this.setLanguage();
            }

            // Set the session id
            this.initSession();

            // Analyse analytics if required
            if (fc.config.analytics === true || (typeof fc.config.analytics === "string" && fc.config.analytics.length > 0)) {
                initAnalytics();
            }

            // Check to make sure container exists
            $(document).ready(function () {
                if ($(fc.jQueryContainer).length === 0) {
                    return false;
                }

                // Fetch the form id
                if ($(fc.jQueryContainer).attr('data-id') === '') {
                    return false;
                }
                fc.formId = $(fc.jQueryContainer).attr('data-id');

                // Register event listeners and load the form schema
                $(fc.jQueryContainer).html('<div class="render"></div>');
                loadCssFiles();
                registerEventListeners();
                loadSchema();

                // Form has been successfully initialised
                fc.formPosition = $(fc.jQueryContainer).position();
                logEvent(fc.eventTypes.onFormInit);
                $(fc.jQueryContainer).trigger(fc.jsEvents.onFormInit);

                // Save form fields intermittently
                if (fc.config.saveInRealTime === true) {
                    setInterval(function () {
                        processSaveQueue();
                    }, fc.config.saveInRealTimeInterval);
                }

                // Check if the user needs to be timed out
                if (fc.config.timeUserOut) {
                    setInterval(function () {
                        if (fc.expired === true) {
                            return;
                        }

                        timeout();
                    }, 5000);
                }
            });
        },

        /**
         * Return the CDN url
         * @returns {string}
         */
        getCdnUrl: function () {
            return cdnUrl;
        },

        /**
         * Return the API function
         */
        api: api,

        /**
         * Retrieve a URL parameter by name
         * @param name
         * @returns {string}
         */
        getUrlParameter: function (name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(location.search);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        },

        /**
         * Set the form branch to use.
         * @param branch
         */
        setBranch: function (branch) {
            this.branch = branch;
        },

        /**
         * Set class config values.
         * @param data
         */
        setConfig: function (data) {
            var eventQueueDefault = 8000,
                realTimeSaveDefault = 6000,
                key;

            // Default values
            this.config = {
                analytics: true,
                realTimeValidation: true,
                inlineValidation: true,
                sessionKeyLength: 40,
                sessionIdName: 'fcSessionId',
                eventQueueInterval: eventQueueDefault,
                saveInRealTime: true,
                saveInRealTimeInterval: realTimeSaveDefault,
                showPrevPageButton: true,
                timeUserOut: false,
                timeOutWarning: 870, // 14 minutes 30 seconds
                timeOutAfter: 900, // 15 minutes,
                cvvImage: null,
                onePage: false,
                smoothScroll: false,
                scrollDuration: 1000,
                scrollWait: 500,
                initialScrollOffset: 0,
                scrollOffset: 0,
                conditionalHtmlScrollOffset: {},
                autoLoadPages: false,
                autoScrollToNextField: false,
                activePageOffset: 250,
                creditCardNumberLimits: [16, 16],
                maxCreditCardCodeLength: 4,
                descriptionBeforeLabel: true,
                creditCardErrorUrlParam: 'creditCardError',
                signatureLibCss: [
                    cdnUrl + 'dist/signaturepad/assets/jquery.signaturepad.css'
                ],
                signatureLibJs: [
                    cdnUrl + 'dist/signaturepad/jquery.signaturepad.min.js',
                    cdnUrl + 'dist/signaturepad/assets/flashcanvas.js',
                    cdnUrl + 'dist/signaturepad/assets/json2.min.js'
                ],
                signatureClass: 'sigPad'
            };

            // Minimum event queue interval (to prevent server from getting slammed)
            if (this.config.eventQueueInterval < eventQueueDefault) {
                this.config.eventQueueInterval = eventQueueDefault;
            }

            // Minimum interval for real time saving (to prevent server from getting harrassed)
            if (this.config.saveInRealTimeInterval < realTimeSaveDefault) {
                this.config.saveInRealTimeInterval = realTimeSaveDefault;
            }

            // Update with client options
            if (typeof data === 'object' && Object.keys(data).length > 0) {
                for (key in data) {
                    if (data.hasOwnProperty(key)) {
                        fc.config[key] = data[key];
                    }
                }
            }
        },

        fieldErrors: fieldErrors,

        /**
         * Set the language data values
         * @param data
         */
        setLanguage: function (data) {
            var key;

            // Initialise the language
            this.lang = {
                prevButtonText: 'Previous',
                submitText: "Next",
                submitFormText: "Submit application",
                formCompleteHtml: '<h2 class="fc-header">Your application is complete</h2><p>Congratulations, your application has successfully been completed. Please expect a response shortly.</p>',
                addFieldTextValue: 'Add value',
                closeModalText: 'Close',
                addModalText: 'Add',
                addModalHeader: 'Add value',
                emptyFieldError: 'This field cannot be empty',
                defaultCustomValidationError: 'This field failed custom validation',
                sessionExpiredHtml: '<h2 class="fc-header">Your session has expired</h2><p>Unfortunately, due to a period of extended inactivity, your session has expired. To fill out a new form submission, please refresh your page.</p>',
                creditCardNameText: 'Name (as it appears on your card)',
                creditCardNumberText: 'Card number (no dashes or spaces)',
                creditCardExpiryDateText: 'Expiration date',
                creditCardSecurityCodeText: 'Security code (3 on back, Amex: 4 on front)',
                monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                creditCardMissingName: "You must enter a valid name as it appears on your credit card",
                creditCardMissingNumber: "You must enter a valid credit card number",
                creditCardMissingExpiryDate: "You must enter a valid expiry date",
                creditCardExpired: "Your card has expired",
                creditCardMissingSecurityCode: "You must enter a valid security code",
                creditCardNumberIncorrectFormat: "The format of your credit card number is incorrect, please verify your details",
                edit: "Edit",
                delete: "Delete",
                deleteDialogHeader: "Are you sure?",
                deleteDigntoaryDialogText: "Are you sure you want to delete the selected signatory?",
                confirm: "Confirm",
                invalidCardFormat: "The credit card you entered could not be recognised",
                sendEmail: "Send email",
                fieldValidated: "<p>Successfully verified</p>",
                fieldMustBeVerified: "You must first complete verification",
                sendSms: "Send SMS",
                payNow: "Pay now",
                creditCardSuccess: "<p>Your payment has successfully been processed.</p>",
                paymentRequired: "Payment is required before proceeding.",
                paymentGst: "GST:",
                paymentSubTotal: "Sub-total:",
                paymentTotal: "Total:",
                currencySymbol: "$",
                total: "Total",
                description: "Description",
                paymentDescription: "Application completion"
            };

            // Update with client options
            if (typeof data === 'object' && Object.keys(data).length > 0) {
                for (key in data) {
                    if (data.hasOwnProperty(key)) {
                        fc.lang[key] = data[key];
                    }
                }
            }
        },

        /**
         * Initialise the existing session, or instantiate a new one.
         */
        initSession: function () {
            // Initialise a new session
            if (this.sessionId === undefined && $.cookie(this.config.sessionIdName) === undefined) {
                this.sessionId = generateRandomString(this.config.sessionKeyLength);
                $.cookie(this.config.sessionIdName, this.sessionId);
            } else {
                this.sessionId = $.cookie(this.config.sessionIdName);
            }
        },

        /**
         * Returns whether two values are equal.
         *
         * @param field
         * @param comparisonValue
         * @returns {boolean}
         */
        comparisonEqual: function (field, comparisonValue) {
            if (field === undefined) {
                return false;
            }

            return field === comparisonValue;
        },

        /**
         * Returns whether a string exists within an array.
         * @param field
         * @param comparisonValue
         * @returns {boolean}
         */
        comparisonIn: function (field, comparisonValue) {
            if (field === undefined) {
                return false;
            }

            var x,
                value,
                json;

            // Attempt to typecast string to json
            try {
                json = $.parseJSON(field);
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
            } else if (typeof field === "object" && typeof comparisonValue === "object") {
                // Check an array of values against an array of values
                for (x = 0; x < comparisonValue.length; x += 1) {
                    if (field.indexOf(comparisonValue[x]) === -1) {
                        return false;
                    }
                }

                return true;
            }

            return false;
        },

        /**
         * Makes sure a value does not exist within a set
         * @param field
         * @param comparisonValue
         * @returns {boolean}
         */
        comparisonNot_in: function (field, comparisonValue) {
            return !fc.comparisonIn(field, comparisonValue);
        },

        /**
         * Checks to see if a value against a field has been set
         * @param field
         * @returns {boolean}
         */
        comparisonIs_not_null: function (field) {
            return field !== undefined;
        },

        /**
         * Checks to see if a value against a field has been set
         * @param field
         * @returns {boolean}
         */
        comparisonIs_null: function (field) {
            return field === undefined;
        },

        /**
         * Converts a string to camel case.
         * @param str
         * @returns {*}
         */
        toCamelCase: function (str) {
            return str.replace(/^([A-Z])|\s(\w)/g, function (match, p1, p2) {
                if (p2) {
                    return p2.toUpperCase();
                }
                return p1.toLowerCase();
            });
        },

        /**
         * Tests if a value is within a particular range.
         * @param params
         * @param value
         * @returns {boolean}
         */
        validatorRange: function (params, value) {
            if (!$.isNumeric(value)) {
                return false;
            }

            var min = parseFloat(params[0]),
                max = parseFloat(params[1]),
                val = parseFloat(value);

            return val >= min && val <= max;
        },

        /**
         * Tests if above a minimum value.
         * @param params
         * @param value
         * @returns {boolean}
         */
        validatorMin: function (params, value) {
            if (!$.isNumeric(value)) {
                return false;
            }

            return parseFloat(value) >= parseFloat(params[0]);
        },

        /**
         * Test if below minimum value.
         * @param params
         * @param value
         * @returns {boolean}
         */
        validatorMax: function (params, value) {
            if (!$.isNumeric(value)) {
                return false;
            }

            return parseFloat(value) <= parseFloat(params[0]);
        },

        /**
         * Test a string against a regular expression.
         * @param params
         * @param value
         * @returns {boolean|*}
         */
        validatorRegularExpression: function (params, value) {
            var re = new RegExp(params[0]);
            return re.test(value);
        }
    };

}(jQuery));