//=============================================================================
// FixImageLoading.js
// ----------------------------------------------------------------------------
// Copyright (c) 2015-2017 Triacontane
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
// Version
// 2.0.1 2019/04/06
// ----------------------------------------------------------------------------
// [Blog]	: https://triacontane.blogspot.jp/
// [Twitter]: https://twitter.com/triacontane/
// [GitHub] : https://github.com/triacontane/
//=======================================================================================

/*:en
* @plugindesc Plugin to prevent flickering when loading images
* @author Triacontane
*
* @help Prevents momentary flickering when displaying an uncached image.
* The previously displayed image will remain until the image has finished loading.
*
* Conversely, if you want to erase an image, 
* explicitly erase the picture before displaying it.
*
* This plugin does not have any plugin commands.
*
* Terms of Use:
* It can be modified and redistributed without permission from the author, 
* and there are no restrictions on the form of use (commercial use, 18+ use, etc.) 
* This plugin is now yours.
*/

(() => {
'use strict';

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
	renderer.setObjectRenderer(plugins[isPicture ? 'picture' : 'sprite']);
	if (isPicture) {
			this._speedUpCustomBlendModes(renderer);
			if (this.isVideoPicture && this.isVideoPicture()) return;
			plugins.picture.render(this);
	} else {
			plugins.sprite.render(this);
	}
};
})();

