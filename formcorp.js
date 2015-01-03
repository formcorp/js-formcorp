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
                $(this).parent().addClass('fc-error');
            } else {
                $(this).parent().removeClass('fc-error');
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
        if (field.is('input')) {
            return field.val();
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

        // @todo: page selection based on criteria
        var html = '<h1>' + stage.label + '</h1>';
        html += renderPage(stage.page[0]);

        $(fc.jQueryContainer).html(html);
    }

    /**
     * Render a page.
     * @param page
     * @returns {string}
     */
    var renderPage = function (page) {
        // Page details
        var pageDiv = '<div class="page"><form class="fc-form">';
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
                sectionHtml = '<div class="section">';

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
                fieldHtml = '<div class="fc-field">';

            if (typeof(field.config) == 'object' && typeof(field.config.label) == 'string' && field.config.label.length > 0) {
                fieldHtml += '<label>' + field.config.label + '</label>';
            }

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
            }

            fieldHtml += '</div>';
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
            html = '<input type="text" formcorp-data-id="' + field._id.$id + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '">';
        return html;
    }

    /**
     * Render a dropdown field.
     * @param field
     * @returns {string}
     */
    var renderDropdown = function (field) {
        var required = typeof(field.config.required) == 'boolean' ? field.config.required : false,
            html = '<select formcorp-data-id="' + field._id.$id + '" data-required="' + required + '">',
            options = getConfig(field, 'options', '');

        if (getConfig(field, 'placeholder', '').length > 0) {
            html += '<option value="" disabled selected>' + htmlEncode(getConfig(field, 'placeholder')) + '</option>';
        }

        if (options.length > 0) {
            options = options.split("\n");
            for (var x = 0; x < options.length; x++) {
                options[x] = options[x].replace(/(\r\n|\n|\r)/gm,"");
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
            html = '<textarea formcorp-data-id="' + field._id.$id + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '" rows="' + getConfig(field, 'rows', 3) + '"></textarea>';
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