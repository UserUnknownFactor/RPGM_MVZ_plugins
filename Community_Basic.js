/*:
 * @plugindesc Plugin used to set basic parameters and apply basic engine patches
 * @author Various
 *
 * @help This plugin does not provide plugin commands.
 *
 * @param cacheLimit
 * @desc Sets the upper limit of image memory cache; value*screenWidth*screenHeight (colors aren't considered by RPGM); 0 - uses default.
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
 * @desc If set, change window width to this value; "auto" fits it to the screen.
 *
 * @param changeWindowHeightTo
 * @desc If set, change window height to this value; "auto" fits it to the screen.
 *
 * @param renderingMode
 * @desc Rendering mode. (canvas/webgl/auto)
 * @default auto
 *
 * @param alwaysDash
 * @desc To set initial value as to whether the player always dashes. (on/off)
 * @default off
  *
 * @param enableAddonCommands
 * @desc Enables bold/italic/outline color tags and tags for item/armor/weapon name tags possibly lowercase. (on/off)
 * @default off
 * 
 * @param useWASDmovement
 * @desc Uses additional WASD controls for movement. (on/off)
 * @default off
 * 
 * @help
 * enableAddonCommands enables the following things: 
 * \PX, \PY, \FS MZ commands on MV
 *  \N{I|W|A}{L}?[#] names of I|W|A = item/weapon/armor [L = lowercase] (ex: \NW[10] \NIL[55])
 *  \B[1](bold)\B \IT[1](italic)\IT \OC[1](outline color)\OC[0]
 * Also changes \{ \} to use 12 when starting from normal font size and 6 otherwise,
 * also if its parameter is specified it is used as the decrement/increment value. 
 * All tags support default/reset value without square bracketed parameter. 
 */

(function() {
const DEBUG = false;
const PLUGIN_NAME = "Community_Basic";

const getNumber = (str, def) => (isNaN(str) ? def : +str);
const getBoolean = (str, def) => (!!str ? !!str.match(/(?:true|on|y(?:es)?)/i) : !!def);
const MV_MODE = (Utils.RPGMAKER_NAME === "MV");
const VERSION = (typeof nw !== "undefined" && nw.process) ? nw.process.version.split(/\./g).map((a) => parseInt(a.replace(/[^\d]+/gi, ''))) : [0];
const IS_NEW_NWJS = VERSION[0] > 9;
const TASKBAR_CORRECTION = 8;

if (DEBUG) console.log(`[${PLUGIN_NAME}] RPGM NW.JS version is ${VERSION}`);

const parameters = PluginManager.parameters(PLUGIN_NAME);
const cacheLimit = getNumber(parameters["cacheLimit"], 0);
const screenWidth = getNumber(parameters["screenWidth"], 816);
const screenHeight = getNumber(parameters["screenHeight"], 624);
const renderingMode = (parameters["renderingMode"] || '').toLowerCase();
const alwaysDash = getBoolean(parameters["alwaysDash"], false);
const windowWidthTo = parameters["changeWindowWidthTo"];
const windowHeightTo = parameters["changeWindowHeightTo"];
const enableAddons = getBoolean(parameters["enableAddonCommands"], false);
const fitWindowToScreen = windowWidthTo === "auto" || windowHeightTo == "auto";
const useWASD = getBoolean(parameters["useWASDmovement"], false);
const desiredFPS = getNumber(parameters['FPSLimit'], 0);


if (cacheLimit)
	ImageCache.limit = cacheLimit * screenWidth * screenHeight;


SceneManager.preferableRendererType = function() {
	if (Utils.isOptionValid("canvas")) return "canvas";
	else if (Utils.isOptionValid("webgl")) return "webgl";
	else if (renderingMode === "canvas") return "canvas";
	else if (renderingMode === "webgl") return "webgl";
	return "auto";
};


const _ConfigManager_applyData = ConfigManager.applyData;
ConfigManager.applyData = function(config) {
	_ConfigManager_applyData.apply(this, arguments);
	if (typeof config["alwaysDash"] === undefined)
		this.alwaysDash = alwaysDash;
};


if (!fitWindowToScreen) {
	let windowWidth, windowHeight;

	if (windowWidthTo) windowWidth = parseInt(windowWidthTo) || 0;
	else if (screenWidth && screenWidth !== SceneManager._screenWidth) windowWidth = screenWidth;

	if (windowHeightTo) windowHeight = parseInt(windowHeightTo) || 0;
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
			Imported = Imported || {}; // YEP_CoreEngine compat
			Imported.ScreenResolution = true;
		}
	};
} else {
	let windowWidth, windowHeight;

	// Function to get available screen space
	function getAvailableScreenSpace() {
		if (Utils.isNwjs()) {
			const gui = require("nw.gui");
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
			return { width: screenWidth || Graphics.width, height: screenHeight || Graphics.height }; // MV
		return { width: screenWidth || Graphics._defaultWidth, height: screenHeight || Graphics._defaultHeight }; // MZ
	}

	const screenSpace = getAvailableScreenSpace();
	const originalRes = getOriginalResolution();

	const scaleX = screenSpace.width / originalRes.width;
	const scaleY = screenSpace.height / originalRes.height;
	const scale = Math.min(scaleX, scaleY);

	windowWidth = Math.floor(originalRes.width * scale);
	windowHeight = Math.floor(originalRes.height * scale);

	// Set renderer to the right resolution

	if (screenWidth) {
		SceneManager._screenWidth = screenWidth;
		SceneManager._boxWidth = screenWidth;
	}
	if (screenHeight) {
		SceneManager._screenHeight = screenHeight;
		SceneManager._boxHeight = screenHeight;
	}

	if (DEBUG) console.log(`[${PLUGIN_NAME}] ${originalRes.width}x${originalRes.height} -> ${windowWidth}x${windowHeight} (scale: ${scale.toPrecision(4)}; full: ${screenSpace.width}x${screenSpace.height})`);

	const _SceneManager_initNwjs = SceneManager.initNwjs;
	SceneManager.initNwjs = function() {
		_SceneManager_initNwjs.apply(this, arguments);

		if (Utils.isNwjs() && windowWidth && windowHeight) {
			const gui = require("nw.gui");
			const win = gui.Window.get();
			if (DEBUG) console.log(`[${PLUGIN_NAME}] ${window.outerWidth}x${window.outerHeight} - ${window.innerWidth}x${window.innerHeight} = ${window.outerWidth - window.innerWidth}x${window.outerHeight - window.innerHeight}`);
			if (IS_NEW_NWJS)
				win.resizeTo(windowWidth, windowHeight);
			else
				win.resizeTo(
					windowWidth + window.outerWidth  - window.innerWidth,
					windowHeight + window.outerHeight - window.innerHeight
				);
			win.moveTo(Math.floor((screenSpace.width - windowWidth) / 2), Math.floor((screenSpace.height - windowHeight) / 2));
			Imported = Imported || {}; // YEP_CoreEngine compat
			Imported.ScreenResolution = true;
		}
	};

	if (IS_NEW_NWJS) {
		const _Scene_Boot_start = Scene_Boot.prototype.start;
		Scene_Boot.prototype.start = function () {
			nw.Window.get().on("close", () => nw.App.quit());
			_Scene_Boot_start.call(this);
		};
	}
}


if (MV_MODE) {
	// prevent flickering when loading images on MV
	Sprite.prototype.isExistLoadingBitmap = function() {
		const bitmap = this.bitmap;
		return bitmap && !bitmap.isReady();
	};

	const _Sprite__renderCanvas = Sprite.prototype._renderCanvas;
	Sprite.prototype._renderCanvas = function(renderer) {
		_Sprite__renderCanvas.apply(this, arguments);
		this.isExistLoadingBitmap() && this._renderCanvas_PIXI(renderer);
	};

	const _Sprite__renderWebGL = Sprite.prototype._renderWebGL;
	Sprite.prototype._renderWebGL = function(renderer) {
		_Sprite__renderWebGL.apply(this, arguments);
		if (!this.isExistLoadingBitmap()) return;

		const plugins = renderer.plugins;
		const isPicture = this._isPicture;
		renderer.setObjectRenderer(plugins[isPicture ? "picture" : "sprite"]);
		if (isPicture) {
			this._speedUpCustomBlendModes(renderer);
			if (this.isVideoPicture && this.isVideoPicture()) return;
			plugins.picture.render(this);
		} else
			plugins.sprite.render(this);
	};


	Graphics.render = function(stage){
		if (this._skipCount <= 0 ) { // was bugged
			var startTime = Date.now();
			if (stage) {
				this._renderer.render(stage);
				if (this._renderer.gl && this._renderer.gl.flush)
					this._renderer.gl.flush();
			}
			var endTime = Date.now();
			var elapsed = endTime - startTime;
			this._skipCount = Math.min(Math.floor(elapsed / 15), this._maxSkip);
			this._rendered = true;
		} else {
			this._skipCount--;
			this._rendered = false;
		}
		this.frameCount++;
	};


	SceneManager.update = function(stamp) {
		try {
			this.tickStart();
			if (Utils.isMobileSafari()) {
				this.updateInputData();
			}
			this.updateManagers();
			this.updateMain(stamp);
			this.tickEnd();
		} catch (e) {
			this.catchException(e);
		}
	};

	// fixes the graphics jitter mostly noticeable when scrolling maps
	SceneManager.updateMain = function(stamp) {
		if (Utils.isMobileSafari()) {
			this.changeScene();
			this.updateScene();
		} else {
			let fTime = (stamp - this._currentTime) / 1000;
			if (fTime > 0.25) fTime = 0.25;
	 
			this._currentTime = stamp;
			this._accumulator += fTime;
			const old_ftime = fTime;
			const old_accu = this._accumulator;
			let i = 0;
			while (this._accumulator >= this._deltaTime) {
				i++;
				this.updateInputData();
				this.changeScene();
				this.updateScene();
				this._accumulator -= this._deltaTime;
			}
		}
		this.renderScene();
		this.requestUpdate();
	};


	Bitmap.prototype._createCanvas = function(width, height){
		this.__canvas = this.__canvas || document.createElement("canvas");
		this.__context = this.__canvas.getContext("2d", { willReadFrequently: true });
		this.__canvas.width = Math.max((this._image ? this._image.width : width) || 0, 1);
		this.__canvas.height = Math.max((this._image ? this._image.height : height) || 0, 1);
		if (this._image) {
			this._createBaseTexture(this._canvas);
			this.__context.drawImage(this._image, 0, 0);
		}
		this._setDirty();
	};

} // END MV_MODE

if (MV_MODE && IS_NEW_NWJS) {
Graphics._testCanvasBlendModes = function() {
	let canvas, context, imageData1, imageData2;
	canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	context = canvas.getContext("2d", { willReadFrequently: false });
	context.globalCompositeOperation = "source-over";
	context.fillStyle = "white";
	context.fillRect(0, 0, 1, 1);
	context.globalCompositeOperation = "difference";
	context.fillStyle = "white";
	context.fillRect(0, 0, 1, 1);
	imageData1 = context.getImageData(0, 0, 1, 1);
	context.globalCompositeOperation = "source-over";
	context.fillStyle = "black";
	context.fillRect(0, 0, 1, 1);
	context.globalCompositeOperation = "saturation";
	context.fillStyle = "white";
	context.fillRect(0, 0, 1, 1);
	imageData2 = context.getImageData(0, 0, 1, 1);
	this._canUseDifferenceBlend = imageData1.data[0] === 0;
	this._canUseSaturationBlend = imageData2.data[0] === 0;
};

TouchInput._setupEventHandlers = function() {
	let isSupportPassive = Utils.isSupportPassiveEvent();
	document.addEventListener("mousedown", this._onMouseDown.bind(this));
	document.addEventListener("mousemove", this._onMouseMove.bind(this));
	document.addEventListener("mouseup", this._onMouseUp.bind(this));
	document.addEventListener("wheel", this._onWheel.bind(this), isSupportPassive ? {passive: false} : false);
	document.addEventListener("touchstart", this._onTouchStart.bind(this), isSupportPassive ? {passive: false} : false);
	document.addEventListener("touchmove", this._onTouchMove.bind(this), isSupportPassive ? {passive: false} : false);
	document.addEventListener("touchend", this._onTouchEnd.bind(this));
	document.addEventListener("touchcancel", this._onTouchCancel.bind(this));
	document.addEventListener("pointerdown", this._onPointerDown.bind(this));
};

} // MV MODE NWJS END
else if (IS_NEW_NWJS) {
Bitmap.prototype._createCanvas = function(width, height) {
	this._canvas = document.createElement("canvas");
	this._context = this._canvas.getContext("2d", { willReadFrequently: true });
	this._canvas.width = width;
	this._canvas.height = height;
	this._createBaseTexture(this._canvas);
};

} // MZ MODE NWJS END


if (useWASD) {
	Input.keyMapper[87] =  "up";   // W
	Input.keyMapper[65] = "left";  // A
	Input.keyMapper[83] = "down";  // S
	Input.keyMapper[68] = "right"; // D
}

if (MV_MODE && desiredFPS > 0) {
	let frameLimit = 1000/desiredFPS,
		nextUpdate = 0,
		timeout = null
	
	// export the fps for use with other plugins
	Object.defineProperty(Graphics, 'fps', {
		value: desiredFPS,
		configurable: true
	});
	
	console.log(`[${PLUGIN_NAME}] Limiting FPS to ${Graphics.fps}`);
	
	SceneManager.requestUpdate = function() {
		if (this._stopped) return;
	
		const now = Date.now();
		const timeUntilNextUpdate = nextUpdate - now;
	
		if (!this._updateFunction)
			this._updateFunction = this.update.bind(this);
		if (timeUntilNextUpdate <= 0) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = null;
			}
			nextUpdate = now + frameLimit;
			requestAnimationFrame(this._updateFunction);
		} else {
			if (!timeout) {
				timeout = setTimeout(() => {
					timeout = null;
					nextUpdate = Date.now() + frameLimit;
					requestAnimationFrame(this._updateFunction);
				}, timeUntilNextUpdate);
			}
		}
	};
} else if (desiredFPS > 0) {
	Object.defineProperty(Graphics, 'fps', {
		value: Graphics._app.ticker.FPS,
		configurable: false
	});

	const _Graphics_createPixiApp = Graphics._createPixiApp;
	Graphics._createPixiApp = function() {
		_Graphics_createPixiApp.call(this);
		this._app.ticker.maxFPS = desiredFPS;
	};
}

if (!enableAddons) return; // custom tags further

Window_Base.prototype.convertEscapeCharacters = function(text) {
	if (typeof text !== "string") return text;
	text = text.replace(/\\/g, "\x1b");
	text = text.replace(/\x1b\x1b/g, '\\');
	const varRe = /\x1bV\[(\d+)\]/gi;
	function resolveVariables(text, depth) {
		if (typeof text !== "string" || text instanceof String) return text;
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
	});
	text = text.replace(/\x1bN([IWA])(L)?\[(\d+)\]/gi, (match, type, isLowercase, index) => {
		let data, name;
		switch (type) {
			case 'I': data = $dataItems; break;
			case 'W': data = $dataWeapons; break;
			case 'A': data = $dataArmors; break;
			case 'S': data = $dataSkills; break;
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

if (MV_MODE)
	Window_Base.prototype.getStandardFontSizeCompat = 
		Window_Base.prototype.standardFontSize;
else
	Window_Base.prototype.getStandardFontSizeCompat = 
		Game_System.prototype.mainFontSize;

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
	else if (this.contents.fontSize >= 12)
		this.contents.fontSize -= 6;
};

})();