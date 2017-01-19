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
    State: {
      Consent: 'consent',
      Ready: 'ready'
    }
  };

  /**
   * Initialises a new instance of the IDMatrix module.
   * @param fieldId {string}
   * @param form {obj}
   */
  formcorp.modules.IDMatrix = function (fieldId, form, renderer) {
    var _self = this;
    this.form = form;
    this.field = form.getFieldDefinition(fieldId);
    this.fieldId = fieldId;
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
     * @return {}
     */
    this.getDomElements = function () {
      var search = '[fc-data-group="' + _self.fieldId + '"]';

      return _self.form.domContainer.find(search);
    };

    /**
     * Render out a template and recursively replace tokens.
     * @param html {string}
     * @return {string}
     */
    this.template = function (html) {
      var i = 0;
      var tokens = _self.getTokens();

      // Iterate through until either all tokens replaced or max iterations reach
      do {
        html = twig({
          data: html
        }).render(tokens);

        if (html.indexOf('{{') < 0) {
          // Not found
          return html;
        }
      } while (++i < 5);

      return html;
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
          DISPLAY_CONSENT_SCREEN: 'idmatrix/display/consent',
          INIT_FIELD: 'idmatrix/field/init',
          READY: 'idmatrix/field/ready'
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

    return {
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
  };
}());
