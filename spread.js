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
 * variables: uniqueVariableName
 * functions: unique_function_name
 *
 */

jQuery.fn.exists = function(){ 
    return this.length > 0; 
};

var myid = chrome.i18n.getMessage("@@extension_id");
var imagePath = format('chrome-extension://{0}/images/', myid);

function format(){
    var formatted_str = arguments[0] || '';
    var re, i;
    for(i=1; i<arguments.length; i++){
        re = new RegExp("\\{"+(i-1)+"}", "gim");
        formatted_str = formatted_str.replace(re, arguments[i]);
    }
    return formatted_str;
}


function get_selected_text()
{
    txt = String(window.getSelection());
    return txt.replace(/(^[\s\t]+|[\s\t]+$)/g, '').replace(/[\t\r\n]/g,' ');
}

function is_not_null(obj){
    return $.inArray(obj)? obj: null;
}

var SPREAD_TEXT_READER = function(content, conf){

    this.conf = {}; 
    this.set_conf = function(c){
        var item; 
        for (item in c){
            if (is_not_null(c[item])){
                this.conf[item] = parseInt(c[item], 10);
            }
        }
    };

    this.content = String(content).split(' ').filter(is_not_null);
    this.idx = 0;
    this.timer = null;
    this.running = false;
    this.interval = null;
    this.slider = null;
    this.slider_size = 200;
    this.set_conf(conf);
    this.textBlocks = [];

    this.update_slider = function(){
        var rate = this.content.length / this.conf.chars;
        var slider_pos = this.slider_size * (this.idx / this.conf.chars)/ rate;
        this.slider.css({"left": slider_pos});
    };


    this.update_interval = function(){
        this.interval = 60000/this.conf.fpm ;
    };

    this.next = function(){

        if (this.idx == this.content.length - 1){
            /*
             * stop running if at the end
             */
            return null;
        }

        var c = this.content.slice(this.idx);
        var temp_length = 0;
        var tempidx = this.idx ;
        var next_length = 0;

        for(var i=0; i < c.length; i++){
            temp_length += c[i].length;

            if (temp_length == this.conf.chars){
                // we have all the neded text
                this.idx += i + 1;
                return this.content.slice(tempidx, this.idx).join(' ');
            } else {
                // if lesser, check the next element 
                if (temp_length < this.conf.chars){
                    // are we at the end?
                    if (i == c.length -1 ){
                        this.idx = this.content.length;
                        return this.content.slice(tempidx, this.idx ).join(' ');
                    }
                    
                    next_length = (c[i + 1]).length;
                    /*
                     * if next word is longer then our text limit,
                     * then display all we got
                     */
                    if (next_length >= this.conf.chars){
                        this.idx += i + 1;
                        return this.content.slice(tempidx, this.idx).join(' ');
                    }
                    /*
                     * if the text we have + next word is longer than the limit
                     * than check if we need the next word.
                     *
                     * this.conf.chars == 10
                     * n words = 8 
                     * n + 1 words = 13
                     * 13 + 8 /2 > 10, then we display n words, else 
                     * display n + 1 words for readability
                     */
                    if (temp_length + next_length > this.conf.chars){
                        if ((2 * temp_length + next_length) / 2 > this.conf.chars){
                            // we don't need the word
                            this.idx += i + 1;
                            return this.content.slice(tempidx, this.idx ).join(' ');
                        }
                        // we need the word, roll on
                    } 
                } else {
                    this.idx += i + 1;
                    return this.content.slice(tempidx, this.idx).join(' ');
                }
            }
        }
        this.idx = this.content.length - 1;
        return this.content.slice(tempidx).join(' ');
    };

    this.more_chars = function(arg){
        this.conf.chars += arg;
        return this.update_settings();
    };

    this.less_chars = function(arg){
        this.conf.chars -= ((this.conf.chars > arg )? arg: 0);
        return this.update_settings();
    };

    this.restart = function(){
        if(this.running){
           this.stop();
        }
        this.idx = 0;
        return this.start();
    };

    this.speed_up = function(arg){
        this.conf.fpm += arg;
        this.update_interval();
        return this.update_settings();
    }

    this.slow_down = function(arg){
        this.conf.fpm -= ((this.conf.fpm > arg)? arg: 0);
        this.update_interval();
        return this.update_settings();
    }

    this.increase_font_size = function(arg){
        this.conf.font += arg;
        return this.update_settings();
    };

    this.decrease_font_size = function(arg){
        this.conf.font -= ((this.conf.font > arg )? arg: 0);
        return this.update_settings();
    };

    this.start = function(){
        if (this.running){
            return;
        }
        this.running = true;
        this.timer = setInterval(function(){
            
            var next_block = this.next();
            if (!is_not_null(next_block)){
                return this.stop();
            } 
            
            //if(this.slider){
            //    this.updateSlider(); //().animate({"left": this.idx});
            //}
           
            $('#spread_reader_body').text(next_block);
            
        }, this.interval);
        return this.display_settings();
    };

    this.stop = function(){
        this.running = false;
        clearInterval(this.timer);   
    };

    this.update_settings = function(){
        settings = {
            'fpm': this.conf.fpm, /* frame per minute */
            'chars': this.conf.chars,
            'font': this.conf.font
        };

        this.display_settings();
        chrome.extension.sendRequest({
            command: 'saveSettings', 
            settings_data: settings
        });
    };

    this.display_settings = function(){
        $('#spread_infopane').text(
                format('{0} cpm / {1} chars / {2}px fonts', 
                    this.conf.fpm * this.conf.chars, 
                    this.conf.chars, 
                    parseInt($('#spread_reader_body')
            .css('font-size'), 10)));

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
                                format("<img id='spread_reader_start' title='(Re)Start' src='{0}/start.png'>", imagePath) +
                                format("<img id='spread_reader_stop' title='Stop' src='{0}/stop.png'>", imagePath) + 
                            "</li>" + 
                            "<li><label>Font size</label>" +
                                format("<img id='spread_reader_bigger' title='Increase font size' src='{0}/plus.png'>", imagePath)  +
                                format("<img id='spread_reader_smaller' title='Decrease font size' src='{0}/minus.png'>", imagePath) +
                            "</li>" +
                            "<li><label>Speed</label>" +
                                format( "<img id='spread_reader_faster' title='Speed up' src='{0}/plus.png'>", imagePath)  +
                                format( "<img id='spread_reader_slower' title='Slow down' src='{0}/minus.png'>", imagePath)  +
                            "</li>" + 
                            "<li><label># characters</label>" +
                                format("<img id='spread_reader_more_chars' title='Show more characters' src='{0}/plus.png'>", imagePath)  +  
                                format("<img id='spread_reader_less_chars' title='Show less characters' src='{0}/minus.png'>", imagePath)  +
                            "</li>" +
                            "<li class='spread_right'>" +
                                "<div id='spread_infopane'></div>" +
                                /*"<div id='spread_reader_slider'>" +
                                    "<div id='spread_reader_knob'></div><span id='speed_reader_step'></span>" +
                                "</div>"+*/
                            "</li>"
                         );

                //div.resizable();
                reader_inner_container
                    .append(reader_inner);

                div.append(reader_inner_container)
                    .append(reader_buttons);

                $('body').append(background).append(div);

                reader_inner_container.css({
                    'width': w_width * 0.6, 
                    'height': w_height * 0.4
                });

                var x = (w_width - reader_inner_container.width())/2;
                var y = (w_height - reader_inner_container.height() + reader_buttons.height())/2;
                div.css({'top': y,'left':x});

                reader.display_settings();


                //$('#spread_reader_slider').css('background-image', format('url({0}/slider_blue_bg.png) !important', imagePath));
                //$('#spread_reader_knob').css('background-image', format('url({0}/slider_handle.png) !important', imagePath))
                //    .draggable({
                //    containment:'parent',
                //    axis:'x',
                //    drag:function(e,ui){
                //        var pos = ui.position.left; 
                //        // reader.index üzerinden yer belirletmek lazım
                //    }
                //});
                //reader.slider = $('#spread_reader_knob');


                $('#spread_reader_bigger').click(function(){
                    reader.increase_font_size(2);
                    return $('#spread_reader_body').css({'font-size': format('{0}px !important', reader.conf.font)});
                });

                $('#spread_reader_smaller').click( function(){
                    reader.decrease_font_size(2);
                    return $('#spread_reader_body').css({'font-size': format('{0}px !important', reader.conf.font)});
                });

                $('#spread_reader_faster').click(function(){
                    return reader.speed_up(20);
                });
                $('#spread_reader_slower').click(function(){
                    return reader.slow_down(20);
                });
                $('#spread_reader_start').click( function(){
                    reader.restart();
                    return $('#spread_reader_start').attr('src', format('{0}/restart.png', imagePath));
                });
                $('#spread_reader_stop').click(function(){
                    return reader.stop();
                });
                $('#spread_reader_more_chars').click( function(){
                    return reader.more_chars(2);
                });

                $('#spread_reader_less_chars').click( function(){
                    return reader.less_chars(2);
                });


            });
}


chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.command == 'openReader'){
        var text = get_selected_text();
        if (text.length){
            create_reader(text);
        }
    }
});

