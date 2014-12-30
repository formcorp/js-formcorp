var fc = new function ($) {
    var apiUrl = '//192.168.0.106:9001/';

    // Send off an api call
    var api = function (uri, data, type, callback) {
        if (type === undefined || typeof(type) != 'string' || ['GET', 'POST'].indexOf(type.toUpperCase()) == -1) {
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

    // Initialise the FC object
    this.init = function (publicKey, container) {
        this.publicKey = publicKey;
        this.container = container;
        this.jQueryContainer = '#' + container;

        // Check to make sure container exists
        $(document).ready(function () {
            if ($(fc.jQueryContainer).length == 0) {
                console.log('FC Error: Container not found.');
                return false;
            }

            // Fetch the form id
            if ($(fc.jQueryContainer).attr('data-id') == '') {
                console.log('FC Error: Form id not found.');
            }
            fc.formId = $(fc.jQueryContainer).attr('data-id');

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

        // Render the form
        var render = function () {
            var currentStage = typeof(fc.currentStage) != 'undefined' ? fc.currentStage : 1,
                currentStageIndex = currentStage - 1,
                stage = fc.schema.stage[currentStageIndex];

            if (typeof(stage) != 'object') {
                return;
            }
        }
    }

}(jQuery);