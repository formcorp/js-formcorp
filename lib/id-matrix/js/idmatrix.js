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
      ActiveVerification: '/veda/id-matrix/active-field-verification',
      FieldVerification: '/veda/id-matrix/field-verification'
    },
    State: {
      Consent: 'consent',
      Error: 'error',
      Locked: 'locked',
      Ready: 'ready',
      Skipped: 'skipped',
      Verification: 'verification',
      Verified: 'verified'
    },
    VerificationResult: {
      Accept: 'ACCEPT',
      Error: 'ERROR',
      Locked: 'LOCKED',
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
          if (typeof data.value === 'object') {
            // Update was passed down by the server, set locally
            _self.setValue(data.value);
          }

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
          // Update the status locally
          _self.setStatus(formcorp.const.IDMatrix.State.Error);
          _self.events.publish(_self.events.const.VERIFICATION_SHOW_ERROR);
        }
      );
    };

    /**
     * Sets the status of the IDMatrix verification
     */
    this.setStatus = function (status) {
      _self.value.status = status;
      _self.setValue(_self.value);

      var el = _self.getDomElements();
      el.attr('data-status', _self.value.status);
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
        return;
      });

      // User opted to perform active verification
      el.on('click', '[data-bind="do-active-verification"]', function () {
        _self.events.publish(_self.events.const.DO_ACTIVE_VERIFICATION);
        return;
      });

      // Verification source clicked
      el.on('click', '.verification-source h4', function () {
        var obj = $(this);
        var parent = obj.parent();

        _self.events.publish(_self.events.const.VERIFICATION_SOURCE_SHOW_HIDE, parent);
      });

      // Skip button clicked
      el.on('click', '.skip', function () {
        _self.events.publish(_self.events.const.DO_SKIP, true);
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
      el.find('.footer .alerts').html(html);
    };

    /**
     * Clear errors within the DOM
     */
    this.clearErrors = function () {
      var el = _self.getDomElements();
      el.find('.footer .alerts').html('');
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
          ACTIVE_VERIFICATION_REJECT: 'idmatrix/verification/active-reject',
          BACKGROUND_CHECK_DO: 'idmatrix/background/do',
          CONFIRM_CONSENT_CLICK: 'idmatrix/consent/confirm',
          DISPLAY_CONSENT_SCREEN: 'idmatrix/display/consent',
          DO_ACTIVE_VERIFICATION: 'idmatrix/verification/active/do',
          DO_SKIP: 'idmatrix/verification/skip',
          INIT_FIELD: 'idmatrix/field/init',
          READY: 'idmatrix/field/ready',
          RECEIVE_ACTIVE_VERIFICATION_RESULT: 'idmatrix/result/active',
          SEND_ACTIVE_VERIFICATION: 'idmatrix/verification/active/send',
          VERIFICATION_BG_CHECK_ERROR: 'idmatrix/verification/bg/error',
          VERIFICATION_BG_CHECK_REJECT: 'idmatrix/verification/bg/reject',
          VERIFICATION_BG_CHECK_SUCCESS: 'idmatrix/verification/bg/success',
          VERIFICATION_BG_CHECK_TIMEOUT: 'idmatrix/verification/bg/timeout',
          VERIFICATION_LOCKED: 'idmatrix/verification/locked',
          VERIFICATION_SHOW_ACTIVE: 'idmatrix/verification/action/show',
          VERIFICATION_SHOW_ERROR: 'idmatrix/verification/error/show',
          VERIFICATION_SHOW_SKIPPED: 'idmatrix/verification/skipped/show',
          VERIFICATION_SHOW_VERIFIED: 'idmatrix/verification/verified/show',
          VERIFICATION_SOURCE_SHOW_HIDE: 'idmatrix/verification-source/show-hide',
          VERIFICATION_SUCCESS: 'idmatrix/verification/success'
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

          if (typeof data.value === 'object') {
            // If a value was passed back, update locally
            _self.setValue(data.value);
          }

          switch (data.result.outcome.result) {
            // Background verification was accepted
            case formcorp.const.IDMatrix.VerificationResult.Accept:
              _self.events.publish(_self.events.const.VERIFICATION_BG_CHECK_SUCCESS, data.result);
              _self.events.publish(_self.events.const.VERIFICATION_SUCCESS);
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
    _self.events.subscribe(_self.events.const.VERIFICATION_SUCCESS, function (data) {
      _self.events.publish(_self.events.const.VERIFICATION_SHOW_VERIFIED);
      _self.render(_self.template(_self.renderer.VerificationSuccess()));
    });

    // Background check rejected - need more information
    _self.events.subscribe(_self.events.const.VERIFICATION_BG_CHECK_REJECT, function (data) {
      _self.events.publish(_self.events.const.VERIFICATION_SHOW_ACTIVE);
      _self.render(_self.template(_self.renderer.ActiveVerification()));
    });

    // Show/hide active verification data source
    _self.events.subscribe(_self.events.const.VERIFICATION_SOURCE_SHOW_HIDE, function (obj) {
      _self.clearErrors();
      obj.toggleClass('active');
    });

    // Perform activate verification
    _self.events.subscribe(_self.events.const.DO_ACTIVE_VERIFICATION, function () {
      var el = _self.getDomElements();
      var activeSources = el.find('.verification-source.active');

      // Ensure the user has selected a single form
      if (activeSources.length === 0) {
        _self.showError('You must select at least one additional source to verify.');
        return;
      }

      var errors = [];

      // Iterate through each active source and ensure valid
      var values = {};
      activeSources.each(function () {
        var obj = $(this);
        var localErrors = 0;

        // Retrieve the source key and map to data object
        var source = obj.attr('data-source');
        values[source] = {};

        obj.find('select,input[type="text"]').each(function () {
          var input = $(this);
          var name = input.attr('name');
          var isRequired = typeof input.attr('data-required') !== 'undefined';
          var val;

          // Retrieve the input value
          if (input.is('select')) {
            val = input.find('option:selected').val();
          } else {
            val = input.val();
          }

          // If the field is required, check to make sure it was filled out
          if (isRequired && (typeof val !== 'string' || val.length === 0)) {
            input.addClass('fc-error');
            errors.push(name + ' is required');
            _self.showError('Please fill out all required fields.');
            obj.addClass('error');
            ++localErrors;
          } else {
            // Remove the error
            input.removeClass('fc-error');
          }

          // Append to the data object
          values[source][name] = val;
        });

        if (localErrors > 0) {
          // If any errors were detected in the source, add an error class
          obj.addClass('error');
        } else if (obj.hasClass('error')) {
          // Remove the error class if exists and no errors detected
          obj.removeClass('error');
        }
      });

      if (errors.length > 0) {
        // Errors were encountered, do nothing
        return;
      }

      // Clear the errors from the DOM
      _self.clearErrors();
      el.find('.verification-source.error').removeClass('error');

      // Send the request
      _self.events.publish(_self.events.const.SEND_ACTIVE_VERIFICATION, values);
    });

    // Send the active verification
    _self.events.subscribe(_self.events.const.SEND_ACTIVE_VERIFICATION, function (values) {
      // Perform the active verification
      _self.api(
        formcorp.const.IDMatrix.Api.ActiveVerification,
        {
          fieldId: _self.fieldId,
          values: values
        },
        'POST',
        function (data) {
          // Let everyone know a result was received
          _self.events.publish(_self.events.const.RECEIVE_ACTIVE_VERIFICATION_RESULT, data);

          if (typeof data.result === 'undefined' || typeof data.result.outcome === 'undefined') {
            _self.showError('An unknown result was returned from the verification server.');
          }

          var outcome = data.result.outcome.result;

          if (typeof data.value === 'object') {
            // If a value was passed back, update locally
            _self.setValue(data.value);
          }

          // If the status has changed to locked, show the lock screen
          if (_self.value.status === formcorp.const.IDMatrix.State.Locked) {
            _self.events.publish(_self.events.const.VERIFICATION_LOCKED);
            return;
          }

          switch (data.result.outcome.result) {
            // Background verification was accepted
            case formcorp.const.IDMatrix.VerificationResult.Accept:
              _self.events.publish(_self.events.const.VERIFICATION_SUCCESS);
              break;

            case formcorp.const.IDMatrix.VerificationResult.Locked:
              // If the reject limit has been hit, deal with accordingly
              _self.events.publish(_self.events.const.VERIFICATION_LOCKED);
              break;

            // Background verification was rejected
            case formcorp.const.IDMatrix.VerificationResult.Reject:
              // Show reject details
              _self.events.publish(_self.events.const.ACTIVE_VERIFICATION_REJECT);
              break;

            // Background verification resulted in an error
            case formcorp.const.IDMatrix.VerificationResult.Error:
              _self.showError('An unknown error occurred during verification.');
              break;

            // Background verification timed out
            case formcorp.const.IDMatrix.VerificationResult.Timeout:
              _self.showError('Verification request timed out, please try again.');
              break;

            default:
              _self.showError('An unknown error occured when performing background check.');
          }
        }
      );
    });

    // Active verificationr rejected
    _self.events.subscribe(_self.events.const.ACTIVE_VERIFICATION_REJECT, function () {
      _self.showError('You have failed to pass automatic verification. Please confirm your document details and try again.');

      var el = _self.getDomElements();
      el.find('.verification-source.active').addClass('error');
    });

    // Locked out of verification
    _self.events.subscribe(_self.events.const.VERIFICATION_LOCKED, function () {
      _self.render(_self.template(_self.renderer.LockedScreen()));
    });

    // Perform skipping of verification
    _self.events.subscribe(_self.events.const.DO_SKIP, function (update) {
      if (typeof update !== 'boolean') {
        update = false;
      }

      if (update) {
        // Update the application status
        _self.setStatus(formcorp.const.IDMatrix.State.Skipped);
      }

      _self.events.publish(_self.events.const.VERIFICATION_SHOW_SKIPPED);
      _self.render(_self.template(_self.renderer.SkippedScreen()));
    });

    // Show the error screen
    _self.events.subscribe(_self.events.const.VERIFICATION_SHOW_ERROR, function () {
      _self.render(_self.template(_self.renderer.ErrorScreen()));
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
          if (typeof formcorp.const.IDMatrix === 'undefined') {
            // Hasn't yet been properly initialised
            return;
          }

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
              case formcorp.const.IDMatrix.State.Ready:
                _self.events.publish(_self.events.const.READY);
                break;

              // Display the consent screen
              case formcorp.const.IDMatrix.State.Consent:
                _self.events.publish(_self.events.const.DOM.CONSENT);
                break;

              // Display the locked screen
              case formcorp.const.IDMatrix.State.Locked:
                _self.events.publish(_self.events.const.VERIFICATION_LOCKED);
                break;

                // Display the skipped screen
                case formcorp.const.IDMatrix.State.Skipped:
                _self.events.publish(_self.events.const.DO_SKIP);
                break;

              // Display the verification screen
              case formcorp.const.IDMatrix.State.Verification:
                _self.events.publish(_self.events.const.VERIFICATION_SHOW_ACTIVE);
                _self.render(_self.template(_self.renderer.ActiveVerification()));
                break;

              // Display the verification screen
              case formcorp.const.IDMatrix.State.Verified:
                _self.events.publish(_self.events.const.VERIFICATION_SHOW_VERIFIED);
                _self.render(_self.template(_self.renderer.VerificationSuccess()));
                break;

              // Error occurred during verification
              case formcorp.const.IDMatrix.State.Error:
                _self.events.publish(_self.events.const.VERIFICATION_SHOW_ERROR);
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
