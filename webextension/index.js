'use strict';

let _ = chrome.i18n.getMessage;

// appGlobal: Accessible with chrome.extension.getBackgroundPage();
var appGlobal = {
	options: optionsData.options,
	options_default: optionsData.options_default,
	options_default_sync: optionsData.options_default_sync,
};

chrome.notifications.onClicked.addListener(function(notificationId){
	console.info(`${notificationId} (onClicked)`);
	chrome.notifications.clear(notificationId);
});

function isRightURL(URL){
	let test_url = /(?:http|https):\/\/.+/;
	return (typeof URL === "string" && test_url.test(URL));
}

chrome.browserAction.onClicked.addListener(function(tab){
	let url = tab.url; // tabs.Tab
	console.info(`[ActionButton] URL: ${url}`);
	shortener_url(url, tab);
});
let pageMenu = [];
if(chrome.contextMenus.ContextType.hasOwnProperty("PAGE")){
	pageMenu.push("page");
}
if(chrome.contextMenus.ContextType.hasOwnProperty("TAB")){
	pageMenu.push("tab");
}
if(pageMenu.length>0){
	chrome.contextMenus.create({
		"title": _("Shorten_this_page_URL"),
		"contexts": pageMenu,
		"documentUrlPatterns": ["http://*/*", "https://*/*"],
		"onclick": function(info, tab){
			let data = info.pageUrl;
			console.info(`[ContextMenu] URL: ${data}`);
			shortener_url(data, tab);
		}
	});
}
chrome.contextMenus.create({
	"title": _("Shorten_this_link"),
	"contexts": ["link"],
	"targetUrlPatterns": ["http://*/*", "https://*/*"],
	"onclick": function(info, tab){
		let data = info.linkUrl;
		console.info(`[ContextMenu] URL: ${data}`);
		shortener_url(data, tab);
	}
});
chrome.contextMenus.create({
	"title": _("Shorten_this_picture"),
	"contexts": ["image"],
	"targetUrlPatterns": ["http://*/*", "https://*/*"],
	"onclick": function(info, tab){
		console.dir(info);
		let data = info.srcUrl;
		console.info(`[ContextMenu] URL: ${data}`);
		shortener_url(data, tab);
	}
});

function shortener_url(url, tab){
	let api_url = getPreference("custom_lstu_server");
	if(isRightURL(api_url) === false){
		api_url = "https://frama.link/";
	}
	api_url = `${api_url}${(/(?:http|https):\/\/.+\//.test(api_url) === true)? "a" : "/a"}`;
	
	if(typeof url === "string" && isRightURL(url) === true){
		let xhr = new XMLHttpRequest({anonymous:true});
		xhr.open("POST", api_url, true);
		//xhr.overrideMimeType(overrideMimeType);
		
		xhr.onload = function(){
			let data = JSON.parse(xhr.responseText);
			if(data !== null){
				console.group();
				console.info(`[Framalink shortener] ${(api_url === "https://frama.link/a")? "Framalink (" : `Custom LSTU serveur response (API: ${api_url} `}URL: ${url} )`);
				console.dir(data);
				console.groupEnd();
				
				if(data.success === true){
					let short_link = data.short;
					
					chrome.tabs.sendMessage(tab.id, {
						id: "clipboardWrite",
						data: short_link
					}, function(responseData){
						let clipboard_success = responseData.clipboard_success,
							string = responseData.clipboard_success;
							
							chrome.notifications.create({
								type: "basic",
								title: "Framalink shortener",
								message: (clipboard_success)? _("Shortened_link_copied_in_the_clipboard") : _("Error_when_copying_to_clipboad"),
								iconUrl: "/icon.png",
								isClickable: true
							});
							if(!clipboard_success){
								console.warn(`Copy to clipboad error (${string})`);
							}
					});
				}
			} else {
				chrome.notifications.create({
					type: "basic",
					title: "Framalink shortener",
					message: _("Retry or try the context menu"),
					iconUrl: "/icon.png",
					isClickable: true
				});
			}
		};
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.send(`lsturl=${encodeURIComponent(url)}&format=json`);
	} else {
		chrome.notifications.create({
			type: "basic",
			title: "Framalink shortener",
			message: _("Check your link or page"),
			iconUrl: "/icon.png",
			isClickable: true
		});
	}
}

chrome.storage.local.get(null,function(currentLocalStorage) {
	let currentPreferences = {};
	for(let prefId in currentLocalStorage){
		if(!currentLocalStorage.hasOwnProperty(prefId)){
			continue;
		}
		if(optionsData.options_default.hasOwnProperty(prefId)){
			currentPreferences[prefId] = currentLocalStorage[prefId];
		} else {
			currentPreferences[prefId] = currentLocalStorage[prefId];
			console.warn(`${prefId} has no default value (value: currentLocalStorage[prefId])`);
		}
	}
	
	// Load default settings for the missing settings without saving them in the storage
	for(let prefId in optionsData.options_default){
		if(optionsData.options_default.hasOwnProperty(prefId) && !currentPreferences.hasOwnProperty(prefId)){
			currentPreferences[prefId] = optionsData.options_default[prefId];
		}
	}
	
	appGlobal.currentPreferences = currentPreferences;
	
	console.group();
	console.info("Current preferences in the local storage:");
	console.dir(currentPreferences);
	console.groupEnd();
});
