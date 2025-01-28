//=============================================================================
// MessageSkip.js
//=============================================================================
// Version    : 1.10
// LastUpdate : 2025.02.07
// Author     : Various (original by T.Akatsuki)
// License    : MIT License (https://opensource.org/license/mit)
//=============================================================================

/*:
 * @plugindesc Allows to skip messages on pressing a particular key.
 *
 * @param Skip Key
 * @desc [String] Set the message skip key. The value has been defined in the Input.KeyMapper is valid.
 * @default control
 *
 * @param Max Speed
 * @desc [Number] Maximum movement speed during skipping, normal is 4 which disables this.
 * @default 10
 *
 * @param Bubble Limit
 * @desc [Number] Limit animated bubbles above character to N frames during skipping.
 * @default 5
 *
 * @param Scroll Multiplier
 * @desc [Number] Maximum accelerated scroll multiplier during skipping.
 * @default 2.0
 *
 * @param Minimum Wait
 * @desc [Number] Minimum wait in frames during skipping; 0 value disables this option.
 * @default 15
 *
 * @param Debug Mode
 * @desc [Boolean] Set debug mode.
 * @on  : Show trace and enable debug branches.
 * @off : No debugging branches.
 * @default false
 *
 * @help # Overview
 * MessageSkip plugin can be done to skip in that continue to press a specfic key in a message display.
 * Well there is a message skip functions in such Novel games.
 * Skip if choice window will be temporarily supended.
 *
 * # Parameters
 *   Skip Key [any key]
 *    Set the message skip key.
 *    The value that has been defined in Input.keyMapper is valid.
 *    Default value is in "control".
 * 
 *   Debug Mode [true|false]
 *    Set whether use debugging branches like trace etc.
 * 
 * # Plugin Commands
 *   There is no plugin command.
 * 
 * # Change Log
 *   ver 2.0 (Feb 7, 2025)
 *    Added movement, bubble, scroll acceleration and wait reduction during skipping
 */

(function(){
const PLUGIN_NAME = "MessageSkip";

var INPUT_ALIAS = "Skip";
const TOP_SPEED = 10;         // Maximum game character speed (4 = disabled)
const FRAMES_TO_SHOW = 5;     // Accelerated balloon max frames (0 = disabled)
const TEXT_SCROLL_MUL = 100;  // Text scroll speed multiplier
const MAX_SCROLL_MUL = 2.0;   // Maximum map scroll speed multiplier (1.0 = disabled)
const MIN_WAIT = 15;          // Minimum wait reduction (0 = disabled)
const WAIT_REDUCT_MUL = 0.3;  // Wait reduction multiplier
const BIG_WAIT_MUL = 0.2;     // Wait reduction multiplier if wait >= 60 frames
const SCROLL_ACCEL = 0.1;     // How fast scroll accelerates
const SCROLL_DECEL = 0.2;     // How fast scroll decelerates

const getBoolean = (str, def) => (!!str ? !!str.match(/(?:true|on|y(?:es)?)/i) : !!def);

const parameters = PluginManager.parameters(PLUGIN_NAME);
const DEBUG = getBoolean(parameters["Debug Mode"], false);
const _maxSpeed = Number(parameters["Max Speed"] || TOP_SPEED);
const _limitFrames = Number(parameters["Bubble Limit"] || FRAMES_TO_SHOW);
const _scrollMult = parseFloat(parameters["Scroll Multiplier"] || MAX_SCROLL_MUL);
const _minWait = Number(parameters["Minimum Wait"] || MIN_WAIT);

let _skipKey = String(parameters["Skip Key"] || "control");
const IS_CTRL = _skipKey === "ctrl" || _skipKey === "control";

const log = DEBUG ? (s) => { console.log(`[${PLUGIN_NAME}] ${s}`); } : (s) => {};

const key_ids = {
	"tab": 9, "shift": 16, "control": 17, "ctrl": 17, "alt": 18, "s": 83,
	"semicolon": 186, "comma": 188, "period": 190, "quote": 222,
};

if (!IS_CTRL) Input.keyMapper[key_ids[_skipKey]] = INPUT_ALIAS;
else INPUT_ALIAS = _skipKey = "control";

log(`Skip key bound: ${ _skipKey}; alias: ${INPUT_ALIAS}`);

if (IS_CTRL && DEBUG) // Stop skipping on debug breaks & window switch
	window.addEventListener("focus", () => {
		document.dispatchEvent(new KeyboardEvent("keyup", { key: "Control" }));
	});

// Check if the skip key is pressed
const isPressedMsgSkipButton = function(){
	return Input.isPressed(INPUT_ALIAS) && document.hasFocus();
};

//-----------------------------------------------------------------------------
// Window_Message
//-----------------------------------------------------------------------------
// If the skip key is pressed while text is being displayed, show all text immediately
const _Window_Message_updateShowFast = Window_Message.prototype.updateShowFast;
Window_Message.prototype.updateShowFast = function() {
	_Window_Message_updateShowFast.call(this);
	if (isPressedMsgSkipButton()) {
		this._showFast = true;
		this._pauseSkip = true;
	}
};

// While waiting for key input after displaying text, monitor skip key input
const _Window_Message_updateInput = Window_Message.prototype.updateInput;
Window_Message.prototype.updateInput = function() {
	const ret = _Window_Message_updateInput.call(this);

	if (this.pause && isPressedMsgSkipButton()) {
		this.pause = false;
		if (!this._textState)
			this.terminateMessage();
		return true;
	}
	return ret;
};

//-----------------------------------------------------------------------------
// Window_ScrollText
//-----------------------------------------------------------------------------
// Scroll messages will flow much faster
const Window_ScrollText_scrollSpeed = Window_ScrollText.prototype.scrollSpeed;
Window_ScrollText.prototype.scrollSpeed = function() {
	let ret = Window_ScrollText_scrollSpeed.call(this);
	if (isPressedMsgSkipButton()) ret *= TEXT_SCROLL_MUL;
	return ret;
};

//-----------------------------------------------------------------------------
// Game_Map
//-----------------------------------------------------------------------------
// Override the scroll distance calculation to double scroll speed on skip
var currentSpeedMultiplier = 1.0;
const _Game_Map_updateScroll = Game_Map.prototype.updateScroll;
if (_scrollMult > 1.0)
	Game_Map.prototype.updateScroll = function() {
		if (this.isScrolling()) {
			if (isPressedMsgSkipButton())
				currentSpeedMultiplier = Math.min(currentSpeedMultiplier + SCROLL_ACCEL, _scrollMult);
			else if (currentSpeedMultiplier > 1.0)
				currentSpeedMultiplier = Math.max(currentSpeedMultiplier - SCROLL_DECEL, 1.0);

			let originalSpeed = this._scrollSpeed;
			this._scrollSpeed *= currentSpeedMultiplier;
			_Game_Map_updateScroll.call(this);
			this._scrollSpeed = originalSpeed;
		} else
			_Game_Map_updateScroll.call(this);
	};

//-----------------------------------------------------------------------------
// Window_BattleLog
//-----------------------------------------------------------------------------
// Battle log will display at super high speed
const _Window_BattleLog_messageSpeed = Window_BattleLog.prototype.messageSpeed;
Window_BattleLog.prototype.messageSpeed = function() {
	let ret = _Window_BattleLog_messageSpeed.call(this);
	if (isPressedMsgSkipButton()) ret = 1;
	return ret;
};

//-----------------------------------------------------------------------------
// Game_CharacterBase
//-----------------------------------------------------------------------------
// Accelerate character movement/actions when the skip key is pressed
const _Game_CharacterBase_update = Game_CharacterBase.prototype.update;
if (_maxSpeed > 4) {
	Game_CharacterBase.prototype.update = function() {
		_Game_CharacterBase_update.call(this);

		// Only handle acceleration during messages, map entry or when a message ended but movement continues
		if ($gameMessage.isBusy() || $gameMap.isEventRunning()) {
			// Store original speed when scene starts
			if (!this._originalSpeed)
				this._originalSpeed = this.moveSpeed();

			this.setMoveSpeed(isPressedMsgSkipButton() ? _maxSpeed : this._originalSpeed);
		} else if (this._originalSpeed) {
			// Reset when scene is completely done
			this.setMoveSpeed(this._originalSpeed);
			this._originalSpeed = null;
		}
	};
}

//-----------------------------------------------------------------------------
// Sprite_Character
//-----------------------------------------------------------------------------
// Accelerate balloon animation when the skip key is pressed
const _Sprite_Character_updateBalloon = Sprite_Character.prototype.updateBalloon;
if (_limitFrames > 0)
	Sprite_Character.prototype.updateBalloon = function() {
		_Sprite_Character_updateBalloon.call(this);
		if (($gameMessage.isBusy() || $gameMap.isEventRunning()) && this._balloonSprite && isPressedMsgSkipButton()) {
			const minDuration = Math.min(this._balloonSprite._duration, _limitFrames);
			this._balloonSprite._duration = minDuration;
		}
	};

//-----------------------------------------------------------------------------
// Game_Interpreter
//-----------------------------------------------------------------------------
function getAdjustedWaitTime(originalWait) {
	if (isPressedMsgSkipButton()) {	   
		if (originalWait >= 60)
			return Math.max(_minWait, Math.floor(originalWait * BIG_WAIT_MUL));
		else if (originalWait <= _minWait)
			return originalWait;
		return Math.max(_minWait, Math.floor(originalWait * WAIT_REDUCT_MUL));
	}
	return originalWait;
}

const _Game_Interpreter_wait = Game_Interpreter.prototype.wait;
if (_minWait > 0)
	Game_Interpreter.prototype.wait = function(duration) {
		_Game_Interpreter_wait.call(this, getAdjustedWaitTime(duration));
	};

})();

