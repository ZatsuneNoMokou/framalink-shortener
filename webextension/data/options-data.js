'use strict';

var optionsData = {};
optionsData.options = {
	"custom_lstu_server": {
		"title": "Custom LSTU server",
		"description": "LSTU server, for example https://lstu.fr/",
		"type": "string",
		"value": ""
	}
};
if (browser.runtime.getManifest().name.toLowerCase().endsWith(' (dev)')) {
	optionsData.options.no_api_lstu = {
		"title": "\"No api\" LSTU usage",
		"description": "Tries shorten without api",
		"type": "bool",
		"value": false
	}
}

optionsData.options_default = {};
optionsData.options_default_sync = {};

for (const id in optionsData.options) {
	const option = optionsData.options[id];
	if (typeof option.value !== 'undefined') {
		optionsData.options_default[id] = option.value;

		if (!(typeof option.sync === 'boolean' && option.sync === false)) {
			optionsData.options_default_sync[id] = option.value;
		}
	}
}
