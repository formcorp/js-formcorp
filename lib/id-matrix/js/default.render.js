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
     * List of country codes to be embedded through the form.
     * @return {obj}
     */
    this.countryCodes = {
      AUS: 'Australia',
      CAN: 'Canada',
      CHN: 'China',
      IND: 'India',
      NZL: 'New Zealand',
      PAK: 'Pakistan',
      PHL: 'Philippines',
      LKA: 'Sri Lanka',
      GBR: 'United Kingdom',
      USA: 'United States',
      VNM: 'Vietnam',
      AFG: 'Afghanistan',
      ALA: 'Aland Islands',
      ALB: 'Albania',
      DZA: 'Algeria',
      ASM: 'American Samoa',
      AND: 'Andorra',
      AGO: 'Angola',
      AIA: 'Anguilla',
      ATA: 'Antarctica',
      ATG: 'Antigua and Barbuda',
      ARG: 'Argentina',
      ARM: 'Armenia',
      ABW: 'Aruba',
      AUS1: 'Australia',
      AUT: 'Austria',
      AZE: 'Azerbaijan',
      BHS: 'Bahamas',
      BHR: 'Bahrain',
      BGD: 'Bangladesh',
      BRB: 'Barbados',
      BLR: 'Belarus',
      BEL: 'Belgium',
      BLZ: 'Belize',
      BEN: 'Benin',
      BMU: 'Bermuda',
      BTN: 'Bhutan',
      BOL: 'Bolivia, Plurinational State of',
      BIH: 'Bosnia and Herzegovina',
      BWA: 'Botswana',
      BVT: 'Bouvet Island',
      BRA: 'Brazil',
      IOT: 'British Indian Ocean Territory',
      BRN: 'Brunei Darussalam',
      BGR: 'Bulgaria',
      BFA: 'Burkina Faso',
      BDI: 'Burundi',
      KHM: 'Cambodia',
      CMR: 'Cameroon',
      CAN1: 'Canada',
      CPV: 'Cape Verde',
      CYM: 'Cayman Islands',
      CAF: 'Central African Republic',
      TCD: 'Chad',
      CHL: 'Chile',
      CHN1: 'China',
      CXR: 'Christmas Island',
      CCK: 'Cocos (Keeling) Islands',
      COL: 'Colombia',
      COM: 'Comoros',
      COG: 'Congo',
      COD: 'Congo, the Democratic Republic of the',
      COK: 'Cook Islands',
      CRI: 'Costa Rica',
      CIV: 'Cote d\'Ivoire',
      HRV: 'Croatia',
      CUB: 'Cuba',
      CYP: 'Cyprus',
      CZE: 'Czech Republic',
      DNK: 'Denmark',
      DJI: 'Djibouti',
      DMA: 'Dominica',
      DOM: 'Dominican Republic',
      ECU: 'Ecuador',
      EGY: 'Egypt',
      SLV: 'El Salvador',
      GNQ: 'Equatorial Guinea',
      ERI: 'Eritrea',
      EST: 'Estonia',
      ETH: 'Ethiopia',
      FLK: 'Falkland Islands (Malvinas)',
      FRO: 'Faroe Islands',
      FJI: 'Fiji',
      FIN: 'Finland',
      FRA: 'France',
      GUF: 'French Guiana',
      PYF: 'French Polynesia',
      ATF: 'French Southern Territories',
      GAB: 'Gabon',
      GMB: 'Gambia',
      GEO: 'Georgia',
      DEU: 'Germany',
      GHA: 'Ghana',
      GIB: 'Gibraltar',
      GRC: 'Greece',
      GRL: 'Greenland',
      GRD: 'Grenada',
      GLP: 'Guadeloupe',
      GUM: 'Guam',
      GTM: 'Guatemala',
      GGY: 'Guernsey',
      GIN: 'Guinea',
      GNB: 'Guinea-Bissau',
      GUY: 'Guyana',
      HTI: 'Haiti',
      HMD: 'Heard Island and McDonald Islands',
      VAT: 'Holy See (Vatican City State)',
      HND: 'Honduras',
      HKG: 'Hong Kong',
      HUN: 'Hungary',
      ISL: 'Iceland',
      IND1: 'India',
      IDN: 'Indonesia',
      IRN: 'Iran, Islamic Republic of',
      IRQ: 'Iraq',
      IRL: 'Ireland',
      IMN: 'Isle of Man',
      ISR: 'Israel',
      ITA: 'Italy',
      JAM: 'Jamaica',
      JPN: 'Japan',
      JEY: 'Jersey',
      JOR: 'Jordan',
      KAZ: 'Kazakhstan',
      KEN: 'Kenya',
      KIR: 'Kiribati',
      PRK: 'Korea, Democratic People\'s Republic of',
      KOR: 'Korea, Republic of',
      KWT: 'Kuwait',
      KGZ: 'Kyrgyzstan',
      LAO: 'Lao People\'s Democratic Republic',
      LVA: 'Latvia',
      LBN: 'Lebanon',
      LSO: 'Lesotho',
      LBR: 'Liberia',
      LBY: 'Libyan Arab Jamahiriya',
      LIE: 'Liechtenstein',
      LTU: 'Lithuania',
      LUX: 'Luxembourg',
      MAC: 'Macao',
      MKD: 'Macedonia, the former Yugoslav Republic of',
      MDG: 'Madagascar',
      MWI: 'Malawi',
      MYS: 'Malaysia',
      MDV: 'Maldives',
      MLI: 'Mali',
      MLT: 'Malta',
      MHL: 'Marshall Islands',
      MTQ: 'Martinique',
      MRT: 'Mauritania',
      MUS: 'Mauritius',
      MYT: 'Mayotte',
      MEX: 'Mexico',
      FSM: 'Micronesia, Federated States of',
      MDA: 'Moldova, Republic of',
      MCO: 'Monaco',
      MNG: 'Mongolia',
      MNE: 'Montenegro',
      MSR: 'Montserrat',
      MAR: 'Morocco',
      MOZ: 'Mozambique',
      MMR: 'Myanmar',
      NAM: 'Namibia',
      NRU: 'Nauru',
      NPL: 'Nepal',
      NLD: 'Netherlands',
      ANT: 'Netherlands Antilles',
      NCL: 'New Caledonia',
      NZL1: 'New Zealand',
      NIC: 'Nicaragua',
      NER: 'Niger',
      NGA: 'Nigeria',
      NIU: 'Niue',
      NFK: 'Norfolk Island',
      MNP: 'Northern Mariana Islands',
      NOR: 'Norway',
      OMN: 'Oman',
      PAK1: 'Pakistan',
      PLW: 'Palau',
      PSE: 'Palestinian Territory, Occupied',
      PAN: 'Panama',
      PNG: 'Papua New Guinea',
      PRY: 'Paraguay',
      PER: 'Peru',
      PHL1: 'Philippines',
      PCN: 'Pitcairn',
      POL: 'Poland',
      PRT: 'Portugal',
      PRI: 'Puerto Rico',
      QAT: 'Qatar',
      ROU: 'Romania',
      REU: 'Reunion',
      RUS: 'Russian Federation',
      RWA: 'Rwanda',
      BLM: 'Saint Barthelemy',
      SHN: 'Saint Helena',
      KNA: 'Saint Kitts and Nevis',
      LCA: 'Saint Lucia',
      MAF: 'Saint Martin (French part)',
      SPM: 'Saint Pierre and Miquelon',
      VCT: 'Saint Vincent and the Grenadines',
      WSM: 'Samoa',
      SMR: 'San Marino',
      STP: 'Sao Tome and Principe',
      SAU: 'Saudi Arabia',
      SEN: 'Senegal',
      SRB: 'Serbia',
      SYC: 'Seychelles',
      SLE: 'Sierra Leone',
      SGP: 'Singapore',
      SVK: 'Slovakia',
      SVN: 'Slovenia',
      SLB: 'Solomon Islands',
      SOM: 'Somalia',
      ZAF: 'South Africa',
      SGS: 'South Georgia and the South Sandwich Islan',
      ESP: 'Spain',
      LKA1: 'Sri Lanka',
      SDN: 'Sudan',
      SUR: 'Suriname',
      SJM: 'Svalbardand Jan Mayen',
      SWZ: 'Swaziland',
      SWE: 'Sweden',
      CHE: 'Switzerland',
      SYR: 'Syrian Arab Republic',
      TWN: 'Taiwan, Province of China',
      TJK: 'Tajikistan',
      TZA: 'Tanzania, United Republic of',
      THA: 'Thailand',
      TLS: 'Timor-Leste',
      TGO: 'Togo',
      TKL: 'Tokelau',
      TON: 'Tonga',
      TTO: 'Trinidad and Tobago',
      TUN: 'Tunisia',
      TUR: 'Turkey',
      TKM: 'Turkmenistan',
      TCA: 'Turks and Caicos Islands',
      TUV: 'Tuvalu',
      UGA: 'Uganda',
      UKR: 'Ukraine',
      ARE: 'United Arab Emirates',
      GBR1: 'United Kingdom',
      USA1: 'United States',
      UMI: 'United States Minor Outlying Islands',
      URY: 'Uruguay',
      UZB: 'Uzbekistan',
      VUT: 'Vanuatu',
      VEN: 'Venezuela, Bolivarian Republic of',
      VNM1: 'Vietnam',
      VGB: 'Virgin Islands, British',
      VIR: 'Virgin Islands, U.S.',
      WLF: 'Wallis and Futuna',
      ESH: 'Western Sahara',
      YEM: 'Yemen',
      ZMB: 'Zambia',
      ZWE: 'Zimbabwe'
    };

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
          '<div class="verification-source" data-source="driversLicense">' +
          ' <h4>Australian driver licence</h4>' +
          ' <div class="options">' +
          '   <div class="row">' +
          '     <div class="option col-md-50">' +
          '       <div>' +
          '         <h5>Licence number</h5>' +
          '         <input type="text" name="number" class="fc-fieldinput" maxlength="20" data-validator="license" data-required>' +
          '       </div>' +
          '     </div>' +
          '     <div class="option col-md-50">' +
          '       <div>' +
          '         <h5>Issuing state</h5>' +
          '         <select name="state-code" class="fc-fieldinput" data-required>' +
          '           <option value=""></option>' +
          '           {% for key,value in states %}' +
          '             <option value="{{ key}}">{{ value }}</option>' +
          '           {% endfor %}' +
          '         </select>' +
          '       </div>' +
          '     </div>' +
          '   </div>' +
          ' </div>' +
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
        var cardColours = {
          'G': 'Green',
          'Y': 'Yellow',
          'B': 'Blue'
        };

        var template = '' +
          '<div class="verification-source" data-source="medicare">' +
          ' <h4>Medicare card</h4>' +
          ' <div class="options">' +
          '   <div class="row">' +
          '     <div class="option col-md-50">' +
          '       <div>' +
          '         <h5>Card number</h5>' +
          '         <input type="text" name="card-number" data-validator="medicareCard" maxlength="20" class="fc-fieldinput" data-required>' +
          '       </div>' +
          '     </div>' +
          '     <div class="option col-md-50">' +
          '       <div>' +
          '         <h5>Reference number</h5>' +
          '         <input type="text" name="reference-number" data-validator="medicareReference" maxlength="1" class="fc-fieldinput" data-required>' +
          '       </div>' +
          '     </div>' +
          '   </div>' +
          '   <div class="row">' +
          '     <div class="option col-md-33">' +
          '       <div>' +
          '         <h5>Date of expiry</h5>' +
          '         <input type="text" name="date-of-expiry" class="fc-fieldinput" maxlength="10" placeholder="DD/MM/YYYY" data-required>' +
          '       </div>' +
          '     </div>' +
          '     <div class="option col-md-33">' +
          '       <div>' +
          '         <h5>Middle name on card</h5>' +
          '         <input type="text" name="middle-name-on-card" maxlength="100" class="fc-fieldinput">' +
          '       </div>' +
          '     </div>' +
          '     <div class="option col-md-33">' +
          '       <div>' +
          '         <h5>Card colour</h5>' +
          '         <select name="card-colour" class="fc-fieldinput" data-required>' +
          '           <option value="">' +
          '           {% for key,value in cardColours %}' +
          '             <option value="{{ key }}">{{ value }}</option>' +
          '           {% endfor %}' +
          '         </select>' +
          '       </div>' +
          '     </div>' +
          '   </div>' +
          ' </div>' +
          '</div>';

        return twig({data: template}).render({
          cardColours: cardColours
        });
      },

      /**
       * Return the passport form
       * @return {string}
       */
      passport: function () {
        var template = '' +
          '<div class="verification-source" data-source="passport">' +
          ' <h4>Passport</h4>' +
          ' <div class="options">' +
          '   <div class="row">' +
          '     <div class="option col-md-50">' +
          '       <div>' +
          '         <h5>Passport number</h5>' +
          '         <input type="text" name="number" class="fc-fieldinput" data-validator="passport" maxlength="20" data-required>' +
          '       </div>' +
          '     </div>' +
          '     <div class="option col-md-50">' +
          '       <div>' +
          '         <h5>Issuing country</h5>' +
          '         <select name="country-code" class="fc-fieldinput" data-required>' +
          '           <option value=""></option>' +
          '           {% for key,value in countryCodes %}' +
          '             <option value="{{ key }}">{{ value }}</option>' +
          '           {% endfor %}' +
          '         </select>' +
          '       </div>' +
          '     </div>' +
          '   </div>' +
          ' </div>' +
          '</div>';

        return twig({data: template}).render({
          countryCodes: _self.countryCodes
        });
      },

      /**
       * Return the previous addresses form
       * @return {string}
       * @todo: refactor (tyro specific id hardcoded)
       */
      previousAddresses: function () {
        var template = '' +
          '<div class="verification-source" data-source="previousAddresses">' +
          ' <h4>Previous address</h4>' +
          ' <div class="options">' +
          '   <div class="row fc-field" data-container="5829342746fde278188b4ee2">' +
          '     <div class="option fc-fieldgroup">' +
          '       <div class="fc-field-apiLookup">' +
          '         <h5>Previous address</h5>' +
          '         <input type="text" data-update="true" name="previous-address" data-config="5829342746fde278188b4ee2" class="fc-fieldinput" data-required>' +
          '       </div>' +
          '     </div>' +
          '   </div>' +
          ' </div>' +
          '</div>';

        return twig({data: template}).render({
          countryCodes: _self.countryCodes
        });
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

        var template = '' +
          '<div class="active-verification">' +
          ' <div class="head">' +
          '   <h2>Looks like we need more details...</h2>' +
          '   <p>We need to know a few more details to verify your identity. Please provide details about more than one document where possible.</p>' +
          ' </div>' +
          ' <div class="verification-sources">' +
          '   {% for source in sources %}' +
          '     {{ source }}' +
          '   {% endfor %}' +
          ' </div>' +
          ' <div class="verification-footer">' +
          '   <button data-bind="do-active-verification">Try again</button>' +
          '   {% if canSkip %}' +
          '     <button class="skip" data-bind="skip-verification">I don\'t have any of these</button>' +
          '   {% endif %}' +
          ' </div>' +
          '</div>';


        return twig({data: template}).render({
          sources: sourceHtml,
          canSkip: _self.module.getConfig('allowSkip', false) === true
        });
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
            '   <div class="alerts"></div>' +
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
          '     <input class="fc-fieldinput" type="checkbox" id="' + id + '" data-bind="confirmCheck">' +
          '     <label for="' + id + '">' +
          '       <span><b><i></i><i></i></b></span>' +
          '       <em>I consent</em>' +
          '       <span class="fc-end-checkbox-item"></span>' +
          '     </label>' +
          '     <div class="clearfix"></div>' +
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
          '<div class="alert error">' +
          ' {{ msg }}' +
          '</div>';
      },

      /**
       * Show the error screen.
       * @return {string}
       */
      ErrorScreen: function () {
        return '' +
          '<div class="locked">' +
          ' {{ config.skippedScreen }}' +
          '</div>';
      },

      /**
       * The screen to display when locked out.
       * @return {string}
       */
      LockedScreen: function () {
        return '' +
          '<div class="locked">' +
          ' {{ config.lockedBody }}' +
          '</div>';
      },

      /**
       * The screen to display when skipped.
       * @return {string}
       */
      SkippedScreen: function () {
        return '' +
          '<div class="skipped">' +
          ' {{ config.skipBody }}' +
          '</div>';
      },


      /**
       * The verification was successful
       * @return {string}
       */
      VerificationSuccess: function () {
        return '' +
          '<div class="background-verification success">' +
          ' {{ config.verificationSuccessBody }}' +
          '</div>'
      },
    }
  };
}());
