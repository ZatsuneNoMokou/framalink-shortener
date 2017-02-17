'use strict';

var optionsData = {};
optionsData.options = {
	"custom_lstu_server": {
		"title": "Custom LSTU server",
		"description": "LSTU server, for example https://lstu.fr/",
		"type": "string",
		"value": ""
	}
}

optionsData.options_default = {};
optionsData.options_default_sync = {};

for(var id in optionsData.options){
	var option = optionsData.options[id];
	if(typeof option.value != "undefined"){
		optionsData.options_default[id] = option.value;
		
		if(!(typeof option.sync == "boolean" && option.sync == false)){
			optionsData.options_default_sync[id] = option.value;
		}
	}
}
