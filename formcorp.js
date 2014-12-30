/**
 * FormCorp JS SDK
 * @author Alex Berriman <alexb@fishvision.com>
 * @website http://www.formcorp.com.au/
 *
 * Ability to embed a JS client side form on to an external webpage.
 */
var fc = new function ($) {
    var apiUrl = '//192.168.0.106:9001/';

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

            // Register event listener
            registerEventListeners();

            // Load the form schema
            api('form/schema', {
                form_id: fc.formId
            }, 'post', function (data) {
                if (typeof(data.error) == 'boolean' && data.error) {
                    console.log('FC Error: ' + data.message);
                    return;
                }

                if (typeof(data.stage) != 'undefined') {
                    fc.schema = data;
                    render();
                }
            });
        });
    }

    /**
     * Register event listeners.
     */
    var registerEventListeners = function () {
        // Submit a form page
        $(fc.jQueryContainer).on('click', 'div.submit input[type=submit]', function () {
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
        });
    }

    /**
     * @todo check the validity of each field
     * @returns {boolean}
     */
    var validForm = function () {
        $('[formcorp-data-id]').each(function () {
            if ($(this).attr('data-required') == 'true' && getFieldValue($(this)) == '') {
                return false;
            }
        });
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
        }

        return '';
    }

    /**
     * Render a text field.
     * @param field
     * @returns {string}
     */
    var renderTextfield = function (field) {
        var html = '<input type="text" formcorp-data-id="' + field._id.$id + '">';
        console.log(field);

        return html;
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
        var pageDiv = '<div class="page">';
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
        pageDiv += '<div class="submit">';
        pageDiv += '<input type="submit" value="Submit">';
        pageDiv += '</div>';

        // Close page div
        pageDiv += '</div>';

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
                fieldHtml = '<div class="field">';

            if (typeof(field.config) == 'object' && typeof(field.config.label) == 'string' && field.config.label.length > 0) {
                fieldHtml += '<label>' + field.config.label + '</label>';
            }

            switch (field.type) {
                case 'text':
                    fieldHtml += renderTextfield(field);
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

        // Reached the end

    }

}(jQuery);