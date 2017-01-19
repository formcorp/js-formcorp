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

  formcorp.Renderer.IDMatrix.Default = function (module) {
    var _self = this;

    this.module = module;

    return {
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
        '       <input type="checkbox" id="' + id + '"> ' +
        '       <span>I consent</span>' +
        '     </label>' +
        '   </div>' +
        '   <div class="confirm-button">' +
        '     <button class="fc-button">Confirm</button>' +
        '   </div>' +
        ' </div>' +
        '</div>';
      }
    }
  };
}());
