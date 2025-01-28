//=============================================================================
// AutoAdvance.js
//=============================================================================
/*:
 * @plugindesc Adds dialogue auto-advance to message windows, configurable via in-game options menu.
 *
 * @param Character Base Delay
 * @desc Frames delay per added readable character (float; 0.1..10).
 * @default 1.0
 *
 * @param Character Extra Delay
 * @desc Frames delay at the start and for special characters (int; 1..120).
 * @default 6
 *
 * @param Auto Tint Color
 * @desc Color tint for the pause sign in auto mode. (Hexadecimal color code)
 * @default #FF66FF
 *
 * @param Manual Tint Color
 * @desc Color tint for the pause sign in manual mode. (Hexadecimal color code)
 * @default #FFFFFF
 * 
 * @param Auto-Advance Key
 * @desc Text key used for automatic text advance toggle
 * @default 'A'
 *
 * @help
 * Input Mappings:
 *   - Key 'A' (Key code 65) or Gamepad LT button (Button index 6) toggles auto mode.
 *
 * Options Menu:
 *   - "Character Base Delay":	 Adjusts the auto-advance base elay (with left/right arrows).
 *   - "Character Extra Delay": Adjusts the auto-advance extra delay (with left/right arrows).
 *
 * Plugin Commands:
 *  AutoAdvance set <state>   - Sets auto-advance to <state> (converted to Boolean).
 *  AutoAdvance delay <delay> - Sets the auto-advance base delay to <delay> frames (int).
 *  AutoAdvance extra <delay> - Sets the auto-advance extra delay to <delay> frames (float).
 *
 * Settings:
 * In auto mode, message windows will automatically advance after a delay.
 * The delay is read from ConfigManager, configurable in the Options menu.
 * The delay is increased based on the length of the message 
 * and "Character Base/Extra Delay".
 *
 * Pressing the configured key/button toggles auto mode ON/OFF.
 * Manually advancing the message window disables auto mode.
 * Fast-forwarding text also disables auto mode.
 *
 * Terms of Use:
 * - Free for commercial and non-commercial use.
 */
 (function(window) {
"use strict";

const PLUGIN_NAME = "AutoAdvance";
const INPUT_ALIAS = "Auto"

const parameters = PluginManager.parameters(PLUGIN_NAME);
const countdownKey = Symbol(`${PLUGIN_NAME} Countdown`);
var auto = false;

// Plugin Parameters
let characterBaseDelay = Number(parameters["Character Base Delay"] || 1);
let characterExtraDelay = Number(parameters["Character Extra Delay"] || 6);
const autoTint = parseInt((parameters["Auto Tint Color"] || "#FF66FF").replace('#', "0x"));
const manualTint = parseInt((parameters["Manual Tint Color"] || "#FFFFFF").replace('#', "0x"));
const aaKey = String(parameters["Auto-Advance Key"] || 'A').toUpperCase();
const minMessageDisplayTime = 40;
const hasBubbleSupport = typeof MessageBubbleManager !== "undefined";

// Map of RPG Maker's Input system
const keyMapper = {
		F1: 112, F2: 113, F3: 114, F4: 115, F5: 116,
		F6: 117, F7: 118, F8: 119, F9: 120,
		A: 65, B: 66, C: 67, D: 68, E: 69,
		F: 70, G: 71, H: 72, I: 73, J: 74,
		K: 75, L: 76, M: 77, N: 78, O: 79,
		P: 80, Q: 81, R: 82, S: 83, T: 84,
		U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90
};

Input.keyMapper[keyMapper[aaKey]] = INPUT_ALIAS; // Default is A (65) key
Input.gamepadMapper[6] = INPUT_ALIAS; // Default is LT (6) button

function isGameScene() {
	return SceneManager._scene instanceof Scene_Map || 
			SceneManager._scene instanceof Scene_Battle;
}

// Extend Input.update to toggle auto mode
const oldInputUpdate = Input.update;
Input.update = function () {
	if (isGameScene() && this.isTriggered(INPUT_ALIAS)) {
		auto = !auto;
		if (hasBubbleSupport)
			MessageBubbleManager.addBubble("Text will now be " + (auto ? "auto-advanced" : "advanced manually"), null, "info");
	}
	oldInputUpdate.call(this);
};

// Extend Window_Message to handle auto-advance functionality
const WMP = Window_Message.prototype;
// Add extra countdown when a message starts
const oldstartMessage = WMP.startMessage;
WMP.startMessage = function () {
	this[countdownKey] = characterExtraDelay;
	oldstartMessage.call(this);
};

// Normalize countdown when the message ends
const oldOnEndOfText = WMP.onEndOfText ;
WMP.onEndOfText = function () {
	this[countdownKey] = Math.max(this[countdownKey], minMessageDisplayTime);
	oldOnEndOfText.call(this);
};

// Handle input and auto-advance logic
const oldUpdateInput = WMP.updateInput;
WMP.updateInput = function () {
	const wasPaused = this.pause;
	const shouldYield = oldUpdateInput.call(this);

	// Disable auto mode if message was manually advanced
	if (auto && wasPaused && !this.pause) {
		auto = false;
		if (hasBubbleSupport)
			MessageBubbleManager.addBubble("Text will now be advanced manually", null, "info");
	}

	// Auto-advance logic
	if (auto && shouldYield && this.pause) {
		if (this[countdownKey] <= 0) {
			this.pause = false; // Unpause
			if (!this._textState) this.terminateMessage(); // Terminate if no text remains
		} else {
			this[countdownKey]--;
		}
	}
	return shouldYield;
};

// Adjust countdown based on the text being processed
const oldProcessCharacter = WMP.processCharacter;
WMP.processCharacter = function (textState) {
	oldProcessCharacter.call(this, textState);
	let extraDelay = 0, baseDelay = characterBaseDelay;
	if (textState.index > 0) {
		const currentChar = textState.text[textState.index - 1]; // Get the character that *was* just processed
		if (['.', '?', '!', '♡', '♥', '♪'].includes(currentChar))	extraDelay += characterExtraDelay * 1.5;
		else if (['. ', '? ', '! ', '……'].some(s => textState.text.slice(textState.index - 2, textState.index) === s)) extraDelay += characterExtraDelay * 2.5;
		else if ([',', ';', ':'].includes(currentChar)) extraDelay += characterExtraDelay * 0.75;
		else if (currentChar === currentChar.toUpperCase() && currentChar !== currentChar.toLowerCase()) extraDelay += baseDelay * 2;
		else if ([' ', '"', "'", '(', ')'].includes(currentChar) && textState.text.length > 5) baseDelay = 0;
	}
	const textProgress = textState.x / Graphics.width;
	extraDelay += textProgress * characterExtraDelay * 0.5;
	if (auto)
		this[countdownKey] += baseDelay + extraDelay;
};

// Stop auto mode when text is fast-forwarded
const oldUpdateShowFast = WMP.updateShowFast;
WMP.updateShowFast = function () {
	if (this._showFast && auto) {
		auto = false;
		if (hasBubbleSupport)
			MessageBubbleManager.addBubble("Text will now be advanced manually", null, "info");
	}
	return oldUpdateShowFast.call(this);
};

// Update tint of the pause sign based on auto/manual mode
const oldUpdatePauseSign = WMP._updatePauseSign;
WMP._updatePauseSign = function () {
	this._windowPauseSignSprite.tint = auto ? autoTint : manualTint;
	oldUpdatePauseSign.call(this);
};

// Save settings to configuration data
const oldMakeData = ConfigManager.makeData;
ConfigManager.makeData = function () {
	const config = oldMakeData.call(this);
	config.characterBaseDelay = characterBaseDelay;
	config.characterExtraDelay = characterExtraDelay;
	return config;
};

// Load settings from configuration data
const oldApplyData = ConfigManager.applyData;
ConfigManager.applyData = function (config) {
	oldApplyData.call(this, config);
	if (config.hasOwnProperty("characterBaseDelay"))
		characterBaseDelay = config.characterBaseDelay;
	if (config.hasOwnProperty("characterExtraDelay"))
		characterExtraDelay = config.characterExtraDelay;
};

// Initialize settings from configuration data on game start
const oldDataManager_createGameObjects = DataManager.createGameObjects;
DataManager.createGameObjects = function() {
	oldDataManager_createGameObjects.call(this);
	ConfigManager.load();
	const config = ConfigManager.makeData();
	if (config.hasOwnProperty("characterBaseDelay"))
		characterBaseDelay = config.characterBaseDelay;
	if (config.hasOwnProperty("characterExtraDelay"))
		characterExtraDelay = config.characterExtraDelay;
};

// Add the plugin options to Options menu
const WOP = Window_Options.prototype;
const oldMakeCommandList = WOP.makeCommandList;
WOP.makeCommandList = function () {
	oldMakeCommandList.call(this);
	this.addCommand("Character Delay", "characterBaseDelay");
	this.addCommand("Extra Delay", "characterExtraDelay");
};

const oldStatusText = WOP.statusText;
WOP.statusText = function (index) {
	const symbol = this.commandSymbol(index);
	if (symbol === "characterBaseDelay")
		return characterBaseDelay.toFixed(1);
	if (symbol === "characterExtraDelay")
		return characterExtraDelay.toString();
	return oldStatusText.call(this, index);
};

const oldProcessOk = WOP.processOk;
WOP.processOk = function () {
	const index = this.index();
	const symbol = this.commandSymbol(index);
	if (symbol === "characterExtraDelay") {
		this.changeValue(symbol, characterExtraDelay, 1, 120);
	} else if (symbol === "characterBaseDelay") {
		this.changeValue(symbol, characterBaseDelay, 0.1, 10);
	} else {
		oldProcessOk.call(this);
	}
};

const oldCursorRight = WOP.cursorRight;
WOP.cursorRight = function (wrap) {
	const index = this.index();
	const symbol = this.commandSymbol(index);
	if (symbol === "characterExtraDelay") {
		characterExtraDelay += 1;
		if (characterExtraDelay > 120) characterExtraDelay = 120;
		this.redrawItem(index);
		SoundManager.playCursor();
		ConfigManager.save();
	} else if (symbol === "characterBaseDelay") {
		characterBaseDelay = Math.round((characterBaseDelay + 0.1) * 10) / 10;
		if (characterBaseDelay > 10) characterBaseDelay = 10;
		this.redrawItem(index);
		SoundManager.playCursor();
		ConfigManager.save();
	} else {
		oldCursorRight.call(this, wrap);
	}
};

const oldCursorLeft = WOP.cursorLeft;
WOP.cursorLeft = function (wrap) {
	const index = this.index();
	const symbol = this.commandSymbol(index);
	if (symbol === "characterExtraDelay") {
		characterExtraDelay -= 1;
		if (characterExtraDelay < 1) characterExtraDelay = 1;
		this.redrawItem(index);
		SoundManager.playCursor();
		ConfigManager.save();
	} else if (symbol === "characterBaseDelay") {
		characterBaseDelay = Math.round((characterBaseDelay - 0.1) * 10) / 10;
		if (characterBaseDelay < 0.1) characterBaseDelay = 0.1;
		this.redrawItem(index);
		SoundManager.playCursor();
		ConfigManager.save();
	} else {
		oldCursorLeft.call(this, wrap);
	}
};

const oldPluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function (command, args) {
	oldPluginCommand.call(this, command, args);
	if (command !== PLUGIN_NAME) return;
	switch (args[0]) {
		case "set":
			auto = Boolean(args[1]);
			break;
		case "delay":
			const newCharacterDelay = Number(args[1]);
			if (isNaN(newCharacterDelay)) {
				console.error(`Invalid Character Base Delay value: ${args[1]}`);
			} else {
				characterBaseDelay = Math.min(Math.max(newCharacterDelay, 0.1) , 10);
			}
			break;
		case "extra":
			const newCharacterExtra = Number(args[1]);
			if (isNaN(newCharacterExtra)) {
				console.error(`Invalid Character Extra Delay value: ${args[1]}`);
			} else {
				characterExtraDelay = Math.min(Math.max(newCharacterExtra, 1) , 120);
			}
			break;
	}
};
})(window);