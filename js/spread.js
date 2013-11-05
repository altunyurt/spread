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


//http://ak.net84.net/javascript/adding-css-rules-with-important-using-jquery/
RegExp.escape = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// The style function
jQuery.fn.style = function(styleName, value, priority) {
    // DOM node
    var node = this.get(0);
    // Ensure we have a DOM node 
    if (typeof node == 'undefined') {
        return;
    }
    // CSSStyleDeclaration
    var style = this.get(0).style;
    // Getter/Setter
    if (typeof styleName != 'undefined') {
        if (typeof value != 'undefined') {
            // Set style property
            var priority = typeof priority != 'undefined' ? priority : '';
            style.setProperty(styleName, value, priority);
            return this;
        } else {
            // Get style property
            return style.getPropertyValue(styleName);
        }
    } else {
        // Get CSSStyleDeclaration
        return style;
    }
}


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
                self.conf[item] = c[item];
            }
        }
    };

    self.content = String(content).split(' ').filter(is_not_null);
    self.idx = 0;       // index of textblock count 
    self.timer = null;
    self.running = false;
    self.interval = null;
    self.slider = null;
    self.set_conf(conf);
    self.textBlocks = [];

    self.update_slider = function(){
        self.slider.slider({"value": self.idx});
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
            self.update_slider();
            
        }, self.interval);
    };

    self.set_position = function(val){
        self.idx = val;
    };

    self.regroupContent = function(){
        var idx = 0;
        self.textBlocks = [];

        for(;idx < self.content.length;){
            temp_content = self.content.slice(idx);

            var tidx = 0,
                temp_length = 0,    
                next_length = 0;

            for(var i=0; i < temp_content.length; i++){
                temp_length += temp_content[i].length;
            
                if (temp_length >= self.conf.chars || i == temp_content.length -1) {
                    tidx = i;
                    break;
                } else {
                    next_length = (temp_content[i + 1]).length;
                    // next word itself is longer than the limit
                    if (next_length >= self.conf.chars){
                        tidx = i ;
                        break;
                    }
                    if (temp_length + next_length > self.conf.chars) {
                        var next_distance = Math.abs(self.conf.chars - (temp_length + next_length)),
                            temp_distance = Math.abs(self.conf.chars - temp_length);
                        
                        if (next_distance > temp_distance){
                            // we don't need the word
                            tidx = i;
                            break;
                        }
                    }
                }
            }
            self.textBlocks.push(temp_content.slice(0, tidx + 1));
            idx += tidx + 1;
        }
        self.slider.slider({max: self.textBlocks.length});
    };

    self.next = function(){
        var blocks = self.textBlocks[self.idx++];
        return blocks != undefined ? blocks.join(" "): null;
    };


    self.more_chars = function(arg){
        self.conf.chars += arg;
        self.regroupContent();
        return self.update_settings();
    };

    self.less_chars = function(arg){
        if (self.conf.chars > arg){
            self.conf.chars -= arg;
            self.regroupContent();
        }
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

    self.set_font_size = function(arg){
        return $('#spread_reader_text').attr("style", 
                                    dict_format("font-size: {font}px  !important", {font: reader.conf.font}));
    };

    self.increase_font_size = function(arg){
        self.conf.font += arg;
        self.set_font_size(self.conf.font);
        return self.update_settings();
    };

    self.decrease_font_size = function(arg){
        self.conf.font -= ((self.conf.font > arg )? arg: 0);
        self.set_font_size(self.conf.font);
        return self.update_settings();
    };

    self.start = function(){
        if (self.running){
            return;
        }
        self.running = true;
        self.update_interval();
        self.set_font_size(self.conf.font);
        self.regroupContent();
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
            'font': self.conf.font,
            'bgcolor': self.conf.bgcolor,
            'fgcolor': self.conf.fgcolor
        };

        self.display_settings();
        chrome.extension.sendRequest({
            command: 'saveSettings', 
            settings_data: settings
        });
    };

    self.display_settings = function(){
        $('#spread_reader_infopane').text(
                dict_format('{cpm} cpm / {chars} chars / {font}px fonts', 
                    {cpm: self.conf.fpm * self.conf.chars, 
                    chars: self.conf.chars, 
                    font: self.conf.font}));
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

                var w_width = Math.min($(window).width(), window.innerWidth);
                var w_height = Math.min($(window).height(), window.innerHeight);

                
                var r_width = w_width * 0.8;
                var r_height = w_height * 0.6;

                var background = $('<div/>', {
                    id: 'spread_reader_background',
                    style: dict_format("width:{w}px;height:{h}px;", {w: w_width, h:w_height})
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
                                    })
                                    .append("<span id='spread_reader_text'></span>"));
                reader.slider = $("<div id='spread_reader_slider'></div>")
                            .css({
                                width: r_width/2,
                                height: "20px",
                                left: r_width/4,
                                top: "10px"
                            })
                            .slider({
                                range: "min",
                                min: 0,
                                max: reader.reader.textBlocks.length,
                                value: 0,
                                slide: function(event, ui){
                                    reader.set_position(ui.value);
                                }

                            });
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
                )
                .append("<span id='spread_reader_infopane'></span>")
                .append(reader.slider)
                .append($("<div id='spread_reader_colors'></div>")
                        .append($("<label>FgColor:</label><br><input id='spread_reader_fgcolor' " 
                        + " value='"+ reader.conf.fgcolor +"'"
                        + " class='color-picker' type='hidden'><br>"))
                        .append($("<label>BgColor:</label><br><input id='spread_reader_bgcolor' "
                        + " value='"+ reader.conf.bgcolor +"'"
                        +" class='color-picker' type='hidden'><br>"))
                );
                setTimeout(function(){
                    div
                        .style("color", reader.conf.fgcolor, "important")
                        .style("background-color", reader.conf.bgcolor, "important");

                    $("#spread_reader_fgcolor")
                            .miniColors({
                            change: function(hex, rgb) {
                                $("#spread_reader").style("color", hex, "important");
                            },
                            close: function(hex, rgb) {
                                reader.conf.fgcolor = hex;
                                reader.update_settings();
                            }
                        });
                    $("#spread_reader_bgcolor")
                            .miniColors({
                            change: function(hex, rgb) {
                                $("#spread_reader").style("background-color",  hex, "important");
                            },
                            close: function(hex, rgb) {
                                reader.conf.bgcolor = hex;
                                reader.update_settings();
                            }
                        });
                    }, 500);


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

//mousewheel speed adjust functionality
$('#spread_reader').live('mousewheel', function(e){
     if(e.originalEvent.wheelDelta < 0) {
         reader.slow_down(20);
     }else {
         reader.speed_up(20);
     }
     //prevent page fom scrolling
     return false;
 });
$('#spread_reader').live('DOMMouseScroll', function(e){
     if(e.originalEvent.detail > 0) {
         reader.slow_down(20);
     }else {
         reader.speed_up(20);
     }
     //prevent page fom scrolling
     return false;
 });

$('#spread_reader').live("keydown", function(event){
    var kfuncs = {
        "f": function(){
                    return reader.decrease_font_size(2);
        },
        "F": function(){
                    return reader.increase_font_size(2);
        },
        "S": function(){
                    return reader.speed_up(20);
        },
        "s": function(){
                    console.log('hello');
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
        + "\n"
        + "Speed Up / Slow Down: S / s\n"
        + "Increase / Decrease Font Size: F / f\n"
        + "Increase / Decrease Text Length: T / t\n"
    );
});

$("#spread_reader_settings").live("click", function(event){
        return chrome.extension.sendRequest({
            command: 'openOptions', 
        });
});


;

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.command == 'openReader'){
        var text = get_selected_text();
        if (text.length){
            create_reader(text);
        }
    }
});

