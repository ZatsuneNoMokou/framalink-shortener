let Request = require("sdk/request").Request;
let { ActionButton } = require('sdk/ui/button/action');
let tabs = require("sdk/tabs");
let ContextMenu = require("sdk/context-menu");
let clipboard = require("sdk/clipboard");
var notifications = require("sdk/notifications");

let self = require("sdk/self");
let simplePrefs = require('sdk/simple-prefs').prefs;
let _ = require("sdk/l10n").get;

function getPreferences(prefId){
	return simplePrefs[prefId];
}
function savePreference(prefId, value){
	simplePrefs[prefId] = value;
}

let firefox_button = ActionButton({
	id: "framalinkshortener_button",
	label: _("Shorten this page URL"),
	icon: {
		"16": "./icon_16.png",
		"32": "./icon_32.png",
		"64": "./icon_64.png"
	},
	onClick: firefox_button_onClick
});
function firefox_button_onClick(){
	let current_tab = tabs.activeTab;
	let url = current_tab.url;
	console.info(`[ActionButton] URL: ${url}`);
	shortener_url(url);
}
ContextMenu.Item({
	label: _("Shorten this page URL"),
	image: self.data.url("../icon.svg"),
	context: [
		ContextMenu.URLContext(["http://*", "https://*"])
	],
	contentScriptFile: self.data.url("page_getPageUrl.js"),
	onMessage: function(data){
		console.info(`[ContextMenu] URL: ${data}`);
		shortener_url(data);
	}
});
ContextMenu.Item({
	label: _("Shorten this link"),
	image: self.data.url("../icon.svg"),
	context: [
		ContextMenu.URLContext(["http://*", "https://*"]),
		ContextMenu.SelectorContext("a[href]")
	],
	contentScriptFile: self.data.url("page_getUrlLink.js"),
	onMessage: function(data){
		console.info(`[ContextMenu] URL: ${data}`);
		shortener_url(data);
	}
});

function shortener_url(url){
	let test_url = /(?:http|https):\/\/.+/;
	
	let api_url = getPreferences("custom_lstu_server");
	if(test_url.test(api_url) == false){
		api_url = "https://frama.link/";
	}
	api_url = `${api_url}${(/(?:http|https):\/\/.+\//.test(api_url) == true)? "a" : "/a"}`;
	
	if(typeof url == "string" && test_url.test(url) == true){
		Request({
			url: api_url,
			content: {"lsturl": url, "format": "json"},
			anonymous: true,
			onComplete: function (response) {
				data = response.json;
				
				if(data != null){
					console.group();
					console.info(`[Framalink shortener] ${(api_url == "https://frama.link/a")? "Framalink (" : `Custom LSTU serveur response (API: ${api_url} `}URL: ${url} )`);
					console.dir(data);
					console.groupEnd();
					
					if(data.success == true){
						let short_link = data.short;
						
						let clipboard_success = clipboard.set(short_link, "text");
						if(clipboard_success){
							notifications.notify({
								title: "Framalink shortener",
								text: _("Shortened link copied in the clipboard")
							});
						}
					}
				} else {
					notifications.notify({
						title: "Framalink shortener",
						text: _("Retry or try the context menu")
					});
				}
			}
		}).post();
	} else {
		notifications.notify({
			title: "Framalink shortener",
			text: _("Check your link or page")
		});
	}
}
