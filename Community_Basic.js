/*:
 * @plugindesc Plugin used to set basic parameters.
 * @author RM CoreScript team
 *
 * @help This plugin does not provide plugin commands.
 *
* @param cacheLimit
 * @desc For setting the upper limit of image memory cache. (MPix)
 * @default 10
 *
 * @param screenWidth
* @desc For setting the screen width.
 * @default 816
 *
 * @param screenHeight
 * @desc For setting the screen height.
 * @default 624
 *
 * @param changeWindowWidthTo
 * @desc If set, change window width to this value
 *
 * @param changeWindowHeightTo
 * @desc If set, change window height to this value
 *
 * @param renderingMode
 * @desc Rendering mode (canvas/webgl/auto)
 * @default auto
 *
 * @param alwaysDash
 * @desc To set initial value as to whether the player always dashes. (on/off)
 * @default off
  *
 * @param enableAddonCommands
 * @desc Enables bold/italic/outline color tags and tags for item/armor/weapon name tags possibly lowercase. (on/off)
 * @default on
 * 
 * @param fitWindowToScreen
 * @desc Fits window to the screen without taskbar height (corrected to static value). (on/off)
 * @default on
 * 
 * @help
 * enableAddonCommands enables the following things: 
 * \PX, \PY, \FS MZ commands on MV
 *  \N{I|W|A}{L}?[#] names of I|W|A = item/weapon/armor [L = lowercase] (ex: \NW[10] \NIL[55])
 *  \B[1](bold)\B \IT[1](italic)\IT \OC[1](outline color)\OC[0]
 * Also changes \{ \} to go 12 when starting from normal font size and 6 otherwise,
 * also if its parameter is specified it is used as decrement/increment value. 
 * All tags support default/reset value without square bracketed parameter. 
 */

(function() {
const getNumber = (str, def) => (isNaN(str) ? def : +(str || def));
const getBoolean = (str, def) => (!!str ? !!str.match(/(?:true|y(?:es)?)/i) : !!def);
const MV_MODE = (Utils.RPGMAKER_NAME === "MV");
const IS_NWJS = typeof nw === "object";
const TASKBAR_CORRECTION = 8;

const parameters = PluginManager.parameters('Community_Basic');
const cacheLimit = getNumber(parameters['cacheLimit'], 0);
const screenWidth = getNumber(parameters['screenWidth'], 816);
const screenHeight = getNumber(parameters['screenHeight'], 624);
const renderingMode = parameters['renderingMode'].toLowerCase();
const alwaysDash = parameters['alwaysDash'].toLowerCase() === 'on';
const windowWidthTo = getNumber(parameters['changeWindowWidthTo'], 0);
const windowHeightTo = getNumber(parameters['changeWindowHeightTo'], 0);
const enableAddons = getBoolean(parameters['enableAddonCommands'], true);
const fitWindowToScreen = getBoolean(parameters['fitWindowToScreen'], true);

var windowWidth, windowHeight;

if (cacheLimit)
	ImageCache.limit = cacheLimit * 1000 * 1000;

SceneManager.preferableRendererType = function() {
	if (Utils.isOptionValid('canvas')) return 'canvas';
	else if (Utils.isOptionValid('webgl')) return 'webgl';
	else if (renderingMode === 'canvas') return 'canvas';
	else if (renderingMode === 'webgl') return 'webgl';
	return 'auto';
};

const _ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(config) {
	_ConfigManager_applyData.apply(this, arguments);
	if (config['alwaysDash'] === undefined)
		this.alwaysDash = alwaysDash;
};

if (!fitWindowToScreen) {
	if (windowWidthTo) windowWidth = windowWidthTo;
	else if (screenWidth && screenWidth !== SceneManager._screenWidth) windowWidth = screenWidth;
	
	if (windowHeightTo) windowHeight = windowHeightTo;
	else if (screenHeight && screenHeight !== SceneManager._screenHeight) windowHeight = screenHeight;
	
	if (screenWidth) {
		SceneManager._screenWidth = screenWidth;
		SceneManager._boxWidth = screenWidth;
	}
	if (screenHeight) {
		SceneManager._screenHeight = screenHeight;
		SceneManager._boxHeight = screenHeight;
	}

	const _SceneManager_initNwjs = SceneManager.initNwjs;
	SceneManager.initNwjs = function() {
		_SceneManager_initNwjs.apply(this, arguments);

		if (Utils.isNwjs() && windowWidth && windowHeight) {
			let dw = windowWidth - window.innerWidth;
			let dh = windowHeight - window.innerHeight;
			window.moveBy(-dw / 2, -dh / 2);
			window.resizeBy(dw, dh);
		}
	};
} else {
	// Store original functions to call later
	const _Scene_Boot_start = Scene_Boot.prototype.start;
	const _Scene_Base_start = Scene_Base.prototype.start;

	// Function to get available screen space
	function getAvailableScreenSpace() {
		if (Utils.isNwjs()) {
			const gui = require('nw.gui');
			const win = gui.Window.get();
			const screen = window.screen;
			const titleBarHeight = window.outerHeight - window.innerHeight;
			const taskbarHeight = window.screen.height - window.screen.availHeight - TASKBAR_CORRECTION;
			return { width: screen.availWidth,  height: screen.availHeight - taskbarHeight };
		}
		return { width: window.innerWidth, height: window.innerHeight };
	}

	function getOriginalResolution() {
		if (MV_MODE)
			return { width: Graphics.width || screenWidth, height: Graphics.height || screenHeight }; // MV
		return { width: Graphics._defaultWidth || screenWidth, height: Graphics._defaultHeight || screenHeight }; // MZ
	}
	
	function resizeGameWindow() {
		const screenSpace = getAvailableScreenSpace();
		const originalRes = getOriginalResolution();
	
		// Calculate scale based on both width and height
		const scaleX = screenSpace.width / originalRes.width;
		const scaleY = screenSpace.height / originalRes.height;
		const scale = Math.min(scaleX, scaleY);
	
		// Calculate scaled dimensions
		const newWidth = Math.floor(originalRes.width * scale);
		const newHeight = Math.floor(originalRes.height * scale);
	
		// Resize renderer
		Graphics._renderer.resize(newWidth, newHeight);
		Graphics.width = newWidth;
		Graphics.height = newHeight;
		Graphics.boxWidth = newWidth;
		Graphics.boxHeight = newHeight;
	
		// Set scale
		Graphics._scale = scale;
	
		if (Utils.isNwjs()) {
			const gui = require('nw.gui');
			const win = gui.Window.get();
			win.resizeTo(newWidth, newHeight);
			win.moveTo(Math.floor((screenSpace.width - newWidth) / 2), Math.floor((screenSpace.height - newHeight) / 2));
		}
	}

	Scene_Boot.prototype.start = function () {
		if (IS_NWJS)
			nw.Window.get().on("close", () => nw.App.quit());
		_Scene_Boot_start.call(this);
		resizeGameWindow();
	};
}

if (MV_MODE) {
	ImageCache.prototype._truncateCache = function(){
		const items = this._items;
		let sizeLeft = ImageCache.limit;
		Object.keys(items).map(function(key){
			return items[key];
		}).sort(function(a, b){
			return b.touch - a.touch;
		}).forEach(function(item){
			if (sizeLeft > 0 || this._mustBeHeld(item)) {
					var bitmap = item.bitmap;
					sizeLeft -= bitmap.width * bitmap.height;
			} else {
				if (item.bitmap) {
					if (item.bitmap._baseTexture) item.bitmap._baseTexture.destroy();
					if (item.bitmap.__baseTexture) item.bitmap.__baseTexture.destroy();
					item.bitmap = null;
				}
				delete items[item.key];
			}
		}.bind(this));
	};
	
	Bitmap.prototype._createCanvas = function(width, height){
		this.__canvas = this.__canvas || document.createElement('canvas');
		this.__context = this.__canvas.getContext('2d', { willReadFrequently: true });
		this.__canvas.width = Math.max((this._image ? this._image.width : width) || 0, 1);
		this.__canvas.height = Math.max((this._image ? this._image.height : height) || 0, 1);
		if (this._image) {
			this._createBaseTexture(this._canvas);
			this.__context.drawImage(this._image, 0, 0);
		}
		this._setDirty();
	};
} // END MV_MODE

if (MV_MODE && IS_NWJS) {
Graphics._testCanvasBlendModes = function() {
	let canvas, context, imageData1, imageData2;
	canvas = document.createElement('canvas');
	canvas.width = 1;
	canvas.height = 1;
	context = canvas.getContext('2d', { willReadFrequently: false });
	context.globalCompositeOperation = 'source-over';
	context.fillStyle = 'white';
	context.fillRect(0, 0, 1, 1);
	context.globalCompositeOperation = 'difference';
	context.fillStyle = 'white';
	context.fillRect(0, 0, 1, 1);
	imageData1 = context.getImageData(0, 0, 1, 1);
	context.globalCompositeOperation = 'source-over';
	context.fillStyle = 'black';
	context.fillRect(0, 0, 1, 1);
	context.globalCompositeOperation = 'saturation';
	context.fillStyle = 'white';
	context.fillRect(0, 0, 1, 1);
	imageData2 = context.getImageData(0, 0, 1, 1);
	this._canUseDifferenceBlend = imageData1.data[0] === 0;
	this._canUseSaturationBlend = imageData2.data[0] === 0;
};

TouchInput._setupEventHandlers = function() {
	let isSupportPassive = Utils.isSupportPassiveEvent();
	document.addEventListener('mousedown', this._onMouseDown.bind(this));
	document.addEventListener('mousemove', this._onMouseMove.bind(this));
	document.addEventListener('mouseup', this._onMouseUp.bind(this));
	document.addEventListener('wheel', this._onWheel.bind(this), isSupportPassive ? {passive: false} : false);
	document.addEventListener('touchstart', this._onTouchStart.bind(this), isSupportPassive ? {passive: false} : false);
	document.addEventListener('touchmove', this._onTouchMove.bind(this), isSupportPassive ? {passive: false} : false);
	document.addEventListener('touchend', this._onTouchEnd.bind(this));
	document.addEventListener('touchcancel', this._onTouchCancel.bind(this));
	document.addEventListener('pointerdown', this._onPointerDown.bind(this));
};

} // MV MODE NWJS END
else if (IS_NWJS) {
Bitmap.prototype._createCanvas = function(width, height) {
	this._canvas = document.createElement("canvas");
	this._context = this._canvas.getContext("2d", { willReadFrequently: true });
	this._canvas.width = width;
	this._canvas.height = height;
	this._createBaseTexture(this._canvas);
};

} // MZ MODE NWJS END

if (!enableAddons) return; // custom tags further

Window_Base.prototype.convertEscapeCharacters = function(text) {
	text = text.replace(/\\/g, '\x1b');
	text = text.replace(/\x1b\x1b/g, '\\');
	const varRe = /\x1bV\[(\d+)\]/gi;
	function resolveVariables(text, depth) {
		if (typeof depth !== "number") depth = 0;
		if (depth >= 2) return text;
		const resolvedText = text.replace(varRe, function(match, varId) {
				return resolveVariables($gameVariables.value(parseInt(varId)), depth + 1);
		}.bind(this));
		return resolvedText;
	}
	text = resolveVariables(text);
	text = text.replace( /\x1b([NP])\[(\d+)\]/gi, (match, type, id) => {
		switch (type) {
			case 'N': return this.actorName(parseInt(id));
			case 'P': return this.partyMemberName(parseInt(id));
			default:
				return match;
		}
		return null;
	});
	text = text.replace(/\x1bN([IWA])(L)?\[(\d+)\]/gi, (match, type, isLowercase, index) => {
		let data, name;
		switch (type) {
			case 'I': data = $dataItems; break;
			case 'W': data = $dataWeapons; break;
			case 'A': data = $dataArmors; break;
			default:
				return match;
		}
		name = data[parseInt(index)].name;
		if (isLowercase) name = name.toLowerCase();
		return name;
	});
	text = text.replace(/\x1bG/gi, TextManager.currencyUnit);
	return text;
};

// only patch if this RPGM doesn't support bold text (neither modded MV nor MZ) 
if (Bitmap.prototype._makeFontNameText.toString().indexOf("Bold ") === -1) {
	const _Bitmap_initialize = Bitmap.prototype.initialize;
	Bitmap.prototype.initialize = function() {
		_Bitmap_initialize.apply(this, arguments);
		this.fontBold = false;
	}
	
	Bitmap.prototype._makeFontNameText = function() {
		const italic = this.fontItalic ? "Italic " : '';
		const bold = this.fontBold ? "Bold " : '';
		return italic + bold + this.fontSize + "px " + this.fontFace;
	};
}

Window_Base.prototype.getStandardFontSizeCompat = function(code, textState) {
	return MV_MODE ? this.standardFontSize() : $gameSystem.mainFontSize();
}

Window_Base.prototype.processEscapeCharacter = function(code, textState) {
	let param;
	switch (code) {
	case "B": // bold
		this.contents.fontBold = !!this.obtainEscapeParam(textState);
		break;
	case "IT": // italic
		this.contents.fontItalic = !!this.obtainEscapeParam(textState);
		break;
	case "OC": // outline color
		param = parseInt(this.obtainEscapeParam(textState) || 0);
		const px = 96 + (param % 8) * 12 + 6;
		const py = 144 + Math.floor(param / 8) * 12 + 6;
		const p = this.windowskin._context.getImageData(px, py, 1, 1).data;
		const to_float = c => (c/255).toPrecision(2);
		this.contents.outlineColor = `rgba(${to_float(p[0])}, ${to_float(p[1])}, ${to_float(p[2])}, 0.5)`;
		break;
	case 'C': // color
		param = this.obtainEscapeParam(textState) || 0;
		this.contents.textColor = this.textColor(param);
		break;
	case 'I': // icon
		param = this.obtainEscapeParam(textState);
		this.processDrawIcon(param, textState);
		break;
	case "PX": // position text x, MZ
		textState.x = this.obtainEscapeParam(textState) || textState.startX || textState.left;
		break;
	case "PY": // position text y, MZ
		textState.y = this.obtainEscapeParam(textState) || textState.startY || 0;
		break;
	case "FS": // font size, MZ
		this.contents.fontSize = this.obtainEscapeParam(textState) || this.getStandardFontSizeCompat();
		break;
	case '{':
		param = this.obtainEscapeParam(textState);
		this.makeFontBigger(param);
		break;
	case '}':
		param = this.obtainEscapeParam(textState);
		this.makeFontSmaller(param);
		break;
	}
};

Window_Base.prototype.makeFontBigger = function(plus) {
	if (plus > 0) this.contents.fontSize += plus;
	else if (this.contents.fontSize === this.getStandardFontSizeCompat())
		this.contents.fontSize += 12;
	else if (this.contents.fontSize <= 108)
		this.contents.fontSize += 6;
};

Window_Base.prototype.makeFontSmaller = function(minus) {
	if (minus > 0) this.contents.fontSize -= minus;
	else if (this.contents.fontSize === this.getStandardFontSizeCompat() + 12)
		this.contents.fontSize -= 12;
	else if (this.contents.fontSize >= 24)
		this.contents.fontSize -= 6;
};
	
})();