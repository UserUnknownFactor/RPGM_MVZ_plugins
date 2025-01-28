/*:
 * @plugindesc Creates sparkle effects above collectible items on the map
 * @author Fixed by Claude
 *
 * @param SparkleOpacity
 * @desc Opacity of the sparkle effect (0.0 to 1.0)
 * @default 0.5
 *
 * @param SparkleScale
 * @desc Size scale of the sparkle effect
 * @default 0.8
 *
 * @param SparkleSpeed
 * @desc Speed of the sparkle animation
 * @default 0.3
 *
 * @param AnimationDuration
 * @desc Duration of one sparkle animation cycle
 * @default 120
 *
 * @param ItemOpacity
 * @desc Opacity of items after they've been collected
 * @default 0.5
 *
 * @param SelfSwitchKey
 * @desc Self switch key used to mark collected items (A, B, C, or D)
 * @default A
 */

(function() {
'use strict';

const parameters = PluginManager.parameters('SparkleCollectables');
const sparkleOpacity = parseFloat(parameters['SparkleOpacity'] || 0.3);
const sparkleScale = parseFloat(parameters['SparkleScale'] || 0.5);
const sparkleSpeed = parseFloat(parameters['SparkleSpeed'] || 0.3);
const animationDuration = parseInt(parameters['AnimationDuration'] || 60);
const itemOpacity = parseFloat(parameters['ItemOpacity'] || 0.5);
const selfSwitchKey = String(parameters['SelfSwitchKey'] || 'A');

//=============================================================================
// Sprite_Sparkle
//=============================================================================
function Sprite_Sparkle() {
	this.initialize.apply(this, arguments);
}

Sprite_Sparkle.prototype = Object.create(Sprite.prototype);
Sprite_Sparkle.prototype.constructor = Sprite_Sparkle;

Sprite_Sparkle.prototype.initialize = function(event) {
	Sprite.prototype.initialize.call(this);
	this._event = event;

	// Create a star-like sparkle
	this.bitmap = this.createSparkleImage();
	this.anchor.x = 0.5;
	this.anchor.y = 0.5;
	this.scale.x = sparkleScale;
	this.scale.y = sparkleScale;
	this.opacity = 0;
	this.animationTimer = Math.floor(Math.random() * animationDuration); // Randomize starting point
	this.animationDirection = 1;
	this.blendMode = 1; // Add blend mode for nicer effect

	// Update position immediately
	this.updatePosition();
	};

Sprite_Sparkle.prototype.createSparkleImage = function() {
	var bitmap = new Bitmap(32, 32);
	var ctx = bitmap._context;

	// Clear the canvas completely
	ctx.clearRect(0, 0, 32, 32);

	// Center point
	var centerX = 16;
	var centerY = 16;

	// Draw the sparkle with separate paths for each ray to avoid connection lines
	ctx.save();
	ctx.translate(centerX, centerY);

	// Create the glow background first
	ctx.beginPath();
	ctx.arc(0, 0, 14, 0, Math.PI * 2, false);
	var backgroundGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
	backgroundGlow.addColorStop(0, 'rgba(255, 255, 200, 0.5)');
	backgroundGlow.addColorStop(1, 'rgba(255, 255, 150, 0)');
	ctx.fillStyle = backgroundGlow;
	ctx.fill();

	// Draw primary vertical ray (top)
	ctx.beginPath();
	ctx.moveTo(0, -14);
	ctx.lineTo(2, -3);
	ctx.lineTo(-2, -3);
	ctx.closePath();
	ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
	ctx.fill();

	// Draw primary horizontal ray (right)
	ctx.beginPath();
	ctx.moveTo(14, 0);
	ctx.lineTo(3, 2);
	ctx.lineTo(3, -2);
	ctx.closePath();
	ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
	ctx.fill();

	// Draw primary vertical ray (bottom)
	ctx.beginPath();
	ctx.moveTo(0, 14);
	ctx.lineTo(-2, 3);
	ctx.lineTo(2, 3);
	ctx.closePath();
	ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
	ctx.fill();

	// Draw primary horizontal ray (left)
	ctx.beginPath();
	ctx.moveTo(-14, 0);
	ctx.lineTo(-3, -2);
	ctx.lineTo(-3, 2);
	ctx.closePath();
	ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
	ctx.fill();

	// Draw diagonal rays (smaller)
	// Northeast ray
	ctx.beginPath();
	ctx.moveTo(10, -10);
	ctx.lineTo(4, -4);
	ctx.lineTo(6, -6);
	ctx.closePath();
	ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
	ctx.fill();

	// Southeast ray
	ctx.beginPath();
	ctx.moveTo(10, 10);
	ctx.lineTo(4, 4);
	ctx.lineTo(6, 6);
	ctx.closePath();
	ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
	ctx.fill();

	// Southwest ray
	ctx.beginPath();
	ctx.moveTo(-10, 10);
	ctx.lineTo(-4, 4);
	ctx.lineTo(-6, 6);
	ctx.closePath();
	ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
	ctx.fill();

	// Northwest ray
	ctx.beginPath();
	ctx.moveTo(-10, -10);
	ctx.lineTo(-4, -4);
	ctx.lineTo(-6, -6);
	ctx.closePath();
	ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
	ctx.fill();


	// Add central glow (on top of everything)
	ctx.beginPath();
	ctx.arc(0, 0, 5, 0, Math.PI * 2, false);
	var glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
	glowGradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
	glowGradient.addColorStop(0.5, 'rgba(255, 250, 230, 0.8)');
	glowGradient.addColorStop(1, 'rgba(255, 240, 200, 0.2)');
	ctx.fillStyle = glowGradient;
	ctx.fill();

	ctx.restore();
	bitmap._setDirty();
	return bitmap;
};

Sprite_Sparkle.prototype.update = function() {
	Sprite.prototype.update.call(this);

	if (!this._event || this._event._erased || this.isItemCollected(this._event)) {
		this.opacity = 0;
		return;
	}

	this.updatePosition();
	this.updateAnimation();
};

Sprite_Sparkle.prototype.isItemCollected = function(event) {
	// Check self switch (common way to mark collected items)
	const key = [event._mapId, event._eventId, selfSwitchKey];
	if ($gameSelfSwitches.value(key) === true)
		return true;

	// Also check if event is in "blank" page due to condition changes
	if (event._pageIndex < 0)
		return true;

	return false;
};

Sprite_Sparkle.prototype.updatePosition = function() {
	if (this._event) {
		this.x = this._event.screenX();
		this.y = this._event.screenY() - 24; // Position above the event
	}
};

Sprite_Sparkle.prototype.updateAnimation = function() {
this.animationTimer++;

// Handle opacity pulsing
var opacityProgress = (this.animationTimer % animationDuration) / animationDuration;
if (opacityProgress < 0.5) {
	this.opacity = Math.min(255, (opacityProgress * 2) * 255 * sparkleOpacity);
} else {
	this.opacity = Math.min(255, ((1 - opacityProgress) * 2) * 255 * sparkleOpacity);
}

// Calculate base position (center of the event)
var baseX = this._event.screenX();
var baseY = this._event.screenY() - 24; // Position above the event

// Create a complete circular motion independent of the opacity cycle
// Use a different timer that doesn't reset as frequently
var circleTimer = this.animationTimer * 0.02; // Slower rotation

// Calculate position on the circle using parametric equations
var orbitRadius = 4; // Small radius for the orbit
var offsetX = Math.cos(circleTimer) * orbitRadius;
var offsetY = Math.sin(circleTimer) * orbitRadius;

// Apply the offsets to create the circular floating motion
this.x = baseX + offsetX;
this.y = baseY + offsetY;
};

Sprite_Sparkle.prototype.updateAnimation1 = function() {
	this.animationTimer++;

	if (this.animationTimer >= animationDuration) {
		this.animationTimer = 0;
		this.animationDirection *= -1;
	}

	const progress = this.animationTimer / animationDuration;

	if (progress < 0.5)
		this.opacity = Math.min(255, (progress * 2) * 255 * sparkleOpacity);
	else
		this.opacity = Math.min(255, ((1 - progress) * 2) * 255 * sparkleOpacity);

	// Slight floating movement
	//this.y += Math.sin(this.animationTimer * 0.1) * sparkleSpeed * this.animationDirection;
};

//=============================================================================
// Game_Map
//=============================================================================
const _Game_Map_setupEvents = Game_Map.prototype.setupEvents;
Game_Map.prototype.setupEvents = function() {
	_Game_Map_setupEvents.call(this);
	this._collectableEvents = [];
};

Game_Map.prototype.scanForCollectableEvents = function() {
	if (!this._events) return;

	this._collectableEvents = [];
	for (let i = 1; i < this._events.length; i++) {
		const event = this._events[i];
		if (event && this.isCollectableEvent(event) && !this.isItemCollected(event))
			this._collectableEvents.push(event);
	}
};

Game_Map.prototype.isCollectableEvent = function(event) {
	if (!event) return false;

	const page = event.page();
	if (!page) return false;
	if (page.image && page.image.characterName !== '') return false; // NPC

	const list = page.list;
	for (let i = 0; i < list.length; i++) {
		const command = list[i];
		// Check for item-related commands
		if (command && (command.code === 126 || command.code === 127 || command.code === 128))
			return true;
	}
	return false;
};

Game_Map.prototype.isItemCollected = function(event) {
	// Check self switch (common way to mark collected items)
	const key = [this._mapId, event._eventId, selfSwitchKey];
	if ($gameSelfSwitches.value(key) === true)
		return true;

	// Also check if event is in "blank" page due to condition changes
	if (event._pageIndex < 0)
		return true;

	// Check if the current page is not the first page (often indicates collected state)
	if (event._pageIndex > 0)
		return true;

	return false;
};

//=============================================================================
// Spriteset_Map
//=============================================================================
const _Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
Spriteset_Map.prototype.createLowerLayer = function() {
	_Spriteset_Map_createLowerLayer.call(this);
	this.createSparkleContainer();
};

Spriteset_Map.prototype.createSparkleContainer = function() {
	this._sparkleSprites = [];
	this._sparkleContainer = new Sprite();
	this._tilemap.addChild(this._sparkleContainer);
};

const _Spriteset_Map_update = Spriteset_Map.prototype.update;
Spriteset_Map.prototype.update = function() {
	_Spriteset_Map_update.call(this);
	this.updateSparkles();
};

Spriteset_Map.prototype.updateSparkles = function() {
	if (!$gameMap._collectableEvents)
		$gameMap.scanForCollectableEvents();

	// Remove sparkles for events that no longer exist or items that are collected
	for (let i = this._sparkleSprites.length - 1; i >= 0; i--) {
		const sparkle = this._sparkleSprites[i];
		if (!sparkle._event || 
			sparkle._event._erased || 
			$gameMap.isItemCollected(sparkle._event)) {
			this._sparkleContainer.removeChild(sparkle);
			this._sparkleSprites.splice(i, 1);
		}
	}

	// Create sparkles for new collectable events (only if not collected)
	if ($gameMap._collectableEvents) {
		for (let i = 0; i < $gameMap._collectableEvents.length; i++) {
			const event = $gameMap._collectableEvents[i];

			// Skip if event is erased or already has a sparkle
			if (event._erased || $gameMap.isItemCollected(event)) continue;
			if (this.hasSparkleForEvent(event)) continue;

			const sparkle = new Sprite_Sparkle(event);
			this._sparkleSprites.push(sparkle);
			this._sparkleContainer.addChild(sparkle);
		}
	}

};

Spriteset_Map.prototype.hasSparkleForEvent = function(event) {
	for (let i = 0; i < this._sparkleSprites.length; i++)
		if (this._sparkleSprites[i]._event === event)
			return true;
	return false;
};

//=============================================================================
// Scene_Map
//=============================================================================
const _Scene_Map_start = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
	_Scene_Map_start.call(this);
	$gameMap.scanForCollectableEvents();
};

//=============================================================================
// Game_Event - Add method to check if event has been updated
//=============================================================================
const _Game_Event_refresh = Game_Event.prototype.refresh;
Game_Event.prototype.refresh = function() {
	_Game_Event_refresh.call(this);
	if ($gameMap)
		$gameMap.scanForCollectableEvents();
};

//=============================================================================
// Game_SelfSwitches - Hook into setting self switches to update sparkles
//=============================================================================
const _Game_SelfSwitches_setValue = Game_SelfSwitches.prototype.setValue;
Game_SelfSwitches.prototype.setValue = function(key, value) {
	_Game_SelfSwitches_setValue.call(this, key, value);
	// When a self switch changes, rescan for collectables
	if (SceneManager._scene instanceof Scene_Map)
		$gameMap.scanForCollectableEvents();
};

})();