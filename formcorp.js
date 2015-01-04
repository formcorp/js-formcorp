/**
 * FormCorp JS SDK
 * @author Alex Berriman <alexb@fishvision.com>
 * @website http://www.formcorp.com.au/
 *
 * Ability to embed a JS client side form on to an external webpage.
 */
var fc = new function ($) {
    var apiUrl = '//192.168.0.106:9001/',
        cdnUrl = '//192.168.0.106:9004/';

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
        this.currentStage = 1;
        this.fields = {};
        this.fieldSchema = {};

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
            loadCssFiles();
            registerEventListeners();
            loadSchema();
        });
    }

    /**
     * Register the formcorp css files
     */
    var loadCssFiles = function () {
        var cssId = 'formcorp-css',
            cssUri = 'formcorp.css';

        if ($('#' + cssId).length == 0) {
            console.log('register css');
            var head = document.getElementsByTagName('head')[0];
            var link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.href = cdnUrl + cssUri;
            link.media = 'all';
            head.appendChild(link);
        }
    }

    /**
     * Load the form schema/definition
     */
    var loadSchema = function () {
        api('form/schema', {
            form_id: fc.formId
        }, 'post', function (data) {
            if (typeof(data.error) == 'boolean' && data.error) {
                console.log('FC Error: ' + data.message);
                return;
            }

            if (typeof(data.stage) != 'undefined') {
                fc.schema = orderSchema(data);
                console.log(fc.schema);
                render();
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
            if (!validForm()) {
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
                    nextPage();
                }
            });

            return false;
        });

        registerValueChangedListeners();
    }

    /**
     * Register event listeners that fire when a form input field's value changes
     */
    var registerValueChangedListeners = function () {
        // Input types text changed
        $(fc.jQueryContainer).on('change', 'input[type=text].fc-fieldinput', function () {
            valueChanged($(this).attr('formcorp-data-id'), $(this).val());
        });
    }

    /**
     * Function that is fired when a data value changes.
     * @param dataId
     * @param value
     */
    var valueChanged = function (dataId, value) {
        fc.fields[dataId] = value;

        // Flush the field visibility options
        flushFieldVisibility();
    }

    /**
     * Flushes the field visibility options. Should be triggered when the page is first rendered, and when a value
     * changes. A change in value represents a change in form state. When the form's state changes, the visibility of
     * certain fields may need to be altered.
     */
    var flushFieldVisibility = function () {
        console.log(fc.fields);
        $(fc.jQueryContainer).find('.fc-fieldinput').each(function () {
            var dataId = $(this).attr('formcorp-data-id');
            if (typeof(dataId) != 'string' || dataId.length == 0) {
                return;
            }

            console.log(dataId);
        });
    }

    /**
     * @todo check the validity of each field
     * @returns {boolean}
     */
    var validForm = function () {
        var errors = {};

        // Test if required fields have a value
        $('[data-required="true"]').each(function () {
            if (fieldIsEmpty($(this))) {
                errors[$(this).attr('formcorp-data-id')] = 'This field requires a value';
                $(this).parent().parent().addClass('fc-error');
            } else {
                $(this).parent().parent().removeClass('fc-error');
            }
        });

        // Terminate when errors exist
        if (Object.keys(errors).length > 0) {
            console.log('errors:');
            console.log(errors);
            return false;
        }
        return true;
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
     */
    var render = function () {
        var currentStage = typeof(fc.currentStage) != 'undefined' ? fc.currentStage : 1,
            currentStageIndex = currentStage - 1,
            stage = fc.schema.stage[currentStageIndex];

        console.log(stage);
        if (typeof(stage) != 'object') {
            return;
        }

        // Store field schema locally
        updateFieldSchema(stage);

        // @todo: page selection based on criteria
        var html = '<h1>' + stage.label + '</h1>';
        html += renderPage(stage.page[0]);

        $(fc.jQueryContainer).html(html);
    }

    /**
     * Update field schema (object stores the configuration of each field for easy access)
     * @param stage
     */
    var updateFieldSchema = function (stage) {
        console.log('update field schema');
        console.log(stage);
        if (typeof(stage.page) != 'undefined') {
            // Iterate through each page
            for (var x = 0; x < stage.page.length; x++) {
                var page = stage.page[x];
                if (typeof(page.section) == 'undefined') {
                    continue;
                }

                // Iterate through each section
                for (var y = 0; y < page.section.length; y++) {
                    var section = page.section[y];
                    if (typeof(section.field) == 'undefined' || section.field.length == 0) {
                        continue;
                    }

                    // Iterate through each field
                    for (var z = 0; z < section.field.length; z++) {
                        var field = section.field[z],
                            id = field._id.$id;

                        // Add t field schema if doesn't already exist
                        if (typeof(fc.fieldSchema[id]) == 'undefined') {
                            fc.fieldSchema[id] = field;
                        }
                    }
                }
            }
        }
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
                sectionHtml = '<div class="fc-section">';

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
                fieldHtml = '<div class="fc-field fc-field-' + field.type + '">';

            if (typeof(field.config) == 'object' && typeof(field.config.label) == 'string' && field.config.label.length > 0) {
                fieldHtml += '<label>' + field.config.label + '</label>';
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
            }

            // Help text
            if (getConfig(field, 'help').length > 0) {
                fieldHtml += '<div class="fc-help">' + getConfig(field, 'help') + '</div>';
            }

            fieldHtml += '</div></div>';
            html += fieldHtml;
        }

        return html;
    }

    /**
     * Render the next page
     */
    var nextPage = function () {
        var currentStage = typeof(fc.currentStage) != 'undefined' ? fc.currentStage : 1,
            nextStage = currentStage + 1,
            nextStageIndex = nextStage - 1;

        // Render the next stage
        if (typeof(fc.schema.stage[nextStageIndex]) == 'object') {
            fc.currentStage++;
            render();
            return;
        }
    }

    /**
     * Returns true when a next stage exists.
     * @returns {boolean}
     */
    var hasNextPage = function () {
        var currentStage = typeof(fc.currentStage) != 'undefined' ? fc.currentStage : 1;
        return typeof(fc.schema.stage[currentStage]) == 'object';
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
            for (var x = 0; x < options.length; x++) {
                options[x] = options[x].replace(/(\r\n|\n|\r)/gm, "");
                html += '<option value="' + htmlEncode(options[x]) + '">' + htmlEncode(options[x]) + '</option>';
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
     * HTML encode a string.
     * @param html
     * @returns {*}
     */
    function htmlEncode(html) {
        return document.createElement('a').appendChild(
            document.createTextNode(html)).parentNode.innerHTML;
    };

}(jQuery);