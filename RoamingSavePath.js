/*
==============================================================================================
 RoamingSavePath.js
 License: WTFPL
 Free for commercial and non commercial use.
==============================================================================================
@ help
 Usage: add this line to your plugins:
{"name":"RoamingSavePath","status":true,"description":"Sets custom save directory instead of www/save","parameters":{"Save Directory": null or path}}
*/

(function () {
'use strict';
if (!StorageManager.isLocalMode() || typeof process === 'undefined' || !process.env || !process.platform) return;

const fs = require('fs');
const path = require('path');

var globalSavePath = null;

const initPlugin = function () {
	const defaultDir = (process.env.APPDATA ? "%USERPROFILE%" : 
			(process.platform == "darwin" ? "%HOME%/Library/Preferences" : "%HOME%/.local/share")
		) + "/Saved Games/%GAMETITLE%/save/";

	const params = PluginManager.parameters("RoamingSavePath");
	var savePath = (
			(params["Save Directory"] || defaultDir)
			.trim()
			.replace(/^[/\\\.]+|[/\\\.]+$/g, '') + path.sep)
		.replace("%GAMETITLE%", $dataSystem.gameTitle || "UnknownTitle")
		.replace(/[/\\]/g, path.sep);
	for (var e in process.env)
		savePath = savePath.replace('%' + e + '%', process.env[e]);

	globalSavePath = savePath;
}

const validateDirTree = function (targetDir) {
	if (fs.existsSync(targetDir)) return true;

	const parts = targetDir.split(path.sep); 
	var currentPath = parts[0]; 

	for (var i = 1; i < parts.length; i++) { 
		if (!parts[i]) continue;
		currentPath +=  path.sep + parts[i]; 
		if (!fs.existsSync(currentPath)) { 
			try {
				fs.mkdirSync(currentPath); 
			} catch (e) {
				return false;
			}
		}
	}
	return true;
}

const oldDMOL = DataManager.onLoad;
DataManager.onLoad = function(object) {
	oldDMOL.apply(this, arguments);
	if (object === $dataSystem)
		initPlugin();
}

StorageManager.localFileDirectoryPath = function() {
	return globalSavePath;
};

const oldSTLF = StorageManager.saveToLocalFile;
StorageManager.saveToLocalFile = function() {
	//if (!fs.existsSync(globalSavePath))
		//fs.mkdirSync(globalSavePath, { recursive: true }); // needs newer nwjs sometimes
	if (validateDirTree(globalSavePath))
		oldSTLF.apply(this, arguments);
}
})();
