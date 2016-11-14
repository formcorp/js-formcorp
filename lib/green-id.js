/**
 * FormCorp Green ID integration.
 *
 * @author Alex Berriman <aberriman@formcorp.com.au>
 * @website www.formcorp.com.au
 */

/*global jQuery,fc,_*/

var fcGreenID = (function ($) {
  "use strict";

  // If formcorp not initialised, return empty
  if (!fc) {
    return {};
  }

  var configKeys = {
    'address': 'greenIDAddress',
    'country': 'greenIDCountry',
    'dob': 'greenIDDOB',
    'email': 'greenIDEmail',
    'firstName': 'greenIDFirstName',
    'integrationId': 'greenIDIntegration',
    'middleName': 'greenIDMiddleName',
    'postcode': 'greenIDPostcode',
    'state': 'greenIDState',
    'suburb': 'greenIDSuburb',
    'title': 'greenIDTitle',
    'surname': 'greenIDSurname'
  };

  /**
   * Retrieve config values
   */
  var getConfigValues = function (field) {
    // Fetch result
    var searchFieldId;
    var value;
    var values = {};

    for (var key in configKeys) {
      if (configKeys.hasOwnProperty(key)) {
        searchFieldId = fc.getConfig(field, configKeys[key], '');
        if (searchFieldId.length > 0) {
          value = fc.getValue(searchFieldId);
          values[key] = fc.getValue(searchFieldId);
        }
      }
    }

    return values;
  };

  var sessions;

  /**
   * Render a template
   * @param html string
   * @param options object
   */
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
            FETCH_RESULT_INITIALISED: 'greenid/fetch/initialised',
            FETCH_RESULT_NOT_INITIALISED: 'greenid/fetch/not-initialised',
            READY_FOR_RENDER: 'greenid/render/ready'
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
      this.options = this.config.greenIDIntegration.config;

      // Previously initialised on fetch, update and render
      this.events.subscribe(this.events.const.FETCH_RESULT_INITIALISED, function (obj) {
        var value = fc.getValue(_self.fieldId);
        if (typeof value !== 'object') {
          // trigger error
          console.log('err');
          return;
        }

        fc.setVirtualValue(_self.fieldId, obj.result);
        _self.events.publish(_self.events.const.READY_FOR_RENDER);
      });

      // Hasn't been initialised, need to do so
      this.events.subscribe(this.events.const.FETCH_RESULT_NOT_INITIALISED, function (obj) {
        var values = getConfigValues(_self.field);
        values.fieldId = _self.fieldId;

        fc.api('greenid/gateway-v2/init', values, 'POST', function (obj) {
          fc.setVirtualValue(_self.fieldId, {
            values : values,
            result: obj
          });

          _self.events.publish(_self.events.const.READY_FOR_RENDER);
        });
      });

      // Ready to render
      this.events.subscribe(this.events.const.READY_FOR_RENDER, function (obj) {
        var sources = _.filter(_self.options.sources.active, function (o) {
          return o.primary === true;
        });

        var sourceHtml = '';
        _.each(sources, function (source) {
          sourceHtml += template(
            '<li class="fc-greenid-source" data-status="available" data-source="' + source.key + '">' +
            ' <div class="icon"></div>' +
            ' <label>' + source.label + '</label>' +
            '</li>'
          );
        });

        var html = template(
          '<div class="fc-green-id fc-ready">' +
          ' <div class="options">' +
          '   <ul>' + sourceHtml + '</ul>' +
          '   <div class="fc-clear"></div>' +
          ' </div>' +
          '</div>'
        );

        _self.render(html);
      });

      // Render the greenID element
      this.begin = function () {
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
        if (typeof _ === 'undefined') {
          // lodash not defined, return
          console.log('lodash not defined');
          return;
        }

        fc.api('greenid/gateway-v2/fetch', {fieldId: this.fieldId}, 'POST', function (obj) {
          if (typeof obj.data === 'object' && typeof obj.data.initialised === 'boolean') {
            if (obj.data.initialised) {
              _self.events.publish(_self.events.const.FETCH_RESULT_INITIALISED, obj.data);
            } else {
              _self.events.publish(_self.events.const.FETCH_RESULT_NOT_INITIALISED, obj.data);
            }
          }
        })
      };

      /**
       * Render an HTML template
       * @param html string
       */
      this.render = function (html) {
        var el = fc.domContainer.find('[fc-data-group="' + this.fieldId + '"]');
        if (el.length === 0) {
          console.log('container not found');
          return;
        }

        el.html(html);
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
