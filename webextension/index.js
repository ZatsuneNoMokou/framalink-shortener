'use strict';

// https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser/9851769#9851769

const userAgent = (navigator && navigator.userAgent) || '';

// Firefox 1.0+
const isFirefox = typeof InstallTrigger !== 'undefined' || /(?:firefox|fxios)\/(\d+)/i.test(userAgent);





let _ = chrome.i18n.getMessage;

// appGlobal: Accessible with chrome.extension.getBackgroundPage();
var appGlobal = {
	"options": optionsData.options,
	"options_default": optionsData.options_default,
	"options_default_sync": optionsData.options_default_sync,
	"isFirefox": isFirefox
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

const getApiUrl = appGlobal["getApiUrl"] = function(){
	const defaultApiUrl = "https://frama.link/",
		customApiUrl = getPreference("custom_lstu_server")
	;
	return (isRightURL(customApiUrl) === false)? defaultApiUrl : customApiUrl
};



function copyToClipboard_mainScript(string){
	if(document.querySelector("#copy_form") != null){
		let node = document.querySelector("#copy_form");
		node.parentNode.removeChild(node);
	}

	let copy_form = document.createElement("textarea");
	copy_form.id = "copy_form";
	copy_form.textContent = string;
	//copy_form.class = "hide";
	copy_form.setAttribute("style", "height: 0 !important; width: 0 !important; border: none !important; z-index: -9999999;");
	document.querySelector("body").appendChild(copy_form);

	//copy_form.focus();
	copy_form.select();

	let clipboard_success = document.execCommand('Copy');
	copy_form.parentNode.removeChild(copy_form);

	return clipboard_success;
}

function copyToCliboard(string, tab) {
	return new Promise((resolve, reject) => {
		if(isFirefox===false){
			const clipboardSuccess = copyToClipboard_mainScript(string);
			if(clipboardSuccess===true){
				resolve();
			} else {
				reject();
			}
		} else {
			chrome.tabs.sendMessage(tab.id, {
				id: "clipboardWrite",
				data: string
			}, function(responseData){
				if(responseData !== undefined && responseData.clipboard_success===true){
					resolve(responseData.string);
				} else {
					reject(responseData.string);
				}
			});
		}
	})
}



function shortener_url(url, tab){
	let api_url = getApiUrl();
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

					copyToCliboard(short_link, tab)
						.then(()=>{
							chrome.notifications.create({
								type: "basic",
								title: "Framalink shortener",
								message: _("Shortened_link_copied_in_the_clipboard"),
								iconUrl: "/icon.png",
								isClickable: true
							});
						})
						.catch((string)=>{
							chrome.notifications.create({
								type: "basic",
								title: "Framalink shortener",
								message:  _("Error_when_copying_to_clipboad"),
								iconUrl: "/icon.png",
								isClickable: true
							});

							console.warn(`Copy to clipboad error (${string})`);
						})
					;
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

/*
const hasCookiesPermission = appGlobal["hasCookiesPermission"] = function(url){
	const cookiesPermissionOpts = {
		"permissions": ["cookies"]
	};
	return new Promise((resolve, reject)=>{
		chrome.permissions.contains(cookiesPermissionOpts, havePermissions=>{
			resolve(havePermissions)
		});
	})
};

function addShortenedToCookie(shortenedUrlId){
	hasCookiesPermission()
		.then(function(){
			chrome.cookies.get({
				"name": "url",
				"url": getApiUrl()
			}, function(cookie){
				let cookieValue = [];

				try{
					cookieValue = JSON.parse(cookie.value);
				} catch(e){
					console.warn(e);
				}

				cookieValue.push(shortenedUrlId);

				chrome.cookies.set({
					"name": "url",
					"url": getApiUrl(),
					"value": JSON.stringify(value)
				})
			})
		})
	;
}
*/
