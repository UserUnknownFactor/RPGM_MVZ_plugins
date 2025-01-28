//=============================================================================
// MessageBubble.js
//=============================================================================
/*:
* @plugindesc Simple stackable and configurable message bubbles (toasts) system.
* @version 1.0.0
* 
* @param TextSize
* @desc Size of the text in bubbles
* @default 26
* 
* @param BubbleImage
* @desc Image to use for bubbles (use ! prefix for pictures)
* @default Window
* 
* @param DefaultTimeout
* @desc Default timeout for bubbles (0 for no timeout)
* @default 220
* 
* @param MaxQueueSize
* @desc Message queue display limit
* @default 6
* 
* @param RightMargin
* @desc Right margin from the bubble text to the screen edge
* @default 6
*/

MessageBubbleManager = typeof MessageBubbleManager !== "undefined" ? MessageBubbleManager : {};

(function() {
"use strict";

const PLUGIN_NAME = "MessageBubble"
const DEBUG = false;

// Plugin parameters
const parameters = PluginManager.parameters(PLUGIN_NAME);
const textSize = Number(parameters["TextSize"] || 26);
const bubbleImage = parameters["BubbleImage"] || "Window";
const defaultTimeout = Number(parameters["DefaultTimeout"] || 220);
const maxQueueSize = Number(parameters["MaxQueueSize"] || 6);
const rightMargin = Number(parameters["RightMargin"] || 0)

// Static configuration
const BUBBLE_PADDING = 9;
const BUBBLE_MARGIN = 6;
const POSITION_SMOOTHING_FACTOR = 0.8
const ANIMATION_MULTIPLIER = 0.1;
const MIN_FADE_DURATION = 50;
const MAX_TIMEOUT = 2000;
const WARNING_ICON_INDEX = 21;
const ERROR_ICON_INDEX = 1;
const INFO_ICON_INDEX = 83;
const ICON_SIZE = 32; // Standard RPGM icon size
const USE_SHRINKING = false;

// MessageBubbleManager class
MessageBubbleManager._queue = [];

MessageBubbleManager.initialize = function() {
	this.clear();
};

MessageBubbleManager.clear = function() {
	if (this._queue) {
		this._queue.forEach(bubble => {
			bubble.destroy();
		});
	}
	this._queue = [];
};

MessageBubbleManager.addBubble = function(message, timeout, icon) {
	if (!message) {
		console.warn("Attempted to add empty message bubble");
		return;
	}
	if (!this._queue)
		this.initialize();

	this._queue = this._queue.filter(bubble => {
		if (bubble.opacity <= 10) { // expired messages
			this.removeBubble(bubble);
			return false;
		}
		return true;
	});

	if (this._queue.length >= maxQueueSize)
		this.removeBubble(this._queue[0]);

	timeout = typeof timeout === "undefined" || timeout === null ? defaultTimeout : Math.min(Number(timeout), MAX_TIMEOUT);

	if (DEBUG) console.log(`Adding message bubble: ${message} with timeout: ${timeout}`);
	this._queue.push(new MessageBubble(message, timeout, icon));
};

MessageBubbleManager.removeBubble = function(bubble) {
	const index = this._queue.indexOf(bubble);
	if (index !== -1) {
		if (DEBUG) console.log(`Removing message bubble: ${bubble && bubble._message}`);
		if (bubble)
			bubble.destroy();
		this._queue.splice(index, 1);
	} else {
		console.warn(`Attempted to remove non-existent bubble: ${bubble && bubble._message}`);
	}
};

MessageBubbleManager._giveOrder = function() {
	let orderChanged = false;
	for (let i = 0; i < this._queue.length; i++) {
		if (this._queue[i]._order !== i) {
			this._queue[i]._order = i;
			orderChanged = true;
		}
	}
	if (orderChanged)
		this._queue.forEach(bubble => bubble._updatePosition(true));
	return orderChanged;
};

// MessageBubble class
function MessageBubble(message, timeout, icon) {
	this.initialize(message, timeout, icon);
}

MessageBubble.prototype = Object.create(Sprite.prototype);
MessageBubble.prototype.constructor = MessageBubble;

MessageBubble.prototype.initialize = function(message, timeout, icon) {
	Sprite.prototype.initialize.call(this);
	this._order = 0;
	this._message = message;
	if (typeof icon === "string") {
		let i;
		switch(icon.toLowerCase()) {
			case "warning": this._iconType = WARNING_ICON_INDEX; break;
			case "error": this._iconType = ERROR_ICON_INDEX; break;
			case "info": this._iconType = INFO_ICON_INDEX; break;
			default: this._iconType = (i = parseInt(icon)) && !isNaN(i) ? i : null;
		}
	} else if (typeof icon === "number") {
		this._iconType = icon;
	} else {
		this._iconType = null;
	}
	this._fade = timeout > 0 ? Math.min(MIN_FADE_DURATION, timeout) : MIN_FADE_DURATION;
	this._timer = 0;
	this._bitmap = null;
	this._x = 0;
	this._y = 0;
	this._timeout = timeout || 0;
	this._init();
};

MessageBubble.prototype.destroy = function() {
	if (this._icon) {
		this._icon.destroy();
		this._icon = null;
	}
	if (this._text) {
		if (this._text.bitmap) this._text.bitmap = null;
		this._text.destroy();
		this._text = null;
	}
	if (this._body) {
		if (this._body.bitmap) this._body.bitmap = null;
		this._body.destroy();
		this._body = null;
	}
	if (this._bitmap) this._bitmap = null;
	if (this.parent)
		this.parent.removeChild(this);
	//SceneManager._scene.removeChild(this); // this is the same as above
	Sprite.prototype.destroy.call(this);
};


MessageBubble.prototype._init = function() {
	if (this._message.trim() === "") {
		console.warn(`Empty message provided for ${PLUGIN_NAME}`);
		return;
	}
	if (this._body) { this._body.destroy(); this._body = null; }
	if (this._text) { this._text.destroy(); this._text = null; }

	if (bubbleImage.startsWith('!'))
		this._bitmap = ImageManager.loadPicture(bubbleImage.slice(1));
	else
		this._bitmap = ImageManager.loadSystem(bubbleImage);

	this._bitmap.addLoadListener(() => {
		if (!this._bitmap.isReady()) {
			console.error(`Failed to load the background image for ${PLUGIN_NAME}`);
			return;
		}

		// Create temporary window to process escape codes and measure text
		const tempWindow = new Window_Base(new Rectangle(0, 0, 1, 1));
		const processedText = tempWindow.convertEscapeCharacters(this._message);
		tempWindow.resetFontSettings();
		tempWindow.contents.fontSize = textSize;
		const textWidth = tempWindow.contents.measureTextWidth(processedText);

		// Calculate final dimensions
		const hasIcon = this._iconType !== null;
		const iconWidth = hasIcon ? (ICON_SIZE * ((textSize + BUBBLE_PADDING) / ICON_SIZE)) : 0;
		const iconMargin = hasIcon ? BUBBLE_PADDING : 0;
		const totalWidth = textWidth + iconWidth + (BUBBLE_PADDING * 2) + iconMargin;
		const totalHeight = textSize + (BUBBLE_PADDING * 2);

		// Create the bubble components
		this._body = new Sprite(new Bitmap(totalWidth, totalHeight));
		this._body.anchor.set(0.5);

		if (bubbleImage === "Window") {
			const windowskin = this._bitmap;
			const pw = 192;
			const ph = 192;
			this._body.bitmap.blt(windowskin, 96, 96, pw - 192, ph - 192, 0, 0, totalWidth, totalHeight);
		} else {
			this._body.bitmap.blt(this._bitmap, 0, 0, this._bitmap.width,
					this._bitmap.height, 0, 0, totalWidth, totalHeight);
		}

		this._text = new Sprite(new Bitmap(totalWidth, totalHeight));
		this._text.bitmap.fontSize = textSize;
		this._text.bitmap.textColor = tempWindow.contents.textColor;
		this._text.anchor.set(0.5);

		// Handle icon and text positioning
		if (hasIcon) {
			this._icon = new Sprite();
			this._icon.bitmap = ImageManager.loadSystem("IconSet");
			const ix = this._iconType % 16 * ICON_SIZE;
			const iy = Math.floor(this._iconType / 16) * ICON_SIZE;
			this._icon.setFrame(ix, iy, ICON_SIZE, ICON_SIZE);

			const scale = (textSize + BUBBLE_PADDING) / ICON_SIZE;
			this._icon.scale.x = this._icon.scale.y = scale;

			this._icon.x = -totalWidth/2 + BUBBLE_PADDING;
			this._icon.y = -this._icon.height/2;

			const iconSpace = (ICON_SIZE * scale);
			const iconMargin = BUBBLE_PADDING;
			this._text.bitmap.drawText(processedText,
				iconSpace + BUBBLE_PADDING + iconMargin,
				0,
				totalWidth - iconSpace - (BUBBLE_PADDING * 2) - iconMargin,
				totalHeight,
				"left"
			);

			this.addChild(this._icon);
		} else {
			this._text.bitmap.drawText(processedText, 
				0,
				0,
				totalWidth,
				totalHeight,
				"center"
			);
		}

		this.addChild(this._body);
		this.addChild(this._text);
		SceneManager._scene.addChild(this);

		this._updatePosition();
	});
};

MessageBubble.prototype.update = function() {
	if (this._timer <= MAX_TIMEOUT) this._timer += 1;

	this._updatePosition();
	this._updateAnimation();

	if (this._timeout > 0 && this._timer >= this._timeout) {
		MessageBubbleManager.removeBubble(this);
		return;
	}
	Sprite.prototype.update.call(this);
};

MessageBubble.prototype._updatePosition = function(reordered) {
	if (!reordered)
		MessageBubbleManager._giveOrder();

	const heightUnit = this._body.height + BUBBLE_MARGIN;
	const targetPosX = Graphics.width - (this._body.width/2) - rightMargin;
	const targetPosY = (this._order + 0.5) * heightUnit + BUBBLE_MARGIN;

	this.x = targetPosX;
	this.y = this.y * POSITION_SMOOTHING_FACTOR + targetPosY * (1 - POSITION_SMOOTHING_FACTOR);
	this._x = this.x;
	this._y = this.y;
};

MessageBubble.prototype._updateAnimation = function() {
	if (this._timer <= 10) {
		const popScale = 1 + (10 - this._timer) * 0.05;
		this.scale.set(popScale, popScale);
	} else if  (this._timer <= 30) {
		const m = (30 - this._timer) / 30;
		const t = m * Math.PI * 5;
		this.scale.x = 1 + Math.sin(t) * m * ANIMATION_MULTIPLIER;
		this.scale.y = 1 + Math.cos(t) * m * ANIMATION_MULTIPLIER;
	}

	const dT = Math.max(this._timeout - this._timer, 0);
	if (this._timeout > 0 && dT >= 0 && dT <= this._fade) {
		this.opacity = 255 * dT / this._fade;
		if (USE_SHRINKING && this.opacity <= 180) {
			const shrinkScale = dT / this._fade;
			this.scale.set(shrinkScale, shrinkScale);
		}
	}
};

// Scene handling
const _Scene_Base_terminate = Scene_Base.prototype.terminate;
Scene_Base.prototype.terminate = function() {
	MessageBubbleManager.clear();
	_Scene_Base_terminate.call(this);
};

// Map change handling
const _Game_Map_setup = Game_Map.prototype.setup;
Game_Map.prototype.setup = function(mapId) {
	MessageBubbleManager.clear();
	_Game_Map_setup.call(this, mapId);
};

// Plugin command handling
const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	_Game_Interpreter_pluginCommand.call(this, command, args);
	if (command === "AddBubble") {
		const message = args[0];
		const timeout = Math.max(MIN_FADE_DURATION, Number(args[1])) || defaultTimeout;
		const icon = args[2]; // "warning", "error", "info", or icon index
		MessageBubbleManager.addBubble(message, timeout, icon);
	}
};

MessageBubbleManager.initialize();

if (typeof PluginManager !== "undefined" && PluginManager.register) {
	PluginManager.register(PLUGIN_NAME, "1.0.0", "A plugin for animated message bubbles", {
		"email": "",
		"website": "",
		"description": "Creates floating message bubbles with proper memory management",
		"help": `
			Usage:
				Use the plugin command 'AddBubble "Your message here" [timeout] [icon]' to add a message bubble.
				The timeout parameter is optional and specifies the duration in frames (default: ${defaultTimeout}).

			Parameters:
				TextSize: Bubble text size (default: 26).
				BubbleImage: Image to use for the bubble (default: Window).
				 - Use normal name for system images (e.g., "Window")
				 - Use ! prefix for picture folder images (e.g., "!CustomBubble")
				DefaultTimeout: Default timeout for message bubbles in frames (default: ${defaultTimeout}).
				MaxQueueSize: How much messages display at once (default: 6).

				Notes:
				 - Bubbles automatically clean up on scene changes
				 - Memory management is handled automatically
			`
	});
}
})();