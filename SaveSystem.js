//=============================================================================
// SaveSystem.js
//=============================================================================
/*:
 * @plugindesc v1.2.0 Implements an autosave/quicksave features, saving automatically on map changes and/or menu exit.
 *
 * @param Auto Save Slots
 * @type number
 * @min 1
 * @desc Number of autosave slots.
 * Default: 1
 * @default 1
 *
 * @param Auto Save Text
 * @desc Text displayed for autosave slots.
 * Default: Autosave %s
 * @default "Autosave %s"
 *
 * @param Save On Map Change
 * @type boolean
 * @on YES
 * @off NO
 * @desc Save the game automatically after a map transfer?
 * Default: YES
 * @default true
 * 
 * @param Map Change Hint
 * @desc Text displayed for the save title after a map change.
 * Default: entering %area%.
 * @default "entering %area%."
 *
 * @param Save On Menu Close
 * @type boolean
 * @on YES
 * @off NO
 * @desc Save the game automatically after exiting the menu?
 * Default: NO
 * @default false
 *
 * @param Menu Close Hint
 * @desc Text displayed for the save title after exiting the menu.
 * Default: closing menu.
 * @default "closing menu."
 * 
 * @param Save Standard Text
 * @desc Text displayed for the save title of a standard save.
 * Default: Save
 * @default "Save"
 *
 * @param Exclude Maps
 * @desc String array JSON of excluded maps.
 * Default: []
 * @default "[]"
 *
 * @param Continue Button Text
 * @desc Text for a title button that resumes the game from last save (disabled if empty).
 * Default: Resume
 * @default "Resume"
 *
 * @param Main Menu Alignment
 * @desc Main menu alignment text (center, right, left; disabled if empty).
 * Default: center
 * @default "center"
 *
  * @param Slot Autosave Text
 * @desc Message displayed when auto-saving to a specific slot.
 * @default "Auto-saved in slot %d"
 * 
 * @param Slot Quicksave Text
 * @desc Message displayed when quick-saving to a specific slot.
 * @default "Quick-saved in slot %d"
 * 
 * @param Autosave Text
 * @desc Generic message for auto-save completion.
 * @default "Auto-saved game"
 * 
 * @param Quicksave Text
 * @desc Generic message for quick-save completion.
 * @default "Quick-saved game"
 * 
 * @param Save Failure Text
 * @desc Message displayed when save operation fails.
 * @default "Auto/quick-save failed"
 *
 * @help
 *
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * This plugin allows the game to save automatically on certain triggers. This
 * can prevent the player from losing progress if they forget to save.
 *
 * ============================================================================
 * Features
 * ============================================================================
 *
 * - Multiple autosave slots, rotating through them.
 * - Autosave on map transfer.
 * - Autosave on exiting the menu.
 * - Configurable text for autosave slots and save titles.
 * - Plugin command to trigger an autosave.
 * - Option to disable autosaving entirely.
 * - Compatibility with Yanfly Save Core.
 *
 * ============================================================================
 * Plugin Commands
 * ============================================================================
 *
 * AutoSave - Triggers an autosave.
 * Enable_AutoSave - Enables autosaving.
 * Disable_AutoSave - Disables autosaving.
 *
 * ============================================================================
 * Terms of Use
 * ============================================================================
 *
 * Free for use in commercial and non-commercial projects.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.0.0:
 * - Initial release.
 *
 */
 
// Initialize namespace
if (!window.SaveSystem) window.SaveSystem = {};
const SaveSystem = window.SaveSystem;

(function() {
"use strict";

const PLUGIN_NAME = "SaveSystem";
const DEBUG = false;
const parameters = PluginManager.parameters(PLUGIN_NAME);
const hasBubbleSupport = typeof MessageBubbleManager !== "undefined";

const getNumber = (str, def) => (isNaN(str) ? def : +(str || def));
const getBoolean = (str, def) => (!!str ? !!str.match(/(?:true|on|y(?:es)?)/i) : !!def);
const getString = (str, def) => (typeof str === "string" ? str : def);

// Plugin parameters
SaveSystem.saveCounter = 1;
SaveSystem.recentlySaved = -1;
SaveSystem.stateEnabled = true;

SaveSystem.slots = getNumber(parameters["Auto Save Slots"],1);
SaveSystem.autoSaveText = getString(parameters["Auto Save Text"], "Autosave %d");
SaveSystem.quickSaveText = getString(parameters["Quick Save Text"], "Quicksave %d");
SaveSystem.onMapChange = JSON.parse(getString(parameters["Save On Map Change"], "true"));
SaveSystem.onMapChangeText = getString(parameters["Map Change Hint"], "entering %area%.");
SaveSystem.onMapChangeDefaultArea= getString(parameters["Map Change Default Area"], "map");
SaveSystem.onMenuExit = JSON.parse(getString(parameters["Save On Menu Close"], "false"));
SaveSystem.onMenuExitText = getString(parameters["Menu Close Hint"], "closing menu.");
SaveSystem.maxTextWidth = getNumber(parameters["Standard Text Max Width"], 180);
SaveSystem.excludeMaps = JSON.parse(parameters["Exclude Maps"] || "[]");
SaveSystem.resumeText = getString(parameters["Continue Button Text"], "Resume");
SaveSystem.titleMenuAlign = getString(parameters["Main Menu Alignment"], "center");
			
SaveSystem.slotASave = getString(parameters["Slot Autosave Text"], "Auto-saved in slot %d");
SaveSystem.slotQSave = getString(parameters["Slot Quicksave Text"], "Quick-saved in slot %d");
SaveSystem.ASave = getString(parameters["Autosave Text"], "Auto-saved game");
SaveSystem.QSave = getString(parameters["Quicksave Text"], "Quick-saved game");
SaveSystem.saveFailed = getString(parameters["Save Failure Text"], "Auto/quick-save failed");

// Hotkey configuration
SaveSystem.useHotkeys = getString(parameters["Hotkeys"], "F6,F7").replace(/ /g, '').split(',');

SaveSystem.excludeMaps.sort();
SaveSystem.triggerText = SaveSystem.quicksaveText;

Game_System.prototype.autoSaveGame = function(silent) {
	if (!SaveSystem.stateEnabled) return;
	$gameSystem.onBeforeSave();
	if (DataManager.saveGame(SaveSystem.saveCounter)) {
		StorageManager.cleanBackup(SaveSystem.saveCounter);
		if (SaveSystem.slots > 1)
			SaveSystem.saveCounter = (SaveSystem.saveCounter >= SaveSystem.slots) ? 1 : SaveSystem.saveCounter + 1;
		if (DEBUG) 
			console.log(`Auto-saved in slot ${SaveSystem.saveCounter} on ${SaveSystem.triggerText}`);
		SaveSystem.recentlySaved = 1;
	} else {
		console.warn("Auto-save failed");
		SaveSystem.recentlySaved = 3;
	}
};

SaveSystem.quickSave = function() {
	if (!SaveSystem.stateEnabled || !$gameSystem.isSaveEnabled()) return;
	let savefileId = SaveSystem.saveCounter;
	SaveSystem.triggerText = SaveSystem.standardText;
	$gameSystem.onBeforeSave();
	if (DataManager.saveGame(savefileId)) {
		StorageManager.cleanBackup(savefileId);
		SoundManager.playSave();
		SaveSystem.recentlySaved = 2;
	} else {
		console.warn("Quick save failed");
		SaveSystem.recentlySaved = 3;
	}
	showSaveStatus();
};

SaveSystem.quickLoad = function() {
	const latestSlot = SaveSystem.saveCounter;
	if (latestSlot > 0) {
			const scene = SceneManager._scene;
			if (DataManager.loadGame(latestSlot)) {
				SoundManager.playLoad();
				if (scene instanceof Scene_Base)
					scene.fadeOutAll();
				if ($gameSystem.versionId() !== $dataSystem.versionId) {
					$gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y);
					$gamePlayer.requestMapReload();
				}
				SceneManager.goto(Scene_Map);
				$gameSystem.onAfterLoad();
				console.log(`Game quick-loaded from slot ${latestSlot}`);
			} else if (!(scene instanceof Scene_Load))
				SceneManager.push(Scene_Load);
			else
				SoundManager.playBuzzer();
	} else
		SoundManager.playBuzzer();
};

// Add delayed saving support
const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
	_Scene_Map_update.call(this);
	if (SaveSystem.onMapChange)
		SaveSystem.update();
};

const _DataManager_makeSaveContents = DataManager.makeSaveContents;
DataManager.makeSaveContents = function() {
	const contents = _DataManager_makeSaveContents.call(this);
	contents.saveCounter = SaveSystem.saveCounter;
	return contents;
};

const _DataManager_extractSaveContents = DataManager.extractSaveContents;
DataManager.extractSaveContents = function(contents) {
	_DataManager_extractSaveContents.call(this, contents);
	if (contents.saveCounter !== undefined)
		SaveSystem.saveCounter = contents.saveCounter;
};

SaveSystem.makeTextForSaveDescription = function() {
	let title = $dataSystem.gameTitle || '';
	if (title) // remove known subtitle and version patterns
		title = title.replace(/\s*(?:[\(~][^~\)]+[\)~]|v(?:er)?\.?(?:\d+?\.?)+)\s*/ig, '');
	if (SaveSystem.triggerText) { // auto or quicksave
		if (title)
			title += ': \n';
		return title + SaveSystem.triggerText;
	} else { // default saving
		let mapName = $gameMap.displayName() || '';
		if (mapName)
			mapName += ': \n';
		return title + mapName;
	}
}

const _DataManager_makeSavefileInfo = DataManager.makeSavefileInfo;
DataManager.makeSavefileInfo = function() {
	const info = _DataManager_makeSavefileInfo.call(this);
	info.title = SaveSystem.makeTextForSaveDescription();
	return info;
};

const _Window_SavefileList_drawFileId = Window_SavefileList.prototype.drawFileId;
Window_SavefileList.prototype.drawFileId = function(id, x, y) {
	if(id <= SaveSystem.slots){
		if (this._mode === "save")
			this.changePaintOpacity(false);
		this.drawText(SaveSystem.autoSaveText.replace("%d", id), x, y, SaveSystem.maxTextWidth);
	} else {
		this.changePaintOpacity(true);
		if (_Window_SavefileList_drawFileId)
			_Window_SavefileList_drawFileId.call(this, id, x, y);
		else
this.drawText(TextManager.file + ' ' + (id - SaveSystem.slots), x, y, SaveSystem.maxTextWidth);
	}
};

const _Scene_Save_onSavefileOk = Scene_Save.prototype.onSavefileOk;
Scene_Save.prototype.onSavefileOk = function() {
	if (this.savefileId() <= SaveSystem.slots){
		this.onSaveFailure();
	} else {
		SaveSystem.triggerText = SaveSystem.standardText;
		_Scene_Save_onSavefileOk.call(this);
	}
};

const _Scene_Menu_popScene = Scene_Menu.prototype.popScene;
Scene_Menu.prototype.popScene = function() {
	_Scene_Menu_popScene.call(this);
	if (SaveSystem.onMenuExit) {
		SaveSystem.triggerText = SaveSystem.onMenuExitText;
		$gameSystem.autoSaveGame();
		showSaveStatus();
	}
};

SaveSystem.queueAutoSave = function() {
	this._mapChangeAutoSaveQueued = true;
};

SaveSystem.update = function() {
	if (!this._mapChangeAutoSaveQueued) return;
	if (!$gameMap.isEventRunning() && !$gameMessage.isBusy()) {
		this._mapChangeAutoSaveQueued = false;
		this.triggerText = this.onMapChangeText.replace("%area%", $gameMap.displayName() || SaveSystem.onMapChangeDefaultArea);
		$gameSystem.autoSaveGame();
		showSaveStatus();
	}
};

const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
Game_Player.prototype.performTransfer = function() {
	const transferring = this.isTransferring(); 
	const currentMapId = $gameMap.mapId();
	const isNewMap = this._newMapId > 0 && 
		SaveSystem.excludeMaps.indexOf(this._newMapId) == -1 && 
		SaveSystem.excludeMaps.indexOf(currentMapId) == -1 &&
		this._newMapId != currentMapId;
	
	_Game_Player_performTransfer.call(this);
	if (transferring && isNewMap && SaveSystem.onMapChange)
		SaveSystem.queueAutoSave();
};

function showSaveStatus() {
	if (hasBubbleSupport) {
		if (SaveSystem.recentlySaved === 1) {
			if (SaveSystem.slots > 1) {
				if (SaveSystem.slotASave.length)
					MessageBubbleManager.addBubble(SaveSystem.slotASave.replace("%d", SaveSystem.saveCounter), null, "info");
			} else
				if (SaveSystem.ASave.length)
					MessageBubbleManager.addBubble(SaveSystem.ASave.replace("%d", SaveSystem.saveCounter), null, "info");
		} else if (SaveSystem.recentlySaved === 2) {
			if (SaveSystem.slots > 1) {
				if (SaveSystem.slotQSave.length)
					MessageBubbleManager.addBubble(SaveSystem.slotQSave.replace("%d", SaveSystem.saveCounter), null, "info");
			} else
				if (SaveSystem.QSave.length)
					MessageBubbleManager.addBubble(SaveSystem.QSave.replace("%d", SaveSystem.saveCounter), null, "info");
		} else if (SaveSystem.recentlySaved === 3)
			MessageBubbleManager.addBubble(SaveSystem.saveFailed , null, "warning");
	}
	SaveSystem.recentlySaved = -1;
}

const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	_Game_Interpreter_pluginCommand.call(this, command, args); 
	if (command.toUpperCase() === "AUTOSAVE")
		$gameSystem.autoSaveGame(true);
	else if (command.toUpperCase() === "ENABLE_AUTOSAVE")
		SaveSystem.stateEnabled = true;
	else if (command.toUpperCase() === "DISABLE_AUTOSAVE")
		SaveSystem.stateEnabled = false;
};

if (SaveSystem.resumeText) {
	const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
	Window_TitleCommand.prototype.makeCommandList = function() {
		_Window_TitleCommand_makeCommandList.call(this);
		if (DataManager.isAnySavefileExists())
			this.addCommandAt(0, SaveSystem.resumeText, 'resume');
	};
	
	Window_TitleCommand.prototype.addCommandAt = function(index, name, symbol, enabled, ext) {
		if (enabled === undefined) enabled = true;
		const cmd = { name: name, symbol: symbol, enabled: enabled, ext: ext };
		this._list.splice(index, 0, cmd);
	};
	
	if (SaveSystem.titleMenuAlign) {
		const _Window_TitleCommand_drawItem = Window_TitleCommand.prototype.drawItem;
		Window_TitleCommand.prototype.drawItem = function(index) {
			const rect = this.itemRectForText(index);
			this.resetTextColor();
			this.changePaintOpacity(this.isCommandEnabled(index));
			if (SaveSystem.titleMenuAlign.toLowerCase() === 'center')
				this.drawText(this.commandName(index), rect.x, rect.y, rect.width, 'center');
			else
				_Window_TitleCommand_drawItem.call(this, index);
		};
	}
	
	const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
	Scene_Title.prototype.createCommandWindow = function() {
		_Scene_Title_createCommandWindow.call(this);
		this._commandWindow.setHandler('resume', this.commandResume.bind(this));
		if (DataManager.isAnySavefileExists()) {
			this._commandWindow.selectSymbol('resume');
			//this._commandWindow.select(0);
		}
	};
	
	Scene_Title.prototype.commandResume = function() {
		this._commandWindow.close();
		const latestSavefileId = this.latestSavefileId();
		if (latestSavefileId > 0) {
			DataManager.loadGame(latestSavefileId);
			$gameSystem.onAfterLoad();
			SceneManager.goto(Scene_Map);
		} else
			SceneManager.push(Scene_Load);
	};
	
	Scene_Title.prototype.latestSavefileId = function() {
		let savefileId = 1, timestamp = 0, latestId = 0, latestTimestamp = 0;
		for (let i = /*SaveSystem.slots + */1; i <= DataManager.maxSavefiles(); i++) {
			savefileId = i;
			if (StorageManager.exists(savefileId)) {
				const info = DataManager.loadSavefileInfo(savefileId);
				if (info && info.timestamp) {
					timestamp = info.timestamp;
					if (timestamp > latestTimestamp) {
						latestTimestamp = timestamp;
						latestId = savefileId;
					}
				}
			}
		}
		return latestId;
	};
}

SaveSystem.isGameScene = function() {
	if ($gameMap && $gameMap.isEventRunning() || $gameMessage && $gameMessage.isBusy()) return true;
	if (!SceneManager._scene) return true;
	const scene = SceneManager._scene;
	if (scene instanceof Scene_Title) return true;
	//if (SaveSystem.excludeMaps.some(sceneName => scene.constructor.name === sceneName)) return true; 
	if (scene instanceof Scene_Battle) return true;
	return false;
};

// Yanfly Save Core Compatibility
if (typeof Imported !== "undefined" && Imported.YEP_SaveCore) {	 
		const _Window_SaveAction_isSaveEnabled = Window_SaveAction.prototype.isSaveEnabled;
		Window_SaveAction.prototype.isSaveEnabled = function() {
			return (this.savefileId() <= SaveSystem.slots) ? false : _Window_SaveAction_isSaveEnabled.call(this);
		};
}

// Add hotkeys support if they're provided
if (SaveSystem.useHotkeys && SaveSystem.useHotkeys.length === 2) {
	// Key codes map for function keys
	const keyCodeMap = {
			F6: 117, F7: 118, F9: 120,
			A: 65, B: 66, C: 67, D: 68, E: 69,
			F: 70, G: 71, H: 72, I: 73, J: 74,
			K: 75, L: 76, M: 77, N: 78, O: 79,
			P: 80, Q: 81, R: 82, S: 83, T: 84,
			U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90
	};
	if (keyCodeMap[SaveSystem.useHotkeys[0]])
		Input.keyMapper[keyCodeMap[SaveSystem.useHotkeys[0]]] = "QSave"
	if (keyCodeMap[SaveSystem.useHotkeys[1]])
		Input.keyMapper[keyCodeMap[SaveSystem.useHotkeys[1]]] = "QLoad";

	const oldInputUpdate = Input.update;
	Input.update = function () {
		oldInputUpdate.call(this);
		if (SaveSystem.isGameScene()) return;
		if (this.isTriggered("QSave"))
			SaveSystem.quickSave();
		else if (this.isTriggered("QLoad"))
			SaveSystem.quickLoad();
	};
}

})();