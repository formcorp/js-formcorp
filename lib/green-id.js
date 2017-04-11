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
  var getConfigValues = function (field, fieldId) {
    // Fetch result
    var searchFieldId;
    var value;
    var values = {};

    var lookupValue = function (id) {
      if (fieldId.indexOf(fc.constants.prefixSeparator) >= 0) {
        // The greenID session is in a grouplet, need to perform additional look ups to retrieve the source value
        var iterator = fieldId.split(fc.constants.prefixSeparator)[0];
        var schema = fc.fieldSchema[iterator];
        var source = schema.config.sourceField;

        // Check to see if its part of an iteration, in which case need to look in that specific iteration
        var components = fieldId.split(fc.constants.prefixSeparator);
        if (components.length > 2) {
          source += '.' + components[1] + '.';
        }

        // Append the id
        source += id;

        var value = source.split('.').reduce(
          function(o, x) {
            return typeof o !== 'undefined' ? o[x] : undefined;
          },
          fc.fields
        );

        if (typeof value !== 'undefined') {
          return value;
        }
      }

      return fc.getValue(id);
    };

    for (var key in configKeys) {
      if (configKeys.hasOwnProperty(key)) {
        searchFieldId = fc.getConfig(field, configKeys[key], '');
        if (searchFieldId.length > 0) {
          values[key] = lookupValue(searchFieldId);
        }
      }
    }

    return values;
  };

  /**
   * @param str {string}
   * @return {string}
   */
  var hash = function (str) {
    return '' + str.split("").reduce(function(a, b){
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a
    }, 0);
  };

  /**
   * Check to see if a source has passed
   * @param source object
   */
  var passedSource = function (source) {
    if (source.passed === true) {
      return true;
    }

    if (['VERIFIED', 'VERIFIED_ADMIN', 'VERIFIED_WITH_CHANGES', 'PASSED', 'PENDING'].indexOf(source.state) >= 0) {
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
      fc.loadMaterialDatepicker();
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
      var field = fc.getFieldDefinition(fieldId);
      var values = getConfigValues(field, fieldId);
      var userHash = hash(JSON.stringify(values));

      if (typeof fcGreenID.sessions[userHash] !== 'undefined') {
        return fcGreenID.sessions[userHash];
      }

      var _self = this;

      // Add the initial field ID
      this.fieldIds = [fieldId];

      // Event binder
      this.events = (function() {
        var topics = {};
        var hOP = topics.hasOwnProperty;

        return {
          const: {
            DISPLAY_CHILD_SOURCE: 'greenid/options/display-child',
            DISPLAY_SOURCE: 'greenid/options/display-source',
            DISPLAY_SUCCESS: 'greenid/messages/success',
            EXTRA_FAILED: 'greenid/extra/fail',
            FATAL_ERROR: 'greenid/errors/fatal',
            FETCH_RESULT_INITIALISED: 'greenid/fetch/initialised',
            FETCH_RESULT_NOT_INITIALISED: 'greenid/fetch/not-initialised',
            GET_EXTRA_DATA: 'greenid/extra/get',
            OPTION_CLICKED: 'greenid/options/clicked',
            READY_FOR_RENDER: 'greenid/render/ready',
            RENDER_PENDING: 'greenid/render/main',
            RENDER_VERIFIED: 'greenid/render/verified',
            SHOW_EXTRA_DATA_SOURCE: 'greenid/extra/show',
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
      this.extraData = {};

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

        if (typeof obj === 'object' && typeof obj.result === 'object') {
          // If an object was passed through, update
          fc.setVirtualValue(_self.fieldId, obj.result);
        }

        _self.events.publish(_self.events.const.READY_FOR_RENDER);
      });

      // Hasn't been initialised, need to do so
      this.events.subscribe(this.events.const.FETCH_RESULT_NOT_INITIALISED, function (obj) {
        var values = getConfigValues(_self.field, _self.fieldId);
        values.fieldId = _self.fieldId;

        if (Object.keys(_self.extraData).length > 0) {
          values.extra = _self.extraData;
        }

        fc.api('greenid/gateway-v2/init', values, 'POST', function (obj) {
          fc.setVirtualValue(_self.fieldId, {
            values : values,
            result: obj
          });

          if (Object.keys(_self.extraData).length > 0) {
            var source = _.find(_self.options.sources.extraData, function (o) {
              return o.key == _self.extraData.source;
            });

            if (typeof source === 'undefined' || !_.isObject(source.onFail)) {
              _self.events.publish(_self.events.const.READY_FOR_RENDER);
              return;
            }

            // Check to see if the source failed
            var target = _.find(obj.return.verificationResult.individualResults, function (o) {
              return o.name == source.source;
            });

            if (typeof target === 'undefined') {
              _self.events.publish(_self.events.const.READY_FOR_RENDER);
              return;
            }

            if (!passedSource(target)) {
              _self.events.publish(_self.events.const.EXTRA_FAILED, source);
              return;
            }

            // Source passed, render
            _self.events.publish(_self.events.const.READY_FOR_RENDER);
          } else {
            _self.events.publish(_self.events.const.READY_FOR_RENDER);
          }
        });
      });

      // Extra validation failed
      this.events.subscribe(this.events.const.EXTRA_FAILED, function (obj) {
        var html = template(
          '<div class="fc-green-id extra-data-source">' +
          ' <div class="options">' +
          '   <div class="child-container with-submit">' +
          '     <div class="pre-verification">' +
          '       <h4><%this.title%></h4>' +
          '       <div class="desc"><%this.desc%></div>' +
          '     </div>' +
          '   </div>' +
          '   <div class="status-bar"></div>' +
          '   <div class="source-submit">' +
          '     <div class="links">' +
          '       <a href="#"data-for="<%this.source%>" data-continue="true" class="btn"><%this.text%></a>' +
          '     </div>' +
          '   </div>' +
          ' </div>' +
          '</div>'
        , {
          title: fc.tokenise(obj.onFail.label),
          desc: fc.tokenise(obj.onFail.msg || ''),
          text: 'Continue'
        });

        _self.render(html);
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
          if (typeof source.source === 'string' && !_self.userHasSource(name)) {
            // If the source isn't available to the user, don't output it
            return;
          }

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
          '<div class="fc-green-id-summary"><%this.summary%></div>' +
          '<div class="fc-green-id fc-ready">' +
          ' <div class="options primary">' +
          '   <ul>' + sourceHtml + '</ul>' +
          '   <div class="fc-clear"></div>' +
          ' </div>' +
          ' <%this.error%>' +
          '</div>'
        , {
          error: typeof obj.error === 'string' ? '  <div class="verification-error">' + obj.error + '</div>' : '',
          summary: _self.greenIdSummary()
        });

        _self.render(html);
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
            '<div class="fc-green-id-summary"><%this.summary%></div>' +
            '<div class="fc-green-id">' +
            ' <div class="options">' +
            '   <div class="child-container with-submit">' +
            '     <div class="close"></div>' +
            '     <div class="source">' +
            '       <h3>' + source.label + '</h3>' +
            '       <div class="fields">' + html + '</div>' +
            '     </div>' +
            '   </div>' +
            '   <div class="source-submit">' +
            '     <div class="submit" data-source="' + source.key + '"><%this.lang.submit%></div>' +
            '     <div class="verifying">' +
            '       <div class="container fc-green-init-css">' +
            '         <span class="spinner"></span>' +
            '         <span><%this.lang.verifying%></span>' +
            '       </div>' +
            '     </div>' +
            '   </div>' +
            '   <div class="status-bar"></div>' +
            ' </div>' +
            '</div>'
          , {
            lang: {
              submit: 'Verify',
              verifying: 'Verifying'
            },
            summary: _self.greenIdSummary()
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
          if (typeof source.source === 'string') {
            if (!_self.userHasSource(source.source) || _self.sourceIsLocked(source)) {
              // If the source isn't available to the user, don't render it
              return;
            }
          }

          sourceHtml += template(
            '<li class="fc-child-source" data-source="' + source.key + '" data-status="<%this.status%>">' +
            ' <label>' + source.label + '</label>' +
            '</li>'
          , {
            status: _self.getSourceStatus(source)
          });
        });

        var html = template(
          '<div class="fc-green-id-summary"><%this.summary%></div>' +
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
          '</div>',
          {
            summary: _self.greenIdSummary()
          }
        );

        _self.render(html);
      });

      // Submit a source
      this.events.subscribe(this.events.const.SOURCE_SUBMIT, function (source) {
        // Multiple greenID invocations can take place on the same page.
        // Need to ensure that only required field elements from the DOM elements
        // the user is interacting with is used.
        var el = source.dom;

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
        var el = _self.getDomElements();
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
        var el = _self.getDomElements();
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
        var el = _self.getDomElements();
        var statusBar = el.find('.status-bar');

        statusBar.html('');
      });

      // Perform the verification
      this.events.subscribe(this.events.const.VERIFICATION_DO, function (source) {
        var el = source.dom;
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
            // If the user has been locked out of the source, need to render the locked out error
            if (result.message.indexOf('locked out of') >= 0) {
              _self.updateRemotely(function (data) {
                submitGroup.removeClass('verifying');

                switch (_self.getApplicationStatus()) {
                  case GREENID.STATE.REJECTED:
                    // User's application has been locked, need to display a fatal error
                    _self.events.publish(_self.events.const.FATAL_ERROR, {
                      msg: "We're sorry, but we could not verify your identity."
                    });
                    return;
                }

                _self.events.publish(_self.events.const.RENDER_PENDING, {
                  error: 'You\'ve been locked out of the selected data source due to too many failed attempts. Please select a different method.'
                });
              });

              return;
            }

            submitGroup.removeClass('verifying');

            // Display a normal verification error
            _self.events.publish(_self.events.const.VERIFICATION_ERROR, {
              error: result.message
            });

            return;
          }

          if (result.success === true) {
            var status = result.response.return.checkResult;

            if (passedSource(status)) {
              // The source verified
              _self.events.publish(_self.events.const.SOURCE_VERIFIED, source);
            } else {
              // Source did not verify
              submitGroup.removeClass('verifying');
              _self.events.publish(_self.events.const.VERIFICATION_ERROR, {
                error: 'We\'re sorry, but electronic identification failed, please try again'
              });
            }

            return;
          }

          // If this point has been reached, an unexpected error occured
          submitGroup.removeClass('verifying');
          _self.events.publish(_self.events.const.VERIFICATION_ERROR, {
            error: 'An unexpected error occurred when verifying the data source.'
          });
        });
      });

      // Source has been verified
      this.events.subscribe(this.events.const.SOURCE_VERIFIED, function (source) {
        // When a source has been verified, reinitialise greenID
        fc.api('greenid/gateway-v2/fetch', {fieldId: _self.fieldId}, 'POST', function (obj) {
          if (typeof obj.data === 'object') {
            if (obj.data.initialised) {
              fc.setVirtualValue(_self.fieldId, obj.data.result);
            }

            if (_self.getApplicationStatus() === GREENID.STATE.VERIFIED) {
              // Render the master success page
              _self.events.publish(_self.events.const.DISPLAY_SUCCESS, {
                msg: 'Your identity has successfully been verified.'
              });
            } else {
              _self.init(false);
            }
          }
        });
      });

      // Display success message
      this.events.subscribe(this.events.const.DISPLAY_SUCCESS, function (obj) {
        var html = template(
          '<div class="fc-green-id large-success">' +
          ' <div class="close"></div>' +
          ' <div><%this.msg%></div>' +
          '</div>'
        , { msg: obj.msg });

        _self.render(html);
      });

      // Retrieve extra data
      this.events.subscribe(this.events.const.GET_EXTRA_DATA, function (obj) {
        // In the future, this will have to be handled differently as more extraData sources may be required
        var source = _self.options.sources.extraData[0];

        _self.events.publish(_self.events.const.SHOW_EXTRA_DATA_SOURCE, source);
      });

      // Show an extra data source
      this.events.subscribe(this.events.const.SHOW_EXTRA_DATA_SOURCE, function (obj) {
        // Grab the buttons
        var btnHtml = '';
        _.each(obj.preAgree.buttons, function (b) {
          btnHtml += template(
            '<a href="#" data-method="<%this.method%>" data-for="<%this.source%>" class="btn"><%this.text%></a>',
            {
              method: b.method,
              text: b.text,
              source: obj.key,
            }
          );
        });

        var html = template(
          '<div class="fc-green-id extra-data-source">' +
          ' <div class="options">' +
          '   <div class="child-container with-submit">' +
          '     <div class="pre-verification">' +
          '       <h4><%this.title%></h4>' +
          '       <div class="desc"><%this.desc%></div>' +
          '     </div>' +
          '   </div>' +
          '   <div class="status-bar"></div>' +
          '   <div class="source-submit">' +
          '     <div class="links"><%this.buttons%></div>' +
          '   </div>' +
          ' </div>' +
          '</div>'
        , {
          title: fc.tokenise(obj.preAgree.label),
          desc: fc.tokenise(obj.preAgree.msg || ''),
          buttons: btnHtml,
          source: obj.key
        });

        _self.render(html);
      });

      /**
       * Update the schema from the remote data source and trigger an event on complete.
       * @param callback {string,function}
       * @param setLocal {boolean}
       */
      this.updateRemotely = function (callback, setLocal) {
        if (typeof setLocal !== 'boolean') {
          setLocal = true;
        }

        fc.api('greenid/gateway-v2/fetch', {fieldId: _self.fieldId}, 'POST', function (obj) {
          if (typeof obj.data === 'object') {
            if (setLocal && obj.data.initialised) {
              fc.setVirtualValue(_self.fieldId, obj.data.result);
            }

            if (typeof callback === 'function') {
              callback(obj.data);
            } else if (typeof callback === 'string') {
              _self.events.publish(event, obj.data);
            }
          }
        });
      };

      /**
       * Return ruleset configuration matrices
       * @returns {obj}
       */
      this.getRuleSets = function () {
        return {
            A: {
              total: 3,
              address: 2,
              dob: 1,
              name: 1,
              govt: 0
            },
            B: {
              total: 3,
              address: 1,
              dob: 1,
              name: 0,
              govt: 0
            },
            C: {
              total: 3,
              address: 1,
              dob: 1,
              name: 1,
              govt: 1
            },
            D: {
              total: 2,
              address: 0,
              dob: 0,
              name: 1,
              govt: 1
            },
            E: {
              total: 2,
              address: 1,
              dob: 1,
              name: 1,
              govt: 0
            },
            F: {
              total: 2,
              address: 1,
              dob: 1,
              name: 1,
              govt: 1
            },
            G: {
              total: 1,
              address: 0,
              dob: 0,
              name: 0,
              govt: 0
            },
            H: {
              total: 2,
              address: 0,
              dob: 0,
              name: 0,
              govt: 1
            }
        };
      };

      /**
       * Returns the weighting of each source.
       * @returns {obj}
       */
      this.getSourceRuleSetWeightings = function () {
        return {
          actrego: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          actregodvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          aec: {
            total: 1,
            address: 1,
            dob: 0,
            name: 1,
            govt: 0
          },
          birthcertificatedvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          changeofnamecertificatedvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          citizenshipcertificatedvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          dnb: {
            total: 1,
            address: 1,
            dob: 1,
            name: 1,
            govt: 0
          },
          immicarddvs: {
            total: 1,
            address: 0,
            dob: 0,
            name: 1,
            govt: 1
          },
          marriagecertificatedvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          medibank: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 0
          },
          medicaredvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          nswrego: {
            total: 1,
            address: 0,
            dob: 0,
            name: 0,
            govt: 1
          },
          nswregodvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          ntregodvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          passport: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          passportdvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          qldrego: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          qldregodvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          sarego: {
            total: 1,
            address: 0,
            dob: 1,
            name: 0,
            govt: 1
          },
          saregodvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          tasregodvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          vicec: {
            total: 1,
            address: 1,
            dob: 1,
            name: 1,
            govt: 0
          },
          vicrego: {
            total: 1,
            address: 1,
            dob: 1,
            name: 0,
            govt: 1
          },
          vicregodvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          visa: {
            total: 1,
            address: 0,
            dob: 1,
            name: 0,
            govt: 1
          },
          visadvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          waec: {
            total: 1,
            address: 1,
            dob: 1,
            name: 1,
            govt: 0
          },
          warego: {
            total: 1,
            address: 0,
            dob: 1,
            name: 0,
            govt: 1
          },
          waregodvs: {
            total: 1,
            address: 0,
            dob: 1,
            name: 1,
            govt: 1
          },
          wp: {
            total: 1,
            address: 1,
            dob: 0,
            name: 0,
            govt: 0
          }
        };
      };

      /**
       * Fetches the amount of outstanding items
       * @returns {object}
       */
      this.getRuleSetOutstandingMatrix = function() {
        // Fetch details on the ruleset
        var rulesets = this.getRuleSets();
        var matrix = rulesets[this.options.ruleset];
        var weightings = this.getSourceRuleSetWeightings();

        // Retrieve the passed sources
        console.log(this.getUserVerificationSources());
        var passed = _.filter(this.getUserVerificationSources(), function (o) {
          return typeof o.passed === 'boolean' && o.passed;
        });

        if (typeof matrix !== 'object') {
          return;
        }

        // Iterate through and update the matrix
        var source;
        for (var i = 0, l = passed.length; i < l; i++) {
          source = passed[i];
          if (typeof weightings[source.name] !== 'object') {
            continue;
          }

          for (var key in weightings[source.name]) {
            if (weightings[source.name].hasOwnProperty(key) && weightings[source.name][key] > 0 && typeof matrix[key] === 'number' && matrix[key] > 0) {
              --matrix[key];
            }
          }
        }

        return matrix;
      };

      /**
       * Show the GreenID summary
       */
      this.greenIdSummary = function () {
        // Retrieve the total items
        var rulesets = this.getRuleSets();
        var matrix = rulesets[this.options.ruleset];
        var sourcesRequired = _.max(_.values(matrix));

        // Retrieve the outstanding items
        var outstandingItems = this.getRuleSetOutstandingMatrix();
        var flat = _.values(outstandingItems);
        var sourcesLeft = _.max(flat);

        // Sources bonus
        var bonus = '';
        if (sourcesLeft === 1) {
          bonus = template(
            '<div class="sources-bonus">' +
            ' <h6>Only 1 source to go!</h6>' +
            ' <p>Complete any source below and you\'ll be done.' +
            '</div>'
          );
        }

        // Render out the template
        var html = template(
          '<div class="summary">' +
          ' <span class="sources-left"><%this.sourcesLeft%></span>/<span class="sources-required"><%this.sourcesRequired%></span> Sources Verified' +
          ' ' + bonus +
          '</div>'
        , {
          bonus: bonus,
          sourcesLeft: sourcesRequired - sourcesLeft,
          sourcesRequired: sourcesRequired
        });

        return html;
      };

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
        } else if (_self.sourceIsLocked(source)) {
          status = 'locked-out';
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
       * Checks if a source is available to a user (an improper config file may be uploaded which
       * could make various sources available even though they shouldn't be).
       * @param source {string}
       * @return {boolean}
       */
      this.userHasSource = function (source) {
        var sources = _self.getUserVerificationSources();

        return sources.hasOwnProperty(source);
      };

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
            return typeof o.source === 'string' && o.belongsTo === source.key && _self.userHasSource(o.source) && passedSource(sources[o.source]);
          });

          return typeof verifiedChild === 'object';
        }

        return _self.userHasSource(source.source) && passedSource(sources[source.source]);
      };

      /**
       * Checks to see if a source has been locked.
       * @param source {string}
       * @return {boolean}
       */
      this.sourceIsLocked = function (source) {
        var sources = _self.getUserVerificationSources();

        if (!_self.userHasSource(source.source)) {
          return false;
        }

        var sourceObj = sources[source.source];

        return sourceObj.state === 'LOCKED_OUT';
      };

      /**
       * Returns whether or not the configuration needs to retrieve extra data
       * @return {boolean}
       */
      this.hasExtraData = function () {
        return _.isObject(this.options) && _.isObject(this.options.sources) && _.isArray(this.options.sources.extraData) && this.options.sources.extraData.length > 0;
      };

      // Loading HTML
      this.loading = function (text) {
        return template(
          '<div class="fc-green-id-summary"><%this.summary%></div>' +
          '<div class="fc-green-id initialising">'
            + ' <div class="init">'
            + '   <div class="fc-green-init-css">'
            + '     <div></div>'
            + '   </div>'
            + '   <%this.text.init%>'
            + ' </div>'
            + '</div>',
          {
            summary: _self.greenIdSummary(),
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

      // Configure the event listeners
      this.configureEventListeners = function () {
        // Configure the event listeners
        var el = _self.getDomElements();

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
          source.dom = obj.parent().parent();

          _self.events.publish(_self.events.const.SOURCE_SUBMIT, source);
        });

        // Extra source - agree/disagree
        el.on('click', '.fc-green-id.extra-data-source .source-submit .links a', function () {
          var obj = $(this);
          var method = obj.attr('data-method');
          var key = obj.attr('data-for');
          var cont = obj.attr('data-continue');

          if (_.isString(cont) && cont === 'true') {
            // Continue rather than perform the lookup
            _self.events.publish(_self.events.const.READY_FOR_RENDER);
            return;
          }

          // Retrieve the source
          var source = _.find(_self.options.sources.extraData, function (o) {
            return o.key == key;
          });

          if (typeof source === 'undefined') {
            return false;
          }

          // Retrieve the button that was clicked
          var button = _.find(source.preAgree.buttons, function (o) {
            return o.method == method;
          });

          if (typeof button === 'undefined') {
            return false;
          }

          // If the button is attempting to set "extra" verification data, do it now
          _self.extraData = _.isObject(button.extra) ? button.extra : {};
          if (Object.keys(_self.extraData).length > 0) {
            // If set, extend
            _self.extraData.source = key;
          }

          // Fire the init event
          _self.render(_self.loading("Initialising..."));
          _self.events.publish(_self.events.const.FETCH_RESULT_NOT_INITIALISED, obj.data);

          return false;
        });

        _self.setupEventListeners = true;
      };

      // Initialise the greenID session
      this.init = function (performLookup, dataId) {
        if (typeof _ === 'undefined') {
          // lodash not defined, return
          return;
        }

        if (typeof _self.setupEventListeners !== 'boolean' || !_self.setupEventListeners) {
          _self.configureEventListeners();
        }

        if (typeof dataId === 'string' && fcGreenID.initialised.indexOf(dataId) < 0) {
          // Mark the field ID as having been initialised
          fcGreenID.initialised.push(dataId);
        }

        if (typeof performLookup !== 'boolean') {
          performLookup = true;
        }

        if (performLookup) {
          // Perform a remote lookup
          fc.api('greenid/gateway-v2/fetch', {fieldId: this.fieldId}, 'POST', function (obj) {
            if (typeof obj.data === 'object' && typeof obj.data.initialised === 'boolean') {
              if (obj.data.initialised) {
                _self.events.publish(_self.events.const.FETCH_RESULT_INITIALISED, obj.data);
              } else {
                // Whether or not there's pre-verification work to do
                if (_self.hasExtraData()) {
                    _self.events.publish(_self.events.const.GET_EXTRA_DATA, obj.data);
                } else {
                    _self.events.publish(_self.events.const.FETCH_RESULT_NOT_INITIALISED, obj.data);
                }
              }
            }
          });

          return;
        }

        _self.events.publish(_self.events.const.FETCH_RESULT_INITIALISED, {});
      };

      /**
       * Return all of the DOM elements for the session.
       * If there are multiple instances where a user can be verified, it needs to return
       * multiple DOM elements.
       * @return {}
       */
      this.getDomElements = function () {
        var lookups = [];
        for (var i = 0, l = _self.fieldIds.length; i < l; i++) {
          lookups.push('[fc-data-group="' + _self.fieldIds[i] + '"]');
        }

        return fc.domContainer.find(lookups.join(','));
      };

      /**
       * Render an HTML template
       * @param html string
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

        // Wrap the HTML up
        var displayHtml = template(
          '<div class="fc-fieldgroup">' +
          ' <div class="fc-field-element-contrainer">' +
          '   <%this.html%>' +
          '   <div class="fc-success-box"><span></span></div>' +
          '   <div class="fc-error-box"><span></span></div>' +
          ' </div>' +
          ' <div class="fc-error-text"></div>' +
          ' <div class="fc-empty"></div>' +
          '</div>'
        , {
          html: html
        });

        el.html(displayHtml);
      };

      fcGreenID.sessions[userHash] = this;
    },

    // Ids of fields that have been initialised
    initialised: [],

    /** The field IDs against the session (for identical verifications) */
    fieldIds: [],

    /**
     * Retrieve the greenID session for a given field
     * @param {dataId} string
     * @return {}
     */
    getSession: function (fieldId) {
      var field = fc.getFieldDefinition(fieldId);
      var values = getConfigValues(field, fieldId);
      var userHash = hash(JSON.stringify(values));
      var session = fcGreenID.sessions[userHash];

      if (session.fieldIds.indexOf(fieldId) < 0) {
        session.fieldIds.push(fieldId);
      }

      return session;
    },

    sessions: {},

    template: template
  };
}(jQuery));

(function ($) {
  'use strict';
  $(fc.jQueryContainer).trigger(fc.jsEvents.onGreenIdLoaded);

  fc.domContainer.on(fc.jsEvents.onVisibilityChanged, function () {
    // So greenID is only initialised when a field is visibly shown (to prevent duplicate payments),
    // need to hook on to visibility changes.
    fc.initGreenIdDOMFields();
  });
}(jQuery));
