'use strict';

let _ = chrome.i18n.getMessage;

// appGlobal: Accessible with chrome.extension.getBackgroundPage();
var appGlobal = {
	options: options,
	options_default: options_default,
	options_default_sync: options_default_sync,
}

chrome.notifications.onClicked.addListener(function(notificationId){
	console.info(`${notificationId} (onClicked)`);
	chrome.notifications.clear(notificationId);
})

function isRightURL(URL){
	let test_url = /(?:http|https):\/\/.+/;
	return (typeof URL == "string" && test_url.test(URL));
}

chrome.browserAction.onClicked.addListener(function(tab){
	let url = tab.url; // tabs.Tab
	console.info(`[ActionButton] URL: ${url}`);
	shortener_url(url);
})
chrome.contextMenus.create({
	"title": _("Shorten_this_page_URL"),
	"contexts": ["page"],
	"documentUrlPatterns": ["http://*/*", "https://*/*"],
	"onclick": function(info, tab){
		let data = info.pageUrl;
		console.info(`[ContextMenu] URL: ${data}`);
		shortener_url(data);
	}
});
chrome.contextMenus.create({
	"title": _("Shorten_this_link"),
	"contexts": ["link"],
	"targetUrlPatterns": ["http://*/*", "https://*/*"],
	"onclick": function(info, tab){
		let data = info.linkUrl;
		console.info(`[ContextMenu] URL: ${data}`);
		shortener_url(data);
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
		shortener_url(data);
	}
});

function copyToClipboard(string){
	let copy = function(string){
		let copy_form;
		if(document.querySelector("#copy_form") === null){
			copy_form = document.createElement("textarea");
			copy_form.id = "copy_form";
			copy_form.textContent = string;
			document.querySelector("body").appendChild(copy_form);
		} else {
			copy_form = document.querySelector("#copy_form");
		}
		
		copy_form.focus();
		document.execCommand('SelectAll');
		let clipboard_success = document.execCommand('Copy');
		if(clipboard_success){
			if(clipboard_success){
				chrome.notifications.create({
					type: "basic",
					title: "Framalink shortener",
					message: _("Shortened_link_copied_in_the_clipboard"),
					iconUrl: "/icon.png",
					isClickable: true
				});
			}
		} else {
				chrome.notifications.create({
					type: "basic",
					title: "Framalink shortener",
					message: _("Error_when_copying_to_clipboad"),
					iconUrl: "/icon.png",
					isClickable: true
				});
				console.warn(`Copy to clipboad error (${string})`)
		}
		
		copy_form.parentNode.removeChild(copy_form);
	}
	
	chrome.permissions.contains({
		permissions: ['clipboardWrite'],
	}, function(result) {
		if(result){
			copy(string);
		} else {
			console.log("Clipboard writing permission not granted");
			chrome.permissions.request({
				permissions: ['clipboardWrite'],
			}, function(result) {
				if(result){
					copy(string);
				} else {
					console.error("The extension doesn't have the permissions.");
				}
			});
		}
	});
}
function shortener_url(url){
	let api_url = getPreferences("custom_lstu_server");
	if(isRightURL(api_url) == false){
		api_url = "https://frama.link/";
	}
	api_url = `${api_url}${(/(?:http|https):\/\/.+\//.test(api_url) == true)? "a" : "/a"}`;
	
	if(typeof url == "string" && isRightURL(url) == true){
		let xhr = new XMLHttpRequest({anonymous:true});
		xhr.open("POST", api_url, true);
		//xhr.overrideMimeType(overrideMimeType);
		
		xhr.onload = function(){
			let data = JSON.parse(xhr.responseText);
			if(data != null){
				console.group();
				console.info(`[Framalink shortener] ${(api_url == "https://frama.link/a")? "Framalink (" : `Custom LSTU serveur response (API: ${api_url} `}URL: ${url} )`);
				console.dir(data);
				console.groupEnd();
				
				if(data.success == true){
					let short_link = data.short;
					
					copyToClipboard(short_link);
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
