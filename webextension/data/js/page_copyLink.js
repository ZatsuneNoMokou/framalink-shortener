'use strict';
let extId = chrome.runtime.id;

function copyToClipboard(string){
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

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
	if(sender = extId){
		let messageData = null;
		
		if(typeof message == "string"){
			try{
				messageData = JSON.parse(message);
			}
			catch(err){}
		} else if(typeof message == "object"){
			messageData = message
		}
		
		if(messageData != null && messageData.id == "clipboardWrite"){
			let url = messageData.data;
			try{
				sendResponse(copyToClipboard(url));
/*
	chrome.runtime.sendMessage({
		"id": "clipboardWriteResult",
		"string": string,
		"clipboard_success": clipboard_success
	}); 
 */
			}
			catch(err){
				console.warn(err);
			}
		}
	}
})
