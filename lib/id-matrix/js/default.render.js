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

    return {
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
