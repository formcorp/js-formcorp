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
    this.fieldId = fieldId;
    this.value = form.getValue(fieldId);

    /**
     * 'Flushes' the value in the local object with what's stored against the form
     */
    this.flushValue = function () {
      _self.value = form.getValue(_self.fieldId);
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
      _self.form.setValue(_self.fieldId, value);
    };

    // Field needs rendering
    _self.events.subscribe(_self.events.const.INIT_FIELD, function () {
      _self.initValue();
      _self.events.publish(_self.events.const.READY);
    });

    // Display consent screen
    _self.events.subscribe(_self.events.const.DOM.CONSENT, function () {
      conosle.log('display the consent screen');
    });

    return {
      init: function () {
        var value = _self.value;
        console.log(value);
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
