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

    /**
     * Iniaitlise a new GreenID session
     * @param fieldId string
     */
    session: function (fieldId) {
      if (typeof fcGreenID.sessions[fieldId] !== 'undefined') {
        return fcGreenID.sessions[fieldId];
      }

      var _self = this;

      // Event binder
      this.events = (function() {
        var topics = {};
        var hOP = topics.hasOwnProperty;

        return {
          const: {
            FETCH_RESULT: 'greenid/fetch/result',
            INIT_RESULT: 'greenid/init/result'
          },
          subscribe: function(topic, listener) {
            // Create the topic's object if not yet created
            if(!hOP.call(topics, topic)) topics[topic] = [];

            // Add the listener to queue
            var index = topics[topic].push(listener) -1;

            // Provide handle back for removal of topic
            return {
              remove: function() {
                delete topics[topic][index];
              }
            };
          },
          publish: function(topic, info) {
            // If the topic doesn't exist, or there's no listeners in queue, just leave
            if(!hOP.call(topics, topic)) return;

            // Cycle through topics queue, fire!
            topics[topic].forEach(function(item) {
                item(info != undefined ? info : {});
            });
          }
        };
      })();

      // Fetch details about the field
      this.fieldId = fieldId;
      this.field = fc.getFieldDefinition(fieldId);
      this.config = this.field.config;

      this.events.subscribe(this.events.const.FETCH_RESULT, function (obj) {
        // Fetch result
        console.log('if previously initialised, update and render');
        console.log(obj);
      });

      this.events.subscribe(this.events.const.FETCH_RESULT, function (obj) {
        // Fetch result
        console.log('if not initialised, do so and render');
        console.log(obj);
      });

      // Render the greenID element
      this.render = function () {
        var html = template(
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

      // Initialise the greenID session
      this.init = function () {
        fc.api('greenid/gateway-v2/fetch', {fieldId: this.fieldId}, 'POST', function (obj) {
          if (typeof obj.data === 'object' && typeof obj.data.initialised === 'boolean') {
            _self.events.publish(_self.events.const.FETCH_RESULT, obj.data);
          }

        })
      };

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
