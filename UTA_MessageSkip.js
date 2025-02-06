//=============================================================================
// UTA_MessageSkip.js
//=============================================================================
// Version	: 1.10
// LastUpdate : 2025.02.07
// Author    : Various (original by T.Akatsuki)
// License   : MIT License(http://opensource.org/licenses/mit-license.php)
//=============================================================================

//=============================================================================
/*:
 * @plugindesc Allows to skip messages on pressing a particular key.
 * @author Various
 *
 * @param Skip Key
 * @desc Set the message skip key. The value has been defined in the Input.KeyMapper is valid.
 * @default control
  *
 * @param Max Speed
 * @desc Maximum movement speed during skip (normal is 4)
 * @default 10
 *
 * @param Bubble Limit
 * @desc Limit animated bubbles above character to N frames during skip.
 * @default 5
 *
 * @param Show Trace
 * @desc Set state traces display.
 * true  : Show trace., false : Don't show trace.
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
 *    Initial value is in 'control'.
 * 
 *   Show Trace [true|false]
 *    Set whether the issue a trace for debugging.
 * 
 * # Plugin Commands
 *   There is no plugin command.
 * 
 * # Change Log
 *   ver 1.10 (Feb 7, 2025)
 *    Added movement and bubble acceleration
 */

(function(){
const PLUGIN_NAME = 'UTA_MessageSkip'
const TOP_SPEED = 10;
const FRAMES_TO_SHOW = 5

const getBoolean = (str, def) => { return !!str ? !!str.match(/(?:true|y(?:es)?)/i) : !!def };

var parameters = PluginManager.parameters(PLUGIN_NAME);

const _skipKey = String(parameters['Skip Key'] || "control");
const _maxSpeed = Number(parameters['Max Speed'] || TOP_SPEED);
const _limitFrames = Number(parameters['Bubble Limit'] || FRAMES_TO_SHOW);
const _show_tr = getBoolean(parameters['Show Trace'], false);
const _tr = _show_tr ? (s) => { console.log(`[${PLUGIN_NAME}] ${s}`); } : (s) => {};

_tr("Skip key bound: " + _skipKey);

// Check if the skip key is pressed
const isPressedMsgSkipButton = function(){
	return Input.isPressed(_skipKey);
};

//-----------------------------------------------------------------------------
// Window_Message
//-----------------------------------------------------------------------------
// If the skip key is pressed while text is being displayed, show all text immediately
var _Window_Message_updateShowFast = Window_Message.prototype.updateShowFast;
Window_Message.prototype.updateShowFast = function() {
	_Window_Message_updateShowFast.call(this);
	if (isPressedMsgSkipButton()) {
		this._showFast = true;
		this._pauseSkip = true;
	}
};

// While waiting for key input after displaying text, monitor skip key input
var _Window_Message_updateInput = Window_Message.prototype.updateInput;
Window_Message.prototype.updateInput = function() {
	var ret = _Window_Message_updateInput.call(this);

	if(this.pause && isPressedMsgSkipButton()){
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
var Window_ScrollText_scrollSpeed = Window_ScrollText.prototype.scrollSpeed;
Window_ScrollText.prototype.scrollSpeed = function() {
	var ret = Window_ScrollText_scrollSpeed.call(this);
	if (isPressedMsgSkipButton()) ret *= 100;
	return ret;
};

//-----------------------------------------------------------------------------
// Window_BattleLog
//-----------------------------------------------------------------------------
// Battle log will display at super high speed
var _Window_BattleLog_messageSpeed = Window_BattleLog.prototype.messageSpeed;
Window_BattleLog.prototype.messageSpeed = function() {
	var ret = _Window_BattleLog_messageSpeed.call(this);
	if (isPressedMsgSkipButton()) ret = 1;
	return ret;
};

//-----------------------------------------------------------------------------
// Game_CharacterBase
//-----------------------------------------------------------------------------
// Accelerate character movement/actions when the skip key is pressed
const _Game_CharacterBase_update = Game_CharacterBase.prototype.update;
Game_CharacterBase.prototype.update = function() {
	_Game_CharacterBase_update.call(this);

	// Only handle acceleration during message scenes or when a message just ended but movement continues
	if ($gameMessage.isBusy() || (this._originalSpeed && $gameMap.isEventRunning())) {
		// Store original speed when scene starts
		if (!this._originalSpeed)
			this._originalSpeed = this.moveSpeed();

		if (isPressedMsgSkipButton()) {
			this.setMoveSpeed(_maxSpeed);
		} else {
			this.setMoveSpeed(this._originalSpeed);
		}
	} else if (this._originalSpeed) {
		// Reset when scene is completely done
		this.setMoveSpeed(this._originalSpeed);
		this._originalSpeed = null;
	}
};


//-----------------------------------------------------------------------------
// Sprite_Character
//-----------------------------------------------------------------------------
// Accelerate balloon animation when the skip key is pressed
var _Sprite_Character_updateBalloon = Sprite_Character.prototype.updateBalloon;
Sprite_Character.prototype.updateBalloon = function() {
	_Sprite_Character_updateBalloon.call(this);
	if (this._balloonSprite) {
		if (isPressedMsgSkipButton()) {
			const minDuration = Math.min(this._balloonSprite._duration, _limitFrames);
			this._balloonSprite._duration = minDuration;
		}
	}
};

})();

