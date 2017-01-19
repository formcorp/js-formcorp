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
  formcorp.modules.IDMatrix = function (fieldId, form) {
    var _self = this;
    this.form = form;
    this.field = form.getFieldDefinition(fieldId);
    this.fieldId = fieldId;
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
      console.log('display the consent screen');
    });

    return {
      init: function () {
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
    };
  };
}());
