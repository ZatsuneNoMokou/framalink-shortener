'use strict';

// https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser/9851769#9851769

const userAgent = (navigator && navigator.userAgent) || '';

// Firefox 1.0+
const isFirefox = typeof InstallTrigger !== 'undefined' || /(?:firefox|fxios)\/(\d+)/i.test(userAgent);





let _ = chrome.i18n.getMessage;

// appGlobal : Accessible with chrome.extension.getBackgroundPage();
var appGlobal = {
	'options': optionsData.options,
	'options_default': optionsData.options_default,
	'options_default_sync': optionsData.options_default_sync,
	'isFirefox': isFirefox
};

chrome.notifications.onClicked.addListener(function(notificationId) {
	console.info(`${notificationId} (onClicked)`);
	chrome.notifications.clear(notificationId);
});





(function() {
	chrome.contextMenus.removeAll();



	chrome.browserAction.onClicked.addListener(function(tab) {
		let url = tab.url; // tabs.Tab
		console.info(`[ActionButton] URL: ${url}`);
		shortener_url(url);
	});



	const pageMenu = [];
	if (chrome.contextMenus.ContextType.hasOwnProperty("PAGE")) {
		pageMenu.push("page");
	}
	if (chrome.contextMenus.ContextType.hasOwnProperty("TAB")) {
		pageMenu.push("tab");
	}
	if (pageMenu.length > 0) {
		chrome.contextMenus.create({
			"title": _("Shorten_this_page_URL"),
			"contexts": pageMenu,
			"documentUrlPatterns": ["http://*/*", "https://*/*"],
			"onclick": function(info) {
				let data = info.pageUrl;
				console.info(`[ContextMenu] URL: ${data}`);
				shortener_url(data);
			}
		});
	}



	chrome.contextMenus.create({
		"title": _("Shorten_this_link"),
		"contexts": ["link"],
		"targetUrlPatterns": ["http://*/*", "https://*/*"],
		"onclick": function(info) {
			let data = info.linkUrl;
			console.info(`[ContextMenu] URL: ${data}`);
			shortener_url(data);
		}
	});
	chrome.contextMenus.create({
		"title": _("Shorten_this_picture"),
		"contexts": ["image"],
		"targetUrlPatterns": ["http://*/*", "https://*/*"],
		"onclick": function(info) {
			let data = info.srcUrl;
			console.info(`[ContextMenu] URL: ${data}`);
			shortener_url(data);
		}
	});
})();





function isRightURL(URL){
	let test_url = /(?:http|https):\/\/.+/;
	return (typeof URL === "string" && test_url.test(URL));
}

function getApiUrl() {
	const defaultApiUrl = "https://frama.link/",
		customApiUrl = getPreference("custom_lstu_server")
	;

	return (isRightURL(customApiUrl) === false)? defaultApiUrl : customApiUrl
}



function copyToClipboard(string) {
	if (document.querySelector('#copy_form') !== null) {
		let node = document.querySelector('#copy_form');
		node.parentNode.removeChild(node);
	}

	let copy_form = document.createElement('textarea');
	copy_form.id = 'copy_form';
	copy_form.textContent = string;
	//copy_form.class = "hide";
	copy_form.setAttribute('style', 'height: 0 !important; width: 0 !important; border: none !important; z-index: -9999999;');
	document.querySelector('body').appendChild(copy_form);

	//copy_form.focus();
	copy_form.select();

	let clipboard_success = document.execCommand('Copy');
	copy_form.parentNode.removeChild(copy_form);

	return clipboard_success;
}



function shortener_url(url) {
	let api_url = getApiUrl();
	api_url = `${api_url}${(/(?:http|https):\/\/.+\//.test(api_url) === true)? 'a' : '/a'}`;


	if (typeof url !== "string" || isRightURL(url) !== true) {
		chrome.notifications.create({
			type: 'basic',
			title: 'Framalink shortener',
			message: _('Check_your_link_or_page'),
			iconUrl: '/icon.png',
			isClickable: true
		});

		return;
	}



	const searchParams = new URLSearchParams();
	searchParams.append('lsturl', url);
	searchParams.append('format', 'json');

	fetch(api_url, {
		body: searchParams,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		method: 'POST'
	})
		.catch(() => {
			chrome.notifications.create({
				type: 'basic',
				title: 'Framalink shortener',
				message: _('Error_on_request'),
				iconUrl: '/icon.png',
				isClickable: true
			});
		})
		.then(async res => {
			try {
				const text = await res.text();
				shortener_url_result(api_url, url, text);
			} catch (e) {
				console.error(e);
				shortener_url_result(api_url, url, null);
			}
		})
	;
}

function shortener_url_result(api_url, url, rawData) {
	let data = null;
	if (typeof rawData === 'string') {
		try {
			data = JSON.parse(rawData);
		} catch (e) {
			console.error(e);
		}
	}

	if (data === null) {
		chrome.notifications.create({
			type: 'basic',
			title: 'Framalink shortener',
			message: _('Retry_or_try_the_context_menu'),
			iconUrl: '/icon.png',
			isClickable: true
		});

		return;
	} else if (data.success !== true) {
		chrome.notifications.create({
			type: 'basic',
			title: 'Framalink shortener',
			message: _('Error_on_request'),
			iconUrl: '/icon.png',
			isClickable: true
		});

		return;
	}



	console.info(`[Framalink shortener] ${(api_url === "https://frama.link/a")? "Framalink (" : `Custom LSTU serveur response (API: ${api_url} `}URL: ${url} )`);
	console.dir(data);



	console.warn(data.short);
	if (copyToClipboard(data.short) === true) { // Copy short link to clipboard
		chrome.notifications.create({
			type: "basic",
			title: "Framalink shortener",
			message: _("Shortened_link_copied_in_the_clipboard"),
			iconUrl: "/icon.png",
			isClickable: true
		});
	} else {
		chrome.notifications.create({
			type: "basic",
			title: "Framalink shortener",
			message:  _("Error_when_copying_to_clipboad"),
			iconUrl: "/icon.png",
			isClickable: true
		});
	}
}





chrome.storage.local.get(null, function(currentLocalStorage) {
	let currentPreferences = {};
	for (let prefId in currentLocalStorage) {
		if (!currentLocalStorage.hasOwnProperty(prefId)) {
			continue;
		}

		if (optionsData.options_default.hasOwnProperty(prefId)) {
			currentPreferences[prefId] = currentLocalStorage[prefId];
		} else {
			currentPreferences[prefId] = currentLocalStorage[prefId];
			console.warn(`${prefId} has no default value (value: currentLocalStorage[prefId])`);
		}
	}

	// Load default settings for the missing settings without saving them in the storage
	for (let prefId in optionsData.options_default) {
		if (optionsData.options_default.hasOwnProperty(prefId) && !currentPreferences.hasOwnProperty(prefId)) {
			currentPreferences[prefId] = optionsData.options_default[prefId];
		}
	}

	appGlobal.currentPreferences = currentPreferences;

	console.group();
	console.info("Current preferences in the local storage :");
	console.dir(currentPreferences);
	console.groupEnd();
});
