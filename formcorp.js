/**
 * FormCorp JS SDK
 * @author Alex Berriman <alexb@fishvision.com>
 * @website http://www.formcorp.com.au/
 *
 * Ability to embed a JS client side form on to an external webpage.
 */

/**
 * Set up
 */
(function (factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        factory(require('jquery'));
    } else {
        factory(jQuery);
    }
}(function ($) {
    var pluses = /\+/g;

    /**
     * Encode a string
     * @param s
     * @returns {*}
     */
    function encode(s) {
        return config.raw ? s : encodeURIComponent(s);
    }

    /**
     * Decode a string
     * @param s
     * @returns {*}
     */
    function decode(s) {
        return config.raw ? s : decodeURIComponent(s);
    }

    /**
     * Properly encode a cookie value
     * @param value
     * @returns {*}
     */
    function stringifyCookieValue(value) {
        return encode(config.json ? JSON.stringify(value) : String(value));
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
        } catch (e) {
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
    var config = $.cookie = function (key, value, options) {
        // Write
        if (arguments.length > 1 && !$.isFunction(value)) {
            options = $.extend({}, config.defaults, options);

            if (typeof options.expires === 'number') {
                var days = options.expires, t = options.expires = new Date();
                t.setTime(+t + days * 864e+5);
            }

            return (document.cookie = [
                encode(key), '=', stringifyCookieValue(value),
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path ? '; path=' + options.path : '',
                options.domain ? '; domain=' + options.domain : '',
                options.secure ? '; secure' : ''
            ].join(''));
        }

        // Read
        var result = key ? undefined : {};
        var cookies = document.cookie ? document.cookie.split('; ') : [];

        for (var i = 0, l = cookies.length; i < l; i++) {
            var parts = cookies[i].split('=');
            var name = decode(parts.shift());
            var cookie = parts.join('=');

            if (key && key === name) {
                // If second argument (value) is a function it's a converter...
                result = read(cookie, value);
                break;
            }

            // Prevent storing a cookie that we couldn't decode.
            if (!key && (cookie = read(cookie)) !== undefined) {
                result[name] = cookie;
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
var fc = new function ($) {
    var apiUrl = '//192.168.247.129:9001/',
        cdnUrl = '//192.168.247.129:9004/';

    /**
     * Send off an API call.
     * @param uri
     * @param data
     * @param type
     * @param callback
     */
    var api = function (uri, data, type, callback) {
        if (type === undefined || typeof(type) != 'string' || ['GET', 'POST', 'PUT'].indexOf(type.toUpperCase()) == -1) {
            type = 'GET';
        }
        type = type.toUpperCase();

        if (typeof(data) === undefined) {
            data = {};
        }

        data.sessionId = fc.sessionId;

        $.ajax({
            type: type,
            url: apiUrl + uri,
            data: data,
            beforeSend: function (request) {
                request.setRequestHeader('Authorization', 'Bearer ' + fc.publicKey);
            },
            success: function (data) {
                if (typeof(data) == 'string') {
                    data = JSON.parse(data);
                }
                callback(data);
            },
            error: function (data) {
                callback(data);
            }
        });
    }

    /**
     * Initialise the formcorp object.
     * @param publicKey
     * @param container
     */
    this.init = function (publicKey, container) {
        this.publicKey = publicKey;
        this.container = container;
        this.jQueryContainer = '#' + container;

        // Temporary placeholders for objects to be populated
        this.fields = {};
        this.fieldSchema = {};
        this.sections = {};
        this.pages = {};
        this.events = [];

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
            onNextPageError: 'onNextPageError'
        }

        // Set config if not already done so
        if (typeof(fc.config) == 'undefined') {
            this.setConfig();
        }

        // Set the session id
        this.initSession();

        // Check to make sure container exists
        $(document).ready(function () {
            if ($(fc.jQueryContainer).length == 0) {
                console.log('FC Error: Container not found.');
                return false;
            }

            // Fetch the form id
            if ($(fc.jQueryContainer).attr('data-id') == '') {
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
        });
    }

    /**
     * Set the form branch to use.
     * @param branch
     */
    this.setBranch = function (branch) {
        this.branch = branch;
    }

    /**
     * Set class config values.
     * @param data
     */
    this.setConfig = function (data) {
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
            sessionIdName: 'fcSessionId'
        };

        // Update with client options
        if (typeof(data) == 'object' && Object.keys(data).length > 0) {
            for (var key in data) {
                fc.config[key] = data[key];
            }
        }
    }

    /**
     * Initialise the existing session, or instantiate a new one.
     */
    this.initSession = function () {
        // Initialise a new session
        if (typeof(this.sessionId) == 'undefined' && typeof($.cookie(this.config.sessionIdName)) == 'undefined') {
            this.sessionId = generateRandomString(this.config.sessionKeyLength);
            $.cookie(this.config.sessionIdName, this.sessionId);
        } else {
            this.sessionId = $.cookie(this.config.sessionIdName);
        }
    }

    /**
     * Generates a random string of length $length
     *
     * @param length
     * @returns {string}
     */
    var generateRandomString = function (length) {
        var str = '',
            chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        for (var x = 0; x < length; x++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return str;
    }

    /**
     * Register the formcorp css files
     */
    var loadCssFiles = function () {
        var cssId = 'formcorp-css',
            cssUri = 'formcorp.css';

        if ($('#' + cssId).length == 0) {
            var head = document.getElementsByTagName('head')[0];
            var link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.href = cdnUrl + cssUri;
            link.media = 'all';
            head.appendChild(link);
        }

        $(fc.jQueryContainer).addClass('fc-container');
        addModalWindow();
    }

    /**
     * Add a modal window to the page
     */
    var addModalWindow = function () {

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
    }

    /**
     * Load the form schema/definition
     */
    var loadSchema = function () {
        var data = {
            form_id: fc.formId
        };

        // Set the branch to use if defined
        if (typeof(fc.branch) == 'string') {
            data.branch = fc.branch;
        }

        // Send off the API call
        api('form/schema', data, 'post', function (data) {
            if (typeof(data.error) == 'boolean' && data.error) {
                console.log('FC Error: ' + data.message);
                return;
            }

            // If data returned by the API server, set locally
            if (typeof(data.data) == 'object' && Object.keys(data.data).length > 0) {
                for (var key in data.data) {
                    fc.fields[key] = data.data[key];
                }
            }

            // Render the opening page for the form
            if (typeof(data.stage) != 'undefined') {
                fc.schema = orderSchema(data);
                if (typeof(fc.schema.stage) == 'object' && fc.schema.stage.length > 0 && typeof(fc.schema.stage[0].page) == 'object' && fc.schema.stage[0].page.length > 0) {
                    console.log(fc.schema);
                    var firstPageId = fc.schema.stage[0].page[0]._id.$id;
                    render(firstPageId);
                }
            }
        });
    }

    /**
     * Order schema numerically by data columns.
     * @param schema
     * @param orderColumn
     * @returns {*}
     */
    var orderSchema = function (schema, orderColumn) {
        if (typeof(orderColumn) == 'undefined') {
            orderColumn = 'order';
        }

        if (typeof(schema) == 'object') {
            // Recursively order children
            for (var key in schema) {
                // Chilcren have order, try to order the object
                if (typeof(schema[key]) == 'object' && typeof(schema[key][0]) != 'undefined' && typeof(schema[key][0]['order']) != 'undefined') {
                    schema[key] = orderObject(schema[key], orderColumn);
                } else {
                    schema[key] = orderSchema(schema[key], orderColumn);
                }
            }
        }

        return schema;
    }

    /**
     * Orders an object numerically in ascending order by a given data column.
     * @param object
     * @param orderColumn
     * @returns {Array}
     */
    var orderObject = function (object, orderColumn) {
        // Construct a 2-dimensional array (so pages with same order don't override each other)
        var orderedObject = [];
        for (var key in object) {
            var order = typeof(object[key]['order']) != 'undefined' ? object[key]['order'] : 0;
            if (typeof(orderedObject[order]) == 'undefined') {
                orderedObject[order] = [];
                orderedObject[order].push(object[key]);
            }
        }

        // Flatten the two-dimensional array in to a single array
        var objects = [];
        for (var key in orderedObject) {
            for (var x = 0; x < orderedObject[key].length; x++) {
                objects.push(orderedObject[key][x]);
            }
        }

        return objects;
    }

    /**
     * Register event listeners.
     */
    var registerEventListeners = function () {
        // Submit a form page
        $(fc.jQueryContainer).on('click', 'div.fc-submit input[type=submit]', function () {
            logEvent(fc.eventTypes.onNextPageClick);

            if (!validForm()) {
                logEvent(fc.eventTypes.onNextPageError);
                console.log('FC Error: Form is not valid');
                return false;
            }

            // Build the data array
            data = {};
            $('[formcorp-data-id]').each(function () {
                data[$(this).attr('formcorp-data-id')] = getFieldValue($(this));
            });

            // Submit the form fields
            api('page/submit', {
                form_id: fc.formId,
                page_id: fc.pageId,
                form_values: data
            }, 'put', function (data) {
                if (typeof(data.success) == 'boolean' && data.success) {
                    logEvent(fc.eventTypes.onNextPageSuccess);
                    nextPage();
                } else {
                    logEvent(fc.eventTypes.onNextPageError);
                }
            });

            return false;
        });

        registerValueChangedListeners();

        // When the hash changes - navigate forward/backwards
        $(window).on('hashchange', function () {
            var pageId = window.location.hash.substr(1);
            if (fc.ignoreHashChangeEvent === false && fc.oldHash != pageId && typeof(fc.pages[pageId]) == 'object') {
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
            var validModal = validateModal();
            if (!validModal) {
                $('.fc-modal .modal-body > div').addClass('fc-error');
                return false;
            }

            $('.fc-modal .modal-body > div').removeClass('fc-error');

            // Build array of values
            var values = {};
            $(fc.jQueryContainer).find('.fc-modal [formcorp-data-id]').each(function () {
                var dataId = $(this).attr('formcorp-data-id');
                values[dataId] = getFieldValue($(this));
            });

            // Add the values to the array
            if (typeof(fc.fields[fc.activeModalField]) != 'object') {
                fc.fields[fc.activeModalField] = [];
            }
            fc.fields[fc.activeModalField].push(values);

            // Build a list to output
            var list = $('<ul></ul>');
            for (key in values) {
                var li = $('<li></li>');
                li.html(values[key]);
                list.append(li);
            }
            $('[fc-data-group="' + fc.activeModalField + '"] .fc-summary').append(list);

            // Hide the modal
            $('.fc-modal.fc-show').removeClass('fc-show');
            return false;
        });

        registerAnalyticsEventListeners();
    }

    /**
     * Register event listeners that fire when a form input field's value changes
     */
    var registerValueChangedListeners = function () {
        // Input types text changed
        $(fc.jQueryContainer).on('change', 'input[type=text].fc-fieldinput, input[type=radio].fc-fieldinput', function () {
            valueChanged($(this).attr('formcorp-data-id'), $(this).val());
        });

        // Dropdown box change
        $(fc.jQueryContainer).on('change', 'select.fc-fieldinput', function () {
            valueChanged($(this).attr('formcorp-data-id'), $(this).find('option:selected').val());
        });
    }

    /**
     * Function that is fired when a data value changes.
     * @param dataId
     * @param value
     */
    var valueChanged = function (dataId, value) {
        var fieldSchema = fc.fieldSchema[dataId];

        // Don't perform operations on repeatable fields
        if (typeof(fieldSchema.config.repeatable) !== 'boolean' || !fieldSchema.config.repeatable) {
            var oldValue = typeof(fc.fields[dataId]) != 'undefined' ? fc.fields[dataId] : "";
            fc.fields[dataId] = value;

            // Flush the field visibility options
            flushVisibility();

            // Check real time validation
            if (fc.config.realTimeValidation === true) {
                var errors = fieldErrors(dataId);
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

            // Register the value changed event
            var params = {
                fieldId: dataId,
                oldValue: oldValue,
                newValue: value
            };
            logEvent(fc.eventTypes.onValueChange, params);
        }
    }

    /**
     * Flushes the visibility of various components throughout the form.
     */
    var flushVisibility = function () {
        flushSectionVisibility();
        flushFieldVisibility();
    }

    /**
     * Flushes the field visibility options. Should be triggered when the page is first rendered, and when a value
     * changes. A change in value represents a change in form state. When the form's state changes, the visibility of
     * certain fields may need to be altered.
     */
    var flushFieldVisibility = function () {
        $(fc.jQueryContainer).find('.fc-fieldinput').each(function () {
            var dataId = $(this).attr('formcorp-data-id');
            if (typeof(dataId) != 'string' || dataId.length == 0 || typeof(fc.fieldSchema[dataId]) != 'object') {
                return;
            }

            // If field has a visibility configurative set, act on it
            var field = fc.fieldSchema[dataId];
            if (typeof(field.config.visibility) == 'string' && field.config.visibility.length > 0) {
                var visible = eval(field.config.visibility);
                if (typeof(visible) == 'boolean') {
                    if (visible) {
                        $('div[fc-data-group=' + dataId + ']').removeClass('fc-hide');
                    } else {
                        $('div[fc-data-group=' + dataId + ']').addClass('fc-hide');
                    }
                }
            }
        });
    }

    /**
     * Flushses the visibility component of each section when the form state changes.
     */
    var flushSectionVisibility = function () {
        $(fc.jQueryContainer).find('.fc-section').each(function () {
            var dataId = $(this).attr('formcorp-data-id');
            if (typeof(dataId) != 'string' || dataId.length == 0 || typeof(fc.sections[dataId]) != 'object') {
                return;
            }

            var section = fc.sections[dataId];
            if (typeof(section.visibility) == 'string' && section.visibility.length > 0) {
                var visible = eval(section.visibility);
                if (visible) {
                    $('div.fc-section[formcorp-data-id=' + dataId + ']').removeClass('fc-hide');
                } else {
                    $('div.fc-section[formcorp-data-id=' + dataId + ']').addClass('fc-hide');
                }
            }
        });
    }

    /**
     * Check the validity of the entire form.
     * @returns {boolean}
     */
    var validForm = function () {
        var errors = {};

        // Test if required fields have a value
        $('.fc-field[fc-data-group]').each(function () {
            // If the field is hidden, not required to validate
            if ($(this).hasClass('fc-hide')) {
                return;
            }

            var dataId = $(this).attr('fc-data-group'),
                section = $(this).parent(),
                field = fc.fieldSchema[dataId],
                value = typeof(fc.fields[dataId]) == 'undefined' ? '' : fc.fields[dataId],
                localErrors = [];

            // If section is hidden, return
            if (section.hasClass('fc-hide')) {
                return;
            }

            // If repeatable and required, check the amount of values
            if (typeof(field.config.repeatable) == 'boolean' && field.config.repeatable) {
                var required = $(this).attr('data-required');
                if (required == 'true' && (typeof(value) != 'object' || value.length == 0)) {
                    localErrors.push(fc.config.emptyFieldError);
                }
            } else {
                localErrors = fieldErrors(dataId);
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
            console.log(errors);
            return false;
        }
        return true;
    }

    /**
     * Show the errors on the DOM for a given field.
     * @param dataId
     * @param errors
     */
    var showFieldError = function (dataId, errors) {
        var dataGroup = $(fc.jQueryContainer).find('div[fc-data-group=' + dataId + ']');
        dataGroup.addClass('fc-error');

        // If inline validation enabled, output error message(s)
        if (fc.config.inlineValidation === true) {
            var msg = '';
            for (var x = 0; x < errors.length; x++) {
                msg += errors[x] + '<br>';
            }
            dataGroup.find('.fc-error-text').html(msg);
        }
    }

    /**
     * Remove the error on the DOM for a given field.
     * @param dataId
     */
    var removeFieldError = function (dataId) {
        $(fc.jQueryContainer).find('div[fc-data-group=' + dataId + ']').removeClass('fc-error');
    }

    /**
     * Returns a list of errors on a particular field.
     * @param id
     * @returns {Array}
     */
    var fieldErrors = function (id) {
        var fieldSelector = $('.fc-field[fc-data-group="' + id + '"]');
        if (fieldSelector.length = 0) {
            return [];
        }

        // If the field is hidden, not required to validate
        if (fieldSelector.hasClass('fc-hide')) {
            return [];
        }

        var dataId = id,
            section = fieldSelector.parent(),
            field = fc.fieldSchema[dataId],
            value = typeof(fc.fields[dataId]) == 'undefined' ? '' : fc.fields[dataId],
            errors = [];

        // If section is hidden, return
        if (section.hasClass('fc-hide')) {
            return [];
        }

        // Test required data
        var dataField = $('[fc-data-group="' + id + '"] [data-required="true"]');
        if (fieldIsEmpty(dataField)) {
            errors.push(fc.config.emptyFieldError);
            return errors;
        }

        // Custom validators
        var customErrors = getCustomErrors(field, value);
        errors = errors.concat(customErrors);

        return errors;
    }

    /**
     * Retrieve custom error validations from field.
     * @param field
     * @param value
     * @returns {Array}
     */
    var getCustomErrors = function (field, value) {
        var errors = [];

        if (typeof(field.config.validators) == 'object' && field.config.validators.length > 0) {
            for (var x = 0; x < field.config.validators.length; x++) {
                var validator = field.config.validators[x],
                    type = fc.toCamelCase(validator.type),
                    callbackFunction = 'fc.validator' + type.substring(0, 1).toUpperCase() + type.substr(1);

                // Convert string to function call
                var callback = window;
                var callbackSplit = callbackFunction.split('.');
                for (i = 0; i < callbackSplit.length; i++) {
                    callback = callback[callbackSplit[i]];
                }

                // Call the callback function
                if (!callback(validator.params, value)) {
                    var error = typeof(validator.error) == 'string' && validator.error.length > 0 ? validator.error : fc.config.defaultCustomValidationError;
                    errors.push(error);
                }
            }
        }

        return errors;
    }

    /**
     * Register the listeners to handle analytic events
     */
    var registerAnalyticsEventListeners = function () {
        // Text value focused
        $(fc.jQueryContainer).on('focus', '.fc-fieldinput', function () {
            var dataId = $(this).attr('formcorp-data-id');
            var params = {
                dataId: dataId,
                value: getFieldValue($(this))
            };
            logEvent(fc.eventTypes.onFocus, params)
        });

        // Text value focused
        $(fc.jQueryContainer).on('blur', '.fc-fieldinput', function () {
            var dataId = $(this).attr('formcorp-data-id');
            var params = {
                dataId: dataId,
                value: getFieldValue($(this))
            };
            logEvent(fc.eventTypes.onBlur, params)
        });

        // Mouse down event
        $(fc.jQueryContainer).on('mousedown', function (e) {
            var x = parseInt(e.pageX - fc.formPosition.left),
                y = parseInt(e.pageY - fc.formPosition.top);

            logEvent(fc.eventTypes.onMouseDown, {
                x: x,
                y: y
            });
        });
    }

    /**
     * Store an event locally to be logged
     * @param event
     * @param params
     */
    var logEvent = function (event, params) {
        if (typeof(event) == 'undefined') {
            return;
        }

        // Default params
        if (typeof(params) == 'undefined') {
            params = {};
        }

        var event = {
            'event': event,
            'params': params,
            'time': (new Date()).getTime()
        };

        fc.events.push(event);
    }

    /**
     * Return the value of a field element.
     * @param field
     * @returns {*}
     */
    var getFieldValue = function (field) {
        if (field.is('input') || field.is('textarea')) {
            if (field.attr('type') == 'radio') {
                // Radio lists
                if ($('input[name=' + $(field).attr('name') + ']:checked').length > 0) {
                    return $('input[name=' + $(field).attr('name') + ']:checked').val();
                }
                return '';
            } else if (field.attr('type') == 'checkbox') {
                // Checkbox lists
                var selector = $('input[formcorp-data-id=' + $(field).attr('formcorp-data-id') + ']:checked');
                if (selector.length === 0) {
                    return '';
                }
                var values = [];
                selector.each(function () {
                    values.push($(this).val());
                });
                return JSON.stringify(values);
            } else {
                return field.val();
            }
        } else if (field.is('select')) {
            return $(field).find('option:selected').text();
        }

        return '';
    }

    /**
     * Returns true if a field is empty, false if not.
     * @param field
     * @returns {boolean}
     */
    var fieldIsEmpty = function (field) {
        var value = getFieldValue(field);
        return !value || value.length === 0;
    }

    /**
     * Return a value from the field's configuration options.
     * @param field
     * @param key
     * @param defaultVal
     * @returns {*}
     */
    var getConfig = function (field, key, defaultVal) {
        if (defaultVal === undefined) {
            defaultVal = '';
        }

        if (typeof(field.config) == 'object' && typeof(field.config[key]) !== 'undefined') {
            return field.config[key];
        }

        return defaultVal;
    }

    /**
     * Render a form stage.
     * @param pageId
     */
    var render = function (pageId) {
        fc.currentPage = pageId;

        var page = getPageById(pageId);
        if (typeof(page) == 'undefined') {
            console.log('FC Error: Page not found');
        }

        if (typeof(page.stage) != 'object') {
            return;
        }

        // Store field schema locally
        updateFieldSchema(page.stage);

        // @todo: page selection based on criteria
        var html = '<h1>' + page.stage.label + '</h1>';
        html += renderPage(page.page);

        $(fc.jQueryContainer + ' .render').html(html);

        // Set values from data array
        setFieldValues();

        // Flush the field/section visibility
        flushVisibility();

        // Update the hash, and ignore the hash change event
        fc.ignoreHashChangeEvent = true;
        window.location.hash = pageId;
    }

    /**
     * Finds and returns a page by its id.
     * @param pageId
     * @returns {*}
     */
    var getPageById = function (pageId) {
        if (typeof(fc.pages[pageId]) == 'object') {
            return fc.pages[pageId];
        }

        for (var x = 0; x < fc.schema.stage.length; x++) {
            var stage = fc.schema.stage[x];
            if (typeof(stage.page) == 'object' && stage.page.length > 0) {
                for (var y = 0; y < stage.page.length; y++) {
                    var page = stage.page[y];
                    if (typeof(fc.pages[page._id.$id]) == 'undefined') {
                        fc.pages[page._id.$id] = {
                            stage: stage,
                            page: page
                        };
                    }
                }
            }
        }

        return getPageById(pageId);
    }

    /**
     * Set values on DOM from fields in JS
     */
    var setFieldValues = function () {
        $('div[fc-data-group]').each(function () {
            var fieldId = $(this).attr('fc-data-group');
            if (typeof(fc.fields[fieldId]) != 'undefined') {
                var fieldGroup = $(this).find('.fc-fieldgroup'),
                    value = fc.fields[fieldId],
                    schema = fc.fieldSchema[fieldId];

                if (typeof(schema.config.repeatable) == 'boolean' && schema.config.repeatable) {
                    // Restore a repeatable value
                    if (typeof(value) == 'object') {
                        // Build a list to output
                        for (var x = 0; x < value.length; x++) {
                            var obj = value[x];

                            var list = $('<ul></ul>');
                            for (var key in obj) {
                                var li = $('<li></li>');
                                li.html(obj[key]);
                                list.append(li);
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
    }

    /**
     * Update field schema (object stores the configuration of each field for easy access)
     * @param stage
     */
    var updateFieldSchema = function (stage) {
        var jsonDecode = ['visibility', 'validators'];
        var toBoolean = ['visibility'];

        if (typeof(stage.page) != 'undefined') {
            // Iterate through each page
            for (var x = 0; x < stage.page.length; x++) {
                var page = stage.page[x];
                if (typeof(page.section) == 'undefined') {
                    continue;
                }

                // Convert page to conditions to JS boolean logic
                if (typeof(page.toCondition) == 'object' && Object.keys(page.toCondition).length > 0) {
                    for (var key in page.toCondition) {
                        try {
                            page.toCondition[key] = toBooleanLogic($.parseJSON(page.toCondition[key]));
                        } catch (error) {
                        }
                    }
                }

                // Iterate through each section
                for (var y = 0; y < page.section.length; y++) {
                    var section = page.section[y];
                    if (typeof(section.field) == 'undefined' || section.field.length == 0) {
                        continue;
                    }

                    // Are any object keys required to be decoded to a json object?
                    for (var a = 0; a < jsonDecode.length; a++) {
                        if (typeof(section[jsonDecode[a]]) == 'string') {
                            try {
                                section[jsonDecode[a]] = $.parseJSON(section[jsonDecode[a]]);
                            } catch (error) {
                            }
                        }
                    }

                    // Are any object keys required to be converted to boolean logic?
                    for (var a = 0; a < toBoolean.length; a++) {
                        if (typeof(section[toBoolean[a]]) == 'object') {
                            section[toBoolean[a]] = toBooleanLogic(section[toBoolean[a]]);
                        }
                    }

                    // Append to object sections dictionary
                    if (typeof(fc.sections[section._id.$id]) == 'undefined') {
                        fc.sections[section._id.$id] = section;
                    }

                    // Iterate through each field
                    for (var z = 0; z < section.field.length; z++) {
                        var field = section.field[z],
                            id = field._id.$id;

                        // Add t field schema if doesn't already exist
                        if (typeof(fc.fieldSchema[id]) == 'undefined') {
                            // Decode configuration strings to json objects as required
                            for (var a = 0; a < jsonDecode.length; a++) {
                                if (typeof(field.config[jsonDecode[a]]) != 'undefined' && field.config[jsonDecode[a]].length > 0) {
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
    }

    /**
     * Converts an object to a literal boolean object string.
     * @param obj
     * @returns {*}
     */
    var toBooleanLogic = function (obj) {
        var condition = '';
        if (typeof(obj.rules) == 'object') {
            condition += '(';
            for (var x = 0; x < obj.rules.length; x++) {
                var rule = obj.rules[x];

                if (typeof(rule.condition) != 'undefined') {
                    rule.condition = rule.condition.toLowerCase() == 'and' ? ' && ' : ' || ';
                } else {
                    rule.condition = "";
                }

                // Optimise the AND/OR clause
                if (rule.condition.length == 0) {
                    // Default to AND condition
                    rule.condition = ' && ';
                }
                if (x == 0) {
                    rule.condition = '';
                }

                // If have a comparison, add it to our condition string
                if (typeof(rule.field) == 'string' && typeof(rule.value) != 'undefined') {
                    // Comparison function to call
                    var comparison = 'fc.comparison';
                    if (typeof(rule.operator) == 'string' && rule.operator.length > 0) {
                        comparison += rule.operator.charAt(0).toUpperCase() + rule.operator.slice(1);
                    }

                    // If object, cast to JSON string
                    if (typeof(rule.value) == 'object') {
                        rule.value = JSON.stringify(rule.value);
                    } else if (typeof(rule.value) == 'string') {
                        rule.value = '"' + rule.value + '"';
                    }

                    condition += rule.condition + comparison + '(fc.fields["' + rule.field + '"], ' + rule.value + ')';
                }

                // If have nested rules, call recursively
                if (typeof(rule.rules) == 'object' && rule.rules.length > 0) {
                    condition += rule.condition + toBooleanLogic(rule);
                }
            }
            condition += ')';
        }

        return condition;
    }

    /**
     * Render a page.
     * @param page
     * @returns {string}
     */
    var renderPage = function (page) {
        // Page details
        var pageDiv = '<div class="fc-page"><form class="fc-form">';
        fc.pageId = page._id.$id;
        if (typeof(page.label) == 'string' && page.label.length > 0) {
            pageDiv += '<h2>' + page.label + '</h2>';
        }
        if (typeof(page.description) == 'string' && page.description.length > 0) {
            pageDiv += '<h3>' + page.description + '</h3>';
        }

        // Render page sections
        if (page.section.length > 0) {
            pageDiv += renderPageSections(page.section);
        }

        // Submit button
        if (hasNextPage()) {
            pageDiv += '<div class="fc-submit">';
            pageDiv += '<input type="submit" value="Submit" class="fc-btn">';
            pageDiv += '</div>';
        }

        // Close page div
        pageDiv += '</form></div>';

        return pageDiv;
    }

    /**
     * Render page sections.
     * @param sections
     * @returns {string}
     */
    var renderPageSections = function (sections) {
        var html = '';

        for (var x = 0; x < sections.length; x++) {
            var section = sections[x],
                sectionHtml = '<div class="fc-section" formcorp-data-id="' + section._id.$id + '">';

            if (typeof(section.label) == 'string' && section.label.length > 0) {
                sectionHtml += '<h4>' + section.label + '</h4>';
            }

            if (typeof(section.description) == 'string' && section.description.length > 0) {
                sectionHtml += '<p>' + section.description + '</p>';
            }

            // Render the fields
            if (typeof(section.field) != 'undefined' && section.field.length > 0) {
                sectionHtml += renderFields(section.field);
            }

            sectionHtml += '</div>';
            html += sectionHtml;
        }

        return html;
    }

    /**
     * Render a collection of fields.
     * @param fields
     * @returns {string}
     */
    var renderFields = function (fields) {
        var html = '';
        for (var y = 0; y < fields.length; y++) {
            var field = fields[y],
                required = getConfig(field, 'required', false),
                fieldHtml = '<div class="' + ((getConfig(field, 'repeatable', false) === true) ? 'fc-repeatable-container ' : '') + ' fc-field fc-field-' + field.type + '" fc-data-group="' + field._id.$id + '" data-required="' + required + '">';

            // Add to field class variable if doesnt exist
            var dataId = field._id.$id;
            if (typeof(fc.fieldSchema[dataId]) == 'undefined') {
                fc.fieldSchema[dataId] = field;
            }

            // Description text
            if (getConfig(field, 'description').replace(/(<([^>]+)>)/ig, "").length > 0) {
                fieldHtml += '<div class="fc-desc">' + getConfig(field, 'description') + '</div>';
            }

            fieldHtml += '<div class="fc-fieldcontainer">';

            // Field label
            if (typeof(field.config) == 'object' && typeof(field.config.label) == 'string' && field.config.label.length > 0) {
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
    }

    /**
     * Render the next page
     * @param render
     */
    var nextPage = function (shouldRender) {
        if (typeof(shouldRender) != 'boolean') {
            shouldRender = true;
        }

        var currentPage = getPageById(fc.currentPage);
        if (typeof(currentPage.page) != 'object') {
            return;
        }

        // If have custom rules determining the page to navigate to, attempt to process them
        if (typeof(currentPage.page.toCondition) == 'object' && Object.keys(currentPage.page.toCondition).length > 0) {
            for (var id in currentPage.page.toCondition) {
                var condition = currentPage.page.toCondition[id];
                if (eval(condition)) {
                    if (shouldRender) {
                        render(id);
                    }
                    return true;
                }
            }
        }

        // Render the next page by default (first page in next stage)
        var foundStage = false;
        for (var x = 0; x < fc.schema.stage.length; x++) {
            var stage = fc.schema.stage[x];

            // If the stage that is to be rendered has been found, do so
            if (foundStage && typeof(stage.page) == 'object' && stage.page.length > 0) {
                if (shouldRender) {
                    render(stage.page[0]._id.$id);
                }
                return true;
            }

            // If the current iterative stage is the stage of the currently rendered page, mark the next stage to be renderewd
            if (stage._id.$id == currentPage.stage._id.$id) {
                foundStage = true;
            }
        }

        return false;
    }

    /**
     * Attempts to validate the modal used for adding multi-value attributes.
     * @returns {boolean}
     */
    var validateModal = function () {
        var valid = true;

        $('.fc-modal [formcorp-data-id]').each(function () {
            // If field is not required, no need to run any validations on it
            console.log($(this).attr('data-required'));
            if ($(this).attr('data-required') !== 'true') {
                return;
            }

            // If empty and required, return false
            if (fieldIsEmpty($(this))) {
                valid = false;
                return;
            }

            var fieldId = $(this).attr('formcorp-data-id'),
                value = getFieldValue($(this)),
                field = fc.fieldSchema[fieldId];

            // If custom errors exist, return false
            var customErrors = getCustomErrors(field, value);
            if (customErrors.length > 0) {
                valid = false;
                return;
            }
        });

        return valid;
    }

    /**
     * Returns true when a next stage exists.
     * @returns {boolean}
     */
    var hasNextPage = function () {
        return nextPage(false);
    }

    /**
     * Render a text field.
     * @param field
     * @returns {string}
     */
    var renderTextfield = function (field) {
        var required = typeof(field.config.required) == 'boolean' ? field.config.required : false,
            html = '<input class="fc-fieldinput" type="text" formcorp-data-id="' + field._id.$id + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '">';
        return html;
    }

    /**
     * Render a dropdown field.
     * @param field
     * @returns {string}
     */
    var renderDropdown = function (field) {
        var required = typeof(field.config.required) == 'boolean' ? field.config.required : false,
            html = '<select class="fc-fieldinput" formcorp-data-id="' + field._id.$id + '" data-required="' + required + '">',
            options = getConfig(field, 'options', '');

        if (getConfig(field, 'placeholder', '').length > 0) {
            html += '<option value="" disabled selected>' + htmlEncode(getConfig(field, 'placeholder')) + '</option>';
        }

        if (options.length > 0) {
            options = options.split("\n");
            var optGroupOpen = false;
            for (var x = 0; x < options.length; x++) {
                var option = options[x];
                option = option.replace(/(\r\n|\n|\r)/gm, "");
                if (option.match(/^\[\[(.*?)\]\]$/g)) {
                    // Opt group tag
                    if (optGroupOpen) {
                        html += "</optgroup>";
                    }
                    var label = option.substring(2, option.length - 2);
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
    }

    /**
     * Render a text area field.
     * @param field
     * @returns {string}
     */
    var renderTextarea = function (field) {
        var required = typeof(field.config.required) == 'boolean' ? field.config.required : false,
            html = '<textarea class="fc-fieldinput" formcorp-data-id="' + field._id.$id + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '" rows="' + getConfig(field, 'rows', 3) + '"></textarea>';
        return html;
    }

    /**
     * Render a radio list.
     * @param field
     * @returns {string}
     */
    var renderRadioList = function (field) {
        var required = typeof(field.config.required) == 'boolean' ? field.config.required : false,
            options = getConfig(field, 'options', ''),
            html = '';

        if (options.length > 0) {
            options = options.split("\n");
            var cssClass = getConfig(field, 'inline', false) === true ? 'fc-inline' : 'fc-block';
            for (var x = 0; x < options.length; x++) {
                var option = options[x].replace(/(\r\n|\n|\r)/gm, ""),
                    id = field._id.$id + '_' + x,
                    checked = getConfig(field, 'default') == option ? ' checked' : '';

                html += '<div class="' + cssClass + '">';
                html += '<input class="fc-fieldinput" type="radio" id="' + id + '" formcorp-data-id="' + field._id.$id + '" name="' + field._id.$id + '" value="' + htmlEncode(option) + '" data-required="' + required + '"' + checked + '>';
                html += '<label for="' + id + '">' + htmlEncode(option) + '</label>';
                html += '</div>';
            }
        }

        return html;
    }

    /**
     * Render a checkbox list.
     * @param field
     * @returns {string}
     */
    var renderCheckboxList = function (field) {
        var required = typeof(field.config.required) == 'boolean' ? field.config.required : false,
            options = getConfig(field, 'options', ''),
            html = '';

        if (options.length > 0) {
            options = options.split("\n");
            var cssClass = getConfig(field, 'inline', false) === true ? 'fc-inline' : 'fc-block';
            for (var x = 0; x < options.length; x++) {
                var option = options[x].replace(/(\r\n|\n|\r)/gm, ""),
                    id = field._id.$id + '_' + x;

                html += '<div class="' + cssClass + '">';
                html += '<input class="fc-fieldinput" type="checkbox" id="' + id + '" formcorp-data-id="' + field._id.$id + '" name="' + field._id.$id + '[]" value="' + htmlEncode(option) + '" data-required="' + required + '">';
                html += '<label for="' + id + '">' + htmlEncode(option) + '</label>';
                html += '</div>';
            }
        }

        return html;
    }

    /**
     * Render a hidden field.
     * @param field
     * @returns {string}
     */
    var renderHiddenField = function (field) {
        var html = '<input class="fc-fieldinput" type="hidden" formcorp-data-id="' + field._id.$id + '" value="' + getConfig(field, 'value') + '">';
        return html;
    }

    /**
     * Render a rich text area.
     * @param field
     * @returns {*}
     */
    var renderRichText = function (field) {
        if (typeof(field.config.rich) != 'string') {
            return '';
        }

        return '<div class="fc-richtext">' + field.config.rich + '</div>';
    }

    /**
     * Render a grouplet.
     * @param field
     * @returns {string}
     */
    var renderGrouplet = function (field) {
        var html = '';
        if (typeof(field.config.grouplet) == 'object') {
            var fields = field.config.grouplet.field,
                html = renderFields(fields);
        }

        return html;
    }

    /**
     * Returns whether two values are equal.
     *
     * @param field
     * @param comparisonValue
     * @returns {boolean}
     */
    this.comparisonEqual = function (field, comparisonValue) {
        if (typeof(field) == 'undefined') {
            return false;
        }

        return field == comparisonValue;
    }

    /**
     * Returns whether a string exists within an array.
     * @param field
     * @param comparisonValue
     * @returns {boolean}
     */
    this.comparisonIn = function (field, comparisonValue) {
        if (typeof(field) == 'undefined') {
            return false;
        }

        // Field can be object (i.e. checkbox list)
        if (typeof(field) == 'object') {
            // @todo maybe?
        }

        // Field can be string
        if (typeof(field) == 'string') {
            if (typeof(comparisonValue) == 'object') {
                for (var x = 0; x < comparisonValue.length; x++) {
                    var value = comparisonValue[x];
                    if (field == value) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Converts a string to camel case.
     * @param str
     * @returns {*}
     */
    this.toCamelCase = function (str) {
        return str.replace(/^([A-Z])|\s(\w)/g, function (match, p1, p2, offset) {
            if (p2) return p2.toUpperCase();
            return p1.toLowerCase();
        });
    };

    /**
     * Tests if a value is within a particular range.
     * @param params
     * @param value
     * @returns {boolean}
     */
    this.validatorRange = function (params, value) {
        if (!$.isNumeric(value)) {
            return false;
        }

        var min = parseFloat(params[0]),
            max = parseFloat(params[1]),
            value = parseFloat(value);

        return value >= min && value <= max;
    }

    /**
     * Tests if above a minimum value.
     * @param params
     * @param value
     * @returns {boolean}
     */
    this.validatorMin = function (params, value) {
        if (!$.isNumeric(value)) {
            return false;
        }

        return parseFloat(value) >= parseFloat(params[0]);
    }

    /**
     * Test if below minimum value.
     * @param params
     * @param value
     * @returns {boolean}
     */
    this.validatorMax = function (params, value) {
        if (!$.isNumeric(value)) {
            return false;
        }

        return parseFloat(value) <= parseFloat(params[0]);
    }

    /**
     * Test a string against a regular expression.
     * @param params
     * @param value
     * @returns {boolean|*}
     */
    this.validatorRegularExpression = function (params, value) {
        var re = new RegExp(params[0]);
        return re.test(value);
    }

    /**
     * HTML encode a string.
     * @param html
     * @returns {*}
     */
    function htmlEncode(html) {
        return document.createElement('a').appendChild(
            document.createTextNode(html)).parentNode.innerHTML;
    };

}(jQuery);