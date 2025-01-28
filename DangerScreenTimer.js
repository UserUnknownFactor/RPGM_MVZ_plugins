/*:
 * @plugindesc [v1.0] Displays a danger screen effect that intensifies as the timer runs out, with a heartbeat pulse effect.
 * 
 * @help 
 * ============================================================================
 *  Danger Screen Timer
 * ============================================================================
 * This plugin creates a dynamic danger screen effect that fades in as the 
 * game timer progresses. It includes a subtle heartbeat pulsing effect and 
 * configurable border properties.
 * 
 * ============================================================================
 *  Plugin Commands
 * ============================================================================
 * This plugin does not provide plugin commands. The effect is automatically 
 * handled based on the game timer.
 * 
 * ============================================================================
 *  Terms of Use
 * ============================================================================
 * Free for commercial and non-commercial use.
 * ============================================================================
 * 
 * @param Maximum Opacity
 * @desc The maximum opacity at the start of the timer (0-255).
 * @type number
 * @min 64
 * @max 200
 * @default 116
 * 
 * @param Minimum Opacity
 * @desc The minimum opacity at the end of the timer (0-255).
 * @type number
 * @min 0
 * @max 64
 * @default 0
 * 
 * @param Heartbeat Strength
 * @desc The intensity of the heartbeat pulse effect.
 * @type number
 * @min 0
 * @max (maximum opacity)/2
 * @default 25
 * 
 * @param Heartbeat Interval
 * @desc The time (in frames) between heartbeat pulses.
 * @type number
 * @min 10
 * @max 200
 * @default 100
 * 
 * @param Border Width
 * @desc The thickness of the danger screen border; if 0 the plugin is disabled.
 * @type number
 * @min 1
 * @default 50
 * 
 * @param Border Color
 * @desc The color of the danger screen border in hex format (e.g., #ff0000).
 * @type string
 * @default #ff0f0f
 */
 
(function() {
const PLUGIN_NAME = "DangerScreenTimer";
const DEBUG = false;

const parameters = PluginManager.parameters(PLUGIN_NAME);
const maxOpacity = Number(parameters['Maximum Opacity'] || 110); // max intensity
const minOpacity = Number(parameters['Minimum Opacity'] || 0); // min intensity
const heartbeatStrength = Number(parameters['Heartbeat Strength'] || 16); // pulse effect
const heartbeatInterval = Number(parameters['Heartbeat Interval'] || 100); // beat timing
const borderWidth = Number(parameters['Border Width'] || 50);
const borderColor = String(parameters['Border Color'] || "#ff0f0f");
const cornerRadius = Math.floor(borderWidth / 2);
const easingFactor = 2; // Non-linear fade-in effect

if (!borderWidth) return;

if (DEBUG)
	console.log(`[${PLUGIN_NAME}] Loaded with settings:`, Object.assign(Object.create(null), {
		maxOpacity,
		minOpacity,
		heartbeatStrength,
		heartbeatInterval,
		borderWidth,
		borderColor,
		cornerRadius,
		easingFactor
	}));

function hexToRGBA(hex, alpha = 1) {
	hex = hex.replace(/^#/, '');
	if (hex.length === 3) {
		hex = hex.split('').map(char => char + char).join('');
	}
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function DangerScreen() {
	this.initialize.apply(this, arguments);
}

DangerScreen.prototype = Object.create(Sprite.prototype);
DangerScreen.prototype.constructor = DangerScreen;

DangerScreen.prototype.initialize = function() {
	Sprite.prototype.initialize.call(this);
	this.createDangerEffect();
	this.opacity = 0;
};

// RPGM MV's NW.js doesn't have it
if (!CanvasRenderingContext2D.prototype.roundRect)
	CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
		if (w < 2 * r) r = w / 2;
		if (h < 2 * r) r = h / 2;
		this.beginPath();
		this.moveTo(x + r, y);
		// Top edge and top-right corner
		this.lineTo(x + w - r, y);
		this.arcTo(x + w, y, x + w, y + r, r);
		// Right edge and bottom-right corner
		this.lineTo(x + w, y + h - r);
		this.arcTo(x + w, y + h, x + w - r, y + h, r);
		// Bottom edge and bottom-left corner
		this.lineTo(x + r, y + h);
		this.arcTo(x, y + h, x, y + h - r, r);
		// Left edge and top-left corner
		this.lineTo(x, y + r);
		this.arcTo(x, y, x + r, y, r);
		this.closePath();
		return this;
	};

DangerScreen.prototype.createDangerEffect = function() {
	const width = Graphics.width;
	const height = Graphics.height;
	this.bitmap = new Bitmap(width, height);
	const ctx = this.bitmap.context;

	ctx.clearRect(0, 0, width, height);

	const rgbaSolid = hexToRGBA(borderColor, 1);
	const rgbaTransparent = hexToRGBA(borderColor, 0);

	// Create hollow center with gradient border
	const gradientWidth = borderWidth;

	// First create the rounded rectangle path
	ctx.beginPath();
	ctx.roundRect(
		borderWidth,
		borderWidth,
		width - (borderWidth * 2),
		height - (borderWidth * 2),
		cornerRadius
	);

	// Create clipping path for the rounded rectangle
	ctx.save();
	ctx.globalCompositeOperation = 'destination-out';
	ctx.fill();
	ctx.restore();

	// Create gradient that fades to transparent towards the center
	const leftGradient = ctx.createLinearGradient(0, 0, gradientWidth * 2, 0);
	leftGradient.addColorStop(0, rgbaSolid);
	leftGradient.addColorStop(1, rgbaTransparent);

	const rightGradient = ctx.createLinearGradient(width, 0, width - gradientWidth * 2, 0);
	rightGradient.addColorStop(0, rgbaSolid);
	rightGradient.addColorStop(1, rgbaTransparent);

	const topGradient = ctx.createLinearGradient(0, 0, 0, gradientWidth * 2);
	topGradient.addColorStop(0, rgbaSolid);
	topGradient.addColorStop(1, rgbaTransparent);

	const bottomGradient = ctx.createLinearGradient(0, height, 0, height - gradientWidth * 2);
	bottomGradient.addColorStop(0, rgbaSolid);
	bottomGradient.addColorStop(1, rgbaTransparent);

	// Draw the border with gradients
	ctx.fillStyle = leftGradient;
	ctx.fillRect(0, 0, gradientWidth * 2, height);

	ctx.fillStyle = rightGradient;
	ctx.fillRect(width - gradientWidth * 2, 0, gradientWidth * 2, height);

	ctx.fillStyle = topGradient;
	ctx.fillRect(0, 0, width, gradientWidth * 2);

	ctx.fillStyle = bottomGradient;
	ctx.fillRect(0, height - gradientWidth * 2, width, gradientWidth * 2);

	this.bitmap._setDirty();
};

DangerScreen.prototype.update = function() {
	Sprite.prototype.update.call(this);
	if ($gameSystem.isDangerScreenEnabled()) {
		let progress = $gameTimer._frames / $gameTimer._initialCount;
		progress = Math.pow(progress, easingFactor);
		const heartbeat = heartbeatStrength ? (Math.sin(($gameTimer._frames % heartbeatInterval) / heartbeatInterval * Math.PI) ** 2) * heartbeatStrength : 0;
		this.opacity = Math.max(minOpacity, Math.floor(maxOpacity * (1 - progress) - heartbeat));
	} else if (this.opacity > 0) {
		$gameSystem.incrementDangerScreenFadeOut();
		this.opacity = Math.max(0, this.opacity - ($gameSystem.getDangerScreenFadeOutTimer() * 2));
	}
};

Game_System.prototype.initDangerScreenState = function() {
	this._dangerScreenEnabled = false;
	this._dangerScreenFadeOutTimer = 0;
};

Game_System.prototype.enableDangerScreen = function() {
	this._dangerScreenEnabled = true;
	this._dangerScreenFadeOutTimer = 0;
};

Game_System.prototype.disableDangerScreen = function() {
	this._dangerScreenEnabled = false;
};

Game_System.prototype.isDangerScreenEnabled = function() {
	return this._dangerScreenEnabled;
};

Game_System.prototype.incrementDangerScreenFadeOut = function() {
	this._dangerScreenFadeOutTimer++;
};

Game_System.prototype.getDangerScreenFadeOutTimer = function() {
	return this._dangerScreenFadeOutTimer;
};

const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
Scene_Map.prototype.createDisplayObjects = function() {
	_Scene_Map_createDisplayObjects.call(this);
	this.createDangerScreen();
};

Scene_Map.prototype.createDangerScreen = function() {
	this._dangerScreen = new DangerScreen();
	this.addChild(this._dangerScreen);
};

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
	_Scene_Map_update.call(this);
	if (this._dangerScreen) {
		this._dangerScreen.update();
	}
};

const _Game_Timer_start = Game_Timer.prototype.start;
Game_Timer.prototype.start = function(count) {
	_Game_Timer_start.call(this, count);
	this._initialCount = count;
	$gameSystem.enableDangerScreen();
};

const _Game_Timer_stop = Game_Timer.prototype.stop;
Game_Timer.prototype.stop = function() {
	_Game_Timer_stop.call(this);
	$gameSystem.disableDangerScreen();
};

const _Game_Timer_onExpire = Game_Timer.prototype.onExpire;
Game_Timer.prototype.onExpire = function() {
	_Game_Timer_onExpire.call(this);
	$gameSystem.disableDangerScreen();
};

const _Game_System_initialize = Game_System.prototype.initialize;
Game_System.prototype.initialize = function() {
	_Game_System_initialize.call(this);
	this.initDangerScreenState();
};

})();