'use strict';

(function(){

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

let linkContext;
document.addEventListener('contextmenu', function(event) {
	let target = event.target;
	
	linkContext = {
		tagType: target.localName,
		tagText: target.innerText,
		href: target.href,
		text: target.textContent,
		pageURL: document.URL
	}
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
	if(sender.id === extId){
		let messageData = null;
		
		if(typeof message === "string"){
			try{
				messageData = JSON.parse(message);
			}
			catch(err){}
		} else if(typeof message === "object"){
			messageData = message
		}
		
		if(messageData != null){
			switch(messageData.id){
				case "clipboardWrite":
					let url = messageData.data;
					try{
						sendResponse({clipboard_success: copyToClipboard(url), string: url});
					} catch(err){
						console.warn(err);
					}
					break;
				case "copyLinkText":
					try{
						sendResponse({clipboard_success: copyToClipboard(linkContext.text), string: linkContext.text});
					} catch(err){
						console.warn(err);
					}
					break;
				case "getLinkContext":
					sendResponse(linkContext);
					break;
			}
		}
	}
})


})()
