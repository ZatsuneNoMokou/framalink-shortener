'use strict';

function getPreference(prefId){
	let options = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().optionsData.options : optionsData.options;
	let defaultSettings = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().optionsData.options_default : optionsData.options_default;
	
	let currentPreferences = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().appGlobal.currentPreferences : appGlobal.currentPreferences;
	if(currentPreferences.hasOwnProperty(prefId)){
		let current_pref = currentPreferences[prefId];
		switch(typeof defaultSettings[prefId]){
			case "string":
				return current_pref;
				break;
			case "number":
				if(isNaN(parseInt(current_pref))){
					console.warn(`${prefId} is not a number (${current_pref})`);
					return defaultSettings[prefId];
				} else if(typeof options[prefId].minValue == "number" && parseInt(current_pref) < options[prefId].minValue){
					return options[prefId].minValue;
				} else if(typeof options[prefId].maxValue == "number" && parseInt(current_pref) > options[prefId].maxValue){
					return options[prefId].maxValue;
				} else {
					return parseInt(current_pref);
				}
				break;
			case "boolean":
				return getBooleanFromVar(current_pref);
				break;
			case "undefined":
				console.warn(`The setting "${prefId}" has no default value`);
				return current_pref;
				break;
			default:
				console.warn(`Unknown default type for the setting ${prefId}: ${typeof defaultSettings[prefId]}`);
				return current_pref;
		}
	} else if(typeof defaultSettings[prefId] != "undefined"){
		console.warn(`Preference ${prefId} not found, using default`);
		savePreference(prefId, defaultSettings[prefId]);
		return defaultSettings[prefId];
	} else {
		//console.warn(`Preference ${prefId} not found, no default`);
	}
}
function savePreference(prefId, value){
	let options = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().optionsData.options : optionsData.options;
	let defaultSettings = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().optionsData.options_default : optionsData.options_default;
	let currentPreferences = (chrome.extension.getBackgroundPage() != null)? chrome.extension.getBackgroundPage().appGlobal.currentPreferences : appGlobal.currentPreferences;
	if(options.hasOwnProperty(prefId) && options[prefId].type == "integer"){
		if(typeof options[prefId].minValue == "number" && parseInt(value) < options[prefId].minValue){
			value = options[prefId].minValue;
		} else if(typeof options[prefId].maxValue == "number" && parseInt(value) > options[prefId].maxValue){
			value = options[prefId].maxValue;
		}
	}
	if(typeof defaultSettings[prefId] == "boolean" || typeof defaultSettings[prefId] == "number"){
		value = value.toString();
	}
	currentPreferences[prefId] = value;
	chrome.storage.local.set({[prefId] : value}, function() {
		if(typeof chrome.runtime.lastError == "object" && chrome.runtime.lastError != null){
			console.dir(chrome.runtime.lastError);
		}
	});
}
function getBooleanFromVar(string){
	switch(typeof string){
		case "boolean":
			return string;
			break;
		case "number":
		case "string":
			if(string == "true" || string == "on" || string == 1){
				return true;
			} else if(string == "false" || string == "off" || string == 0){
				return false;
			} else {
				console.warn(`getBooleanFromVar: Unkown boolean (${string})`);
				return string;
			}
			break;
		default:
			console.warn(`getBooleanFromVar: Unknown type to make boolean (${typeof string})`);
	}
}
function translateNodes(locale_document){
	let _ = chrome.i18n.getMessage;
	let document = locale_document;
	let translate_nodes = document.querySelectorAll("[data-translate-id]");
	for(let i in translate_nodes){
		let node = translate_nodes[i];
		if(typeof node.getAttribute == "function"){
			node.textContent = _(node.getAttribute("data-translate-id"));
		}
	}
}
function translateNodes_title(locale_document){
	let _ = chrome.i18n.getMessage;
	let document = locale_document;
	let translate_nodes = document.querySelectorAll("[data-translate-title]");
	for(let i in translate_nodes){
		let node = translate_nodes[i];
		if(typeof node.getAttribute == "function"){
			node.title = _(node.getAttribute("data-translate-title"));
		}
	}
}
function getValueFromNode(node){
	if(node.type == "checkbox") {
		return node.checked;
	} else if(node.tagName == "input" && node.type == "number"){
		return parseInt(node.value);
	} else if(typeof node.value == "string"){
		return node.value;
	} else {
		console.error("Problem with node trying to get value");
	}
}

function settingNode_onChange(event){
	let node = event.target;
	let settingName = node.id;
	let settingValue = getValueFromNode(node);
	
	savePreference(settingName, settingValue);
}
