/**
 * FormCorp Green ID integration.
 *
 * @author Alex Berriman <aberriman@formcorp.com.au>
 * @website www.formcorp.com.au
 */

/*global jQuery,fc,_*/

// Constants
var GREENID = {
  USER_ID: 'result.return.verificationResult.userId',
  STATE: {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
  }
};

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

  /**
   * Check to see if a source has passed
   * @param source object
   */
  var passedSource = function (source) {
    if (source.passed === true) {
      return true;
    }

    if (['IN_PROGRESS'].indexOf(source.state) >= 0) {
      return true;
    }

    return false;
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
            DISPLAY_CHILD_SOURCE: 'greenid/options/display-child',
            DISPLAY_SOURCE: 'greenid/options/display-source',
            FATAL_ERROR: 'greenid/errors/fatal',
            FETCH_RESULT_INITIALISED: 'greenid/fetch/initialised',
            FETCH_RESULT_NOT_INITIALISED: 'greenid/fetch/not-initialised',
            OPTION_CLICKED: 'greenid/options/clicked',
            READY_FOR_RENDER: 'greenid/render/ready',
            RENDER_PENDING: 'greenid/render/main',
            RENDER_VERIFIED: 'greenid/render/verified',
            SOURCE_SUBMIT: 'greenid/source/submit',
            SOURCE_VERIFIED: 'greenid/source/verified',
            VERIFICATION_DO: 'greenid/verification/do',
            VERIFICATION_ERROR: 'greenid/verification/error',
            VERIFICATION_SUCCESS: 'greenid/verification/success'
          },
          subscribe: function(topic, listener) {
            // Create the topic's object if not yet created
            if(!hOP.call(topics, topic)) topics[topic] = [];

            // Add the listener to queuesource-submit
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

      // Retrieve the user IDsource-submit
      this.userId = function () {
        var value = fc.getValue(_self.fieldId);
        if (typeof value === 'object' && typeof value.result === 'object') {
          return value.result.return.verificationResult.userId;
        }

        return null;
      };

      // Previously initialised on fetch, update and render
      this.events.subscribe(this.events.const.FETCH_RESULT_INITIALISED, function (obj) {
        var value = fc.getValue(_self.fieldId);
        if (typeof value !== 'object') {
          // trigger error
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
        var status = _self.getApplicationStatus();
        //status = GREENID.STATE.REJECTED;
        switch (status) {
          case GREENID.STATE.VERIFIED:
            _self.events.publish(_self.events.const.RENDER_VERIFIED, obj);
            break;
          case GREENID.STATE.REJECTED:
            _self.events.publish(_self.events.const.FATAL_ERROR, {
              msg: "We're sorry, but we could not verify your identity."
            });
            break;
          case GREENID.STATE.PENDING:
            _self.events.publish(_self.events.const.RENDER_PENDING, obj);
            break;
        }
      });

      // Render the main verification screen
      this.events.subscribe(this.events.const.RENDER_PENDING, function (obj) {
        var sources = _.filter(_self.options.sources.active, function (o) {
          return o.primary === true;
        });

        var sourceHtml = '';
        _.each(sources, function (source) {
          var name = source.source;

          sourceHtml += template(
            '<li class="fc-greenid-source" data-status="<%this.status%>" data-source="' + source.key + '">' +
            ' <div class="icon"><div></div></div>' +
            ' <label>' + source.label + '</label>' +
            '</li>'
          , {
            status: _self.getSourceStatus(source)
          });
        });

        var html = template(
          '<div class="fc-green-id fc-ready">' +
          ' <div class="options primary">' +
          '   <ul>' + sourceHtml + '</ul>' +
          '   <div class="fc-clear"></div>' +
          ' </div>' +
          '</div>'
        );

        _self.render(html);

        if (typeof _self.setupEventListeners !== 'boolean' || !_self.setupEventListeners) {
          // Configure the event listeners
          var el = fc.domContainer.find('[fc-data-group="' + _self.fieldId + '"]');

          // Click an option
          el.on('click', '.options li', function () {
            var obj = $(this);
            var dataSource = obj.attr('data-source');
            var state = obj.attr('data-status');

            if (state === 'available') {
              // If the source is available, register the option as having been clicked
              _self.events.publish(_self.events.const.OPTION_CLICKED, {
                source: dataSource
              });
            }
          });

          // Close screen
          el.on('click', '.fc-green-id .close', function () {
            _self.events.publish(_self.events.const.READY_FOR_RENDER);

            return false;
          });

          // Verify a source
          el.on('click', '.fc-green-id .source-submit .submit', function () {
            var obj = $(this);
            var dataSource = obj.attr('data-source');
            var source = _.find(_self.options.sources.active, function (o) {
              return o.key == dataSource;
            });

            _self.events.publish(_self.events.const.SOURCE_SUBMIT, source);
          });

          _self.setupEventListeners = true;
        }
      });

      // Render the verified screen
      this.events.subscribe(this.events.const.RENDER_VERIFIED, function (obj) {
        var sources = _.filter(_self.options.sources.active, function (o) {
          return o.primary === true;
        });

        var sourceHtml = '';
        _.each(sources, function (source) {
          var status = _self.getSourceStatus(source);
          if (status !== 'verified') {
            return;
          }
          var name = source.source;

          sourceHtml += template(
            '<li class="fc-greenid-source" data-status="<%this.status%>" data-source="' + source.key + '">' +
            ' <div class="icon"><div></div></div>' +
            ' <label>' + source.label + '</label>' +
            '</li>'
          , {
            status: status
          });
        });

        var html = template(
          '<div class="fc-green-id fc-ready">' +
          ' <div class="options primary">' +
          '   <ul>' + sourceHtml + '</ul>' +
          '   <div class="fc-clear"></div>' +
          ' </div>' +
          ' <div class="status-bar"></div>' +
          '</div>'
        );

        _self.render(html);
        _self.events.publish(
          _self.events.const.VERIFICATION_SUCCESS,
          {
            msg: 'Your identify has successfully been verified.'
          }
        );
      });

      // Locked out
      this.events.subscribe(this.events.const.FATAL_ERROR, function (obj) {
        var html = template(
          '<div class="fc-green-id fatal-error">' +
          ' <div><%this.msg%></div>' +
          '</div>'
        , { msg: obj.msg });

        _self.render(html);
      });

      // Option is clicked
      this.events.subscribe(this.events.const.OPTION_CLICKED, function (obj) {
        var source = _.find(_self.options.sources.active, function (o) {
          return o.key == obj.source;
        });

        if (source.source === false) {
          // Display child source
          _self.events.publish(_self.events.const.DISPLAY_CHILD_SOURCE, source);
          return;
        }

        // Display primary source
        _self.events.publish(_self.events.const.DISPLAY_SOURCE, source);
      });

      // Request source details
      this.events.subscribe(this.events.const.DISPLAY_SOURCE, function (obj) {
        _self.render(_self.loading('Retrieving source details'));

        var data = {
          fieldId: _self.fieldId,
          sourceId: obj.source,
          verificationUserId: _self.userId()
        };
        var source = obj;

        fc.api('greenid/gateway-v2/get-fields', data, 'POST', function (obj) {
          var raw = obj.return.sourceFields.rawData;
          var html = raw.replace(/<[\/]{0,1}sourcefields>/g, '', raw); // Strip <sourcefields>
          html = html.replace(/<\?xml[^\/]+\?>/g, '', html);

          var htmlTemplate = template(
            '<div class="fc-green-id">' +
            ' <div class="options">' +
            '   <div class="child-container with-submit">' +
            '     <div class="close"></div>' +
            '     <div class="source">' +
            '       <h3>' + source.label + '</h3>' +
            '       <div class="fields">' + html + '</div>' +
            '     </div>' +
            '   </div>' +
            '   <div class="status-bar"></div>' +
            '   <div class="source-submit">' +
            '     <div class="submit" data-source="' + source.key + '"><%this.lang.submit%></div>' +
            '     <div class="verifying">' +
            '       <div class="container fc-green-init-css">' +
            '         <span class="spinner"></span>' +
            '         <span><%this.lang.verifying%></span>' +
            '       </div>' +
            '     </div>' +
            '   </div>' +
            ' </div>' +
            '</div>'
          , {
            lang: {
              submit: 'Verify',
              verifying: 'Verifying'
            }
          });

          _self.render(htmlTemplate);
        });
      });

      // Display child sources
      this.events.subscribe(this.events.const.DISPLAY_CHILD_SOURCE, function (source) {
        var sources = _.filter(_self.options.sources.active, function (o) {
          return o.belongsTo === source.key;
        });

        var sourceHtml = '';
        _.each(sources, function (source) {
          sourceHtml += template(
            '<li class="fc-child-source" data-source="' + source.key + '" data-status="<%this.status%>">' +
            ' <label>' + source.label + '</label>' +
            '</li>'
          , {
            status: _self.getSourceStatus(source)
          });
        });

        var html = template(
          '<div class="fc-green-id">' +
          '  <div class="child-sources options secondary">' +
          '   <div class="child-container">' +
          '     <div class="close"></div>' +
          '     <div class="header">' +
          '       <h3>' + source.label + '</h3>' +
          '       <h5>' + source.desc + '</h5>' +
          '     </div>' +
          '     <div class="child-options">' +
          '       <ul>' + sourceHtml + '</ul>' +
          '       <div class="fc-clear"></div>' +
          '     </div>' +
          '    </div>' +
          '  </div>' +
          '</div>'
        );

        _self.render(html);
      });

      // Submit a source
      this.events.subscribe(this.events.const.SOURCE_SUBMIT, function (source) {
        var el = fc.domContainer.find('[fc-data-group="' + _self.fieldId + '"]');
        var requiredFields = el.find('.required');
        var errors = 0;

        if (requiredFields.length > 0) {
          requiredFields.each(function () {
            var obj = $(this);
            var parent = obj.parent();
            var value = fc.getFieldValue(obj);

            if (obj.is('input[type="checkbox"]') && obj.is(':checked')) {
              value = 'on';
            }

            if (!_.isString(value) || value.length === 0) {
              parent.addClass('fc-error');
              ++errors;
            } else {
              parent.removeClass('fc-error');
            }
          });
        }

        if (errors) {
          // Form errors were detected, publish
          _self.events.publish(_self.events.const.VERIFICATION_ERROR, {
            error: 'Please ensure all required form fields are correctly filled out prior to verification.'
          });
        } else {
          _self.events.publish(_self.events.const.VERIFICATION_NO_ERROR);
          _self.events.publish(_self.events.const.VERIFICATION_DO, source);
        }
      });

      // Show a verification error
      this.events.subscribe(this.events.const.VERIFICATION_ERROR, function (obj) {
        var el = fc.domContainer.find('[fc-data-group="' + _self.fieldId + '"]');
        var statusBar = el.find('.status-bar');
        var html = template(
          '<div class="error">' +
          ' <span><%this.text.error%>' +
          '</div>'
        , {
          text: {
            error: obj.error
          }
        });

        statusBar.html(html);
      });

      // Show a verification success
      this.events.subscribe(this.events.const.VERIFICATION_SUCCESS, function (obj) {
        var el = fc.domContainer.find('[fc-data-group="' + _self.fieldId + '"]');
        var statusBar = el.find('.status-bar');
        var html = template(
          '<div class="success">' +
          ' <span><%this.text.message%>' +
          '</div>'
        , {
          text: {
            message: obj.msg
          }
        });

        statusBar.html(html);
      });

      // No verification error
      this.events.subscribe(this.events.const.VERIFICATION_NO_ERROR, function (obj) {
        var el = fc.domContainer.find('[fc-data-group="' + _self.fieldId + '"]');
        var statusBar = el.find('.status-bar');

        statusBar.html('');
      });

      // Perform the verification
      this.events.subscribe(this.events.const.VERIFICATION_DO, function (source) {
        var el = fc.domContainer.find('[fc-data-group="' + _self.fieldId + '"]');
        var submitGroup = el.find('.source-submit');
        var values = {};

        submitGroup.addClass('verifying');

        // Create the data dictionary of values
        el.find('input,select').each(function () {
          var obj = $(this);
          var name = obj.attr('name');
          var value = fc.getFieldValue(obj);

          if (obj.is('input[type="checkbox"]') && obj.is(':checked')) {
            value = 'on';
          }

          if (typeof value === 'undefined') {
            value = '';
          }

          if (typeof name === 'string' && name.length > 0) {
            values[name] = value;
          }
        });

        var data = {
          fieldId: _self.fieldId,
          verificationUserId: _self.userId(),
          data: values
        };

        fc.api('greenid/gateway-v2/verify?source=' + source.source, data, 'POST', function (result) {
          if (result.success === false && typeof result.message === 'string' && result.message.length > 0) {
            // Verification error, output
            _self.events.publish(_self.events.const.VERIFICATION_ERROR, {
              error: result.message
            });
            submitGroup.removeClass('verifying');

            return;
          }

          if (result.success === true) {
            _self.events.publish(_self.events.const.SOURCE_VERIFIED, source);
          }
        });
      });

      // Source has been verified
      this.events.subscribe(this.events.const.SOURCE_VERIFIED, function (source) {
        // When a source has been verified, reinitialise greenID
        _self.init();
      });

      /**
       * This will iterate through the user's sources as reported by greenID
       * The sources will be returned in a kv format.
       */
      this.getUserVerificationSources = function () {
        var value = fc.getValue(_self.fieldId);
        var stored = value.result.return.sourceList.sources;
        var sources = {};
        var source;

        for (var i = 0, s = stored.length; i < s; i++) {
          source = stored[i];
          sources[source.name] = source;
        }

        return sources;
      };

      /**
       * Retrieve the source status.
       * @param source {object}
       * @return {string}
       */
      this.getSourceStatus = function (source) {
        var status = 'available';
        if (_self.sourceIsVerified(source)) {
          status = 'verified';
        }

        return status;
      };

      /**
       * Retrieve the application status
       * @return string
       */
      this.getApplicationStatus = function () {
        var value = fc.getValue(_self.fieldId);
        var applicationState = value.result.return.verificationResult.outcome;
        var state = GREENID.STATE.PENDING;

        switch (applicationState) {
          case 'VERIFIED':
          case 'VERIFIED_ADMIN':
          case 'VERIFIED_WITH_CHANGES':
          case 'PENDING':
            return GREENID.STATE.VERIFIED;
          case 'LOCKED_OUT':
            return GREENID.STATE.REJECTED;
          case 'IN_PROGRESS':
          default:
            return GREENID.STATE.PENDING;
        }
      }

      /**
       * Checks to see if a top level source is verified.
       * If top level source is a category (i.e. drivers license with a range of child sources)
       * will check to see if the child source is verified.

       * @param source {object}
       * @return {boolean}
       */
      this.sourceIsVerified = function (source) {
        var sources = _self.getUserVerificationSources();
        if (source.source === false) {
          // Source is a category, not an actual source, need to iterate through all
          var verifiedChild = _.find(_self.options.sources.active, function (o) {
            return typeof o.source === 'string' && o.belongsTo === source.key && passedSource(sources[o.source]);
          });

          return typeof verifiedChild === 'object';
        }

        return passedSource(sources[source.source]);
      };

      // Loading HTML
      this.loading = function (text) {
        return template(
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
              init: text
            }
          }
        );
      };

      // Render the greenID element
      this.begin = function () {
        return _self.loading('Starting up identity verification');
      };

      // Initialise the greenID session
      this.init = function () {
        if (typeof _ === 'undefined') {
          // lodash not defined, return
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
