/**
 * FormCorp IDMatrix Integration
 *
 * @author Alex Berriman <aberriman@formcorp.com.au>
 * @website www.formcorp.com.au
 */

/*global jQuery,fc,_,formcorp*/
(function() {
  if (typeof formcorp === 'undefined' || typeof formcorp.modules === 'undefined') {
    // Formcorp main hasn't been properly initialised
    return;
  }

  if (typeof formcorp.modules.IDMatrix === 'object') {
    // IDMatrix module has already been loaded
    return;
  }

  /**
   * Module constants
   */
  formcorp.const.IDMatrix = {
    Api: {
      FieldVerification: '/veda/id-matrix/field-verification'
    },
    State: {
      Consent: 'consent',
      Ready: 'ready'
    },
    VerificationResult: {
      Accept: 'ACCEPT',
      Error: 'ERROR',
      Reject: 'REJECT',
      Timeout: 'TIMEOUT'
    }
  };

  // Formcorp IDMatrix module
  formcorp.modules.IDMatrix = {
    sessions: {}
  };

  /**
   * Initialises a new instance of the IDMatrix module.
   * @param fieldId {string}
   * @param form {obj}
   */
  formcorp.modules.IDMatrix.Session = function (fieldId, form, renderer) {
    var _self = this;
    this.configured = false;
    this.form = form;
    this.field = form.getFieldDefinition(fieldId);
    this.fieldId = fieldId;
    this.individual = {};
    this.initialised = false;
    this.renderer = typeof renderer === 'function' ? new renderer(this) : renderer;
    this.value = form.getValue(fieldId);

    /**
     * 'Flushes' the value in the local object with what's stored against the form
     */
    this.getValue = function () {
      _self.value = form.getValue(_self.fieldId);

      return _self.value;
    };

    /**
     * Set the value both on the form instance and local class.
     * @param value {object}
     */
    this.setValue = function (value) {
      _self.form.setValue(_self.fieldId, value);
      _self.value = value;
    };

    /**
     * Returns a configuration option for the field.
     * @param key {string}
     * @param defaultValue {*}
     * @return {*}
     */
    this.getConfig = function (key, defaultValue) {
      if (typeof _self.field !== 'object' || typeof _self.field.config !== 'object') {
        return defaultValue;
      }

      if (typeof _self.field.config[key] === 'undefined') {
        return defaultValue;
      }

      return _self.field.config[key];
    };

    /**
     * Map data from the form to the individual for the point of verification.
     */
    this.map = function () {
      /**
       * Retrieves the value from the form values, using the stored ID
       * @param val {string}
       * @return {string}
       */
      var getValue = function (val) {
        return _self.form.getValue(_self.getConfig(val));
      };

      // Construct the individual object
      _self.individual = {
        firstName: getValue('mappingFirstName'),
        otherGivenNames: getValue('mappingMiddleName'),
        familyName: getValue('mappingSurname'),
        dateOfBirth: getValue('mappingDateOfBirth'),
        currentAddress: getValue('mappingCurrentAddress')
      };
    };

    /**
     * Send a request to the formatic API
     * @param uri {string}
     * @param data {obj}
     * @param type {string}
     * @param callback {function}
     */
    this.api = function (uri, data, type, callback) {
      if (typeof data === 'undefined') {
        data = {};
      }

      // Send the remote API request
      _self.form.api(
        uri,
        data,
        type,
        function (data) {
          if (typeof data.success !== 'boolean') {
            _self.showError('An unexpected result was returned from the remote API');
            return;
          }

          if (!data.success) {
            // The API result wasn't an error
            var error = typeof data.message === 'string' ? data.message : 'Unknown';
            _self.showError('An error occurred: ' + error);
            return;
          }

          if (typeof callback === 'function') {
            callback(data);
          }
        },
        function (err) {
          _self.showError('An unknown error occurred sending the request.')
        }
      );
    };

    /**
     * Sets the status of the IDMatrix verification
     */
    this.setStatus = function (status) {
      _self.value.status = status;
      _self.setValue(_self.value);
    };

    /**
     * Returns an object of tokens for use in templating
     * @return {obj}
     */
    this.getTokens = function () {
      var tokens = _self.form.getTokens();
      var config = _self.field.config;

      return jQuery.extend({}, tokens, {
        config: _self.field.config
      });
    };

    /**
     * Return all of the DOM elements for the session.
     * If there are multiple instances where a user can be verified, it needs to return
     * multiple DOM elements.
     * @param returnAsString {boolean}
     * @return {}
     */
    this.getDomElements = function (returnAsString) {
      if (typeof returnAsString !== 'boolean') {
        returnAsString = false;
      }

      var search = '[fc-data-group="' + _self.fieldId + '"]';
      if (returnAsString) {
        return search;
      }

      return _self.form.domContainer.find(search);
    };

    /**
     * Configure the event listeners for DOM interaction
     */
    this.configureEventListeners = function () {
      if (_self.configured) {
        return;
      }

      var el = _self.getDomElements();

      // Confirm consent button clicked
      el.on('click', '[data-bind="confirmConsent"]', function () {
        _self.events.publish(_self.events.const.CONFIRM_CONSENT_CLICK);
        return false;
      });

      _self.configured = true;
    };

    /**
     * Show an error message on the DOM
     * @param msg {string}
     */
    this.showError = function (msg) {
      if (typeof msg !== 'string' || msg.length === 0) {
        return;
      }

      // Generate the error HTML
      var html = _self.template(_self.renderer.Error(), {
        msg: msg
      }, false);

      // Update the value in the DOM
      var el = _self.getDomElements();
      el.find('.footer .errors').html(html);
    };

    /**
     * Clear errors within the DOM
     */
    this.clearErrors = function () {
      var el = _self.getDomElements();
      el.find('.footer .errors').html('');
    };

    /**
     * Render out a template and recursively replace tokens.
     * @param html {string}
     * @param data {obj}
     * @param withBase {boolean}
     * @return {string}
     */
    this.template = function (html, data, withBase) {
      if (typeof withBase !== 'boolean') {
        withBase = true;
      }

      if (typeof data === 'undefined') {
        data = {};
      }

      // Use the base HTML, or if not set, the raw html string
      var base = withBase ? _self.renderer.Base() : html;

      var i = 0;
      var tokens = $.extend({}, _self.getTokens(), data);

      // Add the html to the body
      if (withBase) {
        tokens.body = html;
      }

      var template = base;

      // Iterate through until either all tokens replaced or max iterations reach
      do {
        template = twig({
          data: template
        }).render(tokens);

        if (template.indexOf('{{') < 0) {
          // Not found
          return template;
        }
      } while (++i < 10);

      return template;
    };

    /**
     * Render HTML against the field value
     * @param html {string}
     */
    this.render = function (html) {
      var el = _self.getDomElements();
      if (el.length === 0) {
        return;
      }

      if (el.hasClass('fc-error')) {
        // Remove the error class if it exists
        el.removeClass('fc-error');
      }

      el.html(html);
    };

    // Event binder
    this.events = (function() {
      var topics = {};
      var hOP = topics.hasOwnProperty;

      return {
        const: {
          DOM: {
            CONSENT: 'idmatrix/dom/consent',
            RENDER: 'idmatrix/dom/render'
          },
          BACKGROUND_CHECK_DO: 'idmatrix/background/do',
          CONFIRM_CONSENT_CLICK: 'idmatrix/consent/confirm',
          DISPLAY_CONSENT_SCREEN: 'idmatrix/display/consent',
          INIT_FIELD: 'idmatrix/field/init',
          READY: 'idmatrix/field/ready',
          VERIFICATION_BG_CHECK_ERROR: 'idmatrix/verification/bg/error',
          VERIFICATION_BG_CHECK_REJECT: 'idmatrix/verification/bg/reject',
          VERIFICATION_BG_CHECK_SUCCESS: 'idmatrix/verification/bg/success',
          VERIFICATION_BG_CHECK_TIMEOUT: 'idmatrix/verification/bg/timeout',

        },
        subscribe: function(topic, listener) {
          if (!hOP.call(topics, topic)) {
            topics[topic] = [];
          }

          var index = topics[topic].push(listener) -1;

          return {
            remove: function() {
              delete topics[topic][index];
            }
          };
        },
        publish: function(topic, info) {
          if (!hOP.call(topics, topic)) {
            return;
          }

          console.log('Event published: ' + topic);
          topics[topic].forEach(function(item) {
              console.log("\tevent subscription executed\n");
              item(info != undefined ? info : {});
          });
        }
      };
    })();

    /**
     * Initialise the value and send up to remote
     */
    this.initValue = function () {
      var value = {
        individual: {},
        status: formcorp.const.IDMatrix.State.Ready,
        value: {}
      }

      // Set the value against the form object
      _self.setValue(value);
    };

    // Field needs rendering
    _self.events.subscribe(_self.events.const.INIT_FIELD, function () {
      _self.initValue();
      _self.events.publish(_self.events.const.READY);
    });

    // Module is ready - what to do?
    _self.events.subscribe(_self.events.const.READY, function () {
      if (_self.getConfig('showConsentScreen', false)) {
        // If field is configured to didplay the consent screen, do so now
        _self.setStatus(formcorp.const.IDMatrix.State.Consent);
        _self.events.publish(_self.events.const.DOM.CONSENT);
        return;
      }
    });

    // Display consent screen
    _self.events.subscribe(_self.events.const.DOM.CONSENT, function () {
      _self.render(_self.template(_self.renderer.ConsentScreen()));
    });

    // On confirm consent click
    _self.events.subscribe(_self.events.const.CONFIRM_CONSENT_CLICK, function () {
      var el = _self.getDomElements();
      var checked = el.find('[data-bind="confirmCheck"]').is(':checked');

      if (!checked) {
        // Show error, need to confirm consent
        _self.showError('You must first consent to identity verification');
      } else {
        // What to do?
        _self.clearErrors();
        _self.events.publish(_self.events.const.BACKGROUND_CHECK_DO);
      }
    });

    // Run a background check
    _self.events.subscribe(_self.events.const.BACKGROUND_CHECK_DO, function () {
      _self.api(
        formcorp.const.IDMatrix.Api.FieldVerification,
        { fieldId: _self.fieldId },
        'POST',
        function (data) {
          var outcome = data.result.outcome.result;

          switch (data.result.outcome.result) {
            // Background verification was accepted
            case formcorp.const.IDMatrix.VerificationResult.Accept:
              _self.events.publish(_self.events.const.VERIFICATION_BG_CHECK_SUCCESS, data.result);
              break;

            // Background verification was rejected
            case formcorp.const.IDMatrix.VerificationResult.Reject:
              _self.events.publish(_self.events.const.VERIFICATION_BG_CHECK_REJECT, data.result);
              break;

            // Background verification resulted in an error
            case formcorp.const.IDMatrix.VerificationResult.Error:
              _self.events.publish(_self.events.const.VERIFICATION_BG_CHECK_ERROR, data.result);
              break;

            // Background verification timed out
            case formcorp.const.IDMatrix.VerificationResult.Timeout:
              _self.events.publish(_self.events.const.VERIFICATION_BG_CHECK_TIMEOUT, data.result);
              break;

            default:
              _self.showError('An unknown error occured when performing background check.');
          }
        }
      );
    });

    // Verification background check was a success
    _self.events.subscribe(_self.events.const.VERIFICATION_BG_CHECK_SUCCESS, function (data) {
      _self.render(_self.template(_self.renderer.BackgroundVerificationSuccess()));
    });

    // Background check rejected - need more information
    _self.events.subscribe(_self.events.const.VERIFICATION_BG_CHECK_REJECT, function (data) {
      _self.render(_self.template(_self.renderer.ActiveVerification()));
    });

    var session = {
      // Expose the events for use by 3rd party
      events: _self.events,

      // Initialise the module
      init: function () {
        return '&nbsp;';
      },

      callbacks: {
        /**
         * After render, ready to publish/subscribe and start playing around in the dom
         */
        afterRender: function () {
          if (!_self.initialised) {
            _self.initialised = true;
            _self.map();
            _self.configureEventListeners();

            var value = _self.value;
            if (typeof value !== 'object' || typeof value.status !== 'string') {
              // The value hasn't yet been initialised
              _self.events.publish(_self.events.const.INIT_FIELD);
              return;
            }

            // The value has been correctly initialised, render it
            switch (value.status) {
              // IDMatrix is ready
              case formcorp.const.IDMatrix.const.State.Ready:
                _self.events.publish(_self.events.const.READY);
                break;

              // Display the consent screen
              case formcorp.const.IDMatrix.const.State.Consent:
                _self.events.publish(_self.events.const.DOM.CONSENT);
                break;
            }
          }
        }
      }
    };

    // Add to the sessions object
    formcorp.modules.IDMatrix.sessions[_self.fieldId] = session;

    return session;
  };
}());
