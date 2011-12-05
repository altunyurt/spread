/*
 * Spread: Speed Reading Extension
 */

var doc_body  = $("body");
jQuery.fn.exists = function(){return this.length>0;}

function format(){

    var formatted_str = arguments[0] || '';
    for(var i=1; i<arguments.length; i++){
        var re = new RegExp("\\{"+(i-1)+"}", "gim");
        formatted_str = formatted_str.replace(re, arguments[i]);
    }
    return formatted_str;
}


function getSelectedText()
{
    txt = String(window.getSelection());
    return txt.replace(/^[\s\t]+/g, '').replace(/[\s\t]+$/g, '');
}

function isnotnull(hede){
    return (hede != '' && hede !== null && hede !== undefined)? hede: null;
}

var SPREAD_TEXT_READER = function(content, conf){

    this.conf = {};
    for (var item in conf){
        if (conf[item] !== undefined && conf[item] !== null){
            this.conf[item] = parseInt(conf[item]);
        }
    }
    this.content = String(content).split(' ').filter(isnotnull);
    this.idx = 0;
    this.step = parseInt(this.conf.words);
    this.timer = null;
    this.running = false;
    this.interval = null;
    this.slider = null;

    this.next = function(){
        var c = (this.content.slice(this.idx, this.idx+this.step)).join(' ');
        this.idx += this.step;
        if (c == '' || c === undefined || c === null){
            this.running = false;
            return null;
        }
        return c;
    };

    this.update_interval = function(){
        this.interval = 60000/this.conf.fpm ;
    };

    this.more_words = function(){
        this.step += 1;
        this.update_interval();
        this.updateSettings();
    };

    this.less_words = function(){
        this.step = (this.step >= 2)? this.step -1: 1;
        this.update_interval();
        this.updateSettings();
    };

    this.restart = function(){
        clearInterval(this.timer);
        this.idx = 0;
        this.running = false;
        return this.start();
    };

    this.setSpeed = function(arg){
        clearInterval(this.timer);
        this.running = false;
        this.update_interval();
        this.updateSettings();
        return this.start();
    };


    this.start = function(){
        if (this.running){
            return;
        }
        this.running = true;
        this.timer = setInterval(function(){
            var hede = this.next();
            if (hede === null){
                return this.stop();
            } 
            if(this.slider){
                this.slider.set(this.idx);
            }
            $('spread_reader_body').textContent = hede;
        }, this.interval);
        return this.displaySettings();
    };

    this.stop = function(){
        clearInterval(this.timer);   
        this.running = false;
    };

    this.updateSettings = function(){
        settings = {
            /* frame per minute */
            'fpm': this.conf.fpm, 
            'words': parseInt(this.step),
            'font': parseInt($('spread_reader_body').getStyle('font-size'))
        };

        this.displaySettings();
        chrome.extension.sendRequest({command: 'saveSettings', settings_data: settings});
    };

    this.displaySettings = function(){
        $('infopane').textContent = format('{0} wpm / {1} words / {2}px fonts', 
                this.conf.fpm*this.step, this.step, parseInt($('spread_reader_body').getStyle('font-size')));

    };

    this.update_interval();
    return this;
};



function create_reader(text){
    text = text.replace(/(\w+)([,\.:;\(\)\[\]\"]+)(\w+)/gim, '$1$2 $3');
    var count = text.match(/([^\s\t]+)/gim).length;

    chrome.extension.sendRequest({command:'getSettings'}, 
            function(response){
                var settings = response.settings; 
                var reader = SPREAD_TEXT_READER(text, settings);
                var w_width = $(window).width();
                var w_height = $(window).height()

        var background = $('<div/>', {
            id: 'spread_reader_background',
            style: format("width:{0}px;height:{1}px;", w_width, w_height)
        }).mousedown(function(){
            $('#spread_reader').remove();
            background.remove();
            reader.stop();
        });



    var div = $('<div id="spread_reader"></div>');
    var reader_inner_container = $('<div id="spread_reader_body_container"></div>');
    var reader_inner = $('<div id="spread_reader_body"></div>');
    var infopane = $('<div id="infopane"></div>');
    var sliderBody = $('<div id="spread_reader_slider"></div>')
        .html("<div id='spread_reader_knob'></div><span id='speed_reader_step'></span>");

    var reader_buttons = $('<ul id="spread_reader_buttons"></ul>')
        .html(
                "<li id='spread_reader_start'>start</li>"+
                "<li id='spread_reader_stop'>stop</li>"+
                "<li id='spread_reader_restart'>restart</li>" + 
                "<li><hr></li>" + 
                "<li id='spread_reader_bigger'>bigger</li>"+
                "<li id='spread_reader_smaller'>smaller</li>"+
                "<li><hr></li>" + 
                "<li id='spread_reader_faster'>faster</li>"+
                "<li id='spread_reader_slower'>slower</li>"+
                "<li><hr></li>" + 
                "<li id='spread_reader_more_words'>more words</li>" + 
                "<li id='spread_reader_less_words'>less words</li>"
             );

    //div.makeResizable();
    reader_inner_container
        .append(infopane)
        .append(reader_inner);

    div.append(reader_inner_container)
        .append(reader_buttons);

    doc_body.append(background).append(div);
    div.append(sliderBody);

    var x = (w_width - $(div).width())/2;
    var y = (w_height - $(div).height())/2;
    div.css({'top': y,'left':x});

    div.resize( function(event){
        var x = (w_width - $(div).width())/2;
        var y = (w_height - $(div).height())/2;
        $(this).css({'top': y, 'left':x});

        reader_inner_container
        .css({'width': $(this).width() - (reader_buttons.width() + 3)})
        .css({'height': $(this).height()});

    });

    $('#spread_reader_knob').draggable({
        containment:'parent',
        axis:'y',
        drag:function(e,ui){

            if(!this.par)
            {

                this.par = $(this).parent();
                this.parHeight = this.par.height();
                this.height = $(this).height();
                this.color = $.trim(this.par.attr('class').replace('colorful-slider',''));
            }

            var ratio = 1-(ui.position.top+this.height)/this.parHeight;

        }
    });
    div.trigger('resize');


    $('spread_reader_bigger').click(function(){
        var fontsize = parseInt($('spread_reader_body').getStyle('font-size'));
        $('spread_reader_body').setStyle('font-size', format('{0} !important', fontsize*1.1));
        reader.updateSettings();
    });
    $('spread_reader_smaller').click( function(){
        var fontsize = parseInt($('spread_reader_body').getStyle('font-size'));
        $('spread_reader_body').setStyle('font-size', format('{} !important', fontsize*0.9));
        reader.updateSettings();
    });
    $('spread_reader_faster').click(function(){
        reader.conf.fpm += 20;
        reader.setSpeed();

    });
    $('spread_reader_slower').click(function(){
        reader.conf.fpm = (reader.conf.fpm > 20)? reader.conf.fpm - 20: reader.conf.fpm;
        reader.setSpeed();
    });
    $('spread_reader_restart').click(function(){
        reader.restart();
    });
    $('spread_reader_start').click( function(){
        reader.start();
    });
    $('spread_reader_stop').click(function(){
        reader.stop();
    });
    $('spread_reader_more_words').click( function(){
        reader.more_words();
    });

    $('spread_reader_less_words').click( function(){
        reader.less_words();
    });


            });
}



$(window).mouseup(
        function(event){
            var notifier = $('#spread_notifier');
            if (notifier.exists() && event.target.id !== 'spread_notifier'){
                notifier.remove();
            }else {
                var text = getSelectedText();

                if (text.length){

                    if (!notifier.exists()){
                        var spread_notif = $(format('<div id="{0}">{1}</div>',
                                'spread_notifier',
                                'Speed read this text')).click(function(event){
                                    create_reader(text);
                                    return $(this).remove();
                                }).css({'left': event.pageX + 30, 'top':event.pageY - 50})
                        .appendTo(doc_body);
                    }
                }
            }
            return event;
        }
);


