/**
 * FormCorp JS SDK
 * @author Alex Berriman <alexb@fishvision.com>
 * @website http://www.formcorp.com.au/
 *
 * Ability to embed a JS client side form on to an external webpage.
 */

/*global define,exports,require,jQuery,document,console,window,setInterval,fcAnalytics,escape,fcGreenID*/

var html;
var LOADED_EVENT = 'formcorpLoaded';

if (typeof window.jQuery === 'undefined') {
  // Get the URL of the called script
  var baseUrl = '';
  var currentScript = document.getElementById("fc-js-include");
  if (typeof currentScript === 'object') {

    var src = currentScript.src;
    var link = document.createElement('a');
    link.href = src;
    baseUrl = link.protocol + '//' + link.hostname + ':' + link.port;
  }

  var script = document.createElement("script");
  script.src = baseUrl + '/lib/jquery.min.js';
  script.id = 'fc-jquery-include';
  script.addEventListener("load", function (e) {
      html = jQuery('html');
      html.trigger(LOADED_EVENT);
  }, !1);

  var bodyScripts = document.getElementsByTagName("script");
  var insert = bodyScripts[bodyScripts.length - 1];
  insert.parentNode.insertBefore(script, insert);
} else {
  html = jQuery('html');
  html.trigger(LOADED_EVENT);
}

if (!Date.now) {
  Date.now = function () {
    "use strict";
    return new Date().getTime();
  };
}

/**
 * Returns whether or not a string is valid json
 * @returns {boolean}
 */
String.prototype.isJson = function () {
  "use strict";

  try {
    jQuery.parseJSON(this);
    return true;
  } catch (ignore) {
  }

  return false;
};

/**
 * Escape a string for use in a regular expresion
 * @returns {*}
 */
String.prototype.escapeRegExp = function () {
  'use strict';
  return this.replace(/([.*+?\^=!:${}()|\[\]\/\\])/g, "\\$1");
};

/**
 * Set up
 */

(function (factory) {
  'use strict';

  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    factory(require('jquery'));
  } else {
    factory(jQuery);
  }
}(function ($) {
  'use strict';

  var pluses = /\+/g,
    config;

  /**
   * Encode a string
   * @param s
   * @returns {*}
   */
  function encode(s) {
    return encodeURIComponent(s);
  }

  /**
   * Decode a string
   * @param s
   * @returns {*}
   */
  function decode(s) {
    return decodeURIComponent(s);
  }

  /**
   * Properly encode a cookie value
   * @param value
   * @returns {*}
   */
  function stringifyCookieValue(value) {
    return encode(typeof (config.json) === 'boolean' && config.json ? JSON.stringify(value) : String(value));
  }

  /**
   * Parse a cookie value
   * @param s
   * @returns {*}
   */
  function parseCookieValue(s) {
    if (s.indexOf('"') === 0) {
      // This is a quoted cookie as according to RFC2068, unescape...
      s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    try {
      // Replace server-side written pluses with spaces.
      // If we can't decode the cookie, ignore it, it's unusable.
      // If we can't parse the cookie, ignore it, it's unusable.
      s = decodeURIComponent(s.replace(pluses, ' '));
      return config.json ? JSON.parse(s) : s;
    } catch (ignore) {
    }
  }

  /**
   * Read a cookie value.
   * @param s
   * @param converter
   * @returns {*}
   */
  function read(s, converter) {
    var value = config.raw ? s : parseCookieValue(s);
    return $.isFunction(converter) ? converter(value) : value;
  }

  /**
   * Set/get cookies
   * @type {Function}
   */

  config = $.cookie = function (key, value, options) {
    var days, t, result, cookies, i, l, parts, name, cookie;

    // Write
    if (arguments.length > 1 && !$.isFunction(value)) {
      options = $.extend({}, config.defaults, options);

      if (typeof options.expires === 'number') {
        days = options.expires;
        options.expires = new Date();
        t = options.expires;
        t.setTime(+t + days * 864e+5);
      }

      document.cookie = [
        encode(key), '=', stringifyCookieValue(value),
        options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
        options.path ? '; path=' + options.path : '',
        options.domain ? '; domain=' + options.domain : '',
        options.secure ? '; secure' : ''
      ].join('');

      return (document.cookie);
    }

    // Read
    result = key ? undefined : {};
    cookies = document.cookie ? document.cookie.split('; ') : [];

    for (i = 0, l = cookies.length; i < l; i += 1) {
      parts = cookies[i].split('=');
      name = decode(parts.shift());
      cookie = parts.join('=');

      if (key && key === name) {
        // If second argument (value) is a function it's a converter...
        result = read(cookie, value);
        break;
      }

      // Prevent storing a cookie that we couldn't decode.
      if (!key) {
        cookie = read(cookie);
        if (cookie !== undefined) {
          result[name] = cookie;
        }
      }
    }

    return result;
  };

  config.defaults = {};

  /**
   * Remove a cookie
   * @param key
   * @param options
   * @returns {boolean}
   */
  $.removeCookie = function (key, options) {
    if ($.cookie(key) === undefined) {
      return false;
    }

    // Must not alter options, thus extending a fresh object...
    $.cookie(key, '', $.extend({}, options, {expires: -1}));
    return !$.cookie(key);
  };

}));

var formcorp = (function () {
  // private
  var self = this;
  self.forms = {};

  var getForms = function () {
    return self.forms;
  };

  /**
   * todo
   */
  var getForm = function (id) {
    if (typeof id === 'string' && typeof self.forms[id] === 'object') {
      return self.forms[id];
    }
  };

  /**
   * Destroys the specified form.
   *
   * @param {string} id - The id of the form to destroy.
   * @returns {boolean}
   */
  var destroyForm = function (id) {
    if (typeof id === 'string' && typeof self.forms[id] === 'object') {
      self.forms[id] = null;
      delete self.forms[id];
      return true;
    }
    return false;
  }

  /**
   * todo
   */
  var create = function (id, $) {
    if (typeof $ === 'undefined') {
      $ = jQuery;
    }

    if (typeof id !== 'string' || id.length === 0) {
      id = 'default';
    }

    // put fc code here
    var fc = (function ($) {
        'use strict';

        /**
         * Internal development occurs locally between ports 9000 and 9010
         * @type {boolean}
         */
        var scriptUrl = document.getElementById('fc-js-include').getAttribute('src'),

          isDev = function () {
            if (scriptUrl.indexOf('192.168.') > -1) {
              return true;
            }

            // If set on the formcorp class, return that value
            if (typeof fc !== 'undefined' && typeof fc.dev === 'boolean') {
              return fc.dev;
            }

            // Default to false
            return false;
          },

          /**
           * Returns the base URL from the script path (host with optional port). Requires host to be an IP.
           * @param withPort
           * @returns {*}
           */
          baseUrl = function (withPort) {
            if (isDev()) {
              if (withPort === undefined) {
                withPort = true;
              }

              var re = withPort ? /\d+\.\d+\.\d+\.\d+[\:]{1}\d+/ : /\d+\.\d+\.\d+\.\d+/,
                match = scriptUrl.match(re);

              if (match && match.length > 0) {
                return match[0];
              }
            }
          },

          /**
           * The URL to query the API on (local dev defaults to port 9001)
           * @type {string}
           */
          apiUrl = function () {
            if (!isDev()) {
              return '//api.formcorp.com.au/';
            }

            // If in development mode, check to see if api URL set
            if (typeof fc.apiUrl === 'string') {
              return fc.apiUrl;
            }

            return '//' + baseUrl(false) + ':9001/';
          },

          /**
           * Checks to see if a minified script is being used.
           * @return boolean
           */
          isMinified = function () {
            return scriptUrl.indexOf('.min.js') > -1;
          },

          /**
           * The URL to query the CDN on (local dev defaults to port 9004)
           * @type {string}
           */
          cdnUrl = function () {
            var url = scriptUrl;

            if (!isDev()) {
              if (isMinified()) {
                url = url.replace('formcorp.min.js', '');
              } else {
                url = url.replace('formcorp.js', '');
              }

              url = url.replace('https://', '//').replace('http://', '//');
              return url;
            }

            // If manually set, use that value
            if (typeof fc.cdnUrl === 'string') {
              return fc.cdnUrl;
            }

            return '//' + baseUrl(false) + ':9004/';
          },

          /**
           * The URL of the Analytics javascript file
           * @type {string}
           */
          analyticsUrl = function () {
            return cdnUrl() + (isMinified() ? 'realtime.min.js' : 'realtime.js');
          },

          /**
           * The JS parser URL
           * @returns {string}
           */
          parserUrl = function () {
            return cdnUrl() + 'lib/' + (isMinified() ? 'parser.min.js' : 'parser.js');
          },

          /**
           * Log a message when in debug mode
           * @param msg
           */
          log = function (msg) {
            if (fc.config.debug) {
            }
          },

          /**
           * HTML encode a string.
           * @param html
           * @returns {*}
           */
          htmlEncode = function (html) {
            return document.createElement('a').appendChild(document.createTextNode(html)).parentNode.innerHTML;
          },

          /**
           * Load a css file on to the page
           *
           * @param file
           * @param media
           * @param cssId
           */
          loadCssFile = function (file, media, cssId) {
            var head, link;

            if (media === undefined) {
              media = 'all';
            }

            head = document.getElementsByTagName('head')[0];
            link = document.createElement('link');

            if (cssId !== undefined) {
              link.id = cssId;
            }

            link.rel = 'stylesheet';
            link.href = htmlEncode(file);
            link.media = media;
            head.appendChild(link);
          },

          /**
           * Load a javascript file
           * @param file
           */
          loadJsFile = function (filePath, callback) {
            var file = document.createElement('script'),
              scriptTags = document.getElementsByTagName("script"),
              firstScript = scriptTags[scriptTags.length - 1];

            file.type = "text/javascript";
            file.src = htmlEncode(filePath);
            file.async = 1;

            if (typeof callback === 'function') {
              file.addEventListener("load", callback);
            }

            firstScript.parentNode.insertBefore(file, firstScript);
          },

          /**
           * Queue a library for loading
           * @param lib string
           */
          addLib = function (lib) {
            if (typeof fc.libs2Load === 'undefined') {
              fc.libs2Load = [];
            }

            if (typeof lib === 'string' && lib.length > 0 && fc.libs2Load.indexOf(lib) < 0) {
              fc.libs2Load.push(lib);
            }
          },

          /**
           * Check to see if all libs have loaded
           * @param {object} data Form schema
           * @return boolean
           */
          checkAllLibsLoaded = function (data) {
            if (typeof data === 'undefined') {
              data = fc.schema;
            }

            if (typeof data === 'undefined') {
              data = fc.schemaData;
            }

            if (fc.loadedLibs.length >= fc.libs2Load.length) {
              // If set to auto discover library files, initialise the render when all libs have loaded
              if (fc.config.autoDiscoverLibs) {
                if (sessionRequiresVerification(data)) {
                  verifySession();
                } else {
                  initRender(fc.schemaData);
                }
              }

              return true;
            }

            return false;
          },

          /**
           * Register a loaded library file.
           * @param lib
           */
          registerLibLoaded = function (lib) {
            if (fc.loadedLibs.indexOf(lib)) {
              fc.loadedLibs.push(lib);
            }

            checkAllLibsLoaded();
          },

          /**
           * Determines whether or not a library file has loaded
           * @param lib
           * @return boolean
           */
          libHasLoaded = function (lib) {
            return fc.loadedLibs.indexOf(lib) >= 0;
          },

          /**
           * Load the material datepicker libraries
           */
          loadMaterialDatepicker = function () {
            if (typeof fc.materialDatepickers === 'undefined') {
              fc.materialDatepickers = {};
            }

            // Load the material datepicker
            if (typeof fc.loadedMaterialDatepicker !== 'boolean' || !fc.loadedMaterialDatepicker) {
              loadCssFile('//fonts.googleapis.com/icon?family=Material+Icons');
              loadCssFile('//fonts.googleapis.com/css?family=Roboto');
              loadCssFile('//maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css');
              loadCssFile(cdnUrl() + 'lib/material_datetime/datepicker.css');
              loadJsFile(cdnUrl() + 'lib/material_datetime/' + (isMinified() ? 'datepicker.standalone.min.js' : 'datepicker.standalone.js'), function () {
                fc.loadedMaterialDatepicker = true;
                registerLibLoaded(fc.libs.MATERIAL_DATEPICKER);
              });
            }

            // Show the date time picker
            fc.domContainer.on('click', '.fc-field-date i.fa', function (e) {
              var obj = $(this).parent().find('.fc-fieldinput'),
                dataId = obj.attr('formcorp-data-id'),
                margin = obj.css('marginRight'),
                usableWidth = parseInt(obj.width()) - fc.config.datePickerIconOffset;

              if (typeof fc.materialDatepickers[dataId] !== 'undefined') {
                fc.materialDatepickers[dataId].open();
              }

              return false;
            });
          },

          /**
           * Load a specific library
           * @param lib
           */
          loadLib = function (lib) {
            if (!libHasLoaded(lib)) {
              switch (lib) {
                // Load the material datepicker
                case fc.libs.MATERIAL_DATEPICKER:
                  loadMaterialDatepicker();
                  break;
              }
            }
          },

          /**
           * Load the (optional) library files
           */
          loadLibs = function () {
            var lib;

            for (var x = 0; x < fc.libs2Load.length; x += 1) {
              lib = fc.libs2Load[x];
              loadLib(lib);
            }
          },

          /**
           * Return the mongo id of an object instance.
           * @param obj
           * @returns {*}
           */
          getId = function (obj) {
            /*jslint nomen:true*/
            if (typeof obj === "object" && obj._id !== undefined && obj._id.$id !== undefined) {
              return obj._id.$id;
            }
            /*jslint nomen:false*/

            return "";
          },


          /**
           * Return a unique data id (removes duplicates, i.e. data1_data2_data1 => data1_data2)
           * @param dataId
           * @returns string
           */
          getDataId = function (dataId) {
            var parts, iterator, uniqueIds = [];

            // Field IDs should never be in there twice
            if (dataId.indexOf(fc.constants.prefixSeparator) >= 0) {
              parts = dataId.split(fc.constants.prefixSeparator);
              for (iterator = 0; iterator < parts.length; iterator += 1) {
                if (uniqueIds.indexOf(parts[iterator]) === -1) {
                  uniqueIds.push(parts[iterator]);
                }
              }

              if (uniqueIds.length > 0) {
                dataId = uniqueIds.join(fc.constants.prefixSeparator);
              }
            }

            return dataId;
          },

          /**
           * Return a value from the field's configuration options.
           * @param field
           * @param key
           * @param defaultVal
           * @param jsonify
           * @returns {*}
           */
          getConfig = function (field, key, defaultVal, jsonify) {
            var json;

            if (defaultVal === undefined) {
              defaultVal = '';
            }

            if (jsonify === undefined) {
              jsonify = false;
            }

            if (field !== undefined && typeof field.config === 'object' && field.config[key] !== undefined) {
              if (jsonify) {
                // Attempt to convert to json string
                if (typeof field.config[key] === "string" && ['[', '{'].indexOf(field.config[key].substring(0, 1)) > -1) {
                  try {
                    json = $.parseJSON(field.config[key]);
                    field.config[key] = json;
                  } catch (ignore) {
                  }
                }
              }

              return field.config[key];
            }

            return defaultVal;
          },

          /**
           * Fetches and returns the session id
           * @returns {string}
           */
          getSessionId = function () {
            return $.cookie(this.config.sessionIdName);
          },

          /**
           * Retrieve the saved value.
           * @param fieldId
           * @param defaultValue
           * @return {mixed}
           */
          getValue = function (fieldId, defaultValue) {
            log('getValue');
            log(fieldId);
            log(defaultValue);
            if (defaultValue === undefined) {
              defaultValue = '';
            }

            var schema, value, functionReference;

            // 16.06.16: everything is now stored in arrays, so need to recursively look through
            // to attempt to look at nested arrays.
            fieldId = getDataId(fieldId);
            schema = fc.fieldSchema[fieldId];
            var parts = fieldId.split(fc.constants.prefixSeparator);
            var lookUp = fc.fields;
            for (var i = 0; i < parts.length; i++) {
              value = lookUp[parts[i]];
              if (typeof value === 'undefined') {
                return defaultValue;
              }
              lookUp = value;
            }

            if (schema !== undefined) {
              functionReference = getConfig(schema, 'functionReference', '');
              if (functionReference.length > 0) {
                if (typeof window[functionReference] === 'function') {
                  return window[functionReference](fieldId);
                }
              }
            }

            return value !== undefined ? value : defaultValue;
          },

          /**
           * Fields optionally have a shortened label for use in summary tables/pdfs.
           * @param field
           * @returns {*}
           */
          getShortLabel = function (field) {
            return getConfig(field, 'shortLabel', '').length > 0 ? getConfig(field, 'shortLabel') : getConfig(field, 'label');
          },

          /**
           * Retrieve the credit card type from the credit card number
           * @param number
           * @returns {string}
           */
          getCreditCardType = function (number) {
            if (/^5[1-5]/.test(number)) {
              return fc.cardTypes.mastercard;
            }

            if (/^4/.test(number)) {
              return fc.cardTypes.visa;
            }

            if (/^3[47]/.test(number)) {
              return fc.cardTypes.amex;
            }

            return "";
          },

          /**
           * Send off an API call.
           * @param uri
           * @param data
           * @param type
           * @param callback
           * @param errorCallback
           */
          api = function (uri, data, type, callback, errorCallback) {
            if (type === undefined || typeof type !== 'string' || ['GET', 'POST', 'PUT'].indexOf(type.toUpperCase()) === -1) {
              type = 'GET';
            }
            type = type.toUpperCase();

            if (data === undefined) {
              data = {};
            }

            // Default session id
            if (data.sessionId === undefined) {
              data.sessionId = fc.sessionId;
            }

            // Default form id
            if (data.form_id === undefined) {
              data.form_id = fc.formId;
            }

            // Set the branch to use if defined
            if (data.branch === undefined && typeof fc.branch === 'string') {
              data.branch = fc.branch;
            }

            // Set the channel information
            if (fc.channel !== undefined && typeof fc.channel === 'string' && fc.channel.length > 0) {
              data.channel = fc.channel;
            }

            // Shoot off the ajax request
            $.ajax({
              type: type,
              url: apiUrl() + uri,
              data: data,
              beforeSend: function (request) {
                // Prior to sending the request, append the authorization bearer token
                request.setRequestHeader('Authorization', 'Bearer ' + fc.publicKey);
              },
              success: function (data) {
                if (typeof callback === 'function') {
                  // Attempt to convert the data from a string to a json object
                  if (typeof data === 'string') {
                    try {
                      data = $.parseJSON(data);
                    } catch (ignore) {
                    }
                  }
                  callback(data);
                }
              },
              error: function (data) {
                // Only trigger an error callback when passed through
                if (typeof errorCallback === 'function') {
                  errorCallback(data);
                }
              }
            });
          },

          /**
           * Function to detect if currently mobile
           * @returns {boolean}
           */
          isMobile = function () {
            return parseInt($(window).width(), 10) < fc.config.minSizeForMobile;
          },

          /**
           * Checks whether a particular action has been processed (i.e. used for rendering actions only once)
           *
           * @param field
           * @param defaultValue
           * @returns {*}
           */
          processed = function (field, defaultValue) {
            if (defaultValue === undefined || typeof defaultValue !== "boolean") {
              defaultValue = false;
            }

            // If the value has been set, return it
            if (typeof fc.processedActions[field] === "boolean") {
              return fc.processedActions[field];
            }

            return defaultValue;
          },

          /**
           * Retrieve tags for a field
           *
           * @param field
           * @param prefix
           * @param idPrefix
           * @returns {{}}
           */
          getFieldTags = function (field, prefix, idPrefix) {
            if (field === undefined) {
              return {};
            }

            if (prefix === undefined) {
              prefix = '';
            }

            if (idPrefix === undefined) {
              idPrefix = '';
            }

            var fieldTag = getConfig(field, 'tag', false),
              tags = {},
              grouplet,
              groupletTags,
              iterator,
              id = idPrefix;

            if (fieldTag) {
              id += getId(field);

              tags[id] = prefix + fieldTag;
              grouplet = getConfig(field, 'grouplet', false);

              if (grouplet && grouplet.field && $.isArray(grouplet.field) && grouplet.field.length > 0) {
                for (iterator = 0; iterator < grouplet.field.length; iterator += 1) {
                  groupletTags = getFieldTags(grouplet.field[iterator], tags[id] + fc.constants.tagSeparator, id + fc.constants.prefixSeparator);
                  if (Object.keys(groupletTags).length > 0) {
                    $.extend(tags, groupletTags);
                  }
                }
              }
            }

            return tags;
          },

          /**
           * Iterate through each field and return a simple key => value array
           * @param fields
           * @returns {{}}
           */
          getFieldsSchema = function (fields) {
            if (typeof fields !== 'object') {
              return {};
            }

            var iterator, field, schema = {};

            for (iterator = 0; iterator < fields.length; iterator += 1) {
              field = fields[iterator];
              schema[getId(field)] = field;
            }

            return schema;
          },

          /**
           * Retrieve the field tags
           * @returns {{}}
           */
          getAllFieldTags = function (reverseOrder) {
            if (reverseOrder === undefined || typeof reverseOrder !== 'boolean') {
              reverseOrder = false;
            }
            var key, fieldId, tags = {}, fieldTags, tagValues;

            for (key in fc.fieldSchema) {
              if (fc.fieldSchema.hasOwnProperty(key)) {
                fieldTags = getFieldTags(fc.fieldSchema[key]);
                tagValues = {};

                if (Object.keys(fieldTags).length > 0) {
                  for (fieldId in fieldTags) {
                    if (fieldTags.hasOwnProperty(fieldId)) {
                      if (reverseOrder) {
                        tagValues[fieldTags[fieldId]] = fieldId;
                      } else {
                        if (fieldTags.hasOwnProperty(fieldId) && fc.fields[fieldId] !== undefined) {
                          tagValues[fieldId] = fieldTags[fieldId];
                        } else {
                          tagValues[fieldId] = fieldTags[fieldId];
                        }
                      }
                    }
                  }

                  $.extend(tags, tagValues);
                }
              }
            }

            return tags;
          },

          /**
           * Sort fields in to an array with keys based on tags against their values
           * @returns {Array}
           */
          getFieldTagValues = function () {
            var key, fieldId, values = {}, fieldTags, tagValues;

            for (key in fc.fieldSchema) {
              if (fc.fieldSchema.hasOwnProperty(key)) {
                fieldTags = getFieldTags(fc.fieldSchema[key]);
                tagValues = {};

                if (Object.keys(fieldTags).length > 0) {
                  for (fieldId in fieldTags) {
                    if (fieldTags.hasOwnProperty(fieldId) && fc.fields[fieldId] !== undefined) {
                      tagValues[fieldTags[fieldId]] = fc.fields[fieldId];
                    }
                  }

                  $.extend(values, tagValues);
                }
              }
            }

            return values;
          },

          /**
           * Return the value of a field element.
           * @param field
           * @returns {*}
           */
          getFieldValue = function (field) {
            var selector,
              values = [],
              dataId,
              val,
              dataValue;

            // If not defined, return nothing
            if (!field || field.length === 0) {
              return;
            }

            if (field.is('input') || field.is('textarea')) {
              if (field.attr('type') === 'radio') {
                // Radio lists
                if ($('input[name=' + $(field).attr('name') + ']:checked').length > 0) {
                  return $('input[name=' + $(field).attr('name') + ']:checked').val();
                }
                return '';
              }

              if (field.attr('type') === 'checkbox') {
                // Checkbox lists
                selector = $('input[formcorp-data-id=' + $(field).attr('formcorp-data-id') + ']:checked');
                if (selector.length === 0) {
                  return '';
                }
                values = [];
                selector.each(function () {
                  values.push($(this).val());
                });
                return JSON.stringify(values);
              }

              dataId = $(field).attr('formcorp-data-id');

              if (typeof fc.fieldSchema[dataId] !== 'undefined') {
                if (typeof fc.fieldSchema[dataId] !== 'undefined' && fc.fieldSchema[dataId].type === 'matrix') {
                  return parseMatrixField(field, true);
                }
                if (typeof fc.fieldSchema[dataId] !== 'undefined' && fc.fieldSchema[dataId].type === 'fileUpload') {
                  return $('#' + dataId).val();
                }
              }

              if (fc.fieldSchema[dataId] !== undefined) {
                // If read-only, do not record a value
                return getConfig(fc.fieldSchema[dataId], 'readOnly', false) ? '' : field.val();
              }
            }

            if (field.is('select')) {
              return $(field).find('option:selected').val();
            }

            // Return the value for rendered buttons
            if (field.is('button')) {
              dataId = field.attr('formcorp-data-id').replace('_rootSelection', '');

              var schema = fc.fieldSchema[dataId];
              if (typeof schema === 'object' && schema.type === 'greenIdVerification') {
                return getValue(dataId);
              }

              if (dataId) {
                if (!getConfig(fc.fieldSchema[dataId], 'allowMultiple', false)) {
                  dataValue = $('.fc-button.checked[formcorp-data-id="' + dataId + '"]').attr('data-field-value');
                  if (dataValue) {
                    return decodeURIComponent(dataValue);
                  }

                  // If a radio, can just get the button text
                  return $('.fc-button.checked[formcorp-data-id="' + dataId + '"]').text();
                }

                val = [];
                // Otherwise if multiple are allowed, have to get all
                $('.fc-button.checked[formcorp-data-id="' + dataId + '"]').each(function () {
                  val.push(decodeURIComponent($(this).attr('data-field-value')));
                });

                return val;
              }
            }

            var dataReference = field.attr('data-reference');
            if ('string' === typeof dataReference && dataReference.length > 0) {
              return dataReference;
            }

            // If a signature, set a string as the json value of the signature
            dataId = field.attr('fc-data-group');
            if ((fc.renderedSignatures !== undefined && fc.renderedSignatures[dataId] !== undefined) || field.hasClass(fc.config.signatureClass)) {
              if (dataId === undefined) {
                // Attempt to load secondary data id if undefined (can run on parent and child element)
                dataId = $(field).attr('formcorp-data-id');
              }

              if (fc.renderedSignatures !== undefined && fc.renderedSignatures[dataId] !== undefined) {
                return fc.renderedSignatures[dataId].getSignatureString();
              }
            }

            return '';
          },

          /**
           * Returns true if a field is empty, false if not.
           * @param field
           * @returns {boolean}
           */
          fieldIsEmpty = function (field) {
            var value = getFieldValue(field);
            if (value === undefined) {
              return;
            }

            return !value || value.length === 0;
          },

          /**
           * Retrieve custom error validations from field.
           * @param field
           * @param value
           * @returns {Array}
           */
          getCustomErrors = function (field, value) {
            var errors = [],
              x,
              i,
              validator,
              callback,
              callbackSplit,
              error,
              type,
              callbackFunction,
              json,
              result;

            // If not required and no value specified, return no errors (otherwise perform custom validation)
            if (!getConfig(field, 'required', false) && value.length === 0) {
              return [];
            }

            // If validators is a string (and starts with a json char to speed up), try to typecast to json
            if (typeof field.config.validators === "string" && ['[', '{'].indexOf(field.config.validators.substring(0, 1)) > -1) {
              try {
                json = $.parseJSON(field.config.validators);
                field.config.validators = json;
              } catch (ignore) {
              }
            }

            // If validators are set, attempt to validate
            if (typeof field.config.validators === 'object' && field.config.validators.length > 0) {
              for (x = 0; x < field.config.validators.length; x += 1) {
                validator = field.config.validators[x];
                type = fc.toCamelCase(validator.type);

                callback = window;

                try {
                  if (type === fc.constants.functionCallbackType && $.isArray(validator.params) && validator.params.length > 0 && validator.params[0].length > 0) {
                    // Custom callback function
                    // Some functions might be nested within object (i.e. formcorp.validators.validTFN)
                    // Because of this, need to traverse through the object to find the necessary function
                    var components = validator.params[0].split('.');
                    if (components.length > 0) {
                      var component;
                      for (var a = 0; a < components.length; a += 1) {
                        component = components[a];
                        if (typeof callback[component] !== 'undefined') {
                          callback = callback[component];
                        }
                      }
                    }

                    if (typeof callback !== 'function') {
                      log('Custom function \'' + validator.params[0] + '\' callback not defined.');
                    } else {
                      result = callback(value);
                    }
                  } else {
                    // Standard callback function
                    callbackFunction = 'formcorp.validators.' + type;

                    // Convert string to function call
                    callbackSplit = callbackFunction.split('.');
                    for (i = 0; i < callbackSplit.length; i += 1) {
                      callback = callback[callbackSplit[i]];
                    }

                    result = callback(validator.params, value);
                  }

                  // Call the callback function
                  if (typeof callback === 'function' && !result) {
                    error = typeof validator.error === 'string' && validator.error.length > 0 ? validator.error : fc.lang.defaultCustomValidationError;
                    errors.push(error);
                  }
                } catch (ignore) {
                  log('Exception raised while attempting custom validator.');
                }
              }
            }

            return errors;
          },

          /**
           * Returns a list of errors on a particular field.
           * @param id
           * @returns {Array}
           */
          fieldErrors = function (id) {
            var fieldSelector = $('.fc-field[fc-data-group="' + id + '"]'),
              dataId = id,
              section,
              field,
              value,
              errors = [],
              dataField,
              belongsTo,
              parentGrouplet,
              parentGroupletId,
              selector,
              mappedValue,
              domValue;

            if (fieldSelector.length === 0) {
              return [];
            }

            // If the field is hidden, not required to validate
            if (fieldSelector.hasClass('fc-hide')) {
              return [];
            }

            section = fieldSelector.parent();
            field = fc.fieldSchema[dataId];

            // If value has been mapped, use that
            if (fc.fields[dataId] !== undefined) {
              mappedValue = fc.fields[dataId];
            }

            // Fetch the value on the DOM
            domValue = getFieldValue(fieldSelector.find('.fc-fieldinput'));
            // Give higher priority to the value in the dom
            if (domValue !== undefined) {
              value = domValue;
            } else {
              value = mappedValue;
            }

            // Default value to empty string if unable to retrieve a value
            if (value === undefined || value === null) {
              value = '';
            }

            // If section is hidden, return
            if (section.hasClass('fc-hide')) {
              return [];
            }

            // If belongs to a grouplet, and the parent grouplet is hidden, do not display
            selector = fieldSelector;
            do {
              belongsTo = selector.attr('fc-belongs-to');
              parentGrouplet = $('[fc-data-group="' + belongsTo + '"],[formcorp-data-id="' + belongsTo + '"]');

              // Fetch the id
              parentGroupletId = parentGrouplet.attr('fc-data-group');
              if (parentGroupletId === undefined) {
                parentGroupletId = parentGrouplet.attr('formcorp-data-id');
              }

              // If an id/instance is defined, check if hidden (if hidden, do not render errors)
              if (parentGroupletId !== undefined) {
                if (parentGrouplet.hasClass('fc-hide')) {
                  return [];
                }
                selector = $('[fc-data-group="' + belongsTo + '"],[formcorp-data-id="' + belongsTo + '"]');
              }
            } while (parentGroupletId !== undefined);

            // Validate a date field
            if (field.type === 'date') {
              var dateTest = /^(\d{4}((-\d{2}){2}|(\/\d{2}){2})|((\d{2}-){2}|(\d{2}\/){2})\d{4})(\s+\d{1,2}:(\d{2}))?$/;
              if (!dateTest.test(domValue)) {
                errors.push(fc.lang.dateCorrectFormat);
                return errors;
              }
            }

            // If abn field, check to see if valid
            if (field.type === 'abnVerification') {
              if (fc.validAbns.indexOf(value) < 0) {
                errors.push(fc.lang.validAbnRequired);
                return errors;
              }
            } else if (field.type === 'matrix') {
              return validateMatrixField(field);
            } else if (field.type === 'fileUpload') {
              return validateFileUpload(field, value);
            } else {
              // Test required data
              dataField = $('[fc-data-group="' + id + '"] [data-required="true"]');
              if (getConfig(field, 'required', false) && fieldIsEmpty(dataField)) {
                errors.push(fc.lang.emptyFieldError);
                return errors;
              }
            }

            // Custom validators
            errors = errors.concat(getCustomErrors(field, value));

            return errors;
          },

          /**
           * Store an event locally to be logged
           * @param event
           * @param params
           */
          logEvent = function (event, params) {
            if (event === undefined) {
              return;
            }

            if (fc.analytics && fc.analytics.logEvent) {
              fc.analytics.logEvent(event, params);
            }
          },

          /**
           * Show the errors on the DOM for a given field.
           * @param dataId
           * @param errors
           */
          showFieldError = function (dataId, errors) {
            var dataGroup = fc.domContainer.find('div[fc-data-group="' + dataId + '"]'),
              x,
              msg = '';

            // Trigger an event
            fc.domContainer.trigger(fc.jsEvents.onFieldError, [dataId, errors]);

            dataGroup.addClass('fc-error');

            // If inline validation enabled, output error message(s)
            if (fc.config.inlineValidation === true) {
              for (x = 0; x < errors.length; x += 1) {
                msg += errors[x] + '<br>';
              }
              dataGroup.find('.fc-error-text').html(msg);
            }
          },

          /**
           * Show the success class on the DOM for a given field.
           * @param dataId
           */
          showFieldSuccess = function (dataId) {
            var dataGroup = fc.domContainer.find('div[fc-data-group="' + dataId + '"]'),
              x,
              msg = '';

            // Trigger an event
            fc.domContainer.trigger(fc.jsEvents.onFieldSuccess, [dataId]);

            dataGroup.addClass('fc-field-success');
          },

          /**
           * Recursively retrieves grouplet field ids.
           * @param field
           * @returns {Array}
           */
          getGroupletFields = function (field) {
            if (field.type === "grouplet") {
              var grouplet = getConfig(field, "grouplet", {field: []}),
                fieldIterator,
                groupletField,
                fields = [],
                fieldId;

              /*jslint nomen: true*/
              fieldId = field._id.$id;
              /*jslint nomen: false*/

              if (typeof grouplet === 'object' && typeof grouplet.field === 'object' && $.isArray(grouplet.field)) {
                for (fieldIterator = 0; fieldIterator < grouplet.field.length; fieldIterator += 1) {
                  groupletField = grouplet.field[fieldIterator];

                  // If grouplet within a groupler, need to recursively add
                  if (groupletField.type === "grouplet") {
                    fields.concat(getGroupletFields(groupletField));
                  } else {
                    /*jslint nomen: true*/
                    fields.push(fieldId + fc.constants.prefixSeparator + groupletField._id.$id);
                    /*jslint nomen: false*/
                  }
                }
              }

              return fields;
            }

            return [];
          },

          /**
           * Mark as read only
           */
          readOnly = function () {
            fc.domContainer.find(':input').attr('readonly','readonly');
          },

          /**
           * Returns the page id a field belongs to
           * @param fieldId
           * @param useDOM
           * @returns {*}
           */
          getFieldPageId = function (fieldId, useDOM) {
            var stageIterator,
              pageIterator,
              sectionIterator,
              fieldIterator,
              groupletIterator,
              page,
              section,
              field,
              groupletFields;

            // Default use DOM to false
            if (typeof useDOM !== 'boolean') {
              useDOM = false;
            }

            if (fc.fieldPages === undefined) {
              fc.fieldPages = {};
            }

            if (fc.fieldPages[fieldId] !== undefined && typeof fc.fieldPages[fieldId] === "string") {
              return fc.fieldPages[fieldId];
            }

            // Method 1: Iterate through the schema and look for a match
            if (!useDOM) {
              // Iterate through each stage and look for a field match
              for (stageIterator = 0; stageIterator < fc.schema.stage.length; stageIterator += 1) {
                for (pageIterator = 0; pageIterator < fc.schema.stage[stageIterator].page.length; pageIterator += 1) {
                  page = fc.schema.stage[stageIterator].page[pageIterator];
                  for (sectionIterator = 0; sectionIterator < page.section.length; sectionIterator += 1) {
                    if (typeof page.section[sectionIterator].field !== "object") {
                      continue;
                    }
                    section = page.section[sectionIterator];

                    for (fieldIterator = 0; fieldIterator < section.field.length; fieldIterator += 1) {
                      field = section.field[fieldIterator];
                      fc.fieldPages[getId(field)] = getId(page);

                      // If field is a grouplet, need to get grouplet fields
                      if (field.type === "grouplet") {
                        groupletFields = getGroupletFields(field);
                        for (groupletIterator = 0; groupletIterator < groupletFields.length; groupletIterator += 1) {
                          fc.fieldPages[groupletFields[groupletIterator]] = getId(page);
                        }
                      }
                    }
                  }
                }
              }
            } else {
              // Method 2: use the DOM to attempt to find a match
              field = fc.domContainer.find('.fc-field[fc-data-group="' + fieldId + '"]');
              if (field.length === 0) {
                // If can't find the field, do nothing.
                return '';
              }

              // Attempt to find the section the field belongs to
              section = fc.domContainer.find('.fc-section-' + field.attr('fc-belongs-to'));
              if (section.length === 0) {
                return '';
              }

              // Check if the parent has class fc-page (to indicate its a page)
              if (!section.parent().hasClass('fc-page')) {
                return '';
              }

              return section.parent().attr('data-page-id');
            }

            if (fc.fieldPages[fieldId] !== undefined && typeof fc.fieldPages[fieldId] === "string") {
              return fc.fieldPages[fieldId];
            }

            return "";
          },

          /**
            * Set the entity tokens.
            * @param tokens
            */
          setEntityTokens = function (tokens) {
            if (typeof tokens === 'object' && !$.isArray(tokens)) {
              fc.entityTokens = tokens;
            }
          },

          /**
           * Set a specific entity tokens
           * @param id
           * @param val
           */
          setEntityToken = function (id, val) {
            if (typeof fc.entityTokens === 'undefined') {
              fc.entityTokens = {};
            }

            fc.entityTokens[id] = val;
          },

          /**
           * Returns a field by tag
           * @param tag
           * @returns {*}
           */
          getFieldByTag = function (tag) {
            var iterator, fieldTag;

            for (iterator in fc.fieldSchema) {
              if (fc.fieldSchema.hasOwnProperty(iterator)) {
                fieldTag = getConfig(fc.fieldSchema[iterator], 'tag', '');
                if (fieldTag.length > 0 && fieldTag === tag) {
                  return fc.fieldSchema[iterator];
                }
              }
            }
          },

          /**
           * Set the form mode
           * @param mode string
           */
          setMode = function (mode) {
            if (typeof fc.domContainer !== 'undefined') {
              fc.domContainer.find('.render').attr('data-mode', mode);
            }

            fc.mode = mode;
          },

          /**
           * Return the current form mode
           * @return string
           */
          getMode = function () {
            return typeof fc.mode === 'string' ? fc.mode : fc.modes.DEFAULT;
          },

          /**
           * Whether or not the current branch should be considered a development branch.
           * @returns boolean
           */
          isDevelopmentBranch = function () {
            return fc.branch && typeof fc.branch === 'string' && fc.branch.length > 0 && fc.developmentBranches.indexOf(fc.branch) > -1;
          },

          /**
           * Remove the error on the DOM for a given field.
           * @param dataId
           */
          removeFieldError = function (dataId) {
            fc.domContainer.find('div[fc-data-group="' + dataId + '"]').removeClass('fc-error');
            var dataGroup = fc.domContainer.find('div[fc-data-group="' + dataId + '"]');
            dataGroup.find('.fc-error-text').html('');
          },

          /**
           * Remove the success class on the DOM for a given field.
           * @param dataId
           */
          removeFieldSuccess = function (dataId) {
            fc.domContainer.find('div[fc-data-group="' + dataId + '"]').removeClass('fc-field-success');
          },

          /**
           * Checks to see if an object is an enhanced security error.
           * @param data {obj}
           * @return boolean
           */
          enhancedSecurityError = function (data) {
            return typeof data === 'object' && typeof data.success === 'boolean' && !data.success && data.category === fc.constants.enhancedSecurity;
          },

          /**
           * Shows an 'enhanced' security error
           * @param data {obj}
           */
          showSecurityError = function (data) {
            var errorDiv = $('<div></div>').addClass('fc-security-error');
            var error = $('<span></span>').text(data.message);
            errorDiv.prepend(error);

            var target = fc.domContainer.find('.fc-page:last .fc-pagination');

            if (target.length > 0) {
              target.find('.fc-security-error').remove();
              target.prepend(errorDiv);
            }
          },

          /**
           * 'god' fields do not require a value (i.e. rich text area)
           * @type {string[]}
           */
          godFields = ["richTextArea"],

          /**
           * Performs a simple check using the Luhn algorithm to determine if a credit card number is valid.
           * @param val
           * @returns {boolean}
           */
          luhnCheck = function (val) {
            var sum = 0, iterator, intVal;

            for (iterator = 0; iterator < val.length; iterator += 1) {
              intVal = parseInt(val.substr(iterator, 1), 10);
              if (iterator % 2 === 0) {
                intVal *= 2;
                if (intVal > 9) {
                  intVal = 1 + (intVal % 10);
                }
              }
              sum += intVal;
            }
            return (sum % 10) === 0;
          },

          /**
           * Validate a credit card field
           * @param dataId
           * @param field
           * @param section
           * @returns {Array}
           */
          validCreditCardField = function (dataId, field, section) {
            var value = fc.fields[dataId] === undefined ? '' : fc.fields[dataId],
              errors = [],
              ccForm,
              cardName,
              cardNumber,
              expiryMonth,
              expiryYear,
              securityCode;

            // A value for the credit card indicates its all good (to be verified by server)
            if (value.length > 0) {
              return [];
            }

            // Fetch the cc form
            ccForm = fc.domContainer.find('[fc-data-group="' + dataId + '"]');
            if (ccForm.length === 0) {
              log("[FC] Unable to locate CC form");
              return [];
            }

            // Map values to js variables
            cardName = ccForm.find('.fc-cc-name input');
            cardNumber = ccForm.find('.fc-cc-number input');
            expiryMonth = parseInt(ccForm.find('.fc-cc-expirydate option:selected').val(), 0);
            expiryYear = parseInt(ccForm.find('.fc-cc-expirydate-year option:selected').val(), 0);
            securityCode = ccForm.find('.fc-cc-ccv input');

            // Validate credit card name
            if (cardName.val().length === 0) {
              errors.push(fc.lang.creditCardMissingName);
            }

            // Validate credit card number
            cardNumber = cardNumber.val().replace(/[^0-9]/g, "", cardNumber);
            if (cardNumber.length === 0) {
              // Ensure a value was entered
              errors.push(fc.lang.creditCardMissingNumber);
            } else if (cardNumber.length < fc.config.creditCardNumberLimits[0] || cardNumber.length > fc.config.creditCardNumberLimits[1] || !luhnCheck(cardNumber)) {
              // Ensure the value was the correct limit
              errors.push(fc.lang.invalidCardFormat);
            }

            // Expiry - ensure values entered
            if (expiryMonth === undefined || expiryMonth.length === 0 || expiryYear === undefined || expiryYear.length === 0 || isNaN(expiryMonth) || isNaN(expiryYear)) {
              errors.push(fc.lang.creditCardMissingExpiryDate);
            } else if (expiryMonth < 1 || expiryMonth > 12) {
              // Check month within range 1 <= month <= 12
              errors.push(fc.lang.creditCardMissingExpiryDate);
            } else if (expiryYear < (new Date()).getFullYear() || expiryYear > ((new Date()).getFullYear() + 30)) {
              // Check year within range CURRENT_YEAR <= year <= (CURRENT_YEAR + 30)
              errors.push(fc.lang.creditCardMissingExpiryDate);
            } else if (expiryYear === (new Date()).getFullYear() && expiryMonth < ((new Date()).getMonth() + 1)) {
              errors.push(fc.lang.creditCardExpired);
            }

            // Validate security code - min and max length
            securityCode = securityCode.val().replace(/[^0-9]/g, "", securityCode);
            if (securityCode.length === 0 || securityCode.length > fc.config.maxCreditCardCodeLength) {
              errors.push(fc.lang.creditCardMissingSecurityCode);
            }

            return errors;
          },

          /**
           * Returns true if a field element exists within a modal window
           * @param obj
           * @returns {boolean}
           */
          inModal = function (obj) {
            var parentContainer = obj.parent().parent().parent().parent(),
              dataId,
              field;

            if (parentContainer.length === 0) {
              return false;
            }

            // Fetch the field the object belongs to
            dataId = parentContainer.attr('fc-data-group');
            if (dataId !== undefined && dataId !== null) {
              field = fc.fieldSchema[dataId];
              if (getConfig(field, 'repeatable', false)) {
                // If the field is repeatable, its in a modal
                return fc.constants.repeatableInModal.indexOf(parseInt(getConfig(field, 'repeatableStyle', 1))) > -1;
              }
            }

            return false;
          },

          /**
           * Retrieve errors for a field ID
           * @param fieldId
           * @param value
           */
          getFieldErrors = function (fieldId, value, prefix) {
            var errors = [],
              field = fc.fieldSchema[fieldId],
              skipCheck = false,
              required;

            // Default prefix to empty string
            if (typeof prefix !== 'string') {
              prefix = '';
            }

            // If the field hasn't been defined, return no errors
            if (field === undefined) {
              return [];
            }

            // If a credit card payment field, treat uniquely
            if (field.type === "creditCard") {
              if (value.length === 0 || value.success == undefined || value.success != true) {
                errors.push(fc.lang.paymentRequired);
              }
              skipCheck = true;
            } else if (["emailVerification", "smsVerification"].indexOf(field.type) > -1) {
              // If email or sms verification, check if verified
              if (fc.fields[getId(field)] === undefined || !validVerificationResult(fc.fields[getId(field)])) {
                errors.push(fc.lang.fieldMustBeVerified);
              } else {
                // Successfully verified
                skipCheck = true;
              }
            } else if (field.type === "signature") {
              // Signature fields need to be uniquely validated
              if (fc.renderedSignatures === undefined || fc.renderedSignatures[fieldId] === undefined) {
                // Signature hasn't been initialised
                errors.push("Field has not been initialised");
              } else {
                if (fc.renderedSignatures[fieldId].validateForm() === false) {
                  // Attempt to validate the field
                  errors.push(fc.lang.emptyFieldError);
                } else {
                  // Store the value
                  setVirtualValue(fieldId, fc.renderedSignatures[fieldId].getSignatureString());
                }
              }
              skipCheck = true;
            } else if (field.type === 'fileUpload') {
              if (typeof value === 'undefined' || value.length === 0) {
                errors.push(fc.lang.emptyFieldError);
              }
              if (typeof value === 'string') {
                try {
                  var json = JSON.parse(value);
                  if (json.length == 0) {
                    errors.push(fc.lang.emptyFieldError);
                  }
                } catch (e) {
                  errors.push(fc.lang.emptyFieldError);
                }
              }
            }  else if (field.type === "grouplet") {
              // Grouplet field as a whole doesn't need to be validated
              return;
            } else if (field.type === "greenIdVerification") {
              // Retrieve value from object, not DOM
              value = getValue(fieldId);

              // Validate a Green ID field
              if (fc.greenID === undefined) {
                // Green ID has yet to be initialised
                errors.push('Green ID has not been initialised.');
              } else if (typeof value !== "object" || !fc.greenID.passesValidation(prefix + getId(field))) {
                // Validation is allowed to pass
                errors.push('You must verify your identity.');
              } else {
                // Otherwise the verification is valid
                skipCheck = true;
              }
            } else if (field.type === 'date') {
              var dateRegex = /^(\d{2,4})[\-\.\/]{1}(\d{2,4})[\-\.\/]{1}(\d{2,4})\s{0,1}\d{0,2}[\:]{0,1}(\d{0,2})$/;
            }

            // If repeatable and required, check the amount of values
            if (!skipCheck && errors.length === 0) {
              if (field.config !== undefined && typeof field.config.repeatable === 'boolean' && field.config.repeatable) {
                required = $(this).attr('data-required');
                if (required === 'true' && (typeof value !== 'object' || value.length === 0)) {
                  errors.push(fc.lang.emptyFieldError);
                }
              } else {
                errors = fieldErrors(fieldId);
              }
            }

            return errors;
          },

          /**
           * Whether or not a value is a valid verification result
           * @param value string
           * @returns boolean
           */
          validVerificationResult = function (value) {
            if (typeof value !== 'string') {
              return false;
            }

            return value.length >= 48;
          },

          /**
           * Check the validity of the entire form.
           * @param rootElement
           * @returns {boolean}
           */
          validForm = function (rootElement, showErrors) {
            if (fc.config.administrativeEdit) {
              // If in administrative mode, form is always valid
              return true;
            }

            var errors = {},
              required;

            if (rootElement === undefined) {
              rootElement = fc.jQueryContainer;
            }

            // Whether to update the DOM with the errors or just return a bool
            if (typeof showErrors !== "boolean") {
              showErrors = true;
            }

            // Test if required fields have a value
            $(rootElement).find('.fc-field[fc-data-group]').each(function () {
              var obj = $(this),
                dataId = obj.attr('fc-data-group'),
                section = obj.parent(),
                field = fc.fieldSchema[dataId],
                value = fc.fields[dataId] === undefined ? '' : fc.fields[dataId],
                localErrors = [],
                skipCheck = false,
                target,
                parts,
                prefix = '',
                belongsTo;

              // If a repeatable field, ignore
              if (obj.parent().attr("class").indexOf("repeatable") > -1 && obj.parent().attr('class').indexOf('fc-repeatable-row') === -1) {
                return;
              }

              // If the field is hidden, not required to validate
              if (obj.hasClass('fc-hide') || obj.hasClass('fc-already-initialised-verification')) {
                return;
              }

              // If in modal, do nothing
              if (inModal(obj)) {
                return;
              }

              // Check if the section it belongs to is hidden
              belongsTo = obj.attr('fc-belongs-to');
              if (typeof belongsTo === 'string') {
                section = fc.domContainer.find('.fc-section[formcorp-data-id="' + belongsTo + '"]');

                // When the section is hidden, do not validate
                if (section.length > 0 && section.hasClass('fc-hide')) {
                  return;
                }
              }

              // If the field belongs to a grouplet and the grouplet is hidden, not required to validate
              if (dataId.indexOf(fc.constants.prefixSeparator) > -1) {
                parts = dataId.split(fc.constants.prefixSeparator);
                target = $(rootElement).find('.fc-field[fc-data-group="' + parts[0] + '"]');
                if (target.hasClass('fc-hide')) {
                  return;
                }
              }

              // Determine the prefix
              if (field !== undefined && dataId.indexOf(fc.constants.prefixSeparator) >= 0) {
                prefix = dataId.replace(getId(field), '');
              }

              // If not required, do nothing
              if (getConfig(field, 'required', false) === false || getConfig(field, 'readOnly', false)) {
                // Check matrix field validation
                if (['grouplet', 'repeatableIterator'].indexOf(field.type) < 0) {
                  showFieldSuccess(dataId);
                }

                return;
              }

              // Check if the field requires a value
              if (typeof field.type === 'string' && godFields.indexOf(field.type) !== -1) {
                return;
              }

              // If section is hidden, return
              if (section.hasClass('fc-hide')) {
                return;
              }

              // Retrieve the field errors
              localErrors = getFieldErrors(dataId, value, prefix);

              // If have errors, output
              if (localErrors.length > 0) {
                // Log error event
                logEvent(fc.eventTypes.onFieldError, {
                  fieldId: dataId,
                  errors: localErrors
                });

                errors[dataId] = localErrors;
                removeFieldSuccess(dataId);
                if (showErrors) {
                  showFieldError(dataId, localErrors);
                }
              } else {
                if (showErrors) {
                  removeFieldError(dataId);
                }
                showFieldSuccess(dataId);
              }
            });

            return Object.keys(errors).length === 0;
          },

          /**
           * Finds and returns a page by its id.
           * @param pageId
           * @returns {*}
           */
          getPageById = function (pageId) {
            if (typeof fc.pages[pageId] === 'object') {
              return fc.pages[pageId];
            }

            var x,
              y,
              stage,
              page;
            for (x = 0; x < fc.schema.stage.length; x += 1) {
              stage = fc.schema.stage[x];
              if (typeof stage.page === 'object' && stage.page.length > 0) {
                for (y = 0; y < stage.page.length; y += 1) {
                  page = stage.page[y];
                  /*jslint nomen: true*/
                  if (fc.pages[page._id.$id] === undefined) {
                    fc.pages[page._id.$id] = {
                      stage: stage,
                      page: page
                    };
                  }
                  /*jslint nomen: false*/
                }
              }
            }

            if (fc.pages[pageId]) {
              return fc.pages[pageId];
            }
          },

          /**
           * Creates a dictionary of values for a grouplet against the original id.
           *
           * @param key
           * @param value
           */
          saveOriginalGroupletValue = function (key, value) {
            var parts, groupletId, fieldId;

            if (key.indexOf(fc.constants.prefixSeparator) > -1) {
              parts = key.split(fc.constants.prefixSeparator);
              if (parts.length > 1) {
                // Retrieve the grouplet id second from the end
                groupletId = parts[parts.length - 2];
                fieldId = parts[parts.length - 1];

                if (fc.fields[groupletId] === undefined) {
                  setVirtualValue(groupletId, {});
                }

                if (typeof fc.fields[groupletId] === 'object') {
                  fc.fields[groupletId][fieldId] = value;
                }
              }
            }
          },

          /**
           * Convert a string to boolean logic.
           * @param logic string
           * @return string
           */
          getBooleanLogic = function (logic) {
            if (typeof logic === 'string' && logic.isJson()) {
              return toBooleanLogic($.parseJSON(logic));
            }

            return logic;
          },

          /**
           * Converts an object to a literal boolean object string.
           * @param obj
           * @returns {*}
           */
          toBooleanLogic = function (obj) {
            var condition = '',
              x,
              rule,
              comparison,
              compare = '',
              json,
              comparisonCondition;

            if (!obj) {
              return;
            }

            // If its a string, attempt to convert to json and return
            if (typeof obj === "string") {
              if (obj.isJson()) {
                return toBooleanLogic($.parseJSON(obj));
              }

              // Assume already boolean logic
              return obj;
            }

            if (obj.condition !== undefined) {
              compare = obj.condition.toLowerCase() === 'and' ? ' && ' : ' || ';
            }

            if (typeof obj.rules === 'object') {
              condition += '(';
              for (x = 0; x < obj.rules.length; x += 1) {
                rule = obj.rules[x];

                if (rule.condition !== undefined) {
                  comparisonCondition = rule.condition.toLowerCase() === 'and' ? ' && ' : ' || ';
                } else {
                  comparisonCondition = compare;
                }

                // Optimise the AND/OR clause
                if (comparisonCondition === 0) {
                  // Default to AND condition
                  comparisonCondition = ' && ';
                }
                if (x === 0) {
                  comparisonCondition = '';
                }

                // If have a comparison, add it to our condition string
                if (typeof rule.field === 'string' && rule.value !== undefined) {
                  // Comparison function to call
                  comparison = 'fc.comparison';
                  if (typeof rule.operator === 'string' && rule.operator.length > 0) {
                    comparison += rule.operator.charAt(0).toUpperCase() + rule.operator.slice(1);
                  }

                  // Attempt to typecast to object from string
                  if (typeof rule.value === 'string' && ['[', '{'].indexOf(rule.value.substring(0, 1)) > -1) {
                    try {
                      json = $.parseJSON(rule.value);
                      rule.value = json;
                    } catch (ignore) {
                    }
                  }

                  // If object, cast to JSON string
                  if (typeof rule.value === 'object') {
                    rule.value = JSON.stringify(rule.value);
                  } else if (typeof rule.value === 'string') {
                    rule.value = '"' + rule.value + '"';
                  }

                  condition += comparisonCondition + comparison + '(getValue("' + rule.field + '"), ' + rule.value + ', "' + rule.field + '")';
                }

                // If have nested rules, call recursively
                if (typeof rule.rules === 'object' && rule.rules.length > 0) {
                  condition += (x > 0 ? compare : '') + toBooleanLogic(rule);
                }
              }
              condition += ')';
            }

            return condition;
          },

          /**
           * Update schema definitions for a set of fields
           * @param fields
           */
          updateFieldSchemas = function (fields) {
            var iterator, field, id, a, jsonDecode = ['visibility', 'validators'], toBoolean = ['visibility'], grouplet;

            if (typeof fields === 'object' && $.isArray(fields) && fields.length > 0) {
              for (iterator = 0; iterator < fields.length; iterator += 1) {
                field = fields[iterator];
                id = getId(field);

                // Add to field schema if doesn't already exist
                if (fc.fieldSchema[id] === undefined) {
                  // Decode configuration strings to json objects as required
                  for (a = 0; a < jsonDecode.length; a += 1) {
                    if (field.config[jsonDecode[a]] !== undefined && field.config[jsonDecode[a]].length > 0) {
                      field.config[jsonDecode[a]] = $.parseJSON(field.config[jsonDecode[a]]);

                      // Whether or not the object needs to be converted to boolean logic
                      if (toBoolean.indexOf(jsonDecode[a]) >= 0) {
                        field.config[jsonDecode[a]] = toBooleanLogic(field.config[jsonDecode[a]], true);
                      }
                    }
                  }

                  fc.fieldSchema[id] = field;
                }

                // If the field is a grouplet, need to recursively update the field schema
                if (field.type === "grouplet") {
                  grouplet = getConfig(field, 'grouplet', {field: []});
                  updateFieldSchemas(grouplet.field);
                }
              }
            }
          },

          /**
           * Initialise data analytics
           */
          initAnalytics = function () {
            fc.domContainer.on(fc.jsEvents.onAnalyticsLoaded, function () {
              fc.analytics = fcAnalytics;
              fc.analytics.init();
            });
            loadJsFile(analyticsUrl());
          },

          /**
           * Update field schema (object stores the configuration of each field for easy access)
           * @param stage
           */
          updateFieldSchema = function (stage) {
            var jsonDecode = ['visibility', 'validators'],
              toBoolean = ['visibility'],
              x,
              y,
              key,
              page,
              configKey,
              section,
              a;

            if (stage.page !== undefined) {
              // Iterate through each page
              for (x = 0; x < stage.page.length; x += 1) {
                page = stage.page[x];
                if (page.section === undefined) {
                  continue;
                }

                // Convert page to conditions to JS boolean logic
                if (typeof page.toCondition === 'object' && Object.keys(page.toCondition).length > 0) {
                  for (key in page.toCondition) {
                    if (page.toCondition.hasOwnProperty(key)) {
                      try {
                        page.toCondition[key] = toBooleanLogic($.parseJSON(page.toCondition[key]));
                      } catch (ignore) {
                      }
                    }
                  }
                }

                // Iterate through each section
                for (y = 0; y < page.section.length; y += 1) {
                  section = page.section[y];
                  if (section.field === undefined || section.field.length === 0) {
                    continue;
                  }

                  // Are any object keys required to be decoded to a json object?
                  for (a = 0; a < jsonDecode.length; a += 1) {
                    configKey = jsonDecode[a];
                    if (typeof section[configKey] === 'string') {
                      try {
                        section[configKey] = $.parseJSON(section[configKey]);
                      } catch (ignore) {
                      }
                    }
                  }

                  // Are any object keys required to be converted to boolean logic?
                  for (a = 0; a < toBoolean.length; a += 1) {
                    if (typeof section[toBoolean[a]] === 'object') {
                      section[toBoolean[a]] = toBooleanLogic(section[toBoolean[a]]);
                    }
                  }

                  // Append to object sections dictionary
                  if (fc.sections[getId(section)] === undefined) {
                    fc.sections[getId(section)] = section;
                  }

                  // Iterate through each field
                  updateFieldSchemas(section.field);
                }
              }
            }
          },

          /**
           * Retrieves list of tags from a grouplet (used for templating)
           * @param fieldId
           * @returns {*}
           */
          getGroupletTags = function (fieldId) {
            var schema = fc.fieldSchema[fieldId],
              field,
              tags = {},
              counter,
              localField,
              tag;

            if (schema === undefined || schema.type !== "grouplet") {
              return [];
            }

            // Iterate through each field in the grouplet, if it has a tag, append to dict
            field = getConfig(schema, "grouplet");
            if (typeof field === "object" && field.field !== undefined && field.field.length > 0) {
              for (counter = 0; counter < field.field.length; counter += 1) {
                localField = field.field[counter];
                tag = getConfig(localField, "tag", "");
                if (tag.length > 0) {
                  /*jslint nomen: true*/
                  tags[localField._id.$id] = tag;
                  /*jslint nomen: false*/
                }
              }
            }

            return tags;
          },

          /**
           * Returns an array of values next to field's associated tags. Used for templating.
           *
           * @param row
           * @param tags
           * @returns {*}
           */
          getGroupletRowTags = function (row, tags) {
            var key, fieldIdParts, fieldId, vals = {};
            if (typeof row === "object") {
              for (key in row) {
                if (row.hasOwnProperty(key)) {
                  // If the id is prefixed (i.e. grouplet-id_field-id), retrieve the field id
                  if (key.indexOf(fc.constants.prefixSeparator) > -1) {
                    fieldIdParts = key.split(fc.constants.prefixSeparator);
                    fieldId = fieldIdParts[fieldIdParts.length - 1];
                  } else {
                    fieldId = key;
                  }

                  // If a tag exists, add it
                  if (tags.hasOwnProperty(fieldId)) {
                    vals[tags[fieldId]] = row[key];
                  } else {
                    // Otherwise default to the field id
                    vals[fieldId] = row[key];
                  }
                }
              }
            }

            return vals;
          },

          /**
           * Whether or not a lib has been queued for loading.
           * @param lib String
           * @return boolean
           */
          hasLib = function (lib) {
            if (typeof lib !== 'string' || lib.length === 0) {
              return false;
            }

            return fc.loadedLibs.indexOf(lib) >= 0;
          },

          /**
           * Scroll to an offset on the screen
           * @param offset
           */
          scrollToOffset = function (offset) {
            // If already scrolling, do nothing
            if (fc.midScroll !== undefined && fc.midScroll === true) {
              return;
            }

            fc.midScroll = true;

            $('html,body').animate({
              scrollTop: offset + "px"
            }, fc.config.scrollDuration, function () {
              fc.midScroll = false;
              fc.activeScroll = "";
            });
          },

          /**
           * Replace tokens with their value, for templating
           * @param layout
           * @param tokens
           * @returns {*}
           */
          replaceTokens = function (layout, tokens, withSpan) {
            return tokenise(layout);
          },

          /**
           * Replace tokens within a DOM element
           *
           * @param el
           * @param data
           * @returns {*}
           */
          replaceTokensInDom = function (el, data) {
            if (data === undefined || data === false) {
              data = getFieldTagValues();
            }

            if (el === undefined) {
              el = fc.domContainer;
            }

            // Perform token replacements
            el.find('span.fc-token').each(function () {
              var dataToken = $(this).attr('data-token');
              if (dataToken && dataToken.length > 0 && data[dataToken] !== undefined) {
                $(this).html(htmlEncode(data[dataToken]));
              }
            });

            return el;
          },

          /**
           * Set a language alias
           * @param to string
           * @param from string
           */
          setLanguageAlias = function(to, from) {
            if (typeof fc.languageAliasMaps === 'undefined') {
              fc.languageAliasMaps = {};
            }

            fc.languageAliasMaps[to] = from;
          },

          /**
           * Load language packs and perform additional mapping.
           * @param lang object
           */
          loadLanguagePack = function (lang) {
            fc.languagePacks = lang;

            var from, to, iterator, fromObj, toObj, parts, mappingKey, performMapping;

            if (typeof fc.languageAliasMaps === 'object' && Object.keys(fc.languageAliasMaps).length > 0) {
              for (var key in fc.languageAliasMaps) {
                if (fc.languageAliasMaps.hasOwnProperty(key)) {
                  to = key;
                  from = fc.languageAliasMaps[key];

                  // Fetch the object to map from
                  parts = from.split(fc.constants.tagSeparator);
                  fromObj = fc.languagePacks;
                  for (iterator = 0; iterator < parts.length; iterator += 1) {
                      fromObj = fromObj[parts[iterator]];
                      if (typeof fromObj === 'undefined') {
                        break;
                      }
                  }

                  // Perform the mapping
                  if (typeof fromObj !== 'undefined') {
                    parts = to.split(fc.constants.tagSeparator);
                    toObj = fc.languagePacks;
                    for (iterator = 0; iterator < parts.length; iterator += 1) {
                      mappingKey = parts[iterator];
                      if (typeof toObj[mappingKey] !== 'object') {
                        toObj[mappingKey] = {};
                      }

                      if (iterator < parts.length - 1) {
                        toObj = toObj[mappingKey];
                      }
                    }

                    toObj[mappingKey] = fromObj;
                  }
                }
              }
            }
          },

          /**
           * Get the visible fields on a page
           * @param pageId
           * @return bool|mixed
           */
          getPageVisibleFieldsFromDom = function (pageId) {
            if (typeof pageId === 'undefined') {
              pageId = fc.currentPage;
            }

            var page = fc.domContainer.find('.fc-page[data-page-id="' + pageId + '"]');

            if (page.length === 0) {
              return false;
            }

            // Build the form data array (for the current page only)
            if (page.length > 0) {
              var sections = page.find('.fc-section:not(.fc-hide)');
              if (sections.length > 0) {
                var fields = sections.find('.fc-field:not(.fc-hide) [formcorp-data-id]');

                return fields.length === 0 ? false : fields;
              }
            }

            return false;
          },

          /**
           * Returns the amount of values in a repeatable grouplet
           * @param fieldId
           * @returns {*}
           */
          groupletLength = function (fieldId) {
            var val = fc.fields[fieldId];
            if ($.isArray(val)) {
              return val.length;
            }

            return 0;
          },

          /**
           * Whether a price is a formula and not static.
           *
           * @param price
           * @returns {boolean}
           */
          isFormula = function (price) {
            var prefixLength = fc.constants.formulaPrefix.length;
            return price.length > prefixLength && price.substr(0, prefixLength).toLowerCase() === fc.constants.formulaPrefix.toLowerCase();
          },

          /**
           * Returns a field id by a human readable tag.
           *
           * @param tag
           * @returns {T}
           */
          fieldIdByTag = function (tag) {
            var fieldTags = getAllFieldTags();

            return Object.keys(fieldTags).filter(function (key) {
              return fieldTags[key] === tag
            })[0];
          },

          /**
           * Returns the meta value for the content radio list field.
           * @param fieldId
           * @param metaKey
           * @returns *
           */
          getContentRadioListMeta = function (fieldId, metaKey) {
            var val = getValue(fieldId, ""),
              schema = fc.fieldSchema[fieldId],
              options = getConfig(schema, 'options', '').split("\n"),
              iterator,
              json,
              meta,
              lineItemValue;

            if (val === undefined || val === "") {
              return "";
            }


            if ($.isArray(options)) {
              for (iterator = 0; iterator < options.length; iterator += 1) {
                if (options[iterator].isJson()) {
                  json = $.parseJSON(options[iterator]);
                  lineItemValue = json[0];

                  if (typeof lineItemValue === 'string' && lineItemValue === val) {
                    if (typeof json[5] === 'object') {
                      meta = json[5];
                      if (meta[metaKey] !== undefined) {
                        return meta[metaKey];
                      }
                    }
                  }
                }
              }
            }
          },

          /**
           * Shuffle (randomise) an array
           * @param arr array
           * @return array
           */
          shuffle = function (arr) {
            var currentIndex = arr.length, temporaryValue, randomIndex;

            while (0 !== currentIndex) {
              randomIndex = Math.floor(Math.random() * currentIndex);
              currentIndex -= 1;

              temporaryValue = arr[currentIndex];
              arr[currentIndex] = arr[randomIndex];
              arr[randomIndex] = temporaryValue;
            }

            return arr;
          },

          /**
           * Retrieve a variable from the hash in the URL
           * @param prefix
           * @returns string
           */
          getHashVar = function (prefix, defaultVal) {
            var hash = window.location.hash,
              start = hash.indexOf(prefix),
              end;

            // Set a default value
            if (typeof defaultVal === 'undefined') {
              defaultVal = '';
            }

            // If the prefix wasn't found, return the default value
            if (start < 0) {
              return defaultVal;
            }

            start += prefix.length;
            end = hash.indexOf(fc.config.hashSeparator, start);

            if (end < 0) {
              // No prefix found, default to hash length
              end = hash.length;
            }

            return hash.substring(start, end);
          },

          /**
            * Set a hash variable
            * @param prefix string
            * @param value string
            * @param updateHash boolean
            * @returns string
            */
          setHashVar = function (prefix, value, updateHash) {
            var currentHash = window.location.hash,
              updatedHash = currentHash,
              start, end,
              startString = '', endString = '';

            // Default update hash to true
            if (typeof updateHash !== 'boolean') {
              updateHash = true;
            }

            if (getHashVar(prefix).length === 0) {
              // Currently doesn't exist in the hash
              if (currentHash.length > 0) {
                updatedHash += fc.config.hashSeparator;
              }

              updatedHash += prefix + value;
            } else {
              // Exists, need to do a replacement
              start = updatedHash.indexOf(prefix) + prefix.length,
              end = updatedHash.indexOf(fc.config.hashSeparator, start);

              startString = updatedHash.substr(0, start);
              if (end >= 0) {
                endString = updatedHash.substr(start + getHashVar(prefix).length);
              }

              updatedHash = startString + value + endString;
            }

            if (updateHash) {
              // Force update the hash if necessary
              window.location.hash = updatedHash;
            }

            return updatedHash;
          },

          /**
           * Removes a hash variable from the URL
           * @param prefix string
           */
          removeHashVar = function (prefix) {
            var updatedHash = setHashVar(prefix, "", false).replace(prefix, '');
            window.location.hash = updatedHash;
          },

          /**
           *
           * @param formula
           * @returns {*
           */
          formulaToPrice = function (formula) {
            if (isFormula(formula)) {
              formula = formula.substr(fc.constants.formulaPrefix.length);
            }

            try {
              return fc.parser.parse(formula).evaluate()
            } catch (ignore) {
              return 0;
            }
          },

          /**
           * Retrieve the payment amount for a credit card field, based on the default and conditional parameters
           *
           * @param fieldId
           * @returns {*}
           */
          getPaymentAmount = function (fieldId) {
            var schema, price, conditionalPrices, booleanLogic, conditionalPrice, iterator;

            // Retrieve the field schema
            schema = fc.fieldSchema[fieldId];
            if (schema === undefined) {
              return;
            }

            // Use the default price initially
            price = getConfig(schema, 'defaultPrice', 0);

            // Check to see if conditional prices were supplied and, if so iterate through them
            conditionalPrices = getConfig(schema, 'conditionalPrice', [], true);
            if (typeof conditionalPrices === "object" && conditionalPrices.length > 0) {
              for (iterator = 0; iterator < conditionalPrices.length; iterator += 1) {
                conditionalPrice = conditionalPrices[iterator];

                // If conditions passed through, check if true
                if (typeof conditionalPrice.conditions === "object") {
                  booleanLogic = toBooleanLogic(conditionalPrice.conditions);
                  if (eval(booleanLogic)) {
                    price = conditionalPrice.price;
                  }
                }
              }
            }

            // If a price is numeric, return it straight away
            if ($.isNumeric(price)) {
              return price;
            } else if (isFormula(price)) {
              // Otherwise if the price is a formula, proces it
              return formulaToPrice(price);
            }

            return price;
          },

          /**
           * Renders a repeatable table
           * @param fieldId
           * @param rows
           * @returns {string}
           */
          renderRepeatableTable = function (fieldId, rows) {
            var html = '',
              index,
              tags = getGroupletTags(fieldId),
              field = fc.fieldSchema[fieldId],
              layout = getConfig(field, fc.constants.configKeys.summaryLayout, "");

            // Requires a summary layout to work
            if (layout.length === 0) {
              return "";
            }

            // Start the html output
            html += "<div class='fc-summary-table'>";
            html += "<table class='fc-summary'><tbody>";

            // Iterate through and render each row
            for (index = 0; index < rows.length; index += 1) {
              html += "<tr><td>";
              html += replaceTokens(layout, getGroupletRowTags(rows[index], tags));
              html += "<div class='fc-summary-options' data-field-id='" + fieldId + "' data-index='" + index + "'><a href='#' class='fc-edit'>" + fc.lang.edit + "</a> &nbsp; <a href='#' class='fc-delete'>" + fc.lang.delete + "</a></div>";
              html += "</td></tr>";
            }
            html += "</tbody></table>";

            html += '</div>';
            return html;
          },

          /**
           * Returns true if a field is repeatable.
           *
           * @param dataId
           * @returns {*|boolean}
           */
          fieldIsRepeatable = function (dataId) {
            var fieldSchema = fc.fieldSchema[dataId];

            return fieldSchema && typeof fieldSchema.config.repeatable === 'boolean' && fieldSchema.config.repeatable;
          },

          /**
           * Returns true if a field's parent is repeatable
           *
           * @param dataId
           * @returns {boolean}
           */
          fieldParentIsRepeatable = function (dataId) {
            var parts, parentId;

            parts = dataId.split(fc.constants.prefixSeparator);
            parts.pop();

            // If no parent, return false
            if (parts.length === 0) {
              return false;
            }

            parentId = parts.join(fc.constants.prefixSeparator);

            // If no schema exists for the parent, return false
            if (!fc.fieldSchema[parentId]) {
              return false;
            }

            return fieldIsRepeatable(parentId);
          },

          /**
           * Set the value of a range field type.
           * @param domObject
           */
          setRangeValue = function (domObject) {
            // On range value change
            var val = parseInt(domObject.val()),
              resultObj = domObject.parent().find('.fc-numeric-outcome');

            // If a result element was found, update it.
            if (resultObj.length > 0) {
              resultObj.html(val);
            }
          },

          /**
           * Set a value in the DOM
           *
           * @param obj
           * @param value
           */
          setDomValue = function (obj, value) {
            var fieldGroup = $(obj).find('.fc-fieldgroup'),
              valInputs = fieldGroup.find('input[type=text],input[type=tel],input[type=number],textarea,input[type=range],input[type=hidden]'),
              selector;

            if (valInputs.length > 0) {
              // Input type text
              valInputs.val(value);

              // Range, set the outcome value
              if (valInputs.attr('type') === 'range') {
                setRangeValue(valInputs);
              }
            } else if (fieldGroup.find('select').length > 0) {
              // Select box
              fieldGroup.find('select').val(value);
            } else if (fieldGroup.find('input[type=radio]').length > 0) {
              // Radio options
              fieldGroup.find('input[value="' + value + '"]').prop('checked', true);
            } else {
              // Set the button
              selector = fieldGroup.find('.fc-fieldinput.fc-button[data-value="' + encodeURIComponent(value) + '"]');
              if (selector.length > 0) {
                selector.addClass('checked');
              }
            }
          },

          /**
           * Set a field in the DOM with value stored in member object
           * @param obj
           * @param fieldId
           */
          setFieldValue = function (obj, fieldId) {
            log('setFieldValue');
            log(obj);
            log(fieldId);
            var value,
              schema = fc.fieldSchema[fieldId],
              iterator,
              el,
              defaultValue,
              populateFromId,
              populateValue,
              unrestorableFieldTypes = ['emailVerification', 'smsVerification'];

            // If no value found, try and use default
            value = getValue(fieldId);

            if (value === undefined && schema !== undefined) {
              // If the pre-populate from config option is set, try to populate from that field
              populateFromId = getConfig(schema, 'populateFrom', '');
              if (populateFromId.length > 0 && !$.isNumeric(populateFromId)) {
                if (fc.fields[populateFromId] !== undefined) {
                  value = fc.fields[populateFromId];
                }
              }

              // Otherwise use the default
              if (value === undefined) {
                defaultValue = getConfig(schema, 'default', '');
                if (defaultValue.length > 0) {
                  value = defaultValue;
                }
              }
            }

            // If a value was found, set the value in the DOM
            if (value !== undefined) {
              schema = fc.fieldSchema[fieldId];

              // Check to see if the value shouldn't be restored
              if (unrestorableFieldTypes.indexOf(schema.type) >= 0) {
                return;
              }

              // If read-only and a default value set, use it
              if (getConfig(schema, 'readOnly', false)) {
                value = getConfig(schema, 'defaultValue', '');
              }

              if (schema.type === 'grouplet' && !fieldIsRepeatable(fieldId)) {
                log('restore grouplet that isnt repeatable');
              } else if (fieldIsRepeatable(fieldId)) {
                // Restore a repeatable value
                if (getConfig(schema, 'renderRepeatableTable', false) && typeof value === 'object') {
                  $('[fc-data-group="' + fieldId + '"] .fc-summary').html(renderRepeatableTable(fieldId, value));
                }
              } else if (schema.type === 'contentRadioList') {
                if (typeof value === 'object') {
                  // Checkbox list allows multiple selections
                  for (iterator = 0; iterator < value.length; iterator += 1) {
                    el = $('.fc-button[data-field-value="' + encodeURIComponent(value[iterator]) + '"]');
                    if (el && el.length > 0) {
                      el.addClass('checked');
                    }
                  }
                } else {
                  // Radio list allows only one selection
                  el = $('.fc-button[data-field-value="' + encodeURIComponent(value) + '"]');
                  if (el && el.length > 0) {
                    el.addClass('checked');
                  }
                }
              } else if (schema.type === 'matrix') {
                loadMatrixFieldValues(fieldId, value);
              } else if (schema.type === 'fileUpload') {
                setDomValue(obj, value);
                if (value.length > 2) {
                  buildFileList(fieldId, value);
                }
              }
              else {
                // Otherwise set standard value in the DOM
                setDomValue(obj, value);
              }
            }
          },

          /**
           * Set values on DOM from fields in JS.
           * @param rootElement
           */
          setFieldValues = function (rootElement) {
            var fieldId;

            // If no root element found, default (by default will therefore set values on the entire form)
            if (rootElement === undefined) {
              rootElement = fc.domContainer;
            }

            // Iterate through each field and set a value
            rootElement.find('div[fc-data-group]').each(function () {
              fieldId = $(this).attr('fc-data-group');
              setFieldValue(this, fieldId);
            });
          },

          /**
           * Render a text field.
           * @param field
           * @returns {string}
           */
          renderTextfield = function (field, prefix) {
            if (prefix === undefined) {
              prefix = "";
            }

            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
              fieldId = prefix + getId(field),
              html = '',
              type = 'text';

            // Render a password field if appropriate
            if (getConfig(field, 'isPassword', false)) {
              type = 'password';
            }

            html = '<input class="fc-fieldinput" type="' + type + '" formcorp-data-id="' + fieldId + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '">';

            return html;
          },

          /**
           * Render a dropdown field.
           * @param field
           * @returns {string}
           */
          renderDropdown = function (field, prefix) {
            if (prefix === undefined) {
              prefix = "";
            }

            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
              fieldId = prefix + field._id.$id,
              html = '<select class="fc-fieldinput" formcorp-data-id="' + fieldId + '" data-required="' + required + '">',
              options = getConfig(field, 'options', ''),
              optGroupOpen = false,
              x,
              option,
              label;
            /*jslint nomen: false*/

            if (getConfig(field, 'placeholder', '').length > 0) {
              html += '<option value="" disabled selected>' + htmlEncode(getConfig(field, 'placeholder')) + '</option>';
            }

            if (options.length > 0) {
              options = options.split("\n");
              for (x = 0; x < options.length; x += 1) {
                option = options[x];
                option = option.replace(/(\r\n|\n|\r)/gm, "");
                if (option.match(/^\[\[(.*?)\]\]$/g)) {
                  // Opt group tag
                  if (optGroupOpen) {
                    html += "</optgroup>";
                  }
                  label = option.substring(2, option.length - 2);
                  html += '<optgroup label="' + label + '">';
                } else {
                  // Normal option tag
                  html += '<option value="' + htmlEncode(option) + '">' + htmlEncode(option) + '</option>';
                }
              }

              if (optGroupOpen) {
                html += '</optgroup>';
              }
            }

            html += '</select>';
            return html;
          },

          /**
           * Render a text area field.
           * @param field
           * @returns {string}
           */
          renderTextarea = function (field, prefix) {
            if (prefix === undefined) {
              prefix = "";
            }
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
              fieldId = prefix + getId(field),
              html,
              value;

            // Default value
            value = getConfig(field, 'defaultValue', '').length > 0 ? getConfig(field, 'defaultValue') : '';
            html = '<textarea';

            // Whether or not the field is read only
            if (getConfig(field, 'readOnly', false)) {
              html += ' readonly';
            }

            html += ' class="fc-fieldinput" formcorp-data-id="' + fieldId + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '" rows="' + getConfig(field, 'rows', 3) + '">' + htmlEncode(value) + '</textarea>';
            return html;
          },

          /**
           * Render the content radio list
           * @param field
           * @param prefix
           * @returns {string}
           */
          renderContentRadioList = function (field, prefix) {
            if (!prefix) {
              prefix = '';
            }

            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
              options = getConfig(field, 'options', ''),
              fieldId = prefix + getId(field),
              html = '',
              x,
              cssClass,
              option,
              checked,
              json,
              value,
              description,
              help,
              icon,
              htmlClass,
              meta;

            if (options.length > 0) {
              options = options.split("\n");
              cssClass = getConfig(field, 'inline', false) === true ? 'fc-inline' : 'fc-block';

              html += '<div class="fc-col-' + htmlEncode(getConfig(field, 'boxesPerRow')) + '">';

              // Display as buttons
              for (x = 0; x < options.length; x += 1) {
                option = options[x].replace(/(\r\n|\n|\r)/gm, "");
                if (option.length === 0) {
                  continue;
                }

                // Decode to a json object literal
                description = "";
                help = "";
                value = "";
                icon = "";
                htmlClass = "";
                meta = {};

                // Attempt to convert to json object, continue if can not
                try {
                  json = $.parseJSON(option);
                } catch (ignore) {
                  continue;
                }

                // Map to local variables
                try {
                  value = json[0] || "";
                  description = json[1] || "";
                  icon = json[2] || "";
                  help = json[3] || "";
                  htmlClass = json[4] || "";
                  meta = json[5] || {};

                  if (typeof meta !== 'object') {
                    meta = {};
                  }
                } catch (ignore) {
                }

                checked = getConfig(field, 'default') === option ? ' checked' : '';

                html += '<div class="fc-content-radio-item fc-col ' + htmlClass + '">';
                html += '<div class="fc-content-title">' + htmlEncode(value) + '</div>'; //!fc-content-title
                html += '<div class="fc-content-content">';
                html += '<div class="fc-content-desc">' + description + '</div>'; //!fc-content-desc
                html += '<div class="fc-content-icon"><i class="' + htmlEncode(icon) + '"></i></div>'; //!fc-content-icon
                html += '<div class="fc-option-buttons ' + cssClass + '">';
                html += '<button class="fc-fieldinput fc-button" id="' + getId(field) + '_' + x + '" formcorp-data-id="' + fieldId + '" data-value="' + encodeURIComponent(option) + '" data-field-value="' + encodeURIComponent(value) + '" data-required="' + required + '"' + checked + '>' + htmlEncode(getConfig(field, 'buttonText')) + '</button>';

                if (!fc.config.helpAsModal && help && help.length > 0) {
                  html += '<div class="fc-help">';
                  html += help;
                  html += '</div>';
                }

                html += '</div>'; // !fc-content-content
                html += '</div>'; //!fc-option-buttons
                html += '</div>'; //!fc-content-radio-item
              }


              html += '<div class="fc-clear"></div>'; // Clear the boxes

              html += '</div>'; //!fc-col-x
            }

            return html;
          },

          /**
           * Render an option table
           *
           * @param field
           * @param prefix
           * @returns {string}
           */
          renderOptionTable = function (field, prefix) {
            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
              definition = getConfig(field, 'jsonOptions', '[]'),
              fieldId = prefix + field._id.$id,
              checked,
              html = '',
              rowIterator,
              columnIterator,
              row,
              col;
            /*jslint nomen: false*/

            // Attempt to decode to JSON object
            if (typeof definition === 'string') {
              definition = $.parseJSON(definition);
            }

            if (!definition || !definition.rows) {
              return '';
            }

            html += '<table class="fc-table"';
            if (definition.cellspacing) {
              html += ' cellspacing="' + htmlEncode(definition.cellspacing) + '"';
            }

            if (definition.cellpadding) {
              html += ' cellpadding="' + htmlEncode(definition.cellpadding) + '"';
            }
            html += '>';

            // Iterate through and output the rows
            for (rowIterator = 0; rowIterator < definition.rows.length; rowIterator += 1) {
              row = definition.rows[rowIterator];
              html += '<tr>';

              if (typeof row === 'object' && row.length > 0) {
                for (columnIterator = 0; columnIterator < row.length; columnIterator += 1) {
                  col = row[columnIterator];

                  // Th or td element?
                  html += col.head ? '<th' : '<td';

                  // Append class as required
                  if (col.class && col.class.length > 0) {
                    html += ' class="' + htmlEncode(col.class) + '"';
                  }

                  // Colspan
                  if (col.colspan) {
                    html += 'colspan="' + htmlEncode(col.colspan) + '"';
                  }

                  html += '>';

                  // Append label
                  if (col.label) {
                    html += '<span class="fc-table-label">' + tokenise(col.label) + '</span>';
                  }

                  // Render option button
                  if (col.option) {
                    checked = getConfig(field, 'default') === col.option.value ? ' checked' : '';

                    html += '<div class="fc-option-buttons">';
                    html += '<button class="fc-fieldinput fc-button" id="' + getId(field) + '_' + rowIterator + '_' + columnIterator + '" formcorp-data-id="' + fieldId + '" data-value="' + encodeURIComponent(col.option.value) + '" data-field-value="' + encodeURIComponent(col.option.value) + '" data-required="' + required + '"' + checked + '>' + htmlEncode(col.option.text) + '</button>';
                    html += '</div>';
                  }

                  html += col.head ? '</th>' : '</td>';
                }
              }

              html += '</tr>';
            }

            html += '</table>';

            return html;
          },

          /**
            * Retrieve options from a field
            * @param input string|array
            * @return {object}
            */
          getOptions = function (input, random) {
            var options = {}, optionsArr = [], arr, obj;

            if (typeof random !== 'boolean') {
              random = false;
            }

            // Format string to object
            if (typeof input === 'string') {
              var optionValue, optionDisplay, parts;
              arr = input.split("\n");
              for (var x = 0; x < arr.length; x++) {
                optionValue = arr[x];
                optionDisplay = arr[x];

                if (optionValue.indexOf(fc.constants.optionValueSeparator) >= 0) {
                  // If a separate option value was supplied, need to use it instead (1|Good)
                  parts = optionValue.split(fc.constants.optionValueSeparator);
                  optionValue = parts[0];
                  optionDisplay = parts[1];
                }

                options[fc.lang.optionPrefix + optionValue] = optionDisplay.replace(/(\r\n|\n|\r)/gm, "").trim();
              }
            }

            // Move object to array with one instance in (objects can't be randomly ordered, which is a feature/option)
            for (var key in options) {
              if (options.hasOwnProperty(key)) {
                obj = {};
                obj[key.trim()] = options[key];
                optionsArr.push(obj);
              }
            }

            if (random) {
              // Randomise the array if needed
              optionsArr = shuffle(optionsArr);
            }

            return random ? shuffle(optionsArr) : optionsArr;
          },

          /**
           * Render a radio list.
           * @param field
           * @returns {string}
           */
          renderRadioList = function (field, prefix) {
            if (prefix === undefined) {
              prefix = "";
            }

            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
              options = getOptions(getConfig(field, 'options', ''), getConfig(field, 'randomiseOptions', false)),
              fieldId = prefix + field._id.$id,
              key,
              html = '',
              cssClass,
              x,
              option,
              id,
              json,
              savedValue,
              htmlItems = [],
              iterator,
              tmpHtml,
              checked,
              value,
              isChecked;
            /*jslint nomen: false*/

            savedValue = fc.fields[fieldId];

            // Determine the css class to use
            cssClass = getConfig(field, 'inline', false) === true ? 'fc-inline' : 'fc-block';

            // Iterate through each option
            x = 0;
            if (typeof options === 'object' && $.isArray(options) && options.length > 0) {
              if (getConfig(field, 'asButton', false)) {
                 html += '<div class="fc-radio-option-buttons">';
              }

              for (iterator = 0; iterator < options.length; iterator += 1) {
                option = options[x];

                if (typeof option === 'object') {
                  for (key in option) {
                    if (option.hasOwnProperty(key)) {
                      id = prefix + getId(field) + '_' + x++;
                      value = htmlEncode(key.trim().substr(fc.lang.optionPrefix.length));
                      checked = value == savedValue || getConfig(field, 'default') === option ? ' checked' : '';

                      if (getConfig(field, 'asButton', false)) {
                        tmpHtml = '<div class="fc-option-buttons ' + cssClass + '">';
                        tmpHtml += '<button class="fc-fieldinput fc-button" id="' + id + '" formcorp-data-id="' + fieldId + '" data-value="' + value + '" data-required="' + required + '"' + checked + '>' + htmlEncode(option[key]) + '</button>';
                        tmpHtml += '</div>';
                      } else {
                        tmpHtml = '<div class="' + cssClass + '">';
                        tmpHtml += '<input class="fc-fieldinput" type="radio" id="' + id + '" formcorp-data-id="' + fieldId + '" name="' + fieldId + '" value="' + value + '" data-required="' + required + '"' + checked + '>';
                        tmpHtml += '<label title="' + htmlEncode(option[key]) + '" for="' + id + '"><span><i>&nbsp;</i></span><em>' + htmlEncode(option[key]) + '</em><span class="fc-end-radio-item"></span></label>';
                        tmpHtml += '</div>';
                      }

                      if (fc.mode !== formcorp.MODE_REVIEW || checked) {
                        htmlItems.push(tmpHtml);
                      }
                    }
                  }
                }
              }
            }

            html += htmlItems.join('');
            if (getConfig(field, 'asButton', false)) {
               html += '</div>';
            }

            return html;
          },

          /**
           * Render a checkbox list.
           * @param field
           * @returns {string}
           */
          renderCheckboxList = function (field, prefix) {
            if (prefix === undefined) {
              prefix = "";
            }

            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
              options = getOptions(getConfig(field, 'options', ''), getConfig(field, 'randomiseOptions', false)),
              fieldId = prefix + field._id.$id,
              key,
              html = '',
              cssClass,
              iterator,
              x,
              option,
              id,
              json,
              savedValues = [],
              htmlItems = [],
              finalKey,
              tmpHtml;
            /*jslint nomen: false*/

            // Create an array of the field's values
            if (fc.fields[fieldId] !== undefined && typeof fc.fields[fieldId] === "string") {
              try {
                json = $.parseJSON(fc.fields[fieldId]);
                savedValues = json;
              } catch (ignore) {
              }
            } else {
              savedValues = getValue(fieldId);
            }

            // Determine the css class to use
            cssClass = getConfig(field, 'inline', false) === true ? 'fc-inline' : 'fc-block';

            var checked = false;

            // Iterate through each option
            x = 0;
            if (typeof options === 'object' && $.isArray(options) && options.length > 0) {
              for (iterator = 0; iterator < options.length; iterator += 1) {
                option = options[x];

                if (typeof option === 'object') {
                  for (key in option) {
                    if (option.hasOwnProperty(key)) {
                      finalKey = key.trim().substr(fc.lang.optionPrefix.length);
                      id = prefix + getId(field) + '_' + x++;

                      tmpHtml = '<div class="' + cssClass + '">';
                      tmpHtml += '<input class="fc-fieldinput" type="checkbox" id="' + id + '" formcorp-data-id="' + fieldId + '" name="' + fieldId + '[]" value="' + htmlEncode(finalKey) + '" data-required="' + required + '"';

                      if (savedValues.indexOf(finalKey) > -1) {
                        checked = true;
                        tmpHtml += ' checked="checked"';
                      } else {
                        checked = false;
                      }

                      if (fc.mode === formcorp.MODE_REVIEW) {
                        // When in review mode, should not be able to update
                        tmpHtml += ' readonly="readonly" onclick="return false;"';
                      }

                      tmpHtml += '>';
                      tmpHtml += '<label title="' + htmlEncode(option[key]) + '" for="' + id + '">';
                      tmpHtml += '<span><b><i></i><i></i></b></span><em>' + htmlEncode(option[key]) + '</em>';
                      tmpHtml += '<span class="fc-end-checkbox-item"></span>';
                      tmpHtml += '</label>';
                      tmpHtml += '</div>';

                      if (fc.mode !== formcorp.MODE_REVIEW || checked) {
                        htmlItems.push(tmpHtml);
                      }
                    }
                  }
                }
              }
            }

            return htmlItems.join('');
          },

          /**
           * Render a hidden field.
           * @param field
           * @returns {string}
           */
          renderHiddenField = function (field, prefix) {
            if (prefix === undefined) {
              prefix = "";
            }

            /*jslint nomen: true*/
            var fieldId = prefix + field._id.$id,
              html = '<input class="fc-fieldinput" type="hidden" formcorp-data-id="' + fieldId + '" value="' + getConfig(field, 'value') + '">';
            /*jslint nomen: false*/
            return html;
          },

          /**
           * Render a rich text area.
           * @param field
           * @returns {*}
           */
          renderRichText = function (field) {
            if (typeof field.config.rich !== 'string') {
              return '';
            }

            var content = replaceTokens(field.config.rich, getFieldTagValues(), true);

            return '<div class="fc-richtext">' + content + '</div>';
          },

          /**
           * Creates a dynamic form ready to send to a payment gateway
           * @param dataId
           * @param gateway
           * @param data
           * @returns {*|HTMLElement}
           */
          createDynamicFormFromData = function (dataId, gateway, data) {
            var form, input, key, schema, url;

            // Fetch the field schema
            schema = fc.fieldSchema[dataId];
            if (schema === undefined) {
              return;
            }

            // Check to see if should use the live or sandbox url
            url = getConfig(schema, 'environment', fc.environments.sandbox) === fc.environments.sandbox ? gateway.action.sandbox : gateway.action.live;

            // Instantiate the form
            form = $(document.createElement('form'));
            $(form).attr("action", url);
            $(form).attr("method", gateway.method);

            // Create the form attributes
            for (key in data) {
              if (data.hasOwnProperty(key)) {
                input = $("<input>").attr("type", "hidden").attr("name", key).val(data[key]);
                $(form).append($(input));
              }
            }


            return $(form);
          },

          /**
           * Force update of a field value and save to the data storage.
           * @param fieldId
           * @param value
           */
          forceUpdateFieldValue = function (fieldId, value) {
            log('forceUpdateFieldValue');
            log(fieldId);
            log(value);

            if (typeof fieldId === 'string' && fieldId.length > 0 && !$.isNumeric(fieldId)) {
              setVirtualValue(fieldId, value);
            }
          },

          /**
           * Send the payment request to formcorp
           * @param rootElement
           * @param gateway
           * @returns {boolean}
           */
          initPaycorpGateway = function (rootElement, gateway) {
            var data, form, month, cardType, cardNumber;

            // Ensure the client id is all good
            if (gateway.vars === undefined || typeof gateway.vars.clientId !== "string" || gateway.vars.clientId.length === 0) {
              log("Malformed paycorp client id");
            }

            // Format the month
            month = rootElement.find('.fc-cc-expirydate-month').val();
            if (month.length === 1) {
              month = '0' + month;
            }

            // Retrieve the card number and type
            cardNumber = rootElement.find('.fc-cc-number input').val().replace(/[^0-9]+/g, "");
            switch (getCreditCardType(cardNumber)) {
              case fc.cardTypes.mastercard:
                cardType = 'MASTERCARD';
                break;
              case fc.cardTypes.visa:
                cardType = 'VISA';
                break;
              case fc.cardTypes.amex:
                cardType = 'AMEX';
                break;
              default:
                cardType = 'MASTERCARD';
            }

            // Prepare the data to send to paycorp
            data = {
              clientIdHash: gateway.vars.clientId,
              cardType: cardType,
              cardHolderName: rootElement.find('.fc-cc-name input').val(),
              cardNo: cardNumber,
              cardExpiryMM: month,
              cardExpiryYYYY: rootElement.find('.fc-cc-expirydate-year').val(),
              cardSecureId: rootElement.find('.fc-cc-ccv input').val().replace(/[^0-9]+/g, ""),
              paymentAmount: getPaymentAmount(rootElement.attr('fc-data-group')),
              metaData1: rootElement.attr('fc-data-group'),
              metaData2: fc.sessionId
            };

            // Automatically generate a form
            form = createDynamicFormFromData(rootElement.attr('fc-data-group'), fc.gateways.paycorp, data);
            form.submit();

            return false;
          },

          /**
           * Register the event listeners for processing credit card payments
           */
          registerCreditCardListeners = function () {
            // Button to process a payment
            fc.domContainer.on('click', '.fc-submit-payment .fc-btn', function () {
              var dataObjectId, rootElement, gateway, schema, localErrors;

              // Retrieve the field id the payment form belongs to
              dataObjectId = $(this).attr('data-for');
              if (dataObjectId === undefined) {
                return false;
              }
              // Fetch the root credit card instance
              rootElement = $('[fc-data-group="' + dataObjectId + '"]');
              if (rootElement.length === 0) {
                return false;
              }

              // Fetch the field schema
              schema = fc.fieldSchema[dataObjectId];
              if (schema === undefined) {
                return false;
              }

              // Validate the payment form before going any further
              localErrors = validCreditCardField(dataObjectId, schema, rootElement.parent());
              // If have errors, output
              if (localErrors.length > 0) {
                // Log error event
                logEvent(fc.eventTypes.onFieldError, {
                  fieldId: dataObjectId,
                  errors: localErrors
                });

                // Show the error and return
                removeFieldSuccess(dataObjectId);
                showFieldError(dataObjectId, localErrors);
                return false;
              } else {
                showFieldSuccess(dataObjectId);
                removeFieldError(dataObjectId);
              }

              removeFieldError(dataObjectId);

              // What gateway to use
              gateway = getConfig(schema, 'paymentGateway', {}, true);
              if (typeof gateway.gateway !== "string") {
                return false;
              }

              // What to do?
              switch (gateway.gateway) {
                case "paycorp":
                  initPaycorpGateway(rootElement, gateway);
                  break;
                default:
                  log("No gateway to use");
                  break;
              }

              return false;
            });

            fc.processedActions[fc.processes.creditCardListeners] = true;
          },

          /**
           * Render the payment summary table
           * @param field
           * @returns {string}
           */
          renderPaymentSummary = function (field) {
            var html, price;

            price = parseFloat(getPaymentAmount(getId(field))).toFixed(2);

            html = "<div class='fc-table-summary'>";

            // Render the payment summary title as required
            if (getConfig(field, 'paymentSummaryTitle', '').length > 0) {
              html += '<label>' + htmlEncode(getConfig(field, 'paymentSummaryTitle', '')) + '</label>';
            }

            // Render the payment summary description as required
            if (getConfig(field, 'paymentSummaryDescription', '').length > 0) {
              html += '<label>' + getConfig(field, 'paymentSummaryDescription', '') + '</label>';
            }

            html += '<table class="fc-table fc-summary"><thead><tr>';
            html += '<th>' + fc.lang.description + '</th><th class="fc-total">' + fc.lang.total + '</th></tr></thead>';

            // Table body
            html += '<tbody>';
            ;

            // Include the gst?
            if (getConfig(field, 'includeGST', false)) {
              // Show the GST (3 line items)
              html += '<tr><td>' + fc.lang.paymentDescription + '<em class="fc-text-right fc-right">' + fc.lang.paymentSubTotal + '</em>';
              html += '</td><td>';
              html += fc.lang.currencySymbol.concat(parseFloat(price / 11 * 10).toFixed(2));
              html += '</td></tr>'

              html += '<tr><td class="fc-text-right"><em>' + fc.lang.paymentGst + '</em></td><td>';
              html += fc.lang.currencySymbol.concat(parseFloat(price / 11).toFixed(2)) + '</td></tr>';
              html += '<tr><td class="fc-text-right"><em>' + fc.lang.paymentTotal + '</em></td><td>' + fc.lang.currencySymbol.concat(price) + '</td></tr>';
            } else {
              // Show a single line item
              html += '<tr><td>' + fc.lang.paymentDescription + '<em class="fc-text-right fc-right">' + fc.lang.paymentTotal + '</em>';
              html += '</td><td>';
              html += fc.lang.currencySymbol.concat(price);
              html += '</td></tr>'
            }


            html += '</tbody>';
            html += '</table>';
            html += '</div>';
            /*!fc-table-summary*/

            return html;
          },

          /**
           * Render a credit card form
           * @param field
           * @returns {string}
           */
          renderCreditCard = function (field) {
            var html = '',
              month,
              year,
              currentYear = (new Date()).getFullYear(),
              fieldValue,
              error;

            // Render the payment summary
            if (getConfig(field, 'showPaymentSummary', false)) {
              html += renderPaymentSummary(field);
            }

            // Render the label
            html += '<div class="fc-creditCard-header">';
            if (getConfig(field, 'showLabel', false) === true && getConfig(field, 'label', '').length > 0) {
              // Show the label
              html += '<label>' + htmlEncode(getConfig(field, 'label'));

              // Option to show labels on required fields
              if (fc.config.asterisksOnLabels && getConfig(field, 'required', false)) {
                html += '<span class="fc-required-caret">' + fc.lang.requiredAsterisk + '</span>';
              }

              // Option: show a colon after the label
              if (fc.config.colonAfterLabel) {
                html += fc.lang.labelColon;
              }

              html += '</label>';
            }

            if (getConfig(field, 'label', '').length > 0) {
              // Show the description
              html += getConfig(field, 'description');
            }

            html += '</div>';
            /*!fc-creditCard-header*/


            // Retrieve the field value and check to see if it's completed
            fieldValue = fc.fields[getId(field)];
            if (fieldValue !== undefined && fieldValue['success'] == true) {
              return html += renderCompletedPayment(fieldValue);
            }

            // If an error was passed through, check
            error = fc.getUrlParameter(fc.config.creditCardErrorUrlParam);
            if (error !== undefined && error.length > 0) {
              html += '<div class="fc-error"><label>' + htmlEncode(error) + '</label></div>';
            }

            // Register the credit card event listeners if not already done so
            if (!processed(fc.processes.creditCardListeners)) {
              registerCreditCardListeners();
            }

            if (getConfig(field, 'paymentGateway', '', true)["gateway"] === 'securepay') {
              renderSecurePayIFrame(field)
              return html += '<div class="fc-securepay-iframe"></div>';
            }

            // Initialise basic components
            html += '<div class="fc-payment">';
            html += '<div class="fc-cc-name"><label>' + fc.lang.creditCardNameText + '</label><input type="text" class="fc-fieldinput"></div>';
            html += '<div class="fc-cc-number"><label>' + fc.lang.creditCardNumberText + '</label><input type="text" class="fc-fieldinput"></div>';

            // Render the expiry dates
            html += '<div class="fc-cc-expirydate"><label>' + fc.lang.creditCardExpiryDateText + '</label>';
            html += '<select class="fc-cc-expirydate-month"><option value="" disabled selected>Please select...</option>';
            for (month = 1; month <= 12; month += 1) {
              html += '<option value="' + month + '">' + fc.lang.monthNames[month - 1] + '</option>';
            }
            html += '</select>';

            html += '<select class="fc-cc-expirydate-year"><option value="" disabled selected>Please select...</option>';
            for (year = currentYear; year <= currentYear + 20; year += 1) {
              html += '<option value="' + year + '">' + year + '</option>';
            }
            html += '</select></div>';

            // Render the security code
            html += '<div class="fc-cc-ccv">';
            html += '<label>' + fc.lang.creditCardSecurityCodeText + '</label><input type="text" class="fc-fieldinput">';
            if (fc.config.cvvImage === null) {
              html += '<img src="' + cdnUrl() + '/img/cvv.gif" alt="cvv">';
            }
            html += '</div>';

            // Render the pay now button
            html += '<div class="fc-submit-payment">';
            html += '<input class="fc-btn" data-for="' + getId(field) + '" type="submit" value="' + fc.lang.payNow + '"><div class="fc-loading fc-hide"></div>';
            html += '</div>';

            html += '</div>';
            /*!fc-payment*/
            return html;
          },

          /**
           * Render a SecurePay IFrame
           */
          renderSecurePayIFrame = function (field) {
            var html = '',
              fingerprint,
              fp_timestamp,
              amount,
              merchant_id,
              primary_ref,
              currency,
              display_receipt,
              return_url,
              return_url_text,
              return_url_target,
              confirmation,
              template,
              page_header_image,
              page_title,
              page_style_url,
              display_cardholder_name,
              txn_type,
              defaultprice,
              url;

            // Calculate price to send up
            defaultprice = getConfig(field, 'defaultPrice');

            if (isFormula(defaultprice)) {
              amount = formulaToPrice(defaultprice);
            }

            currency = getConfig(field, 'paymentGateway', '', true)['vars']['currency'];
            if (currency === '') {
              currency = 'AUD';
            }

            display_receipt = getConfig(field, 'paymentGateway', '', true)['vars']['display_receipt'];
            if (display_receipt === '') {
              display_receipt = 'yes';
            }

            return_url = getConfig(field, 'paymentGateway', '', true)['vars']['return_url'];
            return_url_text = getConfig(field, 'paymentGateway', '', true)['vars']['return_url_text'];

            return_url_target = getConfig(field, 'paymentGateway', '', true)['vars']['return_url_target'];
            if (return_url_target === '') {
              return_url_target = 'self';
            }

            confirmation = getConfig(field, 'paymentGateway', '', true)['vars']['confirmation'];
            if (confirmation === '') {
              confirmation = 'yes';
            }

            template = getConfig(field, 'paymentGateway', '', true)['vars']['template'];
            if (template === '') {
              template = 'iframe';
            }

            page_header_image = getConfig(field, 'paymentGateway', '', true)['vars']['page_header_image'];
            page_title = getConfig(field, 'paymentGateway', '', true)['vars']['page_title'];
            page_style_url = getConfig(field, 'paymentGateway', '', true)['vars']['page_style_url'];

            display_cardholder_name = getConfig(field, 'paymentGateway', '', true)['vars']['display_cardholder_name'];
            if (display_cardholder_name === '') {
              display_cardholder_name = 'yes';
            }

            url = getConfig(field, 'environment', fc.environments.sandbox) === fc.environments.sandbox ? fc.gateways.securepay.action.sandbox : fc.gateways.securepay.action.live;

            // Get fingerprint, timestamp, merchant id, amount, primary_ref, txn_type from server
            api('securepay/default/index', {
              'field_id': field._id.$id,
            }, fc.gateways.securepay.method, function (data) {
              html += '<iframe scrolling="no" frameborder="0" style="width: 100%;height: 500px" src="';
              html += url;
              html += '&merchant_id=' + data.merchant_id;
              html += '&fingerprint=' + data.fingerprint;
              html += '&fp_timestamp=' + data.timestamp;
              html += '&primary_ref=' + data.primary_ref;
              html += '&amount=' + data.amount;
              html += '&txn_type=' + data.txn_type;
              html += '&currency=' + currency;
              html += '&display_receipt=' + display_receipt;
              html += '&return_url=' + return_url;
              html += '&return_url_text=' + return_url_text;
              html += '&return_url_target=' + return_url_target;
              html += '&confirmation=' + confirmation;
              html += '&template=' + template;
              html += '&page_header_image=' + page_header_image;
              html += '&page_title=' + page_title;
              html += '&page_style_url=' + page_style_url;
              html += '&display_cardholder_name=' + display_cardholder_name
              html += '"></iframe>';

              $('.fc-section [fc-data-group="' + data.fieldId + '"] .fc-securepay-iframe').append(html);

              waitForSecurePayVerification(data.fieldId);
            })

          },

          /**
           * Poll the API intermittently to see if the field has been verified (if it has, update in real time)
           * @param dataId
           */
          waitForSecurePayVerification = function (dataId) {
            // Need to poll the database intermittently and wait for verification
            api('securepay/default/verify', {fieldId: dataId}, 'POST', function (data) {
              if (typeof data === "object" && data.success !== undefined && data.success === true) {
                // The field has successfully been verified

                // Update the field with the new data
                setVirtualValue(dataId, data);

                // Remove iframe and add completed data
                $('[fc-data-group="' + dataId + '"] .fc-securepay-iframe iframe').remove();
                $('[fc-data-group="' + dataId + '"] .fc-securepay-iframe').append(renderCompletedPayment(data));

                // Try and load the next page
                fc.nextPageButtonClicked = true;
                fc.functions.loadNextPage(false);
                return;
              }

              // The field has yet to be verified, poll again
              setTimeout(function () {
                waitForSecurePayVerification(dataId);
              }, 5000);
            });
          },

          /**
           * Render a completed oayment message
           * @param fieldValue
           */
          renderCompletedPayment = function (fieldValue) {

            var html = '';

            // Successfully been completed, return a completion message
            html += '<div class="fc-payment">';
            html += '<div class="fc-success">' + fc.lang.creditCardSuccess + '</div>';
            html += '</div>';

            return html;
          },

          /**
           * Render an ABN field
           * @returns {string}
           */
          renderAbnField = function (field, prefix) {
            if (prefix === undefined) {
              prefix = "";
            }

            /*jslint nomen: true*/
            var required = typeof field.config.required === 'boolean' ? field.config.required : false,
              fieldId = prefix + field._id.$id,
              buttonClass = 'fc-button',
              html = '<input class="fc-fieldinput" type="text" formcorp-data-id="' + fieldId + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '">';
            /*jslint nomen: false*/

            // If there exists a valid saved value, hide the button
            if (fc.fields[fieldId] && fc.fields[fieldId].length > 0 && fc.validAbns.indexOf(fc.fields[fieldId]) > -1) {
              buttonClass += ' fc-hide';
            }

            // Button to validate
            html += '<a class="' + buttonClass + '">' + fc.lang.validate + '</a>';
            html += '<div class="fc-loading fc-hide"></div>';

            return html;
          },

          /**
           * Hide and reset a modal
           */
          hideModal = function () {
            fc.activeModalField = null;
            fc.modalState = null;
            fc.modalMeta = {};
            $('.fc-modal.fc-show').removeClass('fc-show');
          },

          /**
           * Verify a mobile or email
           * @param verificationCode
           * @returns {boolean}
           */
          verifyCode = function (verificationCode) {
            var schema,
              data;

            // Retrieve the field schema
            schema = fc.fieldSchema[fc.modalMeta.fieldId];
            if (schema === undefined) {
              return false;
            }

            // Send the request to the API server
            data = {
              fieldId: fc.modalMeta.fieldId,
              code: verificationCode
            };

            // Perform the API request
            $('.fc-modal .modal-footer .fc-loading').removeClass('fc-hide');
            $('.fc-modal .modal-footer .fc-error').html('').addClass('fc-hide');
            api('verification/verify', data, 'POST', function (data) {
              if (typeof data !== "object" || data.success === undefined) {
                $('.fc-modal .modal-footer .fc-error').html('An unknown error occurred communicating with the API server').removeClass('fc-hide');
              } else if (!data.success && typeof data.message === "string") {
                $('.fc-modal .modal-footer .fc-error').html(data.message).removeClass('fc-hide');
              } else if (data.success) {
                if (typeof data === 'object' && typeof data.verificationCode === 'string' && data.verificationCode.length > 0) {
                  // The field was successfully verified
                  $('[fc-data-group="' + fc.modalMeta.fieldId + '"]').addClass('fc-verified');
                  setVirtualValue(fc.modalMeta.fieldId, data.verificationCode);

                  valueChanged(fc.modalMeta.fieldId, data.verificationCode, true);
                  hideModal();
                }
              }

              $('.fc-modal .modal-footer .fc-loading').addClass('fc-hide');
            });
          },

          /**
           * Verify the user email input
           * @returns {boolean}
           */
          verifyEmailAddress = function () {
            verifyCode($('.fc-email-verification-submit input[type=text], .fc-email-verification-submit input[type=tel], .fc-email-verification-submit input[type=number]').val());
          },

          /**
           * Show the email verification modal
           * @param fieldId
           * @returns {boolean}
           */
          showEmailVerificationModal = function (fieldId) {
            // Configure the modal
            fc.modalState = fc.states.EMAIL_VERIFICATION_CODE;
            fc.modalMeta = {
              fieldId: fieldId
            };

            var modalBody = '<p>To verify your email, input the code sent to your e-mail address in the area below, and click the \'Verify email\' button.</p>';
            modalBody += '<div class="fc-email-verification-submit"><input class="fc-fieldinput" type="text" placeholder="Enter verification code..."></div>';

            // Update the modal html and show it
            $('.fc-modal .modal-header h2').text("Success!");
            $('.fc-modal .modal-body').html(modalBody);
            $('.fc-modal .modal-footer .fc-btn-add').text("Verify").show();
            $('.fc-modal').addClass('fc-show');
            return false;
          },

          /**
           * Poll the API intermittently to see if the field has been verified (if it has, update in real time)
           * @param dataId
           */
          waitForVerification = function (dataId) {
            // Need to poll the database intermittently and wait for verification
            api('verification/is-verified', {fieldId: dataId}, 'POST', function (data) {
              if (typeof data === "object" && data.success !== undefined && data.success === true) {
                // The field has successfully been verified
                $('[fc-data-group="' + dataId + '"]').addClass('fc-verified');

                setVirtualValue(dataId, '1');
                hideModal();
                return;
              }

              // The field has yet to be verified, poll again
              setTimeout(function () {
                waitForVerification(dataId);
              }, 5000);
            });
          },

          /**
           * Set the value in the application and the DOM
           * @param fieldId string
           * @param value {*}
           * @param updateDom boolean
           */
          setValue = function (fieldId, value, updateDom) {
            log('setValue(' + fieldId + ',' + value + ',' + updateDom + ')');
            if (typeof updateDom !== 'boolean') {
              updateDom = true;
            }

            // Update the application value
            forceUpdateFieldValue(fieldId, value);

            // Update the value in the DOM as required
            if (updateDom) {
              var target = fc.domContainer.find('div[fc-data-group="' + fieldId + '"]');
              if (target.length > 0) {
                setDomValue(target, value);
              }
            }

            // Call the internal function
            valueChanged(fieldId, value, true);
          },

          /**
           * Register the email verification event listeners
           */
          registerEmailVerificationListeners = function () {
            // Send an email to the user
            fc.domContainer.on('click', '.fc-email-verification .fc-send-email input[type=submit]', function () {
              var elParent = $(this).parent(),
                data,
                fieldId;

              elParent.find('.fc-loading').removeClass('fc-hide');
              elParent.parent().addClass('loading');
              fieldId = elParent.parent().attr('fc-belongs-to');

              // Data to send with the request
              data = {
                field: fieldId
              };

              // Send the api callback
              api('verification/callback', data, 'POST', function (data) {
                elParent.find('.fc-loading').addClass('fc-hide');
                elParent.parent().removeClass('loading');

                // On successful request, load a dialog to input the code
                if (typeof data === "object" && data.success !== undefined && data.success) {
                  showEmailVerificationModal(fieldId);
                  waitForVerification(fieldId);
                }
              });

              return false;
            });

            // Inline e-mail verification
            fc.domContainer.on('click', '.fc-email-verification.fc-verify-inline .fc-email-verification-verify', function () {
              var data,
                obj = $(this),
                parent = obj.parent().parent(),
                fieldId = parent.attr('fc-belongs-to'),
                el = parent.find('input[type="text"], input[type="tel"], input[type="number"]'),
                val = el.val();

              if (val.length === 0) {
                parent.addClass('error');
                el.attr('placeholder', fc.lang.verificationErrorPrefix + fc.lang.verificationEmptyCode)
                return;
              }

                // Send the request to the API server
              data = {
                fieldId: fieldId,
                code: val
              };

              // Reset the element and container
              parent.removeClass('error').addClass('loading');
              el.attr('placeholder', '');

              // Perform the API request
              api('verification/verify', data, 'POST', function (data) {
                if (typeof data === 'object') {
                  var message = data.message || "";

                  parent.removeClass('loading');
                  el.val("").attr('placeholder', fc.lang.verificationErrorPrefix + message);

                  if (typeof data !== "object" || data.success === undefined) {
                    // An unknown error occurred
                    parent.addClass('error');
                  } else if (!data.success && typeof data.message === "string") {
                    parent.addClass('error');
                  } else if (data.success) {
                    // The field was successfully verified
                    $('[fc-data-group="' + fieldId + '"]').addClass('fc-verified');
                    setVirtualValue(fieldId, data.verificationCode);
                    valueChanged(fieldId, data.verificationCode, true);
                  }

                  $('.fc-modal .modal-footer .fc-loading').addClass('fc-hide');
                }
              });

              return false;
            });

            // Open the modal
            fc.domContainer.on('click', '.fc-email-verification-modal', function () {
              var dataId = $(this).attr('data-for');
              showEmailVerificationModal(dataId);

              return false;
            });

            fc.processedActions[fc.processes.emailListeners] = true;
          },

          /**
           * Render the email verification field
           * @param field
           * @returns {string}
           */
          renderEmailVerification = function (field) {
            // Register the email verification event listeners if required
            if (!processed(fc.processes.emailListeners)) {
              registerEmailVerificationListeners();
            }

            // Start formatting the html to output
            var html = '',
              fieldValue = fc.fields[getId(field)],
              verified = validVerificationResult(fieldValue),
              buttonText = getConfig(field, 'sendButtonText', ''),
              verificationButtonText = getConfig(field, 'verificationButtonText', ''),
              verifyClass

            // Default button text
            if (buttonText.length === 0) {
              buttonText = fc.lang.sendEmail;
            }

            // If not verified, show the form to verify
            if (!verified) {
              verifyClass = getConfig(field, 'renderAsModal', true) ? 'fc-verify-as-modal' : 'fc-verify-inline';
              html += '<div class="fc-email-verification ' + verifyClass + '" fc-belongs-to="' + getId(field) + '">';

              // Display the verification button text
              if (getConfig(field, 'renderAsModal', true) && verificationButtonText.length > 0) {
                html += '<div class="fc-verify-email"><input class="fc-btn fc-email-verification-modal" data-for="' + getId(field) + '" type="submit" value="' + verificationButtonText + '"></div>';
              } else {
                html += '<div class="fc-verify-email-input-code"><input type="text" class="fc-verify-email-input fc-fieldinput" value=""></div>';
                html += '<div class="fc-verify-email-button"><input class="fc-btn fc-email-verification-verify" data-for="' + getId(field) + '" type="submit" value="' + fc.lang.verify + '"></div>';
              }

              html += '<div class="fc-send-email">';
              html += '<input class="fc-btn" type="submit" value="' + buttonText + '"><div class="fc-loading fc-hide"></div>';
              html += '</div>';

              html += '<div class="fc-clear"></div>';
              html += '</div>';
              /*!fc-email-verification*/
            }

            // Success text
            html += '<div class="fc-success' + (verified ? ' fc-force-show' : '') + '">';
            html += fc.lang.fieldValidated;
            html += '</div>';
            /*!fc-success*/

            // Auto send the email
            if (!verified && fieldValue === undefined && getConfig(field, 'autoDeliverOnFirstRender', false)) {
              // Send the api callback to deliver the email
              api('verification/callback', {field: getId(field)}, 'POST', function (data) {
                // On successful request, load a dialog to input the code
                if (typeof data === "object" && data.success !== undefined && data.success) {
                  // If the user has opted to automatically show the modal dialog after e-mail delivery, show it
                  if (getConfig(field, 'autoShowModalDialog', false)) {
                    showEmailVerificationModal(getId(field));
                  }

                  // Wait for verification asynchronously in the background
                  waitForVerification(getId(field));

                  // Update the field value
                  forceUpdateFieldValue(getId(field), '0');
                }
              });
            }

            return html;
          },

          /**
           * Verify the mobile phone number
           * @returns {boolean}
           */
          verifyMobileNumber = function () {
            verifyCode($('.fc-sms-verification-submit input[type=text], .fc-sms-verification-submit input[type=tel], .fc-sms-verification-submit input[type=number]').val());
          },

          /**
           * Show the email verification modal
           * @param fieldId
           * @returns {boolean}
           */
          showSmsVerificationModal = function (fieldId) {
            // Configure the modal
            fc.modalState = fc.states.SMS_VERIFICATION_CODE;
            fc.modalMeta = {
              fieldId: fieldId
            };

            var modalBody = '<p>To verify your mobile, input the code sent to you via SMS in the area below, and click the \'Verify mobile\' button.</p>';
            modalBody += '<div class="fc-sms-verification-submit"><input class="fc-fieldinput" type="text" placeholder="Enter verification code..."></div>';

            // Update the modal html and show it
            $('.fc-modal .modal-header h2').text("Success!");
            $('.fc-modal .modal-body').html(modalBody);
            $('.fc-modal .modal-footer .fc-btn-add').text("Verify").show();
            $('.fc-modal').addClass('fc-show');
            return false;
          },

          /**
           * Register the event listeners for SMS verifications
           */
          registerSmsVerificationListeners = function () {
            // Send an email to the user
            fc.domContainer.on('click', '.fc-sms-verification .fc-send-sms input[type=submit]', function () {
              var elParent = $(this).parent(),
                data,
                fieldId;

              elParent.find('.fc-loading').removeClass('fc-hide');
              elParent.parent().addClass('loading');
              fieldId = elParent.parent().attr('fc-belongs-to');

              // Data to send with the request
              data = {
                field: fieldId
              };

              // Send the api callback
              api('verification/callback', data, 'POST', function (data) {
                elParent.find('.fc-loading').addClass('fc-hide');
                elParent.parent().removeClass('loading');

                // On successful request, load a dialog to input the code
                if (typeof data === "object" && data.success !== undefined && data.success) {
                  if (fc.config.verificationModal) {
                    showSmsVerificationModal(fieldId);
                  }
                  waitForVerification(fieldId);
                }
              });

              return false;
            });

            // Inline SMS verification
            fc.domContainer.on('click', '.fc-sms-verification.fc-verify-inline .fc-sms-verification-verify', function () {
              var data,
                obj = $(this),
                parent = obj.parent().parent(),
                fieldId = parent.attr('fc-belongs-to'),
                el = parent.find('input[type="text"], input[type="tel"], input[type="number"]'),
                val = el.val();

              if (val.length === 0) {
                parent.addClass('error');
                el.attr('placeholder', fc.lang.verificationErrorPrefix + fc.lang.verificationEmptyCode)
                return;
              }

                // Send the request to the API server
              data = {
                fieldId: fieldId,
                code: val
              };

              // Reset the element and container
              parent.removeClass('error').addClass('loading');
              el.attr('placeholder', '');

              // Perform the API request
              api('verification/verify', data, 'POST', function (data) {
                if (typeof data === 'object') {
                  var message = data.message || "";

                  parent.removeClass('loading');
                  el.val("").attr('placeholder', fc.lang.verificationErrorPrefix + message);

                  if (typeof data !== "object" || data.success === undefined) {
                    // An unknown error occurred
                    parent.addClass('error');
                  } else if (!data.success && typeof data.message === "string") {
                    parent.addClass('error');
                  } else if (data.success) {
                    // The field was successfully verified
                    if (fieldId === 'preVerification') {
                        // Pre-verification is a special use case
                        preVerificationComplete();
                    } else {
                      $('[fc-data-group="' + fieldId + '"]').addClass('fc-verified');
                      setVirtualValue(fieldId, data.verificationCode);
                      valueChanged(fieldId, data.verificationCode, true);
                    }
                  }

                  $('.fc-modal .modal-footer .fc-loading').addClass('fc-hide');
                }
              });

              return false;
            });


            // Open the modal
            fc.domContainer.on('click', '.fc-sms-verification-modal', function () {
              var dataId = $(this).attr('data-for');
              showSmsVerificationModal(dataId);

              return false;
            });

            fc.processedActions[fc.processes.smsListeners] = true;
          },

          /**
           * Render the sms verification field
           * @param field
           * @returns {string}
           */
          renderSmsVerification = function (field) {
            // Register the email verification event listeners if required
            if (!processed(fc.processes.smsListeners)) {
              registerSmsVerificationListeners();
            }

            /// Start formatting the html to output
            var html = '',
              fieldValue = fc.fields[getId(field)],
              verified = validVerificationResult(fieldValue),
              verifyClass = getConfig(field, 'renderAsModal', true) ? 'fc-verify-as-modal' : 'fc-verify-inline',
              verificationButtonText = getConfig(field, 'verificationButtonText', '');

            // If not verified, show the form to verify
            if (!verified) {
              html += '<div class="fc-sms-verification ' + verifyClass + '" fc-belongs-to="' + getId(field) + '">';

              // Display the verification button text
              if (getConfig(field, 'renderAsModal', true) && verificationButtonText.length > 0) {
                html += '<div class="fc-verify-sms"><input class="fc-btn fc-sms-verification-modal" data-for="' + getId(field) + '" type="submit" value="' + verificationButtonText + '"></div>';
              } else {
                html += '<div class="fc-sms-loader fc-loader"></div>';
                html += '<div class="fc-verify-sms-input-code"><input type="tel" class="fc-verify-sms-input fc-fieldinput" value=""></div>';
                html += '<div class="fc-verify-sms-button"><input class="fc-btn fc-sms-verification-verify" data-for="' + getId(field) + '" type="submit" value="' + fc.lang.verify + '"></div>';
              }

              html += '<div class="fc-send-sms">';
              html += '<input class="fc-btn" type="submit" value="' + fc.lang.sendSms + '"><div class="fc-loading fc-hide"></div>';

              if (getConfig(field, 'renderAsModal', false)) {
                html += '<div class="fc-clear fc-verification-options">';
                html += '<p><small>Already have a verification code? Click <a href="#" class="fc-sms-verification-modal" data-for="' + getId(field) + '">here</a> to validate.</small></p>';
                html += '</div>';
              }

              html += '</div>';

              html += '</div>';
              /*!fc-email-verification*/
            }

            // Success text
            html += '<div class="fc-success' + (verified ? ' fc-force-show' : '') + '">';
            html += fc.lang.fieldValidated;
            html += '</div>';
            /*!fc-success*/

            // Auto send the SMS
            if (!verified && fieldValue === undefined && getConfig(field, 'autoDeliverOnFirstRender', false)) {
              // Send the api callback to deliver the email
              api('verification/callback', {field: getId(field)}, 'POST', function (data) {
                // On successful request, load a dialog to input the code
                if (typeof data === "object" && data.success !== undefined && data.success) {
                  // If the user has opted to automatically show the modal dialog after e-mail delivery, show it
                  if (getConfig(field, 'autoShowModalDialog', false)) {
                    showEmailVerificationModal(getId(field));
                  }

                  // Wait for verification asynchronously in the background
                  waitForVerification(getId(field));

                  // Update the field value
                  forceUpdateFieldValue(getId(field), '0');
                }
              });
            }

            return html;
          },

          /**
           * Render a string on the review table
           *
           * @param field
           * @param value
           * @returns {string}
           */
          renderReviewTableString = function (field, value) {
            var html = "", json, iterator, val;

            // If field not properly initialised, return nothing
            if (field === undefined || !field.type) {
              return '';
            }

            // Do not render for particular types
            if (["emailVerification", "smsVerification", "signature", "creditCard"].indexOf(field.type) > -1) {
              return '';
            }

            // Do not render for readonly fields
            if (getConfig(field, 'readOnly', false)) {
              return '';
            }

            html += "<tr><td>" + getShortLabel(field) + "</td><td>";

            // If a string, output safely
            if (['[', '{'].indexOf(value.substring(0, 1)) > -1) {
              try {
                json = $.parseJSON(value);
                value = json;
              } catch (ignore) {
              }
            }

            // If string, output
            if (typeof value === "string") {
              if(field.config.class) {
                html += '<span class="' + field.config.class + '">' + htmlEncode(value) + '</span>';
              } else {
                html += htmlEncode(value);
              }
            } else if (typeof value === "object") {
              html += "<ul class='fc-list'>";
              for (iterator = 0; iterator < value.length; iterator += 1) {
                val = value[iterator];
                html += "<li>" + htmlEncode(val) + "</li>";
              }
              html += "</ul>";
            }

            html += "</td></tr>";

            return html;
          },

          /**
           * Render an array'd value for the review table
           *
           * @param field
           * @param value
           */
          renderReviewTableArray = function (field, value) {
            var html = "", iterator, parts, key, fieldId, schema;

            // Array - repeatable grouplet
            for (iterator = 0; iterator < value.length; iterator += 1) {
              if (typeof value[iterator] === "object") {
                html += "<tr><th colspan='2'>" + htmlEncode(getShortLabel(field)) + "</th></tr>";

                for (key in value[iterator]) {
                  if (value[iterator].hasOwnProperty(key)) {
                    if (value[iterator][key].length > 0) {
                      if (key.indexOf(fc.constants.prefixSeparator) > -1) {
                        parts = key.split(fc.constants.prefixSeparator);
                        fieldId = parts[parts.length - 1];
                      } else {
                        fieldId = key;
                      }

                      var schema = fc.fieldSchema[fieldId];
                      if (typeof schema === 'undefined') {
                        // Unable to find the schema directly, iterate through the object and map
                        for (var groupletKey in field.config.grouplet.field) {
                          if (field.config.grouplet.field.hasOwnProperty(groupletKey)) {
                            var fieldObj = field.config.grouplet.field[groupletKey];
                            var fieldObjId = getId(fieldObj);
                            if (typeof fc.fieldSchema[fieldObjId] === 'undefined') {
                              fc.fieldSchema[fieldObjId] = fieldObj;
                            }
                          }
                        }
                      }
                      schema = fc.fieldSchema[fieldId];

                      html += "<tr><td>" + getShortLabel(fc.fieldSchema[fieldId]);

                      html += "</td><td><span class=\"" + fc.fieldSchema[fieldId].config.class + "\">" + htmlEncode(value[iterator][key]) + "</span></td></tr>";
                    }
                  }
                }
              }
            }

            return html;
          },

          renderReviewTableGrouplet,
          renderSummaryField,

          /**
           * Render the review table
           * @param fieldId
           * @returns {*}
           */
          renderReviewTable = function (fieldId) {
            var html, stageIterator, stage, pageIterator, page, sectionIterator, section, fieldIterator, field, pageHtml, fieldHtml;

            html = '<div class="fc-form-summary fc-review-table">';
            html += '<table class="fc-table"><thead><tr><th class="fc-field-col">Field</th><th>Value</th></tr></thead><tbody>';

            // Loop through every page, output every field that has a value
            for (stageIterator = 0; stageIterator < fc.schema.stage.length; stageIterator += 1) {
              stage = fc.schema.stage[stageIterator];

              // Confirm the stage has a set of pages
              if (stage === undefined || stage.page === undefined || typeof stage.page !== "object") {
                continue;
              }

              // Iterate through each page
              for (pageIterator = 0; pageIterator < stage.page.length; pageIterator += 1) {
                page = stage.page[pageIterator];

                // Confirm the page has a set of sections
                if (page === undefined || page.section === undefined || typeof page.section !== "object") {
                  continue;
                }

                pageHtml = "";

                // Iterate through each page section
                for (sectionIterator = 0; sectionIterator < page.section.length; sectionIterator += 1) {
                  section = page.section[sectionIterator];

                  // Ensure the section has a set of fields
                  if (section === undefined || section.field === undefined || typeof section.field !== "object") {
                    continue;
                  }

                  // Iterate through each field
                  for (fieldIterator = 0; fieldIterator < section.field.length; fieldIterator += 1) {
                    field = section.field[fieldIterator];

                    // Fetch the field html
                    fieldHtml = $('<div></div>').append(renderSummaryField(field));

                    // Append page, section and field meta data to the container
                    if (fieldHtml.find('tr').length > 0) {
                      fieldHtml.find('tr').attr('data-page', getId(page)).attr('data-section', getId(section)).attr('data-id', getId(field));
                    }

                    pageHtml += fieldHtml.html();
                  }
                }

                // If the page rendered any fields, display it
                if (pageHtml.length > 0) {
                  html += "<tr><th colspan='2' data-page=" + getId(page) + ">" + tokenise(htmlEncode(page.label)) + "</th></tr>";
                  html += pageHtml;
                }
              }
            }

            html += '</tbody></table></div>';
            /*!fc-form-summary*/

            return html;
          },

          /**
           * Return the save queue with optional sanitisation of data
           * @param {bool} sanitise
           * @return {object}
          */
          getSaveQueue = function (sanitise) {
            if (sanitise === true) {
              Object.keys(fc.saveQueue).forEach(function (key) {
                if (key.length === 0) {
                  delete fc.saveQueue[key];
                }
              });
            }
          },

          /**
           * Returns true if a page is deemed to be a submission page
           * @param page
           * @returns {boolean}
           */
          isSubmitPage = function (page) {
            if (typeof page !== "object" || page.completion === undefined) {
              return false;
            }

            return page.completion === true || (typeof page.completion === 'string' && ["1", "true"].indexOf(page.completion.toLowerCase()) !== -1);
          },

          /**
           * Deletes a session and forces the user to fill out a new application.
           * @param changeDom
           */
          deleteSession = function (changeDom) {
            if (typeof changeDom !== 'boolean') {
              changeDom = true;
            }

            // Clear all of the intervals so queues don't keep running in the background
            for (var i = 0; i < fc.intervals.length; i += 1) {
              clearInterval(fc.intervals[i]);
            }
            fc.intervals = [];

            $.removeCookie(fc.config.sessionIdName);

            if (changeDom) {
              $(fc.jQueryContainer + ' .render').html(fc.lang.sessionExpiredHtml);
              fc.domContainer.trigger(fc.jsEvents.onFormExpired);
            }
            fc.expired = true;
          },

          /**
           * Intermittently check to see if the user has timed out
           */
          timeout = function () {
            if (fc.config.timeUserOut !== true) {
              return;
            }

            var timeSinceLastActivity = (new Date()).getTime() - fc.lastActivity,
              sessionExtension;

            if (timeSinceLastActivity > (fc.config.timeOutAfter * 1000)) {
              // The user's session has expired
              deleteSession();
            } else if (timeSinceLastActivity > (fc.config.timeOutWarning * 1000)) {
              // Display a warning to the user to see if they want to extend their session
              sessionExtension = confirm('Your session is about to expire. Do you want to extend your session?');
              timeSinceLastActivity = (new Date()).getTime() - fc.lastActivity;

              if (sessionExtension === true && timeSinceLastActivity < (fc.config.timeOutAfter * 1000)) {
                api('page/ping', {}, 'put', function (data) {
                  if (typeof data === "object" && data.success === true) {
                    fc.lastActivity = (new Date()).getTime();
                  }
                });
              } else {
                // The user waited too long before extending their session
                deleteSession();
              }
            }
          },

          /**
           * Given an input field, will traverse through the DOM to find the next form element
           *
           * @param currentField
           * @param mustBeEmpty
           * @returns {*}
           */
          nextVisibleField = function (currentField, mustBeEmpty) {
            var foundField = false,
              foundId;

            // Only return fields whose value isnt empty
            if (typeof mustBeEmpty !== 'boolean') {
              mustBeEmpty = true;
            }

            // Iterate through visible fields
            $('.fc-section:not(.fc-hide) div.fc-field:not(.fc-hide)').each(function () {
              var id = $(this).attr('fc-data-group');

              if (!foundField && id === currentField) {
                foundField = true;
                return;
              }

              // If the field has been found, return the next
              if (foundField && !foundId) {
                if (mustBeEmpty && !fc.fields[id]) {
                  foundId = id;
                  return;
                }

                if (!mustBeEmpty) {
                  foundId = id;
                }
              }
            });

            return foundId;
          },

          /**
           * Sooth scroll to a page
           * @param pageId
           */
          smoothScrollToPage = function (pageId) {
            var offset,
              pageDiv;

            // If the last edited field disables scrolling, do not scroll
            if (fc.lastCompletedField && fc.fieldSchema[fc.lastCompletedField] && !getConfig(fc.fieldSchema[fc.lastCompletedField], 'allowAutoScroll', true)) {
              return;
            }

            // Only want to scroll once
            if (fc.activeScroll.length > 0) {
              return;
            }
            fc.activeScroll = pageId;

            pageDiv = $('.fc-page:last');
            if (pageDiv.length > 0 && pageDiv.attr('data-page-id') === pageId) {
              offset = parseInt(pageDiv.offset().top, 10) + parseInt(fc.config.scrollOffset, 10);

              // If at the top of the page, apply the initial offset
              if ($(document).scrollTop() === 0) {
                offset += fc.config.initialScrollOffset;
              }

              // Apply a conditional offset
              if (fc.config.conditionalHtmlScrollOffset.class !== undefined) {
                if ($('html').hasClass(fc.config.conditionalHtmlScrollOffset.class)) {
                  offset += fc.config.conditionalHtmlScrollOffset.offset;
                }
              }

              // Scroll to the offset
              scrollToOffset(offset);
            }
          },

          /**
           * Validate an ABN
           *
           * @param dataId
           * @param abn
           * @param callback
           */
          validateAbn = function (dataId, abn, callback) {
            var
              /**
               * Initialise the ajax callback
               * @param data
               */
              initCallback = function (data) {
                if (typeof data === 'string') {
                  try {
                    data = $.parseJSON(data);
                  } catch (ignore) {
                  }
                }

                if (callback && typeof callback === 'function') {
                  callback(data);
                }
              };

            // Send the API call
            api('verification/abn', {
              abn: abn
            }, 'POST', initCallback);
          },

          /**
           * Set the field schemas on initial schema load
           * @param fields
           */
          setFieldSchemas = function (fields) {
            var iterator, value;

            if (typeof fields !== "object") {
              return;
            }

            // If a field is detected, add it
            /*jslint nomen: true*/
            if (fields.config && fields.type && fields._id && fields._id.$id) {
              fc.fieldSchema[getId(fields)] = fields;
              return;
            }
            /*jslint nomen: false*/

            if (typeof fields === 'object') {
              for (iterator in fields) {
                if (fields.hasOwnProperty(iterator)) {
                  value = fields[iterator];
                  if (typeof value === "object") {
                    setFieldSchemas(value);
                  }
                }
              }
            }
          },

          /**
           * Auto scroll to field.
           * @param fromFieldId
           * @param nextField
           */
          autoScrollToField = function (fromFieldId, nextField) {
            var el, topDistance, sessionId;

            // Scroll from one field to another section
            if (nextField !== undefined) {
              el = $('.fc-field[fc-data-group="' + nextField + '"]');

              if (el && el.length > 0) {
                sessionId = el.attr('fc-belongs-to');
                if (sessionId !== $('.fc-field[fc-data-group="' + fromFieldId + '"]').attr('fc-belongs-to')) {
                  el = $('.fc-section[formcorp-data-id="' + sessionId + '"]');
                }

                if (el && el.length > 0) {
                  topDistance = parseInt(el.offset().top, 10) + fc.config.scrollOffset;
                  if (parseInt($(document).scrollTop(), 10) < topDistance) {
                    scrollToOffset(topDistance);
                  }
                }
              }
            } else {
              // Otherwise just scroll to the field specified in the first parameter
              try {
                el = $('.fc-field[fc-data-group="' + fromFieldId + '"]');
              } catch (ignore) {
              }

              // If no element was found, try to use the first parameter sent through as an actual selector
              if (el === undefined || !el || el.length === 0) {
                el = $(fromFieldId);
              }

              if (el && el.length > 0) {
                topDistance = parseInt(el.offset().top, 10) + fc.config.scrollOffset;
                scrollToOffset(topDistance);
              }
            }
          },

          /**
           * Checks to see whether the session requires verification
           * @param {object} schema
           * @return {boolean}
           */
          sessionRequiresVerification = function (schema) {
            return typeof schema === 'object' && typeof schema.verify === 'object' && schema.verify.perform === true;
          },

          /**
           * Fetch replacement tokens
           * @return object
           */
          getTokens = function () {
            var tokens = $.extend({}, getFieldTagValues(), fc.languagePacks);

            return tokens;
          },

          /**
           * Check whether a string has tokens
           * @param str
           * @return boolean
           */
          stringHasTokens = function (str) {
            var tokens = str.match(/\{\{[a-zA-Z\_\-0-9\.]+\}\}/g);

            return typeof tokens === 'object' && $.isArray(tokens) && tokens.length > 0;
          },

          /**
           * Tokenises a string.
           *
           * @param raw
           * @param additionalTokens
           * @returns {*}
           */
          tokenise = function (raw, additionalTokens) {
            if (!additionalTokens) {
              additionalTokens = {};
            }

            var tokenisedString = raw,
              tokens = raw.match(/\{\{([a-zA-Z0-9-_.]+)\}\}/g),
              iterator = 0,
              tags = getTokens(),
              token,
              nestedTokens,
              replacement = '',
              i,
              replacementObj;

            // Iterate through each token
            if (tokens && $.isArray(tokens) && tokens.length > 0) {
              for (iterator = 0; iterator < tokens.length; iterator += 1) {
                token = tokens[iterator].replace(/[\{\}]+/g, '');

                // If there are full stops in the token, need to perform a nested look up
                nestedTokens = token.split(fc.constants.tagSeparator);
                replacementObj = tags;
                for (i = 0; i < nestedTokens.length; i++) {
                  replacementObj = replacementObj[nestedTokens[i]];
                  if (typeof replacementObj !== 'object') {
                    break;
                  }
                }

                replacement = replacementObj !== undefined ? replacementObj : '';

                // If the string has additional tokens, needs to replace recursively
                if (stringHasTokens(replacement)) {
                  replacement = tokenise(replacement);
                }

                replacement = '<span class="fc-token" data-token="' + htmlEncode(token) + '">' + replacement + '</span>';

                tokenisedString = tokenisedString.replace(new RegExp(tokens[iterator].escapeRegExp(), 'g'), replacement);
              }
            }

            return tokenisedString;
          },

          /**
           * Returns true if a field is visible
           * @param dataId
           * @returns {boolean}
           */
          fieldIsVisible = function (dataId) {
            var el;

            if (typeof dataId === 'string' && dataId.length > 0) {
              el = $('.fc-field[fc-data-group="' + dataId + '"]');
              if (el.length > 0 && !el.hasClass('fc-hide')) {
                return true;
              }
            }

            return false;
          },

          /**
           * Auto scroll to the first visible error on the page
           */
          scrollToFirstError = function () {
            var fieldErrors = fc.domContainer.find('.fc-field.fc-error'),
              dataId,
              firstError;

            // Find the first error
            if (fieldErrors.length > 0) {
              fieldErrors.each(function () {
                // If already found an error, do nothing
                if (firstError !== undefined) {
                  return;
                }
                dataId = $(this).attr('fc-data-group');

                // If the field is visible, scroll to this field
                if (fieldIsVisible(dataId)) {
                  firstError = dataId;
                }
              });
            }

            // If an error was found, scroll to it
            if (firstError !== undefined) {
              autoScrollToField(firstError);
            }
          },

          /**
           * Show the modal dialog
           * @param config
           */
          showModal = function (config) {
            var defaults = {
                addButton: true,
                body: '',
                title: fc.lang.defaultModalTitle,
                addButtonText: fc.lang.addModalText,
                closeButtonText: fc.lang.closeModalText
              },
              vars = $.extend({}, defaults, config),
              elements = {
                addButton: fc.domContainer.find('.fc-modal .modal-footer .fc-btn-add'),
                closeButton: fc.domContainer.find('.fc-modal .modal-footer .fc-btn-close')
              };

            // Toggle visibility on the add button
            if (elements.addButton.length > 0) {
              elements.addButton.html(vars.addButtonText);
              if (vars.addButton === false) {
                elements.addButton.hide();
              } else {
                elements.addButton.show();
              }
            }

            if (elements.closeButton.length > 0) {
              elements.closeButton.html(vars.closeButtonText);
            }

            // Show the title
            if (vars.title) {
              $('.fc-modal .modal-header h2').text(vars.title);
            }

            // Display the modal
            $('.fc-modal .modal-body').html(vars.body);
            $('.fc-modal').addClass('fc-show');
          },


          /**
           * Initialise all greenID field DOM elements
           */
          initGreenIdDOMFields = function () {
            if (fc.greenID === undefined) {
              return;
            }

            var greenIdFields = fc.domContainer.find('.fc-field-greenIdVerification');

            if (greenIdFields.length > 0) {
              greenIdFields.each(function () {
                var dataId = $(this).attr('fc-data-group');
                fcGreenID.initGreenIdDOMField(dataId);
              });
            }
          },

          /**
           * Initialise greenID field.
           */
          initGreenId = function () {
            var fieldId,
              hasGreenId = false,
              callbackFunctions = {},
              greenIdFields,
              value,
              searchDict,
              tmp,
              prePopulateFields;

            // If the greenID was forced by the app, attempt to load/initialise it (at the moment, when a greenID is in an iterable field.
            // there is no way to discern whether the greenID libs should be loaded. @todo: more intelligence)
            if (typeof fc.config.forceGreenID === 'boolean') {
              hasGreenId = fc.config.forceGreenID;
            } else {
              // Otherwise look throughout the schema for a greenID field - if it exists, initialise libs
              for (fieldId in fc.fieldSchema) {
                if (fc.fieldSchema.hasOwnProperty(fieldId) && fc.fieldSchema[fieldId].type === 'greenIdVerification') {
                  hasGreenId = true;
                  break;
                }
              }
            }

            // If the form field has green id verification,
            if (hasGreenId) {
              // Initialise the worker and set the event listener
              fc.domContainer.on(fc.jsEvents.onGreenIdLoaded, function () {
                fc.greenID = fcGreenID;
                fc.greenID.init();
                initGreenIdDOMFields();
              });

              loadJsFile(cdnUrl() + fc.constants.greenId.scriptPath);
            }

            // Need to pre-populate fields with values that have already been entered. This needs to cater for both iterable fieldSchema
            // and basic identification fields. If part of a repeatable iterator, need to pull the values from the source id, otherwise
            // need to just use fc.fields.
            /**
             * @param rootId
             */
            searchDict = function (rootId) {
              var dict, tmp;

              if (rootId.indexOf(fc.constants.prefixSeparator) >= 0) {
                tmp = {};
                tmp.repeatableIterator = rootId.split(fc.constants.prefixSeparator);
                if (fc.fieldSchema[tmp.repeatableIterator[0]] !== undefined) {
                  tmp.sourceField = getConfig(fc.fieldSchema[tmp.repeatableIterator[0]], 'sourceField');
                  if (fc.fields[tmp.sourceField] !== undefined && fc.fields[tmp.sourceField][tmp.repeatableIterator[1]] !== undefined) {
                    return fc.fields[tmp.sourceField][tmp.repeatableIterator[1]];
                  }
                }
              }

              return fc.fields;
            };

            /**
             * Pre-populate values in the DOM with values that have already been entered.
             * @param obj
             * @param rootId
             * @param rootSchema
             * @param updateMap
             * @param childField
             */
            prePopulateFields = function (obj, rootId, rootSchema, updateMap, childField) {
              var inputId,
                key,
                dict = searchDict(rootId);

              for (key in updateMap) {
                if (updateMap.hasOwnProperty(key)) {
                  inputId = getConfig(rootSchema, updateMap[key]);
                  value = '';
                  if (typeof dict[inputId] === 'string') {
                    childField = obj.find('.' + key);
                    if (childField.length > 0) {
                      childField.find('.fc-fieldinput').attr('value', dict[inputId]);
                    }
                  }
                }
              }
            };

            // Drivers license button clicked
            callbackFunctions.DriversLicence = function (el) {
              var id = el.attr('formcorp-data-id'),
                lastSeparatorIndex,
                rootId,
                completeId,
                rootContainer,
                rootSchema,
                optionContainer,
                containerHtml = '',
                stateOption,
                stateCallbacks = {};

              // Mark the button checked
              el.addClass('checked');

              // Fetch the root ID
              lastSeparatorIndex = id.lastIndexOf(fc.constants.prefixSeparator);
              rootId = id.substr(0, lastSeparatorIndex);

              // Fetch the root container
              rootContainer = fc.domContainer.find('.fc-field[fc-data-group="' + rootId + '"]');
              rootSchema = fc.fieldSchema[rootId];

              if (rootContainer.length === 0) {
                // Ensure a root container exists
                return;
              }

              optionContainer = rootContainer.find('.fc-greenid-options');
              if (optionContainer.length === 0) {
                // Ensure option container exists
                return;
              }

              // Render the HTML for the drivers license form
              stateOption = {
                '_id': {
                  '$id': rootId + '_state'
                },
                config: {
                  label: 'State',
                  options: ['ACT', 'NSW', 'QLD', 'SA', 'VIC', 'WA'].join("\n"),
                  placeholder: 'Please select...'
                }
              };

              containerHtml += '<h3 class="fc-header">Drivers License Verification</h3>';
              containerHtml += '<p>To verify using your drivers license, please fill out the options below. <strong>Note: </strong>not all states are currently supported.</p>';
              containerHtml += renderDropdown(stateOption);
              containerHtml += '<div class="fc-child-options" data-for="' + rootId + '"></div>';

              optionContainer.attr('class', '').addClass('fc-greenid-options fc-greenid-drivers-license').hide().html(containerHtml).slideDown();

              // Auto scroll to the field (vital for mobiles)
              autoScrollToField('.fc-field[fc-data-group="' + rootId + '"] .fc-greenid-options');

              // State callbacks
              stateCallbacks = {
                /**
                 * Australian Capital Territory
                 * @returns {*}
                 * @constructor
                 */
                ACT: function () {
                  var fields = {
                      license: {
                        '_id': {
                          '$id': rootId + '_act_license_number'
                        },
                        config: {}
                      },
                      firstName: {
                        '_id': {
                          '$id': rootId + '_act_first_name'
                        },
                        config: {}
                      },
                      surname: {
                        '_id': {
                          '$id': rootId + '_act_surname'
                        },
                        config: {}
                      },
                      dob: {
                        '_id': {
                          '$id': rootId + '_act_dob'
                        },
                        config: {}
                      },
                      tos: {
                        '_id': {
                          '$id': rootId + '_act_tos'
                        },
                        config: {}
                      }
                    },
                    html = '',
                    updateMap = {
                      'first-name': 'greenIDFirstName',
                      'surname': 'greenIDSurname',
                      'dob': 'greenIDDOB'
                    },
                    key,
                    obj,
                    childField,
                    inputId;

                  // Show the drivers license
                  html += '<div class="child-temp">';
                  html += '<div class="drivers-license fc-green-field"><label>Driver\'s license: <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.license);
                  html += '</div>';

                  // Dob
                  html += '<div class="dob fc-green-field"><label>Date of birth (DD/MM/YYYY): <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.dob);
                  html += '</div>';

                  // First name
                  html += '<div class="first-name fc-green-field"><label>First name (no middle names): <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.firstName);
                  html += '</div>';

                  // Surname
                  html += '<div class="surname fc-green-field"><label>Surname: <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.surname);
                  html += '</div>';

                  html += '<div class="fc-clear"></div>';

                  // Terms of service
                  html += '<div class="tos"><input type="checkbox" class="fc-tos" id="' + rootId + '_act_tos">';
                  html += '<label for="' + rootId + '_act_tos">&nbsp;I have read and accepted <a href="http://www.act.gov.au/privacy">ACT Government\'s privacy statement</a>.</label>';
                  html += '</div>';

                  // Button
                  html += '<div class="green-id-verify"><a class="fc-btn" href="#" data-for="' + rootId + '">Verify</a></div>';

                  html += '</div>';
                  obj = $(html);

                  // Pre-populate the values in the DOM
                  prePopulateFields(obj, rootId, rootSchema, updateMap, childField);

                  return obj.html();
                },

                /**
                 * New South Wales
                 * @returns {*}
                 * @constructor
                 */
                NSW: function () {
                  var fields = {
                      license: {
                        '_id': {
                          '$id': rootId + '_nsw_license_number'
                        },
                        config: {}
                      },
                      licenseCardNumber: {
                        '_id': {
                          '$id': rootId + '_nsw_card_number'
                        },
                        config: {}
                      },
                      surname: {
                        '_id': {
                          '$id': rootId + '_nsw_surname'
                        },
                        config: {}
                      },
                      tos: {
                        '_id': {
                          '$id': rootId + '_nsw_tos'
                        },
                        config: {}
                      }
                    },
                    html = '',
                    updateMap = {
                      'surname': 'greenIDSurname'
                    },
                    key,
                    obj,
                    childField,
                    inputId;

                  // Show the drivers license
                  html += '<div class="child-temp">';
                  html += '<div class="drivers-license fc-green-field"><label>NSW driver\'s licence number <strong><em>(front of license)</em></strong>: <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.license);
                  html += '</div>';

                  // Card number
                  if (typeof fc.helpData === 'undefined') {
                    fc.helpData = [];
                    fc.helpTitle = [];
                  }

                  var helpData = "";
                  helpData += "<div style='width: 55%; float: left;'><strong>Card ID Number</strong><br>The card ID number is located on the top left corner on the back of your license (as shown on image to the right).</div>"
                  helpData += '<img src="' + cdnUrl() + '/img/greenid/nsw_license_back.png" style="max-width: 40%; float: right;" alt="NSW Drivers License (back)">';
                  helpData += '<div style="clear: both;"></div>';
                  fc.helpData.push(helpData);
                  fc.helpTitle.push('Where is this?');

                  html += '<div class="card-number fc-green-field"><label>Card ID number <strong><em>(back of license)</em></strong>: <span class="fc-required-caret">*</span> ';
                  html += ' <a class="fc-help-link" tabindex="-1" href="#" data-for="' + (fc.helpData.length - 1) + '">where is this?</a>';
                  html += '</label>';
                  html += renderTextfield(fields.licenseCardNumber);
                  html += '</div>';

                  // Surname
                  html += '<div class="surname fc-green-field"><label>Surname: <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.surname);
                  html += '</div>';

                  html += '<div class="fc-clear"></div>';

                  // Terms of service
                  html += '<div class="tos"><input type="checkbox" class="fc-tos" id="' + rootId + '_nsw_tos">';
                  html += '<label for="' + rootId + '_nsw_tos">&nbsp;I have read and accepted <a href="http://www.rms.nsw.gov.au/onlineprivacypolicy.html">NSW Government\'s privacy statement</a>.</label>';
                  html += '</div>';

                  // Button
                  html += '<div class="green-id-verify"><a class="fc-btn" href="#" data-for="' + rootId + '">Verify</a></div>';

                  html += '</div>';

                  obj = $(html);

                  // Update values on the run
                  prePopulateFields(obj, rootId, rootSchema, updateMap, childField);

                  return obj.html();
                },

                /**
                 * Queensland
                 * @returns {*}
                 * @constructor
                 */
                QLD: function () {
                  var fields = {
                      license: {
                        '_id': {
                          '$id': rootId + '_qld_license_number'
                        },
                        config: {}
                      },
                      firstName: {
                        '_id': {
                          '$id': rootId + '_qld_first_name'
                        },
                        config: {}
                      },
                      surname: {
                        '_id': {
                          '$id': rootId + '_qld_surname'
                        },
                        config: {}
                      },
                      dob: {
                        '_id': {
                          '$id': rootId + '_qld_dob'
                        },
                        config: {}
                      },
                      tos: {
                        '_id': {
                          '$id': rootId + '_qld_tos'
                        },
                        config: {}
                      }
                    },
                    html = '',
                    updateMap = {
                      'first-name': 'greenIDFirstName',
                      'surname': 'greenIDSurname',
                      'dob': 'greenIDDOB'
                    },
                    key,
                    obj,
                    childField,
                    inputId;

                  // Show the drivers license
                  html += '<div class="child-temp">';
                  html += '<div class="drivers-license fc-green-field"><label>Driver\'s licence / customer reference number: <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.license);
                  html += '</div>';

                  // Dob
                  html += '<div class="dob fc-green-field"><label>Date of birth (DD/MM/YYYY): <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.dob);
                  html += '</div>';

                  // First name
                  html += '<div class="first-name fc-green-field"><label>First name (no middle names): <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.firstName);
                  html += '</div>';

                  // Surname
                  html += '<div class="surname fc-green-field"><label>Surname: <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.surname);
                  html += '</div>';

                  html += '<div class="fc-clear"></div>';

                  // Terms of service
                  html += '<div class="tos"><input type="checkbox" class="fc-tos" id="' + rootId + '_qld_tos">';
                  html += '<label for="' + rootId + '_qld_tos">&nbsp;I have read and accepted <a href="http://www.tmr.qld.gov.au/privacy">Queensland Transport\'s terms and conditions</a>.</label>';
                  html += '</div>';

                  // Button
                  html += '<div class="green-id-verify"><a class="fc-btn" href="#" data-for="' + rootId + '">Verify</a></div>';

                  html += '</div>';

                  obj = $(html);

                  // Update values on the run
                  prePopulateFields(obj, rootId, rootSchema, updateMap, childField);

                  return obj.html();
                },

                /**
                 * South Australia
                 * @returns {*}
                 * @constructor
                 */
                SA: function () {
                  var fields = {
                      license: {
                        '_id': {
                          '$id': rootId + '_sa_license_number'
                        },
                        config: {}
                      },
                      surname: {
                        '_id': {
                          '$id': rootId + '_sa_surname'
                        },
                        config: {}
                      },
                      dob: {
                        '_id': {
                          '$id': rootId + '_sa_dob'
                        },
                        config: {}
                      },
                      tos: {
                        '_id': {
                          '$id': rootId + '_sa_tos'
                        },
                        config: {}
                      }
                    },
                    html = '',
                    updateMap = {
                      'surname': 'greenIDSurname',
                      'dob': 'greenIDDOB'
                    },
                    key,
                    obj,
                    childField,
                    inputId;

                  // Show the drivers license
                  html += '<div class="child-temp">';
                  html += '<div class="drivers-license fc-green-field"><label>SA driver\'s licence number: <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.license);
                  html += '</div>';

                  // Dob
                  html += '<div class="dob fc-green-field"><label>Date of birth (DD/MM/YYYY): <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.dob);
                  html += '</div>';

                  // Surname
                  html += '<div class="surname fc-green-field"><label>Surname: <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.surname);
                  html += '</div>';

                  html += '<div class="fc-clear"></div>';

                  // Terms of service
                  html += '<div class="tos"><input type="checkbox" class="fc-tos" id="' + rootId + '_sa_tos">';
                  html += '<label for="' + rootId + '_sa_tos">&nbsp;I have read and accepted <a href="http://www.transport.sa.gov.au/privacy.asp">SA Government\'s privacy statement</a>.</label>';
                  html += '</div>';

                  // Button
                  html += '<div class="green-id-verify"><a class="fc-btn" href="#" data-for="' + rootId + '">Verify</a></div>';

                  html += '</div>';

                  obj = $(html);

                  // Update values on the run
                  prePopulateFields(obj, rootId, rootSchema, updateMap, childField);

                  return obj.html();
                },

                /**
                 * Victoria
                 * @returns {*}
                 * @constructor
                 */
                VIC: function () {
                  var fields = {
                      license: {
                        '_id': {
                          '$id': rootId + '_vic_license_number'
                        },
                        config: {}
                      },
                      surname: {
                        '_id': {
                          '$id': rootId + '_vic_surname'
                        },
                        config: {}
                      },
                      dob: {
                        '_id': {
                          '$id': rootId + '_vic_dob'
                        },
                        config: {}
                      },
                      address: [
                        {
                          '_id': {
                            '$id': rootId + '_vic_address_1'
                          },
                          config: {
                            placeholder: 'Address (line 1)'
                          }
                        },
                        {
                          '_id': {
                            '$id': rootId + '_vic_address_2'
                          },
                          config: {
                            placeholder: 'Address (line 2)',
                            require: false
                          }
                        },
                        {
                          '_id': {
                            '$id': rootId + '_vic_address_3'
                          },
                          config: {
                            placeholder: 'Address (line 3)',
                            require: false
                          }
                        }
                      ],
                      tos: {
                        '_id': {
                          '$id': rootId + '_vic_tos'
                        },
                        config: {}
                      }
                    },
                    html = '',
                    updateMap = {
                      'surname': 'greenIDSurname',
                      'dob': 'greenIDDOB'
                    },
                    key,
                    obj,
                    childField,
                    inputId;

                  // Show the drivers license
                  html += '<div class="child-temp">';
                  html += '<div class="drivers-license fc-green-field"><label>VIC driver\'s licence number: <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.license);
                  html += '</div>';

                  // Dob
                  html += '<div class="dob fc-green-field"><label>Date of birth (DD/MM/YYYY): <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.dob);
                  html += '</div>';

                  // Surname
                  html += '<div class="surname fc-green-field"><label>Surname: <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.surname);
                  html += '</div>';

                  html += '<div class="fc-clear"></div>';

                  // Address
                  html += '<div class="fc-clear"></div>';
                  html += '<div class="address_vic fc-green-field"><label>Address as shown on licence: <span class="fc-required-caret">*</span></label>';
                  html += '<div class="vic_address_1">' + renderTextfield(fields.address[0]) + '</div>';
                  html += '<div class="vic_address_2">' + renderTextfield(fields.address[1]) + '</div>';
                  html += '<div class="vic_address_3">' + renderTextfield(fields.address[2]) + '</div>';
                  html += '</div>';

                  html += '<div class="fc-clear"></div>';

                  // Terms of service
                  html += '<div class="tos"><input type="checkbox" class="fc-tos" id="' + rootId + '_vic_tos">';
                  html += '<label for="' + rootId + '_vic_tos">&nbsp;I have read and accepted <a href="https://www.vicroads.vic.gov.au/website-terms/privacy">VicRoads\' privacy statement</a>.</label>';
                  html += '</div>';

                  html += '<div class="fc-clear"></div>';

                  // Button
                  html += '<div class="green-id-verify"><a class="fc-btn" href="#" data-for="' + rootId + '">Verify</a></div>';

                  html += '</div>';

                  obj = $(html);

                  // Update values on the run
                  prePopulateFields(obj, rootId, rootSchema, updateMap, childField);

                  return obj.html();
                },

                /**
                 * Western Australia
                 * @returns {*}
                 * @constructor
                 */
                WA: function () {
                  var fields = {
                      license: {
                        '_id': {
                          '$id': rootId + '_wa_license_number'
                        },
                        config: {}
                      },
                      dob: {
                        '_id': {
                          '$id': rootId + '_wa_dob'
                        },
                        config: {}
                      },
                      expiry: {
                        '_id': {
                          '$id': rootId + '_wa_dob'
                        },
                        config: {}
                      },
                      tos: {
                        '_id': {
                          '$id': rootId + '_wa_tos'
                        },
                        config: {}
                      }
                    },
                    html = '',
                    updateMap = {
                      'dob': 'greenIDDOB'
                    },
                    key,
                    obj,
                    childField,
                    inputId;

                  // Show the drivers license
                  html += '<div class="child-temp">';
                  html += '<div class="drivers-license fc-green-field"><label>WA driver\'s licence number: <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.license);
                  html += '</div>';

                  // Dob
                  html += '<div class="dob fc-green-field"><label>Date of birth (DD/MM/YYYY): <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.dob);
                  html += '</div>';

                  // Expiry
                  html += '<div class="expiry fc-green-field"><label>Expiry (DD/MM/YYYY): <span class="fc-required-caret">*</span></label>';
                  html += renderTextfield(fields.expiry);
                  html += '</div>';

                  html += '<div class="fc-clear"></div>';

                  // Terms of service
                  html += '<div class="tos"><input type="checkbox" class="fc-tos" id="' + rootId + '_wa_tos">';
                  html += '<label for="' + rootId + '_wa_tos">&nbsp;I have read and accepted <a href="http://www.transport.wa.gov.au/aboutus/our-website.asp">WA Government\'s privacy statement</a>.</label>';
                  html += '</div>';

                  html += '<div class="fc-clear"></div>';

                  // Button
                  html += '<div class="green-id-verify"><a class="fc-btn" href="#" data-for="' + rootId + '">Verify</a></div>';

                  html += '</div>';

                  obj = $(html);

                  // Update values on the run
                  prePopulateFields(obj, rootId, rootSchema, updateMap, childField);

                  return obj.html();
                }
              };

              // State on click event
              fc.domContainer.on('change', '.fc-greenid-drivers-license > select', function () {
                var selectValue = $(this).val(),
                  subContainerHtml = '';

                if (selectValue === null) {
                  return;
                }

                // If the state has a callback function, trigger it for the HTML and output
                if (typeof stateCallbacks[selectValue] === 'function') {
                  // Set the current state of greenID verification
                  fc.greenID.currentState = 'state' + selectValue;

                  // Update the container HTML
                  subContainerHtml = stateCallbacks[selectValue]();
                  if (typeof containerHtml === 'string') {
                    optionContainer.find('.fc-child-options').hide().html(subContainerHtml).slideDown();
                  }
                }

                return false;
              });
            };

            // Passport button clicked
            callbackFunctions.Passport = function (el) {
              var id = el.attr('formcorp-data-id'),
                rootId,
                lastSeparatorIndex,
                rootContainer,
                rootSchema,
                optionContainer,
                containerHtml = '',
                fields,
                html = '<div class="fc-passport">',
                updateMap = {
                  'given-name': 'greenIDFirstName',
                  'middle-names': 'greenIDMiddleName',
                  'family-name': 'greenIDSurname',
                  'dob': 'greenIDDOB'
                },
                key,
                obj,
                childField,
                inputId,
                countries = {
                  '1': 'AUSTRALIA',
                  '5': 'AFGHANISTAN',
                  '272': 'ALAND ISLANDS',
                  '8': 'ALBANIA',
                  '69': 'ALGERIA',
                  '14': 'AMERICAN SAMOA',
                  '9': 'ANDORRA',
                  '6': 'ANGOLA',
                  '7': 'ANGUILLA',
                  '15': 'ANTARCTICA',
                  '17': 'ANTIGUA AND BARBUDA',
                  '12': 'ARGENTINA',
                  '13': 'ARMENIA',
                  '4': 'ARUBA',
                  '18': 'AUSTRIA',
                  '19': 'AZERBAIJAN',
                  '27': 'BAHAMAS',
                  '26': 'BAHRAIN',
                  '24': 'BANGLADESH',
                  '34': 'BARBADOS',
                  '262': 'BECHUANALAND*',
                  '29': 'BELARUS',
                  '21': 'BELGIUM',
                  '30': 'BELIZE',
                  '22': 'BENIN',
                  '31': 'BERMUDA',
                  '36': 'BHUTAN',
                  '32': 'BOLIVIA',
                  '28': 'BOSNIA AND HERZEGOVINA',
                  '39': 'BOTSWANA',
                  '38': 'BOUVET ISLAND',
                  '33': 'BRAZIL',
                  '113': 'BRITISH INDIAN OCEAN TERRITITORY (CHAGOS ARCH.)',
                  '35': 'BRUNEI',
                  '25': 'BULGARIA',
                  '23': 'BURKINA FASO',
                  '37': 'BURMA*',
                  '20': 'BURUNDI',
                  '40': 'BYELORUSSIA*',
                  '126': 'CAMBODIA',
                  '48': 'CAMEROON',
                  '42': 'CANADA',
                  '54': 'CAPE VERDE',
                  '60': 'CAYMAN ISLANDS',
                  '41': 'CENTRAL AFRICAN REPUBLIC',
                  '219': 'CHAD',
                  '45': 'CHILE',
                  '46': 'CHINA',
                  '59': 'CHRISTMAS ISLAND',
                  '43': 'COCOS KEELING ISLANDS',
                  '52': 'COLOMBIA',
                  '53': 'COMOROS',
                  '50': 'CONGO',
                  '49': 'CONGO (DEMOCRATIC REPUBLIC OF THE)',
                  '51': 'COOK ISLANDS',
                  '55': 'COSTA RICA',
                  '107': 'CROATIA',
                  '58': 'CUBA',
                  '61': 'CYPRUS',
                  '62': 'CZECH REPUBLIC',
                  '56': 'CZECHOSLOVAKIA*',
                  '263': 'DAHOMEY*',
                  '67': 'DENMARK',
                  '267': 'DJIBOUTI',
                  '66': 'DOMINICA',
                  '68': 'DOMINICAN REPUBLIC',
                  '264': 'EAST PAKISTAN*',
                  '70': 'ECUADOR',
                  '71': 'EGYPT',
                  '205': 'EL SALVADOR',
                  '96': 'EQUATORIAL GUINEA',
                  '72': 'ERITREA',
                  '75': 'ESTONIA',
                  '76': 'ETHIOPIA',
                  '79': 'FALKLAND ISLANDS (MALVINAS)',
                  '81': 'FAROE ISLANDS',
                  '78': 'FIJI',
                  '77': 'FINLAND',
                  '80': 'FRANCE',
                  '265': 'FRENCH ALGERIA*',
                  '101': 'FRENCH GUIANA',
                  '190': 'FRENCH POLYNESIA',
                  '16': 'FRENCH SOUTHERN TERRITORIES',
                  '65': 'FRENCH TERRITORY OF AFARS AND ISSAS*',
                  '83': 'GABON',
                  '94': 'GAMBIA',
                  '89': 'GEORGIA',
                  '266': 'GERMAN EAST AFRICA*',
                  '63': 'GERMANY (DEMOCRATIC REPUBLIC OF)*',
                  '64': 'GERMANY (FEDERAL REPUBLIC OF)',
                  '90': 'GHANA',
                  '91': 'GIBRALTAR',
                  '97': 'GREECE',
                  '99': 'GREENLAND',
                  '98': 'GRENADA',
                  '93': 'GUADELOUPE',
                  '102': 'GUAM',
                  '100': 'GUATEMALA',
                  '276': 'GUERNSEY',
                  '92': 'GUINEA',
                  '95': 'GUINEA BISSAU',
                  '103': 'GUYANA',
                  '108': 'HAITI',
                  '105': 'HEARD AND MCDONALD ISLANDS',
                  '106': 'HONDURAS',
                  '104': 'HONG KONG SAR',
                  '109': 'HUNGARY',
                  '117': 'ICELAND',
                  '112': 'INDIA',
                  '111': 'INDONESIA',
                  '115': 'IRAN',
                  '116': 'IRAQ',
                  '114': 'IRELAND',
                  '277': 'ISLE OF MAN',
                  '118': 'ISRAEL',
                  '119': 'ITALY',
                  '47': 'IVORY COAST',
                  '120': 'JAMAICA',
                  '122': 'JAPAN',
                  '275': 'JERSEY',
                  '121': 'JORDAN',
                  '57': 'KANTON AND ENDERBURY ISLANDS*',
                  '123': 'KAZAKHSTAN',
                  '124': 'KENYA',
                  '127': 'KIRIBATI',
                  '187': 'KOREA, NORTH',
                  '129': 'KOREA, SOUTH',
                  '271': 'KOSOVO',
                  '130': 'KUWAIT',
                  '125': 'KYRGYZSTAN',
                  '131': 'LAOS',
                  '141': 'LATVIA',
                  '132': 'LEBANON',
                  '138': 'LESOTHO',
                  '133': 'LIBERIA',
                  '134': 'LIBYA',
                  '136': 'LIECHTENSTEIN',
                  '139': 'LITHUANIA',
                  '140': 'LUXEMBOURG',
                  '142': 'MACAU SAR',
                  '150': 'MACEDONIA, FORMER YUGOSLAV REPUBLIC OF',
                  '146': 'MADAGASCAR',
                  '161': 'MALAWI',
                  '162': 'MALAYSIA',
                  '147': 'MALDIVES',
                  '151': 'MALI',
                  '152': 'MALTA',
                  '149': 'MARSHALL ISLANDS',
                  '159': 'MARTINIQUE',
                  '157': 'MAURITANIA',
                  '160': 'MAURITIUS',
                  '163': 'MAYOTTE',
                  '148': 'MEXICO',
                  '82': 'MICRONESIA',
                  '145': 'MOLDOVA',
                  '144': 'MONACO',
                  '154': 'MONGOLIA',
                  '269': 'MONTENEGRO',
                  '158': 'MONTSERRAT',
                  '143': 'MOROCCO',
                  '156': 'MOZAMBIQUE',
                  '153': 'MYANMAR',
                  '164': 'NAMIBIA',
                  '174': 'NAURU',
                  '173': 'NEPAL',
                  '171': 'NETHERLANDS',
                  '10': 'NETHERLANDS ANTILLES',
                  '175': 'NEUTRAL ZONE',
                  '165': 'NEW CALEDONIA',
                  '176': 'NEW ZEALAND',
                  '169': 'NICARAGUA',
                  '166': 'NIGER',
                  '168': 'NIGERIA',
                  '170': 'NIUE',
                  '167': 'NORFOLK ISLAND',
                  '155': 'NORTHERN MARIANA ISLANDS',
                  '172': 'NORWAY',
                  '177': 'OMAN',
                  '178': 'PAKISTAN',
                  '183': 'PALAU',
                  '279': 'PALESTINIAN TERRITORIES*',
                  '179': 'PANAMA',
                  '184': 'PAPUA NEW GUINEA',
                  '189': 'PARAGUAY',
                  '181': 'PERU',
                  '182': 'PHILIPPINES',
                  '180': 'PITCAIRN',
                  '185': 'POLAND',
                  '188': 'PORTUGAL',
                  '186': 'PUERTO RICO',
                  '191': 'QATAR',
                  '192': 'REUNION',
                  '258': 'RHODESIA*',
                  '193': 'ROMANIA',
                  '194': 'RUSSIA',
                  '195': 'RWANDA',
                  '273': 'SAINT BARTHELEMY',
                  '201': 'SAINT HELENA',
                  '128': 'SAINT KITTS AND NEVIS',
                  '135': 'SAINT LUCIA',
                  '274': 'SAINT MARTIN',
                  '208': 'SAINT PIERRE AND MIQUECON',
                  '239': 'SAINT VINCENT AND GRENADINES',
                  '246': 'SAMOA',
                  '206': 'SAN MARINO',
                  '209': 'SAO TOME &amp; PRINCIPE',
                  '196': 'SAUDI ARABIA',
                  '199': 'SENEGAL',
                  '268': 'SERBIA',
                  '197': 'SERBIA AND MONTENEGRO*',
                  '216': 'SEYCHELLES',
                  '204': 'SIERRA LEONE',
                  '200': 'SINGAPORE',
                  '212': 'SLOVAKIA',
                  '213': 'SLOVENIA',
                  '203': 'SOLOMON ISLANDS',
                  '207': 'SOMALIA',
                  '252': 'SOUTH AFRICA',
                  '270': 'SOUTH GEORGIA AND SOUTH SANDWICH ISLANDS',
                  '259': 'SOUTHERN RHODESIA*',
                  '74': 'SPAIN',
                  '137': 'SRI LANKA',
                  '198': 'SUDAN',
                  '211': 'SURINAME',
                  '202': 'SVALBARD AND JAN MAYEN',
                  '215': 'SWAZILAND',
                  '214': 'SWEDEN',
                  '44': 'SWITZERLAND',
                  '217': 'SYRIA',
                  '231': 'TAIWAN',
                  '222': 'TAJIKISTAN',
                  '261': 'TANGANYIKA*',
                  '232': 'TANZANIA',
                  '221': 'THAILAND',
                  '225': 'TIMOR LESTE (FORMERLY EAST TIMOR)',
                  '220': 'TOGO',
                  '223': 'TOKELAU',
                  '226': 'TONGA',
                  '227': 'TRINIDAD &amp; TOBAGO',
                  '228': 'TUNISIA',
                  '229': 'TURKEY',
                  '224': 'TURKMENISTAN',
                  '218': 'TURKS &amp; CAICOS ISLANDS',
                  '230': 'TUVALU',
                  '210': 'U.S.S.R.*',
                  '233': 'UGANDA',
                  '234': 'UKRAINE',
                  '11': 'UNITED ARAB EMIRATES',
                  '3': 'UNITED KINGDOM',
                  '235': 'UNITED STATES MINOR OUTLYING ISLANDS',
                  '236': 'URUGUAY',
                  '2': 'USA',
                  '237': 'UZBEKISTAN',
                  '244': 'VANUATU',
                  '238': 'VATICAN CITY STATE (HOLY SEE)',
                  '240': 'VENEZUELA',
                  '243': 'VIETNAM',
                  '241': 'VIRGIN ISLANDS (BRITISH)',
                  '242': 'VIRGIN ISLANDS (USA)',
                  '245': 'WALLIS AND FUTUNA ISLANDS',
                  '73': 'WESTERN SAHARA',
                  '278': 'WESTERN SAMOA*',
                  '249': 'YEMEN',
                  '250': 'YEMEN (DEMOCRATIC PEOPLES\' REPUBLIC)*',
                  '251': 'YUGOSLAVIA*',
                  '253': 'ZAIRE',
                  '254': 'ZAMBIA',
                  '260': 'ZANZIBAR*',
                  '255': 'ZIMBABWE'
                },
                countryIterator,
                countryHtml = '';

              // Mark the button checked
              el.addClass('checked');

              // Fetch the root ID
              lastSeparatorIndex = id.lastIndexOf(fc.constants.prefixSeparator);
              rootId = id.substr(0, lastSeparatorIndex);

              // Fetch the root container
              rootContainer = fc.domContainer.find('.fc-field[fc-data-group="' + rootId + '"]');
              rootSchema = fc.fieldSchema[rootId];

              if (rootContainer.length === 0) {
                // Ensure a root container exists
                return;
              }

              // Generate the country html
              for (countryIterator in countries) {
                if (countries.hasOwnProperty(countryIterator)) {
                  countryHtml += '<option value="' + countryIterator + '">' + countries[countryIterator] + '</option>';
                }
              }

              optionContainer = rootContainer.find('.fc-greenid-options');
              if (optionContainer.length === 0) {
                // Ensure option container exists
                return;
              }

              fields = {
                passportNumber: {
                  '_id': {
                    '$id': rootId + '_passport_number'
                  },
                  config: {}
                },
                givenName: {
                  '_id': {
                    '$id': rootId + '_passport_given_name'
                  },
                  config: {}
                },
                middleNames: {
                  '_id': {
                    '$id': rootId + '_passport_middle_names'
                  },
                  config: {}
                },
                familyName: {
                  '_id': {
                    '$id': rootId + '_passport_family_name'
                  },
                  config: {}
                },
                dateOfBirth: {
                  '_id': {
                    '$id': rootId + '_passport_dob'
                  },
                  config: {}
                },
                familyNameAtBirth: {
                  '_id': {
                    '$id': rootId + '_passport_family_name_at_birth'
                  },
                  config: {}
                },
                placeOfBirth: {
                  '_id': {
                    '$id': rootId + '_passport_place_birth'
                  },
                  config: {}
                },
                countryOfBirth: {
                  '_id': {
                    '$id': rootId + '_passport_place_birth'
                  },
                  config: {}
                },
                firstNameAtCitizenship: {
                  '_id': {
                    '$id': rootId + '_passport_first_name_citizenship'
                  },
                  config: {}
                },
                surnameAtCitizenship: {
                  '_id': {
                    '$id': rootId + '_passport_surname_citizenship'
                  },
                  config: {}
                },
                tos: {
                  '_id': {
                    '$id': rootId + '_passport_tos'
                  },
                  config: {}
                }
              };

              html += '<div class="fc-clear"></div>';

              // Passport number
              html += '<div class="passport-number fc-green-field"><label>Passport number (include any letters): <span class="fc-required-caret">*</span></label>';
              html += renderTextfield(fields.passportNumber);
              html += '</div>';

              // Given name
              html += '<div class="given-name fc-green-field"><label>Given name (as shown on passport): <span class="fc-required-caret">*</span></label>';
              html += renderTextfield(fields.givenName);
              html += '</div>';

              // Middle names
              html += '<div class="middle-names fc-green-field"><label>Middle names: </label>';
              html += renderTextfield(fields.middleNames);
              html += '</div>';

              // Family name
              html += '<div class="family-name fc-green-field"><label>Family name: <span class="fc-required-caret">*</span></label>';
              html += renderTextfield(fields.familyName);
              html += '</div>';

              // Date of birth
              html += '<div class="dob fc-green-field"><label>Date of birth (DD/MM/YYYY): <span class="fc-required-caret">*</span></label>';
              html += renderTextfield(fields.dateOfBirth);
              html += '</div>';

              // Family name at birth
              html += '<div class="family-name-at-birth fc-green-field"><label>Family name at birth: <span class="fc-required-caret">*</span></label>';
              html += renderTextfield(fields.familyNameAtBirth);
              html += '</div>';

              // Place of birth
              html += '<div class="place-of-birth fc-green-field"><label>Place of birth: <span class="fc-required-caret">*</span></label>';
              html += renderTextfield(fields.placeOfBirth);
              html += '</div>';

              html += '<div class="fc-clear"></div>';

              // Render country of birth
              html += '<div class="country-birth fc-green-field"><label>Country of birth: <span class="fc-required-caret">*</span></label>';
              html += '<select data-for="' + rootId + '"><option value="">Please select a value</option>' + countryHtml + '</select>';
              html += '</div>';
              html += '<div class="fc-clear"></div>';

              // (fields required when country is not Au)
              html += '<div class="fc-non-australia-fields">';
              html += '<p>As you are not an Australian citizen by birth, we require additional information to verify your citizenship.</p>';
              html += '<div class="fc-clear"></div>';

              // First name at citizenship
              html += '<div class="first-name-at-citizenship fc-green-field"><label>First name at citizenship: <span class="fc-required-caret">*</span></label>';
              html += renderTextfield(fields.familyNameAtBirth);
              html += '</div>';

              // Surname at citizenship
              html += '<div class="surname-at-citizenship fc-green-field"><label>Surname at citizenship: <span class="fc-required-caret">*</span></label>';
              html += renderTextfield(fields.placeOfBirth);
              html += '</div>';

              html += '</div>';

              html += '<div class="fc-clear"></div>';

              // Terms of service
              html += '<div class="tos"><input type="checkbox" class="fc-tos" id="' + rootId + '_passport_tos">';
              html += '<label for="' + rootId + '_passport_tos">&nbsp;I have read and accepted <a href="http://dfat.gov.au/privacy.html">DFAT\'s Disclosure Statement</a>.</label>';
              html += '</div>';

              // Button
              html += '<div class="green-id-verify"><a class="fc-btn" href="#" data-for="' + rootId + '">Verify</a></div>';
              html += '</div>';

              obj = $(html);

              // Pre-populate the different field elements
              prePopulateFields(obj, rootId, rootSchema, updateMap, childField);

              html = obj.prop('outerHTML');

              // Output the container html
              containerHtml += '<h3 class="fc-header">Passport Verification</h3>';
              containerHtml += '<p>To verify using your passport, please fill out the options below.</p>';
              containerHtml += html;
              containerHtml += '<div class="fc-child-options" data-for="' + rootId + '"></div>';

              optionContainer.attr('class', '').addClass('fc-greenid-options fc-greenid-drivers-license').hide().html(containerHtml).slideDown();

              // Set the current state
              fc.greenID.currentState = 'verifyPassport';

              // Auto scroll to the field (vital for mobiles)
              autoScrollToField('.fc-field[fc-data-group="' + rootId + '"] .fc-greenid-options');
            };

            // Passport button clicked
            callbackFunctions.EmploymentVisaForeignPassport = function (el) {
              var id = el.attr('formcorp-data-id'),
                lastSeparatorIndex,
                rootId,
                rootContainer,
                rootSchema,
                optionContainer,
                containerHtml = '',
                fields,
                html = '<div class="fc-visa">',
                updateMap = {
                  'family-name': 'greenIDSurname',
                  'dob': 'greenIDDOB'
                },
                key,
                obj,
                childField,
                inputId;

              // Mark the button checked
              el.addClass('checked');

              // Fetch the root ID
              lastSeparatorIndex = id.lastIndexOf(fc.constants.prefixSeparator);
              rootId = id.substr(0, lastSeparatorIndex);

              // Fetch the root container
              rootContainer = fc.domContainer.find('.fc-field[fc-data-group="' + rootId + '"]');
              rootSchema = fc.fieldSchema[rootId];

              if (rootContainer.length === 0) {
                // Ensure a root container exists
                return;
              }

              optionContainer = rootContainer.find('.fc-greenid-options');
              if (optionContainer.length === 0) {
                // Ensure option container exists
                return;
              }

              fields = {
                visaNumber: {
                  '_id': {
                    '$id': rootId + '_visa_number'
                  },
                  config: {}
                },
                familyName: {
                  '_id': {
                    '$id': rootId + '_visa_family_name'
                  },
                  config: {}
                },
                dateOfBirth: {
                  '_id': {
                    '$id': rootId + '_visa_dob'
                  },
                  config: {}
                },
                passportCountry: {
                  '_id': {
                    '$id': rootId + '_visa_passport_country'
                  },
                  config: {}
                },
                tos: {
                  '_id': {
                    '$id': rootId + '_visa_tos'
                  },
                  config: {}
                }
              };

              html += '<div class="fc-clear"></div>';

              // Passport number
              html += '<div class="visa-number fc-green-field"><label>Visa number: <span class="fc-required-caret">*</span></label>';
              html += renderTextfield(fields.visaNumber);
              html += '</div>';

              // Family name
              html += '<div class="family-name fc-green-field"><label>Family name: <span class="fc-required-caret">*</span></label>';
              html += renderTextfield(fields.familyName);
              html += '</div>';

              // Date of birth
              html += '<div class="dob fc-green-field"><label>Date of birth (DD/MM/YYYY): <span class="fc-required-caret">*</span></label>';
              html += renderTextfield(fields.dateOfBirth);
              html += '</div>';

              html += '<div class="fc-clear"></div>';

              // Render country of passport
              html += '<div class="country-passport fc-green-field"><label>Country of birth: <span class="fc-required-caret">*</span></label>';
              html += '<select data-for="' + rootId + '"><option value="">Please select a value</option><option value="1">AUSTRALIA</option><option value="5">AFGHANISTAN</option><option value="272">ALAND ISLANDS</option><option value="8">ALBANIA</option><option value="69">ALGERIA</option><option value="14">AMERICAN SAMOA</option><option value="9">ANDORRA</option><option value="6">ANGOLA</option><option value="7">ANGUILLA</option><option value="15">ANTARCTICA</option><option value="17">ANTIGUA AND BARBUDA</option><option value="12">ARGENTINA</option><option value="13">ARMENIA</option><option value="4">ARUBA</option><option value="18">AUSTRIA</option><option value="19">AZERBAIJAN</option><option value="27">BAHAMAS</option><option value="26">BAHRAIN</option><option value="24">BANGLADESH</option><option value="34">BARBADOS</option><option value="262">BECHUANALAND*</option><option value="29">BELARUS</option><option value="21">BELGIUM</option><option value="30">BELIZE</option><option value="22">BENIN</option><option value="31">BERMUDA</option><option value="36">BHUTAN</option><option value="32">BOLIVIA</option><option value="28">BOSNIA AND HERZEGOVINA</option><option value="39">BOTSWANA</option><option value="38">BOUVET ISLAND</option><option value="33">BRAZIL</option><option value="113">BRITISH INDIAN OCEAN TERRITITORY (CHAGOS ARCH.)</option><option value="35">BRUNEI</option><option value="25">BULGARIA</option><option value="23">BURKINA FASO</option><option value="37">BURMA*</option><option value="20">BURUNDI</option><option value="40">BYELORUSSIA*</option><option value="126">CAMBODIA</option><option value="48">CAMEROON</option><option value="42">CANADA</option><option value="54">CAPE VERDE</option><option value="60">CAYMAN ISLANDS</option><option value="41">CENTRAL AFRICAN REPUBLIC</option><option value="219">CHAD</option><option value="45">CHILE</option><option value="46">CHINA</option><option value="59">CHRISTMAS ISLAND</option><option value="43">COCOS KEELING ISLANDS</option><option value="52">COLOMBIA</option><option value="53">COMOROS</option><option value="50">CONGO</option><option value="49">CONGO (DEMOCRATIC REPUBLIC OF THE)</option><option value="51">COOK ISLANDS</option><option value="55">COSTA RICA</option><option value="107">CROATIA</option><option value="58">CUBA</option><option value="61">CYPRUS</option><option value="62">CZECH REPUBLIC</option><option value="56">CZECHOSLOVAKIA*</option><option value="263">DAHOMEY*</option><option value="67">DENMARK</option><option value="267">DJIBOUTI</option><option value="66">DOMINICA</option><option value="68">DOMINICAN REPUBLIC</option><option value="264">EAST PAKISTAN*</option><option value="70">ECUADOR</option><option value="71">EGYPT</option><option value="205">EL SALVADOR</option><option value="96">EQUATORIAL GUINEA</option><option value="72">ERITREA</option><option value="75">ESTONIA</option><option value="76">ETHIOPIA</option><option value="79">FALKLAND ISLANDS (MALVINAS)</option><option value="81">FAROE ISLANDS</option><option value="78">FIJI</option><option value="77">FINLAND</option><option value="80">FRANCE</option><option value="265">FRENCH ALGERIA*</option><option value="101">FRENCH GUIANA</option><option value="190">FRENCH POLYNESIA</option><option value="16">FRENCH SOUTHERN TERRITORIES</option><option value="65">FRENCH TERRITORY OF AFARS AND ISSAS*</option><option value="83">GABON</option><option value="94">GAMBIA</option><option value="89">GEORGIA</option><option value="266">GERMAN EAST AFRICA*</option><option value="63">GERMANY (DEMOCRATIC REPUBLIC OF)*</option><option value="64">GERMANY (FEDERAL REPUBLIC OF)</option><option value="90">GHANA</option><option value="91">GIBRALTAR</option><option value="97">GREECE</option><option value="99">GREENLAND</option><option value="98">GRENADA</option><option value="93">GUADELOUPE</option><option value="102">GUAM</option><option value="100">GUATEMALA</option><option value="276">GUERNSEY</option><option value="92">GUINEA</option><option value="95">GUINEA BISSAU</option><option value="103">GUYANA</option><option value="108">HAITI</option><option value="105">HEARD AND MCDONALD ISLANDS</option><option value="106">HONDURAS</option><option value="104">HONG KONG SAR</option><option value="109">HUNGARY</option><option value="117">ICELAND</option><option value="112">INDIA</option><option value="111">INDONESIA</option><option value="115">IRAN</option><option value="116">IRAQ</option><option value="114">IRELAND</option><option value="277">ISLE OF MAN</option><option value="118">ISRAEL</option><option value="119">ITALY</option><option value="47">IVORY COAST</option><option value="120">JAMAICA</option><option value="122">JAPAN</option><option value="275">JERSEY</option><option value="121">JORDAN</option><option value="57">KANTON AND ENDERBURY ISLANDS*</option><option value="123">KAZAKHSTAN</option><option value="124">KENYA</option><option value="127">KIRIBATI</option><option value="187">KOREA, NORTH</option><option value="129">KOREA, SOUTH</option><option value="271">KOSOVO</option><option value="130">KUWAIT</option><option value="125">KYRGYZSTAN</option><option value="131">LAOS</option><option value="141">LATVIA</option><option value="132">LEBANON</option><option value="138">LESOTHO</option><option value="133">LIBERIA</option><option value="134">LIBYA</option><option value="136">LIECHTENSTEIN</option><option value="139">LITHUANIA</option><option value="140">LUXEMBOURG</option><option value="142">MACAU SAR</option><option value="150">MACEDONIA, FORMER YUGOSLAV REPUBLIC OF</option><option value="146">MADAGASCAR</option><option value="161">MALAWI</option><option value="162">MALAYSIA</option><option value="147">MALDIVES</option><option value="151">MALI</option><option value="152">MALTA</option><option value="149">MARSHALL ISLANDS</option><option value="159">MARTINIQUE</option><option value="157">MAURITANIA</option><option value="160">MAURITIUS</option><option value="163">MAYOTTE</option><option value="148">MEXICO</option><option value="82">MICRONESIA</option><option value="145">MOLDOVA</option><option value="144">MONACO</option><option value="154">MONGOLIA</option><option value="269">MONTENEGRO</option><option value="158">MONTSERRAT</option><option value="143">MOROCCO</option><option value="156">MOZAMBIQUE</option><option value="153">MYANMAR</option><option value="164">NAMIBIA</option><option value="174">NAURU</option><option value="173">NEPAL</option><option value="171">NETHERLANDS</option><option value="10">NETHERLANDS ANTILLES</option><option value="175">NEUTRAL ZONE</option><option value="165">NEW CALEDONIA</option><option value="176">NEW ZEALAND</option><option value="169">NICARAGUA</option><option value="166">NIGER</option><option value="168">NIGERIA</option><option value="170">NIUE</option><option value="167">NORFOLK ISLAND</option><option value="155">NORTHERN MARIANA ISLANDS</option><option value="172">NORWAY</option><option value="177">OMAN</option><option value="178">PAKISTAN</option><option value="183">PALAU</option><option value="279">PALESTINIAN TERRITORIES*</option><option value="179">PANAMA</option><option value="184">PAPUA NEW GUINEA</option><option value="189">PARAGUAY</option><option value="181">PERU</option><option value="182">PHILIPPINES</option><option value="180">PITCAIRN</option><option value="185">POLAND</option><option value="188">PORTUGAL</option><option value="186">PUERTO RICO</option><option value="191">QATAR</option><option value="192">REUNION</option><option value="258">RHODESIA*</option><option value="193">ROMANIA</option><option value="194">RUSSIA</option><option value="195">RWANDA</option><option value="273">SAINT BARTHELEMY</option><option value="201">SAINT HELENA</option><option value="128">SAINT KITTS AND NEVIS</option><option value="135">SAINT LUCIA</option><option value="274">SAINT MARTIN</option><option value="208">SAINT PIERRE AND MIQUECON</option><option value="239">SAINT VINCENT AND GRENADINES</option><option value="246">SAMOA</option><option value="206">SAN MARINO</option><option value="209">SAO TOME &amp; PRINCIPE</option><option value="196">SAUDI ARABIA</option><option value="199">SENEGAL</option><option value="268">SERBIA</option><option value="197">SERBIA AND MONTENEGRO*</option><option value="216">SEYCHELLES</option><option value="204">SIERRA LEONE</option><option value="200">SINGAPORE</option><option value="212">SLOVAKIA</option><option value="213">SLOVENIA</option><option value="203">SOLOMON ISLANDS</option><option value="207">SOMALIA</option><option value="252">SOUTH AFRICA</option><option value="270">SOUTH GEORGIA AND SOUTH SANDWICH ISLANDS</option><option value="259">SOUTHERN RHODESIA*</option><option value="74">SPAIN</option><option value="137">SRI LANKA</option><option value="198">SUDAN</option><option value="211">SURINAME</option><option value="202">SVALBARD AND JAN MAYEN</option><option value="215">SWAZILAND</option><option value="214">SWEDEN</option><option value="44">SWITZERLAND</option><option value="217">SYRIA</option><option value="231">TAIWAN</option><option value="222">TAJIKISTAN</option><option value="261">TANGANYIKA*</option><option value="232">TANZANIA</option><option value="221">THAILAND</option><option value="225">TIMOR LESTE (FORMERLY EAST TIMOR)</option><option value="220">TOGO</option><option value="223">TOKELAU</option><option value="226">TONGA</option><option value="227">TRINIDAD &amp; TOBAGO</option><option value="228">TUNISIA</option><option value="229">TURKEY</option><option value="224">TURKMENISTAN</option><option value="218">TURKS &amp; CAICOS ISLANDS</option><option value="230">TUVALU</option><option value="210">U.S.S.R.*</option><option value="233">UGANDA</option><option value="234">UKRAINE</option><option value="11">UNITED ARAB EMIRATES</option><option value="3">UNITED KINGDOM</option><option value="235">UNITED STATES MINOR OUTLYING ISLANDS</option><option value="236">URUGUAY</option><option value="2">USA</option><option value="237">UZBEKISTAN</option><option value="244">VANUATU</option><option value="238">VATICAN CITY STATE (HOLY SEE)</option><option value="240">VENEZUELA</option><option value="243">VIETNAM</option><option value="241">VIRGIN ISLANDS (BRITISH)</option><option value="242">VIRGIN ISLANDS (USA)</option><option value="245">WALLIS AND FUTUNA ISLANDS</option><option value="73">WESTERN SAHARA</option><option value="278">WESTERN SAMOA*</option><option value="249">YEMEN</option><option value="250">YEMEN (DEMOCRATIC PEOPLES\' REPUBLIC)*</option><option value="251">YUGOSLAVIA*</option><option value="253">ZAIRE</option><option value="254">ZAMBIA</option><option value="260">ZANZIBAR*</option><option value="255">ZIMBABWE</option></select>';
              html += '</div>';
              html += '<div class="fc-clear"></div>';

              // Terms of service
              html += '<div class="tos"><input type="checkbox" class="fc-tos" id="' + rootId + '_visa_tos">';
              html += '<label for="' + rootId + '_visa_tos">&nbsp;I understand that I am disclosing information relating to my employment visa or non-Australian passport. This information will be disclosed to the Department of Immigration and Citizenship. I am aware that if am not entitled to be in Australia, then the Department of Immigration and Citizenship may use the information that I provide above to locate me.</label>';
              html += '</div>';

              // Button
              html += '<div class="green-id-verify"><a class="fc-btn" href="#" data-for="' + rootId + '">Verify</a></div>';
              html += '</div>';

              obj = $(html);

              // Pre-populate the different field elements
              prePopulateFields(obj, rootId, rootSchema, updateMap, childField);

              html = obj.prop('outerHTML');

              // Output the container html
              containerHtml += '<h3 class="fc-header">Employment Visa (Foreign Passport)</h3>';
              containerHtml += '<p>Please provide your passport details so we can confirm your date of birth with the Department of Immigration and Citizenship.</p>';
              containerHtml += html;
              containerHtml += '<div class="fc-child-options" data-for="' + rootId + '"></div>';

              optionContainer.attr('class', '').addClass('fc-greenid-options fc-greenid-drivers-license').hide().html(containerHtml).slideDown();

              // Set the current state
              fc.greenID.currentState = 'verifyVisa';

              // Auto scroll to the field (vital for mobiles)
              autoScrollToField('.fc-field[fc-data-group="' + rootId + '"] .fc-greenid-options');
            };

            // Skip verification callback function
            callbackFunctions.SkipVerification = function (el) {
              var id = el.attr('formcorp-data-id').replace('_rootSelection', '');
              fcGreenID.skipVerification(id);
            };

            // Event handler for button click
            fc.domContainer.on(fc.jsEvents.onButtonUnknownClick, function (ev, el) {
              var id = el.attr('id'),
                value = el.attr('data-field-value'),
                rootSelection = id.match(/([a-zA-Z0-9]{24})\_rootSelection\_\d+/g),
                verificationTypeClicked = rootSelection !== null,
                verificationFunction = decodeURIComponent(value).replace(/[^a-zA-Z0-9\_]/g, ''),
                lastSeparatorIndex,
                rootId;

              // Fetch the root ID
              lastSeparatorIndex = id.lastIndexOf(fc.constants.prefixSeparator);
              rootId = id.substr(0, lastSeparatorIndex).replace('_rootSelection', '');

               // Unselect other buttons
              $('.fc-field[fc-data-group="' + rootId + '"] .fc-greenid-verification-packages button').removeClass('checked');

              // Look for a verification function
              if (verificationTypeClicked && typeof callbackFunctions[verificationFunction] === 'function') {
                // The user selects a verification type
                return callbackFunctions[verificationFunction](el);
              }

              return false;
            });

            // Event handler for passport country fieldSchema
            fc.domContainer.on('change', '.fc-green-field.country-birth select', function () {
              var countryCode = $(this).find('option:selected').val(),
                fieldId = $(this).attr('data-for'),
                nonAustralianFieldsContainer = fc.domContainer.find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-non-australia-fields');

              // If the fields aren't found, return.
              if (nonAustralianFieldsContainer.length === 0) {
                return;
              }

              // If a non-australian country is selected, show the additional fields
              if (countryCode.length === 0 || countryCode !== '1') {
                nonAustralianFieldsContainer.show();
              } else {
                nonAustralianFieldsContainer.hide();
              }
            });
          },

          /**
           * When the schema is loaded, initialise the greenID components
           */
          onSchemaLoaded = function () {
            initGreenId();
          },

          /**
           * Flush the active page for a field (to be triggered when its value changes)
           * @param dataId
           * @param useDom
           */
          flushActivePageForField = function (dataId, useDom) {
            var pageDataId, foundPage = false, pageId;

            // Default useDom to false
            if (typeof useDom !== 'boolean') {
              useDom = false;
            }

            // Do nothing if page id isn't numeric
            pageId = getFieldPageId(dataId, useDom);
            if (typeof pageId !== 'string' || pageId.length === 0 || pageId.indexOf(fc.constants.prefixSeparator) > -1) {
              return;
            }

            fc.currentPage = pageId;
            $('.fc-page[data-page-id="' + fc.currentPage + '"] .fc-pagination').show();
            $('.fc-page').each(function () {
              pageDataId = $(this).attr('data-page-id');
              if (foundPage && pageDataId !== fc.currentPage) {
                $(this).remove();
              } else if (pageDataId === fc.currentPage) {
                foundPage = true;
              }
            });

            // Update the page orders
            if (fc.pageOrders.indexOf(fc.currentPage) !== fc.pageOrders.length - 1) {
              fc.pageOrders = fc.pageOrders.splice(0, fc.pageOrders.indexOf(fc.currentPage) + 1);
            }
          },

          /**
           * Update the active form state
           * @param state
           */
          setFormState = function (state) {
            // Update the form values
            var oldState = fc.formState;
            fc.formState = state;

            // Trigger an event to react on
            fc.domContainer.attr('data-form-state', state);
            fc.domContainer.find('[data-form-state]').attr('data-form-state', state);
            fc.domContainer.trigger(fc.jsEvents.onFormStateChange, [state, oldState]);
          },

          /**
           * Add a tag to the formState
           * @param tag string
           */
          addTag = function (tag) {
            if (typeof fc.tags === 'undefined') {
              fc.tags = [];
            }

            if (typeof tag === 'string' && fc.tags.indexOf(tag) === -1) {
              fc.tags.push(tag);
            }
          },

          /**
           * Remove a tag from the form.
           * @param tag string
           */
          removeTag = function (tag) {
            if (typeof fc.tags === 'undefined') {
              return;
            }

            var index;
            if (typeof tag === 'string' && (index = fc.tags.indexOf(tag)) >= 0) {
              fc.tags.splice(index, 1);
            }
          },

          /**
           * Set the form tags.
           * @param tags array
           */
          setTags = function (tags) {
            if ($.isArray(tags)) {
              fc.tags = tags;
            }
          },

          /**
           * Retrieve the form tags.
           * @return array
           */
          getTags = function () {
            if (typeof fc.tags === 'undefined') {
              fc.tags = [];
            }

            return fc.tags;
          },

          /**
           * Test to see whether or not an object has a set of tags.
           * @param obj object
           * @param key string
           * @return boolean
           */
          objectHasTag = function (obj, key) {
            if (typeof key !== 'string') {
              key = 'tags';
            }

            return typeof obj === 'object' && typeof obj[key] === 'object' && $.isArray(obj[key]) && obj[key].length > 0;
          },

          /**
           * Check whether or not the form has the tags
           * @param tag
           * @return boolean
           */
          hasTag = function (tag) {
            if (typeof tag !== 'string' || typeof fc.tags === 'undefined') {
              return false;
            }

            // Returns true if the tag is an empty string. If the tag is empty, it means the tag was erroneously set by
            // the server. This has been fixed in build 1.3.6.0 however the below code fixes legacy form definitions.
            return tag.length === 0 || fc.tags.indexOf(tag) >= 0;
          },

          /**
           * Check to see whether form has all tags set.
           * @param tags array
           * @return boolean
           */
          hasTags = function (tags) {
            if (typeof tags !== 'object' || !$.isArray(tags) || typeof fc.tags === 'undefined') {
              return false;
            }

            for (var x = tags.length; x;) {
              if (!hasTag(tags[--x])) {
                return false;
              }
            }

            return true;
          },

          /**
            * Check to see whether tags have been set on the form.
            * return @boolean
            */
          haveTags = function () {
            return typeof fc.tags === 'object' && fc.tags.length > 0;
          },

          /**
           * Set the "virtual" value of a field
           * @param fieldId
           * @param value
           */
          setVirtualValue = function (fieldId, value, obj) {
            log('setVirtualValue');
            log(fieldId);
            log(value);

            if (typeof obj !== 'object') {
              obj = fc.fields;
            }

            if (typeof fieldId === 'string' && fieldId.length > 0 && !$.isNumeric(fieldId)) {
              // Replaces junk data within the field ID
              fieldId = fieldId.replace('_rootSelection', '');

              var parts = fieldId.split(fc.constants.prefixSeparator);
              var save = obj;
              var saveId = fieldId;

              if (parts.length > 1) {
                var parentId = parts[0];
                var parentField = fc.fieldSchema[parentId];

                // If a grouplet, or repeatable, or iterator, need to potentially construct and save as a nested value
                for (var i = 0; i < parts.length - 1; i++) {
                  var id = parts[i];
                  if (typeof save[id] === 'undefined' || (i < (parts.length - 1) && typeof save[id] !== 'object')) {
                    // If undefined, or not the last element (and not an object), ensure it's set properly
                    // Should also initialise as an object if the field is not repeatable
                    if (typeof id !== 'undefined' && (!getConfig(parentField, 'repeatable', false) || $.isNumeric(id))) {
                      save[id] = {};
                    } else {
                      save[id] = [];
                    }
                  }

                  save = save[id];
                }

                saveId = parts[parts.length - 1];

                // Save the entire root object in the queue
                if (fc.config.saveInRealTime) {
                  fc.saveQueue[parts[0]] = obj[parts[0]];
                }
              } else {
                if (fc.config.saveInRealTime) {
                  // Save the simple value
                  fc.saveQueue[fieldId] = value;
                }
              }
              save[saveId] = value;
            }
          },

          updateMobileFieldsVisibility,
          renderGrouplet,
          getNumericTagValue,
          outputRepeatablePreDetermined,
          renderFields,
          renderPageSections,
          generateRandomString,
          loadCssFiles,
          addModalWindow,
          pruneNonPageFields,
          removeInvisibleSectionFields,
          pruneInvisibleFields,
          fieldIsValid,
          formFieldsValid,
          checkAutoLoad,
          getFirstPageId,
          getFirstPage,
          loadSettings,
          initRender,
          autoLoadLibs,
          setSchemaData,
          verifySession,
          preVerificationComplete,
          loadSchema,
          hasNextPage,
          loadNextPage,
          loadPrevPage,
          processSaveQueue,
          showDeleteDialog,
          showRepeatableEditDialog,
          addRepeatableRow,
          editRepeatableRow,
          deleteRepeatableRow,
          registerRepeatableGroupletListeners,
          registerOnePageListeners,
          registerEventListeners,
          nextPage,
          render,
          afterRender,
          renderPage,
          flushVisibility,
          flushRepeatableGroupletVisibility,
          flushSectionVisibility,
          flushFieldVisibility,
          setValueUpdate,
          setFileUploadUpdate,
          registerValueChangedListeners,
          valueChanged,
          validateModal,
          orderSchema,
          renderSignature,
          loadSignatureLibs,
          orderObject,
          renderRepeatableIterator,
          renderApiLookupField,
          initGreenIdFieldInDOM,
          greenIdFieldHeader,
          renderGreenIdField,
          renderNumericSliderField,
          validateMatrixField,
          loadMatrixFieldValues,
          parseMatrixField,
          buildMatrixTable,
          renderMatrixField,
          isValidFile,
          validateFileUpload,
          deleteFileUpload,
          renderFileUpload,
          buildFileList,
          renderDigitalSignatureField,
          renderDateField,
          renderDownloadField,
          registerDownloadListeners,
          registerDeleteFileListeners,
          registerRemoveFileErrorListeners,
          downloadFieldFile,
          renderCustomerRecord,
          registerApiLookupListener,
          renderAutoCompleteWidget,
          removeAutoCompleteWidget,
          moveSelectionAutoCompleteWidget,
          enterSelectionAutoCompleteWidget,
          selectRowAutoCompleteWidget;

        /**
         * Load the libraries required for signature fields
         */
        loadSignatureLibs = function () {
          var sigBlock;

          // Event listener for initialising the signature
          fc.domContainer.on(fc.jsEvents.onFinishRender, function () {
            var dataId;

            sigBlock = fc.domContainer.find('.' + fc.config.signatureClass);
            if (sigBlock.length > 0) {
              sigBlock.each(function () {
                dataId = $(this).attr('data-for');
                fc.renderedSignatures[dataId] = $(this).signaturePad({
                  drawOnly: true,
                  onDrawEnd: function () {
                    var key, signature;

                    // Update and queue the signature for saving
                    for (key in fc.renderedSignatures) {
                      if (fc.renderedSignatures.hasOwnProperty(key)) {
                        signature = fc.renderedSignatures[key].getSignatureString();
                        if (fc.fields[key] === undefined || fc.fields[key] !== signature) {
                          valueChanged(key, signature);
                        }
                      }
                    }
                  }
                });

                // If a value has been set, restore it
                if (fc.fields[dataId] !== undefined && fc.fields[dataId].length > 0) {
                  fc.renderedSignatures[dataId].regenerate(fc.fields[dataId]);
                }
              });

            }
          });

          fc.processedActions[fc.processes.loadSignatureLibs] = true;
        };

        /**
         * Render the signature field
         * @param field
         * @returns {string}
         */
        renderSignature = function (field, prefix) {
          var html = '';

          // Initialise the signature libraries if required
          if (!processed(fc.processes.loadSignatureLibs)) {
            loadSignatureLibs();
          }

          html = '<div class="' + fc.config.signatureClass + '" formcorp-data-id="' + prefix + getId(field) + '" data-for="' + prefix + getId(field) + '"> <ul class="sigNav"> <li class="clearButton"><a href="#clear">Clear</a></li> </ul> <div class="sig sigWrapper"> <div class="typed"></div> <canvas class="pad" width="400" height="75"></canvas> <input type="hidden" name="output" class="output"> </div></div>';

          return html;
        };

        /**
         * Render a grouplet on the review table
         *
         * @param field
         * @param value
         * @returns {*}
         */
        renderReviewTableGrouplet = function (field, value) {
          var html = "", key;

          // Grouplet, need to recursively output
          for (key in value) {
            if (value.hasOwnProperty(key)) {
              html += renderSummaryField(fc.fieldSchema[key], value[key]);
            }
          }

          return html;
        };

        /**
         * Render review table field
         * @param field
         * @param value
         * @returns {string}
         */
        renderSummaryField = function (field, value) {
          var html = '', id, isValidObject, isValidString;

          // Retrieve the id of the field and its value
          id = getId(field);
          if (value === undefined) {
            if (getConfig(field, 'isPassword', false)) {
              value = fc.lang['passwordHidden'];
            } else {
              value = fc.fields[id];
            }
          }

          // If the valid is valid, proceed
          if (value !== undefined) {
            isValidObject = typeof value === "object" && (($.isArray(value) && value.length > 0) || !$.isEmptyObject(value));
            isValidString = typeof value === "string" && value.length > 0;

            // If object with enumerable keys or string with length greater than 0
            if (isValidObject || isValidString) {
              if (isValidString) {
                html += renderReviewTableString(field, value);
              } else if (isValidObject) {
                if ($.isArray(value)) {
                  html += renderReviewTableArray(field, value);
                } else {
                  html += renderReviewTableGrouplet(field, value);
                }
              }
            }
          }

          return html;
        };

        /**
         * Render a grouplet.
         * @param field
         * @returns {string}
         */
        renderGrouplet = function (field) {
          /*jslint nomen: true*/
          var fieldId = field._id.$id,
            html = '',
            fields;
          /*jslint nomen: false*/

          if (typeof field.config.grouplet === 'object') {
            fields = field.config.grouplet.field;
            html += renderFields(fields, field, [fieldId]);
          }

          // If the grouplet is repeatable, need to mark it as such
          if (getConfig(field, 'repeatable', false) === true) {
            html = '<div class="fc-data-repeatable-grouplet" formcorp-data-id="' + fieldId + '">' + html + '</div>';
          }

          return html;
        };

        /**
         * Retrieve the numeric tag value.
         * @param tag
         * @return number
         */
        getNumericTagValue = function(tag) {
          var tagValues;

          // If amount of times is not numeric, assume it is a tag
          if (!$.isNumeric(tag)) {
            tagValues = getFieldTagValues();

            if (typeof tagValues === 'object' && tagValues[tag] !== 'undefined' && $.isNumeric(tagValues[tag])) {
              return tagValues[tag];
            }

            return 0
          } else {
            return tag;
          }

          // If no amount of times specified, default to 1
          if (amountOfTimes === undefined || !$.isNumeric(amountOfTimes)) {
            return 0;
          }
        };

        /**
         * Render a repeatable field (x) times
         * @param fieldId
         * @param amountOfTimes
         * @param section
         * @returns {string}
         */
        outputRepeatablePreDetermined = function (fieldId, amountOfTimes, section) {
          // Variable declaration
          var returnHTML = '',
            fieldsHTML = '',
            field = fc.fieldSchema[fieldId],
            iterator,
            tagValues = getFieldTagValues();

          // If amount of times is not numeric, assume it is a tag
          if (!$.isNumeric(amountOfTimes)) {
            if (fc.reRenderOnValueChange[amountOfTimes] === undefined) {
              // Re-render the field on value change
              fc.reRenderOnValueChange[amountOfTimes] = [];
            }

            if (fc.reRenderOnValueChange[amountOfTimes].indexOf(getId(field)) < 0) {
              // If the ID doesn't exist within the array, add it
              fc.reRenderOnValueChange[amountOfTimes].push(getId(field));
            }
          }

          // If no amount of times specified, default to 1
          if (amountOfTimes === undefined || !$.isNumeric(amountOfTimes)) {
            amountOfTimes = getNumericTagValue(amountOfTimes);
          }

          var existingValue = getValue(fieldId);
          if (typeof existingValue === 'object' && $.isArray(existingValue) && existingValue.length > amountOfTimes) {
            existingValue.splice(amountOfTimes, existingValue.length - amountOfTimes);
            setVirtualValue(fieldId, existingValue);
          }

          // If no config defined, do nothing
          if (field.config === undefined) {
            return returnHTML;
          }


          // If a grouplet, render
          if (field.config.grouplet !== undefined && typeof field.config.grouplet === 'object' && field.config.grouplet.field !== undefined) {
            // Output (x) times
            for (iterator = 0; iterator < amountOfTimes; iterator += 1) {
              fieldsHTML = renderFields(field.config.grouplet.field, section, [fieldId, iterator, ''].join(fc.constants.prefixSeparator));

              // Append to return
              returnHTML += '<div class="fc-repeatable-row fc-row-' + (iterator + 1) + '">';
              returnHTML += fieldsHTML;
              returnHTML += '<div class="fc-end-repeatable-row"></div>';
              returnHTML += '</div>';

              // Replace tokens
              returnHTML = returnHTML.replace(/\{iterator\}/gi, iterator + 1, returnHTML);
            }
          }

          return returnHTML;
        }

        /**
         * Render a collection of fields.
         * @param fields
         * @param section
         * @returns {string}
         */
        renderFields = function (fields, section, prefix, isRepeatableIterator, repeatableIteratorId) {
          var html = '',
            y,
            field,
            required,
            fieldHtml,
            fieldDOMHTML,
            dataId,
            fieldId,
            groupletId,
            visibility,
            matches,
            iterator,
            match,
            re,
            helpTitle,
            amountOfRows,
            repeatableStyle,
            replacement,
            showHelpAsText = true,
            fieldClass;

          if (typeof isRepeatableIterator !== 'boolean') {
            isRepeatableIterator = false;
          }

          // Field id prefix (for grouplet fields that may be shown multiple times)
          if (prefix === undefined) {
            prefix = "";
          } else if (typeof prefix === "object") {
            prefix = prefix.join(fc.constants.prefixSeparator) + fc.constants.prefixSeparator;
          }

          // Populate the grouplet array first
          if (prefix.length > 0) {
            groupletId = (prefix.substr(-1) === fc.constants.prefixSeparator) ? prefix.substr(0, prefix.length - 1) : prefix;
            for (y = 0; y < fields.length; y += 1) {
              field = fields[y];
              if (!fc.fieldGrouplets[groupletId]) {
                fc.fieldGrouplets[groupletId] = [];
              }

              if (fc.fieldGrouplets[groupletId].indexOf(getId(field)) === -1) {
                fc.fieldGrouplets[groupletId].push(getId(field));
              }
            }
          }

          // Iterate through and render fields
          for (y = 0; y < fields.length; y += 1) {
            field = fields[y];
            required = getConfig(field, 'required', false);
            fieldId = prefix + getId(field);
            fieldHtml = '<div class="';

            if (isRepeatableIterator) {
              // Mark the field as existing within a repeatable iterator
              fc.withinIterator[fieldId] = true;
            }

            // If field has an associated tag, output it
            if (getConfig(field, 'tag', '').length > 0) {
              fieldHtml += 'fc-tag-' + getConfig(field, 'tag', '') + ' ';
            }

            // If field is repeatable, mark it as so
            if (getConfig(field, 'repeatable', false) === true) {
              fieldHtml += 'fc-repeatable-container ';
            }

            // Add condition if mobile only fields
            if (getConfig(field, 'mobileOnly', false) === true) {
              fieldHtml += 'fc-mobile-field ';
            } else if (getConfig(field, 'desktopOnly', false) === true) {
              fieldHtml += 'fc-desktop-field ';
            }

            // Render the field class
            fieldClass = getConfig(field, 'class', '');
            if (fieldClass.length > 0) {
              fieldHtml += fieldClass + ' ';
            }

            fieldHtml += 'fc-field fc-field-' + field.type + '" fc-data-group="' + fieldId + '" data-required="' + required + '" data-field-count="' + fc.fieldCount + '" data-form-state="' + fc.formState + '"';

            // If a section was passed through, track which section the field belongs to
            if (section !== undefined && typeof section === "object") {
              fieldHtml += ' fc-belongs-to="' + getId(section) + '"';
            }

            fieldHtml += '>';

            // Fields that belong to a grouplet who have a visibility toggle need updating
            if (prefix && prefix.length > 0 && getConfig(field, 'visibility', '').length > 0 && !isRepeatableIterator) {
              visibility = getConfig(field, 'visibility');
              matches = visibility.match(/"([a-zA-Z0-9]{24})"/g);
              if (matches && matches.length > 0) {
                for (iterator = 0; iterator < matches.length; iterator += 1) {
                  match = matches[iterator].replace(/"/g, "");
                  replacement = prefix + match;

                  if (fc.fieldGrouplets[groupletId].indexOf(match) >= 0 && field.config.visibility.indexOf(replacement) < 0) {
                    re = new RegExp(match, 'g');
                    field.config.visibility = field.config.visibility.replace(re, replacement);
                  }
                }
              }
            }

            // Add to field class variable if doesnt exist
            dataId = fieldId;
            if (fc.fieldSchema[dataId] === undefined) {
              fc.fieldSchema[dataId] = field;
            }

            // Description text - show before the label (for certain fields)
            if (["creditCard"].indexOf(field.type) === -1) {
              if (fc.config.descriptionBeforeLabel === true && getConfig(field, 'description').replace(/(<([^>]+)>)/ig, "").length > 0) {
                fieldHtml += '<div class="fc-desc">' + getConfig(field, 'description') + '</div>';
              }
            }

            fieldHtml += '<div class="fc-fieldcontainer">';

            // Field label - don't show in this position for certain fields
            helpTitle = '';
            if (["creditCard"].indexOf(field.type) === -1) {
              if (getConfig(field, 'showLabel', false) === true && getConfig(field, 'label', '').length > 0) {
                fieldHtml += '<label>';
                fieldHtml += tokenise(field.config.label);

                // Option to show labels on required fields
                if (fc.config.asterisksOnLabels && getConfig(field, 'required', false)) {
                  fieldHtml += '<span class="fc-required-caret">' + fc.lang.requiredAsterisk + '</span>';
                }

                // Option: show colon after label
                if (fc.config.colonAfterLabel) {
                  fieldHtml += fc.lang.labelColon;
                }

                // If set to open help data in a modal, output the link
                if (fc.config.helpAsModal && getConfig(field, 'help').replace(/(<([^>]+)>)/ig, "").length > 0) {
                  if (fc.helpData === undefined) {
                    fc.helpData = [];
                    fc.helpTitle = [];
                  }

                  // The title to use for the help link
                  helpTitle = getConfig(field, 'helpTitle', '');
                  if (helpTitle.length === 0) {
                    if (fc.config.helpDefaultWhenNoTitleText === false) {
                      helpTitle = fc.lang.helpModalLink;
                    }
                  }

                  if (helpTitle.length > 0) {
                    // Push to the data array
                    fc.helpData.push(getConfig(field, 'help'));
                    fc.helpTitle.push(helpTitle);

                    // Use the static title if forced
                    if (fc.config.staticHelpModalLink) {
                      helpTitle = fc.lang.helpModalLink;
                    }

                    showHelpAsText = false;
                    fieldHtml += ' <a class="fc-help-link" tabindex="-1" href="#" data-for="' + (fc.helpData.length - 1) + '">' + helpTitle + '</a>';
                  } else {
                    // At this stage, show the help as text instead
                    showHelpAsText = true;
                  }
                }

                fieldHtml += '</label>';
              }

              // Show the description after the label
              if (fc.config.descriptionBeforeLabel === false && getConfig(field, 'description').replace(/(<([^>]+)>)/ig, "").length > 0) {
                fieldHtml += '<div class="fc-desc">' + tokenise(getConfig(field, 'description')) + '</div>';
              }
            }

            // Output a repeatable field
            if (getConfig(field, 'repeatable', false) === true) {
              repeatableStyle = parseInt(getConfig(field, 'repeatableStyle', 0));

              // Output the repeatable container
              fieldHtml += '<div class="fc-repeatable';
              if (parseInt(repeatableStyle) === parseInt(fc.constants.repeatablePredetermined)) {
                fieldHtml += ' fc-repeatable-predetermined';
              }

              // If in the DOM, add an additional class
              if (fc.constants.repeatableInDOM.indexOf(parseInt(repeatableStyle)) >= 0) {
                fieldHtml += ' fc-repeatable-in-dom';
              }

              fieldHtml += '">';
              if (getConfig(field, 'renderRepeatableTable', false)) {
                fieldHtml += '<div class="fc-summary"></div>';
              }
            }

            fieldHtml += '<div class="fc-fieldgroup">';
            fieldHtml += '<div class="fc-field-element-container">';

            switch (field.type) {
              case 'text':
                fieldDOMHTML = renderTextfield(field, prefix);
                break;
              case 'dropdown':
                fieldDOMHTML = renderDropdown(field, prefix);
                break;
              case 'textarea':
                fieldDOMHTML = renderTextarea(field, prefix);
                break;
              case 'radioList':
                fieldDOMHTML = renderRadioList(field, prefix);
                break;
              case 'checkboxList':
                fieldDOMHTML = renderCheckboxList(field, prefix);
                break;
              case 'hidden':
                fieldDOMHTML = renderHiddenField(field, prefix);
                break;
              case 'richTextArea':
                fieldDOMHTML = renderRichText(field, prefix);
                break;
              case 'grouplet':
                fieldDOMHTML = renderGrouplet(field, prefix);
                break;
              case 'creditCard':
                fieldDOMHTML = renderCreditCard(field, prefix);
                break;
              case 'emailVerification':
                fieldDOMHTML = renderEmailVerification(field, prefix);
                break;
              case 'smsVerification':
                fieldDOMHTML = renderSmsVerification(field, prefix);
                break;
              case 'reviewTable':
                fieldDOMHTML = renderReviewTable(field, prefix);
                break;
              case 'signature':
                fieldDOMHTML = renderSignature(field, prefix);
                break;
              case 'contentRadioList':
                fieldDOMHTML = renderContentRadioList(field, prefix);
                break;
              case 'optionTable':
                fieldDOMHTML = renderOptionTable(field, prefix);
                break;
              case 'abnVerification':
                fieldDOMHTML = renderAbnField(field, prefix);
                break;
              case 'repeatableIterator':
                fieldDOMHTML = renderRepeatableIterator(field, prefix, section);
                break;
              case 'apiLookup':
                fieldDOMHTML = renderApiLookupField(field, prefix);
                break;
              case 'greenIdVerification':
                fieldDOMHTML = renderGreenIdField(field, prefix);
                break;
              case 'numericSlider':
                fieldDOMHTML = renderNumericSliderField(field, prefix);
                break;
              case 'matrix':
                fieldDOMHTML = renderMatrixField(field, prefix);
                break;
              case 'fileUpload':
                fieldDOMHTML = renderFileUpload(field, prefix);
                break;
              case 'digsigCollect':
                fieldDOMHTML = renderDigitalSignatureField(field, prefix);
                break;
              case 'groupletReference':
                fieldDOMHTML = '<div formcorp-data-id="' + prefix + getId(field) + '" data-reference="' + getConfig(field, 'groupletReference') + '"></div>';
                break;
              case 'fieldReference':
                fieldDOMHTML = '<div formcorp-data-id="' + prefix + getId(field) + '" data-reference="' + getConfig(field, 'fieldReference') + '"></div>';
                break;
              case 'formReference':
              case 'functionReference':
                // Do nothing
                fieldDOMHTML = '';
                break;
              case 'customerRecord':
                fieldDOMHTML = renderCustomerRecord(field, prefix);
                break;
              case 'date':
                fieldDOMHTML = renderDateField(field, prefix);
                break;
              case 'download':
                fieldDOMHTML = renderDownloadField(field, prefix);
                break;
              default:
                log('Unknown field type: ' + field.type);
            }

            // Increment the field count
            fc.fieldCount += 1;

            // If no field value returned, do nothing
            if (fieldDOMHTML === undefined || (typeof fieldDOMHTML === 'string' && fieldDOMHTML.length === 0)) {
              continue;
            }

            // Append the field DOM html to the total output
            fieldHtml += fieldDOMHTML;

            // Close the field element container
            fieldHtml += '<div class="fc-success-box"><span></span></div>';
            fieldHtml += '<div class="fc-error-box"><span></span></div>';
            fieldHtml += '</div>'; // fc-field-element-container

            // Help text
            if (!fc.config.helpAsModal) {
              showHelpAsText = true;
            }

            if (showHelpAsText && getConfig(field, 'help').replace(/(<([^>]+)>)/ig, "").length > 0) {
              fieldHtml += '<div class="fc-help">' + getConfig(field, 'help') + '</div>';
            }

            // Output error text container
            fieldHtml += '<div class="fc-error-text"></div>';

            // Close repeatable tag (if open)
            if (getConfig(field, 'repeatable', false) === true) {
              fieldHtml += '</div>';

              // If rows are outputted in DOM, output container
              if (fc.constants.repeatableInDOM.indexOf(parseInt(repeatableStyle)) >= 0) {
                fieldHtml += '<div class="fc-repeatable-rows">';
              }

              // If repeatable (and to be shown in the DOM), output the rows
              if (fc.constants.repeatableInDOM.indexOf(parseInt(repeatableStyle)) > -1) {
                if (parseInt(repeatableStyle) === fc.constants.repeatablePredetermined) {
                  // Style 2: pre-determined (either has static or DOM)
                  fieldHtml += outputRepeatablePreDetermined(getId(field), getConfig(field, fc.constants.repeatableLinkedTo, 1), section);
                } else {
                  // Style 1: in DOM (initial value must be how many are saved)
                  if (fc.fields[getId(field)] !== undefined && $.isArray(fc.fields[getId(field)])) {
                    // If values have already been set, use it for the initial array length
                    amountOfRows = fc.fields[getId(field)].length;
                  } else {
                    amountOfRows = getConfig(field, fc.constants.repeatableLinkedTo, 1);
                  }

                  fieldHtml += outputRepeatablePreDetermined(getId(field), amountOfRows, section);
                }
              }

              // If rows are outputted in DOM, close container
              if (fc.constants.repeatableInDOM.indexOf(parseInt(repeatableStyle)) >= 0) {
                fieldHtml += '</div>'; //!fc-repeatable-rows
              }
            }

            // Output a repeatable field
            if (getConfig(field, 'repeatable', false) && (repeatableStyle.length === 0 || fc.constants.repeatableWithButton.indexOf(repeatableStyle) >= 0)) {
              // Add button
              fieldHtml += '<div class="fc-link"><a href="#" class="fc-click fc-add" data-id="' + dataId + '">';
              fieldHtml += getConfig(field, 'addButtonText', '').length > 0 ? getConfig(field, 'addButtonText') : fc.lang.addFieldTextValue;
              fieldHtml += '</a></div>';

              // Remove button (for style '1' - add button in DOM)
              if (parseInt(repeatableStyle) === 1) {
                fieldHtml += '<div class="fc-link"><a href="#" class="fc-click fc-remove';

                if (amountOfRows <= getNumericTagValue(getConfig(field, 'repeatableLinkedTo'))) {
                  fieldHtml += ' fc-hide';
                }

                fieldHtml += '" data-id="' + dataId + '">';
                fieldHtml += getConfig(field, 'removeButtonText', '').length > 0 ? getConfig(field, 'removeButtonText') : fc.lang.removeFieldTextValue;
                fieldHtml += '</a></div>';
              }
            }

            fieldHtml += '<div class="fc-empty"></div>';
            fieldHtml += '</div></div></div>';
            html += fieldHtml;
          }

          return html;
        };

        /**
         * Render repeatable iterator field
         * @param field
         * @param prefix
         * @param section
         * @returns {string}
         */
        renderRepeatableIterator = function (field, prefix, section) {
          if (prefix === undefined) {
            prefix = '';
          }

          // Initialise variables
          var required = getConfig(field, 'required', false),
            fieldId = prefix + getId(field),
            html = '',
            sourceField = getConfig(field, 'sourceField', ''),
            source,
            iterator,
            rowValues,
            tags,
            rowFieldId,
            data,
            tagValues,
            row;

          // Check to ensure the field exists
          if (fc.fields[sourceField] === undefined) {
            return html;
          }

          // Check to ensure source field values is an array
          source = fc.fields[sourceField];
          if (!$.isArray(source) || source.length === 0) {
            return '';
          }

          // Retrieve tag and tag values
          tags = getAllFieldTags();
          tagValues = getFieldTagValues();

          html += '<div class="fc-iterator">';

          // Iterate through each value row
          for (iterator = 0; iterator < source.length; iterator += 1) {
            // Map tags against values as well (for token replacement)
            rowValues = fc.fields[sourceField][iterator];
            for (rowFieldId in rowValues) {
              if (rowValues.hasOwnProperty(rowFieldId) && tags[rowFieldId] !== undefined) {
                rowValues[tags[rowFieldId]] = rowValues[rowFieldId];
              }
            }

            // Data to set for token replacement
            data = $.extend({}, tagValues, rowValues);

            // Build row html
            row = '<div class="fc-iterator-row">';
            row += renderFields(field.config.targetGrouplet.field, section, [fieldId, iterator], true, getId(field));
            row += '</div>';

            // Replace tokens and add to html
            row = replaceTokensInDom($(row), data);
            html += row.prop('outerHTML');
          }

          html += '</div>';


          return html;
        };

        /**
         * Render an API look-up field.
         *
         * @param field
         * @param prefix
         * @returns {string}
         */
        renderApiLookupField = function (field, prefix) {
          if (prefix === undefined) {
            prefix = "";
          }

          /*jslint nomen: true*/
          var required = typeof field.config.required === 'boolean' ? field.config.required : false,
            fieldId = prefix + field._id.$id,
            html = '<input class="fc-fieldinput" type="text" formcorp-data-id="' + fieldId + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '">';
          /*jslint nomen: false*/
          return html;
        };

        /**
         * Render a numeric slider field.
         * @param field
         * @param prefix
         */
        renderNumericSliderField = function (field, prefix) {
          if (prefix === undefined) {
            prefix = "";
          }

          // Initial variables
          var required = typeof field.config.required === 'boolean' ? field.config.required : false,
            step = getConfig(field, 'step', 1),
            min = getConfig(field, 'min', 1),
            max = getConfig(field, 'max', 10),
            html = '<input class="fc-fieldinput" type="range" min="' + min + '" max="' + max + '" step="' + step + '" formcorp-data-id="' + getId(field) + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '">';

          // Render the outcome/value
          html += '<span class="fc-numeric-outcome"></span>';

          return html;
        };

        /**
         * Validates a matrix field using the JSON validation string in the field config
         *
         * @param field
         * @returns {Array}
         */
        validateMatrixField = function (field) {
          var errors = [];

          try {
            var validation = $.parseJSON(field.config.validation);
          } catch (exception) {
            log('Malformed JSON string passed for validatoin');
            return errors;
          }

          if (validation !== undefined) {
            var matrix = $('input[formcorp-data-id=' + field._id.$id + ']');
            var matrixObject = {};
            matrix.each(function() {
              var matrixHeader = $(this).attr('formcorp-matrix-header');
              var matrixField = $(this).attr('formcorp-matrix-field');
              if (matrixObject[matrixHeader] === undefined) {
                matrixObject[matrixHeader] = {};
              }
              matrixObject[matrixHeader][matrixField] = $(this).val();
            });
          }

          for (var header in matrixObject) {
            if (matrixObject.hasOwnProperty(header)) {
              var total = 0;
              var headersOrdered = [];
              var fieldsLength = 0;
              for (var field in matrixObject[header]) {
                if (matrixObject[header].hasOwnProperty(field)) {
                  fieldsLength++;
                  if (!$.isNumeric(matrixObject[header][field]) && matrixObject[header][field] != '') {
                    errors.push('Field value for ' + header + '-' + field + ' must be numeric');
                  }
                  if (validation.headers !== undefined && validation.headers.header !== undefined) {
                    if (validation.headers.header.integerOnly !== undefined && validation.headers.header.integerOnly == 'true') {
                      if ($.isNumeric(matrixObject[header][field]) && Math.floor(matrixObject[header][field]) != matrixObject[header][field]) {
                        errors.push('Field value for ' + header + '-' + field + ' must be an integer');
                      }
                    }
                    if (validation.headers.header.min !== undefined) {
                      if (parseFloat(matrixObject[header][field]) < validation.headers.header.min
                        && matrixObject[header][field] != ''
                      ) {
                        errors.push('Field value for ' + header + '-' + field + ' can be no less than ' + validation.headers.header.min);
                      }
                    }
                    if (validation.headers.header.max !== undefined) {
                      if (parseFloat(matrixObject[header][field]) > validation.headers.header.max
                        && matrixObject[header][field] != ''
                      ) {
                        errors.push('Field value for ' + header + '-' + field + ' can be no greater than ' + validation.headers.header.max);
                      }
                    }
                  }
                  if ($.isNumeric(matrixObject[header][field])) {
                    total += parseFloat(matrixObject[header][field]);
                  }
                  if (validation.headers !== undefined &&
                    validation.headers.header !== undefined &&
                    validation.headers.header.ordered !== undefined &&
                    validation.headers.header.ordered == 'true'
                  ) {
                    headersOrdered.push(parseFloat(matrixObject[header][field]));
                  }
                }
              }

              if (validation.headers !== undefined &&
                validation.headers.header !== undefined &&
                validation.headers.header.ordered !== undefined &&
                validation.headers.header.ordered == 'true'
              ) {
                var validOrder = true;
                for (var i = 1; i <= fieldsLength; i++) {
                  if (headersOrdered.indexOf(i) == -1) {
                    validOrder = false;
                  }
                }
                if (validOrder == false) {
                  errors.push('Fields values for ' + header + ' are not in order from 1 to ' + fieldsLength);
                }
              }
              if (validation.headers !== undefined && validation.headers.total !== undefined) {
                if (validation.headers.total.equals !== undefined) {
                  if (total != validation.headers.total.equals) {
                    errors.push('Totals for ' + header + ' do not equal ' + validation.headers.total.equals);
                  }
                }
                if (validation.headers.total.min !== undefined) {
                  if (total < validation.headers.total.min) {
                    errors.push('Totals for ' + header + ' can be no less than ' + validation.headers.total.min);
                  }
                }
                if (validation.headers.total.max !== undefined) {
                  if (total > validation.headers.total.max) {
                    errors.push('Totals for ' + header + ' can be no greater than ' + validation.headers.total.max);
                  }
                }
              }
            }
          }

          return errors;
        };

        /**
         * Load Matrix Values from JSON string and load them into the form
         *
         * @param fieldId
         * @param data
         */
        loadMatrixFieldValues = function (fieldId, data) {
          if (typeof data !== 'string' || data.length < 0 || data.substr(0,1) !== '{') {
            return;
          }

          data = JSON.parse(data);
          var matrix = $('input[formcorp-data-id=' + fieldId + ']');
          matrix.each(function() {
            var matrixHeader = $(this).attr('formcorp-matrix-header');
            var matrixField = $(this).attr('formcorp-matrix-field');
            $(this).val(data[matrixHeader][matrixField]);
            var total = 0;
            $('input[data-matrix-name^="fc-' + $(this).attr('formcorp-matrix-header') + '"]').each(function () {
              if ($.isNumeric($(this).val())) {
                total += parseFloat($(this).val());
              }
            });
            $('input[data-matrix-total^="fc-' + $(this).attr('formcorp-matrix-header') + '"]').val(total);
          });
        };

        /**
         * Parse Matrix Field values and return them as either JSON Object or string
         *
         * @param field
         * @param json
         * @returns {{string | Object}}
         */
        parseMatrixField = function (field, json) {
          var matrix = $('input[formcorp-data-id=' + $(field).attr('formcorp-data-id') + ']');
          var matrixObject = { };
          matrix.each(function () {
            var matrixHeader = $(this).attr('formcorp-matrix-header');
            var matrixField = $(this).attr('formcorp-matrix-field');
            if (matrixObject[matrixHeader] === undefined) {
              matrixObject[matrixHeader] = {};
            }
            matrixObject[matrixHeader][matrixField] = $(this).val();
          });
          if (json === true) {
            return JSON.stringify(matrixObject);
          }
          return matrixObject;
        };

        /**
         * Builds the matrix table.
         * @param field
         * @param headers
         * @param fieldSchema
         * @param width
         * @param fieldId
         * @param type
         * @param required
         */
        buildMatrixTable = function(field, headers, fields, width, fieldId, type, required) {
          var html = '<table class="fc-matrixtable">';
          html += '<tr>';
          html += '<th style="width:25%;">' + field.config.title + '</th>';
          for (var j = 0; j < headers.length; j++) {
            html += '<th style="width:' + width + '%;" class="fc-matrix-headerrow">' + headers[j] + '</>';
          }
          html += '</tr>';
          for (var i = 0; i < fields.length; i++) {
            html += '<tr>';
            html += '<td class="fc-matrix-fieldcolumn">' + fields[i] + '</td>';
            for (var j = 0; j < headers.length; j++) {
              html += '<td class="fc-matrix-field"><input class="fc-fieldinput fc-matrixfieldinput" data-matrix-name="fc-' + headers[j] + '" type="text" formcorp-matrix-header="' + headers[j] + '" formcorp-matrix-field="' + fields[i] + '" formcorp-data-id="' + fieldId + '" data-required="' + required + '"></td>';
            }
            html += '</tr>';
          }
          if (field.config.summaryWidget == true) {
            html += '<tr>';
            html += '<th class="fc-matrix-fieldcolumn">Total</th>';
            for (var j = 0; j < headers.length; j++) {
              html += '<td class="fc-matrix-field"><input class="fc-fieldinput fc-headerstotal" type="text" data-matrix-total="fc-' + headers[j] + '" value="0" readonly="true"></td>';
            }
            html += '</tr>';
          }
          html += '</table>';

          return html;
        };

        /**
         * Render a matrix field.
         * @param field
         * @returns {string}
         */
        renderMatrixField = function (field, prefix) {
          if (prefix === undefined) {
            prefix = "";
          }

          var required = typeof field.config.required === 'boolean' ? field.config.required : false,
            fieldId = prefix + getId(field),
            html = '',
            type = 'text';

          html = '';

          try {
            var validation = $.parseJSON(field.config.validation);
          } catch (exception) {
            log('Malformed JSON string passed for validation');
            var validation = null;
          }

          if ($.isNumeric(field.config.columns) && field.config.columns > 1) {
            var displayColumns = parseInt(field.config.columns);
          } else {
            var displayColumns = 1;
          }

          if (field.config.headers.length > 0 && field.config.fields.length > 0) {
            var headers = field.config.headers.split('|');
            var fields = field.config.fields.split('|');
            var width = 75 / (headers.length);
            if (headers.length > 0 && fields.length > 0) {
              if (displayColumns > 1) {
                var numberOfFields = Math.ceil(fields.length / displayColumns);
                var fieldsModulus = fields.length % displayColumns;
                var fieldsToSend = fields;
                html = '';
                for (var i = 0; i < displayColumns; i++) {
                  if (i == fieldsModulus) {
                    numberOfFields--;
                  }
                  var fts = fieldsToSend.splice(0, numberOfFields);
                  html += '<div class="fc-matrixtable-column" style="float:left; padding-left:15px; padding-right: 15px; width:' + (100 / displayColumns) + '%;">';
                  html += buildMatrixTable(field, headers, fts, width, fieldId, type, required);
                  html += '</div>';
                }
              } else {
                html = buildMatrixTable(field, headers, fields, width, fieldId, type, required);
              }

              fc.domContainer.on('change', '.fc-matrixfieldinput', function() {
                if ($.isNumeric($(this).val()) || $(this).val() == '') {
                  var total = 0;
                  $('input[data-matrix-name^="' + $(this).data('matrix-name') + '"]').each(function () {
                    if ($.isNumeric($(this).val())) {
                      total += parseFloat($(this).val());
                    }
                  });
                  $('input[data-matrix-total^="' + $(this).data('matrix-name') + '"]').val(total);
                }
              });
            }
          }
          return html;
        };

        /**
         * Return errors on an individual file upload
         * @param field
         * @param value
         * @returns {Array}
         */
        isValidFile = function (field, value) {
          var errors = [];

          if (field.config !== undefined && (field.config.maxFileSize !== undefined || field.config.fileTypes !== undefined)) {
            if (field.config.maxFileSize !== undefined && $.isNumeric(field.config.maxFileSize) && field.config.maxFileSize > 0) {
              if ((value.size / 1000) > field.config.maxFileSize) {
                errors.push(fc.lang.fileFieldSizeError + field.config.maxFileSize + 'KB');
              }
            }
            if (field.config.fileTypes !== undefined && field.config.fileTypes.length > 0) {
              var fileTypesAllowed = field.config.fileTypes.toLowerCase().split(',').map(function(ext) {
                return ext.replace(/\W/, '')
              });
              if (fileTypesAllowed.indexOf(value.extension.toLowerCase()) == -1) {
                errors.push('is of unallowed file type. Accepted File Types: ' + fileTypesAllowed.join(', '));
              }
            }
          }

          return errors;
        };

        /**
         * Validate a file upload field
         *
         * @param field
         * @param value
         * @returns {Array}
         */
        validateFileUpload = function (field, value) {
          var errors = [],
              valueJson = JSON.parse(value);

          for (var i = 0; i < valueJson.length; i++) {
            var fieldErrors = isValidFile(field, valueJson[i]);
            if (fieldErrors.length > 0) {
              $.merge(errors, fieldErrors);
            }
          }

          if (errors.length > 0) {
            errors = [
                fc.lang.invalidFiles
            ];
          }

          return errors;
        };

        /**
         * Render a file upload field
         * @param field
         * @param prefix
         * @returns {string}
         */
        renderFileUpload = function(field, prefix) {
          var data, html;

          if (prefix === undefined) {
            prefix = "";
          }

          var multiple = typeof field.config.multiple === 'boolean' ? (field.config.multiple == true ? 'multiple' : '') : '';
          var required = typeof field.config.required === 'boolean' ? field.config.required : false;

          html = '<input class="fc-fieldinput" formcorp-data-id="' + getId(field) + '" type="hidden" id="' + getId(field) + '" />';

          html += '<input class="fc-fieldinput" formcorp-file-id="' + getId(field) + '" type="file" id="file-' + getId(field) + '" ' + multiple + ' style="display:none;" />';

          html += '<input class="fc-fieldinput fc-fieldinput-attachButton" type="button" value="Attach File(s)" data-required="' + required + '" onclick="document.getElementById(\'file-' + getId(field) + '\').click();" style="padding: 5px;" />';

          html += '<div class="fc-progress-list" id="fc-progress-list-' +getId(field) + '"></div>'
          html += '<div class="fc-file-list"></div>';

          if (fc.registeredDeleteFileListeners !== true) {
            registerDeleteFileListeners();
          }

          if (fc.registeredRemoveFileErrorListeners !== true) {
            registerRemoveFileErrorListeners();
          }

          return html;
        };

        deleteFileUpload = function(fieldId, key)
        {
          var field = fc.domContainer.find('[formcorp-data-id="' + fieldId + '"]'),
              value = field.val(),
              fileList = JSON.parse(value);

          fileList.splice(key,1);
          value = JSON.stringify(fileList);
          field.val(value);
          valueChanged(fieldId, value);
          buildFileList(fieldId, value);
        };

        /**
         * Build the list of files the user has uplodaed
         * @param fieldId
         * @param value
         */
        buildFileList = function(fieldId, value) {
          var field = fc.fieldSchema[fieldId],
              dataGroup = fc.domContainer.find('[fc-data-group="' + fieldId + '"]'),
              fileListBox = dataGroup.find('.fc-file-list'),
              fileList = JSON.parse(value),
              actualValue = [],
              html = '',
              success = false,
              errors = false;

          for (var i = 0; i < fileList.length; i++) {
            var fileErrors = isValidFile(field, fileList[i]);
            if (fileErrors.length == 0) {
              html += '<div class="fc-file-item"><div class="fc-delete-file-upload" data-file-list-key="' + i + '" data-for="' + fieldId + '" style="cursor:pointer;">&#10006;</div> ' + fileList[i].filename + ' (' + parseFloat(fileList[i].size/1000).toFixed(0) + ' KB)</div>';
              actualValue.push(fileList[i]);
              success = true;
            } else {
              errors = true;
              var errorText = '';
              var br = '';
              errorText += '<div class="fc-file-item fc-file-item-error"><span class="fc-file-upload-error">'+br+'<span>' + fc.lang.fileFriendlyFieldErrorPrefix + '</span> ' + fileList[i].filename + ' (' + parseFloat(fileList[i].size/1000).toFixed(0) + ' KB)';
              errorText += ' <span>';
              for (var j = 0; j < fileErrors.length; j++) {
                errorText += fileErrors[j] + '. ';
              }
              errorText += '</span><span class="fc-dismiss-upload-error-message" onclick="$(this).parent().remove();" style="text-decoration:underline;cursor:pointer;"> Dismiss</span> </span></div>';
              html += errorText;
            }
          }

          var inputField = $('#' + fieldId);
          inputField.val(JSON.stringify(actualValue));
          valueChanged(fieldId, JSON.stringify(actualValue));
          fileListBox.html(html);

          if (success === true ||
              (
                typeof field.config !== undefined &&
                field.config.required == false
              )
          ) {
            removeFieldError(fieldId);
            showFieldSuccess(fieldId);
          } else {
            showFieldError(fieldId, [ fc.lang.noValidFiles ]);
            removeFieldSuccess(fieldId);
          }
        };



      /**
       * Register the remove file error listeners
       */
      registerRemoveFileErrorListeners = function () {
        if (fc.registeredRemoveFileErrorListeners) {
          return;
        }

        fc.domContainer.on('click', '.fc-fieldinput-attachButton', function () {
          setTimeout(function () {
            $('.fc-file-upload-error').remove();
          }, 1000);
        });

        fc.registeredRemoveFileErrorListeners = true;
      };



        /**
         * Register the delete file listeners
         */
        registerDeleteFileListeners = function () {
          if (fc.registeredDeleteFileListeners) {
            return;
          }

          fc.domContainer.on('click', '.fc-field-fileUpload .fc-delete-file-upload', function () {
            var obj = $(this);
            var fieldId = obj.attr('data-for');
            var key = obj.attr('data-file-list-key');
            deleteFileUpload(fieldId, key);

            return false;
          });

          fc.registeredDeleteFileListeners = true;
        };

        /**
         * Render a digital signature field
         * @param field
         * @param prefix
         * @returns {*}
         */
        renderDigitalSignatureField = function (field, prefix) {
          var data, html;

          if (prefix === undefined) {
            prefix = "";
          }

          data = {
            "values" : fc.fields
          };

          html = '<a class="fc-button">Sign Document</a>';

          fc.domContainer.on('click', '.fc-field-digsigCollect .fc-button', function() {
            var formData = {},
              obj = $(this),
              data,
              page,
              value,
              dataId,
              oldPage,
              newPage,
              fields = getPageVisibleFieldsFromDom(fc.currentPage);

            if (fields !== false) {
              fields.each(function () {
                var fieldObj = $(this);
                dataId = fieldObj.attr('formcorp-data-id');

                // If belongs to a grouplet, need to process uniquely - get the data id of the root grouplet and retrieve from saved field states
                if (fieldObj.hasClass('fc-data-repeatable-grouplet')) {
                  if (formData[dataId] === undefined) {
                    formData[dataId] = fc.fields[dataId];
                  }
                } else {
                  // Regular fields can be added to the flat dictionary
                  value = getFieldValue(fieldObj);
                  if (fc.fields[dataId] !== value) {
                    setVirtualValue(dataId, value);
                  }

                  formData[dataId] = value;
                }
              });
            }

            // Build the data object to send with the request
            data = {
              form_id: fc.formId,
              page_id: fc.currentPage,
              form_values: formData
            };

            api('page/submit', data, 'put', function(data) {
              if (typeof data === 'object' && data.success === true) {
                api('digsig/gateway/upload', { 'field_id' : field._id.$id }, 'POST', function(data) {
                  if (typeof data === 'object' && data.success === true) {
                    html = '<iframe class="fc-field-digsigIframe" src="' + data.data.url + '" width="100%" height="350"></iframe>';

                    $('.fc-field-digsigCollect').append(html);
                    $('.fc-field-digsigCollect .fc-fieldcontainer .fc-fieldgroup').remove();

                    // Poll the OmniSign API every second to determine if it is signed.
                    var digsigCheck = setInterval(function () {
                      api('digsig/gateway/data', { 'field_id' : field._id.$id, 'uuid' : data.data.data }, 'POST', function(data) {
                        if (data.data.data.signed_at > 0) {
                          $('.fc-field-digsigIframe').remove();
                          clearInterval(digsigCheck);
                          html = '<span>You have successfully submitted your Digital Signature</span>';
                          $('.fc-field-digsigCollect').append(html);
                        }
                      });
                    }, 1000);
                  } else {
                    html = '<span>There was an error connecting to OmniSign</span>';
                    $('.fc-field-digsigCollect').append(html);
                    $('.fc-field-digsigCollect .fc-fieldcontainer .fc-fieldgroup').remove();
                  }
                });
              }
            });
          });

          return html;
        };

        /**
         * Render a date field
         * @param field
         * @returns {string}
         */
        renderDateField = function (field, prefix) {
          if (typeof prefix === 'undefined') {
            prefix = "";
          }

          var required = typeof field.config.required === 'boolean' ? field.config.required : false,
            fieldId = prefix + getId(field),
            html = '',
            type = 'text',
            intervalId;

          // If the datepicker hasn't been initialised, do so now
          if (hasLib(fc.libs.MATERIAL_DATEPICKER)) {
            if (typeof fc.materialDatepickers[fieldId] === 'undefined') {
              intervalId = setInterval(function () {
                if (typeof fc.loadedMaterialDatepicker === 'boolean' && fc.loadedMaterialDatepicker) {
                  fc.materialDatepickers[fieldId] = new MaterialDatePicker({
                    format: 'dd/MM/YY'
                  });

                  // Bind on to submit
                  fc.materialDatepickers[fieldId].on('submit', function (val) {
                    var date = val._d,
                      day = ("0" + date.getDate()).slice(-2),
                      monthIndex = date.getMonth(),
                      month = ("0" + ++monthIndex).slice(-2),
                      year = date.getFullYear(),
                      hours = ("0" + date.getHours()).slice(-2),
                      minutes = ("0" + date.getMinutes()).slice(-2),
                      fieldSchema = fc.fieldSchema[fieldId];

                    if (typeof fieldSchema === 'object') {
                      // Retrieve individual date components
                      var dateFormat = getConfig(fieldSchema, 'dateFormat', 'DD/MM/YYYY'),
                        timeFormat = getConfig(fieldSchema, 'timeFormat', 'hh:mm'),
                        displayTime = getConfig(fieldSchema, 'displayTimePicker', false),
                        dateStringObj = [dateFormat];

                      // Append the time string if enabled
                      if (displayTime) {
                        dateStringObj.push(timeFormat);
                      }

                      // Format the date string
                      var dateString = dateStringObj.join(' ');
                      dateString = dateString.replace(/DD/g, day, dateString);
                      dateString = dateString.replace(/MM/g, month, dateString);
                      dateString = dateString.replace(/YYYY/g, year, dateString);
                      dateString = dateString.replace(/hh/g, hours, dateString);
                      dateString = dateString.replace(/mm/g, minutes, dateString);

                      // Update the value locally
                      setValue(fieldId, dateString);
                      fc.saveQueue[fieldId] = dateString;
                    }
                  });

                  // The datepicker has properly been initialised, clear the interval
                  clearInterval(intervalId);
                }
              }, 50);
            }
          }

          // Add class to display the time picker
          var additionalClasses = [];
          if (getConfig(field, 'displayTimePicker', false)) {
            additionalClasses.push('time-picker');
          }

          html = '<input class="fc-fieldinput ' + additionalClasses.join(' ')  + '" type="' + type + '" formcorp-data-id="' + fieldId + '" data-required="' + required + '" placeholder="' + getConfig(field, 'placeholder') + '"><i class="fa fa-calendar"></i>';

          return html;
        };

        /**
         * Download a file
         * @param {string} fieldId
         */
        downloadFieldFile = function (fieldId) {
          var field = fc.fieldSchema[fieldId];

          if (typeof field !== 'object' || field.type !== 'download') {
            return false;
          }

          var fileSource = getConfig(field, 'fileSource', false);
          if (!fileSource) {
            return false;
          }

          var key = getConfig(field, 'attachmentKey', false);
          if (!key) {
            return false;
          }

          api('download/attachment?key=' + key, {}, 'post', function (result) {
            if (typeof result === 'object' && result.success) {
              var downloadKey = result.key;
              var downloadUrl = apiUrl() + 'download/download-attachment?key=' + downloadKey;

              $("body").append("<iframe src='" + downloadUrl + "' style='display: none;' ></iframe>");
            }
          });

        };

        /**
         * Register the download event listeners
         */
        registerDownloadListeners = function () {
          if (fc.registeredDownloadButtonListeners) {
            return;
          }

          fc.domContainer.on('click', '.fc-field-download .fc-button', function () {
            var obj = $(this);
            var fieldId = obj.attr('data-for');
            downloadFieldFile(fieldId);

            return false;
          });

          fc.registeredDownloadButtonListeners = true;
        };

        /**
         * Render the download field
         * @param {object} field
         * @param {!string} prefix
         * @return {string}
         */
        renderDownloadField = function (field, prefix) {
          var fieldId = prefix + getId(field);
          var deliveryMethod = getConfig(field, 'deliveryMethod');
          var fileSource = getConfig(field, 'fileSource');
          var html = '';

          switch (deliveryMethod) {
            case 'BUTTON':
              // Render a button to download the file
              var buttonText = getConfig(field, 'buttonText', fc.lang.downloadButtonText);
              html += '<button class="fc-button" data-for="' + fieldId + '">' + buttonText + '</button>';
              if (fc.registeredDownloadButtonListeners !== true) {
                registerDownloadListeners();
              }
              break;

            case 'AUTO':
              // Automatically download the file
              downloadFieldFile(fieldId);
              break;
          }

          return html;
        };

        /**
         * Render a customer record field.
         * @param field
         * @param prefix
         */
        renderCustomerRecord = function (field, prefix) {
          if (getConfig(field, 'showLoadingScreen', false)) {
            fc.domContainer.find('.fc-loading-screen').addClass('show');
          }

          /**
           * @param result
           */
          var entityRecordCallback = function (field, result) {
            if (result) {
              if (result.success && result.data && typeof result.data.values === 'object') {
                var key, val, tags = {}, iterator, field, obj, entityFields;

                // Update the entities for the given submission
                entityFields = fc.fields['entities'];
                if (typeof entityFields === 'undefined') {
                  // If not defined, default to empty array
                  entityFields = [];
                }
                if (entityFields.indexOf(result.recordId)) {
                  // If array does not contain the record id, add it
                  entityFields.push(result.recordId);
                }
                // Update the value
                setValue('entities', entityFields);

                // Queue the entity field for immediate server-side propagation
                fc.saveQueue['entities'] = entityFields;

                // Hide the loading screen
                if (getConfig(field, 'showLoadingScreen', false)) {
                  fc.domContainer.find('.fc-loading-screen').removeClass('show');
                }

                obj = fc.domContainer.find('[fc-data-group="' + getId(field) + '"]');

                // Process the tags
                for (iterator = 0; iterator < result.fields.length; iterator += 1) {
                  field = result.fields[iterator];
                  tags[field.id] = field.machineName;
                }

                // Process each result and make them available within the form
                for (key in result.data.values) {
                  if (result.data.values.hasOwnProperty(key)) {
                    val = result.data.values[key];
                    setValue(key, val);

                    fc.fieldSchema[key] = {
                      _id: {
                        '$id': key
                      },
                      config: {
                        tag: tags[key],
                        type: 'entityRecord'
                      }
                    };
                  }
                }

                setFormState('');

                if (obj.length > 0) {
                  obj.addClass('fc-hide');
                }

                // Update the form fields as required (fields might be linked)
                setFieldValues();
                flushVisibility();

              } else if (!result.success) {
                var obj = fc.domContainer.find('[fc-data-group="' + getId(field) + '"]');
                if (obj.length > 0) {
                  obj.find('.fc-entity-record').addClass('fc-error').html('<label>' + result.message + '</label>');
                }
              }
            }

            replaceTokensInDom();

            // Trigger a result to bind on
            fc.domContainer.trigger(fc.jsEvents.onCustomerAuthResult, [result]);
          };

          // Prevent rendering of further fields until complete
          if (getConfig(field, 'preventRenderUntilComplete', false)) {
            setFormState(fc.constants.stateLoadingEntityRecord);
          }

          var unique = '';
          if (getConfig(field, 'fetchFromSecureToken', false) && (unique = getConfig(field, 'uniqueIdentifier')).length > 0) {
            var token = fc.entityTokens[unique];
            if (typeof token === 'string') {
              var data = {
                method: 'token',
                token: token,
                id: getId(field),
                group: getConfig(field, 'customerGroupId', 0)
              };

              api('customer/gateway/record', data, 'post', function (result) {
                entityRecordCallback(field, result);
              });
            } else {
              log('Missing token for id: ' + unique);
            }

          } else if (getConfig(field, 'fetchIdentifierFromUrl', false)) {
            // Fetch from a unique identifier in the url
            var identifier = getHashVar(fc.config.entityPrefix);
            if (typeof identifier === 'string' && identifier.length > 0) {
              var data = {
                method: 'url',
                id: getId(field),
                identifier: identifier
              };

              api('customer/gateway/record', data, 'post', function (result) {
                entityRecordCallback(field, result);
              });
            }
          } else if (getConfig(field, 'fetchInBg', false)) {
            // Fetch from data sources
            var value = fc.fields[getConfig(field, 'populateFrom')],
              data = {
                id: getId(field),
                value: value === undefined ? '' : value
              };

            api('customer/gateway/record', data, 'post', function (result) {
              entityRecordCallback(field, result);
            });
          }

          return '<div class="fc-entity-record">' + fc.lang.loading + '</div>';
        };

        /**
         * Initialise a greenID field
         * @param field
         * @param prefix
         */
        initGreenIdFieldInDOM = function (field, prefix) {
          var html = '';

          // Force prefix to be a string
          if (typeof prefix !== 'string') {
            prefix = '';
          }

          html += '<div class="fc-init-green-id" fc-prefix="' + prefix + '">Initialising...</div>';
          return html;
        };

        /**
         * Fetch the string for the green ID header
         * @param fieldId
         */
        greenIdFieldHeader = function (fieldId) {
          // Update the summary div
          var summaryHtml = '',
            nameHtml = '',
            addressHtml = '',
            value = getValue(fieldId);

          if (typeof value !== 'object') {
            return '';
          }

          var values = value.values;

          // First line: name
          if (typeof values.title === 'string' && values.title.length > 0) {
            // Title
            nameHtml += (nameHtml.length > 0 ? ' ' : '') + values.title;
          }

          if (typeof values.firstName === 'string' && values.firstName.length > 0) {
            // First name
            nameHtml += (nameHtml.length > 0 ? ' ' : '') + values.firstName;
          }

          if (typeof values.middleName === 'string' && values.middleName.length > 0) {
            // Middle name
            nameHtml += (nameHtml.length > 0 ? ' ' : '') + values.middleName;
          }

          if (typeof values.surname === 'string' && values.surname.length > 0) {
            // Surname
            nameHtml += (nameHtml.length > 0 ? ' ' : '') + values.surname;
          }

          // Second line: address
          if (typeof values.address === 'string' && values.address.length > 0) {
            // Address
            addressHtml += (addressHtml.length > 0 ? ' ' : '') + values.address;
          }

          if (typeof values.suburb === 'string' && values.suburb.length > 0) {
            // Suburb
            addressHtml += (addressHtml.length > 0 ? ', ' : '') + values.suburb;
          }

          if (typeof values.postcode === 'string' && values.postcode.length > 0) {
            // Postcode
            addressHtml += (addressHtml.length > 0 ? ', ' : '') + values.postcode;
          }

          if (typeof values.state === 'string' && values.state.length > 0) {
            // State
            addressHtml += (addressHtml.length > 0 ? '<br>' : '') + values.state;
          }

          if (typeof values.country === 'string' && values.country.length > 0) {
            // Country
            addressHtml += (addressHtml.length > 0 ? ', ' : '') + values.country;
          }

          summaryHtml = '<h5>Complete verification for: </h5><p>' + nameHtml + '<br>' + addressHtml + '</p>';

          // Skip verification
          //summaryHtml += '<div class="fc-green-id-skip-container">';
          //summaryHtml += '<h5>Skip verification</h5>';
          //summaryHtml += '<p>Can\'t verify? Click <a href="#" class="fc-skip-green-id" data-for="' + fieldId + '">here</a> to skip verification. <strong>Note:</strong> if you do opt out of digital verification, you will have to attach documents to your printed application to confirm your identity.</p>';
          //summaryHtml += '</div>';

          return summaryHtml;
        };

        /**
         * Render the Green ID field
         * @param field
         * @param prefix
         * @param bypass
         * @returns {string}
         */
        renderGreenIdField = function (field, prefix, bypass) {
          // Default bypass to false
          if (typeof bypass !== 'boolean') {
            bypass = false;
          }

          // Default prefix to an empty string
          if (typeof prefix !== 'string') {
            prefix = '';
          }

          // If the green id verification hasn't been initialised, do so here (@todo: default screen for initialisation)
          var fieldId = prefix + getId(field);
          var value = getValue(fieldId);

          if (!bypass && (typeof value !== 'object' || typeof value.result === 'undefined' || typeof value.result.userId === 'undefined')) {
            return initGreenIdFieldInDOM(field, prefix);
          }

          // If the credentials have changed (i.e. user has changed name, etc., need to re-verify)
          var html = '',
            summary,
            options = [
              {
                class: "fc-drivers-license",
                title: fc.lang.greenID.options.driversLicense.title,
                desc: fc.lang.greenID.options.driversLicense.body,
                icon: fc.lang.greenID.options.driversLicense.icon
              },
              {
                class: "fc-passport-verification",
                title: fc.lang.greenID.options.passport.title,
                desc: fc.lang.greenID.options.passport.body,
                icon: fc.lang.greenID.options.passport.icon
              }
            ],
            optionString = '',
            iterator,
            contentListField,
            packageHtml,
            sourcesRequiredHtml,
            packages,
            fieldValue = value,
            licenseServices = ['nswrego', 'warego', 'actrego', 'vicrego', 'sarego', 'qldrego'],
            licenseType;

          if (getConfig(field, 'allowSkipping', true)) {
            options.push({
              class: "fc-skip-verification",
              title: fc.lang.greenID.options.skip.title,
              desc: fc.lang.greenID.options.skip.body,
              icon: fc.lang.greenID.options.skip.icon
            });
          }

          // Show a summary in the header
          if (getConfig(field, 'showSummaryInHeader', false)) {
            summary = greenIdFieldHeader(prefix + getId(field));
            html += '<div class="fc-green-id-el fc-green-id-header-summary">' + summary + '</div>';
          }

          // Sources required
          html += '<p class="fc-green-id-el fc-green-id-sources-required" data-for="' + (prefix + getId(field)) + '">' + fc.lang.greenID.html.completePrefix + '</p>';

          // Already initialised
          html += '<div class="fc-green-id-already-initialised-container fc-green-id-el"><div class="alert alert-success" role="alert">' + fc.lang.greenID.html.alreadyInitialised + '</div></div>';

          // Skip text
          html += '<div class="fc-green-id-skipped-container fc-green-id-el"><div class="alert alert-success" role="alert">' + fc.lang.greenID.html.skipped + '</div></div>';

          // Form the html
          html += '<div class="fc-greenid-successfully-verified fc-green-id-el">' + fc.lang.greenID.html.completed + '</div>';

          // Verification error html
          html += '<div class="fc-greenid-verification-error fc-green-id-el">';
          html += '<div class="alert alert-danger" role="alert"><strong>Uh oh!</strong> Unfortunately we weren\'t able to sufficiently verify your credentials to confirm your identity.</div>';
          html += '<h5>What to do?</h5>';
          html += '<p>Please verify the correctness of the details below. If you notice an error, please go back in the form to edit these details and try re-commencing verification.</p>';
          html += '<h5>Please confirm the following details are correct: </h5>';
          html += '<div class="fc-greenid-value-summary fc-green-id-el"></div>';
          html += '<h5>They are correct, what do I do now?</h5>';
          html += '<p>We\'ll have to attempt to verify you manually. Please attach a copy of your drivers licence and/or passport to your printed application and mail it through to us.</p>';
          html += '</div>';

          // Only show the options if the field was properly initialised
          if (fieldValue !== undefined && typeof fieldValue.result === 'object' && Object.keys(fieldValue.result).length > 0) {
            // Generate an options string
            for (iterator = 0; iterator < options.length; iterator += 1) {
              optionString += '["' + options[iterator].title + '","' + options[iterator].desc + '","' + options[iterator].icon + '", "","' + options[iterator].class + '"]' + "\n";
            }

            // Generate field obj
            contentListField = {
              '_id': {
                '$id': prefix + getId(field) + '_rootSelection'
              },
              config: field.config
            };

            // Set default content list field options
            contentListField.config.options = optionString;
            contentListField.config.boxesPerRow = 3;
            contentListField.config.buttonText = 'Select';

            // Generate html for package selection
            packageHtml = renderContentRadioList(contentListField);

            // Add success messages
            packages = $(packageHtml);
            packages.find('.fc-content-content').append('<div class="fc-successfully-verified"> Successfully verified</div>');
            packages.find('.fc-content-content').append('<div class="fc-locked-out-msg"> You have been locked out from using this data source.</div>');

            // Iterates through all of the license types to see if that particular instance has been verified
            if (fieldValue !== undefined && fieldValue.result !== undefined && typeof fieldValue.result.sources === 'object' && packages.find('.fc-drivers-license').length > 0) {
              for (iterator = 0; iterator < licenseServices.length; iterator += 1) {
                licenseType = licenseServices[iterator];
                if (typeof fieldValue.result.sources[licenseType] === 'object' && fieldValue.result.sources[licenseType].passed !== undefined && ['true', true].indexOf(fieldValue.result.sources[licenseType].passed) > -1) {
                  // Look to see if the source is verified
                  packages.find('.fc-drivers-license').addClass('fc-verified');
                } else if (typeof fieldValue.result.sources[licenseType] === 'object' && ['LOCKED_OUT', 'FAILED'].indexOf(fieldValue.result.sources[licenseType].state) > -1) {
                  // Look to see if the source has been locked out
                  packages.find('.fc-drivers-license').addClass('fc-locked-out');
                }
              }
            }

            // Check to see if passport should be checked
            if (fieldValue !== undefined && fieldValue.result !== undefined && typeof fieldValue.result.sources === 'object' && packages.find('.fc-passport-verification').length > 0) {
              if (typeof fieldValue.result.sources['passport'] === 'object' && fieldValue.result.sources['passport'].passed !== undefined && ['true', true].indexOf(fieldValue.result.sources['passport'].passed) > -1) {
                packages.find('.fc-passport-verification').addClass('fc-verified');
              } else if (typeof fieldValue.result.sources['passport'] === 'object' && ['LOCKED_OUT', 'FAILED'].indexOf(fieldValue.result.sources['passport'].state) > -1) {
                // Look to see if the source has been locked out
                packages.find('.fc-passport-verification').addClass('fc-locked-out');
              }
            }

            // Check to see if visa should be checked
            if (fieldValue !== undefined && fieldValue.result !== undefined && typeof fieldValue.result.sources === 'object' && packages.find('.fc-visa-verification').length > 0) {
              if (typeof fieldValue.result.sources['visa'] === 'object' && fieldValue.result.sources['visa'].passed !== undefined && ['true', true].indexOf(fieldValue.result.sources['visa'].passed) > -1) {
                packages.find('.fc-visa-verification').addClass('fc-verified');
              } else if (typeof fieldValue.result.sources['visa'] === 'object' && ['LOCKED_OUT', 'FAILED'].indexOf(fieldValue.result.sources['visa'].state) > -1) {
                // Look to see if the source has been locked out
                packages.find('.fc-visa-verification').addClass('fc-locked-out');
              }
            }

            // Show the packages and the progress bar
            html += '<div class="fc-greenid-verification-packages fc-green-id-el">';
            html += packages.prop('outerHTML');
            html += '<div class="progress fc-greenid-progress fc-green-id-el"><div class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0;">0%</div></div>';
            html += '<div class="fc-greenid-error-summary fc-green-id-el"></div>';
            html += '</div>';

            // Render the options box
            html += '<div class="fc-greenid-options fc-green-id-el"></div>';
          }

          return html;
        };

        /**
         * Render page sections.
         * @param sections
         * @returns {string}
         */
        renderPageSections = function (sections) {
          var html = '',
            x,
            section,
            sectionHtml,
            randomise,
            fields;

          for (x = 0; x < sections.length; x += 1) {
            section = sections[x];
            sectionHtml = '<div class="fc-section fc-section-' + getId(section) + '" formcorp-data-id="' + getId(section) + '" data-form-state="' + fc.formState + '">';
            sectionHtml += '<div class="fc-section-header">';

            if (typeof section.label === 'string' && section.label.length > 0) {
              sectionHtml += '<div class="fc-section-label">';
              sectionHtml += '<h4>' + tokenise(section.label) + '</h4>';
              sectionHtml += '</div>';
            }

            if (typeof section.description === 'string' && section.description.length > 0) {
              sectionHtml += '<div class="fc-section-desc">';
              sectionHtml += '<p>' + tokenise(section.description) + '</p>';
              sectionHtml += '</div>';
            }

            sectionHtml += '</div>';

            sectionHtml += '<div class="fc-section-body">';

            // Render the fields
            if (section.field !== undefined && section.field.length > 0) {
              // If the section questions/fields is to be randomised, need to do so now
              randomise = section.randomOrder === true;
              if (randomise) {
                fields = shuffle(section.field);
              } else {
                fields = section.field;
              }

              sectionHtml += renderFields(fields, section);
            }

            sectionHtml += '</div>';

            sectionHtml += '<div class="fc-section-end"></div>';
            sectionHtml += '</div>';
            html += sectionHtml;
          }

          return html;
        };

        /**
         * Returns true when a next stage exists.
         * @returns {boolean}
         */
        hasNextPage = function () {
          return nextPage(false);
        };

        /**
         * Render a page.
         * @param page
         * @returns {string}
         */
        renderPage = function (page) {
          // Page details
          var pageDiv = '<div class="fc-page fc-page-' + getId(page.page) + '" data-page-id="' + getId(page.page) + '" data-form-state="' + fc.formState + '">',
            submitText = fc.lang.submitText,
            nextPageObj,
            submitClasses = ['fc-submit'];

          pageDiv += '<h1>' + tokenise(page.stage.label) + '</h1>';
          page = page.page;

          /*jslint nomen: true*/
          fc.pageId = page._id.$id;
          /*jslint nomen: false*/
          if (typeof page.label === 'string' && page.label.length > 0) {
            pageDiv += '<h2>' + tokenise(page.label) + '</h2>';
          }
          if (typeof page.description === 'string' && page.description.length > 0) {
            pageDiv += '<h3>' + tokenise(page.description) + '</h3>';
          }

          // Render page sections
          if (page.section.length > 0) {
            pageDiv += renderPageSections(orderObject(page.section));
          }

          nextPageObj = nextPage(false, true);

          // Submit button when a next page exists, or no next page exists
          if (typeof nextPageObj === "object" || (isSubmitPage(page) === false && nextPageObj === false)) {
            // If the next stage is a completion page, alter the submission text
            if ((isSubmitPage(page) === false && nextPageObj === false) || (typeof nextPageObj.page === 'object' && isSubmitPage(nextPageObj.page))) {
              submitText = fc.lang.submitFormText;
              submitClasses.push('fc-submit-form');
            }

            // Only render pagination on non-submission pages
            if (!isSubmitPage(page)) {
              pageDiv += '<div class="fc-pagination" data-form-state="' + fc.formState + '">';

              // Show the prev stage button
              if (fc.config.showPrevPageButton === true) {
                if (typeof fc.prevPages[fc.pageId] === "object") {
                  pageDiv += '<div class="fc-prev-page">';
                  pageDiv += '<input type="submit" value="' + fc.lang.prevButtonText + '" class="fc-btn">';
                  pageDiv += '</div>';
                }
              }

              // Output the submit button
              pageDiv += '<div class="' + submitClasses.join(' ') + '">';
              pageDiv += '<input type="submit" value="' + submitText + '" class="fc-btn">';
              pageDiv += '</div>';
            }
          }

          pageDiv += '<div class="fc-break"></div></div>';

          // Close page div
          pageDiv += '</div>';

          return pageDiv;
        };

        /**
         * Flushses the visibility component of each section when the form state changes.
         */
        flushSectionVisibility = function () {
          fc.domContainer.find('.fc-section').each(function () {
            var dataId = $(this).attr('formcorp-data-id'),
              section,
              visible;

            if (typeof dataId !== 'string' || dataId.length === 0 || typeof fc.sections[dataId] !== 'object') {
              return;
            }

            section = fc.sections[dataId];
            if (objectHasTag(section)) {
              // If the object has tags, check to see if it should be visible
              visible = hasTags(section.tags);
            }

            if (typeof visible !== 'boolean') {
              // Only perform a visibility check if hasn't previously been determined
              if (typeof section.visibility === 'string' && section.visibility.length > 0) {
                visible = eval(section.visibility);
              } else {
                // Default section visibility to true
                visible = true;
              }
            }

            if (visible) {
              $('div.fc-section[formcorp-data-id=' + dataId + ']').removeClass('fc-hide');
            } else {
              $('div.fc-section[formcorp-data-id=' + dataId + ']').addClass('fc-hide');
            }
          });
        };

        /**
         * Flush repeatable grouplet field visibility.
         * @param dataId
         * @param field
         */
        flushRepeatableGroupletVisibility = function (dataId, field) {
          var visible,
            groupletID,
            index,
            fieldID,
            parts,
            visibility,
            re;

          // If the field belongs to a grouplet within the DOM, need to flush visibility
          if (dataId.indexOf(fc.constants.prefixSeparator) > -1) {
            parts = dataId.split(fc.constants.prefixSeparator);

            // Only continue if a minimum of 3 parts were found (needs to be in the format groupletID_index_fieldID)
            if (parts.length >= 2) {
              groupletID = parts[0];

              // Only continue if the root element is a grouplet
              field = fc.fieldSchema[groupletID];
              if (field !== undefined && field.type === 'grouplet' && getConfig(field, 'repeatable', false)) {
                // If the modal style is that so it is shown in the DOM, then process and add to the array
                if (fc.constants.repeatableInDOM.indexOf(parseInt(getConfig(field, 'repeatableStyle', 0))) >= 0) {
                  index = parts[1];
                  fieldID = parts[2];

                  // If the field definition is supplied, fetch the visibility
                  if (fc.fieldSchema[fieldID] !== undefined) {
                    visibility = getConfig(fc.fieldSchema[fieldID], 'visibility', '');
                    if (visibility.length > 0) {
                      // By default, the visibility string will look something along the lines as that below:
                      // (fc.comparisonIn(fc.fields["55878137cd2a4752048b4583_55878137cd2a4752048b4583_55878014cd2a4751048b458d"], ["Yes"], "55878137cd2a4752048b4583_55878137cd2a4752048b4583_55878014cd2a4751048b458d"))
                      // The groupletID_fieldID needs to be replaced in this instance (because its in the DOM as an array) with groupletID_arrayIndex_fieldID)
                      re = new RegExp(groupletID + fc.constants.prefixSeparator, 'g');
                      visibility = visibility.replace(re, '####');
                      visibility = visibility.replace(/#{4,}/g, [groupletID, index, ''].join(fc.constants.prefixSeparator));

                      // Evaludate the visibility logic to determine if the field should be visible
                      visible = eval(visibility);
                      if (typeof visible === 'boolean') {
                        if (visible) {
                          $('div[fc-data-group="' + dataId + '"]').removeClass('fc-hide');
                        } else {
                          $('div[fc-data-group="' + dataId + '"]').addClass('fc-hide');
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        };

        /**
         * Flushes the field visibility options. Should be triggered when the page is first rendered, and when a value
         * changes. A change in value represents a change in form state. When the form's state changes, the visibility of
         * certain fields may need to be altered.
         */
        flushFieldVisibility = function () {
          fc.domContainer.find('.fc-field').each(function () {
            var dataId = $(this).attr('fc-data-group'),
              field,
              visible,
              logic,
              logicMatches,
              processed = [],
              temporaryId,
              iter,
              parts,
              replace,
              re;

            if (typeof dataId !== 'string' || dataId.length === 0 || typeof fc.fieldSchema[dataId] !== 'object') {
              return;
            }

            // If field has a visibility configurative set, act on it
            field = fc.fieldSchema[dataId];
            if (objectHasTag(field.config)) {
              visible = hasTags(field.config.tags);
            }

            //======================================================================
            // PUT OTHER VISIBILITY CHECKS HERE
            //======================================================================

            if (typeof visible !== 'boolean') {
              // Retrieve the logic object
              if (typeof field.config.visibility === 'string' && field.config.visibility.length > 0) {
                logic = toBooleanLogic(field.config.visibility);
              } else if (typeof field.config.visibility === 'object') {
                logic = field.config.visibility;
              }

              // Fields that exist within an iterator who have conditional can create problems. They need to be able to respond to
              // fields that exist within the target grouplet (which have dynamic IDs in the format: iteratorId_iteration_fieldId)
              // However, they also need to be able to act on fields that exist in a global form scope (i.e. standard form fields).
              // Therefore the condition has to be dynamic. We can't set a static condition as this won't evaluate fields within
              // each iteration.
              //
              // The implemented fix below matches all IDs, and checks to see if they exist in a global scope. If they do, it leave
              // them, however if if no definition is found (fc.fieldSchema[ID]), it is assumed the condition is acting on a dynamic
              // value within the row iteration, and the condition updated accordingly.

              // If the field exists within a repeatable iterator, need to check if checks need to be made against other repeatable iterator fields
              if (typeof logic !== 'undefined' && typeof dataId === 'string' && fc.withinIterator[dataId] === true) {
                // Match all field IDs within the condition\
                logicMatches = logic.match(/"[a-f0-9]{24}"/g);

                // If field IDs were found, perform checks on each one
                if ($.isArray(logicMatches) && logicMatches.length > 0) {
                  processed = [];

                  // Iterate through each field ID
                  for (iter = 0; iter < logicMatches.length; iter += 1) {
                    temporaryId = logicMatches[iter].replace(/"/g, '', logicMatches[iter]);

                    // If the ID hasn't been processed previously for this condition, check now
                    if (processed.indexOf(temporaryId) < 0) {
                      // If the matched field ID doesn't exist in the global/root form definition, assume it belongs to the iteration
                      if (fc.fieldSchema[temporaryId] === undefined) {
                        parts = dataId.split(fc.constants.prefixSeparator);

                        // Replace with the row iteration id (dynamic - i.e 5th iteration has ID iteratorId_4_fieldId)
                        if (parts.length >= 2) {
                          replace = [parts[0], parts[1], temporaryId].join(fc.constants.prefixSeparator);
                          re = new RegExp(temporaryId, 'g');
                          logic = logic.replace(re, replace);
                        }
                      }
                      processed.push(temporaryId);
                    }
                  }
                }
              }

              // Evaluate the logic
              visible = eval(logic);
            }

            if (typeof visible === 'boolean') {
              if (visible) {
                $('div[fc-data-group="' + dataId + '"]').removeClass('fc-hide');
              } else {
                $('div[fc-data-group="' + dataId + '"]').addClass('fc-hide');
              }
            }

            // Flush repeatable grouplet visibility (logic to determine if code should actually run exists within the function)
            flushRepeatableGroupletVisibility(dataId, field);
          });
        };

        /**
         * Flushes the visibility of various components throughout the form.
         */
        flushVisibility = function () {
          flushSectionVisibility();
          flushFieldVisibility();
          updateMobileFieldsVisibility();
        };

        /**
         * Update mobile fields
         */
        updateMobileFieldsVisibility = function () {
          fc.domContainer.find('.fc-field.fc-mobile-field').each(function () {
            if (fc.mobileView === true && $(this).hasClass('fc-hide')) {
              $(this).removeClass('fc-hide');
            } else if (fc.mobileView === false && !$(this).hasClass('fc-hide')) {
              $(this).addClass('fc-hide');
            }
          });

          // Update desktop fields
          fc.domContainer.find('.fc-field.fc-desktop-field').each(function () {
            if (fc.mobileView === true && !$(this).hasClass('fc-hide')) {
              $(this).addClass('fc-hide');
            } else if (fc.mobileView === false && $(this).hasClass('fc-hide')) {
              $(this).removeClass('fc-hide');
            }
          });

          fc.inMobileView = fc.mobileView;
        };

        /**
         * Render a form stage
         * @param pageId
         * @param isNextPage
         */
        render = function (pageId, isNextPage) {
          // If expired, do not render anything
          if (fc.expired === true) {
            return;
          }

          // If the page has already been rendered on the page, do not re-render
          if (fc.domContainer.find('.fc-page[data-page-id="' + pageId + '"]').length > 0) {
            return false;
          }

          var page = getPageById(pageId),
            html = '';

          // Ensure returned a valid page
          if (page === undefined) {
            log('FC Error: Page not found');
            return;
          }

          if (typeof page.stage !== 'object') {
            return;
          }

          // Store the previous page
          if (isNextPage === true && fc.currentPage !== undefined) {
            fc.prevPages[pageId] = getPageById(fc.currentPage);
          }

          // Update the current page on render
          fc.currentPage = pageId;

          // Store field schema locally
          updateFieldSchema(page.stage);
          html += renderPage(page);

          if (!fc.config.onePage || isSubmitPage(page.page)) {
            // Show form in stages (if not one page, or if the submission page)
            $(fc.jQueryContainer + ' .render').html(html);
          } else {
            // If a one-page form, append to the DOM
            $(fc.jQueryContainer + ' .render').append(html);
            fc.pageOrders.push(pageId);
            fc.domContainer.find('.fc-pagination').hide();
            fc.domContainer.find('.fc-pagination:last').show();
          }

          fc.domContainer.trigger(fc.jsEvents.onPageRender, [pageId]);
          fc.functions.afterRender(pageId);
        };

        /**
         * Cleanup after rendering a pageId
         * @param pageId string
         */
        afterRender = function (pageId) {
          // Set values from data array
          setFieldValues();

          // Flush the field/section visibility
          flushVisibility();

          // Update the hash, and ignore the hash change event
          fc.ignoreHashChangeEvent = true;
          if (fc.config.updateHash) {
            setHashVar(fc.config.hashPrefix, pageId);
          }

          // Update mobile visibility
          updateMobileFieldsVisibility();

          // Fire the event to signal form finished rendering
          fc.domContainer.trigger(fc.jsEvents.onFinishRender);

          // Initialise greenID fields
          initGreenIdDOMFields();
        };

        /**
         * Render the next page
         * @param shouldRender
         * @param returnPage
         * @param pageId
         * @returns {*}
         */
        nextPage = function (shouldRender, returnPage, pageId) {
          if (typeof shouldRender !== 'boolean') {
            shouldRender = true;
          }

          // By default, should return boolean value
          if (typeof returnPage !== 'boolean') {
            returnPage = false;
          }

          // If no page id specified, use the current page
          if (typeof pageId !== "string") {
            pageId = fc.currentPage;
          }

          var currentPage = getPageById(pageId),
            id,
            foundStage = false,
            x,
            y,
            condition,
            stage,
            foundPage = false,
            pageToRender;

          if (!currentPage || !currentPage.page) {
            return;
          }

          // If have custom rules determining the page to navigate to, attempt to process them
          if (typeof currentPage.page.toCondition === 'object' && Object.keys(currentPage.page.toCondition).length > 0) {
            for (id in currentPage.page.toCondition) {
              if (currentPage.page.toCondition.hasOwnProperty(id)) {
                condition = currentPage.page.toCondition[id];
                if (eval(getBooleanLogic(condition))) {
                  if (shouldRender) {
                    render(id, true);
                  }
                  return returnPage ? getPageById(id) : true;
                }
              }
            }
          }

          // Render the next page by default (first page in next stage)
          for (x = 0; x < fc.schema.stage.length; x += 1) {
            stage = fc.schema.stage[x];

            // If the stage has field tags, check to see if it should be ignored
            if (objectHasTag(stage) && !hasTags(stage.tags)) {
              // Do nothing if has tags but they don't match
              continue;
            }

            if (!fc.config.renderOnlyVertical) {
              // Look horizontally as well
              if (getId(stage) === getId(currentPage.stage)) {
                if (typeof stage.page === 'object' && stage.page.length > 0) {
                  for (y = 0; y < stage.page.length; y += 1) {
                    if (foundPage && typeof pageToRender === 'undefined') {
                      if (objectHasTag(stage.page[y])) {
                        // If the object has tags, check to see if it should be rendered
                        if (hasTags(stage.page[y].tags)) {
                          pageToRender = stage.page[y];
                          break;
                        }
                      } else {
                        // If the page doesn't have tags, it should always be rendered
                        pageToRender = stage.page[y];
                        break;
                      }
                    }

                    if (getId(stage.page[y]) == getId(currentPage.page)) {
                      foundPage = true;
                    }
                  }

                  // After the loop is complete, default back to false
                  foundPage = false;
                }
              }
            }

            // If the stage that is to be rendered has been found, do so
            if (typeof pageToRender === 'undefined' && foundStage && typeof stage.page === 'object' && stage.page.length > 0) {
              // Only mark this page as the one to render if it hasn't been previously defined
              if (objectHasTag(stage.page[0])) {
                // If the object has tags, check to see if it should be rendered
                if (hasTags(stage.page[0].tags)) {
                  pageToRender = stage.page[0];
                  break;
                }
              } else {
                // If the page doesn't have tags, it should always be rendered
                pageToRender = stage.page[0];
                break;
              }
            }

            // If the current iterative stage is the stage of the currently rendered page, mark the next stage to be rendered
            if (getId(stage) === getId(currentPage.stage)) {
              foundStage = true;
            }
          }

          if (typeof pageToRender === 'object') {
            // If found a page, render/return it
            if (shouldRender) {
              render(getId(pageToRender), true);
            }
            return returnPage ? getPageById(getId(pageToRender)) : true;
          }

          return false;
        };

        /**
         * Auto loads the next page
         * @param force boolean
         */
        checkAutoLoad = function (force) {
          if (typeof force !== 'boolean') {
            force = false;
          }

          if (!fc.config.autoLoadPages && !force) {
            return;
          }

          // If a next page exists and the current page is valid, load the next page
          if (hasNextPage() && validForm('[data-page-id="' + fc.currentPage + '"]', false)) {
            fc.functions.loadNextPage(false);
            return true;
          }

          return false;
        };

        /**
         * Function that is fired when a data value changes.
         * @param dataId
         * @param value
         */
        valueChanged = function (dataId, value, force) {
          log('valueChanged(' + dataId + ',' + value + ',' + force + ')');
          var fieldSchema = fc.fieldSchema[dataId],
            errors,
            params,
            dataParams,
            parentId,
            parentField,
            pageId,
            nextField,
            pageDataId,
            foundPage = false,
            loadedNextPage = false,
            allowAutoLoad,
            page,
            parts,
            iterator,
            field,
            linkedTo,
            prePopulate,
            tag,
            tmp,
            replaceContainer,
            replaceHTML,
            replaceHTMLDOM,
            replaceDOM,
            replaceSchema,
            replaceSectionID,
            index,
            groupletID;

          // Register the pre-value changed event listener
          fc.domContainer.trigger(fc.jsEvents.onPreValueChange, [dataId, value, force]);

          if (typeof force !== 'boolean') {
            force = false;
          }

          // If unable to locate the field schema, do nothing (i.e. credit card field changes)
          if (!force && fieldSchema === undefined) {
            log('Schema not defined');
            return;
          }

          // If pre-populating other fields, do so now
          if (typeof value === 'string') {
            prePopulate = getConfig(fieldSchema, 'prePopulate', []);
            if ($.isArray(prePopulate) && prePopulate.length > 0) {
              for (iterator = 0; iterator < prePopulate.length; iterator += 1) {
                tmp = prePopulate[iterator]; // The data id to prepopulate
                if (tmp.length > 0 && (fc.fields[tmp] === undefined || fc.fields[tmp].length === 0)) {
                  setVirtualValue(tmp, value);
                }
              }
            }
          }

          log($.extend({}, fc.fields));

          // If the value hasn't actually changed, return
          if (!force && fc.fields[dataId] !== undefined && fc.fields[dataId] === value) {
            return;
          }

          fc.domContainer.trigger(fc.jsEvents.onFieldValueChange, [dataId, value]);

          // Store when not a repeatable value
          if (dataId.indexOf(fc.constants.prefixSeparator) == -1 && !fieldIsRepeatable(dataId) && !fieldParentIsRepeatable(dataId)) {
            if (typeof dataId === 'string' && dataId.length > 0 && !$.isNumeric(dataId)) {
              setVirtualValue(dataId, value);
            }

            // If a grouplet, save the original state of the grouplet
            if (dataId.indexOf(fc.constants.prefixSeparator) > -1) {
              saveOriginalGroupletValue(dataId, value);
            }

            // Flush the field visibility options
            flushVisibility();
          }

          log($.extend({}, fc.fields));

          // Store against array values when sub field (field_1, field_2) for a repeatable iterator
          if (dataId.indexOf(fc.constants.prefixSeparator) > -1) {
            setVirtualValue(dataId, value);
          }

          // Set the active page id to the page that the field belongs to, delete later pages
          flushActivePageForField(dataId, true);

          // If the item belongs to a repeatable object (or grouplet in the DOM), do not store the changed value
          if (false && dataId.indexOf(fc.constants.prefixSeparator) > -1) {
            dataParams = dataId.split(fc.constants.prefixSeparator);
            parentId = dataParams[0];
            parentField = fc.fieldSchema[parentId];

            if (parentField !== undefined && getConfig(parentField, 'repeatable', false) === true) {
              errors = fieldErrors(dataId);
              if (fc.config.realTimeValidation === true) {
                if (errors !== undefined && errors.length > 0) {
                  // Log the error event
                  logEvent(fc.eventTypes.onFieldError, {
                    fieldId: dataId,
                    errors: errors
                  });

                  removeFieldSuccess(dataId);
                  showFieldError(dataId, errors);
                  return;
                } else {
                  removeFieldError(dataId);
                  showFieldSuccess(dataId);
                }
              }

              // Store the changed value for intermittent saving
              if (fc.config.saveInRealTime === true) {
                fc.saveQueue[dataId] = value;
              }

              return;
            }
          }

          // Don't perform operations on repeatable fields
          if (!fieldIsRepeatable(dataId)) {
            if (typeof dataId === 'string' && dataId.length > 0 && !$.isNumeric(dataId) && dataId.indexOf(fc.constants.prefixSeparator) == -1) {
              setVirtualValue(dataId, value);
            }

            // Flush the field visibility options
            flushVisibility();

            // Check real time validation
            errors = fieldErrors(dataId);
            if (fc.config.realTimeValidation === true) {
              if (errors !== undefined && errors.length > 0) {
                // Log the error event
                logEvent(fc.eventTypes.onFieldError, {
                  fieldId: dataId,
                  errors: errors
                });

                removeFieldSuccess(dataId);
                showFieldError(dataId, errors);
              } else {
                showFieldSuccess(dataId);
                removeFieldError(dataId);
              }
            }

            // Store the changed value for intermittent saving
            if (fc.config.saveInRealTime === true && dataId.indexOf(fc.constants.prefixSeparator) == -1) {
              fc.saveQueue[dataId] = value;
            }

            // Need to get the next value field
            nextField = nextVisibleField(dataId);

            // Register the value changed event
            params = {
              fieldId: dataId,
              success: !errors || errors.length === 0
            };

            if (nextField) {
              params.nextField = nextField;
            }

            // If success, update the completion time
            if (params.success) {
              params.completionTime = (Date.now() - fc.lastCompletedTimestamp) / 1000;

              // If a hesitation time has been recorded, subtract it from the completion time
              if (fc.lastHesitationTime > 0) {
                params.completionTime -= fc.lastHesitationTime;
              }

              // Update timestamps and mark the field as completed
              fc.lastCompletedField = dataId;
              fc.lastCompletedTimestamp = Date.now();
            }

            logEvent(fc.eventTypes.onValueChange, params);
          }

          // Check to see if the next page should be automatically loaded
          pageId = getFieldPageId(dataId);
          page = getPageById(pageId);
          allowAutoLoad = !page || !page.page || !page.page.preventAutoLoad || page.page.preventAutoLoad !== '1';

          if (fc.config.autoLoadPages) {
            if (pageId === fc.currentPage && allowAutoLoad) {
              // Pages have the option of opting out of autoloading
              loadedNextPage = checkAutoLoad();
            }
          }

          // Scroll to the next field if required
          if (getConfig(fc.fieldSchema[dataId], 'allowAutoScroll', true) && fc.config.autoScrollToNextField && !loadedNextPage && nextField && nextField.length > 0) {
            autoScrollToField(dataId, nextField);
          }

          // If the field needs to trigger a re-rendering of an existing field, do it now
          tag = getConfig(fieldSchema, 'tag', '');
          if (tag.length > 0 && fc.reRenderOnValueChange[tag] !== undefined) {
            for (iterator = 0; iterator < fc.reRenderOnValueChange[tag].length; iterator += 1) {
              tmp = fc.reRenderOnValueChange[tag][iterator];
              replaceContainer = fc.domContainer.find('.fc-field[fc-data-group="' + tmp + '"]');
              if (replaceContainer.length > 0) {
                // If the field exists, re-render
                replaceSectionID = replaceContainer.attr('fc-belongs-to');
                replaceSchema = fc.fieldSchema[tmp];
                if (replaceSchema !== undefined && replaceSchema.type === 'grouplet') {
                  replaceHTML = renderFields([replaceSchema], replaceSectionID);
                  if (replaceHTML.length > 0) {
                    replaceHTMLDOM = $(replaceHTML);
                    replaceContainer.html($(replaceHTML).html());

                    // Re-set the fields on the element (whenever the DOM is updated, the field values need to be re-applied)
                    setFieldValues(replaceContainer);
                  }
                }
              }
            }
          }

          fc.domContainer.trigger(fc.jsEvents.onValueChanged, [dataId, value, force]);
        };

        /**
         * When a value for a text/numeric field etc. is updated (no duplicate code)
         * @param obj
         */
        setValueUpdate = function (obj) {
          log('setvalueUpdate()');
          log(obj);
          var val = obj.val(),
            id = obj.attr('formcorp-data-id'),
            schema = fc.fieldSchema[id],
            el;

          if (schema && schema.type && schema.type === 'abnVerification') {
            // Do not want to temporarily store ABN
            el = obj.parent().find('.fc-button');

            if (val.length === 0 || fc.validAbns.indexOf(val) === -1) {
              // If the abn hasn't previously been marked as valid, show the button

              if (el.hasClass('fc-hide')) {
                el.removeClass('fc-hide');
              }
            } else {
              // Otherwise ABN is known to be valid, mark as changed and remove possible errors
              el.addClass('fc-hide');
              valueChanged(id, val);
              removeFieldError(id);
            }

            // Need to update the stored value to ensure proper validation
            if (typeof id === 'string' && id.length > 0 && !$.isNumeric(id)) {
              setVirtualValue(id, val);
            }

            return;
          }

          if (schema && schema.type && schema.type === 'matrix') {
            valueChanged(id, parseMatrixField(obj, true));
            return;
          }

          if (val !== fc.fields[id]) {
            // Only trigger when the value has truly changed
            valueChanged(id, val);
          }
        };

        /**
         * Get the base64 encoding for the file upload
         *
         * @param file
         * @param i
         * @param progressBar
         * @param callback
         */
        function getBase64(file, i, progressBar, callback) {
          var reader = new FileReader();
          reader.onprogress = function(event) {
            if (event.lengthComputable) {
              console.log('file ' + i + ' total: ' + event.total);
              console.log('file ' + i + ' loaded: ' + event.loaded);
              var progress = ((parseFloat(event.loaded) / parseFloat(event.total)).toFixed(2) * 100)
              console.log(progressBar);
              console.log(progress);
              if (event.loaded >= event.total) {
                console.log('remove progress bar');
              }
            }
          }
          reader.onload = function() {
            callback(reader.result, i);
          }
          reader.onerror = function (error) {
            log('Error: ', error);
          };
          reader.readAsDataURL(file);
        };

        /**
         * When a file is uploaded update the value
         * @param obj
         */
        setFileUploadUpdate = function(obj) {
          var id = obj.attr('formcorp-file-id');
          var files = document.getElementById('file-' + id).files;
          if (files.length > 0) {
            var valuesArray = [];
            var base64Array = [];
            for (var i = 0; i < files.length; ++i) {
              valuesArray[i] = {};
              valuesArray[i].filename = files[i].name.replace(/^.*[\\\/]/, '');
              valuesArray[i].extension = valuesArray[i].filename.split('.').pop();
              valuesArray[i].size = files[i].size;
              valuesArray[i].field_id = id;
              var progressBar = '<progress class="fc-file-upload-progress" value="0" max="100"></progress>';
              $('#fc-progress-list-' + id).append(progressBar);
              getBase64(files[i], i, $(progressBar), function(v, i) {
                base64Array[i] = v;
                valuesArray[i].contents = v;
                // Once base64Array.length = files.length then it means all uploaded files base64 data
                // has been loaded and we can update the value for this field.
                if (base64Array.length == files.length) {
                  var updateValue = true;
                  for (var j = 0; j < valuesArray.length; j++) {
                    if (valuesArray[j].contents == undefined || valuesArray[j].contents.length == 0) {
                      updateValue = false;
                    }
                  }
                  if (updateValue) {
                    var uploadData = [];
                    for (j = 0; j < valuesArray.length; j++) {
                      var fileData = {
                        form_id: fc.formId,
                        page_id: fc.currentPage,
                        file: valuesArray[j],
                        j: j
                      };
                      api('page/store-upload', fileData, 'post', function(data) {
                        if (typeof data === "object" && data.success === true && data.submission_values.upload_id.$id !== undefined) {
                          uploadData.push({
                            upload_id: data.submission_values.upload_id.$id,
                            extension: data.submission_values.extension,
                            size: data.submission_values.size,
                            filename: data.submission_values.filename,
                            field_id: data.submission_values.field_id
                          });
                        } else {
                          // Still need these values for validation errors
                          uploadData.push({
                            extension: data.submission_values.extension,
                            size: data.submission_values.size,
                            filename: data.submission_values.filename,
                          });
                        }
                        if (uploadData.length == valuesArray.length) {
                          //reached end of array, submit value
                          var field = $('#' + id);
                          var oldValue = field.val();
                          if (oldValue.length > 0) {
                            var parsed = JSON.parse(oldValue);
                            $.merge(parsed, uploadData);
                            var value = JSON.stringify(parsed);
                          } else {
                            var value = JSON.stringify(uploadData);
                          }
                          field.val(value);
                          valueChanged(id, value);
                          buildFileList(id, value);
                        }
                      });
                    }
                  }
                }
              });
            }
          }
        };

        /**
         * Register event listeners that fire when a form input field's value changes
         */
        registerValueChangedListeners = function () {
          // On enter pressed, opt to shift focus
          if (fc.config.autoShiftFocusOnEnter) {
            fc.domContainer.on('keypress', 'input[type=text].fc-fieldinput, input[type=tel].fc-fieldinput, input[type=number].fc-fieldinput', function (e) {
              if (e.which === fc.constants.enterKey) {
                var dataId = $(this).attr('formcorp-data-id'),
                  nextField = nextVisibleField(dataId, false),
                  nextFieldEl,
                  changedFocus = false,
                  val = $(this).val(),
                  id = $(this).attr('formcorp-data-id');

                // If the field isn't valid, do nothing
                if (!fieldIsValid(id, val)) {
                  return;
                }

                // If the next field is a text box, shift focus to it
                if (nextField && nextField.length > 0) {
                  nextFieldEl = $('.fc-fieldinput[type=text][formcorp-data-id="' + nextField + '"], .fc-fieldinput[type=tel][formcorp-data-id="' + nextField + '"], .fc-fieldinput[type=number][formcorp-data-id="' + nextField + '"]');
                  if (nextFieldEl.length > 0) {
                    nextFieldEl.focus();
                    changedFocus = true;
                  }
                }

                // Focus out if not
                if (!changedFocus) {
                  $(this).blur();
                }

                // Mark the value as changed
                if (val !== fc.fields[id]) {
                  // Only trigger when the value has truly changed
                  valueChanged(id, val);
                }

                // Auto scroll to next field if required
                if (nextField && nextField.length > 0 && fc.config.autoScrollToNextField) {
                  autoScrollToField(dataId, nextField);
                }
              }
            });
          }

          // Input types text changed
          fc.domContainer.on('change', 'textarea.fc-fieldinput, input[type=text].fc-fieldinput, input[type=tel].fc-fieldinput, input[type=number].fc-fieldinput, input[type=radio].fc-fieldinput, input[type=range].fc-fieldinput', function () {
            setValueUpdate($(this));
          });

          fc.domContainer.on('change', 'input[type=file].fc-fieldinput', function() {
            setFileUploadUpdate($(this));
          });

          // Register the focus event
          fc.domContainer.on('focus', 'input[type=text].fc-fieldinput,input[type=tel].fc-fieldinput,input[type=number].fc-fieldinput,textarea.fc-fieldinput', function () {
            var obj = $(this),
              val = obj.val(),
              id = obj.attr('formcorp-data-id');

            fc.domContainer.trigger(fc.jsEvents.onFieldFocus, [id, val, obj]);
          });

          // Input types text changed
          fc.domContainer.on('input', 'input[type=range].fc-fieldinput', function () {
            setRangeValue($(this));
          });

          // On change/paste/blur, update the form field
          fc.domContainer.on('change paste blur', '.fc-field-text input[type=text].fc-fieldinput, .fc-field-text input[type=tel].fc-fieldinput, .fc-field-text input[type=number].fc-fieldinput', function () {
            var obj = $(this),
              val = obj.val(),
              id = obj.attr('formcorp-data-id');

            // Register the blur event
            fc.domContainer.trigger(fc.jsEvents.onFieldBlur, [id, val, obj]);

            if (val !== fc.fields[id]) {
              // Only trigger when the value has truly changed
              valueChanged(id, val);
            }
          });

          // Abn verification lookup
          fc.domContainer.on('click', '.fc-field-abnVerification .fc-button', function () {
            var abn = $(this).parent().find('input.fc-fieldinput'),
              dataId = abn.attr('formcorp-data-id'),
              loading = abn.parent().find('.fc-loading'),
              btn = this,
              mapField;

            removeFieldError(dataId);
            if (loading && loading.length > 0) {
              loading.removeClass('fc-hide');
            }

            // Validate the ABN
            validateAbn(dataId, abn.val(), function (result) {
              var field, id, entityName, container;

              if (loading && loading.length > 0) {
                loading.addClass('fc-hide');
              }

              if (typeof result === "object") {
                if (result.success && [true, "true"].indexOf(result.success) > -1) {
                  mapField = getConfig(fc.fieldSchema[dataId], 'mapBusinessName', '');

                  // Set the business/entity name
                  if (mapField.length > 0 && result.entityName && result.entityName.length > 0) {
                    field = getFieldByTag(mapField);
                    if (field && field !== null && typeof field === "object") {
                      id = getId(field);
                      if (id.length > 0 && (!fc.fields[id] || (typeof fc.fields[id] === "string" && fc.fields[id].length === 0))) {
                        // If an id is set, and the field doesn't exist, or the field is empty, set
                        if (typeof result.businessName === "object" && result.businessName.length > 0) {
                          entityName = result.businessName[0];
                        } else {
                          entityName = result.entityName;
                        }

                        if (typeof id === 'string' && id.length > 0 && !$.isNumeric(id)) {
                          setVirtualValue(id, entityName);
                        }
                        container = $('.fc-field[fc-data-group="' + id + '"]');
                        setFieldValue(container, id);
                      }
                    }
                  }

                  fc.validAbns.push(abn.val());
                  $(btn).remove();
                  valueChanged(dataId, abn.val());
                } else {
                  showFieldError(dataId, [result.message]);
                }
              }
            });
            return false;
          });

          // Radio button clicks
          fc.domContainer.on('click', 'button.fc-fieldinput.fc-button', function () {
            var val = $(this).text(),
              id = $(this).attr('formcorp-data-id'),
              parent = $(this).parent().parent(),
              fieldEl = $('.fc-field[fc-data-group="' + id + '"]'),
              alreadyChecked = $(this).hasClass('checked'),
              dataArray;

            // If the button has a data-field-value field, use it as the value
            if ($(this).attr('data-field-value')) {
              val = decodeURIComponent($(this).attr('data-field-value'));
            }

            if (fc.fieldSchema[id] && fc.fieldSchema[id].type) {
              // Attempt to map the button to a field and process it
              if (['contentRadioList', 'optionTable'].indexOf(fc.fieldSchema[id].type) > -1) {
                val = decodeURIComponent($(this).attr('data-field-value'));

                // If its a radio list, only allow one to be selected
                if (!getConfig(fc.fieldSchema[id], 'allowMultiple', false)) {
                  fieldEl.find('button.checked').removeClass('checked');
                } else {
                  // Checkbox list - allows multiple
                  dataArray = fc.fields[id] || [];
                  if (dataArray.indexOf(val) < 0) {
                    if (!alreadyChecked) {
                      // If the option hasn't been previously selected, add it
                      dataArray.push(val);
                    }
                  } else {
                    // Remove from element if already checked
                    if (alreadyChecked) {
                      delete dataArray[dataArray.indexOf(val)];
                    }
                  }

                  val = dataArray;
                }
              } else if (parent.hasClass('fc-radio-option-buttons')) {
                parent.find('.checked').removeClass('checked');
              }

              $(this).toggleClass('checked');
              valueChanged(id, val);

              return false;
            } else {
              // The button couldn't be mapped to a given field, trigger an error
              fc.domContainer.trigger(fc.jsEvents.onButtonUnknownClick, [$(this)]);
            }


          });

          // Dropdown box change
          fc.domContainer.on('change', 'select.fc-fieldinput', function () {
            valueChanged($(this).attr('formcorp-data-id'), $(this).find('option:selected').val());
          });

          // Radio lists
          fc.domContainer.on('change', '.fc-field-checkboxList :checkbox', function () {
            valueChanged($(this).attr('formcorp-data-id'), getFieldValue($(this)));
          });
        };

        /**
         * Attempts to validate the modal used for adding multi-value attributes.
         * @returns {boolean}
         */
        validateModal = function (showErrors) {
          var valid = true,
            fieldId,
            value,
            field,
            customErrors,
            errors = {};

          // Default to not show errors
          if (typeof showErrors !== 'boolean') {
            showErrors = false;
          }

          // Iterate through each field and validate
          $('.fc-modal [formcorp-data-id]').each(function () {
            // If field is not required, no need to run any validations on it
            if ($(this).attr('data-required') !== 'true') {
              return;
            }

            // If empty and required, return false
            if (fieldIsEmpty($(this))) {
              valid = false;
              return;
            }

            fieldId = $(this).attr('formcorp-data-id');
            value = getFieldValue($(this));
            field = fc.fieldSchema[fieldId];

            // If custom errors exist, return false
            customErrors = getCustomErrors(field, value);
            if (customErrors.length > 0) {
              valid = false;

              errors[fieldId] = customErrors;
              if (showErrors) {
                removeFieldSuccess(fieldId);
                showFieldError(fieldId, customErrors);
              }
            } else {
              showFieldSuccess(fieldId);
              removeFieldError(fieldId);
            }
          });

          return valid;
        };

        /**
         * Show the delete dialog
         * @returns {boolean}
         */
        showDeleteDialog = function () {
          $('.fc-modal .modal-header h2').text(fc.lang.deleteDialogHeader);
          $('.fc-modal .modal-body').html(fc.lang.deleteSignatoryDialogText);
          $('.fc-modal .modal-footer .fc-btn-add').text(fc.lang.confirm);
          $('.fc-modal').addClass('fc-show');
          return false;
        };

        /**
         * Show the delete dialog
         * @returns {boolean}
         */
        showRepeatableEditDialog = function () {
          var html = $("<div />").append($('[fc-data-group="' + fc.modalMeta.fieldId + '"] > .fc-fieldcontainer').clone()),
            values = {},
            modalBody = $('.fc-modal .modal-body');

          // Remove repeatable classes (for validation purposes)
          html.find('.fc-data-repeatable-grouplet').removeClass('fc-data-repeatable-grouplet');

          // If values for this row exist, set
          if (fc.fields[fc.modalMeta.fieldId] && fc.fields[fc.modalMeta.fieldId][fc.modalMeta.index]) {
            values = fc.fields[fc.modalMeta.fieldId][fc.modalMeta.index];
          }

          $('.fc-modal .modal-header h2').text(fc.lang.editDialogHeader);

          // Set the modal body html and update the contents
          modalBody.html(html.html());
          modalBody.find('div[fc-data-group]').each(function () {
            var fieldId = $(this).attr('fc-data-group');
            if (values[fieldId] !== undefined) {
              setDomValue(this, values[fieldId]);
            }

          });

          $('.fc-modal .modal-footer .fc-btn-add').text(fc.lang.confirm);
          $('.fc-modal').addClass('fc-show');
          return false;
        };

        /**
         * Register the event listeners for repeatable grouplets
         */
        registerRepeatableGroupletListeners = function () {
          // Show delete dialog
          fc.domContainer.on('click', '.fc-summary-options .fc-delete', function () {
            // Set the modal state
            fc.modalState = fc.states.DELETE_REPEATABLE;
            fc.modalMeta = {
              index: $(this).parent().attr('data-index'),
              fieldId: $(this).parent().attr('data-field-id')
            };

            showDeleteDialog();
            return false;
          });

          // Show edit dialog
          fc.domContainer.on('click', '.fc-summary-options .fc-edit', function () {
            // Set the modal state
            fc.modalState = fc.states.EDIT_REPEATABLE;
            fc.modalMeta = {
              index: $(this).parent().attr('data-index'),
              fieldId: $(this).parent().attr('data-field-id')
            };

            showRepeatableEditDialog();

            return false;
          });
        };

        /**
         * Add a repeatable row through a modal dialog
         * @returns {boolean}
         */
        addRepeatableRow = function () {
          var validModal = validateModal(),
            values = {},
            modalBody = $('.fc-modal .modal-body > div');

          if (!validModal) {
            modalBody.addClass('fc-error');
            return false;
          }

          modalBody.removeClass('fc-error');

          // Build array of values
          fc.domContainer.find('.fc-modal [formcorp-data-id]').each(function () {
            var dataId = $(this).attr('formcorp-data-id');
            values[dataId] = getFieldValue($(this));
          });

          // Add the values to the array
          if (typeof fc.fields[fc.activeModalField] !== 'object') {
            if (typeof fc.activeModalField === 'string' && fc.activeModalField.length > 0 && !$.isNumeric(fc.activeModalField)) {
              setVirtualValue(fc.activeModalField, []);
            }
          }

          // If not array, initialise as one
          if (!$.isArray(fc.fields[fc.activeModalField])) {
            if (typeof fc.activeModalField === 'string' && fc.activeModalField.length > 0 && !$.isNumeric(fc.activeModalField)) {
              setVirtualValue(fc.activeModalField, []);
            }
          }

          if (typeof fc.activeModalField === 'string' && fc.activeModalField.length > 0 && !$.isNumeric(fc.activeModalField)) {
            fc.fields[fc.activeModalField].push(values);
          }

          // Render a repeatable summary table upon successful add if specified by the user (this should always be set to TRUE)
          if (getConfig(fc.fieldSchema[fc.activeModalField], 'renderRepeatableTable', false)) {
            $('[fc-data-group="' + fc.activeModalField + '"] .fc-summary').html(renderRepeatableTable(fc.activeModalField, fc.fields[fc.activeModalField]));
          }

          // Set to null to signify no repeatable grouplet is being displayed
          hideModal();
        };

        /**
         * Handle the editing of a repeatable row
         */
        editRepeatableRow = function () {
          var selector = $('.fc-modal').find('.modal-body > .fc-fieldcontainer'),
            values = {},
            html;

          if (selector && selector.length > 0 && validateModal(true)) {
            // Build array of values
            fc.domContainer.find('.fc-modal [formcorp-data-id]').each(function () {
              var dataId = $(this).attr('formcorp-data-id');
              values[dataId] = getFieldValue($(this));
            });

            // Add the values to the array
            if (typeof fc.fields[fc.activeModalField] !== 'object') {
              if (typeof fc.activeModalField === 'string' && fc.activeModalField.length > 0 && !$.isNumeric(fc.activeModalField)) {
                setVirtualValue(fc.activeModalField, []);
              }
            }

            if (fc.fields[fc.modalMeta.fieldId] && fc.fields[fc.modalMeta.fieldId][fc.modalMeta.index]) {
              fc.fields[fc.modalMeta.fieldId][fc.modalMeta.index] = values;

              // Update the save queue to send up to the server
              fc.saveQueue[fc.modalMeta.fieldId] = fc.fields[fc.modalMeta.fieldId];

              // Update the summary table and hide the modal
              html = renderRepeatableTable(fc.modalMeta.fieldId, fc.fields[fc.modalMeta.fieldId]);
              $('[fc-data-group="' + fc.modalMeta.fieldId + '"] .fc-summary').html(html);
              hideModal();
            }
          }
        };

        /**
         * Delete a repeatable row through a modal dialog
         */
        deleteRepeatableRow = function () {
          fc.fields[fc.modalMeta.fieldId].splice(fc.modalMeta.index, 1);
          fc.saveQueue[fc.modalMeta.fieldId] = fc.fields[fc.modalMeta.fieldId];

          // Set the html
          var html = renderRepeatableTable(fc.modalMeta.fieldId, fc.fields[fc.modalMeta.fieldId]);
          $('[fc-data-group="' + fc.modalMeta.fieldId + '"] .fc-summary').html(html);

          hideModal();
        };

        /**
         * Load the next page
         * @param showError
         * @param forceSubmit
         * @returns {boolean}
         */
        loadNextPage = function (showError, forceSubmit) {
          if (fc.preventNextPageLoad) {
            return;
          }

          if (showError === undefined) {
            showError = true;
          }

          // Default force submit to false
          if (typeof forceSubmit === 'undefined') {
            forceSubmit = false;
          }

          logEvent(fc.eventTypes.onNextPageClick);

          // Only perform validation on the current page (performance boost)
          var currentPage = fc.domContainer.find('.fc-page[data-page-id="' + fc.currentPage + '"]');
          if (currentPage.length === 0) {
            return;
          }

          if (!validForm(currentPage, showError)) {
            logEvent(fc.eventTypes.onNextPageError);

            // Scroll to first error
            if (showError && fc.config.scrollOnSubmitError) {
              scrollToFirstError();
            }

            return false;
          }

          var formData = {},
            obj = $(this),
            data,
            page,
            value,
            dataId,
            oldPage,
            newPage,
            fields = getPageVisibleFieldsFromDom(fc.currentPage);

          if (fields !== false) {
            fields.each(function () {
              var fieldObj = $(this);
              dataId = fieldObj.attr('formcorp-data-id');

              if (dataId.length) {
                var rootFieldObj = fc.domContainer.find('.fc-field[fc-data-group="' + dataId + '"]');
                // If belongs to a grouplet, need to process uniquely - get the data id of the root grouplet and retrieve from saved field states
                if (rootFieldObj.parent().hasClass('fc-data-repeatable-grouplet')) {
                  // Grouplet is repeatable, do nothing
                } else if (fieldObj.hasClass('fc-data-repeatable-grouplet')) {
                  setVirtualValue(dataId, getValue(dataId), formData);
                } else {
                  // Regular fields can be added to the flat dictionary
                  value = getFieldValue(fieldObj);
                  if (fc.fields[dataId] !== value) {
                    setVirtualValue(dataId, value);
                  }

                  setVirtualValue(dataId, value, formData);
                }
              }
            });
          }

          // Merge form data with the save queue
          if (Object.keys(fc.saveQueue).length) {
            $.extend(formData, getSaveQueue(true));

            // Clear the save queue
            fc.saveQueue = {};
          }

          // Build the data object to send with the request
          data = {
            form_id: fc.formId,
            page_id: fc.currentPage,
            form_values: formData
          };
          // Determine whether the application should be marked as complete
          page = nextPage(false, true);

          if ((page && typeof page.page === "object" && isSubmitPage(page.page)) || page === false) {
            data.complete = true;

            if (!forceSubmit && isDevelopmentBranch()) {
              // Set modal information
              fc.modalState = fc.states.SUBMIT_DEVELOPMENT_BRANCH;

              // Show the modal
              showModal({
                addButton: true,
                addButtonText: fc.lang.yes,
                closeButtonText: fc.lang.no,
                body: fc.lang.confirmSubmitDevelopment,
                title: fc.lang.areSureHeader
              });

              return false;
            }
          }

          // Submit the form fields
          fc.domContainer.trigger(fc.jsEvents.onLoadingPageStart);
          fc.domContainer.find('.fc-loading-screen').addClass('show');

          fc.preventNextPageLoad = true;

          api('page/next', data, 'put', function (data) {
            var lastPage,
              offset,
              nextPageId = false;

            if (typeof data.success === 'boolean' && data.success) {
              // Update activity (server last active timestamp updated)
              if (typeof data.nextPage === 'string' && data.nextPage.length > 0) {
                nextPageId = data.nextPage;
              }

              fc.lastActivity = (new Date()).getTime();
              fc.domContainer.find('.fc-loading-screen').removeClass('show');
              fc.domContainer.trigger(fc.jsEvents.onLoadingPageEnd);

              // If 'critical' errors were returned (validation errors on required fields), need to alert the user
              if (!fc.config.administrativeEdit) {
                if (data.criticalErrors !== undefined && typeof data.criticalErrors === "object" && data.criticalErrors.length > 0) {
                  var x, field, sectionId, section, valid = false;
                  for (x = 0; x < data.criticalErrors.length; x += 1) {
                    field = $('.fc-field[fc-data-group="' + data.criticalErrors[x] + '"]');

                    // If the field exists and isn't hidden, user should not be able to proceed to next page (unless section invisible)
                    if (field.length > 0 && !field.hasClass('fc-hide')) {
                      sectionId = field.attr("fc-belongs-to");
                      section = fc.domContainer.find('.fc-section[formcorp-data-id=' + sectionId + ']');

                      // If the section exists and is visible, do not proceed to the next stage
                      if (section.length > 0) {
                        if (!section.hasClass('fc-hide')) {
                          fc.preventNextPageLoad = false;
                          return;
                        }
                        valid = true;
                      }

                      if (valid === false) {
                        log("[FC](1) Server side validation errors occurred, client should have caught this");
                        fc.preventNextPageLoad = false;
                        return;
                      }
                    }
                  }
                }
              }

              // Render the next page if available
              if (hasNextPage()) {
                oldPage = fc.currentPage;
                nextPage();
                newPage = fc.currentPage;

                if (typeof nextPageId === 'string' && nextPageId.length > 0 && nextPageId !== newPage) {
                  // There was a page mismatch between the server and the client, throw out a critical error
                  showSecurityError({
                    message: 'Next page mismatch between client and server'
                  });
                }

                // Trigger the newpage event
                fc.domContainer.trigger(fc.jsEvents.onNextPage, [oldPage, newPage]);
                fc.domContainer.trigger(fc.jsEvents.onPageChange, [oldPage, newPage]);
                logEvent(fc.eventTypes.onNextPageSuccess, {
                  from: oldPage,
                  to: newPage,
                  timeSpent: (Date.now() - fc.nextPageLoadedTimestamp) / 1000
                });

                fc.nextPageLoadedTimestamp = Date.now();

                // If the application is complete, raise completion event
                if (typeof page.page === "object" && isSubmitPage(page.page)) {
                  fc.domContainer.trigger(fc.jsEvents.onFormComplete);
                  logEvent(fc.eventTypes.onFormComplete);
                }

                if (fc.nextPageButtonClicked && fc.config.onePage && fc.config.smoothScroll) {
                  lastPage = $('.fc-page:last');
                  if (lastPage && lastPage.length > 0) {
                    offset = parseInt(lastPage.offset().top, 10) + parseInt(fc.config.scrollOffset, 10);

                    // If at the top of the page, apply the initial offset
                    if ($(document).scrollTop() === 0) {
                      offset += fc.config.initialScrollOffset;
                    }

                    // Apply a conditional offset
                    if (fc.config.conditionalHtmlScrollOffset.class !== undefined) {
                      if ($('html').hasClass(fc.config.conditionalHtmlScrollOffset.class)) {
                        offset += fc.config.conditionalHtmlScrollOffset.offset;
                      }
                    }

                    // Scroll to offset
                    scrollToOffset(offset);

                    fc.nextPageButtonClicked = false;
                  }
                }

                fc.preventNextPageLoad = false;
                if (fc.config.forceNextPageAutoload) {
                  var currentPage = getPageById(fc.currentPage);
                  var formNextPage = nextPage(false, true);
                  if (!isSubmitPage(currentPage) && !isSubmitPage(formNextPage.page) && hasNextPage()) {
                    // If not a submit page, and has a next page, attempt to autoload
                    checkAutoLoad(true);
                  }
                }

                return;
              }

              // Form is deemed complete, output default completion message
              $(fc.jQueryContainer + ' .render').html(fc.lang.formCompleteHtml);
              fc.domContainer.trigger(fc.jsEvents.onFormComplete);
              logEvent(fc.eventTypes.onFormComplete);
            } else {
              logEvent(fc.eventTypes.onNextPageError);
            }

            // Show an enhanced security error if detected
            if (enhancedSecurityError(data)) {
              showSecurityError(data);
              fc.domContainer.find('.fc-loading-screen').removeClass('show');
              fc.domContainer.trigger(fc.jsEvents.onLoadingPageEnd);
            }

            fc.preventNextPageLoad = false;
          });
        };

        /**
         * Load the previous page
         */
        loadPrevPage = function () {
          if (fc.config.showPrevPageButton !== true) {
            return false;
          }

          fc.domContainer.trigger(fc.jsEvents.onPrevPage);
          window.history.back();

          return false;
        };

        /**
         * Register event listeners specific for one page
         */
        registerOnePageListeners = function () {
          // When the user scrolls up/down, change the active page state depending on the offset
          $(document).on('scroll', function () {
            var iterator, offset, page, el;

            for (iterator = 0; iterator < fc.pageOrders.length; iterator += 1) {
              // Determine the offset of the page
              el = $('[data-page-id="' + fc.pageOrders[iterator] + '"]');
              if (el.length > 0) {
                offset = parseInt($('[data-page-id="' + fc.pageOrders[iterator] + '"]').offset().top, 10);
                offset += parseInt(fc.config.scrollOffset, 10) - fc.config.activePageOffset;

                if ($(document).scrollTop() > offset) {
                  if (fc.activePage === undefined) {
                    fc.activePage = fc.pageOrders[iterator];
                  }

                  page = fc.pageOrders[iterator];
                }
              }
            }

            // If a page was found and its different to the current page, fire off the change in state
            if (page !== undefined && fc.activePage !== page) {
              fc.domContainer.trigger(fc.jsEvents.onPageChange, [fc.activePage, page]);
              fc.activePage = page;
            }
          });
        };

        /**
         * Register event listeners.
         */
        registerEventListeners = function () {
          // Submit a form page
          fc.domContainer.on('click', 'div.fc-submit input[type=submit]', function () {
            // When true, loadNextPage() knows the page was submitted from clicking the button, and not automatically
            fc.nextPageButtonClicked = true;

            fc.functions.loadNextPage();
            return false;
          });

          // When the form is complete, delete the session
          if (fc.config.deleteSessionOnComplete) {
            fc.domContainer.on(fc.jsEvents.onFormComplete, function () {
              deleteSession(false);
            });
          }

          // Previous page click
          fc.domContainer.on('click', '.fc-prev-page', function () {
            return fc.functions.loadPrevPage();
          });

          // Description link clicks
          fc.domContainer.on('click', '.fc-desc a', function () {
            var href = $(this).attr('href');
            window.open(href);

            return false;
          });

          registerValueChangedListeners();

          // When the hash changes - navigate forward/backwards
          $(window).on('hashchange', function () {
            var pageId = getHashVar(fc.config.hashPrefix),
              page = fc.domContainer.find('.fc-page[data-page-id="' + pageId + '"]');

            if (page.length === 0 && fc.ignoreHashChangeEvent === false && fc.oldHash !== pageId && typeof fc.pages[pageId] === 'object') {
              render(pageId);
            }

            // Smooth scroll
            if (fc.config.smoothScroll && fc.oldHash) {
              setTimeout(function (pageId) {
                smoothScrollToPage(pageId);
              }.bind(this, pageId), fc.config.scrollWait);
            }

            fc.oldHash = pageId;
            fc.ignoreHashChangeEvent = false;
          });

          // Add value for a repeatable group
          fc.domContainer.on('click', '.fc-repeatable a.fc-click.fc-add', function () {
            var dataId = $(this).attr('data-id'),
              html = '',
              schema = fc.fieldSchema[dataId],
              repeatableStyle,
              sectionId,
              fieldContainer,
              rowContainer,
              currentRows;

            // If the schema is set and is repeatable, determine what to do
            if (schema !== undefined && getConfig(schema, 'repeatable', false)) {
              repeatableStyle = parseInt(getConfig(schema, 'repeatableStyle', 0));

              // Different repeatable objects have different styles.
              // Style '0': show the form fields in a modal dialog.
              // Style '1': drop the form fields undearnath.
              if (repeatableStyle === 0) {
                // Style '0': show the form fields in a modal dialog.
                fc.activeModalField = dataId;
                fc.modalState = fc.states.ADD_REPEATABLE;

                html = $("<div />").append($('[fc-data-group="' + dataId + '"] > .fc-fieldcontainer').clone()).html();
                $('.fc-modal .modal-body').html(html);
                $('.fc-modal').addClass('fc-show');
              } else if (repeatableStyle === 1) {
                // If already at the limit, do nothing

                // Style '1': drop form field underneath
                fieldContainer = fc.domContainer.find('.fc-field[fc-data-group="' + dataId + '"]');
                sectionId = fieldContainer.attr('fc-belongs-to');

                //  Append a row on to the end
                rowContainer = fc.domContainer.find('.fc-field[fc-data-group="' + dataId + '"] .fc-repeatable-rows');
                if (rowContainer.length > 0) {
                  currentRows = rowContainer.find('.fc-repeatable-row').length;

                  // Only perform the operation when under the maximum row threshold
                  if (currentRows < getConfig(schema, 'maxRows', 100000)) {
                    html = outputRepeatablePreDetermined(dataId, currentRows + 1, fc.sections[sectionId]);
                    rowContainer.html(html);

                    // Re-set the fields on the element (whenever the DOM is updated, the field values need to be re-applied)
                    setFieldValues(rowContainer);
                    flushFieldVisibility();
                    flushActivePageForField(dataId, true);
                  }

                  if (currentRows + 1 >= getConfig(schema, 'maxRows', 100000)) {
                    // Hide the add button if hit the maximum threshold
                    fieldContainer.find('.fc-add').addClass('fc-hide');
                  } else if (fieldContainer.find('.fc-remove.fc-hide')) {
                    // Show the remove button if its hidden
                    fieldContainer.find('.fc-remove.fc-hide').removeClass('fc-hide');
                  }
                }
              }
            }

            fc.domContainer.trigger(fc.jsEvents.onDynamicRowAdded);

            return false;
          });

          // Remove value for a repeatable group
          fc.domContainer.on('click', '.fc-repeatable a.fc-click.fc-remove', function () {
            var dataId = $(this).attr('data-id'),
              html = '',
              schema = fc.fieldSchema[dataId],
              repeatableStyle,
              sectionId,
              rowContainer,
              fieldContainer,
              currentRows,
              key,
              fieldPrefix;

            // If the schema is set and is repeatable, determine what to do
            if (schema !== undefined && getConfig(schema, 'repeatable', false)) {
              repeatableStyle = parseInt(getConfig(schema, 'repeatableStyle', 0));

              if (repeatableStyle === 1) {
                // Style '1': drop form field underneath
                fieldContainer = fc.domContainer.find('.fc-field[fc-data-group="' + dataId + '"]');
                sectionId = fieldContainer.attr('fc-belongs-to');

                //  Delete the last row
                rowContainer = fc.domContainer.find('.fc-field[fc-data-group="' + dataId + '"] .fc-repeatable-rows');
                if (rowContainer.length > 0) {
                  currentRows = rowContainer.find('.fc-repeatable-row').length;

                  // Only output and make a change if one or more rows presently exist
                  if (currentRows > getNumericTagValue(getConfig(schema, 'repeatableLinkedTo'))) {
                    if (confirm(getConfig(schema, 'removeAlertText'))) {
                      // Confirm the user wants to remove the selected row
                      html = outputRepeatablePreDetermined(dataId, currentRows - 1, fc.sections[sectionId]);
                      rowContainer.html(html);

                      // Re-set the fields on the element (whenever the DOM is updated, the field values need to be re-applied)
                      setFieldValues(rowContainer);
                      flushFieldVisibility();
                      flushActivePageForField(dataId, true);

                      // Need to update the values and save
                      if (fc.fields[dataId] !== undefined && $.isArray(fc.fields[dataId])) {
                        if (typeof dataId === 'string' && dataId.length > 0 && !$.isNumeric(dataId)) {
                          if (currentRows - 1 <= 0) {
                            // If no rows, reset the array
                            setVirtualValue(dataId, []);
                          } else {
                            // Otherwise splice it, pop the final value off the end
                            fc.fields[dataId].splice(currentRows - 1);
                            fc.saveQueue[dataId] = fc.fields[dataId];
                          }
                        }
                      }

                      // Need to delete all of the flat values (prefix_id_fieldid)
                      fieldPrefix = [dataId, currentRows - 1].join(fc.constants.prefixSeparator);
                      for (key in fc.fields) {
                        if (fc.fields.hasOwnProperty(key) && key.indexOf(fieldPrefix) === 0) {
                          delete fc.fields[key];
                          fc.saveQueue[key] = '';
                        }
                      }

                      if (currentRows - 1 <= getNumericTagValue(getConfig(schema, 'repeatableLinkedTo'))) {
                        // Hide the remove button if zero rows
                        fieldContainer.find('.fc-remove').addClass('fc-hide');
                      } else if (fieldContainer.find('.fc-add.fc-hide')) {
                        // Show the add button if its hidden
                        fieldContainer.find('.fc-add.fc-hide').removeClass('fc-hide');
                      }
                    }
                  }
                }
              }
            }

            fc.domContainer.trigger(fc.jsEvents.onDynamicRowRemoved);

            return false;
          });

          // Help modal links
          fc.domContainer.on('click', '.fc-help-link', function () {
            var dataIndex = $(this).attr('data-for');
            if (fc.helpData && fc.helpData[dataIndex]) {
              // Set modal information
              fc.modalState = fc.states.MODAL_TEXT;
              fc.modalMeta = {
                body: fc.helpData[dataIndex]
              };

              // Show the modal
              showModal({
                addButton: false,
                body: fc.helpData[dataIndex],
                title: fc.helpTitle[dataIndex]
              });
            }

            return false;
          });

          // Hide fc model
          fc.domContainer.on('click', '.fc-modal .fc-btn-close', function () {
            $('.fc-modal.fc-show').removeClass('fc-show');
            return false;
          });

          // Add the value for the fc modal
          fc.domContainer.on('click', '.fc-modal .fc-btn-add', function () {
            if (fc.modalState !== undefined && typeof fc.modalState === "string") {
              switch (fc.modalState) {
                case fc.states.DELETE_REPEATABLE:
                  deleteRepeatableRow();
                  break;
                case fc.states.ADD_REPEATABLE:
                  addRepeatableRow();
                  break;
                case fc.states.EMAIL_VERIFICATION_CODE:
                  verifyEmailAddress();
                  break;
                case fc.states.SMS_VERIFICATION_CODE:
                  verifyMobileNumber();
                  break;
                case fc.states.EDIT_REPEATABLE:
                  editRepeatableRow();
                  break;
                case fc.states.SUBMIT_DEVELOPMENT_BRANCH:
                  hideModal();
                  fc.functions.loadNextPage(true, true);
                  break;
              }
            }

            return false;
          });

          registerRepeatableGroupletListeners();
          registerApiLookupListener();

          if (fc.config.onePage) {
            registerOnePageListeners();
          }

          // Register mobile browser detection based on screen size
          $(window).resize(function () {
            fc.mobileView = isMobile();
            if (fc.mobileView !== fc.inMobileView) {
              updateMobileFieldsVisibility();
            }
          });
        };

        /**
         * Calculates the HTML for the auto suggest functionality.
         * @param dataId
         * @param values
         * @param summaryTemplate
         * @returns {string}
         */
        renderAutoCompleteWidget = function (dataId, values, summaryTemplate) {
          if (!$.isArray(values)) {
            return '';
          }

          // Initialise variables
          var fieldContainer = $('.fc-field[fc-data-group="' + dataId + '"]'),
            html,
            iterator,
            counter,
            summary,
            tokens,
            re,
            templateTokens = summaryTemplate.match(/\{([a-zA-Z0-9\-\_]+)\}/g);

          // Replace the curly braces in the template tokens
          if (templateTokens.length === 0) {
            return '';
          }

          for (iterator = 0; iterator < templateTokens.length; iterator += 1) {
            templateTokens[iterator] = templateTokens[iterator].replace(/[\{\}]/g, '');
          }

          if (fieldContainer.length === 0) {
            return '';
          }

          // Format the html
          html = '<div class="fc-auto-suggest" data-id="' + dataId + '">';
          html += '<div class="fc-suggest-close"><a href="#">x</a></div>';
          for (iterator = 0; iterator < values.length; iterator += 1) {
            tokens = values[iterator];

            // Replace the tokens in the summary template
            summary = summaryTemplate.slice(0);
            for (counter = 0; counter < templateTokens.length; counter += 1) {
              re = new RegExp('\{' + templateTokens[counter] + '\}', 'g');
              summary = summary.replace(re, tokens[templateTokens[counter]] !== undefined ? tokens[templateTokens[counter]] : '');
            }

            // Add to html
            html += '<div class="fc-suggest-row" data-suggest="' + encodeURI(JSON.stringify(tokens)) + '" data-id="' + dataId + '"><a href="#">' + summary + '</a></div>';
          }
          html += '</div>';

          return html;
        };

        /**
         * Removes an auto complete widget
         * @param dataId
         * @returns {boolean}
         */
        removeAutoCompleteWidget = function (dataId) {
          var fieldContainer = $('.fc-field[fc-data-group="' + dataId + '"]');

          if (fieldContainer.length === 0) {
            return false
          }

          // Un-register the click listener/handler
          fc.domContainer.off('click.' + dataId);
          // Un-register the keydown listener/handler
          fc.domContainer.off('keydown.' + dataId);

          // Remove the auto suggest box
          fieldContainer.find('.fc-auto-suggest').remove();
        };

        /**
         * Handles the up/down keyboard events when the auto suggest is open
         *
         * @param dataId
         * @param keyCode
         */
        moveSelectionAutoCompleteWidget = function (dataId, keyCode) {
          var autoCompleteWidget = $('.fc-auto-suggest[data-id="' + dataId + '"]'),
              direction = (keyCode == 38) ? 'up' : 'down',
              autoCompleteRows = autoCompleteWidget.find('.fc-suggest-row'),
              currentlySelected = autoCompleteRows.filter('.selected');

          // If there is none currently selected
          if (currentlySelected.length == 0) {
            autoCompleteRows.first().addClass('selected');
          } else {
            currentlySelected.removeClass('selected');
            var next;
            if (direction == 'down') {
              next = currentlySelected.next('.fc-suggest-row');
              if (!next.length) next = autoCompleteRows.first();
            } else {
              next = currentlySelected.prev('.fc-suggest-row');
              if (!next.length) next = autoCompleteRows.last();
            }
            next.addClass('selected');
          }
        };

        /**
         * Handles the enter keyboard event when the auto suggest is open
         *
         * @param dataId
         * @param keyCode
         */
        enterSelectionAutoCompleteWidget = function (dataId, keyCode) {
          var autoCompleteWidget = $('.fc-auto-suggest[data-id="' + dataId + '"]'),
              autoCompleteRows = autoCompleteWidget.find('.fc-suggest-row'),
              currentlySelected = autoCompleteRows.filter('.selected');
          selectRowAutoCompleteWidget(currentlySelected);
        };

        /**
         * Handles the selection of a row in the auto complete widget
         *
         * @param object
         * @returns {boolean}
         */
        selectRowAutoCompleteWidget = function (object) {
          var json = JSON.parse(decodeURI(object.attr('data-suggest'))),
              dataId = getDataId(object.attr('data-id')),
              schema = fc.fieldSchema[dataId],
              map = getConfig(schema, 'mapResponse', '{}'),
              mapObj,
              tags,
              tag,
              tagId,
              val,
              tokens,
              iterator,
              token,
              replacement,
              re,
              domObj,
              parts,
              groupletTags,
              groupletSchema,
              key,
              isRepeatable = false,
              groupletFieldId,
              tagName,
              successfulTransaction;

          if (typeof json !== 'object') {
            return false;
          }

          // Attempt to decode to JSON object
          try {
            mapObj = JSON.parse(map);
          } catch (ignore) {
            return false;
          }

          // Retrieve field tags and perform replacement
          tags = getAllFieldTags(true);

          // If the field belongs to a grouplet, need to also match simple grouplet tags to the complex ids
          if (dataId.indexOf(fc.constants.prefixSeparator) >= 0) {

            parts = dataId.split(fc.constants.prefixSeparator);
            if (fc.fieldSchema[parts[0]] !== undefined && fc.fieldSchema[parts[0]].type !== undefined && fc.fieldSchema[parts[0]].type === 'grouplet') {
              // Fetch the grouplet schema
              groupletSchema = getFieldsSchema(getConfig(fc.fieldSchema[parts[0]], 'grouplet', {'field': []}).field);

              // For non-repeatable grouplets, only want to use the root ID (non-repeatable grouplets of the form ROOTID_GROUPLETFIELDID)
              // Repeatable grouplets are of the format ROOTID_INDEX_GROUPLETFIELDID, you therefore need to track the first two
              isRepeatable = getConfig(fc.fieldSchema[parts[0]], 'repeatable', false);
              parts.splice(isRepeatable ? 2 : 1);

              for (key in groupletSchema) {
                if (groupletSchema.hasOwnProperty(key)) {
                  tagName = getConfig(groupletSchema[key], 'tag', '');
                  if (tagName.length > 0) {
                    // Create an array for the groupletfield id
                    groupletFieldId = parts.slice();
                    groupletFieldId.push(key);

                    tags[tagName] = getDataId(groupletFieldId.join(fc.constants.prefixSeparator));
                  }
                }
              }
            }
          }

          // Iterate through each mapped tag and attempt to update values within the DOM
          for (tag in mapObj) {
            if (mapObj.hasOwnProperty(tag)) {
              if (tags[tag] !== undefined) {
                tagId = tags[tag];
                domObj = $('.fc-field[fc-data-group="' + tagId + '"]');

                if (domObj.length > 0) {
                  // Perform the token replacement on the mapped value
                  val = mapObj[tag];
                  tokens = val.match(/\{([a-zA-Z0-9\-\_]+)\}/g);

                  // Replace each token
                  if (tokens.length > 0) {
                    for (iterator = 0; iterator < tokens.length; iterator += 1) {
                      token = tokens[iterator].replace(/[\{\}]/g, '');
                      re = new RegExp('\{' + token + '\}', 'g');
                      replacement = json[token] !== undefined ? json[token] : '';
                      val = val.replace(re, replacement);
                    }
                  }

                  // Set the field value in the DOM
                  setValue(tagId, val);
                }
              }
            }
          }

          // In some instances, when a value is clicked a request needs to be sent off to a 3rd party URL
          // to indicate a successful transaction. This is for instance, a case with an address lookup, where
          // the merchant needs to be instructed of a successful transaction for billing purposes.
          successfulTransaction = getConfig(schema, 'successfulTransaction', '');
          if (successfulTransaction.length > 0) {
            // Send the request off @todo: more than just GET
            $.ajax({
              'type': 'GET',
              'url': successfulTransaction
            });
          }

          removeAutoCompleteWidget(dataId);

          return false;
        };

        /**
         * Register the API look up
         */
        registerApiLookupListener = function () {
          if (fc.registeredApiLookup === true) {
            return;
          }

          // Trigger an API look up
          fc.domContainer.on('input paste', '.fc-field-apiLookup input[type=text].fc-fieldinput, .fc-field-apiLookup input[type=tel].fc-fieldinput, .fc-field-apiLookup input[type=number].fc-fieldinput', function (event) {
            var fieldId = $(this).attr('formcorp-data-id'),
              fieldContainer = $('.fc-field[fc-data-group="' + fieldId + '"]'),
              schema = fc.fieldSchema[fieldId],
              value = $(this).val(),
              apiUrl,
              requestType,
              summary = getConfig(schema, 'responseSummary', ''),
              postData,
              request = {},
              gracePeriod,
              minCharsStripRegex,
              minCharValue,
              minCharRegex,
              minCharAmount,
              obj = this;

            // Fetch the grace period
            gracePeriod = parseInt(getConfig(schema, 'gracePeriod', -1));
            if (gracePeriod < 0) {
              removeAutoCompleteWidget(fieldId);
              return;
            }

            if (summary.length === 0) {
              removeAutoCompleteWidget(fieldId);
              return;
            }

            // Not enough characters to trigger an API lookup
            minCharAmount = parseInt(getConfig(schema, 'minCharsBeforeTrigger', 0));
            if (minCharAmount > 0) {
              // Often various characters will want to be removed from the minimum character calclations.
              // An example is a street address. You may want to ignore the house number and space (i.e. '12345 ')
              // and only start triggering on the street name (in this case sample regex could be [\d\s]
              minCharValue = value;
              minCharsStripRegex = getConfig(schema, 'stripCharRegex', '');
              if (minCharsStripRegex.length > 0) {
                minCharRegex = new RegExp(minCharsStripRegex, 'g');
                minCharValue = minCharValue.replace(minCharRegex, '');
              }

              if (minCharValue.length < minCharAmount) {
                removeAutoCompleteWidget(fieldId);
                return;
              }
            }

            // Fetch the URL to send the request to
            apiUrl = getConfig(schema, 'apiUrl', '');
            if (apiUrl.length <= 0) {
              removeAutoCompleteWidget(fieldId);
              return;
            }

            // Fetch the request type
            requestType = getConfig(schema, 'requestType', 'GET');
            if (['GET', 'POST', 'PUT'].indexOf(requestType) < 0) {
              removeAutoCompleteWidget(fieldId);
              return;
            }
            request.type = requestType;

            // Attach post data
            if (['POST', 'PUT'].indexOf(requestType) >= 0) {
              postData = getConfig(schema, 'postData', '');
              if (postData.length > 0) {
                postData = postData.replace(/<value>/g, encodeURIComponent(value));
                request.data = postData;
              }
            }

            // Send off the request
            if (apiUrl.indexOf('<value>') >= 0) {
              apiUrl = apiUrl.replace(/<value>/g, encodeURIComponent(value));
            }

            // Format the request
            request.url = apiUrl;

            // Success function
            request.success = function (data) {
              if (data.length === 0) {
                removeAutoCompleteWidget(fieldId);
              } else {
                var html = renderAutoCompleteWidget(fieldId, data, summary),
                  existingAutoSuggest = fieldContainer.find('.fc-auto-suggest');

                // Delete the existing auto suggest if it exists
                if (existingAutoSuggest.length > 0) {
                  existingAutoSuggest.remove();
                }

                // Register a click listener/handler
                fc.domContainer.off('click.' + fieldId);
                fc.domContainer.on('click.' + fieldId, function(event) {
                  if ($(event.target).is('.fc-auto-suggest[data-id="' + fieldId + '"]')) {
                    return false;
                  }
                  removeAutoCompleteWidget(fieldId);
                });

                // Register an keydown listener/handler
                fc.domContainer.off('keydown.' + fieldId);
                fc.domContainer.on('keydown.' + fieldId, function(event) {
                  if (event.keyCode == 38 || event.keyCode == 40) {
                    moveSelectionAutoCompleteWidget(fieldId, event.keyCode);
                  } else if (event.keyCode == 13) {
                    event.preventDefault();
                    enterSelectionAutoCompleteWidget(fieldId, event.keyCode);
                  } else if(event.keyCode == 9) {
                    enterSelectionAutoCompleteWidget(fieldId, event.keyCode);
                  } else if(event.keyCode == 27) {
                    removeAutoCompleteWidget(fieldId);
                  }
                });

                fieldContainer.find('.fc-fieldgroup').append(html);
              }
            };

            setTimeout(function () {
              // If the value has changed inside of the grace period, return
              var newValue = getFieldValue($(obj));
              if (newValue !== value) {
                return;
              }

              $.ajax(request);
            }, gracePeriod);
          });

          // Close the suggest box
          fc.domContainer.on('click', '.fc-suggest-close a', function () {
            var dataId = $(this).parent().parent().attr('data-id');
            removeAutoCompleteWidget(dataId);
            return false;
          });

          // Map the fields on click
          fc.domContainer.on('click', '.fc-suggest-row', function (e) {
            e.preventDefault();
            selectRowAutoCompleteWidget($(this));
          });

          fc.registeredApiLookup = true;
        };

        /**
         * Generates a random string of length $length
         *
         * @param length
         * @returns {string}
         */
        generateRandomString = function (length) {
          var str = '',
            chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            x;

          for (x = 0; x < length; x += 1) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          return str;
        };

        /**
         * Register the formcorp css files
         */
        loadCssFiles = function () {
          var cssId = 'formcorp-css',
            cssUri = 'formcorp.css',
            iterator;

          if ($('#' + cssId).length === 0) {
            loadCssFile(cdnUrl() + cssUri);
          }

          fc.domContainer.addClass('fc-container');

          // Show the modal when required
          if (!fc.config.hideModal) {
            addModalWindow();
          }

          fc.domContainer.prepend('<div class="fc-loading-screen"><div class="fc-loading-halo"></div></div>');

          // Load the required css files
          for (iterator = 0; iterator < fc.config.signatureLibCss.length; iterator += 1) {
            loadCssFile(fc.config.signatureLibCss[iterator]);
          }

          // Load the required js files
          for (iterator = 0; iterator < fc.config.signatureLibJs.length; iterator += 1) {
            loadJsFile(fc.config.signatureLibJs[iterator]);
          }

          fc.renderedSignatures = {};
        };

        /**
         * Add a modal window to the page
         */
        addModalWindow = function () {

          if ($('#fc-modal').length > 0) {
            return;
          }

          var modal = '<div class="fc-modal" id="fc-modal" aria-hidden="true">' +
            '<div class="modal-dialog">' +
            '<div class="modal-header">' +
            '<h2>' + fc.lang.addModalHeader + '</h2>' +
            (fc.config.showModalCloseInHeader ? '<a href="#" class="btn btn-danger fc-btn-close">x</a> ' : '' ) +
            '</div>' +
            '<div class="modal-body">' +
            '</div>' +
            '<div class="modal-footer">' +
            '<div class="fc-loading fc-hide"></div>' +
            '<div class="fc-error fc-hide"></div>' +
            (fc.config.showModalCloseInFooter ? '<a href="#" class="btn btn-danger fc-btn-close">' + fc.lang.closeModalText + '</a> ' : '') +
            '<a href="#" class="btn btn-success fc-btn-add">' + fc.lang.addModalText + '</a> ' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';


          fc.domContainer.prepend($(modal));
        };

        /**
         * Order schema numerically by data columns.
         * @param schema
         * @param orderColumn
         * @returns {*}
         */
        orderSchema = function (schema, orderColumn) {
          if (orderColumn === undefined) {
            orderColumn = 'order';
          }

          if (typeof schema === 'object') {
            var key;
            // Recursively order children
            for (key in schema) {
              if (schema.hasOwnProperty(key)) {
                // Chilcren have order, try to order the object
                if (!!schema[key] && typeof schema[key] === 'object' && schema[key][0] !== undefined && !!schema[key][0] && schema[key][0].order !== undefined) {
                  schema[key] = orderObject(schema[key]);
                } else {
                  schema[key] = orderSchema(schema[key], orderColumn);
                }
              }
            }
          }

          return schema;
        };

        /**
         * Orders an object numerically in ascending order by a given data column.
         * @param object
         * @returns {Array}
         */
        orderObject = function (object) {
          // Construct a 2-dimensional array (so pages with same order don't override each other)
          var orderedObject = [],
            key,
            order,
            objects = [],
            x;

          for (key in object) {
            if (object.hasOwnProperty(key)) {
              order = object[key].order !== undefined ? object[key].order : 0;
              if (orderedObject[order] === undefined) {
                orderedObject[order] = [];
              }
              orderedObject[order].push(object[key]);
            }
          }

          // Flatten the two-dimensional array in to a single array
          for (key in orderedObject) {
            if (orderedObject.hasOwnProperty(key)) {
              for (x = 0; x < orderedObject[key].length; x += 1) {
                objects.push(orderedObject[key][x]);
              }
            }
          }

          return objects;
        };

        /**
         * Prune fields not on a current page
         * @param page
         * @param fields
         * @returns {{}}
         */
        pruneNonPageFields = function (page, fields) {
          var pageFields = [], section, x, y, field, obj = {};

          if (typeof page.page === "object" && typeof page.page.section === "object") {
            for (x = 0; x < page.page.section.length; x += 1) {
              section = page.page.section[x];
              if (typeof section.field === "object" && section.field.length > 0) {
                for (y = 0; y < section.field.length; y += 1) {
                  field = section.field[y];
                  /*jslint nomen: true*/
                  pageFields.push(field._id.$id);
                  if (fields[field._id.$id] !== undefined) {
                    obj[field._id.$id] = fields[field._id.$id];
                  } else {
                    obj[field._id.$id] = "";
                  }
                  /*jslint nomen: false*/
                }
              }
            }
          }

          return obj;
        };

        /**
         * Remove the fields from invisible sections from a data object (not DOM)
         * @param page
         * @param fields
         * @returns {*}
         */
        removeInvisibleSectionFields = function (page, fields) {
          var section, x, y, visible, field;

          if (typeof page.page === "object" && typeof page.page.section === "object") {
            for (x = 0; x < page.page.section.length; x += 1) {
              section = page.page.section[x];

              if (typeof section.visibility === 'string' && section.visibility.length > 0) {
                visible = eval(getBooleanLogic(section.visibility));
                if (!visible) {
                  if (typeof section.field === "object" && section.field.length > 0) {
                    for (y = 0; y < section.field.length; y += 1) {
                      field = section.field[y];
                      /*jslint nomen: true*/
                      delete fields[field._id.$id];
                      /*jslint nomen: false*/
                    }
                  }
                }
              }
            }
          }

          return fields;
        };

        /**
         * Remove invisible fields from an object
         * @param fields
         * @returns {*}
         */
        pruneInvisibleFields = function (fields) {
          if (typeof fields === "object") {
            var dataId, field, visible, json;

            for (dataId in fields) {
              if (fields.hasOwnProperty(dataId)) {
                field = fc.fieldSchema[dataId];
                if (field === undefined) {
                  continue;
                }

                // If mobile only field and not mobile
                if (getConfig(field, 'mobileOnly', false) && !fc.mobileView) {
                  delete fields[dataId];
                  continue;
                }

                // If desktop only field and not desktop
                if (getConfig(field, 'desktopOnly', false) && fc.mobileView) {
                  delete fields[dataId];
                  continue;
                }

                // If custom visibility rules
                if (typeof field.config.visibility === 'string' && field.config.visibility.length > 0) {
                  // Attempt to convert to json string
                  if (['[', '{'].indexOf(field.config.visibility.substring(0, 1)) > -1) {
                    try {
                      json = $.parseJSON(field.config.visibility);
                      field.config.visibility = toBooleanLogic(json);
                    } catch (ignore) {
                    }
                  }

                  // Try to evaluate the boolean condition
                  try {
                    visible = eval(field.config.visibility);
                    if (typeof visible === 'boolean') {
                      if (!visible) {
                        delete fields[dataId];
                      }
                    }
                  } catch (ignore) {
                  }
                }
              }
            }
          }

          return fields;
        };

        /**
         * Returns true if a field is valid.
         * Fields that are hidden are always deemed valid (i.e. through visibility
         * and field tags.)
         *
         * @param dataId
         * @param value
         * @returns {boolean}
         */
        fieldIsValid = function (dataId, value) {
          var schema,
            customErrors,
            id,
            iterator,
            grouplet,
            val,
            visible,
            defaultValue,
            errors;

          // Can pass through either an id to retrieve the schema, or the schema itself
          try {
            if (typeof dataId === "string") {
              schema = fc.fieldSchema[dataId];
            } else if (typeof dataId === "object") {
              schema = dataId;
              dataId = getId(schema);
            }

            if (typeof schema !== "object") {
              return true;
            }
          } catch (ignore) {
          }

          if (objectHasTag(schema.config) && !hasTags(schema.config.tags)) {
            // If the object has tags, check to see if it should be visible
            return true;
          }

          // If the field isn't visible, return true - it doesn't matter what the value is
          if (getConfig(schema, 'visibility', false) !== false) {
            // Try to evaluate the boolean condition
            try {
              visible = eval(schema.config.visibility);
              if (typeof visible === 'boolean') {
                if (!visible) {
                  return true;
                }
              }
            } catch (ignore) {
            }
          }

          // Return false if required and empty
          if (schema.config !== undefined && schema.config.required !== undefined) {
            if (schema.config.required && value === "") {
              // Check for a default value - if set, mark as true, since a default indicates true regardless
              defaultValue = getConfig(schema, 'defaultValue', '');
              if (typeof defaultValue === 'string' && defaultValue.length > 0) {
                return true;
              }

              return false;
            }
          }

          // If a grouplet, need to check each field within
          if (schema.type === "grouplet" && !getConfig(schema, "repeatable", false)) {
            grouplet = getConfig(schema, 'grouplet', {});
            if (grouplet.field !== undefined && typeof grouplet.field === "object" && grouplet.field.length > 0) {
              for (iterator = 0; iterator < grouplet.field.length; iterator += 1) {
                /*jslint nomen:true*/
                id = dataId + fc.constants.prefixSeparator + grouplet.field[iterator]._id.$id;
                /*jslint nomen:false*/
                val = (fc.fields[id] !== undefined) ? fc.fields[id] : "";
                if (!fieldIsValid(grouplet.field[iterator], val)) {
                  return false;
                }
              }
            }

            return true;
          }

          // Check for basic errors
          errors = getFieldErrors(dataId);
          if ($.isArray(errors) && errors.length > 0) {
            return false;
          }

          // Check custom validators
          customErrors = getCustomErrors(schema, value);
          return customErrors.length === 0;
        };

        /**
         * Iterates through an object of dataId=>value pairs to determine if fields are valid.
         * @param fields
         * @returns {boolean}
         */
        formFieldsValid = function (fields) {
          if (typeof fields !== "object") {
            return true;
          }

          var dataId;

          for (dataId in fields) {
            if (fields.hasOwnProperty(dataId)) {
              if (!fieldIsValid(dataId, fields[dataId])) {
                return false;
              }
            }
          }

          return true;
        };

        /**
         * Get the id of the first page on the form
         * @returns {*}
         */
        getFirstPageId = function () {
          var iterator;

          // If a channel is supplied, try to load the channel page first
          if (fc.channel && typeof fc.channel === 'string' && fc.channel.length > 0 && fc.schema.channel && $.isArray(fc.schema.channel) && fc.schema.channel.length > 0) {
            for (iterator = 0; iterator < fc.schema.channel.length; iterator += 1) {
              if (fc.schema.channel[iterator].name && fc.schema.channel[iterator].name === fc.channel) {
                /*jslint nomen: true*/
                return fc.schema.channel[iterator].default;
                /*jslint nomen: false*/
              }
            }
          }

          // Default to first page on form
          /*jslint nomen: true*/
          return fc.schema.stage[0].page[0]._id.$id;
          /*jslint nomen: false*/
        };

        /**
         * Retrieve the first page (if the user has an active session, the opening page might be later on in the process)
         * @returns {*}
         */
        getFirstPage = function () {
          var id = getFirstPageId(),
            page,
            nextPageObj,
            fields,
            valid,
            allowAutoLoad,
            continueLoading = false,
            checkedFields = [];

          // Iterate through the pages until we come to one that isn't valid (meaning this is where our progress was)
          do {
            page = getPageById(id);
            if (page === undefined) {
              break;
            }

            // If no stage exists, consider an erroneous page and break out
            if (typeof page.stage !== 'object') {
              break;
            }
            fc.currentPage = id;

            // Update the browser hash when required
            if (fc.config.updateHash) {
              setHashVar(fc.config.hashPrefix, id);
            }

            // Store field schema locally
            updateFieldSchema(page.stage);
            fields = pruneNonPageFields(page, fc.fields);
            fields = removeInvisibleSectionFields(page, fields);
            fields = pruneInvisibleFields(fields);

            // If using a one page form structure, output
            if (fc.config.onePage) {
              render(id);

              // Flush visibility when mode isn't set to prepopulate
              if (fc.mode !== fc.modes.PREPOPULATE) {
                flushVisibility();
              }

              if (fc.mode === fc.modes.PREPOPULATE) {
                // If in pre-population mode, continue loading regardless
                continueLoading = true;
              } else {
                // If one page, can use the DOM to determine whether or not to continue loading (a safer indicator)
                continueLoading = validForm(fc.jQueryContainer, false) && !isSubmitPage(page.page);
              }
            } else {
              if (fc.mode === fc.modes.PREPOPULATE) {
                // If in pre-population mode, continue loading regardless
                continueLoading = true;
              } else {
                // Continue loading regardless (as in primary data population mode)
                valid = formFieldsValid(fields);
                continueLoading = valid && !isSubmitPage(page.page);
              }
            }

            // On page load, ignore the autoLoad flag (if user is directed back to this form, need to continue loading until pretty late)
            if (continueLoading) {
              nextPageObj = nextPage(false, true);
              // @todo problem here - why we cant go back
              if (nextPageObj !== undefined && typeof nextPageObj === "object") {
                /*jslint nomen: true*/
                id = nextPageObj.page._id.$id;
                /*jslint nomen: false*/
                fc.prevPages[id] = page;

                // If next page is a submit page, do not render it
                if (isSubmitPage(nextPageObj.page) === true) {
                  valid = false;
                  break;
                }
              } else {
                valid = false;
                break;
              }
            }
          } while (continueLoading);

          return id;
        };

        /**
         * Load form settings from the server
         * @param callback
         */
        loadSettings = function (callback) {
          api('form/settings', {}, 'post', function (data) {
            if (typeof data === 'object') {
              fc.settings = data;
            }

            callback();
          });
        };

        /**
         * Initialise the render
         * @param data object
         */
        initRender = function (data) {
          var firstPageId;

          // Render the opening page for the form
          if (data.stage !== undefined) {
            fc.schema = orderSchema(data);
            if (typeof fc.schema.stage === 'object' && fc.schema.stage.length > 0 && typeof fc.schema.stage[0].page === 'object' && fc.schema.stage[0].page.length > 0) {
              firstPageId = getFirstPage();

              // If one page layout, getFirstPage() already rendered
              if (!fc.config.onePage) {
                render(firstPageId);
              }
            }
          }

          if (fc.mode === formcorp.MODE_REVIEW) {
            readOnly();
          }

          fc.domContainer.trigger(fc.jsEvents.onConnectionMade);

          // Initialise the on schema loaded event
          onSchemaLoaded();
        };

        /**
         * Auto load the form's required library files
         * @param data object
         */
        autoLoadLibs = function (data) {
          var fields = [], type, field, libsLoaded = 0;

          // Store for future reference
          fc.schemaData = data;

          // Get the field types that are referenced in the form
          if (typeof fc.fieldSchema === 'object' && Object.keys(fc.fieldSchema).length > 0) {
            for (var key in fc.fieldSchema) {
              if (fc.fieldSchema.hasOwnProperty(key)) {
                if (typeof fc.fieldSchema[key] === 'object' && typeof fc.fieldSchema[key].type === 'string' && fields.indexOf(fc.fieldSchema[key].type) == -1) {
                  fields.push(fc.fieldSchema[key].type);
                }
              }
            }
          }

          var fieldsIterator, libIterator, lib;

          // Iterate through each field and load required libraries
          for (fieldsIterator = 0; fieldsIterator < fields.length; fieldsIterator += 1) {
            field = fields[fieldsIterator];
            if (typeof fc.requiredFieldLibraries[field] === 'object' && $.isArray(fc.requiredFieldLibraries[field]) && fc.requiredFieldLibraries[field].length > 0) {
              for (libIterator = 0; libIterator < fc.requiredFieldLibraries[field].length; libIterator += 1) {
                lib = fc.requiredFieldLibraries[field][libIterator];
                loadLib(lib);
                ++libsLoaded;
              }
            }
          }

          // If no libs need to be loaded, render the form
          if (!libsLoaded) {
            checkAllLibsLoaded(data);
          }
        };

        /**
         * Set data returned by the server through the form/schema call
         * @param {object} data
         */
        setSchemaData = function (data) {
          // If data returned by the API server, set locally
          if (typeof data.data === 'object' && Object.keys(data.data).length > 0) {
            for (var key in data.data) {
              if (data.data.hasOwnProperty(key)) {
                if (typeof key === 'string' && key.length > 0 && !$.isNumeric(key)) {
                  setVirtualValue(key, data.data[key]);
                }
                // If an ABN field, assume valid if previously set
                if (fc.fieldSchema[key] && fc.fieldSchema[key].type && fc.fieldSchema[key].type === 'abnVerification' && fc.fields[key].length > 0) {
                  fc.validAbns.push(fc.fields[key]);
                }

                // If a grouplet, also store the entire state
                if (key.indexOf(fc.constants.prefixSeparator) > -1) {
                  saveOriginalGroupletValue(key, data.data[key]);
                }
              }
            }
          }
        };

        /**
         * Once verification is complete, need to render form
         */
        preVerificationComplete = function () {
          api('form/data', {}, 'post', function (result) {
            if (typeof result === 'object' && result.success) {
              fc.domContainer.html('<div class="render"></div>');

              // Update schema
              setSchemaData(result);
              fc.schemaData.data = result.data;
              fc.schemaData.files = result.files;
              fc.schemaData.verify = {
                perform: false
              };

              // Initialise proper render
              initRender(fc.schemaData);
            }
          });
        };

        /**
         * Verify the user session prior to output
         */
        verifySession = function () {
          var verify = fc.schemaData.verify;

          var html = '';
          html += '<div class="fc-page fc-page-verify-session">';
          html += '<div class="fc-section">';

          // Section header
          html += '<div class="fc-section-header">';
          html += '<div class="fc-section-label">';
          html += '<h4>Welcome back!</h4>';
          html += '</div>'; //!fc-section-label
          html += '</div>'; //!fc-section-header

          // Section body
          html += '<div class="fc-section-body">';
          html += '<div class="fc-resume-choice">';
          html += '<p>The progress of filling your application has been saved since your last visit.</p><p>You can resume your application or start a new one by clicking on the buttons below:</p>';
          html += '<input type="submit" class="fc-btn fc-resume-application-button" onclick="resumeApplication()" value="Resume application">';
          html += '<script>function hardreload() {$.removeCookie("fcSessionId");location.reload(true);}</script>';
          html += '<script>function resumeApplication() {$(".fc-resume-choice").slideUp();$(".fc-resume-application").slideDown();$(".fc-send-sms input").trigger("click");}</script>';
          html += '</div>';
          html += '<div class="fc-resume-application" style="display:none">';
          html += '<p>In order to resume your application, you must first verify your credentials. We have sent a confirmation number to your ';
          html += (verify.method === 'sms')?'mobile phone':'e-mail address';
          html += '. Please enter the code below or click the button to re-send the verification code.</p>';
          html += '<div class="fc-field fc-field-smsVerification">';

          switch (verify.method) {
            case 'sms':
              var options = {
                _id: {
                  $id: 'preVerification'
                },
                config: {
                  autoDeliverOnFirstRender: false,
                  renderAsModal: false,
                  verificationButtonText: fc.lang.verify
                }
              };
              html += renderSmsVerification(options);
              break;
          }

          html += '</div>'; //!fc-field-smsVerification
          html += '</div>';
          html += '<input type="submit" class="fc-btn fc-restart-application" onclick="hardreload()" value="Restart application">';
          html += '<div class="fc-clear"></div>';

          html += '</div>'; //!fc-section-body

          html += '</div>'; //!fc-section
          html += '</div>'; //!fc-page

          fc.domContainer.html(html);

          // On loaded
          fc.domContainer.trigger(fc.jsEvents.onConnectionMade);
          onSchemaLoaded();
        };

        /**
         * Load the form schema/definition
         */
        loadSchema = function () {
          // Send off the API call
          api('form/schema', {}, 'post', function (data) {
            if (typeof data.error === 'boolean' && data.error) {
              log('FC Error: ' + data.message);
              return;
            }

            var key;
            if (data && data.stage) {
              setFieldSchemas(data.stage);
            }

            // Set the data returned by the server
            setSchemaData(data);

            if (typeof data.lang === 'object') {
              loadLanguagePack(data.lang);
            }

            // If library files aren't marked to be auto discovered, initialise the render
            if (!fc.config.autoDiscoverLibs) {
              if (sessionRequiresVerification(data)) {
                verifySession();

                return;
              }
              initRender(data);
            } else {
              autoLoadLibs(data);
            }
          });
        };

        /**
         * Process the save queue
         */
        processSaveQueue = function () {
          if (fc.mode === formcorp.MODE_REVIEW) {
            // When in review mode, nothing should be updated
            return;
          }

          if (fc.config.saveInRealTime !== true) {
            return;
          }

          // Terminate if already running
          if (fc.saveQueueRunning === true) {
            log('[FC] Save queue is already running (slow server?)');
            return;
          }

          // Terminate if nothing to do
          if (Object.keys(fc.saveQueue).length === 0) {
            return;
          }

          // Store value locally, so we can remove later
          fc.saveQueueRunning = true;
          var temporaryQueue = fc.saveQueue,
            data = {
              form_id: fc.formId,
              page_id: fc.pageId,
              form_values: temporaryQueue
            };

          // Fire off the API call
          api('page/submit', data, 'put', function (data) {
            var key;
            if (typeof data === "object" && data.success === true) {
              // Update activity (server last active timestamp updated)
              fc.lastActivity = (new Date()).getTime();

              // Delete values from the save queue
              for (key in temporaryQueue) {
                if (temporaryQueue.hasOwnProperty(key)) {
                  if (typeof fc.saveQueue[key] === "string" && fc.saveQueue[key] === temporaryQueue[key]) {
                    delete fc.saveQueue[key];
                  }
                }
              }
            }

            fc.saveQueueRunning = false;
          });
        };

        return {

          /**
           * Different library files
           */
          libs: {
            MATERIAL_DATEPICKER: 'materialDatepicker'
          },

          /**
           * Modes when filling out the data
           */
          modes: {
            DEFAULT: 'defaultMode',
            PREPOPULATE: 'propopulateMode'
          },

          /**
           * Initialise the formcorp object.
           * @param publicKey
           * @param container
           */
          init: function (publicKey, container) {
            this.publicKey = publicKey;
            this.container = container;
            this.jQueryContainer = '#' + container;
            this.domContainer = $(this.jQueryContainer);

            // Temporary placeholders for objects to be populated
            this.fields = {};
            this.fieldSchema = {};
            this.sections = {};
            this.pages = {};
            this.saveQueueRunning = false;
            this.saveQueue = {};
            this.prevPages = {};
            this.lastActivity = (new Date()).getTime();
            this.expired = false;
            this.pageOrders = [];
            this.activeScroll = "";
            this.processedActions = {};
            this.analytics = false;
            this.lastCompletedField = '';
            this.lastCompletedTimestamp = Date.now();
            this.lastHesitationTime = -1;
            this.nextPageLoadedTimestamp = Date.now();
            this.nextPageButtonClicked = false;
            this.validAbns = [];
            this.mobileView = isMobile();
            this.withinIterator = {};
            this.preventNextPageLoad = false;
            this.developmentBranches = ['Staging', 'Development', 'Dev'];
            this.fieldCount = 0;
            this.formState = '';
            this.intervals = [];
            this.loadedLibs = [];
            this.languagePacks = {};

            // This allows the users/apps to override core functions within the SDK
            this.functions = {
              loadNextPage: loadNextPage,
              loadPrevPage: loadPrevPage,
              afterRender: afterRender
            };

            // Fields that require library fieldPages
            this.requiredFieldLibraries = {
              'date': [this.libs.MATERIAL_DATEPICKER]
            };

            // Set default value for library files to load
            if (typeof this.libs2Load === 'undefined') {
              this.libs2Load = [];
            }

            // Set default value for entity tokens
            if (typeof this.entityTokens === 'undefined') {
              this.entityTokens = {};
            }

            // Set the default mode
            if (typeof this.mode !== 'string') {
              this.mode = this.modes.DEFAULT;
            }

            // Set the tags (may have previously been set)
            if (typeof this.tags === 'undefined') {
              this.tags = [];
            }

            if (typeof this.languageAliasMaps === 'undefined') {
              this.languageAliasMaps = {};
            }

            // Add support for CORs (this was resulting in an error in IE9 which was preventing it from being able to communicate with out API)
            jQuery.support.cors = true;

            // Fields to re-render on value change
            this.reRenderOnValueChange = {};

            // Track which fields belong to which grouplets
            this.fieldGrouplets = {};

            // Set as production mode by default
            if (typeof this.dev !== 'boolean') {
              this.dev = false;
            }

            /**
             * Modal states
             * @type {{DELETE_REPEATABLE: string, ADD_REPEATABLE: string, EDIT_REPEATABLE: string, EMAIL_VERIFICATION_CODE: string, SMS_VERIFICATION_CODE: string, MODAL_TEXT: string}}
             */
            this.states = {
              DELETE_REPEATABLE: 'deleteRepeatable',
              ADD_REPEATABLE: 'addRepeatableRow',
              EDIT_REPEATABLE: 'editRepeatableRow',
              EMAIL_VERIFICATION_CODE: 'emailVerificationCode',
              SMS_VERIFICATION_CODE: 'smsVerificationCode',
              MODAL_TEXT: 'modalText',
              SUBMIT_DEVELOPMENT_BRANCH: 'submitDevelopmentBranch'
            };

            /**
             * Event types
             * @type {{onFieldInit: string, onFocus: string, onBlur: string, onValueChange: string, onNextStage: string, onFormInit: string, onMouseDown: string, onFieldError: string, onNextPageClick: string, onNextPageSuccess: string, onNextPageError: string, onFormComplete: string}}
             */
            this.eventTypes = {
              onFieldInit: 'onFieldInit',
              onFocus: 'onFocus',
              onBlur: 'onBlur',
              onValueChange: 'onValueChange',
              onNextStage: 'onNextStage',
              onFormInit: 'onFormInit',
              onMouseDown: 'onMouseDown',
              onFieldError: 'onFieldError',
              onNextPageClick: 'onNextPageClick',
              onNextPageSuccess: 'onNextPageSuccess',
              onNextPageError: 'onNextPageError',
              onFormComplete: 'onFormComplete'
            };

            /**
             * JS events
             * @type {{onFormInit: string, onFormExpired: string, onValidationError: string, onFormComplete: string, onNextPage: string, onPageChange: string, onPrevPage: string, onConnectionMade: string, onFinishRender: string, onFieldError: string, onFieldSuccess: string, onAnalyticsLoaded: string, onFieldValueChange: string, onLoadingPageStart: string, onLoadingPageEnd: string}}
             */
            this.jsEvents = {
              onFormInit: 'OnFcInit',
              onFormExpired: 'onFormExpired',
              onValidationError: 'onValidationError',
              onFormComplete: 'onFormComplete',
              onNextPage: 'onNextPage',
              onPageChange: 'onPageChange',
              onPrevPage: 'onPrevPage',
              onConnectionMade: 'onFCConnectionMade',
              onFinishRender: 'onFinishFormRender',
              onFieldError: 'onFieldError',
              onFieldSuccess: 'onFieldSuccess',
              onAnalyticsLoaded: 'onAnalyticsLoaded',
              onFieldValueChange: 'onFieldValueChange',
              onLoadingPageStart: 'onLoadingPageStart',
              onLoadingPageEnd: 'onLoadingPageEnd',
              onGreenIdLoaded: 'onGreenIdLoaded',
              onButtonUnknownClick: 'onButtonUnknownClick',
              onDynamicRowAdded: 'onDynamicRowAdded',
              onDynamicRowRemoved: 'onDynamicRowRemoved',
              onPreValueChange: 'onPreValueChange',
              onValueChanged: 'onValueChanged',
              onFieldFocus: 'onFieldFocus',
              onFieldBlur: 'onFieldBlur',
              onCustomerAuthResult: 'onCustomerAuthResult',
              onFormStateChange: 'onFormStateChange',
              onPageRender: 'onPageRender'
            };

            /**
             * One time processes
             * @type {{emailListeners: string, smsListeners: string, creditCardListeners: string}}
             */
            this.processes = {
              emailListeners: 'emailListeners',
              smsListeners: 'smsListeners',
              creditCardListeners: 'creditCardListeners',
              loadSignatureLibs: 'loadSignatureLibs'
            };

            /**
             * Constants
             * @type {{enterKey: number, prefixSeparator: string, tagSeparator: string, configKeys: {summaryLayout: string}, persistentSessions: string, defaultChannel: string}}
             */
            this.constants = {
              enterKey: 13,
              prefixSeparator: '_',
              tagSeparator: '.',
              configKeys: {
                summaryLayout: 'summaryLayout'
              },
              persistentSessions: 'persistentSessions',
              enhancedSecurity: 'enhancedSecurity',
              defaultChannel: 'master',
              greenId: {
                scriptPath: isMinified() ? 'lib/green-id.min.js' : 'lib/green-id.js'
              },

              // Repeatable constants
              repeatableWithButton: [0, 1],
              repeatablePredetermined: 2,
              repeatableInModal: [0],
              repeatableInDOM: [1, 2],
              repeatableLinkedTo: 'repeatableLinkedTo',

              // Function callback type
              functionCallbackType: 'functionCallback',
              formulaPrefix: 'FORMULA:',
              formLoadedClass: 'fc-form-loaded',

              // Form states
              stateLoadingEntityRecord: 'loadingEntityRecord',

              optionValueSeparator: '|'
            };

            /**
             * Payment environments
             * @type {{live: string, sandbox: string}}
             */
            this.environments = {
              live: "Live",
              sandbox: "Sandbox"
            };

            /**
             * Payment gateways
             * @type {{paycorp: {method: string, action: string}}}
             */
            this.gateways = {
              paycorp: {
                method: 'POST',
                action: {
                  sandbox: 'https://test-merchants.paycorp.com.au/paycentre3/makeEntry',
                  live: 'https://merchants.paycorp.com.au/paycentre3/makeEntry'
                }
              },
              securepay: {
                method: 'POST',
                action: {
                  sandbox: 'https://payment.securepay.com.au/test/v2/invoice?bill_name=transact',
                  live: 'https://payment.securepay.com.au/live/v2/invoice?bill_name=transact',
                }
              }
            };

            /**
             * Credit card types
             * @type {{visa: string, mastercard: string, amex: string}}
             */
            this.cardTypes = {
              visa: 'visa',
              mastercard: 'mastercard',
              amex: 'amex'
            };

            // Set config if not already done so
            if (fc.config === undefined) {
              this.setConfig();
            }

            // Set language if not already done so
            if (fc.lang === undefined) {
              this.setLanguage();
            }

            // Set the default channel
            if (fc.channel === undefined) {
              fc.channel = fc.constants.defaultChannel;
            }

            // Check to make sure container exists
            $(document).ready(function () {
              // Analyse analytics if required
              if (fc.config.analytics === true || (typeof fc.config.analytics === "string" && fc.config.analytics.length > 0)) {
                initAnalytics();
              }

              if (fc.domContainer.length === 0) {
                return false;
              }

              // Fetch the form id
              if (fc.domContainer.attr('data-id') === '') {
                return false;
              }
              fc.formId = fc.domContainer.attr('data-id');

              fc.domContainer.attr('data-mode', fc.mode);

              // Initialise the parser
              loadJsFile(parserUrl(), function () {
                fc.parser = new Parser();
                fc.parser.functions.groupletLength = groupletLength;
                fc.parser.functions.getValue = getValue;
                fc.parser.functions.fieldIdByTag = fieldIdByTag;
                fc.parser.functions.getContentRadioListMeta = getContentRadioListMeta;
              });

              loadLibs();

              // Attempt to load the settings from the server
              loadSettings(function () {
                // Set the session id
                fc.initSession();

                // Initialise the channel on the root element
                if (!fc.domContainer.hasClass('fc-channel')) {
                  fc.domContainer.addClass('fc-channel fc-channel-' + fc.channel);
                }

                // Register event listeners and load the form schema
                fc.domContainer.html('<div class="render"></div>');
                loadCssFiles();
                registerEventListeners();
                loadSchema();

                // Form has been successfully initialised
                fc.formPosition = fc.domContainer.position();
                logEvent(fc.eventTypes.onFormInit);
                fc.domContainer.trigger(fc.jsEvents.onFormInit);

                // Mark the form as having been loaded
                fc.domContainer.addClass(fc.constants.formLoadedClass);

                // Initialise in dev mode
                if (isDevelopmentBranch()) {
                  fc.domContainer.on(fc.jsEvents.onFinishRender, function () {
                    var doc = $(document);

                    if (doc.find('.fc-dev-status').length === 0) {
                      var devHtml = $('<div></div>');
                      devHtml.attr('class', 'fc-dev-status');
                      devHtml.append('<span></span>');
                      devHtml.find('span').html('in development');
                      doc.find('body').append(devHtml);
                    }
                  });
                }

                // Save form fields intermittently
                if (fc.config.saveInRealTime === true) {
                  fc.intervals.push(setInterval(function () {
                    processSaveQueue();
                  }, fc.config.saveInRealTimeInterval));
                }

                // Check if the user needs to be timed out
                if (fc.config.timeUserOut) {
                  fc.intervals.push(setInterval(function () {
                    if (fc.expired === true) {
                      return;
                    }

                    timeout();
                  }, 5000));
                }
              });
            });
          },

          /**
           * Return the CDN url
           * @returns {string}
           */
          getCdnUrl: function () {
            return cdnUrl;
          },

          /**
           * Return the API function
           */
          api: api,

          /**
           * Retrieves the field config for a given key name
           */
          getConfig: getConfig,

          /**
           * Retrieves the form session id
           */
          getSessionId: getSessionId,

          /**
           * Retrieve the id for a form field
           */
          getId: getId,

          /**
           * greenID: make the following functions/properties visible to the greenID component
           */
          renderGreenIdField: renderGreenIdField,
          initGreenIdFieldInDOM: initGreenIdFieldInDOM,

          /**
           * Expose field tag functionality
           */
          getAllFieldTags: getAllFieldTags,
          getFieldTagValues: getFieldTagValues,
          getTokens: getTokens,
          setLanguageAlias: setLanguageAlias,

          /**
           * Expose modal functions
           */
         showModal: showModal,

          /**
           * Retrieve a URL parameter by name
           * @param name
           * @returns {string}
           */
          getUrlParameter: function (name) {
            name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
              results = regex.exec(location.search);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
          },

          /**
           * Sets the list of protected development branches.
           * @param branches array
           */
          setDevelopmentBranches: function (branches) {
            if ($.isArray(branches)) {
              fc.developmentBranches = branches;
            }
          },

          /**
           * Retrieve the list of 'protected' development branches
           */
          getDevelopmentBranches: function () {
            return fc.developmentBranches;
          },

          /**
           * Set the form branch to use.
           * @param branch
           */
          setBranch: function (branch) {
            this.branch = branch;
          },

          /**
           * Mark as in development mode.
           * @param isDev
           */
          setAsDevelopmentMode: function (isDev) {
            if (typeof isDev !== 'boolean') {
              isDev = true;
            }

            this.dev = isDev;
          },

          /**
           * Set the API URL
           * @param url
           */
          setApiUrl: function (url) {
            if (typeof url !== 'string') {
              return false;
            }

            this.apiUrl = url;
            return true;
          },

          /**
           * Set the CDN URL
           * @param url
           */
          setCdnUrl: function (url) {
            if (typeof url !== 'string') {
              return false;
            }

            this.cdnUrl = url;
            return true;
          },

          /**
           * Set the channel
           * @param channel
           */
          setChannel: function (channel) {
            this.channel = channel;
          },

          /**
           * Set the session id
           * @param sessionId
           */
          setSessionId: function (sessionId) {
            this.sessionId = sessionId;
          },

          /* Set a value on the application */
          setValue: setValue,
          setVirtualValue: setVirtualValue,

          /* Delete the user session */
          deleteSession: deleteSession,

          /**
           * Retrieve a value
           * @param id
           * @returns {*}
           */
          getValue: function (id) {
            return getValue(id);
          },

          /**
           * Retrieve a field schema by ID
           * @param id
           * @returns false|object
           */
          getFieldDefinition: function (id) {
            return fc.fieldSchema[id] || false;
          },

          /**
           * Set class config values.
           * @param data
           */
          setConfig: function (data) {
            var eventQueueDefault = 8000,
              realTimeSaveDefault = 6000,
              key;

            // Default values
            this.config = {
              debug: false,
              analytics: true,
              realTimeValidation: true,
              inlineValidation: true,
              sessionKeyLength: 40,
              sessionIdName: 'fcSessionId',
              eventQueueInterval: eventQueueDefault,
              saveInRealTime: true,
              saveInRealTimeInterval: realTimeSaveDefault,
              showPrevPageButton: true,
              timeUserOut: false,
              timeOutWarning: 870, // 14 minutes 30 seconds
              timeOutAfter: 900, // 15 minutes,
              cvvImage: null,
              onePage: false,
              smoothScroll: false,
              scrollDuration: 1000,
              scrollOnSubmitError: false,
              scrollWait: 500,
              initialScrollOffset: 0,
              scrollOffset: 0,
              conditionalHtmlScrollOffset: {},
              autoLoadPages: false,
              autoScrollToNextField: false,
              activePageOffset: 250,
              creditCardNumberLimits: [16, 16],
              maxCreditCardCodeLength: 4,
              descriptionBeforeLabel: true,
              creditCardErrorUrlParam: 'creditCardError',
              forceSignatureLib: false,
              signatureLibCss: [
                cdnUrl() + 'dist/signaturepad/assets/jquery.signaturepad.css'
              ],
              signatureLibJs: [
                cdnUrl() + 'dist/signaturepad/jquery.signaturepad.min.js',
                cdnUrl() + 'dist/signaturepad/assets/flashcanvas.js',
                cdnUrl() + 'dist/signaturepad/assets/json2.min.js'
              ],
              signatureClass: 'sigPad',
              updateHash: true,
              deleteSessionOnComplete: true,
              autoShiftFocusOnEnter: false,
              minSizeForMobile: 479,
              asterisksOnLabels: true,
              colonAfterLabel: true,
              helpAsModal: false,
              staticHelpModalLink: false,
              hideModal: false,
              showModalCloseInFooter: true,
              showModalCloseInHeader: true,
              helpDefaultWhenNoTitleText: true,
              hashPrefix: 'h:',
              hashSeparator: ',',
              entityPrefix: 'ent:',
              css: {
                entityRecordLoadingClass: 'entity-record-loading'
              },
              renderOnlyVertical: true,
              datePickerIconOffset: 25,
              autoDiscoverLibs: true,
              verificationModal: false,
              forceNextPageAutoload: false,
              administrativeEdit: false
            };

            // Minimum event queue interval (to prevent server from getting slammed)
            if (this.config.eventQueueInterval < eventQueueDefault) {
              this.config.eventQueueInterval = eventQueueDefault;
            }

            // Minimum interval for real time saving (to prevent server from getting harrassed)
            if (this.config.saveInRealTimeInterval < realTimeSaveDefault) {
              this.config.saveInRealTimeInterval = realTimeSaveDefault;
            }

            // Update with client options
            if (typeof data === 'object' && Object.keys(data).length > 0) {
              for (key in data) {
                if (data.hasOwnProperty(key)) {
                  fc.config[key] = data[key];
                }
              }
            }
          },

          fieldErrors: fieldErrors,

          /**
           * Set the language data values
           * @param data
           */
          setLanguage: function (data) {
            var key;

            // Initialise the language
            if (Object.keys(this).indexOf('lang') === -1) {
              this.lang = {
                prevButtonText: 'Previous',
                submitText: "Next",
                submitFormText: "Submit application",
                formCompleteHtml: '<h2 class="fc-header">Your application is complete</h2><p>Congratulations, your application has successfully been completed. Please expect a response shortly.</p>',
                addFieldTextValue: 'Add value',
                removeFieldTextValue: 'Remove value',
                closeModalText: 'Close',
                addModalText: 'Add',
                addModalHeader: 'Add value',
                emptyFieldError: 'This field cannot be empty',
                defaultCustomValidationError: 'This field failed custom validation',
                sessionExpiredHtml: '<h2 class="fc-header">Your session has expired</h2><p>Unfortunately, due to a period of extended inactivity, your session has expired. To fill out a new form submission, please refresh your page.</p>',
                creditCardNameText: 'Name (as it appears on your card)',
                creditCardNumberText: 'Card number (no dashes or spaces)',
                creditCardExpiryDateText: 'Expiration date',
                creditCardSecurityCodeText: 'Security code (3 on back, Amex: 4 on front)',
                monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                creditCardMissingName: "You must enter a valid name as it appears on your credit card",
                creditCardMissingNumber: "You must enter a valid credit card number",
                creditCardMissingExpiryDate: "You must enter a valid expiry date",
                creditCardExpired: "Your card has expired",
                creditCardMissingSecurityCode: "You must enter a valid security code",
                creditCardNumberIncorrectFormat: "The format of your credit card number is incorrect, please verify your details",
                edit: "Edit",
                delete: "Delete",
                error: "Error",
                verificationErrorPrefix: "ERROR: ",
                verificationEmptyCode: "You must enter a verification code.",
                defaultModalTitle: 'Information',
                deleteDialogHeader: "Are you sure?",
                editDialogHeader: "Edit",
                deleteSignatoryDialogText: "Are you sure you want to delete the selected signatory?",
                editSignatoryDialogText: "Edit signatory",
                confirm: "Confirm",
                invalidCardFormat: "The credit card you entered could not be recognised",
                sendEmail: "Send email",
                fieldValidated: "<p><i class=\"fa fa-check\"></i>Successfully verified</p>",
                fileFieldErrorPrefix: "ERROR:",
                fileFriendlyFieldErrorPrefix: "We're sorry, but ",
                fieldMustBeVerified: "You must first complete verification",
                fileFieldTypeError: "Unaccepted file type. Available File Types: ",
                fileFieldSizeError: "File is too large. Max File Size: ",
                invalidFiles: "You have invalid files.",
                noValidFiles: "You have no valid files.",
                sendSms: "Re-Send SMS",
                payNow: "Pay now",
                creditCardSuccess: "<p>Your payment has successfully been processed.</p>",
                paymentRequired: "Payment is required before proceeding.",
                paymentGst: "GST:",
                paymentSubTotal: "Sub-total:",
                paymentTotal: "Total:",
                currencySymbol: "$",
                total: "Total",
                description: "Description",
                paymentDescription: "Application completion",
                validate: 'Validate',
                validAbnRequired: 'You must enter and validate a valid ABN.',
                helpModalLink: 'what is this?',
                helpTitle: 'What is this?',
                requiredAsterisk: '*',
                labelColon: ':',
                greenID: {
                  options: {
                    driversLicense: {
                      title: 'Drivers Licence',
                      body: 'Use your state issued driver\'s licence to help prove your identity.',
                      icon: ''
                    },
                    passport: {
                      title: 'Passport',
                      body: 'Help confirm your identity using the details on your Australian issued passport.',
                      icon: ''
                    },
                    skip: {
                      title: 'Skip Verification',
                      body: 'You will be required to manually attach verification documents upon form submission.',
                      icon: ''
                    }
                  },
                  html: {
                    completePrefix: 'To complete digital verification for this individual, you must verify <span></span> from the options below.',
                    alreadyInitialised: '<em>This individual has previously undergone electronic verification elsewhere on the form.</em>',
                    skipped: 'You have skipped verification for this user.',
                    completed: 'You have successfully been verified.'
                  }
                },
                verify: 'Verify',
                passwordHidden: 'Hidden',
                yes: 'Yes',
                no: 'No',
                confirmSubmitDevelopment: 'The form is currently on a <em>development branch</em>. Are you sure you want to submit?',
                areSureHeader: 'Are you sure?',
                loading: 'Loading...',
                dateCorrectFormat: 'Date must be in a valid format',
                optionPrefix: "opt_",
                urlSessionPrefix: 's:',
                downloadButtonText: 'Download'
              };
            }

            // Update with client options
            if (typeof data === 'object' && Object.keys(data).length > 0) {
              for (key in data) {
                if (data.hasOwnProperty(key)) {
                  fc.lang[key] = data[key];
                }
              }
            }
          },

          /**
           * Fetches and returns a setting value passed down from the remote server.
           *
           * @param settingName
           * @param defaultValue
           * @returns {*}
           */
          getSetting: function (settingName, defaultValue) {
            if (fc.settings && fc.settings[settingName] !== undefined) {
              return fc.settings[settingName];
            }

            return defaultValue;
          },

          // Expose the API URL
          remoteApiUrl: apiUrl,

          /**
           * Initialise the existing session, or instantiate a new one.
           */
          initSession: function () {
            // If session id set in URL, use it
            if (this.getSetting(this.constants.persistentSessions, false)) {
              var urlSessionId = getHashVar(fc.lang.urlSessionPrefix);
              if (urlSessionId.length > 0 ) {
                $.cookie(this.config.sessionIdName, urlSessionId);
                this.sessionId = urlSessionId;

                // After the hash var has been processed, remove it from the URL
                removeHashVar(fc.lang.urlSessionPrefix);
                return;
              }

              // If session id already exists (@todo: and allowed to set sessions), set it
              if (this.sessionId !== undefined) {
                $.cookie(this.config.sessionIdName, this.sessionId);
                return;
              }

            }


            // Initialise a new session
            if (this.sessionId === undefined && $.cookie(this.config.sessionIdName) === undefined) {
              this.sessionId = generateRandomString(this.config.sessionKeyLength);
              $.cookie(this.config.sessionIdName, this.sessionId);
            } else {
              this.sessionId = $.cookie(this.config.sessionIdName);
            }
          },

          /**
           * Ability to override a function.
           * @param key string
           * @param func function
           */
          overrideFunction: function (key, func) {
            if (typeof key === 'string' && typeof func === 'function') {
              fc.functions[key] = func;
            }
          },

          // Exposed functions
          loadNextPage: loadNextPage,
          loadPrevPage: loadPrevPage,
          afterRender: afterRender,
          validForm: validForm,
          getFieldValue: getFieldValue,

          /**
           * Returns true if a page is valid, false if not
           * @param pageId
           * @returns {boolean}
           */
          pageIsValid: function (pageId) {
            var selector = $('.fc-page[data-page-id="' + pageId + '"]');
            if (selector && selector.length > 0) {
              return validForm(selector, false);
            }
          },

          getPageById: getPageById,

          /**
           * Returns whether two values are equal.
           *
           * @param field
           * @param comparisonValue
           * @returns {boolean}
           */
          comparisonEqual: function (field, comparisonValue) {
            if (field === undefined) {
              return false;
            }

            return field === comparisonValue;
          },

          /**
           * Returns whether two values are not equal equal.
           * @param field
           * @param comparisonValue
           * @returns {boolean}
           */
          comparisonNot_equal: function (field, comparisonValue) {
            return field !== comparisonValue;
          },

          /**
           * Checks whether a string exists within an array
           * @param field
           * @param comparisonValue
           * @param dataId
           * @returns {boolean}
           */
          comparisonIn: function (field, comparisonValue, dataId) {
            if (field === undefined) {
              return false;
            }

            var x,
              value,
              json,
              el;

            // Attempt to typecast string to json
            try {
              json = $.parseJSON(field);
              field = json;
            } catch (ignore) {
            }

            if (typeof field === 'number') {
              field = '' + field;
            }

            // Field can be string
            if (typeof field === 'string') {
              if (typeof comparisonValue === 'object') {
                for (x = 0; x < comparisonValue.length; x += 1) {
                  value = comparisonValue[x];
                  if (field === value) {
                    return true;
                  }
                }
              }
            } else if (field && comparisonValue && typeof field === "object" && typeof comparisonValue === "object") {
              // Check an array of values against an array of values
              for (x = 0; x < comparisonValue.length; x += 1) {
                try {
                  if (field && field.indexOf(comparisonValue[x]) === -1) {
                    return false;
                  }
                } catch (ignore) {
                }
              }

              return true;
            }

            return false;
          },

          /**
           * Make sure a value does not exist within a set
           * @param field
           * @param comparisonValue
           * @param dataId
           * @returns {boolean}
           */
          comparisonNot_in: function (field, comparisonValue, dataId) {
            return !fc.comparisonIn(field, comparisonValue, dataId);
          },

          /**
           * Checks to see if a value against a field has been set
           * @param field
           * @returns {boolean}
           */
          comparisonIs_not_null: function (field) {
            if (field === undefined) {
              return false;
            }

            if (typeof field === 'string') {
              return field.length > 0;
            }
          },

          /**
           * Checks to see if a value against a field has been set
           * @param field
           * @returns {boolean}
           */
          comparisonIs_null: function (field) {
            if (field === undefined) {
              return true;
            }

            if (typeof field === 'string') {
              return field.length === 0;
            }

            return false;
          },

          /**
           * Checks to see if a value is not empty.
           * @param field
           * @returns {boolean}
           */
          comparisonIs_not_empty: function (field) {
            if (field === undefined) {
              return false;
            }

            if (typeof field === 'string') {
              return field.length > 0;
            } else if (typeof field === 'object') {
              if ($.isArray(field)) {
                return field.length > 0;
              } else {
                return Object.keys(field).length > 0;
              }
            }
          },

          /**
           * Checks to see if a value is empty.
           * @param field
           * @returns {boolean}
           */
          comparisonIs_empty: function (field) {
            if (field === undefined) {
              return false;
            }

            if (typeof field === 'string') {
              return field.length === 0;
            } else if (typeof field === 'object') {
              if ($.isArray(field)) {
                return field.length === 0;
              } else {
                return Object.keys(field).length === 0;
              }
            }
          },

          /**
           * Check if a value does not contain another value.
           * @param field
           * @param comparisonValue
           * @returns boolean
           */
          comparisonContains: function (field, comparisonValue) {
            if (field === undefined) {
              return false;
            }

            return field.indexOf(comparisonValue) > -1;
          },

          /**
           * Check if a value contains another value.
           * @param field
           * @param comparisonValue
           * @returns boolean
           */
          comparisonNot_contains: function (field, comparisonValue) {
            if (field === undefined) {
              return false;
            }

            return field.indexOf(comparisonValue) === -1;
          },

          /**
           * Returns whether one value is greater than another.
           * @param field
           * @param comparisonValue
           * @returns {boolean}
           */
          comparisonGreater: function (field, comparisonValue) {
            return $.isNumeric(field) && $.isNumeric(comparisonValue) && parseFloat(field) > parseFloat(comparisonValue);
          },

          /**
           * Returns whether one value is greater or equal to another.
           * @param field
           * @param comparisonValue
           * @returns {boolean}
           */
          comparisonGreater_or_equal: function (field, comparisonValue) {
            return $.isNumeric(field) && $.isNumeric(comparisonValue) && parseFloat(field) >= parseFloat(comparisonValue);
          },

          /**
           * Returns whether one value is less than another.
           * @param field
           * @param comparisonValue
           * @returns {boolean}
           */
          comparisonLess: function (field, comparisonValue) {
            return $.isNumeric(field) && $.isNumeric(comparisonValue) && parseFloat(field) < parseFloat(comparisonValue);
          },

          /**
           * Returns whether one value is less than or equal to another.
           * @param field
           * @param comparisonValue
           * @returns {boolean}
           */
          comparisonLess_or_equal: function (field, comparisonValue) {
            return $.isNumeric(field) && $.isNumeric(comparisonValue) && parseFloat(field) <= parseFloat(comparisonValue);
          },

          /**
           * Expose get hashvar
           */
           getHashVar: getHashVar,

          /**
           * Tag getter/setter functions
           */
          addTag: addTag,
          removeTag: removeTag,
          setTags: setTags,
          getTags: getTags,

          /**
           * libraries
           */
         addLib: addLib,

          /**
           * Entity token getters/setters
           */
         setEntityToken: setEntityToken,
         setEntityTokens: setEntityTokens,

         /**
          * Mode getter/setter functions
          */
          setMode: setMode,
          getMode: getMode,

          /**
           * Converts a string to camel case.
           * @param str
           * @returns {*}
           */
          toCamelCase: function (str) {
            return str.replace(/^([A-Z])|\s(\w)/g, function (match, p1, p2) {
              if (p2) {
                return p2.toUpperCase();
              }
              return p1.toLowerCase();
            });
          }
        };

      }(jQuery));

    self.forms[id] = fc;

    return self.forms[id];
  };

  var validators = {
    /**
     * Tests if a value is within a particular range.
     * @param params
     * @param value
     * @returns {boolean}
     */
    range: function (params, value) {
      if (!$.isNumeric(value)) {
        return false;
      }

      var min = parseFloat(params[0]),
        max = parseFloat(params[1]),
        val = parseFloat(value);

      return val >= min && val <= max;
    },

    /**
     * Tests if above a minimum value.
     * @param params
     * @param value
     * @returns {boolean}
     */
    min: function (params, value) {
      // Replace commas
      value = value.replace(/\,/g, '');

      if (!$.isNumeric(value)) {
        return false;
      }

      return parseFloat(value) >= parseFloat(params[0]);
    },

    /**
     * Test if below minimum value.
     * @param params
     * @param value
     * @returns {boolean}
     */
    max: function (params, value) {
      // Replace commas
      value = value.replace(/\,/g, '');

      if (!$.isNumeric(value)) {
        return false;
      }

      return parseFloat(value) <= parseFloat(params[0]);
    },

    /**
     * Test a string against a regular expression.
     * @param params
     * @param value
     * @returns {boolean|*}
     */
    regularExpression: function (params, value) {
      var re = new RegExp(params[0]);
      return re.test(value);
    },

    /**
     * Verifies whether an ABN is valid
     * @param value
     * @returns boolean
     */
    validAbn: function (value) {
      if (value.replace(/[^0-9]/g, '').length === 0) {
        // If no value set, return false
        return false;
      }

      var hash = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
        total = 0,
        iterator,
        abn = value.replace(/[\s]+/g, ''),
        abnArr = abn.split("");

      if (/[^0-9]/.test(abn)) {
        return false
      }

      if (abn.length !== 11) {
        return false;
      }

      // Subtract 1 from the first digit
      abnArr[0] = parseInt(abnArr[0]) - 1;

      // Calculate the total
      for (iterator = 0; iterator < 11; iterator += 1) {
        total += parseInt(abnArr[iterator]) * hash[iterator];
      }

      // Return true if divisible by 89
      return total % 89 === 0;
    },

    /**
     * Verifies whether an ACN is valid
     * @param value
     * @returns boolean
     */
    validAcn: function (value) {
      if (value.replace(/[^0-9]/g, '').length === 0) {
        // If no value set, return false
        return false;
      }

      var hash = [8, 7, 6, 5, 4, 3, 2, 1],
        total = 0,
        iterator,
        acn = value.replace(/[\s]+/g, '', value),
        acnArr = acn.split(""),
        divisor,
        complement;

      if (/[^0-9]/.test(acn)) {
        return false
      }

      if (acn.length !== 9) {
        return false;
      }

      // Calculate the total
      for (iterator = 0; iterator < 8; iterator += 1) {
        total += parseInt(acnArr[iterator]) * hash[iterator];
      }

      // Calculate the complement
      divisor = total % 10;
      complement = (10 - divisor) % 10;

      // Verify against the check digit
      return complement === parseInt(acnArr[8]);
    },

    /**
     * Checks whether a value is a valid ABN or ACN
     * @param value
     */
    validAcnOrAbn: function (value) {
      return validAbn(value) || validAcn(value);
    },

    /**
     * Checks whether a value is a valid TFN.
     *
     * @param value
     * @returns {boolean}
     */
    validTFN: function (value) {
      if (value.replace(/[^0-9]/g, '').length === 0) {
        // If no value set, return false
        return false;
      }

      // Test to ensure a 9 digit value
      if (!/^\d{9}$/g.test(value)) {
        return false;
      }

      // Test the checksum
      var hash = [1, 4, 3, 7, 5, 8, 6, 9, 10],
        total = 0,
        iterator,
        exemptionCodes = [
          '333333333',
          '444444441',
          '444444442',
          '555555555',
          '666666666',
          '777777777',
          '888888888',
          '987654321',
          '000000000',
          '111111111'
        ];

      // Test if an exemption code supplied
      if (exemptionCodes.indexOf(value) >= 0) {
        return true;
      }

      // Calculate the total
      for (iterator = 0; iterator < 9; iterator += 1) {
        total += value[iterator] * hash[iterator];
      }

      // Return true if divisible by 11
      return total % 11 === 0;
    }
  };

  return {
    create: create,
    destroyForm: destroyForm,
    forms: self.forms,
    getForms: getForms,
    getForm: getForm,
    validators: validators,

    MODE_REVIEW: 'review'
  };
}());
