// RPGM MV patches for latest NW.JS and additional item/armor/weapon name tags possibly lowercase
// Examples: \N{I|W|A}{L}?[#] (\NW[10] \NIL[55]) \B[1](bold)\B[0] \IT[1](italic)\IT[0] \OC[1](outline color)\OC[0]
(function() {
const MV_MODE = (Utils.RPGMAKER_NAME === "MV");
const ENABLE_ADDONS = true;

const SceneBootStart_default = Scene_Boot.prototype.start;
Scene_Boot.prototype.start = function () {
	if (typeof nw === "object") {
		nw.Window.get().on("close", () => nw.App.quit());
	}
	SceneBootStart_default.call(this);
};

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
				if (item.bitmap.destroy) {
					item.bitmap.destroy();
				} else {
					if (item.bitmap._baseTexture) item.bitmap._baseTexture.destroy();
					if (item.bitmap.__baseTexture) item.bitmap.__baseTexture.destroy();
				}
				item.bitmap = null;
			}
			delete items[item.key];
		}
	}.bind(this));
};

Bitmap.prototype._createCanvas = function(width, height){
	this.__canvas = this.__canvas || document.createElement('canvas');
	this.__context = this.__canvas.getContext('2d', { willReadFrequently: true });
	this.__canvas.width = Math.max(width || 0, 1);
	this.__canvas.height = Math.max(height || 0, 1);
	if (this._image) {
		let w = Math.max(this._image.width || 0, 1);
		let h = Math.max(this._image.height || 0, 1);
		this.__canvas.width = w;
		this.__canvas.height = h;
		this._createBaseTexture(this._canvas);
		this.__context.drawImage(this._image, 0, 0);
	}
	this._setDirty();
};

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

TouchInput._onWheel = function(event) {
	this._events.wheelX += event.deltaX;
	this._events.wheelY += event.deltaY;
};

if (!ENABLE_ADDONS) return; // custom tags further

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

Window_Base.prototype.processEscapeCharacter = function(code, textState) {
	let param;
	switch (code) {
	case "B":
		this.contents.fontBold = !!this.obtainEscapeParam(textState);
		break;
	case "IT":
		this.contents.fontItalic = !!this.obtainEscapeParam(textState);
		break;
	case "OC":
		param = parseInt(this.obtainEscapeParam(textState));
		const px = 96 + (param % 8) * 12 + 6;
		const py = 144 + Math.floor(param / 8) * 12 + 6;
		const p = this.windowskin._context.getImageData(px, py, 1, 1).data;
		const to_float = c => (c/255).toPrecision(2);
		this.contents.outlineColor = `rgba(${to_float(p[0])}, ${to_float(p[1])}, ${to_float(p[2])}, 0.5)`;
		break;
	case 'C':
		param = this.obtainEscapeParam(textState);
		this.contents.textColor = this.textColor(param);
		break;
	case 'I':
		param = this.obtainEscapeParam(textState);
		this.processDrawIcon(param, textState);
		break;
	case '{':
		this.makeFontBigger();
		break;
	case '}':
		this.makeFontSmaller();
		break;
	}
};


Window_Base.prototype.makeFontBigger = function() {
	if (this.contents.fontSize === this.standardFontSize())
		this.contents.fontSize += 12;
	else if (this.contents.fontSize <= 108)
		this.contents.fontSize += 6;
};

Window_Base.prototype.makeFontSmaller = function() {
	if (this.contents.fontSize === this.standardFontSize() + 12)
		this.contents.fontSize -= 12;
	else if (this.contents.fontSize >= 24)
		this.contents.fontSize -= 6;
};
} // MV MODE

})();