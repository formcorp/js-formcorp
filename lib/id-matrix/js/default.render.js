/* global formcorp */
if (typeof formcorp.Renderer === 'undefined') {
  formcorp.Renderer = {};
}

if (typeof formcorp.Renderer.IDMatrix === 'undefined') {
  formcorp.Renderer.IDMatrix = {};
}

(function() {
  if (typeof formcorp.Renderer.IDMatrix.Default !== 'undefined') {
    return;
  }

  /**
   * Default template renderer for IDMatrix
   * @param module {string}
   * @return {obj}
   */
  formcorp.Renderer.IDMatrix.Default = function (module) {
    var _self = this;

    this.module = module;

    /**
     * Additional sources templates
     * @return {obj}
     */
    this.sources = {
      /**
       * Display the drivers license form
       * @return {string}
       */
      driversLicense: function () {
        var stateCodes = {
          'ACT': 'ACT',
          'NSW': 'NSW',
          'NT': 'NT',
          'QLD': 'QLD',
          'SA': 'SA',
          'TAS': 'TAS',
          'VIC': 'VIC',
          'WA': 'WA'
        };

        var template = '' +
          '<div class="verification-source">' +
          ' <h5>Australian driver licence</h5>' +
          ' <div class="options">' +
          '   <div class="option">' +
          '     <h5>Licence number</h5>' +
          '     <input type="text" name="license-number">' +
          '   </div>' +
          '   <div class="option">' +
          '     <h5>Issuing state</h5>' +
          '     <select name"state-code">' +
          '       <option value=""></option>' +
          '       {% for key,value in states %}' +
          '         <option value="{{ key}}">{{ value }}</option>' +
          '       {% endfor %}' +
          '     <select>' +
          '   </div>'
          ' </div>'
          '</div>';

          return twig({data: template}).render({
            states: stateCodes
          });
      },

      /**
       * Return the medicare form
       * @return {string}
       */
      medicare: function () {
        return 'medicare';
      },

      /**
       * Return the passport form
       * @return {string}
       */
      passport: function () {
        return 'passport';
      },

      /**
       * Return the previous addresses form
       * @return {string}
       */
      previousAddresses: function () {
        return 'previous addresses';
      }
    };

    return {
      /**
       * Screen to show when more active verification is required.
       * @return {string}
       */
      ActiveVerification: function () {
        var sources = _self.module.getConfig('availableSources', []);
        var sourceHtml = [];
        var sourceName;

        // Iterate through and append source HTML
        for (var i = 0, l = sources.length; i < l; i++) {
          sourceName = sources[i];
          if (typeof _self.sources[sourceName] === 'function') {
            sourceHtml.push(_self.sources[sourceName]());
          }
        }

        return '' +
          '<div class="active-verification">' +
          ' <div class="head">' +
          '   <h2>Looks like we need more details...</h2>' +
          '   <p>We need to know a few more details to verify your identity. Please provide details about more than one document where possible.</p>' +
          ' </div>' +
          ' <div class="verification-sources">' +
          '   active verification sources' +
          '   ' + sourceHtml.join("\n") +
          ' </div>' +
          '</div>';
      },

      /**
       * The screen that shows the background verification status
       * @return {string}
       */
      BackgroundVerificationSuccess: function () {
        return '' +
          '<div class="background-verification success">' +
          ' <h2>You have been successfully verified</h2>' +
          ' <p>You have successfully passed electronic verification. You are now able to proceed.' +
          '</div>'
      },

      /**
       * Base HTML string
       * @return {string}
       */
      Base: function () {
          return '' +
            '<div class="id-matrix-verification">' +
            ' <div class="header"></div>' +
            ' <div class="body">' +
            '   {{ body }}' +
            ' </div>' +
            ' <div class="footer">' +
            '   <div class="errors"></div>' +
            ' </div>' +
            '</div>';
      },

      /**
       * HTML displayed on the consent screen.
       * @return {string}
       */
      ConsentScreen: function () {
        var id = _self.module.fieldId + '_consent';

        return '' +
          '<div class="consent-screen">' +
          ' <div class="text">{{ config.consentBody }}</div>' +
          ' <div class="perform-consent">' +
          '   <div class="check">' +
          '     <label for="' + id + '">' +
          '       <input type="checkbox" id="' + id + '" data-bind="confirmCheck"> ' +
          '       <span>I consent</span>' +
          '     </label>' +
          '   </div>' +
          '   <div class="confirm-button">' +
          '     <button class="fc-button" data-bind="confirmConsent">Confirm</button>' +
          '   </div>' +
          ' </div>' +
          '</div>';
      },

      /**
       * Show an error
       * @return {string}
       */
      Error: function () {
        return '' +
          '<div class="fc-error">' +
          ' {{ msg }}' +
          '</div>';
      }
    }
  };
}());
