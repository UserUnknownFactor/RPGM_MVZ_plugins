//=============================================================================
// MessageHide.js
//=============================================================================
/*:
@plugindesc v1.0 Defines buttons to toggle whether the message window/name is shown.

@param Keys
@desc Keys/buttons that toggle message window visibility when pressed. 
      Separate values with a space. See the code for list.
@default "pageup h"

@param Right Click
@desc Whether right click toggles message window visibility.
@default true

@param Show on New Page
@desc Whether Message Window automatically becomes visible on a new dialogue page.
@default true

@help
Message Window visibility is reset by pressing the key again, 
or resetting the game.
Game events can also make it happen with plugin command: `ShowMessageWindow`
With "Show on New Page" param true, visibility is reset for 
each new message window page.

"key" parameter takes multiple values separated by a space.
For example: "pageup h" will define H and PageUp keys 
(and keys synonymous with PageUp like gamepad side buttons).

Terms of Use:
- Free for commercial and non-commercial use.
*/
(function() {
const PLUGIN_NAME = "MessageHide"
const INPUT_ALIAS = "Hide"

const getBoolean = (str, def) => (!!str ? !!str.match(/(?:true|on|y(?:es)?)/i) : !!def);

const parameters = PluginManager.parameters(PLUGIN_NAME);
const pKey = String(parameters["Keys"] || "H").toLowerCase().split(" ");
const pRightClick = getBoolean(parameters["Right Click"], true);
const pNewPage = getBoolean(parameters["Show on New Page"], true);

const key_ids = {
	"tab": 9, "enter": 13, "shift": 16, "ctrl": 17, "alt": 18, "space": 32, "pageup": 33, "pagedown": 34,
	"0": 48, "1": 49, "2": 50, "3": 51, "4": 52, "5": 53, "6": 54, "7": 55, "8": 56, "9": 57,
	"a": 65, "b": 66, "c": 67, "d": 68, "e": 69, "f": 70, "g": 71, "h": 72, "i": 73, "j": 74, "k": 75, "l": 76, "m": 77,
	"n": 78, "o": 79, "p": 80, "q": 81, "r": 82, "s": 83, "t": 84, "u": 85, "v": 86, "w": 87, "x": 88, "y": 89, "z": 90,
	"semicolon": 186, "comma": 188, "period": 190, "quote": 222,
};

pKey.forEach(p => {
	if (!p.trim()) return;
	if (key_ids[p]) {
		if (!Input.keyMapper[key_ids[p]])
				Input.keyMapper[key_ids[p]] = INPUT_ALIAS;
	} else if (!Input.keyMapper[p]) {
		console.log(`Unrecognized ${PLUGIN_NAME} button configured: ${p}`);
		delete pKey[p];
	}
});

let MessageHide_messageWindowShowNext = false;
let MessageHide_messageWindowVisible = true;

function isGameScene() {
	return SceneManager._scene instanceof Scene_Map || 
			SceneManager._scene instanceof Scene_Battle;
}

//=============================================================================
// Window Message
//=============================================================================
const oldInputUpdate = Input.update;
Input.update = function () {
	oldInputUpdate.call(this);
	if (isGameScene() && this.isTriggered(INPUT_ALIAS))
		MessageHide_messageWindowVisible = !MessageHide_messageWindowVisible;
};

const oldWindowMessageUpdate = Window_Message.prototype.update;
Window_Message.prototype.update = function() {
	oldWindowMessageUpdate.call(this);
	if (MessageHide_messageWindowShowNext === true) {
		MessageHide_messageWindowVisible = true;
		MessageHide_messageWindowShowNext = false;
	}
	if (this._nameWindow)
		this._nameWindow.visible = MessageHide_messageWindowVisible;
	this.visible = MessageHide_messageWindowVisible;
};

if (pRightClick) {
	const oldWindowMessageUpdateRC = Window_Message.prototype.update;
	Window_Message.prototype.update = function() {
		oldWindowMessageUpdateRC.call(this);
		this.processRightClick();
	};

	Window_Message.prototype.processRightClick = function() {
		if (this.isOpen() && this.active && TouchInput.isCancelled()) {
				MessageHide_messageWindowVisible = !MessageHide_messageWindowVisible;
				if (this._nameWindow)
					this._nameWindow.visible = MessageHide_messageWindowVisible;
		}
	};
}

if (pNewPage) {
	const oldWindowMessageNewPage = Window_Message.prototype.newPage;
	Window_Message.prototype.newPage = function(textState) {
		oldWindowMessageNewPage.call(this, textState);
		MessageHide_messageWindowVisible = true;
	};
}

//=============================================================================
// Game Interpreter
//=============================================================================
const oldGameInterpretePluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	oldGameInterpretePluginCommand.call(this, command, args);
	if (command !== "ShowMessageWindow") return;
	MessageHide_messageWindowShowNext = true;
};

//=============================================================================
// Window NameBox (Yanfly Message Core compatibility)
//=============================================================================
if (typeof Imported !== "undefined" && Imported.YEP_MessageCore) {
	const oldWindowNameBoxUpdate = Window_NameBox.prototype.update;
	Window_NameBox.prototype.update = function() {
		oldWindowNameBoxUpdate.call(this);
		if (Input.isTriggered(INPUT_ALIAS))
				this.visible = MessageHide_messageWindowVisible;
	};

	if (pRightClick) {
		const oldWindowNameBoxUpdateRC = Window_NameBox.prototype.update;
		Window_NameBox.prototype.update = function() {
				oldWindowNameBoxUpdateRC.call(this);
				if (this._parentWindow.isOpen() && this.isOpen())
					this.visible = this._parentWindow.visible;
		};
	}
}
})();
