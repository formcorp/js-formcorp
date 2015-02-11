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
                        error = typeof validator.error === 'string' && validator.error.length > 0 ? validator.error : fc.config.defaultCustomValidationError;
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
                errors.push(fc.config.emptyFieldError);
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
            var dataGroup = $(fc.jQueryContainer).find('div[fc-data-group=' + dataId + ']'),
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
            $(fc.jQueryContainer).find('div[fc-data-group=' + dataId + ']').removeClass('fc-error');
        },

        /**
         * 'god' fields do not require a value (i.e. rich text area)
         * @type {string[]}
         */
        godFields = ["richTextArea"],

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

                var dataId = $(this).attr('fc-data-group'),
                    section = $(this).parent(),
                    field = fc.fieldSchema[dataId],
                    value = fc.fields[dataId] === undefined ? '' : fc.fields[dataId],
                    localErrors = [];

                // Check if the field requires a value
                if (typeof field.type === 'string' && godFields.indexOf(field.type) !== -1) {
                    return;
                }

                // If section is hidden, return
                if (section.hasClass('fc-hide')) {
                    return;
                }

                // If repeatable and required, check the amount of values
                if (field.config !== undefined && typeof field.config.repeatable === 'boolean' && field.config.repeatable) {
                    required = $(this).attr('data-required');
                    if (required === 'true' && (typeof value !== 'object' || value.length === 0)) {
                        localErrors.push(fc.config.emptyFieldError);
                    }
                } else {
                    localErrors = fieldErrors(dataId);
                }

                // If have errors, output
                if (localErrors.length > 0) {
                    console.log(field);
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
                console.log(errors);
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
                comparison;

            if (typeof obj.rules === 'object') {
                condition += '(';
                for (x = 0; x < obj.rules.length; x += 1) {
                    rule = obj.rules[x];

                    if (rule.condition !== undefined) {
                        rule.condition = rule.condition.toLowerCase() === 'and' ? ' && ' : ' || ';
                    } else {
                        rule.condition = "";
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
         * Render a text field.
         * @param field
         * @returns {string}
         */
        renderTextfield = function (field) {
            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                html = '<input class="fc-fieldinput" type="text" formcorp-data-id="' + field._id.$id + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '">';
            /*jslint nomen: false*/
            return html;
        },

        /**
         * Render a dropdown field.
         * @param field
         * @returns {string}
         */
        renderDropdown = function (field) {
            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                html = '<select class="fc-fieldinput" formcorp-data-id="' + field._id.$id + '" data-required="' + required + '">',
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
        renderTextarea = function (field) {
            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                html = '<textarea class="fc-fieldinput" formcorp-data-id="' + field._id.$id + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '" rows="' + getConfig(field, 'rows', 3) + '"></textarea>';
            /*jslint nomen: false*/

            return html;
        },

        /**
         * Render a radio list.
         * @param field
         * @returns {string}
         */
        renderRadioList = function (field) {
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                options = getConfig(field, 'options', ''),
                html = '',
                x,
                cssClass,
                option,
                id,
                checked;

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
                    /*jslint nomen: true*/
                    html += '<input class="fc-fieldinput" type="radio" id="' + id + '" formcorp-data-id="' + field._id.$id + '" name="' + field._id.$id + '" value="' + htmlEncode(option) + '" data-required="' + required + '"' + checked + '>';
                    /*jslint nomen: false*/
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
        renderCheckboxList = function (field) {
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
                options = getConfig(field, 'options', ''),
                html = '',
                cssClass,
                x,
                option,
                id;

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
                    html += '<input class="fc-fieldinput" type="checkbox" id="' + id + '" formcorp-data-id="' + field._id.$id + '" name="' + field._id.$id + '[]" value="' + htmlEncode(option) + '" data-required="' + required + '">';
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
        renderHiddenField = function (field) {
            /*jslint nomen: true*/
            var html = '<input class="fc-fieldinput" type="hidden" formcorp-data-id="' + field._id.$id + '" value="' + getConfig(field, 'value') + '">';
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
            $(fc.jQueryContainer + ' .render').html(fc.config.sessionExpiredHtml);
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
            console.log(timeSinceLastActivity);
        },

        renderGrouplet,
        renderFields,
        renderPageSections,
        generateRandomString,
        loadCssFiles,
        addModalWindow,
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
            html = renderFields(fields);
        }

        return html;
    };

    /**
     * Render a collection of fields.
     * @param fields
     * @returns {string}
     */
    renderFields = function (fields) {
        var html = '',
            y,
            field,
            required,
            fieldHtml,
            dataId;

        for (y = 0; y < fields.length; y += 1) {
            field = fields[y];
            required = getConfig(field, 'required', false);
            /*jslint nomen: true*/
            fieldHtml = '<div class="' + ((getConfig(field, 'repeatable', false) === true) ? 'fc-repeatable-container ' : '') + ' fc-field fc-field-' + field.type + '" fc-data-group="' + field._id.$id + '" data-required="' + required + '">';

            // Add to field class variable if doesnt exist
            dataId = field._id.$id;
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
            if (typeof field.config === 'object' && typeof field.config.label === 'string' && field.config.label.length > 0) {
                fieldHtml += '<label>' + field.config.label + '</label>';
            }

            // Output a repeatable field
            if (getConfig(field, 'repeatable', false) === true) {
                fieldHtml += '<div class="fc-repeatable">';
                fieldHtml += '<div class="fc-summary"></div>';
                fieldHtml += '<div class="fc-link"><a href="#" class="fc-click" data-id="' + dataId + '">' + fc.config.addFieldTextValue + '</a></div>';
            }

            fieldHtml += '<div class="fc-fieldgroup">';

            switch (field.type) {
            case 'text':
                fieldHtml += renderTextfield(field);
                break;
            case 'dropdown':
                fieldHtml += renderDropdown(field);
                break;
            case 'textarea':
                fieldHtml += renderTextarea(field);
                break;
            case 'radioList':
                fieldHtml += renderRadioList(field);
                break;
            case 'checkboxList':
                fieldHtml += renderCheckboxList(field);
                break;
            case 'hidden':
                fieldHtml += renderHiddenField(field);
                break;
            case 'richTextArea':
                fieldHtml += renderRichText(field);
                break;
            case 'grouplet':
                fieldHtml += renderGrouplet(field);
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
                sectionHtml += renderFields(section.field);
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
            submitText = fc.config.submitText,
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
                submitText = fc.config.submitFormText;
            }

            pageDiv += '<div class="fc-pagination">';

            // Show the prev stage button
            if (fc.config.showPrevPageButton === true) {
                if (typeof fc.prevPages[fc.pageId] === "object") {
                    pageDiv += '<div class="fc-prev-page">';
                    pageDiv += '<input type="submit" value="' + fc.config.prevButtonText + '" class="fc-btn">';
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
                        $('div[fc-data-group=' + dataId + ']').removeClass('fc-hide');
                    } else {
                        $('div[fc-data-group=' + dataId + ']').addClass('fc-hide');
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
        var fieldSchema = fc.fieldSchema[dataId],
            errors,
            params;

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
                page;

            // Build the form data array
            $('[formcorp-data-id]').each(function () {
                formData[$(this).attr('formcorp-data-id')] = getFieldValue($(this));
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
            api('page/submit', data, 'put', function (data) {
                if (typeof data.success === 'boolean' && data.success) {
                    // Update activity (server last active timestamp updated)
                    fc.lastActivity = (new Date()).getTime();

                    logEvent(fc.eventTypes.onNextPageSuccess);

                    // Render the next page if available
                    if (hasNextPage()) {
                        nextPage();

                        // If the application is complete, raise completion event
                        if (typeof page.page === "object" && isSubmitPage(page.page)) {
                            logEvent(fc.eventTypes.onFormComplete);
                        }
                        return;
                    }

                    // Form is deemed complete, output default completion message
                    $(fc.jQueryContainer + ' .render').html(fc.config.formCompleteHtml);
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

            console.log('have to go to the previous page');
            if (typeof fc.prevPages[fc.pageId] === "object") {
                console.log(fc.prevPages[fc.pageId]);
                /*jslint nomen: true*/
                render(fc.prevPages[fc.pageId].page._id.$id);
                /*jslint nomen: false*/
            }
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
            '<h2>' + fc.config.addModalHeader + '</h2>' +
            '</div>' +
            '<div class="modal-body">' +
            '<p>One modal example here! :D</p>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<a href="#" class="btn btn-danger fc-btn-close">' + fc.config.closeModalText + '</a> ' +
            '<a href="#" class="btn btn-success fc-btn-add">' + fc.config.addModalText + '</a> ' +
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
                    if (typeof schema[key] === 'object' && schema[key][0] !== undefined && schema[key][0].order !== undefined) {
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
                    /*jslint nomen: true*/
                    firstPageId = fc.schema.stage[0].page[0]._id.$id;
                    /*jslint nomen: false*/
                    render(firstPageId);
                    console.log(fc.schema);
                }
            }
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

            // Set config if not already done so
            if (fc.config === undefined) {
                this.setConfig();
            }

            // Set the session id
            this.initSession();

            // Check to make sure container exists
            $(document).ready(function () {
                if ($(fc.jQueryContainer).length === 0) {
                    console.log('FC Error: Container not found.');
                    return false;
                }

                // Fetch the form id
                if ($(fc.jQueryContainer).attr('data-id') === '') {
                    console.log('FC Error: Form id not found.');
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
                emptyFieldError: 'This field cannot be empty',
                defaultCustomValidationError: 'This field failed custom validation',
                addFieldTextValue: 'Add value',
                closeModalText: 'Close',
                addModalText: 'Add',
                addModalHeader: 'Add value',
                sessionKeyLength: 40,
                sessionIdName: 'fcSessionId',
                eventQueueInterval: eventQueueDefault,
                submitText: "Next",
                submitFormText: "Submit application",
                formCompleteHtml: '<h2 class="fc-header">Your application is complete</h2><p>Congratulations, your application has successfully been completed. Please expect a response shortly.</p>',
                saveInRealTime: true,
                saveInRealTimeInterval: realTimeSaveDefault,
                showPrevPageButton: true,
                prevButtonText: 'Previous',
                timeUserOut: false,
                timeOutWarning: 870, // 14 minutes 30 seconds
                timeOutAfter: 900, // 15 minutes
                sessionExpiredHtml: '<h2 class="fc-header">Your session has expired</h2><p>Unfortunately, due to a period of extended inactivity, your session has expired. To fill out a new form submission, please refresh your page.</p>'
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