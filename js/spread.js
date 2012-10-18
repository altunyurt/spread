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




function is_not_null(obj){
    return $.inArray(obj)? obj: null;
}

var SPREAD_TEXT_READER = function(content, conf){
    var self = this;
    self.conf = {}; 

    self.set_conf = function(c){
        var item; 
        for (item in c){
            if (is_not_null(c[item])){
                self.conf[item] = parseInt(c[item], 10);
            }
        }
    };

    self.content = String(content).split(' ').filter(is_not_null);
    self.idx = 0;
    self.timer = null;
    self.running = false;
    self.interval = null;
    self.slider = null;
    self.slider_size = 200;
    self.set_conf(conf);
    self.textBlocks = [];

    self.update_slider = function(){
        var rate = self.content.length / self.conf.chars;
        var slider_pos = self.slider_size * (self.idx / self.conf.chars)/ rate;
        self.slider.css({"left": slider_pos});
    };

    self.update_interval = function(){
        self.interval = 60000/self.conf.fpm ;
        clearInterval(self.timer);
        self.timer = setInterval(function(){
            
            var next_block = self.next();
            if (!is_not_null(next_block)){
                return self.stop();
            } 
            
           
            $('#spread_reader_text').text(next_block);
            
        }, self.interval);
    };

    self.next = function(){

        var c = self.content.slice(self.idx);
        var temp_length = 0;
        var tempidx = self.idx ;
        var next_length = 0;

        for(var i=0; i < c.length; i++){
            temp_length += c[i].length;
            

            if (temp_length == self.conf.chars){
                // we have all the neded text
                self.idx += i + 1;
                return self.content.slice(tempidx, self.idx).join(' ');
            } else {
                // if lesser, check the next element 
                if (temp_length < self.conf.chars){
                    // are we at the end?
                    if (i == c.length -1 ){
                        self.idx = self.content.length;
                        return self.content.slice(tempidx, self.idx ).join(' ');
                    }
                    
                    next_length = (c[i + 1]).length;
                    /*
                     * if next word is longer then our text limit,
                     * then display all we got
                     */
                    if (next_length >= self.conf.chars){
                        self.idx += i + 1;
                        return self.content.slice(tempidx, self.idx).join(' ');
                    }
                    /*
                     * if the text we have + next word is longer than the limit
                     * than check if we need the next word.
                     *
                     * self.conf.chars == 10
                     * n words = 8 
                     * n + 1 words = 13
                     * 13 + 8 /2 > 10, then we display n words, else 
                     * display n + 1 words for readability
                     */
                    if (temp_length + next_length > self.conf.chars){
                        if ((2 * temp_length + next_length) / 2 > self.conf.chars){
                            // we don't need the word
                            self.idx += i + 1;
                            
                            return self.content.slice(tempidx, self.idx ).join(' ');
                        }
                        // we need the word, roll on
                            
                    } 
                } else {
                    self.idx += i + 1;
                            
                    return self.content.slice(tempidx, self.idx).join(' ');
                }
            }
        }
        self.idx += i + 1;
        
        return self.content.slice(tempidx).join(' ');
    };

    self.more_chars = function(arg){
        self.conf.chars += arg;
        return self.update_settings();
    };

    self.less_chars = function(arg){
        self.conf.chars -= ((self.conf.chars > arg )? arg: 0);
        return self.update_settings();
    };

    self.restart = function(){
        if(self.running){
           self.stop();
        }
        self.idx = 0;
        return self.start();
    };

    self.speed_up = function(arg){
        self.conf.fpm += arg;
        if (self.running){
            self.update_interval();
        }
        return self.update_settings();
    }

    self.slow_down = function(arg){
        self.conf.fpm -= ((self.conf.fpm > arg)? arg: 0);
        if (self.running){
            self.update_interval();
        }
        return self.update_settings();
    }

    self.increase_font_size = function(arg){
        self.conf.font += arg;
        return self.update_settings();
    };

    self.decrease_font_size = function(arg){
        self.conf.font -= ((self.conf.font > arg )? arg: 0);
        return self.update_settings();
    };

    self.start = function(){
        if (self.running){
            return;
        }
        self.running = true;
        self.update_interval();
        return self.display_settings();
    };

    self.stop = function(){
        self.running = false;
        clearInterval(self.timer);   
    };

    self.update_settings = function(){
        settings = {
            'fpm': self.conf.fpm, /* frame per minute */
            'chars': self.conf.chars,
            'font': self.conf.font
        };

        self.display_settings();
        chrome.extension.sendRequest({
            command: 'saveSettings', 
            settings_data: settings
        });
    };

    self.display_settings = function(){
        $('#spread_infopane').text(
                format('{0} cpm / {1} chars / {2}px fonts', 
                    self.conf.fpm * self.conf.chars, 
                    self.conf.chars, 
                    self.conf.font, 10));
    };

    //self.update_interval();
    return self;
};

var reader;


function create_reader(text){
    text = text.replace(/(\w+)([,\.:;\(\)\[\]\"]+)(\w+)/gim, '$1$2 $3');
    var count = text.match(/([^\s\t]+)/gim).length;


    chrome.extension.sendRequest(
            {command:'getSettings'}, 
            function(response){
                var settings = response.settings; 
                reader = SPREAD_TEXT_READER(text, settings);
                var w_width = $(window).width();
                var w_height = $(window).height()
                var r_width = w_width * 0.8;
                var r_height = w_height * 0.6;

                var background = $('<div/>', {
                    id: 'spread_reader_background',
                    style: format("width:{0}px;height:{1}px;", w_width, w_height)
                }).mousedown(function(){
                    $('#spread_reader').remove();
                    background.remove();
                    reader.stop();
                });

                var div = $('<div tabindex="0" id="spread_reader"></div>');
                $('body').append(background)
                         .append(div.css({  
                                    top: (w_height*0.4)/2,
                                    left: (w_width*0.2)/2,
                                    width: r_width + 'px',
                                    height: r_height + 'px' 
                                    }).append("<span id='spread_reader_text'></span>"));
                div.append(
                    $(dict_format("<div id='spread_reader_controls'>"
                                    + "<img id='spread_reader_start' title='Start' src='{start}'>"
                                    + "<img id='spread_reader_stop' title='Stop' src='{stop}'>"
                                    + "<img id='spread_reader_restart' title='Restart' src='{restart}'>"
                                    + "</div>",
                                    {
                                        start: chrome.extension.getURL("images/play_24.png"),
                                        restart: chrome.extension.getURL("images/refresh_24.png"),
                                        stop: chrome.extension.getURL("images/stop_24.png")
                                    })
                        )
                        .css({
                            width: r_width/2,
                            height: "auto",
                            left: r_width/4
                        })
                ).append(dict_format("<div id='spread_reader_other_images'>"
                        + "<img id='spread_reader_help' title='Help' src='{help}'>"
                        + "<img id='spread_reader_settings' title='Settings' src='{settings}'>"
                        + "</div>",
                        {
                            help: chrome.extension.getURL("images/help_24.png"),
                            settings: chrome.extension.getURL("images/settings_24.png")
                        })        
                );


                reader.display_settings();

            });
}
$('#spread_reader_start').live("click", function(event){
    return reader.start();
});

$('#spread_reader_stop').live("click", function(event){
    return reader.stop();
});
$('#spread_reader_restart').live("click", function(event){
    return reader.restart();
});

$('#spread_reader').live("keydown", function(event){
    var kfuncs = {
        "f": function(){
                    reader.decrease_font_size(2);
                    return $('#spread_reader_text').css({'fontSize': format('{0}px !important', reader.conf.font)});
        },
        "F": function(){
                    reader.increase_font_size(2);
                    return $('#spread_reader_text').css({'fontSize': format('{0}px !important', reader.conf.font)});
        },
        "S": function(){
                    return reader.speed_up(20);
        },
        "s": function(){
                    return reader.slow_down(20);
        },
        "T": function(){
                    return reader.more_chars(2);
        },
        "t": function(){
                    return reader.less_chars(2);
        }
    };
    if ($.inArray(event.keyCode, [70, 83, 84]) < 0){
        return;
    }
    var key = String.fromCharCode((event.shiftKey)? event.keyCode : event.keyCode + 32);
    return kfuncs[key]();

});

$('#spread_reader_help').live("click", function(event){
    alert("Spread Speed Reader Extension Usage\n"
        + "\n\n"
        + "Speed Up/Down: S/s\n"
        + "Font Size Up/Down: F/f\n"
        + "Text Length Up/Down: T/t\n"
    );
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.command == 'openReader'){
        var text = get_selected_text();
        if (text.length){
            create_reader(text);
        }
    }
});
