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

function dict_format(){
    var formatted_str = arguments[0] || '';
    var dict = arguments[1];
    for(var key in dict){
        var re = new RegExp("\\{"+key+"}", "gim");
        formatted_str = formatted_str.replace(re, dict[key]);
    }
    return formatted_str;
}

function get_selected_text()
{
    txt = String(window.getSelection());
    return txt.replace(/(^[\s\t]+|[\s\t]+$)/g, '').replace(/[\t\r\n]/g,' ');
}
