/*!
 * jquery.sumoselect - v3.0.3
 * http://hemantnegi.github.io/jquery.sumoselect
 * 2016-12-12
 *
 * Copyright 2015 Hemant Negi
 * Email : hemant.frnz@gmail.com
 * Compressor http://refresh-sf.com/
 */

(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports !== 'undefined') {
        module.exports = factory(require('jquery'));
    } else {
        factory(jQuery);
    }

})(function ($) {

    'namespace sumo';
    $.fn.SumoSelect = function (options) {
        var attrSettings = {};
        var $this = $(this);

        if ($this.attr('data-sumoselect-placeholder')) {
            attrSettings.placeholder = $this.attr('data-sumoselect-placeholder');
        }
        if ($this.attr('data-sumoselect-captionFormat')) {
            attrSettings.captionFormat = $this.attr('data-sumoselect-captionFormat');
        }
        if ($this.attr('data-sumoselect-captionFormatAllSelected')) {
            attrSettings.captionFormatAllSelected = $this.attr('data-sumoselect-captionFormatAllSelected');
        }
        if ($this.attr('data-sumoselect-searchText')) {
            attrSettings.searchText = $this.attr('data-sumoselect-searchText');
        }
        if ($this.attr('data-sumoselect-noMatch')) {
            attrSettings.noMatch = $this.attr('data-sumoselect-noMatch');
        }
        if ($this.attr('data-sumoselect-locale')) {
            attrSettings.locale = $this.attr('data-sumoselect-locale').split(',');
        }
        if ($this.attr('data-sumoselect-prefix')) {
            attrSettings.prefix = $this.attr('data-sumoselect-prefix');
        }

        // This is the easiest way to have default options.
        var settings = $.extend({
            placeholder: 'Выберите',   // Dont change it here.
            csvDispCount: 3,              // display no. of items in multiselect. 0 to display all.
            captionFormat: '{0} Выбрано', // format of caption text. you can set your locale.
            captionFormatAllSelected: '{0} Все выбраны', // format of caption text when all elements are selected. set null to use captionFormat. It will not work if there are disabled elements in select.
            floatWidth: 400,              // Screen width of device at which the list is rendered in floating popup fashion.
            forceCustomRendering: false,  // force the custom modal on all devices below floatWidth resolution.
            nativeOnDevice: ['Android', 'BlackBerry', 'iPhone', 'iPad', 'iPod', 'Opera Mini', 'IEMobile', 'Silk'], //
            outputAsCSV: false,           // true to POST data as csv ( false for Html control array ie. default select )
            csvSepChar: ',',              // separation char in csv mode
            okCancelInMulti: false,       // display ok cancel buttons in desktop mode multiselect also.
            isClickAwayOk: false,         // for okCancelInMulti=true. sets whether click outside will trigger Ok or Cancel (default is cancel).
            triggerChangeCombined: true,  // im multi select mode whether to trigger change event on individual selection or combined selection.
            selectAll: false,             // to display select all button in multiselect mode.|| also select all will not be available on mobile devices.

            search: false,                // to display input for filtering content. selectAlltext will be input text placeholder
            searchText: 'Найти...',      // placeholder for search input
            noMatch: 'Нет совпадений для "{0}"',
            prefix: '',                   // some prefix usually the field name. eg. '<b>Hello</b>'
            locale: ['Ок', 'Отмена', 'Выбрать все'],  // all text that is used. don't change the index.
            up: false,                    // set true to open upside.
            showTitle: false               // set to false to prevent title (tooltip) from appearing
        }, options, attrSettings);

        var ret = this.each(function () {
            var selObj = this; // the original select object.
            if (this.sumo || !$(this).is('select')) return; //already initialized

            this.sumo = {
                E: $(selObj),   //the jquery object of original select element.
                is_multi: $(selObj).attr('multiple'),  //if its a multiple select
                select: '',
                caption: '',
                placeholder: '',
                optDiv: '',
                CaptionCont: '',
                ul: '',
                is_floating: false,
                is_opened: false,
                //backdrop: '',
                mob: false, // if to open device default select
                Pstate: [],

                createElems: function () {
                    var O = this;
                    O.E.wrap('<div class="SumoSelect" >');
                    O.select = O.E.parent();
                    O.caption = $('<span>');
                    O.CaptionCont = $('<p class="CaptionCont SelectBox" role="combobox" aria-expanded="false" aria-haspopup="true"><label><i></i></label></p>')
                        .attr('style', O.E.attr('style'))
                        .prepend(O.caption);
                    O.CaptionCont.attr('tabindex', O.E.attr('tabindex') || 0);
                    O.select.append(O.CaptionCont);

                    // default turn off if no multiselect
                    if (!O.is_multi) settings.okCancelInMulti = false;

                    if (O.E.attr('disabled')) {
                        O.select.addClass('disabled').removeAttr('tabindex');
                        O.CaptionCont.attr('aria-disabled', true);
                    }

                    //if output as csv and is a multiselect.
                    if (settings.outputAsCSV && O.is_multi && O.E.attr('name')) {
                        //create a hidden field to store csv value.
                        O.select.append($('<input class="HEMANT123" type="hidden" />').attr('name', O.E.attr('name')).val(O.getSelStr()));

                        // so it can not post the original select.
                        O.E.removeAttr('name');
                    }

                    //break for mobile rendring.. if forceCustomRendering is false
                    if (O.isMobile() && !settings.forceCustomRendering) {
                        O.setNativeMobile();
                        return;
                    }

                    // if there is a name attr in select add a class to container div
                    if (O.E.attr('name')) O.select.addClass('sumo_' + O.E.attr('name').replace(/\[\]/, ''))

                    //hide original select
                    O.E.addClass('SumoUnder').attr('tabindex', '-1');

                    //## Creating the list...
                    O.optDiv = $('<div class="optWrapper ' + (settings.up ? 'up' : '') + '">');

                    //branch for floating list in low res devices.
                    O.floatingList();

                    //Creating the markup for the available options
                    O.ul = $('<ul class="options" role="tree" aria-expanded="false" aria-hidden="true" >');

                    if (O.is_multi) {
                        O.ul.attr('aria-multiselectable', true);
                    }

                    O.optDiv.append(O.ul);

                    // Select all functionality
                    if (settings.selectAll && O.is_multi) O.SelAll();

                    // search functionality
                    if (settings.search) O.Search();

                    O.ul.append(O.prepItems(O.E.children()));

                    //if multiple then add the class multiple and add OK / CANCEL button
                    if (O.is_multi) O.multiSelelect();

                    O.select.append(O.optDiv);
                    O.basicEvents();
                    O.selAllState();
                },

                prepItems: function (opts, d) {
                    var lis = [], O = this;
                    $(opts).each(function (i, opt) {       // parsing options to li
                        opt = $(opt);
                        lis.push(opt.is('optgroup') ?
                            $('<li class="group ' + (opt[0].disabled ? 'disabled' : ' ') + '" role="group" aria-label="' + opt.attr('label') + '"><label>' + opt.attr('label') + '</label><ul></ul></li>')
                                .find('ul')
                                .append(O.prepItems(opt.children(), opt[0].disabled))
                                .end()
                            :
                            O.createLi(opt, d)
                        );
                    });
                    return lis;
                },

                //## Creates a LI element from a given option and binds events to it
                //## returns the jquery instance of li (not inserted in dom)
                createLi: function (opt, d) {
                    var O = this;

                    if (!opt.attr('value')) opt.attr('value', opt.val());
                    var li = $('<li class="opt" role="treeitem" tabindex="-1" aria-selected="false" aria-disabled="false"><label>' + opt.text() + '</label></li>');
                    li.attr('aria-label', opt.text());
                    li.data('opt', opt);    // store a direct reference to option.
                    opt.data('li', li);    // store a direct reference to list item.
                    if (O.is_multi) li.prepend('<span><i></i></span>');

                    if (opt[0].disabled || d)
                        li = li.addClass('disabled').attr('aria-disabled', true);

                    O.onOptClick(li);

                    if (opt[0].selected)
                        li.addClass('selected').attr('aria-selected', true);

                    if (opt.attr('class'))
                        li.addClass(opt.attr('class'));

                    if (opt.attr('title'))
                        li.attr('title', opt.attr('title'));

                    return li;
                },

                //## Returns the selected items as string in a Multiselect.
                getSelStr: function () {
                    // get the pre selected items.
                    var sopt = [];
                    this.E.find('option:selected').each(function () {
                        sopt.push($(this).val());
                    });
                    return sopt.join(settings.csvSepChar);
                },

                //## THOSE OK/CANCEL BUTTONS ON MULTIPLE SELECT.
                multiSelelect: function () {
                    var O = this;
                    O.optDiv.addClass('multiple');
                    O.okbtn = $('<p tabindex="0" class="btnOk" role="button">' + settings.locale[0] + '</p>').click(function () {
                        //if combined change event is set.
                        O._okbtn();
                        O.hideOpts();
                    });
                    O.cancelBtn = $('<p tabindex="0" class="btnCancel" role="button">' + settings.locale[1] + '</p>').click(function () {
                        O._cnbtn();
                        O.hideOpts();
                    });
                    var btns = O.okbtn.add(O.cancelBtn);
                    O.optDiv.append($('<div class="MultiControls">').append(btns));

                    // handling keyboard navigation on ok cancel buttons.
                    btns.on('keydown.sumo', function (e) {
                        var el = $(this);
                        switch (e.which) {
                            case 32: // space
                            case 13: // enter
                                el.trigger('click');
                                break;

                            case 9:  //tab
                                return;
                                // if (el.hasClass('btnOk')) return;
                            case 27: // esc
                                O._cnbtn();
                                O.hideOpts();
                                return;
                        }
                        e.stopPropagation();
                        e.preventDefault();
                    });
                },

                _okbtn: function () {
                    var O = this, cg = 0;
                    //if combined change event is set.
                    if (settings.triggerChangeCombined) {
                        //check for a change in the selection.
                        if (O.E.find('option:selected').length != O.Pstate.length) {
                            cg = 1;
                        }
                        else {
                            O.E.find('option').each(function (i, e) {
                                if (e.selected && O.Pstate.indexOf(i) < 0) cg = 1;
                            });
                        }

                        if (cg) {
                            O.callChange();
                            O.setText();
                        }
                    }
                },

                _cnbtn: function () {
                    var O = this;
                    //remove all selections
                    O.E.find('option:selected').each(function () {
                        this.selected = false;
                    });
                    O.optDiv.find('li.selected').removeClass('selected').attr('aria-selected', false);

                    //restore selections from saved state.
                    for (var i = 0; i < O.Pstate.length; i++) {
                        O.E.find('option')[O.Pstate[i]].selected = true;
                        O.ul.find('li.opt').eq(O.Pstate[i]).addClass('selected').attr('aria-selected', true);
                    }
                    O.selAllState();
                },

                SelAll: function () {
                    var O = this;
                    if (!O.is_multi)return;
                    O.selAll = $('<p class="select-all"><span><i></i></span><label>' + settings.locale[2] + '</label></p>');
                    O.optDiv.addClass('selall');
                    O.selAll.on('click', function () {
                        O.selAll.toggleClass('selected');
                        O.toggSelAll(O.selAll.hasClass('selected'), 1);
                        //O.selAllState();
                    });

                    O.optDiv.prepend(O.selAll);
                },

                // search module (can be removed if not required.)
                Search: function () {
                    var O = this,
                        cc = O.CaptionCont.addClass('search'),
                        P = $('<p class="no-match">');

                    O.ftxt = $('<input type="text" class="search-txt" value="" placeholder="' + settings.searchText + '">')
                        .on('click', function (e) {
                            e.stopPropagation();
                        });
                    cc.append(O.ftxt);
                    O.optDiv.children('ul').after(P);

                    O.ftxt.on('keyup.sumo', function () {
                        var hid = O.optDiv.find('ul.options li.opt').each(function (ix, e) {
                            var e = $(e),
                                opt = e.data('opt')[0];
                            opt.hidden = e.text().toLowerCase().indexOf(O.ftxt.val().toLowerCase()) < 0;
                            e.toggleClass('hidden', opt.hidden);
                        }).not('.hidden');

                        P.html(settings.noMatch.replace(/\{0\}/g, '<em></em>')).toggle(!hid.length);
                        P.find('em').text(O.ftxt.val());
                        O.selAllState();
                    });
                },

                selAllState: function () {
                    var O = this;
                    if (settings.selectAll && O.is_multi) {
                        var sc = 0, vc = 0;
                        var dc = 0;

                        O.optDiv.find('li.opt').not('.hidden').each(function (ix, e) {
                            if ($(e).hasClass('selected')) sc++;
                            if (!$(e).hasClass('disabled')) vc++;
                            if ($(e).hasClass('disabled selected')) dc++;
                        });

                        //select all checkbox state change.
                        if (sc == vc + dc) {
                            O.selAll.removeClass('partial').addClass('selected');
                        } else if (sc == 0) {
                            O.selAll.removeClass('selected partial');
                        } else {
                            O.selAll.addClass('partial')
                        }//.removeClass('selected');
                    }
                },

                // !!!!!!!!!!!!!!!
                // показывает дропдаун и устанавливает начальный фокус
                showOpts: function (fromNav) {
                    var O = this;
                    if (O.E.attr('disabled')) return; // if select is disabled then retrun
                    O.E.trigger('sumo:opening', O);
                    O.is_opened = true;
                    O.select.addClass('open');
                    O.CaptionCont.attr('aria-expanded', true);
                    O.ul.attr('aria-expanded', true).attr('aria-hidden', false);
                    O.E.trigger('sumo:opened', O);

                    // handle focus here
                    if (O.ftxt && !fromNav) {
                        O.ftxt.focus();
                    } else {
                        // set focus on first sel li
                        O.optDiv.find('li.sel').first().focus();
                    }

                    // hide options on click outside.
                    $(document).on('click.sumo', function (e) {
                        if (!O.select.is(e.target)                  // if the target of the click isn't the container...
                            && O.select.has(e.target).length === 0) { // ... nor a descendant of the container
                            if (!O.is_opened)return;
                            O.hideOpts();
                            if (settings.okCancelInMulti) {
                                if (settings.isClickAwayOk)
                                    O._okbtn();
                                else
                                    O._cnbtn();
                            }
                        }
                    });

                    if (O.is_floating) {
                        var H = O.optDiv.children('ul').outerHeight() + 2;  // +2 is clear fix
                        if (O.is_multi) H = H + parseInt(O.optDiv.css('padding-bottom'));
                        O.optDiv.css('height', H);
                        $('body').addClass('sumoStopScroll');
                    }

                    O.setPstate();
                },

                //maintain state when ok/cancel buttons are available storing the indexes.
                setPstate: function () {
                    var O = this;
                    if (O.is_multi && (O.is_floating || settings.okCancelInMulti)) {
                        O.Pstate = [];
                        // assuming that find returns elements in tree order
                        O.E.find('option').each(function (i, e) {
                            if (e.selected) O.Pstate.push(i);
                        });
                    }
                },

                // !!!!!!!!!!!!!!!
                callChange: function () {
                    this.E.trigger('change').trigger('click');
                },

                // !!!!!!!!!!!!!!!
                // скрывает дропдаун и устанавливает фокус на корень
                hideOpts: function () {
                    var O = this;
                    if (O.is_opened) {
                        O.E.trigger('sumo:closing', O);
                        O.is_opened = false;
                        O.select.removeClass('open').find('ul li.sel').removeClass('sel').attr('tabindex', '-1');
                        O.CaptionCont.attr('aria-expanded', 'false');
                        O.ul.attr('aria-expanded', false).attr('aria-hidden', true);
                        O.E.trigger('sumo:closed', O);
                        $(document).off('click.sumo');
                        $('body').removeClass('sumoStopScroll');
                        O.CaptionCont.focus();

                        // clear the search
                        if (settings.search) {
                            O.ftxt.val('');
                            O.ftxt.trigger('keyup.sumo');
                        }
                    }
                },

                findNextLi: function (li) {
                    var O = this;

                    if (li.hasClass('disabled')) {
                        li = li.next(':not(disabled)');
                        if (!li.length) return [];
                    }

                    if (li.hasClass('hidden')) {
                        li = li.next(':not(hidden)');
                        if (!li.length) return [];
                    }

                    if (li.hasClass('group')) {
                        var lis = li.find('li').not('.disabled').not('.hidden').first();

                        if (!lis.length) {
                            li = li.next();

                            if (!li.length) {
                                return [];
                            } else {
                                return O.findNextLi(li);
                            }
                        } else {
                            li = lis;
                        }
                    }

                    return li || [];
                },

                // !!!!!!!!!!!!!!!
                // используется только с клавиатуры
                // уставливает класс выделения и фокус
                setOnOpen: function (fromNav) {
                    var O = this,
                        // li = O.optDiv.find('li.opt:not(.hidden)').eq(settings.search? 0 : O.E[0].selectedIndex >= 0 ? O.E[0].selectedIndex : 0);
                        li = O.optDiv.find('li.opt:not(.hidden)').eq(O.E[0].selectedIndex >= 0 ? O.E[0].selectedIndex : 0);

                    if (!li.length) {
                        li = O.optDiv.find('li.opt:not(.hidden)').eq(0);
                    }

                    li = O.findNextLi(li);

                    if (!li.length) return;

                    O.optDiv.find('li.sel').removeClass('sel').attr('tabindex', '-1');
                    li.addClass('sel').attr('tabindex', '0');
                    O.showOpts(fromNav);
                },

                // !!!!!!!!!!!!!!!
                // переключение выделенного пункта с клавы
                nav: function (up, fromNav) {
                    var O = this, c,
                        s = O.ul.find('li.opt:not(.disabled, .hidden)'),
                        selItem = O.ul.find('li.opt.sel:not(.hidden)'),
                        tabIndexItem = O.ul.find('li[tabindex*="0"]').not('.disabled').not('.hidden'),
                        sel = selItem.length ? selItem : tabIndexItem,
                        idx = s.index(sel);

                    if (O.is_opened && sel.length) {
                        if (up && idx > 0) {
                            c = s.eq(idx - 1);
                        } else if (up && idx === 0 && settings.search) {
                            O.ftxt.focus();
                            return;
                        } else if (!up && idx < s.length - 1 && idx > -1) {
                            c = s.eq(idx + 1);
                        } else {
                            return; // if no items before or after
                        }

                        s.attr('tabindex', '-1');
                        sel.removeClass('sel');
                        sel = c.addClass('sel').attr('tabindex', '0').focus();

                        // setting sel item to visible view.
                        var ul = O.ul,
                            st = ul.scrollTop(),
                            t = sel.position().top + st;
                        if (t >= st + ul.height() - sel.outerHeight())
                            ul.scrollTop(t - ul.height() + sel.outerHeight());
                        if (t < st)
                            ul.scrollTop(t);

                    }
                    else
                        O.setOnOpen(fromNav);
                },

                // !!!!!!!!!!!!!!!
                // основные евенты
                basicEvents: function () {
                    var O = this;
                    O.CaptionCont.click(function (evt) {
                        O.E.trigger('click');
                        if (O.is_opened) {
                            if (settings.okCancelInMulti) {
                                if (settings.isClickAwayOk)
                                    O._okbtn();
                                else
                                    O._cnbtn();
                            }
                            O.hideOpts();
                        } else {
                            O.showOpts();
                        }
                        evt.stopPropagation();
                    });

                    O.select.on('keydown.sumo', function (e) {
                        switch (e.which) {
                            case 38: // up
                                if (settings.search) {
                                    if (O.is_opened) {
                                        O.nav(true, true);
                                    } else {
                                        O.showOpts();
                                    }
                                } else {
                                    O.nav(true);
                                }
                                break;

                            case 40: // down
                                if (settings.search) {
                                    if (O.is_opened) {
                                        O.nav(false, true);
                                    } else {
                                        O.showOpts();
                                    }

                                } else {
                                    O.nav(false);
                                }
                                break;

                            case 65: // shortcut ctrl + a to select all and ctrl + shift + a to unselect all.
                                if (O.is_multi && e.ctrlKey) {
                                    O.toggSelAll(!e.shiftKey, 1);
                                    break;
                                }
                                else
                                    return;

                            case 32: // space
                                if (settings.search && O.ftxt.is(e.target))return;
                            case 13: // enter
                                if (settings.search) {
                                    if (O.is_opened) {
                                        O.optDiv.find('ul li.sel').trigger('click');
                                    } else {
                                        O.showOpts();
                                    }
                                } else {
                                    if (O.is_opened) {
                                        O.optDiv.find('ul li.sel').trigger('click');
                                    } else {
                                        O.setOnOpen();
                                    }
                                }
                                break;
                            case 9:	 //tab
                                if (!settings.okCancelInMulti) {
                                    O.hideOpts();
                                }
                                return;
                            case 27: // esc
                                if (settings.okCancelInMulti) O._cnbtn();
                                O.hideOpts();
                                return;

                            default:
                                return; // exit this handler for other keys
                        }
                        e.preventDefault(); // prevent the default action (scroll / move caret)
                    });

                    $(window).on('resize.sumo', function () {
                        O.floatingList();
                    });
                },

                // !!!!!!!!!!!!!!!
                // клик на элемент списка
                onOptClick: function (li) {
                    var O = this;
                    li.click(function () {
                        var li = $(this);
                        if (li.hasClass('disabled'))return;
                        var txt = "";
                        if (O.is_multi) {
                            li.toggleClass('selected');
                            li.data('opt')[0].selected = li.hasClass('selected');

                            if (li.hasClass('selected')) {
                                li.attr('aria-selected', true);
                                O.optDiv.find('li').attr('tabindex', '-1');
                            } else {
                                li.attr('aria-selected', false);
                            }

                            var selLi = O.optDiv.find('li.sel');

                            if (selLi.length) {
                                selLi.removeClass('sel');
                                li.addClass('sel');
                            }

                            li.attr('tabindex', '0').focus();
                            O.selAllState();
                        }
                        else {
                            li.parent().find('li.selected').removeClass('selected').attr('aria-selected', false).attr('tabindex', '-1'); //if not multiselect then remove all selections from this list
                            li.toggleClass('selected').attr('aria-selected', true).attr('tabindex', '0');
                            li.data('opt')[0].selected = true;
                        }

                        //branch for combined change event.
                        if (!(O.is_multi && settings.triggerChangeCombined && (O.is_floating || settings.okCancelInMulti))) {
                            O.setText();
                            O.callChange();
                        }

                        if (!O.is_multi) O.hideOpts(); //if its not a multiselect then hide on single select.
                    });
                },

                setText: function () {
                    var O = this;
                    O.placeholder = "";
                    if (O.is_multi) {
                        // var sels = O.E.find(':selected').not(':disabled'); //selected options.
                        var sels = O.E.find(':selected'); //selected options.

                        for (var i = 0; i < sels.length; i++) {
                            if (i + 1 >= settings.csvDispCount && settings.csvDispCount) {
                                if (sels.length == O.E.find('option').length && settings.captionFormatAllSelected) {
                                    O.placeholder = settings.captionFormatAllSelected.replace(/\{0\}/g, sels.length) + ',';
                                } else {
                                    O.placeholder = settings.captionFormat.replace(/\{0\}/g, sels.length) + ',';
                                }

                                break;
                            }
                            else O.placeholder += $(sels[i]).text() + ", ";
                        }
                        O.placeholder = O.placeholder.replace(/,([^,]*)$/, '$1'); //remove unexpected "," from last.
                    }
                    else {
                        O.placeholder = O.E.find(':selected').not(':disabled').text();
                    }

                    var is_placeholder = false;

                    if (!O.placeholder) {

                        is_placeholder = true;

                        O.placeholder = O.E.attr('placeholder');
                        if (!O.placeholder)                  //if placeholder is there then set it
                            O.placeholder = O.E.find('option:disabled:selected').text();
                    }

                    O.placeholder = O.placeholder ? (settings.prefix + ' ' + O.placeholder) : settings.placeholder

                    //set display text
                    O.caption.html(O.placeholder);
                    if (settings.showTitle) O.CaptionCont.attr('title', O.placeholder);

                    //set the hidden field if post as csv is true.
                    var csvField = O.select.find('input.HEMANT123');
                    if (csvField.length) csvField.val(O.getSelStr());

                    //add class placeholder if its a placeholder text.
                    if (is_placeholder) O.caption.addClass('placeholder'); else O.caption.removeClass('placeholder');
                    return O.placeholder;
                },

                isMobile: function () {

                    // Adapted from http://www.detectmobilebrowsers.com
                    var ua = navigator.userAgent || navigator.vendor || window.opera;

                    // Checks for iOs, Android, Blackberry, Opera Mini, and Windows mobile devices
                    for (var i = 0; i < settings.nativeOnDevice.length; i++) if (ua.toString().toLowerCase().indexOf(settings.nativeOnDevice[i].toLowerCase()) > 0) return settings.nativeOnDevice[i];
                    return false;
                },

                setNativeMobile: function () {
                    var O = this;
                    O.E.addClass('SelectClass')//.css('height', O.select.outerHeight());
                    O.mob = true;
                    O.E.change(function () {
                        O.setText();
                    });
                },

                floatingList: function () {
                    var O = this;
                    //called on init and also on resize.
                    //O.is_floating = true if window width is < specified float width
                    O.is_floating = $(window).width() <= settings.floatWidth;

                    //set class isFloating
                    O.optDiv.toggleClass('isFloating', O.is_floating);

                    //remove height if not floating
                    if (!O.is_floating) O.optDiv.css('height', '');

                    //toggle class according to okCancelInMulti flag only when it is not floating
                    O.optDiv.toggleClass('okCancelInMulti', settings.okCancelInMulti && !O.is_floating);
                },

                /**************************************************************/
                //HELPERS FOR OUTSIDERS
                // validates range of given item operations
                vRange: function (i) {
                    var O = this;
                    var opts = O.E.find('option');
                    if (opts.length <= i || i < 0) throw "index out of bounds"
                    return O;
                },

                //toggles selection on c as boolean.
                toggSel: function (c, i) {
                    var O = this;
                    var opt;

                    if (typeof(i) === "number") {
                        O.vRange(i);
                        opt = O.E.find('option')[i];
                    }
                    else {
                        opt = O.E.find('option[value="' + i + '"]')[0] || 0;
                    }
                    if (!opt || opt.disabled)
                        return;

                    if (opt.selected != c) {
                        opt.selected = c;
                        var $opt = $(opt);
                        if (!O.mob) $opt.data('li').toggleClass('selected', c);

                        if ($opt.data('li').hasClass('selected')) {
                            $opt.data('li').attr('aria-selected', true);
                        } else {
                            $opt.data('li').attr('aria-selected', false);
                        }

                        O.callChange();
                        O.setPstate();
                        O.setText();
                        O.selAllState();
                    }
                },

                //toggles disabled on c as boolean.
                toggDis: function (c, i) {
                    var O = this.vRange(i);
                    O.E.find('option')[i].disabled = c;
                    if (c) O.E.find('option')[i].selected = false;
                    if (!O.mob) {
                        var $li = O.optDiv.find('ul.options li').eq(i);
                        $li.toggleClass('disabled', c).removeClass('selected');

                        if ($li.hasClass('disabled')) {
                            $li.attr('aria-disabled', true);
                        } else {
                            $li.attr('aria-disabled', false);
                        }
                    }
                    O.setText();
                },

                // toggle disable/enable on complete select control
                toggSumo: function (val) {
                    var O = this;
                    O.enabled = val;
                    O.select.toggleClass('disabled', val);

                    if (val) {
                        O.E.attr('disabled', 'disabled');
                        O.CaptionCont.attr('aria-disabled', true);
                    }
                    else {
                        O.E.removeAttr('disabled');
                        O.CaptionCont.attr('aria-disabled', false);
                    }

                    return O;
                },

                // toggles all option on c as boolean.
                // set direct=false/0 bypasses okCancelInMulti behaviour.
                toggSelAll: function (c, direct) {
                    var O = this;

                    if (!O.mob) {
                        var selItem = O.optDiv.find('li.sel');
                        var selected = selItem.length ? selItem : O.ul.find('li[tabindex*="0"]');
                    }

                    O.E.find('option:not(:disabled,:hidden)')
                        .each(function (ix, e) {
                            var is_selected = e.selected,
                                e = $(e).data('li');
                            if (e.hasClass('hidden'))return;
                            if (!!c) {
                                if (!is_selected) e.trigger('click');
                            }
                            else {
                                if (is_selected) e.trigger('click');
                            }
                        });


                    if (!O.mob) {
                        O.optDiv.find('li.opt').removeClass('sel').attr('tabindex', '-1');
                        selected.attr('tabindex', '0').focus();
                    }

                    if (selItem.length) {
                        selected.addClass('sel');
                    }

                    // for external use
                    if (!direct) {
                        if (!O.mob && O.selAll) O.selAll.removeClass('partial').toggleClass('selected', !!c);
                        O.callChange();
                        O.setText();
                        O.setPstate();
                    }
                },

                /**************************************************************/
                /* outside accessibility options
                 which can be accessed from the element instance.
                 */
                reload: function () {
                    var elm = this.unload();
                    return $(elm).SumoSelect(settings);
                },

                unload: function () {
                    var O = this;
                    O.select.before(O.E);
                    O.E.show();
                    O.E.removeClass('SumoUnder');
                    var tabindex = O.CaptionCont.attr('tabindex');

                    if (tabindex !== 0) {
                        O.E.attr('tabindex', tabindex);
                    } else {
                        O.E.attr('tabindex', '');
                    }

                    if (settings.outputAsCSV && O.is_multi && O.select.find('input.HEMANT123').length) {
                        O.E.attr('name', O.select.find('input.HEMANT123').attr('name')); // restore the name;
                    }
                    O.select.remove();
                    delete selObj.sumo;
                    return selObj;
                },

                //## add a new option to select at a given index.
                add: function (val, txt, i) {
                    if (typeof val == "undefined") throw "No value to add"

                    var O = this;
                    opts = O.E.find('option')
                    if (typeof txt == "number") {
                        i = txt;
                        txt = val;
                    }
                    if (typeof txt == "undefined") {
                        txt = val;
                    }

                    opt = $("<option></option>").val(val).html(txt);

                    if (opts.length < i) throw "index out of bounds"

                    if (typeof i == "undefined" || opts.length == i) { // add it to the last if given index is last no or no index provides.
                        O.E.append(opt);
                        if (!O.mob) O.ul.append(O.createLi(opt));
                    }
                    else {
                        opts.eq(i).before(opt);
                        if (!O.mob) O.ul.find('li.opt').eq(i).before(O.createLi(opt));
                    }

                    return selObj;
                },

                //## removes an item at a given index.
                remove: function (i) {
                    var O = this.vRange(i);
                    O.E.find('option').eq(i).remove();
                    if (!O.mob) O.optDiv.find('ul.options li').eq(i).remove();
                    O.setText();
                },

                //## Select an item at a given index.
                selectItem: function (i) {
                    this.toggSel(true, i);
                },

                //## UnSelect an iten at a given index.
                unSelectItem: function (i) {
                    this.toggSel(false, i);
                },

                //## Select all items  of the select.
                selectAll: function () {
                    this.toggSelAll(true);
                },

                //## UnSelect all items of the select.
                unSelectAll: function () {
                    this.toggSelAll(false);
                },

                //## Disable an iten at a given index.
                disableItem: function (i) {
                    this.toggDis(true, i)
                },

                //## Removes disabled an iten at a given index.
                enableItem: function (i) {
                    this.toggDis(false, i)
                },

                //## New simple methods as getter and setter are not working fine in ie8-
                //## variable to check state of control if enabled or disabled.
                enabled: true,
                //## Enables the control
                enable: function () {
                    return this.toggSumo(false)
                },

                //## Disables the control
                disable: function () {
                    return this.toggSumo(true)
                },


                init: function () {
                    var O = this;
                    O.createElems();
                    O.setText();
                    return O;
                }

            };

            selObj.sumo.init();
        });

        return ret.length == 1 ? ret[0] : ret;
    };

});
