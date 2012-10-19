var defaults = {
    fpm: 120,
    chars: 12,
    font: 34,
    bgcolor: "#444444",
    fgcolor: "#ffffff"
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

//if (chrome.commands != undefined ){
//    chrome.commands.onCommand.addListener(function(command) {
//      console.log('Command:', command);
//    });
//}



chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    
    var settings = localStorage["spread_settings"]?JSON.parse(localStorage['spread_settings']):defaults;

    for (var key in defaults){
        settings[key] = (settings[key] != undefined)? settings[key]: defaults[key];
    }

    if (request.command == 'getSettings'){
        
        return sendResponse({'settings':settings});

    } else if (request.command == 'saveSettings'){
        var data = request.settings_data;
        localStorage["spread_settings"] = JSON.stringify(data);
        return sendResponse({});
    } else if (request.command == 'openOptions'){
        return chrome.tabs.create({url: "options.html"});
    }
});

