default_conf = {
    fpm: 30,
    chars: 2,
    font: 14
};

$(function(){
    var settings = localStorage["spread_settings"]?JSON.parse(localStorage['spread_settings']):default_conf;

    $(["#fpm", "#font", "#chars"]).each(
        function(idx, item){
            var id = item.replace(/#/, "");
            $(item).val(settings[id]).change(
                function(event){
                    var id = $(event.target).attr("id").replace(/#/, "");
                    settings[id] = $(event.target).val();
                    localStorage['spread_settings'] = JSON.stringify(settings);
                }
            );
            
        }
    );
});



