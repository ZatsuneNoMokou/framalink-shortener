(function () {
	'use strict';

	chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
		if (sender.id !== chrome.runtime.id) {
			return;
		}

		if (message.name === 'framalink_view_copy') {
			try {
				const result = shortenerCopy();
				sendResponse({
					response: result,
					isError: false
				});
			} catch (e) {
				console.error(e);
				sendResponse({
					response: e,
					isError: true
				});
			}
		} else if (message.name === 'framalink_view_launch') {
			try {
				const result = shortenerForm(message.targetUrl);
				sendResponse({
					response: result,
					isError: false
				});
			} catch (e) {
				console.error(e);
				sendResponse({
					response: e,
					isError: true
				});
			}
		}
	});



	const shortenerCopy = function () {
		const urlInput = document.querySelector('form[method="POST"][action="/a"] + * #input-short');
		return urlInput.value;
	};

	const shortenerForm = function shortenerForm(url) {
		const urlInput = document.querySelector('form[method="POST"][action="/a"] input[type="url"]');
		urlInput.value = url;
		urlInput.form.submit();
		return urlInput.form.action;
	};

	return true;
})();