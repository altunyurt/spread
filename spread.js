/*
 * Spread: Speed Reading Extension
 *
 * Upcoming versions TODO: 
 *  - Problem : fast reading is not related to word count. It directly depends on the visual content blocks.
 *  displaying n words breaks the readability when n words contains x characters in one line and 10x
 *  characters in another, such as the following 2 word blocks : 
 *
 *    some man 
 *    international differences
 *
 *  - Possible Solution: break the content in to reading blocks and split the words by character count 
 * instead of word count. For example a 30 c/s setting may display word groups such as :
 *
 *      article, we will use a pen . - 28 chars
 *      each line (with the cap on) - 27 chars 
 *      but it is recommended that you - 30 chars
 *
 *  For the purpose is to display a readable block, as long as the the visual text block is consistent 
 *  reading and understanding the content would be much easier everytime.
 *
 */

var doc_body  = $("body");
jQuery.fn.exists = function(){return this.length>0;}
var myid = chrome.i18n.getMessage("@@extension_id");
var imagepath = format('chrome-extension://{0}/images/', myid);

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
    return txt.replace(/^[\s\t]+/g, '').replace(/[\s\t]+$/g, '').replace(/[\t\r\n]/g,' ');
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
    this.slider_size = 200;

    this.updateSlider = function(){
        var rate = this.content.length / this.step;
        var slider_pos = this.slider_size * (this.idx / this.step)/ rate;
        this.slider.css({"left": slider_pos});
    };

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
                this.updateSlider(); //().animate({"left": this.idx});
            }
           
            $('#spread_reader_body').text(hede);
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
            'font': parseInt($('#spread_reader_body').css('font-size'))
        };

        this.displaySettings();
        chrome.extension.sendRequest({command: 'saveSettings', settings_data: settings});
    };

    this.displaySettings = function(){
        $('#spread_infopane').text(format('{0} wpm / {1} words / {2}px fonts', 
                this.conf.fpm*this.step, this.step, parseInt($('#spread_reader_body').css('font-size'))));

    };

    this.update_interval();
    return this;
};



function create_reader(text){
    text = text.replace(/(\w+)([,\.:;\(\)\[\]\"]+)(\w+)/gim, '$1$2 $3');
    var count = text.match(/([^\s\t]+)/gim).length;

    chrome.extension.sendRequest(
            {command:'getSettings'}, 
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
                var reader_inner_container = $('<div id="spread_reader_body_container" class="spread_cf"></div>');
                var reader_inner = $('<div id="spread_reader_body"></div>');

                var reader_buttons = $('<ul id="spread_reader_buttons"></ul>')
                    .html(
                            "<li><label>Command</label>" + 
                                format("<img id='spread_reader_start' src='{0}/start.png'>", imagepath) +
                                format("<img id='spread_reader_stop' src='{0}/stop.png'>", imagepath) + 
                            "</li>" + 
                            "<li><label>Font size</label>" +
                                format("<img id='spread_reader_bigger' src='{0}/plus.png'>", imagepath)  +
                                format("<img id='spread_reader_smaller' src='{0}/minus.png'>", imagepath) +
                            "</li>" +
                            "<li><label>Speed</label>" +
                                format( "<img id='spread_reader_faster' src='{0}/plus.png'>", imagepath)  +
                                format( "<img id='spread_reader_slower' src='{0}/minus.png'>", imagepath)  +
                            "</li>" + 
                            "<li><label># words</label>" +
                                format("<img id='spread_reader_more_words' src='{0}/plus.png'>", imagepath)  +  
                                format("<img id='spread_reader_less_words' src='{0}/minus.png'>", imagepath)  +
                            "</li>" +
                            "<li class='spread_right'>" +
                                "<div id='spread_infopane'></div>" +
                                "<div id='spread_reader_slider'>" +
                                    "<div id='spread_reader_knob'></div><span id='speed_reader_step'></span>" +
                                "</div>"+
                            "</li>"
                         );

                //div.resizable();
                reader_inner_container
                    .append(reader_inner);

                div.append(reader_inner_container)
                    .append(reader_buttons);

                doc_body.append(background).append(div);

                reader_inner_container
                .css({'width': w_width * 0.6, 'height': w_height * 0.4});

                var x = (w_width - reader_inner_container.width())/2;
                var y = (w_height - reader_inner_container.height() + reader_buttons.height())/2;
                div.css({'top': y,'left':x});


                $('#spread_reader_slider').css('background-image', format('url({0}/slider_blue_bg.png) !important', imagepath));
                $('#spread_reader_knob').css('background-image', format('url({0}/slider_handle.png) !important', imagepath))
                    .draggable({
                    containment:'parent',
                    axis:'x',
                    drag:function(e,ui){
                        var pos = ui.position.left; 
                        // reader.index üzerinden yer belirletmek lazım
                    }
                });
                reader.slider = $('#spread_reader_knob');


                $('#spread_reader_bigger').click(function(){
                    var fontsize = parseInt($('#spread_reader_body').css('font-size'));
                    $('#spread_reader_body').css({'font-size': format('{0}px !important', fontsize + 3)});
                    reader.updateSettings();
                });
                $('#spread_reader_smaller').click( function(){
                    var fontsize = parseInt($('#spread_reader_body').css('font-size'));
                    $('#spread_reader_body').css({'font-size': format('{0}px !important', fontsize - 3)});
                    reader.updateSettings();
                });
                $('#spread_reader_faster').click(function(){
                    reader.conf.fpm += 20;
                    reader.setSpeed();
                });
                $('#spread_reader_slower').click(function(){
                    reader.conf.fpm = (reader.conf.fpm > 20)? reader.conf.fpm - 20: reader.conf.fpm;
                    reader.setSpeed();
                });
                $('#spread_reader_start').click( function(){
                    reader.restart();
                    $('#spread_reader_start').attr('src', format('{0}/restart.png', imagepath));
                });
                $('#spread_reader_stop').click(function(){
                    reader.stop();
                });
                $('#spread_reader_more_words').click( function(){
                    reader.more_words();
                });

                $('#spread_reader_less_words').click( function(){
                    reader.less_words();
                });


            });
}


chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.command == 'openReader'){
        var text = getSelectedText();
        if (text.length){
            create_reader(text);
        }
    }
});

