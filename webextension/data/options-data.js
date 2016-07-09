'use strict';

var options = {
	"custom_lstu_server": {
		"title": "Custom LSTU server",
		"description": "LSTU server, for example https://lstu.fr/",
		"type": "string",
		"value": ""
	}
}

var options_default = {};
var options_default_sync = {};

for(var id in options){
	var option = options[id];
	if(typeof option.value != "undefined"){
		options_default[id] = option.value;
		
		if(!(typeof option.sync == "boolean" && option.sync == false)){
			options_default_sync[id] = option.value;
		}
	}
}
