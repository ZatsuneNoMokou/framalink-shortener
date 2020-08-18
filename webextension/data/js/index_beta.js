/**
 *
 * @param {string|number} targetedTabId
 * @param {number} [timeout]
 * @return {Promise<Object>}
 * @private
 */
function _waitTabLoad(targetedTabId, timeout=60000) {
	return new Promise((resolve, reject) => {
		let timeoutId = setTimeout(() => {
			reject();
		}, timeout);
		const unloadEvent = () => {
			browser.tabs.onUpdated.removeListener(onTabLoad);
			clearTimeout(timeoutId);
		};



		const onTabLoad = function onTabLoad(tabId, changeInfo, tab) {
			if (tabId !== targetedTabId) {
				return;
			}

			if (changeInfo.status === 'complete') {
				unloadEvent();
				resolve(tab);
			}
		};
		browser.tabs.onUpdated.addListener(onTabLoad);
	})
}

/**
 *
 * @param {string} url
 * @return {Promise<void>}
 */
async function openAndWaitUrl(url) {
	let createdTab;
	try {
		createdTab = await browser.tabs.create({ url });
	} catch (e) {
		console.error(e);
		return null;
	}

	try {
		await _waitTabLoad(createdTab.id, 60000);
	} catch (e) {
		console.error(e);
		return null;
	}

	return createdTab;
}

/**
 *
 * @param {string} url
 * @return {Promise<void>}
 */
async function shortener_url___no_api(url) {
	let api_url = await getApiUrl();

	if (typeof url !== "string" || isRightURL(url) !== true) {
		await browser.notifications.create({
			type: 'basic',
			title: 'Framalink shortener',
			message: _('Check_your_link_or_page'),
			iconUrl: '/icon.png',
			isClickable: true
		});

		return;
	}



	let tab;
	try {
		tab = await openAndWaitUrl(api_url);
	} catch (e) {
		console.error(e);
		return;
	}



	let execResult;
	try {
		execResult = await browser.tabs.executeScript(
			tab.id,
			{
				allFrames: false,
				file: '/data/js/lstu_contentScript.js',
				runAt: 'document_start'
			}
		)
	} catch (e) {
		console.error(e);
		shortener_url_result(api_url, url, null);
		return;
	}

	if (Array.isArray(execResult) !== true && execResult.length !== 1 && execResult[0] === true) {
		return;
	}



	let contentScriptResult;
	try {
		contentScriptResult = await launchShortenerContentScript(tab, {
			name: 'framalink_view_launch',
			targetUrl: url
		});
		await _waitTabLoad(tab.id, 60000);
	} catch (e) {
		console.error(e);
	}

	try {
		const url = (await browser.tabs.get(tab.id)).url;
		if (contentScriptResult.response !== url) {
			return;
		}
	} catch (e) {
		console.error(e);
	}





	try {
		execResult = await browser.tabs.executeScript(
			tab.id,
			{
				allFrames: false,
				file: '/data/js/lstu_contentScript.js',
				runAt: 'document_start'
			}
		)
	} catch (e) {
		console.error(e);
		shortener_url_result(api_url, url, null);
		return;
	}

	if (Array.isArray(execResult) !== true && execResult.length !== 1 && execResult[0] === true) {
		return;
	}

	try {
		const shortResult = await launchShortenerContentScript(tab, {
			name: 'framalink_view_copy'
		});

		shortener_url_result(api_url, url, {
			success: typeof shortResult.response === 'string',
			short: shortResult.response
		});
	} catch (e) {
		console.error(e);
		shortener_url_result(api_url, url, null);
	}
}

/**
 *
 * @param {Object} tab
 * @param {Object} data
 * @return {Promise<{response:*, isError:boolean}>}
 */
async function launchShortenerContentScript(tab, data) {
	try {
		const response = await browser.tabs.sendMessage(tab.id, data);
		if (typeof response !== 'object' || !!response.isError) {
			console.group();
			console.log('[ContentScript] Error from lstu service :');
			console.error(response.response);
			console.groupEnd();
		}

		return response;
	} catch (e) {
		console.error(e);
	}
}