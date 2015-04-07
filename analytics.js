/**
 * FormCorp Analytics
 * @author Alex Berriman <alexb@formcorp.com.au>
 * @website www.formcorp.com.au
 */

/*global jQuery,fc*/

var fcAnalytics = (function ($) {
    "use strict";

    // If formcorp not initialised, return empty
    if (!fc) {
        return {};
    }

    /**
     * Tje URL of the Analytics javaqscript file
     * @type {string}
     */
    var registerAnalyticsEventListeners = function () {
            // Text value focused
            $(fc.jQueryContainer).on('focus', '.fc-fieldinput', function () {
                var dataId = $(this).attr('formcorp-data-id'),
                    params = {
                        dataId: dataId
                    };
                fcAnalytics.logEvent(fc.eventTypes.onFocus, params);
            });

            // Text value focused
            $(fc.jQueryContainer).on('blur', '.fc-fieldinput', function () {
                var dataId = $(this).attr('formcorp-data-id'),
                    params = {
                        dataId: dataId
                    };
                fcAnalytics.logEvent(fc.eventTypes.onBlur, params);
            });

            // Mouse down event
            $(fc.jQueryContainer).on('mousedown', function (e) {
                var x = parseInt(e.pageX - fc.formPosition.left, 10),
                    y = parseInt(e.pageY - fc.formPosition.top, 10);

                fcAnalytics.logEvent(fc.eventTypes.onMouseDown, {
                    x: x,
                    y: y
                });
            });
        },

        /**
         * Process the event queue
         */
        processEventQueue = function () {
            // If the event queue isn't running, default it to false
            if (fcAnalytics.eventQueueRunning === undefined) {
                fcAnalytics.eventQueueRunning = false;
            }

            // If already running, do nothing
            if (fcAnalytics.eventQueueRunning) {
                console.log('[FC] The event queue is already running (slow server?)');
                return;
            }

            // If no events, do nothing
            if (fcAnalytics.events.length === 0) {
                return;
            }

            // Mark the event queue as running, move events to the queue
            fcAnalytics.eventQueueRunning = true;
            fcAnalytics.queuedEvents = fcAnalytics.events;
            fcAnalytics.events = [];

            // Format the data to send with the request
            var data = {
                events: fcAnalytics.queuedEvents
            };

            // Fire off the API call
            fc.api('analytics/log', data, 'post', function (data) {
                // There was an error processing the update, move the queued events back in to the queue
                if (typeof data !== 'object' || typeof data.success !== 'boolean' || !data.success) {
                    console.log('[FC] Error processing the analytics queue');
                    var queue = fcAnalytics.queuedEvents.concat(fcAnalytics.events);
                    fcAnalytics.events = queue;
                }

                // Reset the queue
                fcAnalytics.queuedEvents = [];
                fcAnalytics.eventQueueRunning = false;
            });
        },

        /**
         * Initialise the event queue
         */
        initEventQueue = function () {
            // Send events off to the server
            setInterval(function () {
                if (fc.expired === true) {
                    return;
                }
                processEventQueue();
            }, fc.config.eventQueueInterval);
        };

    /**
     * Return class methods
     */
    return {
        /**
         * Analytics class constants
         */
        constants: {
            loaded: 'fc.analytics.loaded'
        },

        /**
         * Initialise the analytics
         */
        init: function () {
            this.events = [];
            this.eventQueueRunning = false;

            registerAnalyticsEventListeners();
            initEventQueue();

            console.log('analytics init');
            console.log(fc.getCdnUrl());
        },

        /**
         * Store an event locally to be logged
         * @param event
         * @param params
         */
        logEvent: function (event, params) {
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

            fcAnalytics.events.push(eventObject);
        }
    };

}(jQuery));