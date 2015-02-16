/**
 * FormCorp JS SDK
 * @author Alex Berriman <alexb@fishvision.com>
 * @website http://www.formcorp.com.au/
 *
 * Ability to embed a JS client side form on to an external webpage.
 */

/*global define,exports,require,jQuery,document,console,window,setInterval*/


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

    var apiUrl = '//192.168.247.129:9001/',
        cdnUrl = '//192.168.247.129:9004/',
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
         * Return the value of a field element.
         * @param field
         * @returns {*}
         */
        getFieldValue = function (field) {
            var selector,
                values = [];

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

                return field.val();

            }

            if (field.is('select')) {
                return $(field).find('option:selected').text();
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
                callbackFunction;

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
                dataField;

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

            // Test required data
            dataField = $('[fc-data-group="' + id + '"] [data-required="true"]');
            if (fieldIsEmpty(dataField)) {
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

            // Default params
            if (params === undefined) {
                params = {};
            }

            var eventObject = {
                'event': event,
                'params': params,
                'time': (new Date()).getTime()
            };

            fc.events.push(eventObject);
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
         * Remove the error on the DOM for a given field.
         * @param dataId
         */
        removeFieldError = function (dataId) {
            $(fc.jQueryContainer).find('div[fc-data-group="' + dataId + '"]').removeClass('fc-error');
        },

        /**
         * 'god' fields do not require a value (i.e. rich text area)
         * @type {string[]}
         */
        godFields = ["richTextArea"],

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
            expiryMonth = ccForm.find('.fc-cc-expirydate option:selected');
            expiryYear = ccForm.find('.fc-cc-expirydate-year option:selected');
            securityCode = ccForm.find('.fc-cc-ccv input');

            // Validate credit card name
            if (cardName.val().length === 0) {
                errors.push(fc.lang.creditCardMissingName);
            }

            // Validate credit card number
            if (cardNumber.val().length === 0) {
                errors.push(fc.lang.creditCardMissingNumber);
            }

            // Expiry - ensure values entered
            if (expiryMonth.val().length === 0 || expiryYear.val().length === 0) {
                errors.push(fc.lang.creditCardMissingExpiryDate);
            } else if (typeof expiryMonth.val() !== "number" || expiryMonth.val() < 1 || expiryMonth.val() > 12) {
                // Check month within range 1 <= month <= 12
                errors.push(fc.lang.creditCardMissingExpiryDate);
            } else if (typeof expiryYear.val() !== "number" || expiryYear.val() < (new Date()).getFullYear() || expiryYear.val() > ((new Date()).getFullYear() + 30)) {
                // Check year within range CURRENT_YEAR <= year <= (CURRENT_YEAR + 30)
                errors.push(fc.lang.creditCardMissingExpiryDate);
            } else if (expiryYear.val() === (new Date()).getFullYear() && expiryMonth.val() < (new Date()).getMonth()) {
                errors.push(fc.lang.creditCardExpired);
            }

            return errors;
        },

        /**
         * Return a value from the field's configuration options.
         * @param field
         * @param key
         * @param defaultVal
         * @returns {*}
         */
        getConfig = function (field, key, defaultVal) {
            if (defaultVal === undefined) {
                defaultVal = '';
            }

            if (typeof field.config === 'object' && field.config[key] !== undefined) {
                return field.config[key];
            }

            return defaultVal;
        },

        /**
         *
         * @param dataId
         * @param field
         * @param section
         * @returns {Array}
         */
        validateGrouplet = function (dataId, field, section) {
            return [];
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
         * @returns {boolean}
         */
        validForm = function () {
            var errors = {},
                required;

            // Test if required fields have a value
            $('.fc-field[fc-data-group]').each(function () {
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
                    localErrors = [];

                // If not required, do nothing
                if (getConfig(field, 'required', false) === false) {
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
                    localErrors = validCreditCardField(dataId, field, section);
                } else if (field.type === "grouplet") {
                    // Grouplet field as a whole doesn't need to be validated
                    return;
                }

                // If repeatable and required, check the amount of values
                if (localErrors.length === 0) {
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
                    showFieldError(dataId, localErrors);
                } else {
                    removeFieldError(dataId);
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
         * Converts an object to a literal boolean object string.
         * @param obj
         * @returns {*}
         */
        toBooleanLogic = function (obj) {
            var condition = '',
                x,
                rule,
                comparison,
                compare = '';

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
                a,
                z,
                field,
                id;

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
                                    console.log($.parseJSON(page.toCondition[key]));
                                    console.log(toBooleanLogic($.parseJSON(page.toCondition[key])));
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
                        for (z = 0; z < section.field.length; z += 1) {
                            field = section.field[z];
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
                        }
                    }
                }
            }
        },

        /**
         * Set values on DOM from fields in JS
         */
        setFieldValues = function () {
            $('div[fc-data-group]').each(function () {
                var fieldId = $(this).attr('fc-data-group'),
                    fieldGroup,
                    value,
                    schema,
                    x,
                    list,
                    key,
                    li,
                    obj;

                if (fc.fields[fieldId] !== undefined) {
                    fieldGroup = $(this).find('.fc-fieldgroup');
                    value = fc.fields[fieldId];
                    schema = fc.fieldSchema[fieldId];

                    if (typeof schema.config.repeatable === 'boolean' && schema.config.repeatable) {
                        // Restore a repeatable value
                        if (typeof value === 'object') {
                            // Build a list to output
                            for (x = 0; x < value.length; x += 1) {
                                obj = value[x];

                                list = $('<ul></ul>');
                                for (key in obj) {
                                    if (obj.hasOwnProperty(key)) {
                                        li = $('<li></li>');
                                        li.html(obj[key]);
                                        list.append(li);
                                    }
                                }
                                $('[fc-data-group="' + fieldId + '"] .fc-summary').append(list);
                            }
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

            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                fieldId = prefix + field._id.$id,
                html = '<textarea class="fc-fieldinput" formcorp-data-id="' + fieldId + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '" rows="' + getConfig(field, 'rows', 3) + '"></textarea>';
            /*jslint nomen: false*/

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
                id;
            /*jslint nomen: false*/

            if (options.length > 0) {
                options = options.split("\n");
                cssClass = getConfig(field, 'inline', false) === true ? 'fc-inline' : 'fc-block';
                for (x = 0; x < options.length; x += 1) {
                    option = options[x].replace(/(\r\n|\n|\r)/gm, "");
                    /*jslint nomen: true*/
                    id = field._id.$id + '_' + x;
                    /*jslint nomen: false*/

                    html += '<div class="' + cssClass + '">';
                    /*jslint nomen: true*/
                    html += '<input class="fc-fieldinput" type="checkbox" id="' + id + '" formcorp-data-id="' + fieldId + '" name="' + fieldId + '[]" value="' + htmlEncode(option) + '" data-required="' + required + '">';
                    /*jslint nomen: false*/
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
         * Render a credit card form
         * @param field
         * @returns {string}
         */
        renderCreditCard = function (field) {
            console.log(field);
            var html = '',
                month,
                year,
                currentYear = (new Date()).getFullYear();

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

            html += '</div>';
            /*!fc-payment*/
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
         */
        deleteSession = function () {
            $.removeCookie(fc.config.sessionIdName);
            $(fc.jQueryContainer + ' .render').html(fc.lang.sessionExpiredHtml);
            $(fc.jQueryContainer).trigger(fc.jsEvents.onFormExpired);
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
        getFirstPage,
        loadSchema,
        hasNextPage,
        processEventQueue,
        processSaveQueue,
        registerEventListeners,
        nextPage,
        render,
        renderPage,
        flushVisibility,
        flushSectionVisibility,
        flushFieldVisibility,
        registerValueChangedListeners,
        valueChanged,
        registerAnalyticsEventListeners,
        validateModal,
        orderSchema,
        orderObject;

    /**
     * Render a grouplet.
     * @param field
     * @returns {string}
     */
    renderGrouplet = function (field) {
        var html = '',
            fields;

        if (typeof field.config.grouplet === 'object') {
            fields = field.config.grouplet.field;
            /*jslint nomen: true*/
            html = renderFields(fields, field, [field._id.$id]);
            /*jslint nomen: false*/
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

            // Description text
            if (getConfig(field, 'description').replace(/(<([^>]+)>)/ig, "").length > 0) {
                fieldHtml += '<div class="fc-desc">' + getConfig(field, 'description') + '</div>';
            }

            fieldHtml += '<div class="fc-fieldcontainer">';

            // Field label
            if (getConfig(field, 'showLabel', false) === true && getConfig(field, 'label', '').length > 0) {
                fieldHtml += '<label>' + field.config.label + '</label>';
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


            fieldHtml += '</div>';
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
        var pageDiv = '<div class="fc-page"><form class="fc-form">',
            submitText = fc.lang.submitText,
            nextPageObj;

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
            pageDiv += renderPageSections(page.section);
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
        $(fc.jQueryContainer).find('.fc-fieldinput').each(function () {
            var dataId = $(this).attr('formcorp-data-id'),
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
            html;
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

        html = '<h1>' + page.stage.label + '</h1>';
        html += renderPage(page.page);

        $(fc.jQueryContainer + ' .render').html(html);

        // Set values from data array
        setFieldValues();

        // Flush the field/section visibility
        flushVisibility();

        // Update the hash, and ignore the hash change event
        fc.ignoreHashChangeEvent = true;
        window.location.hash = pageId;
    };

    /**
     * Render the next page
     * @param shouldRender
     * @param returnPage
     * @returns {boolean}
     */
    nextPage = function (shouldRender, returnPage) {
        if (typeof shouldRender !== 'boolean') {
            shouldRender = true;
        }

        // By default, should return boolean value
        if (typeof returnPage !== 'boolean') {
            returnPage = false;
        }

        var currentPage = getPageById(fc.currentPage),
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
     * Function that is fired when a data value changes.
     * @param dataId
     * @param value
     */
    valueChanged = function (dataId, value) {
        console.log(dataId);
        var fieldSchema = fc.fieldSchema[dataId],
            errors,
            params;

        // If unable to locate the field schema, do nothing (i.e. credit card field changes)
        if (fieldSchema === undefined) {
            return;
        }

        // Don't perform operations on repeatable fields
        if (typeof fieldSchema.config.repeatable !== 'boolean' || !fieldSchema.config.repeatable) {
            fc.fields[dataId] = value;

            // Flush the field visibility options
            flushVisibility();

            // Check real time validation
            if (fc.config.realTimeValidation === true) {
                errors = fieldErrors(dataId);
                if (errors.length > 0) {
                    // Log the error event
                    logEvent(fc.eventTypes.onFieldError, {
                        fieldId: dataId,
                        errors: errors
                    });

                    showFieldError(dataId, errors);
                } else {
                    removeFieldError(dataId);
                }
            }

            // Store the changed value for intermittent saving
            if (fc.config.saveInRealTime === true) {
                fc.saveQueue[dataId] = value;
            }

            // Register the value changed event
            params = {
                fieldId: dataId
            };
            logEvent(fc.eventTypes.onValueChange, params);
        }
    };

    /**
     * Register event listeners that fire when a form input field's value changes
     */
    registerValueChangedListeners = function () {
        // Input types text changed
        $(fc.jQueryContainer).on('change', 'input[type=text].fc-fieldinput, input[type=radio].fc-fieldinput', function () {
            valueChanged($(this).attr('formcorp-data-id'), $(this).val());
        });

        // Dropdown box change
        $(fc.jQueryContainer).on('change', 'select.fc-fieldinput', function () {
            valueChanged($(this).attr('formcorp-data-id'), $(this).find('option:selected').val());
        });
    };

    /**
     * Register the listeners to handle analytic events
     */
    registerAnalyticsEventListeners = function () {
        // Text value focused
        $(fc.jQueryContainer).on('focus', '.fc-fieldinput', function () {
            var dataId = $(this).attr('formcorp-data-id'),
                params = {
                    dataId: dataId
                };
            logEvent(fc.eventTypes.onFocus, params);
        });

        // Text value focused
        $(fc.jQueryContainer).on('blur', '.fc-fieldinput', function () {
            var dataId = $(this).attr('formcorp-data-id'),
                params = {
                    dataId: dataId
                };
            logEvent(fc.eventTypes.onBlur, params);
        });

        // Mouse down event
        $(fc.jQueryContainer).on('mousedown', function (e) {
            var x = parseInt(e.pageX - fc.formPosition.left, 10),
                y = parseInt(e.pageY - fc.formPosition.top, 10);

            logEvent(fc.eventTypes.onMouseDown, {
                x: x,
                y: y
            });
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
     * Register event listeners.
     */
    registerEventListeners = function () {
        // Submit a form page
        $(fc.jQueryContainer).on('click', 'div.fc-submit input[type=submit]', function () {
            logEvent(fc.eventTypes.onNextPageClick);

            if (!validForm()) {
                logEvent(fc.eventTypes.onNextPageError);
                return false;
            }

            var formData = {},
                data,
                page,
                belongsTo,
                dataId,
                dataGroup,
                groupletId;

            // Build the form data array
            $('[formcorp-data-id]').each(function () {
                // If belongs to a grouplet, need to process uniquely
                dataId = $(this).attr('formcorp-data-id');
                belongsTo = $(this).parent().parent().parent().attr('fc-belongs-to'); // @todo: make unique - this is horrible

                // Regular fields can be added to the flat dictionary
                formData[dataId] = getFieldValue($(this));

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

            console.log(data);

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

                    $(fc.jQueryContainer).trigger(fc.jsEvents.onNextPage);
                    logEvent(fc.eventTypes.onNextPageSuccess);

                    // Render the next page if available
                    if (hasNextPage()) {
                        nextPage();

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

            return false;
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
            var pageId = window.location.hash.substr(1);
            if (fc.ignoreHashChangeEvent === false && fc.oldHash !== pageId && typeof fc.pages[pageId] === 'object') {
                render(pageId);
            }

            fc.oldHash = pageId;
            fc.ignoreHashChangeEvent = false;
        });

        // Add value for a repeatable group
        $(fc.jQueryContainer).on('click', '.fc-repeatable a.fc-click', function () {
            var dataId = $(this).attr('data-id'),
                html = $("<div />").append($('[fc-data-group="' + dataId + '"] > .fc-fieldcontainer').clone()).html();

            // Set current active modal
            fc.activeModalField = dataId;

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
            var validModal = validateModal(),
                values = {},
                list,
                key,
                li;

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

            // Build a list to output
            list = $('<ul></ul>');
            for (key in values) {
                if (values.hasOwnProperty(key)) {
                    li = $('<li></li>');
                    li.html(values[key]);
                    list.append(li);
                }
            }
            $('[fc-data-group="' + fc.activeModalField + '"] .fc-summary').append(list);

            // Hide the modal
            $('.fc-modal.fc-show').removeClass('fc-show');
            return false;
        });

        registerAnalyticsEventListeners();
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
            head,
            link;

        if ($('#' + cssId).length === 0) {
            head = document.getElementsByTagName('head')[0];
            link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.href = cdnUrl + cssUri;
            link.media = 'all';
            head.appendChild(link);
        }

        $(fc.jQueryContainer).addClass('fc-container');
        addModalWindow();
        $(fc.jQueryContainer).prepend('<div class="fc-loading-screen"><div class="fc-loading-halo"></div></div>');
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
                    if (!!schema[key] && typeof schema[key] === 'object' && schema[key][0] !== undefined && schema[key][0].order !== undefined) {
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
        var schema = fc.fieldSchema[dataId],
            customErrors;

        // Return false if required and empty
        if (schema.config !== undefined && schema.config.required !== undefined) {
            if (schema.config.required && value === "") {
                return false;
            }
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

            if (valid) {
                nextPageObj = nextPage(false, true);
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

            var key,
                firstPageId;

            // If data returned by the API server, set locally
            if (typeof data.data === 'object' && Object.keys(data.data).length > 0) {
                for (key in data.data) {
                    if (data.data.hasOwnProperty(key)) {
                        fc.fields[key] = data.data[key];
                    }
                }
            }

            // Render the opening page for the form
            if (data.stage !== undefined) {
                fc.schema = orderSchema(data);
                if (typeof fc.schema.stage === 'object' && fc.schema.stage.length > 0 && typeof fc.schema.stage[0].page === 'object' && fc.schema.stage[0].page.length > 0) {
                    firstPageId = getFirstPage();
                    render(firstPageId);
                }
            }

            $(fc.jQueryContainer).trigger(fc.jsEvents.onConnectionMade);
        });
    };

    /**
     * Process the event queue
     */
    processEventQueue = function () {
        // If the event queue isn't running, default it to false
        if (fc.eventQueueRunning === undefined) {
            fc.eventQueueRunning = false;
        }

        // If already running, do nothing
        if (fc.eventQueueRunning) {
            console.log('[FC] The event queue is already running (slow server?)');
            return;
        }

        // If no events, do nothing
        if (fc.events.length === 0) {
            return;
        }

        // Mark the event queue as running, move events to the queue
        fc.eventQueueRunning = true;
        fc.queuedEvents = fc.events;
        fc.events = [];

        // Format the data to send with the request
        var data = {
            events: fc.queuedEvents
        };

        // Fire off the API call
        api('analytics/log', data, 'post', function (data) {
            // There was an error processing the update, move the queued events back in to the queue
            if (typeof data !== 'object' || typeof data.success !== 'boolean' || !data.success) {
                console.log('[FC] Error processing the analytics queue');
                var queue = fc.queuedEvents.concat(fc.events);
                fc.events = queue;
            }

            // Reset the queue
            fc.queuedEvents = [];
            fc.eventQueueRunning = false;
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
            this.events = [];
            this.saveQueueRunning = false;
            this.saveQueue = {};
            this.prevPages = {};
            this.lastActivity = (new Date()).getTime();
            this.expired = false;

            // Type of events
            this.eventTypes = {
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

            // JS events
            this.jsEvents = {
                onFormInit: 'OnFcInit',
                onFormExpired: 'onFormExpired',
                onValidationError: 'onValidationError',
                onFormComplete: 'onFormComplete',
                onNextPage: 'onNextPage',
                onPrevPage: 'onPrevPage',
                onConnectionMade: 'onFCConnectionMade'
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

                // Send events off to the server
                setInterval(function () {
                    if (fc.expired === true) {
                        return;
                    }
                    processEventQueue();
                }, fc.config.eventQueueInterval);

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
                cvvImage: null
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
                creditCardNumberIncorrectFormat: "The format of your credit card number is incorrect, please verify your details"
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
                value;

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
            }

            return false;
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