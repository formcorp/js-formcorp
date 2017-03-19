/* globals jQuery,form,fc,doc */

var preloadImages = [
  'app/images/baker.jpg',
  'app/images/bank.jpg',
  'app/images/bank-mobile.jpg',
  'app/images/fingerprint-blue.jpg',
  'app/images/fingerprint-grey.jpg',
  'app/images/machine.png',
  'app/images/signing.jpg',
  'app/images/signing-mobile.jpg',
].forEach(function(uri) {
  var img = new Image();
  img.src = uri;
})

var hasHash = false;
var API_BASE = 'https://staging.sales.tyro.formcorp.co/api';
var TYRO_HOME = 'https://tyro.com/';

// Minimum number of fields set to show that a form is valid
var MAGIC_NUMBER = 5;

var MIGRATION_VALUE = 'Migration (Pre-Oct 15 merchant)';

function scrollToTop(e) {
  $('.modal-body').animate({scrollTop:0});
  e.preventDefault();
}

(function ($) {
  var doc = doc || $(document);

  var hash = window.location.hash;
  if (!(hasHash = /^#\/[a-zA-Z0-9]+/.test(hash))) {
    // No hash, error
    // doc.find('#form-error').addClass('visible');
    window.location.href = TYRO_HOME;

    return;
  }

  // Set the session ID
  var setSessionId = function () {
    var components = hash.split('/');
    var sessionId = components[1];

    fc.setSessionId(sessionId);
    fc.init(form.key, form.el);
  }();

// For backward compatability purposes, bring the functions in to the global namespace
  var validTFN = formcorp.
      validators.validTFN;
  var validAcnOrAbn = formcorp.validators.validAcnOrAbn;
  var validAcn = formcorp.validators.validAcn;
  var validAbn = formcorp.validators.validAbn;

  var $window = $(window);

  function mapValueToField(fieldId, value, force) {
    if(force || fc.fields[fieldId] === '') {
      fc.fields[fieldId] = value;
      if(value.length < 1 || value == '0')
        $('input[formcorp-data-id='+fieldId+']');
      else
        $('input[formcorp-data-id='+fieldId+']').val(value);
    }
  }

  function reRenderRichTextField(fieldId) {
    $('div[fc-data-group="'+fieldId+'"] .fc-richtext').html(fc.tokenise(fc.fieldSchema[fieldId].config.rich));
  }

  doc.on('click', '.fc-section-582d287e5acf70db588b4655 .fc-next-section-button', function() {
    ['587852375acf70691e8b46d9',
     '5878527546fde2a9158b4804',
     '587852f346fde2a9158b4813'].forEach(reRenderRichTextField);
  });

  doc.on('click', 'a.fc-scroll-to-top', scrollToTop);

  doc.on('onFormExpired', function() {
    $('.fc-progress-bar-container').hide();
  });

  doc.on('click', '.fc-api-enter-manually', function(event) {
    setTimeout(function() {
      var $target = $(event.currentTarget);
      var lookupFieldId = $target.attr('fc-belongs-to');
      var lookupField = fc.fieldSchema[lookupFieldId];
      var $lookupField = $('input[formcorp-data-id='+lookupFieldId+']');
      var fields = JSON.parse(lookupField.config.mapResponse);
      var str = lookupField.config.responseSummary;

      for(var tag in fields) {
        if(tag.search(/country/) < 0)
          continue;

        $('.fc-tag-' + tag + ' select').val('Australia');
      }
    }.bind(this), 10);
  });

  doc.on('input paste', '.fc-section-582d287e5acf70db588b4655 input', function(){
    ['587852375acf70691e8b46d9',
     '5878527546fde2a9158b4804',
     '587852f346fde2a9158b4813'].forEach(reRenderRichTextField);
  })

  doc.on('OnFcInit', function() {
    var schemaInterval = setInterval(function() {
      if(fc && fc.schema && fc.schema.stage && fc.schema.stage.length > 0 ) {
        doc.trigger('onSchemaReady');
        clearInterval(schemaInterval);
      }
    }.bind(this), 100);
  });

  // When the schema has been loaded, check to make sure a valid submission has been loaded
  doc.on('onSchemaLoaded', function () {
    if (typeof fc.fields !== 'object' || Object.keys(fc.fields).length < MAGIC_NUMBER) {
      // Submission is not valid
      window.location.href = TYRO_HOME;
      doc.find('#formcorp-form').hide();
    }
  });

  function bar() {

  }

  function checkEFTPOSTerminalQuantity() {
    var desktopTerminals = fc.fields['583384b246fde27d088b6ba3'];
    var handheldTerminals = fc.fields['583384b346fde289098b6445'];

    var validator = [
                      {
                        "name": "custom EFTPOS terminals validator",
                        "type": "Min",
                        "params": [
                          1
                        ],
                        "error": "You need to have at least one EFTPOS terminal",
                        "id": 1200
                      }
                    ];


    if (desktopTerminals == 0 && handheldTerminals == 0) {
      fc.fieldSchema['583384b246fde27d088b6ba3'].config.validators = validator;
      fc.fieldSchema['583384b346fde289098b6445'].config.validators = validator;
    } else {
      fc.fieldSchema['583384b246fde27d088b6ba3'].config.validators = '';
      fc.fieldSchema['583384b346fde289098b6445'].config.validators = '';
    }
  }

  doc.on('onSchemaReady', function() {
    if ('Migration (Pre-Oct 15 merchant)' === fc.fields['58460d3246fde293378b5092']) {
      fc.progressBar.destroy();
      // setTimeout(function() {
        fc.progressBar = fc.progressBarFactory({
                'About You': {
                  '582be50f5acf707f488b491f': '',
                },
                'Your business': {
                  '5846361646fde242388b5910': '',
                },
                'Identity check': {
                  '584638355acf7067468b4776': '',
                },
                'Bank account': {
                  '58463d4046fde2f63a8b456f': '',
                },
                'Done': {
                  '58463dc146fde23a3a8b4cc5': '',
                  '584795f25acf7081538b4b65': '',
                  '5849db9c5acf7076718b7e2a': '',
                },
              }, fc.schema);
        fc.progressBar.init();
        fc.progressBar.setPage(fc.currentPage);
        fc.progressBar.update();
      // }, 1);
    }

    checkEFTPOSTerminalQuantity();
    $('.merchant-name-container > span').html(fc.fields['58292bbb46fde221188b4da4'] || 'Welcome!');
    $('.assistant-container a').html('<img src="' + fc.fields['587810d45acf70b7108b8e84'] + '" alt="">');
    $('.ty-salesperson-picture').html('<img src="' + fc.fields['587810d45acf70b7108b8e84'] + '" alt="">');

    //Gets rid of the standard help text click event handler
    fc.domContainer.off('click', '.fc-help-link').on('click', 'a.fc-help-link', function(e) {
      e.preventDefault();
    });

    fc.domContainer.on('mouseenter', '.fc-fieldcontainer>label>.fc-help-link', function(e) {
      e.preventDefault();
      var $target = $(e.currentTarget) || $(e.target) || $(this);
      if($target.find('.fc-floating-help-text-container').length > 0)
        return;

      var right = ($('#formcorp-form').outerWidth() > $target.offset().left + 300)?'':'fc-pull-to-left';

      var $field = $target.closest('.fc-field');
      var fieldId = $field.attr('fc-data-group'); //582d1e7e46fde2ec538b5baa
      var $sampleReceipt = (fieldId === '582d1e7e46fde2ec538b5baa')?'<img src="app/images/receipt.jpg" class="fc-tyro-help-receipt">':'';
      var hasImage = ($sampleReceipt === '')?'':'fc-tyro-help-has-image';
      var right = ($('#formcorp-form').outerWidth() > $target.offset().left + 480)?'':'fc-pull-to-left';
      var field = fc.fieldSchema[fieldId];
      var helpText = field.config.help;
      var helpTitle = field.config.helpTitle;
      var $helpTitle = (helpTitle === '')?'':$('<div class="fc-floating-help-title"></div>').html(helpTitle);
      var $helpText = $('<div class="fc-floating-help-text"></div>').append($sampleReceipt).append(helpText);
      var $helpElement = $('<div class="fc-floating-help-text-container"></div>')
        .addClass(right).addClass(hasImage).append($helpTitle).append($helpText);

      var timeout = false;

      $target.append($helpElement).on('mouseout', function() {
        timeout = setTimeout(function() {
          $helpElement.remove();
        }, 100);
      }).on('mousemove', function() {
        clearTimeout(timeout);
        timeout = false;
      });
    });

  });

  doc.on('click', '.fc-submit input', function() {
    $('.fc-page').css({transition: 'transform 0.5s ease-out', transform:'translate3d(-100%, 0, 0)'});
    setTimeout(function() {
      $('.fc-page').css({transition: 'none', transform:'translate3d(100%, 0, 0)'});
      $('.fc-page').css({transition: 'transform 0.5s ease-out', transform:'translate3d(0, 0, 0)'});
    }, 500);
    return false;
  });

  doc.on('focus', '.fc-field-text input', function() {
    var $this = $(this);
    var $container = $this.closest('.fc-fieldcontainer');
    var $label = $container.find('label');

    $container.addClass(function() {
      return 'fc-focused'
    }($this.val()));

    $container.removeClass('fc-pristine');
  });

  doc.on('onFormComplete', function () {
    $('header, #fc-progress-bar-container').hide();

  });

  doc.on('onLoadingPageStart', function () {
    $('#loading-bar-top').find('.bar').show().animate({
      width: '85%'
    }, 1200);
  });

  doc.on('blur', '.fc-field-text input', function() {
    var $this = $(this);
    var $container = $this.closest('.fc-fieldcontainer');
    var $label = $container.find('label');

    $container.addClass(function(val) {
      return (typeof val === 'string' && val.length > 0)?'fc-filled':'';
    }($this.val())).removeClass(function(val) {
      return (typeof val === 'string' && val.length > 0)?'fc-focused':'fc-filled fc-focused';
    }($this.val()));
  });

  (function ($) {
    "use strict";
    // When the connection is made, hide the loading screen
    doc.on('onFCConnectionMade', function () {
      var formEl, loader;

      loader = $('.loader-container');

      // Hide the loader
      loader.animate({
        opacity: 0
      }, 250, function () {
        setTimeout(function () {
          loader.remove();
        }, 1000);
      });
    });

    doc.on('click', '.need-help-container a, .assistant-container a', function(e) {
      e.preventDefault();
      fc.showModal({
        addButton: false,
        closeButton: false,
        title: 'Please contact',
        className: 'ty-need-help-modal',
        body: '<div class="ty-salesperson-info"><div class="ty-salesperson-picture"><img src="'+fc.fields['587810d45acf70b7108b8e84']+'" alt=""></div><div class="ty-salesperson-info-box"><div class="ty-salesperson-name">'+fc.fields['5847374b5acf70c2478b62c2']+' '+fc.fields['5847374d46fde2e63b8b5edf']+'</div><div class="ty-salesperson-phone">'+fc.fields['5847374f46fde2e63b8b5ee2']+'</div><div class="ty-salesperson-email"><a href="mailto:'+fc.fields['584737515acf70c2478b62c6']+'" target="_blank">'+fc.fields['584737515acf70c2478b62c6']+'</a></div></div></div>'});
    });

    doc.on('click', 'a.ty-learn-more-about-linked-accounts', function(e) {
      e.preventDefault();
      fc.showModal({
        addButton: false,
        title: 'Your Linked Account',
        body: '<div class="panelContent"><p>The account details that you provide here will be used for two purposes:</p><ol>  <li>As a <b><em>Settlement Account</em></b> where Tyro will credit settlement proceeds and debit any refunds or chargebacks from your Tyro EFTPOS Facility;</li>  <li>As a <b><em>Fee Account</em></b> which Tyro will debit for all Tyro fees, charges and other amounts due to Tyro.<br>It needs to be in the same legal entity name as this application, so that we can be sure we are crediting the right account.</li></ol><p><b>Your Tyro Smart Account</b><br>When your application is approved, you will also receive a Tyro Smart Account. Once you choose to activate your Tyro Smart Account then your Tyro Smart Account becomes:</p><ul>  <li>The <em>Settlement Account</em>;</li>  <li>The <em>Fee Account</em> unless you nominate a separate fee account.<br>Your <b><em>Linked Account</em></b> will still be used:</li>  <li>By Tyro to collect any fees, charges and other amounts due to Tyro that cannot be debited from the Tyro Smart Account (or other nominated Fee Account);</li>  <li>By you to transfer money in or out of the Tyro Smart Account using the Tyro App.</li></ul></div>'
      });
    })

    doc.on('onLoadingPageStart', function () {
      $('#loading-bar-top').find('.bar').show().animate({
        width: '85%'
      }, 1200);
    });

    doc.on('onLoadingPageEnd', function () {
      $('#loading-bar-top').find('.bar').animate({
        width: '100%'
      }, 100, function () {
        $('#loading-bar-top').find('.bar').hide().css('width', 0);
      });

    });

    doc.on('onFinishFormRender', function () {
      var hasFailed = {};
      initMasksInDom();
      setDefaultValueeInvestorDropDown();
      //TODO: pass in selector
      onThankyouComponentRender();

      $('input[data-required="false"]').attr('placeholder', '(Optional)');

    });

    doc.on('onDynamicRowAdded', initMasksInDom);
    doc.on('onDynamicRowRemoved', initMasksInDom);
    doc.on('onValueChanged', initMasksInDom);
    doc.on('ready', function() {
      setupBurgerMenuOnMobile();

      getSessionData('.id-matrix-verification .confirm-button button', 'click', function(data) {
        if (data.success) {
          mapDataToFormFields(data.data, {
            ip: '58c23ecfc21f9623680daa9d',
            requestTime: '58c23eddc21f9623fc4e52cd',
            timestamp: '58c23eddc21f9623f43a3fbb',
            userAgent: '58c23edec21f9623680daaa0'
          });
        }
      });

      getSessionData('.fc-section-582d26975acf7075588b4bc5 input.fc-next-section-button', 'click', function(data) {
        if (data.success) {
          mapDataToFormFields(data.data, {
            ip: '58c23f75c21f9623f43a3fc5',
            requestTime: '58c23f75c21f9623fc4e52e6',
            timestamp: '58c23f75c21f9623f43a3fc8',
            userAgent: '58c23f76c21f9623fc4e52e9'
          });
        }
      });

      getSessionData('.fc-section-582e40d246fde23a5b8b52df input.fc-next-section-button', 'click', function(data) {
        if (data.success) {
          mapDataToFormFields(data.data, {
            ip: '58c23fb4c21f9623680dab20',
            requestTime: '58c23fb4c21f9623f43a3fe9',
            timestamp: '58c23fb4c21f9623fc4e5307',
            userAgent: '58c23fb4c21f9623680dab23'
          });
        }
      });
    });
    function initMasksInDom() {
      // initMasks([
      //   {
      //     classes: ['.dob'],
      //     mask: '99/99/9999',
      //     placeholder: 'dd/mm/yyyy',
      //     name: 'dob'
      //   },
      //   {
      //     classes: ['.postcode'],
      //     mask: '9999',
      //     name: 'postcode'
      //   },
      //   {
      //     classes: ['.tfn'],
      //     mask: '999999999',
      //     name: 'tfn',
      //   },
      //   {
      //     classes: ['.abn'],
      //     mask: '99 999 999 999',
      //     name: 'abn',
      //   },
      //   {
      //     classes: ['.acn'],
      //     mask: '999 999 999',
      //     name: 'acn',
      //   },
      //   {
      //     classes: ['.phn'],
      //     mask: '9999 999 999',
      //     name: 'phone number',
      //   },
      // ]);
      // initDatePickers([
      //   {
      //     classes: ['.date-widget'],
      //     options: {
      //       format: 'dd/mm/yyyy',
      //       autoclose: true
      //     }
      //   }
      // ]);
      // initNumeric();
      // initCustomModals();
      // commaSeperateDollar();
      // updateEmail();

    }

  }(jQuery));

  function initMasks(inputMasks) {
    for (var mask in inputMasks) {
      initDigitalMasks(inputMasks[mask].classes, inputMasks[mask].mask, inputMasks[mask])
    }
  }
//loop through the fields
  function initDigitalMasks(fields, mask, options) {
    if (typeof options !== 'object') {
      options = {};
    }
    var iterator, el;
    for (iterator = 0; iterator < fields.length; iterator++) {
      el = '.fc-field' + fields[iterator] + ' input[type=text]';
      if ($(el).length > 0) {
        $(el).mask(mask, options);
      }
    }
  }
//custom modal for help text
  function initCustomModals() {
    $('a.fc-custom-modal').off('click');
    $('a.fc-custom-modal').click(function () {
      var content = $(this).attr('title').split('|');
      fc.showModal({
        addButton: false,
        title: content[0],
        body: content[1]
      });
    });
  }
//loop through field- date picker
  function initDatePickers(datePickers) {
    for (var datePicker in datePickers) {
      var iterator, el, fields = datePickers[datePicker].classes;
      for (iterator = 0; iterator < fields.length; iterator++) {
        el = '.fc-field' + fields[iterator] + ' input[type=text]';
        if ($(el).length > 0) {
          //$(el).datepicker(datePickers[datePicker].options);
        }
      }
    }
  }
//numeric
  function initNumeric() {
    var el = $('.fc-field.numeric');
    if (el.length > 0) {
      el.find('input[type=text]').numeric().attr('pattern', '\\d*').attr('novalidate', 'novalidate');
    }
  }
// comma separator
  function commaSeperateDollar() {
    var fields = $('.fc-field.fc-input-prefix.fc-input-symbol-dollar');
    if (fields.length > 0) {
      fields.find('input[type=text]').each(function () {
        $(this).val($(this).val().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
      });
    }
  }
  //Update the first email field

  function updateEmail() {
    var destination_id = '5592222fcd2a47a00f8b4742_0_5716db63c79f6ec5368b45db',
        destination = $(fc.jQueryContainer).find('.fc-fieldinput[formcorp-data-id="' + destination_id + '"]'),
        source = $(fc.jQueryContainer).find('.fc-fieldinput[formcorp-data-id="555320099ac25e81118b456c"]');

    if (source.length > 0 && source.val().length > 0 && destination.length > 0 && destination.val().length === 0) {
      destination.val(source.val());
      fc.setValue(destination_id, source.val());
    }
  };
//defaul value for investor drop down list grouplet
  function setDefaultValueeInvestorDropDown(){
    var valueAmountOfInvestors_id = '57575b83c79f6ec7668b4cb9';
    var value = 1;
    var currentValue = fc.getValue(valueAmountOfInvestors_id);
    if ('undefined' === typeof currentValue || ('string' === typeof currentValue && currentValue.length === 0)) {
      fc.setValue(valueAmountOfInvestors_id, value);
    }
  }

  function parseDollar(val) {
    return parseMinDigitsAfterDecimal(val, 2, true)
  }

  function getOtherFees() {
    var additionalFees = (fc.fields['582a847846fde2702c8b4907'] === 'Normalised')?'\
      <tr>\
        <td>International Service Assessment Fee<span class="fc-display-mobile-iblock ty-color-blue">&nbsp;(5)</span></td>\
        <td class="fc-hide-mobile">Visa/MasterCard international transactions</td>\
        <td>0.40%</td>\
      </tr>\
      <tr>\
        <td>Additional International Service Assessment Fee for DCC transactions<span class="fc-display-mobile-iblock ty-color-blue">&nbsp;(6)</span></td>\
        <td class="fc-hide-mobile">Visa/MasterCard international transactions, processed via DCC</td>\
        <td>0.40%</td>\
      </tr>':'';

    return $('\
      <div class="fc-modal-subtitle fc-collapsible-section-subtitle">Other Tyro Fees<span class="fc-hide-mobile"> (Payable to Tyro)</span></div>\
      <table class="fc-tyro-other-fees">\
        <tr>\
          <td>MOTO Fee<span class="fc-display-mobile-iblock ty-color-blue">&nbsp;(3)</span></td>\
          <td class="fc-hide-mobile">Visa/MasterCard card-not-present transactions processed over the phone, email, mail (MOTO) or online payments. This is in addition to the MSF.</td>\
          <td>0.15%</td>\
        </tr>\
        <tr>\
          <td>Switching Fee<span class="fc-display-mobile-iblock ty-color-blue">&nbsp;(4)</span></td>\
          <td class="fc-hide-mobile">American Express/JCB or Diners Club card transactions processed using Tyro terminals</td>\
          <td>0.10%</td>\
        </tr>'
        + additionalFees +
      '</table>\
    ');
  }

  function parseMinDigitsAfterDecimal(val, min, appendDot) {
    if(!val)
      return val;
    if(typeof val !== 'string')
      val = String(val);

    if(val.search(/\./) > -1) {
      while(val.length - val.search(/\./) < min + 1) {
        val += '0';
      }
    } else {
      return (appendDot)?val+'.00':val;
    }
    return val;
  }

  function renderTableValue(ids) {

    ids = parsePairedFields(ids);

    if(ids.length > 1) {
      return parseMinDigitsAfterDecimal(getFieldValue(ids[1]), 2, true) + '% + $' + parseMinDigitsAfterDecimal(getFieldValue(ids[0]), 2, true) + 'per transaction';
    }

    var field = fc.fieldSchema[ids[0]];
    var val = ids.map(function(id) {
      return fc.fields[id];
    });
    if(field.config.class.search('dollar') > -1) {
      return '$'+parseMinDigitsAfterDecimal(val, 2, true)+' per transaction';
    } else if(field.config.class.search('percent') > -1 || field.config.tag.search('percent') > -1) {
      return parseMinDigitsAfterDecimal(val, 2, false)+'%';
    }
    return val;
  }

  doc.on('onSchemaReady onPrevPage onNextPage', function() {

    console.log(fc.pageId);

    //ID verification page
    if(fc.pageId === '584638355acf7067468b4776') {
      $('.consent-screen a').attr('target', '_blank');
    }

    //Tell us about your business
    if (fc.pageId === '5846361646fde242388b5910') {
      ['58780f0b46fde21b0a8b6f3c'].forEach(reRenderRichTextField);

      $('#fc-field-582bf30e5acf7081498b4c84').mask('9999 999 999');
    }

    //Bank page
    if(fc.pageId === '58463d4046fde2f63a8b456f') {
      // var needle = 'Terms and Conditions of Direct Debit Request.';
      // var match = new RegExp(needle);
      // var haystack = $('.fc-tag-conditions_directDebit_merchant em').html();
      // var result = haystack.replace(match, '<a href="https://www.tyro.com/terms-and-conditions/" target="_blank" style="font-weight:400">'+needle+'</a>');
      // $('.fc-tag-conditions_directDebit_merchant em').html(result);

      // $('.fc-tag-directDebitIntro_directDebit_merchant .fc-richtext a').attr('target', '_blank');
      $('#5837683446fde2a9388b54fd_0').prop('checked', true);
      $('#fc-field-582d28df46fde28d558b468e').on('keydown', function(e) {
        if (e.keyCode >= 65 && e.keyCode <= 90) {
          return false;
        }
        if (((e.keyCode > 95 && e.keyCode < 106) || (e.keyCode > 47 && e.keyCode < 65)) && $(e.currentTarget).val().length === 3) {
          $(e.currentTarget).val($(e.currentTarget).val() + '-');
        }
      });
    }

    //Almost there...
    if(fc.pageId === '58463dc146fde23a3a8b4cc5') {
      $('#585b2be95acf70ae118b8b35_0').prop('checked', true);
      $('a').attr('target', '_blank');
      renderReviewTable($('.fc-field-reviewTable .fc-form-summary.fc-review-table'));
    }

    //IDMatrix
    if(fc.pageId === '584638355acf7067468b4776') {
      $('#5882f2e6c21f9647a80129d8_consent').prop('checked', true);
    }

    //Welcome page
    if(fc.pageId === '582bdc0f5acf70ce478b4d32') {

      if(fc.fields['584e39f55acf70901c8b69ef'] === '')
        $('.ty-applicant-notes').remove();

      var doesntSoundFamiliarHtml = $('.ty-doesnt-sound-familiar').html().replace(/contact us/, '<a href="mailto:applications@apply.tyro.com?subject=Incorrect mail recipient. Ref: '+fc.fields['587716395acf7035708bbf94']+'">contact us</a>');
      $('.ty-doesnt-sound-familiar').html(doesntSoundFamiliarHtml);

      $('a').attr('target', '_blank');

      $('header').hide();

      // Replaces next button functionality with "Let's get started"
      $('.ty-begin-button input').on('change', function() {
        $('.fc-next-section-button').trigger('click');
      });

      //Replaces header
      $('.fc-section-582be3475acf7059488b4958').prepend('\
        <div class="ty-front-page-header"><div class="ty-container">\
          <span>EFTPOS Banking Application</span>\
        </div></div>\
      ');

      $('.fc-tag-letsGetStarted, div[fc-data-group="58586d1c5acf70fa738b75f2"]').appendTo($('.fc-tag-overview_merchant_front_page .fc-fieldcontainer'));

      //Show desktop terminals if quantity > 0
      if(parseInt(fc.fields['582aac325acf70cf358b4790']) > 0) {
        $('.ty-desktop-terminals').show();
      }

      //Show handheld terminals if quantity > 0
      if(parseInt(fc.fields['582b9bec46fde288408b45fa']) > 0) {
        $('.ty-handheld-terminals').show();
      }

      //Hide grey box altogether for Migration if there are no notes
      if (fc.fields['58460d3246fde293378b5092'] === MIGRATION_VALUE) {
        if (typeof fc.fields['582ba31946fde2e5408b47ca'] === 'undefined' || fc.fields['582ba31946fde2e5408b47ca'] === '') {
          $('.ty-application-info-side').hide();
        } else {
          $('.ty-included-in-this-offer>div').first().add('.ty-included-in-this-offer .ty-separator').hide();
        }
      }

      //Hide terminals if applicant is not new merchant
      if(fc.fields['58460d3246fde293378b5092'] === MIGRATION_VALUE) {
        $('.ty-eftpos-machines').hide();
      }

      //Hide price schedule link if applicant is migrating to a new plan
      if(fc.fields['58460d3246fde293378b5092'] === MIGRATION_VALUE) {
        $('.ty-price-schedule-link').hide();
      }

      //Hide notes when there aren't any
      if(typeof fc.fields['584e39f55acf70901c8b69ef'] !== 'string' || fc.fields['584e39f55acf70901c8b69ef'] === '') {
        $('.ty-applicant-notes').remove();

        //Remove the separator if migrating && no notes
        if(fc.fields['58460d3246fde293378b5092'] === MIGRATION_VALUE) {
          $('.ty-application-info-side .ty-separator').remove();
        }
      }

      $('.ty-salesperson-email a').attr('href', 'mailto:' + $('.ty-salesperson-email a span').html());

    }

    if(fc.pageId === '58463dc146fde23a3a8b4cc5' || fc.pageId !== '585345505acf706f4d8b5141') {
      $('.fc-progress-bar-container').hide();
    }

    if(fc.pageId === '584795f25acf7081538b4b65') {
      $('.fc-progress-bar-container').hide();
      $('header').css({top:'-100%'});
      $('.fc-section-584795f25acf7081538b4b66').prepend('\
        <div class="ty-front-page-header"><div class="ty-container">\
          <span>Thanks for your application, '+fc.fields['582be57f5acf707f488b49b5']+'</span><br>\
          <span><i>Applications are subject to assessment and approval by Tyro.</i></span>\
        </div></div>\
      ');
    }

    //About you
    if(fc.pageId === '582be50f5acf707f488b491f') {
      //Address
      // mapValueToField('582be6ff46fde256468b45dc', fc.fields['5829342746fde278188b4ee2']);
      //Street
      // mapValueToField('582d030746fde250538b4c85', fc.fields['5829342746fde278188b4ee2']);
      //Suburb
      // mapValueToField('582be71c5acf707f488b4d44', fc.fields['582936735acf70351d8b4aa7']);
      //Postcode
      // mapValueToField('582be71e5acf70d4488b4779', fc.fields['582936755acf70201d8b4b08']);
      //State
      // mapValueToField('58479baa5acf70db538b49d9', fc.fields['584612635acf70f4448b456e']);
      //Cuntry
      // mapValueToField('58479bb25acf70db538b49dc', fc.fields['584612d15acf7087438b53f3']);

      $('.fc-section-582be6b246fde2b9458b502d').addClass('ty-dark');

      $('#fc-field-582be67946fde244468b45c3').mask('9999 999 999');

      $('.date-widget input').datepicker({
        // endDate: '-18y',
        // startDate: '-100y',
        autoclose: true,
        forceParse: false,
        format: 'dd/mm/yyyy',
        startView: "years",
        maxViewMode: "years",
        minViewMode: "month",
        defaultViewDate: {year:'1990'},
      });
    }

    //EFTPOS CONFIG
    if(fc.pageId === '58463a0d46fde242388b5b78') {
      var data = {
        '.fc-tag-numberOfDesktopEftpos_eftposConfig_merchant': {
          terminalLabel: 'Desktop terminals',
          price: 'Rental: $' + parseDollar(fc.fields['582aac1d5acf70cf358b4767']) + ' / month',
        },
        '.fc-tag-numberOfHandheldEftpos_eftposConfig_merchant': {
          terminalLabel: 'Handheld terminals',
          price: 'Rental: $' + parseDollar(fc.fields['582aac3d46fde284328b480e']) + ' / month',
        }
      }

      $('div[fc-data-group="5857813346fde219748b5628"]').appendTo('.fc-section-584785d45acf70cd528b496d .fc-section-end');

      for(var eftpos in data) {
        var self = data[eftpos];
        var $eftpos = $(eftpos);
        var $input = $eftpos.find('input');
        var $label = $eftpos.find('label');
        var $plusButton = $('<button class="fc-increment-button fc-increment-field">+</button>').click(function($field) {
          return function() {
            $field.val(parseInt($field.val()) + 1);
            var fieldId = $field.attr('formcorp-data-id');
            if (fieldId.length > 0) {
              // Update the value within the field definition
              fc.setVirtualValue(fieldId, $field.val(), fc.fields, true);
            }
            $('.fc-tag-numberOfHandheldEftpos_eftposConfig_merchant').removeClass('fc-error').find('.fc-error-text span').html('');
            $('.fc-tag-numberOfDesktopEftpos_eftposConfig_merchant').removeClass('fc-error').find('.fc-error-text span').html('');
            checkEFTPOSTerminalQuantity();
          }
        }($input));
        var $lessButton = $('<button class="fc-decrement-button fc-increment-field">&#9866;</button>').click(function($field) {
          return function() {
            if($field.val() > 0) {
              $field.val(parseInt($field.val()) - 1);
              var fieldId = $field.attr('formcorp-data-id');
              if (fieldId.length > 0) {
                // Update the value within the field definition
                fc.setVirtualValue(fieldId, $field.val(), fc.fields, true);
              }
            }
            checkEFTPOSTerminalQuantity();
          }
        }($input));

        $input.attr('readonly', 'readonly').val(($input.val() === '')?0:$input.val()).before($lessButton).after($plusButton);
        $eftpos.prepend('<div class="fc-terminal-label-container"><span>'+self.terminalLabel+'</span></div><div class="fc-price-label-container"><span>'+self.price+'</span></div>');
        $label.hide();
      }

      $('#5847648d46fde2d7448b4b74_0').click(function() {
        setTimeout(function() {
          $('.fc-section-58463a0d46fde242388b5b79 .fc-section-end').hide().find('input').click();
        }, 10);
      });

      $('#5847648d46fde2d7448b4b74_1').click(function() {
        $('.fc-section-58463a0d46fde242388b5b79 .fc-section-end').show();
      });

      if($('#5847648d46fde2d7448b4b74_1').hasClass('checked')) {
        $('.fc-section-58463a0d46fde242388b5b79 .fc-section-end').show();
      }
    }

    if(fc.pageId !== '582bdc0f5acf70ce478b4d32' && fc.pageId !== '585345505acf706f4d8b5141' && fc.pageId !== '584795f25acf7081538b4b65') {
      $('header').slideDown();
      $('.fc-progress-bar-container').show();
      $('.ty-page-title-container').remove();
      $('.merchant-name-container').show();
    }

    $(document).on('click', '.fc-section-582d0c755acf7008578b4b9f input.fc-next-section-button', function(e) {
      var $desktopTerminalsField = $('#fc-field-583384b246fde27d088b6ba3');
      var desktopTerminals = $desktopTerminalsField.val();
      var $handheldTerminalsField = $('#fc-field-583384b346fde289098b6445');
      var handheldTerminals = $handheldTerminalsField.val();
      var $section = $('.fc-section-582d0c755acf7008578b4b9f');
      var $sectionError = $('<div class="fc-section-error">Woops!</div>');

      var validator = [
                        {
                          "name": "custom EFTPOS terminals validator",
                          "type": "Min",
                          "params": [
                            1
                          ],
                          "error": "You need to have at least one EFTPOS terminal",
                          "id": 120
                        }
                      ];


      if(desktopTerminals === '0' && handheldTerminals === '0') {
        fc.fieldSchema['583384b246fde27d088b6ba3'].config.validators = validator;
        fc.fieldSchema['583384b346fde289098b6445'].config.validators = validator;
      } else {
        fc.fieldSchema['583384b246fde27d088b6ba3'].config.validators = '';
        fc.fieldSchema['583384b346fde289098b6445'].config.validators = '';
        fc.validForm($section);
      }

    });

    $(document).on('click', '.ty-price-schedule-link a', function(e) {
      e.preventDefault();

      var $table = $('<div id="fc-preview-table"></div>');
      var $tableContainer = $('<div class="fc-preview-table-container"></div>');
      var $tableContent = $('<div class="fc-preview-table-content"></div>');

      // var $fees = function(renderer, fields) {
      //   var $middleColumn = $('<td><strong>Interchange Fees</strong> - At cost for each transaction, as published by the respective Scheme. For more information <a href="#">click here</a><br><br><strong>Card Scheme Fees</strong> - At cost for each transaction, as charged by the respective Schemes. For more information <a href="#">click here</a></td>');
      //   var $table = $('<table class="fc-tyro-msf"><tr>\
      //   <th colspan="3">Merchant Service Fee (MSF) (?)<th>\
      // </tr>\
      // <tr>\
      //   <th>Transaction category</th>\
      //   <th>Fees payable to Card Schemes</th>\
      //   <th>Merchant Acquiring Fee</th>\
      // </tr></table>');

      //   $table.append(fields.reduce(renderer, ''));

      //   var rowCount = $table.find('tr').length -2;

      //   $table.find('tr:nth(2) td:first').after($middleColumn.attr('rowspan', rowCount));

      //   return $table;
      // }(function(prev, id) {
      //   if(!fc.fields[id] || fc.fields[id] === '' /*|| fc.fields[id] == '0'*/ || typeof fc.fieldSchema[id] === 'undefined')
      //     return prev+'';
      //   return prev+'<tr><td>'+fc.fieldSchema[id].config.label+'</td><td>'+renderTableValue(id)+'</td></tr>'
      // }, [
      //   '582a908946fde2b72e8b483d',
      //   '584e2db35acf70901c8b6445',
      //   '582a90a25acf70e5328b45ea',
      //   '584e2e995acf704a1e8b5273',
      //   '585878dc5acf709b7c8b4843',
      //   '585878e046fde217748b7a1e',
      //   '5836b6655acf7062378b49a9',
      //   '584e2c815acf704a1e8b51b1',
      //   '582b8e0346fde2093f8b4bb0',
      //   '584e2cbd5acf70e81c8b5e55',
      //   '5836b7375acf709d378b45a4',
      //   '584e2cf95acf704a1e8b51e4',
      //   '582a87385acf70aa318b488e',
      //   '584e2d1646fde2461e8b4df7',
      //   '582a851846fde2872c8b4673',
      //   '584e2d4046fde2461e8b4e06',
      //   '582a873b46fde21f2d8b47ac',
      //   '584e2d665acf704a1e8b5214',
      //   '586ae40d5acf70a16e8b5181',
      //   '584e2f815acf704a1e8b52cf',
      //   '582a91185acf7026338b465b',
      //   '584e2f9b46fde2461e8b4ed4',
      //   '586ae56646fde2866a8b613a',
      //   '584e2d8f46fde20a1d8b5d9c',
      //   '586ae5b346fde2366a8b6403',
      //   '584e2fc25acf704a1e8b5303'
      // ]);
      //
      var $fees = renderTransactionCategory()();

      if(fc.fields['582a847846fde2702c8b4907'] === 'Cost Plus') {

        var $middleColumn0 = $('<th class="fc-hide-mobile">Fees payable to card schemes</th>');
        var $middleColumn1 = $('<td class="fc-hide-mobile" rowspan="4"><strong>Interchange Fees</strong> - At cost for each transaction, as published by the respective Scheme. For more information <a href="https://www.tyro.com/terms-and-conditions/" target="_blank">click here</a><br><br><strong>Card Scheme Fees</strong> - At cost for each transaction, as charged by the respective Schemes. For more information <a href="https://www.tyro.com/terms-and-conditions/" target="_blank">click here</a></td>');

        $fees.find('tr:nth(0) th:first').after($middleColumn0);
        $fees.find('tr:nth(1) td:first').after($middleColumn1);
        // $fees.find('tr:nth(3) td:first').after($middleColumn2);

      }

      var $otherTyroFees = getOtherFees();

      var $dccRebate = function(isDccEnabled) {
        return (typeof fc.fields['582b9c785acf709c428b4695'] === 'undefined' || fc.fields['582b9c785acf709c428b4695'] === '')?null:$('\
        <div class="fc-modal-subtitle">Rebates (Payable to you<span class="fc-hide-mobile"> by Tyro</span>)</div>\
        <table class="fc-tyro-dcc-rebate">\
          <tr>\
            <td>DCC Rebate<span class="fc-display-mobile-iblock ty-color-blue">&nbsp;(9)</span></td>\
            <td class="fc-hide-mobile">International Transactions processed using DCC. <a href="https://www.tyro.com/terms-and-conditions/" target="_blank">Click here to learn more</a></td>\
            <td>' + parseMinDigitsAfterDecimal(parseFloat(fc.fields['582aac625acf70fa358b45c2']), 2, true) + '%</td>\
          </tr>\
        </table>\
      ');
      }

      var $eftposTerminals = function() {
        if(fc.fields['582aac325acf70cf358b4790'] === '' && fc.fields['582b9bec46fde288408b45fa'] === '' || fc.fields['58460d3246fde293378b5092'] === 'Migration (Pre-Oct 15 merchant)')
          return '';
        var $table = $('<table class="fc-tyro-eftpos-terminals"></table>').append(function() {
          return function(rate, terminals) {
                if(!rate || rate === '' || rate === '0' || !terminals || terminals === '' || terminals === '0')
                  return '';
                return '<tr><td><img src="app/images/yomani-front.jpg">Desktop<span class="fc-display-mobile-iblock ty-color-blue">&nbsp;(7)</span></td><td class="fc-hide-mobile">A wired model using Ethernet and 3G backup</td><td>$'+rate+'/month per terminal</td>';
              }(fc.fields['582aac1d5acf70cf358b4767'], fc.fields['582aac325acf70cf358b4790']) + function(rate, terminals) {
                if(!rate || rate === '' || rate === '0' || !terminals || terminals === '' || terminals === '0')
                  return '';
                return '<tr><td><img src="app/images/yoximo_1.jpg">Handheld<span class="fc-display-mobile-iblock ty-color-blue">&nbsp;(8)</span></td><td class="fc-hide-mobile">A wireless model using WiFi and 3G backup</td><td>$'+rate+'/month per terminal</td>';
              }(fc.fields['582aac3d46fde284328b480e'], fc.fields['582b9bec46fde288408b45fa']);
        }());
        return $('<div><div class="fc-modal-subtitle">EFTPOS Terminals</div></div>').append($table);
      }();

      var $healthFundClaming = (typeof fc.fields['582b9de846fde288408b47a2'] === 'string' && fc.fields['582b9de846fde288408b47a2'] !== '')?$('\
      <div class="fc-modal-subtitle">Health Fund claiming</div>\
      <table class="fc-tyro-health-fund-claim">\
        <tr>\
          <td>Health fund claiming fee</td>\
          <td class="fc-hide-mobile">Per terminal enabled for Health fund claiming.<br><a href="https://www.tyro.com/terms-and-conditions/" target="_blank">Click here to learn more</a></td>\
          <td>$10/month per terminal</td>\
        </tr>\
      </table>\
    '):'';

      var $notes = (typeof fc.fields['584e39f55acf70901c8b69ef'] === 'string' && fc.fields['584e39f55acf70901c8b69ef'] !== '')?$('\
        <div class="fc-modal-subtitle">Notes to your application</div>\
        <table class="fc-tyro-notes">\
        <tr><td style="text-align:left;">'+fc.fields['584e39f55acf70901c8b69ef']+'</td></tr>\
      '):'';

      var $append1 = $('<div class="fc-display-mobile-block"></div>').append($('<table></table>').append($('<tr><th style="text-align:left;">(1) Fees payable to card schemes</th></tr>'))
        .append($('<tr><td style="text-align:left;"><strong>Interchange Fees</strong> - At cost for each transaction, as published by the respective Scheme. For more information <a href="https://www.tyro.com/terms-and-conditions/" target="_blank">click here</a><br><br><strong>Card Scheme Fees</strong> - At cost for each transaction, as charged by the respective Schemes. For more information <a href="https://www.tyro.com/terms-and-conditions/" target="_blank">click here</a></td></tr>')))
        .append('<a href="#" class="fc-scroll-to-top">Back to top</a>');


      var $append2 = $('<div class="fc-display-mobile-block"></div>').append($('<table></table>')
        .append('<tr><th style="text-align:left;">Other Tyro Fees</th></tr>')
        .append(function(pricingScheme) {
          var otherFees = '<tr>\
              <td style="text-align:left;"><strong>(3) MOTO Fee</strong> Visa/MasterCard card-not-present transactions processed over the phone, email, mail (MOTO) or online payments. This is in addition to the MSF.</td>\
            </tr>\
            <tr>\
              <td style="text-align:left;"><strong>(4) Switching Fee</strong>American Express/JCB or Diners Club card transactions processed using Tyro terminals</td>\
            </tr>';
          if(pricingScheme === 'Normalised') {
            otherFees += '<tr>\
                <td style="text-align:left;"><strong>(5) Switching Fee</strong>Visa/MasterCard international transactions</td>\
              </tr>\
              <tr>\
                <td style="text-align:left;"><strong>(6) Switching Fee</strong>Visa/MasterCard international transactions, processed via DCC</td>\
              </tr>';
          }
          return otherFees;
        }(fc.fields['582a847846fde2702c8b4907'])))
        .append('<a href="#" class="fc-scroll-to-top">Back to top</a>');

      var $append3 = $('<div class="fc-display-mobile-block"></div>').append($('<table></table>')
        .append('<tr><th style="text-align:left;">EFTPOS Terminals</th></tr>')
        .append((fc.fields['583384b246fde27d088b6ba3'] > 0)?'<tr><td style="text-align:left;"><strong>(7) Desktop </strong>A wired model using Ethernet and 3G backup</td></tr>':'')
        .append((fc.fields['582b9bec46fde288408b45fa'] > 0)?'<tr><td style="text-align:left;"><strong>(8) Handheld </strong>A wireless model using WiFi and 3G backup</td></tr>':''))
        .append('<a href="#" class="fc-scroll-to-top">Back to top</a>');

      var $append4 = $('<div class="fc-display-mobile-block"></div>').append($('<table></table>')
        .append('<tr><th style="text-align:left;">Rebate</th></tr>')
        .append('<tr><td style="text-align:left;"><strong>(9) DCC Rebate - </strong>International Transactions processed using DCC. <a href="https://www.tyro.com/terms-and-conditions/" target="_blank">Click here to learn more</a></td></tr>'))
        .append('<a href="#" class="fc-scroll-to-top">Back to top</a>');

      $table.append($tableContainer.append($tableContent.append($fees)
        .append($otherTyroFees)
        .append($dccRebate)
        .append($eftposTerminals)
        .append($healthFundClaming)
        .append($notes)
      ).prepend($('<div class="fc-modal-subtitle"></div>')
        .append(
          $('<span>Merchant Service Fee MSF </span>')
            .append(renderHelpIcon('The Merchant Service Fee (MSF) is the total fee payable on each transaction. It includes the Merchant Acquiring Fee (MAF) plus all fees payable to Card Schemes. For more information <a href="https://tyro.com/terms-and-conditions/" target="_blank">click here</a>.The MSF for each transaction is available on a daily terminal report via the Tyro Merchant Portal.'))
        )
      )).append((fc.fields['582a847846fde2702c8b4907'] === 'Cost Plus')?$append1:'')
      .append($append2)
      .append((fc.fields['583384b246fde27d088b6ba3'] > 0 || fc.fields['582b9bec46fde288408b45fa'] > 0)?$append3:'')
      .append((fc.fields['582aac625acf70fa358b45c2'] > 0)?$append4:'');

      fc.showModal({body: $table, title: 'Price Schedule', addButton: false});
    });

    //Prepopulate other bank details fields
    //Account name
    $(document).on('blur', '#fc-field-582d29b446fde28e558b47ee', function(e) {
      var val = e.target.value;
      $('#fc-field-5857881d5acf70fa738b5357, #fc-field-585787cb5acf70dd6e8baa2d, #fc-field-582d2f405acf701c598b47d1').val(val);
      fc.fields['5857881d5acf70fa738b5357'] = val;
      fc.fields['585787cb5acf70dd6e8baa2d'] = val;
      fc.fields['582d2f405acf701c598b47d1'] = val;
    });

    //BSB
    $(document).on('blur', 'input[formcorp-data-id="582d28df46fde28d558b468e"]', function(e) {
      var val = e.target.value;
      $('#fc-field-5857881d5acf70fa738b5358, #fc-field-585787cb5acf70dd6e8baa2e, #fc-field-582d2f4246fde2b3558b4bba').val(val);
      fc.fields['5857881d5acf70fa738b5358'] = val;
      fc.fields['585787cb5acf70dd6e8baa2e'] = val;
      fc.fields['582d2f4246fde2b3558b4bba'] = val;
    });

    //Account name
    $(document).on('blur', '#fc-field-582d297d46fde28d558b472d', function(e) {
      var val = e.target.value;
      $('#fc-field-5857881d5acf70fa738b5359, #fc-field-585787cb5acf70dd6e8baa2f, #fc-field-582d2f4346fde28d558b4f46').val(val);
      fc.fields['5857881d5acf70fa738b5359'] = val;
      fc.fields['585787cb5acf70dd6e8baa2f'] = val;
      fc.fields['582d2f4346fde28d558b4f46'] = val;
    });

  });

  $(window).scroll(function() {
    var sections = $('.fc-section');
    var currentSection = fc.currentSection || null;
  });

  function renderReviewTable($field) {
    $field.html(renderReviewTableInDOM());
  }

  function renderReviewTableInDOM() {
    var $fees = renderTransactionCategory()();

    if(fc.fields['582a847846fde2702c8b4907'] === 'Cost Plus') {

      var $middleColumn0 = $('<th class="fc-hide-mobile">Fees payable to card schemes</th>');
      var $middleColumn1 = $('<td rowspan="4" class="fc-hide-mobile"><strong>Interchange Fees</strong> - At cost for each transaction, as published by the respective Scheme. For more information <a href="https://www.tyro.com/terms-and-conditions/" target="_blank">click here</a><br><br><strong>Card Scheme Fees</strong> - At cost for each transaction, as charged by the respective Schemes. For more information <a href="https://www.tyro.com/terms-and-conditions/" target="_blank">click here</a></td>');
      // var $middleColumn2 = $('<td rowspan="2"></td>');

      $fees.find('tr:nth(0) th:first').after($middleColumn0);
      $fees.find('tr:nth(1) td:first').after($middleColumn1);
      // $fees.find('tr:nth(3) td:first').after($middleColumn2);
      //

    }
    var $healthFundClaming = (typeof fc.fields['582b9de846fde288408b47a2'] === 'string' && fc.fields['582b9de846fde288408b47a2'] !== '')?$('\
      <div class="fc-modal-subtitle fc-collapsible-section-subtitle">Health Fund claiming</div>\
      <table class="fc-tyro-health-fund-claim">\
        <tr>\
          <td>Health fund claiming fee</td>\
          <td class="fc-hide-mobile">Per terminal enabled for Health fund claiming.<br><a href="https://www.tyro.com/terms-and-conditions/" target="_blank">Click here to learn more</a></td>\
          <td>$10/month per terminal</td>\
        </tr>\
      </table>\
    '):'';

    var $terminalRentalPricing = function(applicationType) {
      if (applicationType === 'Migration (Pre-Oct 15 merchant)') {
        return '';
      }

      return $('<div></div>')
      .append($('<div class="fc-collapsible-section-subtitle">EFTPOS Rental rates</div>'))
      .append($('<table class="fc-tyro-eftpos-terminals"></table>')
        .append('<tr><td><img src="app/images/yomani-front.jpg"> Desktop</td><td class="fc-hide-mobile">A wired model using Ethernet and 3G backup</td><td>$'+parseMinDigitsAfterDecimal(fc.fields['582aac1d5acf70cf358b4767'], 2, true)+'</td></tr>')
        .append('<tr><td><img src="app/images/yoximo_1.jpg"> Handheld</td><td class="fc-hide-mobile">A wireless model using WiFi and 3G backup</td><td>$'+parseMinDigitsAfterDecimal(fc.fields['582aac3d46fde284328b480e'], 2, true)+'</td></tr>')
      );
    }(fc.fields['58460d3246fde293378b5092']);

    var a = $('<div></div>')
      .append(renderSection('Your price schedule',
        $('<div></div>').append(
          $('<div class="fc-collapsible-section-subtitle">Merchant Service Fee </div>')
            .append(renderHelpIcon('The Merchant Service Fee (MSF) is the total fee payable on each transaction. It includes the Merchant Acquiring Fee (MAF) plus all fees payable to Card Schemes. For more information <a href="https://tyro.com/terms-and-conditions/" target="_blank">click here</a>.The MSF for each transaction is available on a daily terminal report via the Tyro Merchant Portal.')
          )
        )
        .append($fees)
        .append(getOtherFees())
        .append($terminalRentalPricing)
        .append($healthFundClaming)
        .append(renderRebatesAndNotes())
      ))
      .append(renderSection('About you',
        renderPersonalInformation()
      ))
      .append(renderSection('About your business',
        renderAboutYourBusiness()
      ))
      .append(function(applicationType) {
        if (applicationType === MIGRATION_VALUE) {
          return '';
        }
        return renderSection('Your EFTPOS terminals',
          renderEFTPOSDetails())
      }(fc.fields['58460d3246fde293378b5092']))
      .append(renderSection('Your bank account details',
          renderBankDetails()
      ));
    return a;
  }

  function renderRebatesAndNotes() {

    if(getFieldValue('582b9c785acf709c428b4695') === '' && getFieldValue('584e39f55acf70901c8b69ef') === '')
      return '';

    var dccRebate = (getFieldValue('582b9c785acf709c428b4695') !== '')?
      parseMinDigitsAfterDecimal(parseFloat(
        getFieldValue('582aac625acf70fa358b45c2')),
        2,
        true
      ) + '%':
    '';

    var notes = getFieldValue('584e39f55acf70901c8b69ef');

    var $container = $('<div></div>')

    if(dccRebate !== '') {
      $container.append('<div class="fc-collapsible-section-subtitle">Rebates (Payable to you by Tyro)</div>\
        <table><tr><td>'+getFieldLabel('582aac625acf70fa358b45c2')+
        '<td>International Transactions processed using DCC. <a href="https://www.tyro.com/terms-and-conditions/" target="_blank">Click here to learn more</a></td>'+
        '</td><td>'+dccRebate+'</td></tr></table>'
      );
    }

    if(notes !== '') {
      $container.append('<div class="fc-collapsible-section-subtitle">Notes to your application</div>\
        <table><tr><td style="text-align:left">'+notes+'</td></tr></table>\
      ');
    }

    return $container;
  }

  function renderPersonalInformation() {
    var $table = $('<table></table>');
    $table.append(renderField(null, null, 'Name',
      [
        '582be5a246fde2e7458b4ab0',
        '582be57f5acf707f488b49b5',
        '582be59d46fde2b9458b4eb7',
        '582be59e46fde2e7458b4aab',
      ].reduce(function(a, b) {
        var v = getFieldValue(b);
        if(v === '')
          return a;

        return a + v + ' ';
      }, ''))
    );

    var fields = [
      '582be67946fde244468b45c3', //Mobile
      '582be67c5acf70b7488b47bb', //E-mail
      function(isNotAusResident) {
        return (isNotAusResident === '')?'582be6ff46fde256468b45dc':'582beb695acf7042498b46c8';
      }(getFieldValue('582beb3a5acf70d4488b4e68')),
      '582e7a7b46fde205628b4ae0', //DoB
      '584634d55acf702d468b4628', //US citizen
    ];

    return renderElement($table,
      fields,
      '',
      '',
      renderFields(getFieldLabel, getFieldValue)
    );
  }

  function renderAboutYourBusiness() {
    var fields = [
      '582bed845acf705f498b4831', //ABN
      '582bedaa46fde2bd468b47a8', //Entity Name
      '58479e9246fde2aa478b4bf9', //Trading Name
      '5847494846fde2e63b8b6331', //Trading address
      '583681db46fde29a2e8b665a', //Business description
      '582bf30e5acf7081498b4c84', //Business phone number
      '58522a905acf701d448b4837', //% of orders online
    ];
    return renderElement($('<table></table>'),
      fields,
      '',
      '',
      renderFields(getFieldLabel, getFieldValue)
    );
  }

  function mapFieldLabels(map) {
    return function(id) {
      if(Array.isArray(id))
        id = id[0];
      return map[id]||getFieldLabel(id);
    }
  }

  function transformValues(map) {
    return function(id) {
      return (typeof map[id] === 'function')?map[id](getFieldValue(id)):getFieldValue(id);
    }
  }

  function renderEFTPOSDetails() {
    var fields = [
      (fc.fields['583384b246fde27d088b6ba3'] !== '' && fc.fields['583384b246fde27d088b6ba3'] > 0)?'582aac1d5acf70cf358b4767':'', //Desktop terminals monthly rental
      (fc.fields['583384b246fde27d088b6ba3'] !== '' && fc.fields['583384b246fde27d088b6ba3'] > 0)?'583384b246fde27d088b6ba3':'', //Number of desktop terminals
      (fc.fields['583384b346fde289098b6445'] !== '' && fc.fields['583384b346fde289098b6445'] > 0)?'582aac3d46fde284328b480e':'', //Handheld terminals monthly rental
      (fc.fields['583384b346fde289098b6445'] !== '' && fc.fields['583384b346fde289098b6445'] > 0)?'583384b346fde289098b6445':'', //Number of handheld terminals
      (fc.fields['5847888246fde25a468b4daf'] !== '' && fc.fields['5847888246fde25a468b4daf'] !== '0')?'5847888246fde25a468b4daf':'', //Health fund claim enabled terminals
      function(address) {
        if(address && address === '')
          return '5847494846fde2e63b8b6331'; //Trading address
        else
          return '5847658a5acf706e518b46e4'; //Delivery address
      }(getFieldValue('5847658a5acf706e518b46e4')),
      '582d1e7e46fde2ec538b5baa', //Terminal receipt text
      '584783ee5acf706f518b52f7', //Amex number
      '582d1fb25acf7008578b5cd6', //Diner's number
      '58477ec346fde21d468b4a1f', //Administrator first name
      // '58477ec85acf709f518b4e88', //Administrator last name
      '5851eddd46fde2d1408b467c', //Administrator email
    ];

    var labels = {
      '582aac1d5acf70cf358b4767': 'Desktop terminals monthly rental',
      '582aac3d46fde284328b480e': 'Handheld terminals monthly rental',
      '583384b246fde27d088b6ba3': 'Number of desktop terminals',
      '583384b346fde289098b6445': 'Number of handheld terminals',
      '5847658a5acf706e518b46e4': 'Delivery address',
      '5847494846fde2e63b8b6331': 'Delivery address',
      '582d1e7e46fde2ec538b5baa': 'Terminal receipt text',
      '584783ee5acf706f518b52f7': 'American Express merchant number',
      '582d1fb25acf7008578b5cd6': 'Diner\'s Club merchant name',
      '5847888246fde25a468b4daf': 'Health fund claim enabled terminals <a href="https://www.tyro.com/terms-and-conditions/" target="_blank">Click here to learn more</a>',
      '58477ec346fde21d468b4a1f': 'EFTPOS Administrator name',
      // '58477ec85acf709f518b4e88': 'EFTPOS Administrator last name',
      '5851eddd46fde2d1408b467c': 'EFTPOS Administrator email',
    }

    var transform = {
      '582aac1d5acf70cf358b4767': function (val) {
        return '$' + parseMinDigitsAfterDecimal(val, 2, true);
      },
      '582aac3d46fde284328b480e': function (val) {
        return '$' + parseMinDigitsAfterDecimal(val, 2, true);
      },
      '58477ec346fde21d468b4a1f': function(val) {
        return val + ' ' + (fc.fields['58477ec85acf709f518b4e88'] || '');
      }
    }

    return renderElement($('<table></table>'),
      fields,
      '',
      '',
      renderFields(mapFieldLabels(labels), transformValues(transform))
    );
  }

  function renderBankDetails(){
      var fields = [
          '582d28df46fde28d558b468e', //BSB
          '582d297d46fde28d558b472d', // Account number
          '582d29b446fde28e558b47ee', // Account name
          '584790855acf7080538b4760', // Joint account
      ];

      var labels = {
        '582d28df46fde28d558b468e' : 'BSB',
        '582d297d46fde28d558b472d' : 'Account number',
        '582d29b446fde28e558b47ee' : 'Account name',
        '584790855acf7080538b4760' : 'Joint account',
      }

      return renderElement($('<table></table>'),
        fields,
        '',
        '',
        renderFields(mapFieldLabels(labels), getFieldValue)
      );
  }

  function renderTransactionCategory() {
    var $table = $('<table class="fc-tyro-pricing-scheme-table"></table>');

    var normalised = [
      ['5836b6655acf7062378b49a9', '584e2c815acf704a1e8b51b1'], //Visa/MasterCard domestic consumer credit card
      ['582b8e0346fde2093f8b4bb0', '584e2cbd5acf70e81c8b5e55'], //Visa/MasterCard domestic premium and commercial card
      ['5836b7375acf709d378b45a4', '584e2cf95acf704a1e8b51e4'], //Visa/MasterCard International
      ['582a87385acf70aa318b488e', '584e2d1646fde2461e8b4df7'], //Visa/MasterCard domestic consumer debit card
      ['582a851846fde2872c8b4673', '584e2d4046fde2461e8b4e06'], //MasterCard debit card micropayments <= $15
      ['582a873b46fde21f2d8b47ac', '584e2d665acf704a1e8b5214'], //Union Pay International card
      ['582a908946fde2b72e8b483d', '584e2db35acf70901c8b6445'], //eftpos - Debit Card - $15 or more transactions
      ['582a90a25acf70e5328b45ea', '584e2e995acf704a1e8b5273'], //eftpos - Debit Card - less than $15 transactions
      ['585878dc5acf709b7c8b4843', '585878e046fde217748b7a1e'], //eftpos Debit Card - Cash-out
    ];

    var costPlus = [
      ['586ae40d5acf70a16e8b5181', '584e2f815acf704a1e8b52cf'], //Visa/MasterCard
      ['582a91185acf7026338b465b', '584e2f9b46fde2461e8b4ed4'], //Union Pay International
      ['586ae56646fde2866a8b613a', '584e2d8f46fde20a1d8b5d9c'], //eftpos - Purchase
      ['586ae5b346fde2366a8b6403', '584e2fc25acf704a1e8b5303'], //eftpos - Cash-out
    ];

    var fields = function(pricingScheme) {
      return (pricingScheme === 'Normalised')?normalised:costPlus;
    }(fc.fields['582a847846fde2702c8b4907']);

    return renderElement($table,
      fields,
      '<tr><th>Transaction category</th><th><span class="fc-hide-mobile">Merchant Acquiring </span>Fee</th></tr>',
      '',
      renderFields(getFieldLabel, renderTableValue)
    );

  }

  function parsePairedFields(pair) {

    var dollar = getFieldValue(pair[0]);
    var percent = getFieldValue(pair[1]);

    if(percent && percent !== '' && parseFloat(percent) !== 0 && dollar && dollar !== '' && parseFloat(dollar) !== 0)
      return pair;

    if((parseFloat(percent) === 0 && parseFloat(dollar) === 0) || (percent === '' && parseFloat(dollar) === 0) || (parseFloat(percent) === 0 && dollar === '')) {
      fc.fields[pair[0]] = '0';
      return Array(pair[0]);
    }

    if(parseFloat(percent) !== 0 && percent !== '')
      return Array(pair[1]);

    return Array(pair[0]);

  }

  function renderFields(label, value, itemRenderer) {
    if(typeof label === 'undefined')
      label = getFieldLabel;
    if(typeof value === 'undefined')
      value = getFieldValue;
    if(typeof label !== 'function')
      label = function() {return label;}
    if(typeof value !== 'function')
      value = function() {return value;}
    return function(list, renderer) {
      if(typeof renderer !== 'function')
        renderer = renderField;
      return list.filter(isFieldNotEmpty).reduce(function(a, b) {
        return a + renderer(b, itemRenderer, label(b), value(b));
      }, '');
    }
  }

  function renderField(fieldId, renderer, label, value) {

    if(typeof renderer === 'function')
      return renderer(label, value);

    var cost1 = (fc.fields['582a847846fde2702c8b4907'] === 'Cost Plus' && fc.pageId === '582bdc0f5acf70ce478b4d32')?'<span class="fc-display-mobile-iblock ty-color-blue">&nbsp;+ cost (1)</span>':'';

    return '<tr><td>'+label+'</td><td>'+value+cost1+'</td></tr>';
  }

  function getFieldLabel(field) {
    var label;

    if(Array.isArray(field))
      field = field[0];

    if(typeof field === 'string')
      field = getFieldById(field);

    if(typeof field !== 'object')
      return undefined;

    label = field.config.label || '';

    return (label.length > 0)?label:field.config.placeholder;
  }

  function getFieldValue(fieldId) {
    return fc.fields[fieldId] || '';
  }

  function getFieldById(fieldId) {
    return fc.fieldSchema[fieldId];
  }

  function isFieldNotEmpty(field) {
    if(Array.isArray(field))
      return field.filter(isFieldNotEmpty).length > 0;

    var value = getFieldValue(field);
    return (typeof value === 'string' && value.length > 0);
  }

  function renderSection($header, $content, $footer) {
    return $('<div></div>')
      .addClass('fc-collapsible-section fc-collapsed')
      .append($('<div></div>')
        .append($header)
        .addClass('fc-collapsible-section-header').click(
          function(e) {
            $(this).siblings('.fc-collapsible-section-content').stop(true, true).slideToggle();
            $(this).parents('.fc-collapsible-section').toggleClass('fc-collapsed');
          }
        )
      )
      .append($('<div></div>').addClass('fc-collapsible-section-content')
        .css({display:'none'}).append($content)
      )
      .append($('<div></div>').addClass('fc-collapsible-section-footer'))
        .append($footer);
  }

  function renderElement($el, data, prepend, append, renderer) {
    if(data.length === 0)
      return function(){};
    return function() {

      if(typeof prepend === 'function')
        $el.append(prepend());
      if(typeof prepend === 'string')
        $el.append(prepend);

      $el.append(renderer(data));

      if(typeof append === 'function')
        $el.append(append());
      if(typeof append === 'string')
        $el.append(append);

      return $el;
    }
  }

  // Set up custom IDMatrix functionality
  var IDMatrix;
  doc.on('onPageRender', function (ev, page) {
    doc.find('body').attr('data-current-page', page);
  });

  doc.on('onFinishFormRender', function () {
    //Withdrawn page
    if (fc.pageId === '585345505acf706f4d8b5141') {
      $('.fc-progress-bar-container').remove();
    }

    if (typeof IDMatrix === 'object') {
      return;
    }

    var tags = fc.getAllFieldTags(true);
    var fieldId = tags.electronicVerification;

    var verification;
    if(typeof formcorp.modules.IDMatrix !== "undefined" && typeof formcorp.modules.IDMatrix.sessions[fieldId] !== "undefined"){
      verification = formcorp.modules.IDMatrix.sessions[fieldId];
    } else {
      // Verification session is not yet defined, do nothing
      return ;
    }

    var body = doc.find('body');
    var section = doc.find('.fc-section-582cfbbd46fde222538b4bb5');

    // Bind on to custom events
    IDMatrix = verification;

    // Perform the background check
    IDMatrix.events.subscribe(IDMatrix.events.const.BACKGROUND_CHECK_DO, function () {
      body.addClass('id-matrix-loading');
      section.attr('data-state', 'running-active-check');
    });

    // Background check was rejected
    IDMatrix.events.subscribe(IDMatrix.events.const.VERIFICATION_BG_CHECK_REJECT, function () {
      body.removeClass('id-matrix-loading');
      section.attr('data-state', 'active-check-screen');
    });

    // Active verification screen is shown
    IDMatrix.events.subscribe(IDMatrix.events.const.VERIFICATION_SHOW_ACTIVE, function () {
      section.attr('data-state', 'active-check-screen');

      var interval = setInterval(function () {
        var expiryElement = section.find('input[name="date-of-expiry"]');

        if (expiryElement.length > 0) {
          expiryElement.mask('99/9999');
          clearInterval(interval);
        }
      }, 50);
    });

    // Perform the active verification
    IDMatrix.events.subscribe(IDMatrix.events.const.SEND_ACTIVE_VERIFICATION, function () {
      body.addClass('id-matrix-loading');
    });

    // Active verification result received
    IDMatrix.events.subscribe(IDMatrix.events.const.RECEIVE_ACTIVE_VERIFICATION_RESULT, function () {
      body.removeClass('id-matrix-loading');
    });

    // Locked out of the application
    IDMatrix.events.subscribe(IDMatrix.events.const.VERIFICATION_LOCKED, function () {
      section.attr('data-state', 'locked');
    });

    // Skipped the application
    IDMatrix.events.subscribe(IDMatrix.events.const.VERIFICATION_SHOW_SKIPPED, function () {
      section.attr('data-state', 'skipped');
    });

    // Verification success
    IDMatrix.events.subscribe(IDMatrix.events.const.VERIFICATION_SUCCESS, function (data) {
      section.attr('data-state', 'success');
      body.removeClass('id-matrix-loading');
      body.addClass('id-matrix-success');

      setTimeout(function () {
        body.find('.trigger').addClass('drawn');
      }, 100);
    });

    // Show the verified screen
    IDMatrix.events.subscribe(IDMatrix.events.const.VERIFICATION_SHOW_VERIFIED, function () {
      section.attr('data-state', 'success');
    });

    // Show the error screen
    IDMatrix.events.subscribe(IDMatrix.events.const.VERIFICATION_SHOW_ERROR, function () {
      body.removeClass('id-matrix-loading');
      section.attr('data-state', 'error');
    });
  });

  // Form expired
  doc.on(fc.jsEvents.onFormExpired, function () {
    var firstName = fc.fields['582be57f5acf707f488b49b5'];
    var expired = doc.find('#session-expired');
    expired.find('span.expiredFirstName').html(firstName);
    expired.show();

    var baseUrl = location.href.split('#')[0];
    location.href = baseUrl + '#/expired';
  });

  // IDMatrix success, load the next page
  doc.on('click', '[data-bind="next-page"]', function () {
    doc.find('body').removeClass('id-matrix-success');
    fc.loadNextPage();
  });

  // TYRO-307: alert the user when application gets withdrawn
  var Status = {
    Archived: 4,
    Withdrawn: 5
  };
  var initialStatus;
  var checkInterval = setInterval(function () {
    $.ajax({
      url: API_BASE + '/public/info?id=' + fc.getSessionId(),
      success: function (result) {
        if (typeof result.success !== 'boolean' || !result.success) {
          return;
        }

        // If no status is set, set now
        if (typeof initialStatus === 'undefined') {
          initialStatus = result.data.status;
        }

        if ([Status.Archived, Status.Withdrawn].indexOf(initialStatus) >= 0) {
          // The application has initially been withdrawn/archived, do nothing (native to builder)
          clearInterval(checkInterval);
          return;
        }

        if ([Status.Archived, Status.Withdrawn].indexOf(result.data.status) >= 0) {
          // Application has been either archived or withdrawn, refresh the page
          window.location.reload();
          clearInterval(checkInterval);
          return;
        }
      }
    });
  }, 3000);

}(jQuery));
