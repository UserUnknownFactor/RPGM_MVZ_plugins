/*
=============================================================================
 DebugJSONLoad.js (for RPG Maker MV/MZ)
 License: WTFPL
 Description: Shows exactly where and what JSON file causes a load error
 Usage: Add this to plugins.json before the last ]; to enable the plugin:
   ,{"name":"DebugJSONLoad","status":true,"description":"Shows better info for JSON load errors","parameters":{}}
 Free for commercial and non commercial use.
=============================================================================
*/

if(Utils.RPGMAKER_NAME === "MV") {
	DataManager.loadDataFile = function(name, src) {
		var xhr = new XMLHttpRequest();
		var url = 'data/' + src;
		xhr.open('GET', url);
		xhr.overrideMimeType('application/json');
		xhr.onload = function() {
			if (xhr.status < 400) {
				try {
					window[name] = JSON.parse(xhr.responseText);
				} catch (e) {
					var pos = parseInt(e.message.match(/position (\d+)/)[1]);
					var err = xhr.responseText.slice(pos - 20, pos + 20);
					throw e.message + " in " + src + " Text:<br>" + err + " ";
				}
				DataManager.onLoad(window[name]);
			}
		};
		xhr.onerror = this._mapLoader || function() {
			DataManager._errorUrl = DataManager._errorUrl || url;
		};
		window[name] = null;
		xhr.send();
	};
} else {
	DataManager.onXhrLoad = function(xhr, name, src, url) {
		if (xhr.status < 400) {
			try {
				window[name] = JSON.parse(xhr.responseText);
			} catch (e) {
				var pos = parseInt(e.message.match(/position (\d+)/)[1]);
				var err = xhr.responseText.slice(pos - 20, pos + 20);
				throw e.message + " in " + src + " Text:<br>" + err + " ";
			}
			this.onLoad(window[name]);
		} else {
			this.onXhrError(name, src, url);
		}
	};
}