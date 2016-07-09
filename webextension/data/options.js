'use strict';

let appGlobal = chrome.extension.getBackgroundPage().appGlobal;
let options = appGlobal.options;
let options_default = appGlobal.options_default;
let options_default_sync = appGlobal.options_default_sync;

let _ = chrome.i18n.getMessage;

function loadPreferences(){
	let container = document.querySelector("section#preferences");
	
	for(let id in options){
		let option = options[id];
		if(typeof option.type == "undefined" || option.type == "hidden"){
			continue;
		}
		let groupNode = null;
		if(typeof option.group == "string" && option.group != ""){
			groupNode = getPreferenceGroupNode(container, option.group);
		}
		newPreferenceNode(((groupNode == null)? container : groupNode), id, option);
	}
}
function getPreferenceGroupNode(parent, groupId){
	let groupNode = document.querySelector(`#${groupId}.pref_group`);
	if(groupNode == null){
		groupNode = document.createElement("p");
		groupNode.id = groupId;
		groupNode.className = "pref_group";
		parent.appendChild(groupNode);
	}
	return groupNode;
}
function newPreferenceNode(parent, id, prefObj){
	let node = document.createElement("div");
	node.className = "preferenceContainer";
	
	let labelNode = document.createElement("label");
	labelNode.className = "preference";
	if(typeof prefObj.description == "string"){
		labelNode.title = prefObj.description;
	}
	labelNode.htmlFor = id;
	labelNode.setAttribute("data-translate-title",`${id}_description`)
	
	let title = document.createElement("span");
	title.id = `${id}_title`;
	title.textContent = prefObj.title
	title.setAttribute("data-translate-id",`${id}_title`)
	labelNode.appendChild(title);
	
	let prefNode = null;
	switch(prefObj.type){
		case "string":
			prefNode = document.createElement("input");
			prefNode.type = "text";
			prefNode.value = getPreferences(id);
			break;
		case "integer":
			prefNode = document.createElement("input");
			prefNode.type = "number";
			prefNode.value = parseInt(getPreferences(id));
			break;
		case "bool":
			prefNode = document.createElement("input");
			prefNode.type = "checkbox";
			prefNode.checked = getBooleanFromVar(getPreferences(id));
			break;
		case "color":
			prefNode = document.createElement("input");
			prefNode.type = "color";
			prefNode.value = getPreferences(id);
			break;
		case "control":
			prefNode = document.createElement("button");
			prefNode.textContent = prefObj.label;
			break;
		case "menulist":
			prefNode = document.createElement("select");
			prefNode.size = 2;
			for(let o in prefObj.options){
				let option = prefObj.options[o];
				
				let optionNode = document.createElement("option");
				optionNode.text = option.label;
				optionNode.value = option.value;
				optionNode.setAttribute("data-translate-id",`${id}_${option.value}`);
				
				prefNode.add(optionNode);
			}
			prefNode.value = getPreferences(id);
			break;
	}
	prefNode.id = id;
	if(prefObj.type != "control"){
		prefNode.className = "preferenceInput";
	}
	if(id.indexOf("_keys_list") != -1){
		node.className += " flex_input_text";
	}
	prefNode.setAttribute("data-setting-type", prefObj.type);
	
	if(prefObj.type != "menulist"){
		prefNode.setAttribute("data-translate-id", id);
	}
	
	node.appendChild(labelNode);
	node.appendChild(prefNode);
	parent.appendChild(node);
	
	switch(prefObj.type){
		case "string":
			prefNode.addEventListener("input", settingNode_onChange);
			break;
		case "integer":
		case "bool":
		case "color":
		case "menulist":
			prefNode.addEventListener("change", settingNode_onChange);
			break;
		case "control":
			// Control functions
			void(0)
			break;
	}
}
loadPreferences();

window.addEventListener('storage', function(event){
	let prefId = event.key;
	let prefValue = event.newValue;
	let prefNode = document.querySelector(`#preferenceContainer #${prefId}`);
	
	if(prefNode != null && typeof options[prefId].type == "string"){
		switch(options[prefId].type){
			case "string":
			case "color":
			case "menulist":
				prefNode.value = prefValue;
				break;
			case "integer":
				prefNode.value = parseInt(prefValue);
				break;
			case "bool":
				prefNode.checked = getBooleanFromVar(prefValue);
				break;
			case "control":
				// Nothing to update, no value
				break;
		}
	}
});

function init(){
	translateNodes(document);
	translateNodes_title(document);
}
document.addEventListener('DOMContentLoaded',		init);

// Saves options to chrome.storage
// Storage area compatibility - Might not be useful for now, but Firefox Webextension doesn't seems to plan using the sync storage area
let storage = (typeof chrome.storage.sync == "object")? chrome.storage.sync : chrome.storage.local;

// Save states using in chrome.storage.
function saveOptionsInSync(){
	let settingsDataToSync = {};
	
	let prefNodes = document.querySelectorAll(".preferenceInput");
	for(let i in prefNodes){
		let prefNode = prefNodes[i]
		if(typeof prefNode.tagName == "undefined"){
			continue;
		}
		let settingType = prefNode.dataset.settingType;
		let prefId = prefNode.id;
		switch(settingType){
			case "string":
			case "color":
			case "menulist":
				settingsDataToSync[prefId] = prefNode.value;
				break;
			case "integer":
				settingsDataToSync[prefId] = parseInt(prefNode.value);
				break;
			case "bool":
				settingsDataToSync[prefId] = getBooleanFromVar(prefNode.checked);
				break;
			case "control":
				// Nothing to update, no value
				break;
		}
	}
	
	storage.set(settingsDataToSync, function() {
		// Update status to let user know options were saved.
		var status = document.getElementById('status');
		status.textContent = _("options_saved_sync");
		if(typeof chrome.runtime.lastError != "undefined"){
			console.warn(chrome.runtime.lastError);
		}
		setTimeout(function() {
			status.textContent = '';
		}, 2000);
	});
}
// Restores states using the preferences stored in chrome.storage.
function restaureOptionsFromSync(){
	// Default values
	storage.get(options_default_sync, function(items) {
		if(typeof chrome.runtime.lastError != "undefined"){
			console.warn(chrome.runtime.lastError);
		}
		
		for(let id in items){
			let prefNode = document.querySelector(`#${id}`);
			
			if(prefNode == null){
				console.group();
				console.warn(`Sync restaure: the node of the preference ${id} doesn't not exist in the option page (value: ${items[id]})`);
				console.info("Maybe it's just a setting without sync (addon version, for exemple)")
				console.groupEnd();
				return;
			}
			
			let settingType = prefNode.dataset.settingType;
			let prefId = prefNode.id;
			switch(settingType){
				case "string":
				case "color":
				case "menulist":
					prefNode.value = items[id];
					break;
				case "integer":
					prefNode.value = parseInt(items[id]);
					break;
				case "bool":
					prefNode.checked = getBooleanFromVar(items[id]);
					break;
				case "control":
					// Nothing to update, no value
					break;
			}
			
			/*				Save the settings received from sync				*/
			settingNode_onChange({type: "change", srcElement: prefNode, target: prefNode});
		}
	});
}

let restaure_sync_button = document.querySelector("#restaure_sync");
restaure_sync_button.addEventListener("click", function(){restaureOptionsFromSync();});

let save_sync_button = document.querySelector("#save_sync");
save_sync_button.addEventListener("click", function(){saveOptionsInSync();});