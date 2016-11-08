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

    /**
     * The keys of various greenID specific config elements
     * @type {{address: string, country: string, dob: string, email: string, firstName: string, integrationId: string, middleName: string, postcode: string, state: string, suburb: string, title: string}}
     */
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
        },

        /**
         * GreenID hashed values to prevent duplicate initialisation.
         * @type {object}
         */
        hashedValues = {},
        hashedMaster = {},
        hashMap = {},

        /**
         * Fields that are required
         * @type {string[]}
         */
        requiredFields = ['address', 'country', 'firstName', 'postcode', 'state', 'suburb', 'surname'],

        /**
         * Fields already initialised
         */
        alreadyInitialised = {},

        /**
         * Compute a hash of a string
         * @param str string
         * @returns string
         */
        hash = function (str) {
            var hash = 0, i, chr, len;
            if (str.length === 0) return hash;
            for (i = 0, len = str.length; i < len; i++) {
                chr = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0;
            }

            return hash;
        },

        /**
         * Initialise greenID in the DOM
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
         * Update the summary HTML
         * @param fieldId
         */
        updateSummary = function (fieldId, returnString, updateDom) {
            // Update the summary div
            var fieldContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"]'),
                summaryContainer,
                summaryHtml = '',
                nameHtml = '',
                addressHtml = '',
                value = fc.getValue(fieldId),
                values;

            // Ensure values have been set
            if (value === undefined || value.values === undefined) {
                return;
            }

            values = value.values;

            // If the return string is not specified, default it to false
            if (typeof returnString !== 'boolean') {
                returnString = false;
            }

            // Default the updateDom parameter to true
            if (typeof updateDom !== 'boolean') {
                updateDom = true;
            }

            // If the field doesn't exist, do nothing
            if (fieldContainer.length > 0) {
                summaryContainer = fieldContainer.find('.fc-greenid-value-summary');

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

                summaryHtml = '<p>' + nameHtml + '<br>' + addressHtml + '</p>';

                // Update the DOM when required
                if (updateDom) {
                    summaryContainer.html(summaryHtml);
                }

                // If opting to return
                if (returnString) {
                    return summaryHtml;
                }
            }

            // Return an empty string if got this far
            if (returnString) {
                return '';
            }
        },

        /**
         * Fetch the greenID field
         * @returns {*}
         */
        getGreenIdFields = function () {
            // If already retrieved, return
            if (fcGreenID.field !== undefined) {
                return fcGreenID.field;
            }

            var fieldId,
                fields = [];

            // Iterate through each field definition and return if matches
            for (fieldId in fc.fieldSchema) {
                if (fc.fieldSchema.hasOwnProperty(fieldId) && fc.fieldSchema[fieldId].type === 'greenIdVerification') {
                    fields.push(fc.fieldSchema[fieldId]);
                }
            }

            return fields;
        },

        /**
         * Retrieves the value for a field.
         * @param fieldId
         * @returns {*}
         */
        getValue = function (fieldId) {
            // If invalid value passed through, return nothing
            if (fieldId.length === 0) {
                return '';
            }

            return fc.getValue(fieldId) !== undefined ? fc.getValue(fieldId) : '';
        },

        /**
         * Initialises greenID verification
         * @param fieldId
         * @param values
         * @param errorCallback
         */
        initialiseGreenIDVerification = function (fieldId, values, callback, errorCallback) {
            fcGreenID.values[fieldId] = values;
            fcGreenID.initialised[fieldId] = true;

            // Calculate and store the user hash
            var userHash = fc.greenID.userHash(values);
            var hashString = hash(JSON.stringify(userHash));

            if ('undefined' === typeof hashedValues[hashString]) {
              hashedValues[hashString] = [];
            }
            if (hashedValues[hashString].indexOf(fieldId) < 0) {
              hashedValues[hashString].push(fieldId);
            }

            if (typeof hashedMaster[hashString] === 'undefined') {
                hashedMaster[hashString] = fieldId;
            }

            hashMap[fieldId] = hashString;

            fc.api('greenid/gateway/init', values, 'POST', function (data) {
                // Ensure the server returned a valid response
                if (typeof data !== 'object') {
                    return;
                }

                var vals = {};

                if (typeof data.success === 'boolean' && !data.success) {
                  vals = $.extend({}, data);
                  vals.values = values;
                  fc.setVirtualValue(data.fieldId, vals);

                  // Trigger the callback prior to updating the DOM
                  if (typeof callback === 'function') {
                      callback(fieldId, data);
                  }
                  return;
                }

                // If process
                var save = {
                  result: data.result,
                  values: values
                };

                // Update the value detailsrenderGreenIdField
                fc.setVirtualValue(data.fieldId, save);

                // Trigger the callback prior to updating the DOM
                if (typeof callback === 'function') {
                    callback(fieldId, data);
                }

                // Update the summary table
                updateSummary(data.fieldId);
            }, function (data) {
                var vals = {};

                // Error function callback
                // When verification can't be initialised, provide enough details to allow the user to re-initialise
                // Update the value details
                vals.result = {};
                vals.values = values;

                fc.setVirtualValue(fieldId, vals);

                // Update the summary table
                updateSummary(fieldId);

                // Call the error callback if it was passed through
                if (typeof errorCallback === 'function') {
                    errorCallback(data);
                }
            });
        },

        /**
         * Checks for a base greenID object
         * @param data
         * @returns boolean
         */
        validBaseObject = function (data) {
            return typeof data === 'object' && typeof data.result === 'object';
        },

        /**
         * Checks for a valid source result.
         * @param data
         * @returns boolean
         */
        validSources = function (data) {
            return validBaseObject(data) && typeof data.result.sources === 'object';
        },

        /**
         * Returns true if a valid verification result was returned from the server.
         * @param data
         * @param verificationType
         * @returns boolean
         */
        validResponse = function (data, verificationType) {
            return validSources(data) && typeof data.result.sources[verificationType] === 'object';
        },

        /**
         * Get the state of a verification attempt (i.e. verified, locked_out)
         * @param field
         * @param verificationType
         * @returns {*}
         */
        getSourceState = function (field, verificationType) {
            var fieldObj = typeof field === 'string' ? fc.getValue(field) : field;

            if (fieldObj === undefined || !validResponse(fieldObj, verificationType) || fieldObj.result.sources[verificationType].state === undefined) {
                return '';
            }

            return fieldObj.result.sources[verificationType].state;
        },

        /**
         * Checks to see if a verification has passed.
         * @param fieldId
         * @param verificationType
         * @returns boolean
         */
        passedValidation = function (fieldId, verificationType) {
            var field = fc.getValue(fieldId);

            // Check to make sure the field is in the correct format
            if (field === undefined || !validResponse(field, verificationType) || field.result.sources[verificationType].passed === undefined) {
                return false;
            }

            return ['true', true].indexOf(field.result.sources[verificationType].passed) > -1;
        },

        /**
         * Display the loading container.
         * @param container
         */
        displayLoadingWidget = function (container) {
            var loaderContainer = container.find('.fc-loader-container');

            // Add the class if it doesn't exist
            if (!container.hasClass('fc-loading-widget')) {
                container.addClass('fc-loading-widget');
            }

            // Only add the container if it doesn't exist
            if (loaderContainer.length === 0) {
                container.prepend('<div class="fc-loader-container"><div class="fc-loader-bg"></div><div class="fc-loader-content"><div class="fc-loader-wrapper"><div class="fc-loader"></div><div class="loader-section section-left"></div><div class="loader-section section-right"></div></div></div></div>');
            }
        },

        /**
         * Remove the loading widget.
         * @param container
         */
        removeLoadingWidget = function (container) {
            var loaderContainer = container.find('.fc-loader-container');

            // Remove the class if it exists
            if (container.hasClass('fc-loading-widget')) {
                container.removeClass('fc-loading-widget');
            }

            // Remove the loader container
            if (loaderContainer.length > 0) {
                loaderContainer.remove();
            }
        },

        /**
         * Display an error dialog on a container.
         * @param container
         * @param message
         */
        showError = function (container, message) {
            var errorContainer = container.find('.fc-error-widget');

            if (errorContainer.length > 0) {
                // Set the text for the error
                errorContainer.find('.alert').html(message);
                return;
            }

            container.append('<div class="fc-error-widget"><div class="alert alert-danger" role="alert">' + message + '</div></div>');
        },

        /**
         * Hide the error alert from the user.
         * @param container
         */
        hideError = function (container) {
            var errorContainer = container.find('.fc-error-widget');

            if (errorContainer.length > 0) {
                errorContainer.remove();
            }
        },

        /**
         * Update the DOM with the field verification status.
         * @param fieldId
         */
        updateIsVerified = function (fieldId) {
            var fieldContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"]'),
                verifiedClass = 'fc-is-verified',
                notVerifiedClass = 'fc-not-verified',
                verificationErrorClass = 'fc-verification-error',
                skippedClass = 'fc-skipped-verification',
                alreadyInitialisedClass = 'fc-already-initialised-verification',
                automaticFail = false;

            // Ensure the field container is found.
            if (fieldContainer.length === 0) {
                return;
            }

            // Update the DOM with the field verification status.
            if (fcGreenID.hasSkipped(fieldId)) {
                fieldContainer.removeClass(notVerifiedClass).removeClass(alreadyInitialisedClass).removeClass(verificationErrorClass).removeClass(verifiedClass).addClass(skippedClass);
            } else if (fcGreenID.isVerified(fieldId)) {
                // Verification has succeeded.
                fieldContainer.removeClass(notVerifiedClass).removeClass(alreadyInitialisedClass).removeClass(verificationErrorClass).removeClass(skippedClass).addClass(verifiedClass);
            } else if (fcGreenID.hasFailed(fieldId) || fcGreenID.amountOfAvailableSources(fieldId) === 0) {
                // Verification has failed.
                fieldContainer.removeClass(notVerifiedClass).removeClass(alreadyInitialisedClass).removeClass(verifiedClass).removeClass(skippedClass).addClass(verificationErrorClass);
            } else {
                // Verification has not completed.
                fieldContainer.removeClass(verifiedClass).removeClass(alreadyInitialisedClass).removeClass(verificationErrorClass).removeClass(skippedClass).addClass(notVerifiedClass);
            }
        },

        /**
         * Verify a license number for a given state.
         * @param licenseType
         * @param fieldId
         * @param requiredFields
         */
        verifyLicense = function (licenseType, fieldId, requiredFields, exemptFields) {
            var schema = fc.fieldSchema[fieldId],
                fieldValue = fc.getValue(fieldId),
                childContainer,
                tos,
                values = {},
                value,
                input,
                key,
                postData = {};

            // Ensure the field exists
            if (schema === undefined || typeof fieldValue !== 'object') {
                return;
            }

            // Fetch the container inside the DOM
            childContainer = $(fc.jQueryContainer).find('.fc-child-options[data-for="' + fieldId + '"]');
            if (childContainer.length === 0) {
                return;
            }

            // Ensure required fields are found
            for (key in requiredFields) {
                if (requiredFields.hasOwnProperty(key)) {
                    input = childContainer.find('.' + requiredFields[key] + ' input');

                    // Ensure elements exist
                    if (input.length === 0) {
                        showError(childContainer, 'Required field \'' + key + '\' not found.');
                        return;
                    }

                    // Ensure elements have an appropriate value
                    value = input.val();
                    if ((value === null || value.length === 0) && exemptFields.indexOf(key) == -1) {
                        showError(childContainer, 'Please ensure all form fields are correctly filled out.');
                        return;
                    }

                    values[key] = input.val();
                    postData[key] = value;
                }
            }

            // Ensure the user agrees to the terms and conditions
            tos = childContainer.find('.tos input:checked').length > 0;
            if (!tos) {
                showError(childContainer, 'You must read and agree to the terms and conditions prior to verification.');
                return false;
            }

            // If the user has got this far, remove all errors
            hideError(childContainer);

            // Append the necessary post data
            postData.verificationUserId = fieldValue.result.userId;
            postData.fieldId = fieldId;

            // Display loading widget to the user
            displayLoadingWidget(childContainer);

            // Send the request to the server to attempt to verify the license plate
            fc.api('greenid/gateway/verify-' + licenseType, postData, 'POST', function (data) {
                var licenseOptionContainer,
                    greenIDOptionsContainer,
                    sourceState;

                removeLoadingWidget(childContainer);

                // Check if the server raised an exception
                if (typeof data === 'object' && typeof data.success === 'boolean' && typeof data.message === 'string' && !data.success) {
                    showError(childContainer, data.message);
                    return false;
                }

                // Check if a valid result was received
                if (!validResponse(data, licenseType)) {
                    showError(childContainer, '<strong>Eek!</strong> An invalid result was returned from the server. Please contact support@formcorp.com.au');
                    return;
                }

                // Update the value of the verification
                var update = fc.getValue(data.fieldId);
                update.result = data.result;
                fc.setVirtualValue(data.fieldId, update);

                // Containers to act on
                licenseOptionContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-drivers-license');
                greenIDOptionsContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-greenid-drivers-license');

                // Check if the verification passed
                if (!passedValidation(fieldId, licenseType)) {
                    sourceState = getSourceState(fieldId, licenseType);
                    if (['LOCKED_OUT', 'FAILED'].indexOf(sourceState) > -1) {
                        // Slide the container up
                        greenIDOptionsContainer.slideUp();
                        licenseOptionContainer.addClass('fc-locked-out');
                        fcGreenID.setProgress(data.fieldId);
                        updateIsVerified(fieldId);

                    } else {
                        showError(childContainer, '<strong>Oops!</strong> We were unable to verify your licence. Please double-check your details and try re-submitting.');
                    }

                    return;
                }

                // Slide the container up
                greenIDOptionsContainer.slideUp();
                licenseOptionContainer.addClass('fc-verified');
                fcGreenID.setProgress(data.fieldId);

                // Call to update is verified
                updateIsVerified(fieldId);
            });
        },

        /**
         * Verify a NSW license plate
         * @param fieldId
         * @returns {*}
         */
        verifyNSWLicense = function (fieldId) {
            var requiredFields = {
                'licenseNumber': 'drivers-license',
                'cardNumber': 'card-number',
                'surname': 'surname'
            };

            verifyLicense('nswrego', fieldId, requiredFields);
        },

        /**
         * Verify an ACT issued license
         * @param fieldId
         */
        verifyACTLicense = function (fieldId) {
            var requiredFields = {
                'licenseNumber': 'drivers-license',
                'dateOfBirth': 'dob',
                'firstName': 'first-name',
                'surname': 'surname'
            };

            verifyLicense('actrego', fieldId, requiredFields);
        },

        /**
         * Verify a Queensland license.
         * @param fieldId
         */
        verifyQLDLicense = function (fieldId) {
            var requiredFields = {
                'licenseNumber': 'drivers-license',
                'dateOfBirth': 'dob',
                'firstName': 'first-name',
                'surname': 'surname'
            };

            verifyLicense('qldrego', fieldId, requiredFields);
        },

        /**
         * Verify a South Australian issued license
         * @param fieldId
         */
        verifySALicense = function (fieldId) {
            var requiredFields = {
                'licenseNumber': 'drivers-license',
                'dateOfBirth': 'dob',
                'surname': 'surname'
            };

            verifyLicense('sarego', fieldId, requiredFields);
        },

        /**
         * Verify a Victoria issued drivers license.
         * @param fieldId
         */
        verifyVicLicense = function (fieldId) {
            var requiredFields = {
                'licenseNumber': 'drivers-license',
                'dateOfBirth': 'dob',
                'surname': 'surname',
                'address1': 'vic_address_1',
                'address2': 'vic_address_2',
                'address3': 'vic_address_3'
            };

            var exemptFields = [
                'address2',
                'address3'
            ];

            verifyLicense('vicrego', fieldId, requiredFields, exemptFields);
        },

        /**
         * Verify a WA issued drivers license.
         * @param fieldId
         */
        verifyWALicense = function (fieldId) {
            var requiredFields = {
                'licenseNumber': 'drivers-license',
                'dateOfBirth': 'dob',
                'expiry': 'expiry'
            };

            verifyLicense('warego', fieldId, requiredFields);
        },

        /**
         * Verify a user's passport credentials
         * @param fieldId
         */
        verifyPassport = function (fieldId) {
            var schema = fc.fieldSchema[fieldId],
                fieldValue = fc.getValue(fieldId),
                childContainer,
                tos,
                values = {},
                value,
                input,
                key,
                postData = {},
                countryOfBirth,
                sourceState,
                requiredFields = {
                    'passportNumber': 'passport-number',
                    'givenName': 'given-name',
                    'familyName': 'family-name',
                    'dateOfBirth': 'dob',
                    'familyNameAtBirth': 'family-name-at-birth',
                    'placeOfBirth': 'place-of-birth'
                };

            // Ensure the field exists
            if (schema === undefined || typeof fieldValue !== 'object') {
                return;
            }

            // Fetch the container inside the DOM
            childContainer = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"] .fc-greenid-options');
            if (childContainer.length === 0) {
                return;
            }

            // Ensure required fields are found
            for (key in requiredFields) {
                if (requiredFields.hasOwnProperty(key)) {
                    input = childContainer.find('.' + requiredFields[key] + ' input');

                    // Ensure elements exist
                    if (input.length === 0) {
                        showError(childContainer, 'Required field \'' + key + '\' not found.');
                        return;
                    }

                    // Ensure elements have an appropriate value
                    value = input.val();
                    if (value === null || value.length === 0) {
                        showError(childContainer, 'Please ensure all form fields are correctly filled out.');
                        return;
                    }

                    values[key] = input.val();
                    postData[key] = value;
                }
            }

            // Set optional data
            postData.middleNames = childContainer.find('.middle-names input').val();

            // Select the country of birth
            countryOfBirth = childContainer.find('.country-birth select option:selected');
            if (countryOfBirth.length === 0 || countryOfBirth.val().length === 0) {
                showError(childContainer, 'Please ensure all form fields are correctly filled out.');
                return;
            }
            postData.countryOfBirth = countryOfBirth.val();

            // Select citizenship fields (when not Australia) and ensure values are set
            if (postData.countryOfBirth !== '1') {
                postData.firstNameAtCitizenship = childContainer.find('.first-name-at-citizenship input').val();
                postData.surnameAtCitizenship = childContainer.find('.surname-at-citizenship input').val();

                if (postData.firstNameAtCitizenship.length === 0 || postData.surnameAtCitizenship.length === 0) {
                    showError(childContainer, 'Please ensure all form fields are correctly filled out.');
                    return;
                }
            }

            // Ensure the user agrees to the terms and conditions
            tos = childContainer.find('.tos input:checked').length > 0;
            if (!tos) {
                showError(childContainer, 'You must read and agree to the terms and conditions prior to verification.');
                return false;
            }

            // If the user has got this far, remove all errors
            hideError(childContainer);

            // Append the necessary post data
            postData.verificationUserId = fieldValue.result.userId;
            postData.fieldId = fieldId;

            // Display loading widget to the user
            displayLoadingWidget(childContainer);

            // Send the request to the server to attempt to verify the license plate
            fc.api('greenid/gateway/verify-passport', postData, 'POST', function (data) {
                var optionContainer,
                    greenIDOptionsContainer;

                removeLoadingWidget(childContainer);

                // Check if the server raised an exception
                if (typeof data === 'object' && typeof data.success === 'boolean' && typeof data.message === 'string' && !data.success) {
                    showError(childContainer, data.message);
                    return false;
                }

                // Check if a valid result was received
                if (!validResponse(data, 'passport')) {
                    showError(childContainer, '<strong>Eek!</strong> An invalid result was returned from the server. Please contact support@formcorp.com.au');
                    return;
                }

                // Update the value of the verification
                var update = fc.getValue(data.fieldId);
                update.result = data.result;
                fc.setVirtualValue(data.fieldId, update);

                // Containers to act on
                optionContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-passport-verification');
                greenIDOptionsContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-greenid-options');

                // Check if the verification passed
                if (!passedValidation(fieldId, 'passport')) {
                    sourceState = getSourceState(fieldId, 'passport');
                    if (['LOCKED_OUT', 'FAILED'].indexOf(sourceState) > -1) {
                        // Slide the container up
                        greenIDOptionsContainer.slideUp();
                        optionContainer.addClass('fc-locked-out');
                        fcGreenID.setProgress(data.fieldId);
                        updateIsVerified(fieldId);

                    } else {
                        showError(childContainer, '<strong>Oops!</strong> We were unable to verify your passport. Please double-check your details and try re-submitting.');
                    }

                    return;
                }

                // Slide the container up
                greenIDOptionsContainer.slideUp();
                optionContainer.addClass('fc-verified');
                fcGreenID.setProgress(data.fieldId);

                // Call to update is verified
                updateIsVerified(fieldId);
            });
        },

        /**
         * Verify a user's visa credentials.
         * @param fieldId
         */
        verifyVisa = function (fieldId) {
            var schema = fc.fieldSchema[fieldId],
                fieldValue = fc.getValue(fieldId),
                childContainer,
                tos,
                values = {},
                value,
                input,
                key,
                postData = {},
                countryOfBirth,
                requiredFields = {
                    'visaNumber': 'visa-number',
                    'familyName': 'family-name',
                    'dateOfBirth': 'dob',
                    'country': 'country-passport',
                };

            // Ensure the field exists
            if (schema === undefined || typeof fieldValue !== 'object') {
                return;
            }

            // Fetch the container inside the DOM
            childContainer = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"] .fc-greenid-options');
            if (childContainer.length === 0) {
                return;
            }

            // Ensure required fields are found
            for (key in requiredFields) {
                if (requiredFields.hasOwnProperty(key)) {
                    input = childContainer.find('.' + requiredFields[key] + ' input');

                    // Attempt to find select value
                    if (input.length === 0) {
                        input = childContainer.find('.' + requiredFields[key] + ' select option:selected');
                        if (input.length === 0 || input.val().length === 0) {
                            showError(childContainer, 'Required field \'' + key + '\' not found.');
                            return;
                        }
                    }

                    // Ensure elements exist
                    if (input.length === 0) {
                        showError(childContainer, 'Required field \'' + key + '\' not found.');
                        return;
                    }

                    // Ensure elements have an appropriate value
                    value = input.val();
                    if (value === null || value.length === 0) {
                        showError(childContainer, 'Please ensure all form fields are correctly filled out.');
                        return;
                    }

                    values[key] = input.val();
                    postData[key] = value;
                }
            }

            // Ensure the user agrees to the terms and conditions
            tos = childContainer.find('.tos input:checked').length > 0;
            if (!tos) {
                showError(childContainer, 'You must read and agree to the terms and conditions prior to verification.');
                return false;
            }

            // If the user has got this far, remove all errors
            hideError(childContainer);

            // Append the necessary post data
            postData.verificationUserId = fieldValue.result.userId;
            postData.fieldId = fieldId;

            // Display loading widget to the user
            displayLoadingWidget(childContainer);

            // Send the request to the server to attempt to verify the licence plate
            fc.api('greenid/gateway/verify-visa', postData, 'POST', function (data) {
                var optionContainer,
                    greenIDOptionsContainer;

                removeLoadingWidget(childContainer);

                // Check if the server raised an exception
                if (typeof data === 'object' && typeof data.success === 'boolean' && typeof data.message === 'string' && !data.success) {
                    showError(childContainer, data.message);
                    return false;
                }

                // Check if a valid result was received
                if (!validResponse(data, 'visa')) {
                    showError(childContainer, '<strong>Eek!</strong> An invalid result was returned from the server. Please contact support@formcorp.com.au');
                    return;
                }

                // Update the value of the verification
                var update = fc.getValue(data.fieldId);
                update.result = data.result;
                fc.setVirtualValue(data.fieldId, update);

                // Check if the verification passed
                if (!passedValidation(fieldId, 'visa')) {
                    showError(childContainer, '<strong>Oops!</strong> We were unable to verify your visa. Please double-check your details and try re-submitting.');
                    return;
                }

                // Containers to act on
                optionContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-visa-verification');
                greenIDOptionsContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"] .fc-greenid-options');

                // Slide the container up
                greenIDOptionsContainer.slideUp();
                optionContainer.addClass('fc-verified');
                fcGreenID.setProgress(data.fieldId);

                // Call to update is verified
                updateIsVerified(fieldId);
            });
        },

        /**
         * Initialise the greenID DOM field
         * @param fieldId
         */
        initGreenIdDOMField = function (fieldId) {
            var schema = fc.fieldSchema[fieldId],
                value = fc.getValue(fieldId),
                percentage,
                init,
                error,
                rootId,
                prefix,
                fieldSelector = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"]'),
                initSelector,
                parts,
                values = $.extend({}, fc.fields),
                iteratorSchema,
                referenceId,
                greenIDValues = {},
                key,
                searchFieldId,
                userHash,
                container,
                requireInitialisation = false;

            // Ensure the greenID field exists within the DOM
            if (fieldSelector.length === 0) {
                return;
            }

            // If repeatable, need to fetch the values from the repeatable array
            parts = fieldId.split(fc.constants.prefixSeparator);
            if (parts.length >= 2) {
                iteratorSchema = fc.fieldSchema[parts[0]];
                if (iteratorSchema !== undefined) {
                    referenceId = fc.getConfig(iteratorSchema, 'sourceField', '');
                    if (referenceId.length > 0 && fc.getValue(referenceId) !== undefined && typeof fc.getValue(referenceId)[parts[1]] === 'object') {
                        $.extend(values, fc.getValue(referenceId)[parts[1]]);
                    }
                }
            }

            // Need to create a dictionary of values to send to greenID
            if (schema !== undefined) {
                for (key in fc.greenID.configKeys) {
                    if (fc.greenID.configKeys.hasOwnProperty(key)) {
                        searchFieldId = fc.getConfig(schema, fc.greenID.configKeys[key], '');
                        if (searchFieldId.length > 0 && values[searchFieldId] !== undefined && typeof values[searchFieldId] !== 'object') {
                            greenIDValues[key] = values[searchFieldId];
                        }
                    }
                }
            }

            // Call to initialise the greenID component. Sometimes the initial verification check will
            // automatically be triggered, and the greenID field will have already been initialised.
            // In this case, the init() function can be triggered, however otherwise it will need to be
            // initialised here first prior to setting the progress etc.
            init = function () {
                // If schema or value not initialised, do nothing
                //if (schema === undefined || value === undefined) {
                if (schema === undefined) {
                    return;
                }

                var sourcesRequired,
                    sourcesRequiredContainer,
                    hashString;

                // If value.values is not defined, being initialised for the first time, need to set it
                // If value.values is defined, previously initiasied, and need to calculate the hash

                if (typeof hashMap[fieldId] !== 'undefined') {
                  // Previously set in the hash map, otherwise need to calculate
                  hashString = hashMap[fieldId];
                } else {
                  hashString = hash(JSON.stringify(fc.greenID.userHash(value.values)));
                }

                if (typeof hashedValues[hashString] === 'object' && hashedValues[hashString].length > 1 && hashedMaster[hashString] !== fieldId) {
                  // Already initialised for this user, need to update
                  // Mark the value as a duplicate
                  var existingValue = fc.getValue(fieldId);
                  existingValue.result.outcome = "DUPLICATE";
                  fc.setVirtualValue(fieldId, existingValue);

                  fieldSelector.addClass('fc-already-initialised-verification');
                  return;
                }

                if (typeof hashedMaster[hashString] === 'undefined') {
                    hashedMaster[hashString] = fieldId;
                }

                // Update the container html
                fc.greenID.updateSummary(fieldId);

                // Set the progress bar percentage
                percentage = fc.greenID.getPercentage(fieldId);
                fc.greenID.setProgress(fieldId, percentage, true);

                // Update the amount of sources required
                sourcesRequiredContainer = $(fc.jQueryContainer).find('.fc-green-id-sources-required[data-for="' + fieldId + '"]');
                if (sourcesRequiredContainer.length > 0) {
                    sourcesRequired = percentage >= 50 ? '<strong>one</strong> source' : '<strong>two</strong> sources';
                    sourcesRequiredContainer.find('span').html(sourcesRequired);
                }
            };

            // When greenID can't be initialised properly, need to output this information to the user.
            // In this event, they should be able to try and re-initialise the verification, otherwise they'll
            // have to skip and complete manual verification.
            error = function () {
                // Update the container html
                fc.greenID.updateSummary(fieldId);
            };

            // When the user changes details about themselves, this effectively invalidates a previous greenID
            // verification attempt. The reason for this, is they can use one user to pass verification, and then
            // go back to try and fool the system in to thinking a different user verified.
            if (value !== undefined && value.values !== undefined && typeof value.values === typeof greenIDValues) {
                userHash = fc.greenID.userHash(value.values);
                var hashString = hash(JSON.stringify(userHash));

                if ('undefined' === typeof hashedValues[hashString]) {
                  hashedValues[hashString] = [];
                }

                if (hashedValues[hashString].indexOf(fieldId) < 0) {
                  hashedValues[hashString].push(fieldId);
                }

                if (typeof hashedMaster[hashString] === 'undefined') {
                    hashedMaster[hashString] = fieldId;
                }

                if (userHash !== fc.greenID.userHash(greenIDValues)) {
                    requireInitialisation = true;

                    // Update the DOM to show the initialising screen
                    fieldSelector.find('.fc-green-id-el').remove();
                    fieldSelector.find('.fc-fieldgroup').prepend('<div class="fc-init-green-id"></div>');
                }
            }

            if (!requireInitialisation) {
                // If initialisation is unknown, look for an indicator in the DOM
                initSelector = fieldSelector.find('.fc-init-green-id');

                // If not initialising, render the greenID.
                if (initSelector.length === 0) {
                    init();
                    return;
                }
            }

            // Display the loading widget
            if (fieldId !== undefined && typeof fieldId === 'string' && fieldId.length > 0) {
                container = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"]');
                if (container.length > 0) {
                    displayLoadingWidget(container);
                }
            }

            // Append the field id
            greenIDValues.fieldId = fieldId;

            // Determine the prefix to use
            prefix = fieldId.replace(fc.getId(fc.fieldSchema[fieldId]), '');

            // Shoot off the greenID initialisation request to the server
            fc.greenID.initialiseGreenIDVerification(fieldId, greenIDValues, function (dataId, data) {
                var html, fieldSelector;

                // When a valid result is returned by the server, output accordingly
                if (typeof data === 'object') {
                    if (data.result !== undefined && typeof data.result === 'object') {
                        html = fc.renderGreenIdField(fc.fieldSchema[fieldId], prefix, true);
                        fieldSelector = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"]');
                        if (fieldSelector.length > 0) {
                            fieldSelector.find('.fc-init-green-id').remove();
                            fieldSelector.find('.fc-green-id-el').remove();
                            fieldSelector.find('.fc-fieldgroup').prepend(html);
                            init();

                            // Mark as not initialised
                            fieldSelector.addClass('fc-not-verified');
                        }
                    } else if (typeof data.success === 'boolean' && !data.success) {
                        // There was an error when initialising, need to output to the user
                        fieldSelector = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"]');
                        html = '<div class="fc-green"';
                        if (fieldSelector.length > 0) {
                            fieldSelector.find('.fc-init-green-id').remove();
                            fieldSelector.find('.fc-green-id-el').remove();
                            showError(fieldSelector.find('.fc-fieldgroup'), 'Unfortunately, we are unable to electronically verify you with the details provided. Please confirm your details or attempt a different verification method.');

                            // Mark as not initialised
                            fieldSelector.addClass('fc-not-verified');
                        }
                    }
                }

                // Hide the loading widget (as all initialisation done at this point)
                removeLoadingWidget(container);
            }, function () {
                // greenID failed to initialise for the selected field.
                var html, fieldSelector;

                // Register the HTML allowing the user to re-initialise
                html = fc.renderGreenIdField(fc.fieldSchema[fieldId], prefix, true);
                html += '<div class="fc-green-failed-initialisation">';
                html += '<div class="alert alert-danger" role="alert">Unfortunately greenID verification failed to initialise.</div>';
                html += '<h5>What now?</h5>';
                html += '<p>You can try to re-initialise greenID using the below button. If that still fails, you can skip verification using the options above, but you will have to manually attach verification documents to your application.</p>';
                html += '<div class="fc-greenid-reinit"><input type="submit" value="Re-initialise" data-for="' + fieldId + '" class="fc-btn"></div>';
                html += '<div class="fc-green-id-skip-container"><input type="submit" value="Skip verification" data-for="' + fieldId + '" class="fc-btn fc-skip-green-id"></div>';
                html += '<div class="fc-clear"></div>';
                html += '</div>';

                fieldSelector = $(fc.jQueryContainer).find('.fc-field[fc-data-group="' + fieldId + '"]');
                if (fieldSelector.length > 0) {
                    fieldSelector.find('.fc-init-green-id').remove();
                    fieldSelector.find('.fc-green-id-el').remove();
                    fieldSelector.find('.fc-fieldgroup').prepend(html);
                    error();

                    // Mark as not initialised
                    fieldSelector.addClass('fc-not-verified');
                }
                error();

                // Hide the loading widget (as all initialisation done at this point)
                removeLoadingWidget(container);
            });

        },

        /**
         * Skip verification for a given field
         * @param dataId
         */
        skipVerification = function (dataId) {
            var value,
                schema,
                optionsContainer,
                failedContainer,
                container;

            if (confirm('Are you sure you want to skip digital verification for this user?')) {
                if (dataId !== undefined && typeof dataId === 'string') {
                    container = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + dataId + '"]');
                    value = fc.getValue(dataId);
                    schema = fc.fieldSchema[dataId];

                    // Only continue if the container exists within the DOM
                    if (container.length > 0) {
                        // If a valid value is found, set the outcome to skipped
                        if (typeof value === 'object' && typeof value.result === 'object') {
                            value.result.outcome = 'SKIPPED';
                            fc.setVirtualValue(dataId, value);
                            updateIsVerified(dataId);
                        }

                        // Hide the failed container
                        failedContainer = container.find('.fc-green-failed-initialisation');
                        if (failedContainer.length > 0) {
                            failedContainer.remove();
                        }

                        // Delete the options container
                        optionsContainer = container.find('.fc-greenid-options');
                        if (optionsContainer.length > 0) {
                            optionsContainer.remove();
                        }
                    }
                }
            }
        },

        /**
         * Register the Green ID event listeners
         */
        registerGreenIDEventListeners = function () {
            // Open a TOS link in a new window
            $(fc.jQueryContainer).on('click', '.fc-field-greenIdVerification .tos a', function () {
                var href = $(this).attr('href'), win;
                if (typeof href === 'string' && href.length > 0) {
                    win = window.open(href, '_blank');
                    win.focus();
                }

                return false;
            });

            // Skip verification
            $(fc.jQueryContainer).on('click', '.fc-skip-green-id', function () {
                var dataId = $(this).attr('data-for');
                skipVerification(dataId);

                return false;
            });

            // Re-initialise greenID
            $(fc.jQueryContainer).on('click', '.fc-greenid-reinit input[type=submit]', function () {
                var dataId = $(this).attr('data-for'),
                    container;

                // If data ID passed through, attempt to re-initialise
                if (dataId !== undefined && typeof dataId === 'string' && dataId.length > 0) {
                    container = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + dataId + '"] .fc-fieldgroup');
                    if (container.length > 0) {
                        container.html(fc.initGreenIdFieldInDOM(dataId));
                        fcGreenID.initGreenIdDOMField(dataId);
                    }
                }

                return false;
            });

            fc.domContainer.on(fc.jsEvents.onFieldSuccess, function () {
                var greenIdFields = getGreenIdFields(),
                    key,
                    values,
                    greenIDIterator,
                    fieldId,
                    field,
                    iterator,
                    validForm = true;

                // If no greenID fields, return and do nothing
                if (typeof greenIdFields !== 'object' || greenIdFields.length === 0) {
                    return;
                }

                // Iterate through each greenID field
                for (greenIDIterator = 0; greenIDIterator < greenIdFields.length; greenIDIterator += 1) {
                    field = greenIdFields[greenIDIterator];

                    // Reset default values on each field iteration
                    values = {};
                    validForm = true;

                    // Fetch all of the appropriate values
                    for (key in configKeys) {
                        if (configKeys.hasOwnProperty(key)) {
                            fieldId = fc.getConfig(field, configKeys[key], '');
                            if (fieldId.length >= 24) {
                                // Needs to be a valid mongo id
                                values[key] = getValue(fieldId);
                            } else {
                                values[key] = "";
                            }
                        }
                    }

                    var hashString = hash(JSON.stringify(values));

                    // If previously initialised, do nothing (@todo: look in to doing something?)
                    /*
                    fieldId = fc.getId(field);
                    if (typeof fc.fields[fieldId] === 'object') {
                        if (typeof fc.fields[fieldId].result === 'object') {
                          // If a valid result was found, return
                          return;
                        }

                        if (typeof fc.fields[fieldId].success === 'boolean' && !fc.fields[fieldId].success) {
                            return;
                        }
                    }
                    */

                    // If it was marked invalid, return

                    // Add the greenID field id
                    values.fieldId = fc.getId(field);

                    // Iterate through and attempt to invalidate a field
                    for (iterator = 0; iterator < requiredFields.length; iterator += 1) {
                        fieldId = requiredFields[iterator];

                        // If a required field isn't set, return false
                        if (values[fieldId] === undefined || values[fieldId].length === 0) {
                            validForm = false;
                            break;
                        }
                    }

                    // If the form is valid, attempt to initialise greenID verification
                    if (validForm && (typeof alreadyInitialised[hashString] !== 'boolean' || !alreadyInitialised[hashString])) {
                        alreadyInitialised[hashString] = true;
                        initialiseGreenIDVerification(fieldId, values);
                    }
                }
            });

            // Attempt to verify a user's details
            $(fc.jQueryContainer).on('click', '.green-id-verify .fc-btn', function () {
                // If no current state, do nothing.
                if (typeof fcGreenID.currentState === undefined) {
                    return false;
                }

                var fieldId = $(this).attr('data-for');

                // Make sure the field exists
                if (typeof fieldId !== 'string' || fc.fieldSchema[fieldId] === undefined) {
                    return false;
                }

                // What action to complete
                if (fcGreenID.currentState !== undefined) {
                    switch (fcGreenID.currentState) {
                        // NSW drivers license verification
                        case 'stateNSW':
                            verifyNSWLicense(fieldId);
                            break;
                        case 'stateACT':
                            verifyACTLicense(fieldId);
                            break;
                        case 'stateQLD':
                            verifyQLDLicense(fieldId);
                            break;
                        case 'stateSA':
                            verifySALicense(fieldId);
                            break;
                        case 'stateVIC':
                            verifyVicLicense(fieldId);
                            break;
                        case 'stateWA':
                            verifyWALicense(fieldId);
                            break;
                        case 'verifyPassport':
                            verifyPassport(fieldId);
                            break;
                        case 'verifyVisa':
                            verifyVisa(fieldId);
                            break;
                        default:
                            console.log('Unknown current greenID state: ' + fcGreenID.currentState);
                            break;
                    }
                }

                return false;
            });
        };


    /**
     * Return class methods
     */
    return {

        /**
         * Initialise the analytics
         */
        init: function () {
            this.values = {};
            this.initialised = {};

            registerGreenIDEventListeners();
        },

        /**
         * Retrieves the percentage of completion for a greenID verification instance.
         * @param fieldId
         * @returns int
         */
        getPercentage: function (fieldId) {
            var schema = fc.fieldSchema[fieldId],
                value = fc.getValue(fieldId),
                sources = {
                    low: ['aec', 'waec', 'AECDatabaseBean', 'asic', 'AsicPersonNameUCBean'],
                    high: ['actrego', 'medibank', 'nswrego', 'passport', 'qldrego', 'sarego', 'vicrego', 'visa', 'warego'],
                },
                source,
                iterator,
                key,
                percentage = 0;

            // If not initialised,
            if (schema === undefined || value === undefined || !validBaseObject(value)) {
                return 0;
            }

            // If already verified, mark as 100%
            if (typeof value.result.outcome === 'string' && ['VERIFIED', 'PENDING', 'VERIFIED_WITH_CHANGES'].indexOf(value.result.outcome) > -1) {
                return 100;
            }

            // If no sources defined, do nothing
            if (typeof value.result !== 'object' || value.result.sources === undefined) {
                return 0;
            }

            // If one source left, mark as 60%
            if (typeof value.result.sources === 'object') {
                for (iterator = 0; iterator < sources.length; iterator += 1) {
                    source = sources[iterator];
                    if (typeof value.result.sources[source] === 'object' && value.result.sources[source].oneSourceLeft !== undefined) {
                        // If one source is not left, break the for loop (only need to check a single field, not all)
                        if ([true, 'true'].indexOf(value.result.sources[source].oneSourceLeft) > -1) {
                            return 60;
                        } else {
                            break;
                        }
                    }
                }
            }

            // Increment the sources accordingly (for low)
            for (iterator = 0; iterator < sources.low.length; iterator += 1) {
                source = sources.low[iterator];
                if (typeof value.result.sources[source] === 'object' && [true, 'true'].indexOf(value.result.sources[source].passed) > -1) {
                    percentage += 50;
                }
            }

            // Increment the sources accordingly (for high)
            for (iterator = 0; iterator < sources.high.length; iterator += 1) {
                source = sources.high[iterator];
                if (typeof value.result.sources[source] === 'object' && [true, 'true'].indexOf(value.result.sources[source].passed) > -1) {
                    percentage += 50;
                }
            }

            // If percentage > 100, bring it back
            if (percentage > 90) {
                percentage = 90;
            }

            // If nothing has passed, return 5% - hey, they've initialised the field, worth something, no? :)
            return percentage;
        },

        /**
         * Returns true if a field has successfully verified with greenID
         * @param fieldId
         * @returns true
         */
        isVerified: function (fieldId) {
            return this.getPercentage(fieldId) >= 100;
        },

        /**
         * Checks to see if the user has been locked out of verifying.
         * @param fieldId
         * @returns {boolean}
         */
        isLockedOut: function (fieldId) {
            var value = fc.getValue(fieldId);

            return value !== undefined && value.result !== undefined && value.result.outcome === 'LOCKED_OUT';
        },

        /**
         * Gets the amount of available sources left.
         * @param fieldId
         * @returns {*}
         */
        amountOfAvailableSources: function (fieldId) {
            var value = fc.getValue(fieldId),
                groups = {
                    'licence': ['actrego', 'nswrego', 'qldrego', 'sarego', 'vicrego', 'warego'],
                    'passport': ['passport']
                },
                key,
                iterator;

            if (value === undefined || typeof value.result !== 'object') {
                return -1;
            }

            for (key in groups) {
                // Iterate through each group
                if (groups.hasOwnProperty(key) && typeof groups[key] === 'object' && groups[key].length > 0) {
                    for (iterator = 0; iterator < groups[key].length; iterator += 1) {
                        // Iterate through each source
                        if (['LOCKED_OUT', 'FAILED'].indexOf(getSourceState(fieldId, groups[key][iterator])) > -1) {
                            delete groups[key];
                            break;
                        } else if (passedValidation(fieldId, groups[key][iterator])) {
                            delete groups[key];
                            break;
                        }
                    }
                }
            }

            return Object.keys(groups).length;
        },

        /**
         * Calculates the amount of sources required to pass verification
         * @param fieldId
         * @returns {boolean}
         */
        sourcesRequired: function (fieldId) {
            var percentage = this.getPercentage(fieldId);

            switch (true) {
                case percentage <= 33:
                    return 2;
                case percentage <= 50:
                case percentage <= 67:
                    return 1;
                case percentage > 67:
                    return 0;
            }
        },

        /**
         * Checks to see if a user has skipped verification
         * @param fieldId
         * @return boolean
         */
        hasSkipped: function (fieldId) {
            var value = fc.getValue(fieldId);

            return typeof value === 'object' && typeof value.result === 'object' && value.result.outcome === 'SKIPPED';
        },

        /**
         * Check to see if the verification has failed.
         * @param fieldId
         * @return boolean
         */
        hasFailed: function (fieldId) {
            // If amount of sources left is less than the sources needed to verify, has failed
            if (fcGreenID.amountOfAvailableSources(fieldId) < fcGreenID.sourcesRequired(fieldId)) {
                return true;
            }

            return (!this.isVerified(fieldId) && this.getPercentage(fieldId) >= 80) || this.isLockedOut(fieldId) || this.amountOfAvailableSources(fieldId) === 0;
        },

        /**
         * Checks to see if a field is allowed to pass validation.
         * @param fieldId
         * @return boolean
         */
        passesValidation: function (fieldId) {
            return this.isVerified(fieldId) || this.hasFailed(fieldId) || this.hasSkipped(fieldId) || this.amountOfAvailableSources(fieldId) === 0;
        },

        /**
         * Config keys
         */
        configKeys: configKeys,

        /**
         * Initialise greenID verification
         */
        initialiseGreenIDVerification: initialiseGreenIDVerification,

        /**
         * Expose the update summary function
         * @return function
         */
        updateSummary: updateSummary,

        /**
         * Set the progress bar DOM width
         * @param fieldId
         * @param percentage
         * @param updateVerified
         */
        setProgress: function (fieldId, percentage, updateVerified) {
            var fieldContainer = $(fc.jQueryContainer).find('.fc-field-greenIdVerification[fc-data-group="' + fieldId + '"]'),
                progressContainer;

            // Default updateVerified
            if (typeof updateVerified !== 'boolean') {
                updateVerified = false;
            }

            // If no percentage specified, fetch for the field
            if (percentage === undefined) {
                percentage = this.getPercentage(fieldId);
            }

            // If want to update the DOM with the verification status, do it now.
            if (updateVerified === true) {
                updateIsVerified(fieldId);
            }

            // If unable to retrieve the field from within the DOM, do nothing
            if (fieldContainer.length === 0) {
                return;
            }

            // Attempt to fetch the progress bar DOM container element
            progressContainer = fieldContainer.find('.fc-greenid-progress');
            if (progressContainer.length === 0) {
                return;
            }

            progressContainer.find('.progress-bar').animate({
                width: percentage + '%'
            }, 500).html(percentage + '%');
        },

        /**
         * Initialise a greenID field
         * @param fieldId
         */
        initGreenIdDOMField: initGreenIdDOMField,

        /**
         * Initialise the greenID component
         */
        initGreenId: initGreenId,

        /**
         * Return element from an array
         * @param obj
         * @param key
         * @param defaultValue
         * @returns {*}
         */
        getElementFromObj: function (obj, key, defaultValue) {
            if (typeof defaultValue !== 'string') {
                defaultValue = '';
            }

            return obj.hasOwnProperty(key) ? obj[key] : defaultValue;
        },

        /**
         * Calculate a user hash string from an object of key=>value vars
         * @param details
         * @returns {*}
         */
        userHash: function (details) {
            if (typeof details !== 'object') {
                return false;
            }

            return [
                this.getElementFromObj(details, 'firstName'),
                this.getElementFromObj(details, 'surname'),
                this.getElementFromObj(details, 'dob'),
                this.getElementFromObj(details, 'address'),
                this.getElementFromObj(details, 'suburb'),
                this.getElementFromObj(details, 'state'),
                this.getElementFromObj(details, 'postcode'),
                this.getElementFromObj(details, 'country')
            ].join(',');
        },

        /**
         * Methods to expose to parent class
         */
        skipVerification: skipVerification
    };

}(jQuery));

(function ($) {
    'use strict';
    $(fc.jQueryContainer).trigger(fc.jsEvents.onGreenIdLoaded);

    console.log('greenID loaded');
}(jQuery));
