/**
 * FormCorp Green ID integration.
 *
 * @author Alex Berriman <aberriman@formcorp.com.au>
 * @website www.formcorp.com.au
 */

/*global jQuery,fc*/

var fcGreenID = (function ($) {
  "use strict";

  // If formcorp not initialised, return empty
  if (!fc) {
    return {};
  }

  var sessions;

  var template = function(html, options) {
    var re = /<%([^%>]+)?%>/g, reExp = /(^( )?(if|for|else|switch|case|break|{|}))(.*)?/g, code = 'var r=[];\n', cursor = 0, match;
    var add = function(line, js) {
      js? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
      (code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
      return add;
    }

    while(match = re.exec(html)) {
      add(html.slice(cursor, match.index))(match[1], true);
      cursor = match.index + match[0].length;
    }

    add(html.substr(cursor, html.length - cursor));
    code += 'return r.join("");';

    return new Function(code.replace(/[\r\t\n]/g, '')).apply(options);
  };

  return {
    init: function () {
      console.log('greenid: init');
    },

    initGreenId: function () {
      console.log('greenid: initGreenId');
    },

    passesValidation: function () {
      console.log('greenid: passesValidation');
      return false;
    },

    initGreenIdDOMField: function () {
      console.log('greenid: init green id dom field');
    },

    session: function (fieldId) {
      if (typeof fcGreenID.sessions[fieldId] !== 'undefined') {
        return fcGreenID.sessions[fieldId];
      }

      // Fetch details about the field
      this.field = fc.getFieldDefinition(fieldId);
      this.config = this.field.config;

      // Render the greenID element
      this.render = function () {
        var html;

        html = template(
          '<div class="fc-green-id initialising">'
            + ' <div class="init">'
            + '   <div class="fc-green-init-css">'
            + '     <div></div>'
            + '   </div>'
            + '   <%this.text.init%>'
            + ' </div>'
            + '</div>',
          {
            text: {
              init: 'Starting up identity verification'
            }
          }
        );

        return html;
      }

      fcGreenID.sessions[fieldId] = this;
    },

    sessions: {},

    template: template
  };
}(jQuery));

(function ($) {
  'use strict';
  $(fc.jQueryContainer).trigger(fc.jsEvents.onGreenIdLoaded);
}(jQuery));
