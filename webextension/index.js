'use strict';


let _ = browser.i18n.getMessage;

browser.notifications.onClicked.addListener(function (notificationId) {
	console.info(`${notificationId} (onClicked)`);
	browser.notifications.clear(notificationId)
		.catch(err => {
			console.error(err);
		})
	;
});



(function () {
	browser.contextMenus.removeAll()
		.catch(err => {
			console.error(err);
		})
	;


	const pageMenu = [];
	if (browser.contextMenus.ContextType.hasOwnProperty('PAGE')) {
		pageMenu.push("page");
	}
	if (browser.contextMenus.ContextType.hasOwnProperty('TAB')) {
		pageMenu.push("tab");
	}
	if (pageMenu.length > 0) {
		browser.contextMenus.create({
			id: 'shorten_fromPage',
			title: _("Shorten_this_page_URL"),
			contexts: pageMenu,
			documentUrlPatterns: ["http://*/*", "https://*/*"]
		});
	}

	browser.contextMenus.create({
		id: 'shorten_fromLink',
		title: _("Shorten_this_link"),
		contexts: ["link"],
		targetUrlPatterns: ["http://*/*", "https://*/*"]
	});
	browser.contextMenus.create({
		id: 'shorten_fromImage',
		title: _("Shorten_this_picture"),
		contexts: ["image"],
		targetUrlPatterns: ["http://*/*", "https://*/*"]
	});
})();

browser.browserAction.onClicked.addListener(function (tab) {
	let url = tab.url; // tabs.Tab
	console.info(`[ActionButton] URL: ${url}`);
	shortener_url(url)
		.catch(err => {
			console.error(err);
		})
	;
});

// noinspection JSUnusedLocalSymbols
browser.contextMenus.onClicked.addListener(function (info, tab) {
	let data;
	switch (info.menuItemId) {
		case 'shorten_fromPage':
			data = info.pageUrl;
			break;
		case 'shorten_fromLink':
			data = info.linkUrl;
			break;
		case 'shorten_fromImage':
			data = info.srcUrl;
			break;
	}

	if (!data) {
		return;
	}

	console.info(`[ContextMenu] URL: ${data}`);
	shortener_url(data)
		.catch(err => {
			console.error(err);
		})
	;
})


/**
 *
 * @param {string} url
 * @return {boolean}
 */
function isRightURL(url) {
	let test_url = /(?:http|https):\/\/.+/;
	return (typeof url === "string" && test_url.test(url));
}

/**
 *
 * @return {Promise<string>}
 */
async function getApiUrl() {
	const defaultApiUrl = 'https://frama.link/',
		customApiUrl = await getPreference('custom_lstu_server')
	;

	return (isRightURL(customApiUrl) === false)? defaultApiUrl : customApiUrl
}


/**
 *
 * @param {string} string
 * @return {boolean}
 */
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



const NOTIFICATION_LOGIN_NEEDED_ID = 'framalink_shortener_loginNeeded';
/**
 *
 * @param {string} url
 * @return {Promise<void>}
 */
async function shortener_url(url) {
	if (typeof shortener_url___no_api === 'function' && await getPreference('no_api_lstu') === true) {
		return shortener_url___no_api(url);
	}



	let api_url = await getApiUrl();
	api_url = `${api_url}${(/(?:http|https):\/\/.+\//.test(api_url) === true)? 'a' : '/a'}`;


	if (typeof url !== "string" || isRightURL(url) !== true) {
		await browser.notifications.create({
			type: 'basic',
			title: 'Framalink shortener',
			message: _('Check_your_link_or_page'),
			iconUrl: '/icon.png'
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
		.catch(err => {
			console.error(err);
			browser.notifications.create({
				type: 'basic',
				title: 'Framalink shortener',
				message: _('Error_on_request'),
				iconUrl: '/icon.png'
			})
				.catch(err => {
					console.error(err);
				})
			;
		})
		.then(async res => {
			if (res.url.endsWith('/login') === true) {
				window.localStorage.setItem(NOTIFICATION_LOGIN_NEEDED_ID, res.url);
				await browser.notifications.create(NOTIFICATION_LOGIN_NEEDED_ID, {
					type: 'basic',
					title: 'Framalink shortener',
					message: _('login_needed'),
					iconUrl: '/icon.png'
				});
				return;
			}

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

browser.notifications.onClicked.addListener(function (notificationId) {
	if (notificationId === NOTIFICATION_LOGIN_NEEDED_ID) {
		browser.tabs.create({
			url: window.localStorage.getItem(NOTIFICATION_LOGIN_NEEDED_ID)
		})
			.catch(console.error)
		;
	}
})

/**
 *
 * @param {string} api_url
 * @param {string} url
 * @param {string|Object} rawData
 */
function shortener_url_result(api_url, url, rawData) {
	let data = null;
	if (typeof rawData === 'object' && rawData !== null) {
		data = rawData;
	} else if (typeof rawData === 'string') {
		try {
			data = JSON.parse(rawData);
		} catch (e) {
			console.error(e);
		}
	}

	if (data === null) {
		browser.notifications.create({
			type: 'basic',
			title: 'Framalink shortener',
			message: _('Retry_or_try_the_context_menu'),
			iconUrl: '/icon.png'
		})
			.catch(err => {
				console.error(err);
			})
		;
		return;
	} else if ('success' in data && data.success !== true) {
		browser.notifications.create({
			type: 'basic',
			title: 'Framalink shortener',
			message: _('Error_on_request'),
			iconUrl: '/icon.png'
		})
			.catch(err => {
				console.error(err);
			})
		;
		return;
	}



	console.info(`[Framalink shortener] ${(api_url === "https://frama.link/a")? "Framalink (" : `Custom LSTU serveur response (API: ${api_url} `}URL: ${url} )`);
	console.dir(data);



	if (copyToClipboard(data.short) === true) { // Copy short link to clipboard
		browser.notifications.create({
			type: 'basic',
			title: 'Framalink shortener',
			message: _('Shortened_link_copied_in_the_clipboard'),
			iconUrl: '/icon.png'
		})
			.catch(err => {
				console.error(err);
			})
		;
	} else {
		browser.notifications.create({
			type: 'basic',
			title: 'Framalink shortener',
			message: _('Error_when_copying_to_clipboad'),
			iconUrl: '/icon.png'
		})
			.catch(err => {
				console.error(err);
			})
		;
	}
}
