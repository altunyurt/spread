var defaults = {
    'fpm': 120,
    'chars': 12,
    'font': 34,
    'color': '#000'
};

chrome.contextMenus.create({'title':'Speed read selection', 
    "contexts":['selection'], 
    "onclick": function(){
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.sendRequest(tab.id, {command: "openReader"}, function(response) {
            });
        });
    }
});

if (chrome.commands != undefined ){
    chrome.commands.onCommand.addListener(function(command) {
      console.log('Command:', command);
    });
}

function getValue(item){
    var lsval = localStorage[item];
    if(lsval == null || lsval == undefined || lsval == "null"){
        return defaults[item];
    } 
    return lsval;
};


chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    var conf = {}
    if (request.command == 'getSettings'){
        for (var item in defaults){
            if (item == undefined){
                break;
            }
            conf[item] = getValue(item);

        }
        sendResponse({'settings':conf});
    } else if (request.command == 'saveSettings'){
        var data = request.settings_data;
        for(var item in data){
            if(item == undefined ){
                break;
            }
            localStorage[item] = data[item]
        }
        sendResponse({});
    }
});

