var doc_body  = $(document.body)? $(document.body):$$('body')[0];

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
                var wsize = window.getSize();
                
                var reader = SPREAD_TEXT_READER(text, settings);
                var background = new Element('div', {
                    id: 'spread_reader_background',
                    style: format("width:{0}px;height:{1}px;", wsize.x, wsize.y), 
                    events: {
                        mousedown: function(){
                            $('spread_reader').destroy();
                            this.destroy();
                            reader.stop();
                            }
                        }
                    }
                );
                var div = new Element('div', {
                    id: "spread_reader"
                });
                var reader_inner_container = Element('div', {
                    id: "spread_reader_body_container"
                });
                var reader_inner = Element('div', {
                    id: "spread_reader_body"
                });

                var infopane = Element ('div', {
                    id: "infopane"
                });

                var sliderBody = Element('div', {
                    id: 'spread_reader_slider',
                    html: "<div id='spread_reader_knob'></div><span id='speed_reader_step'></span>"
                });

                var reader_buttons = Element('ul', {
                    html: "<li id='spread_reader_start'>start</li>"+
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
                    "<li id='spread_reader_less_words'>less words</li>",
                    id:'spread_reader_buttons'
                });

                //div.makeResizable();
                reader_inner_container.grab(infopane);
                reader_inner_container.grab(reader_inner);
                div.grab(reader_inner_container);
                div.grab(reader_buttons);

                doc_body.grab(background);
                doc_body.grab(div);
                div.grab(sliderBody);

                var x = (wsize.x - $(div).getSize().x)/2;
                var y = (wsize.y - $(div).getSize().y)/2;
                div.setStyle('top', y).setStyle('left',x);

                div.addEvent('resize', function(){
                    var wsize = window.getSize();
                    var x = (wsize.x - $(div).getSize().x)/2;
                    var y = (wsize.y - $(div).getSize().y)/2;
                    this.setStyle('top', y).setStyle('left',x);
                    
                    var ulsize = $('spread_reader_buttons').getSize();
                    var divsize = this.getSize();

                    $(reader_inner_container).setStyle('width', divsize.x  - (ulsize.x + 3) );
                    $(reader_inner_container).setStyle('height', divsize.y );

                });

                reader.slider = new Slider($('spread_reader_slider'), $('spread_reader_knob'), {
	                steps: count,
                    mode: 'vertical',
                    snap: true,
	                onChange: function(step){
		                $('speed_reader_step').set('text', step);
                        reader.idx = step; 
	                    },
                    }).set(0);

                div.fireEvent('resize');

                
                $('spread_reader_bigger').addEvent('click', function(){
                        var fontsize = parseInt($('spread_reader_body').getStyle('font-size'));
                        $('spread_reader_body').setStyle('font-size', fontsize*1.1);
                        reader.updateSettings();
                });
                $('spread_reader_smaller').addEvent('click', function(){
                        var fontsize = parseInt($('spread_reader_body').getStyle('font-size'));
                        $('spread_reader_body').setStyle('font-size', fontsize*0.9);
                        reader.updateSettings();
                });
                $('spread_reader_faster').addEvent('click', function(){
                        reader.conf.fpm += 20;
                        reader.setSpeed();
                        
                });
                $('spread_reader_slower').addEvent('click', function(){
                        reader.conf.fpm = (reader.conf.fpm > 20)? reader.conf.fpm - 20: reader.conf.fpm;
                        reader.setSpeed();
                });
                $('spread_reader_restart').addEvent('click', function(){
                        reader.restart();
                });
                $('spread_reader_start').addEvent('click', function(){
                        reader.start();
                });
                $('spread_reader_stop').addEvent('click', function(){
                        reader.stop();
                });
                $('spread_reader_more_words').addEvent('click', function(){
                        reader.more_words();
                });

                $('spread_reader_less_words').addEvent('click', function(){
                        reader.less_words();
                });


            });
}



window.addEvent('mouseup',
    function(event){
        var notifier = $('spread_notifier');
        if (event.target.id !== 'spread_notifier' && notifier){
            notifier.destroy();
        }else {
            var text = getSelectedText();
            if (text.length){
                if (!notifier){
                    var spread_notif = new Element('div',{
                        id: 'spread_notifier',
                        text: 'Speed read this text',
                        events: {
                            'click': function(event){
                                create_reader(text);
                                return this.destroy();
                            }
                        }
                    });
                    $(doc_body).grab(spread_notif);
                    $(spread_notif).setStyle('left', event.page.x + 30);
                    $(spread_notif).setStyle('top',  event.page.y - 50);
                }
            }
        }
        return event;
    }
);


