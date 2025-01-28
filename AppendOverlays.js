/*:
 * @target MV MZ
 * @plugindesc Automatically overlays images with matching _OVR#[_POSXxPOSY] files
 * @help
 * This plugin automatically overlays images with matching overlay files.
 * For example, if you have "image.png", it will look for and overlay:
 * "image_OVR1.png", "image_OVR2_120x20.png", etc.
 */

(function() {
'use strict';

const OVERLAY_PREFIX = '_OVR';
const MAX_OVERLAYS = 3;
const MV_MODE = Utils.RPGMAKER_NAME === 'MV';
const fs = require('fs');

const _compositeCache = new Map();

function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d');
}

function areAllBitmapsReady(bitmaps) {
    return bitmaps.every(bitmap => bitmap.isReady());
}

/*
function processOverlays(bitmap, overlayBitmaps) {
    const ctx = createCanvas(bitmap.width, bitmap.height);
    ctx.drawImage(bitmap._canvas, 0, 0);

    overlayBitmaps.forEach(overlay => {
        if (overlay && overlay.width > 0 && overlay.height > 0)
            ctx.drawImage(overlay._canvas, 0, 0);
    });

    bitmap._canvas = ctx.canvas;
    bitmap._context = ctx;
    if (bitmap._baseTexture) {
        bitmap._baseTexture.update();
}*/

function processOverlays(bitmap, overlayBitmaps) {
    overlayBitmaps.forEach(({overlay, x, y}) => {
        if (overlay && overlay.width > 0 && overlay.height > 0)
            bitmap.blt(overlay, 0, 0, overlay.width, overlay.height, x, y);
    });
}

const _ImageManager_loadBitmap = ImageManager.loadBitmap;
ImageManager.loadBitmap = function(folder, filename, hue, smooth) {
    const bitmap = _ImageManager_loadBitmap.call(this, folder, filename, hue, smooth);
    if (bitmap && !bitmap._overlayProcessed) {
        bitmap._overlayProcessed = true;

        const cacheKey = (folder + filename).toLowerCase();

        if (_compositeCache.has(cacheKey)) {
            const cachedBitmap = _compositeCache.get(cacheKey);
            bitmap._canvas = cachedBitmap._canvas;
            bitmap._context = cachedBitmap._context;
            if (bitmap._baseTexture) bitmap._baseTexture.update();
            return bitmap;
        }

        if (!bitmap.isReady()) {
            bitmap.addLoadListener(() => {
                const overlayBitmaps = new Array(MAX_OVERLAYS).fill(null);
                const baseExt = filename.match(/\.[^.]+$/)[0];
                const baseNameWithoutExt = filename.replace(/\.[^.]+$/, '');

                let overlaysFound = 0;
                for (let i = 1; i <= MAX_OVERLAYS; i++) {
                    const posMatch = /_OVR\d+_(\d+)x(\d+)/i;
                    const overlayPath = folder + baseNameWithoutExt + OVERLAY_PREFIX + i + baseExt;
                    const fullPath = (MV_MODE ? "www/" : '') + overlayPath;
                    
                    if (!fs.existsSync(fullPath))
                        continue;
                    
                    overlaysFound++;
                    const overlayBitmap = ImageManager.loadBitmap(folder, 
                        baseNameWithoutExt + OVERLAY_PREFIX + i + baseExt, 0, smooth);

                    const coords = fullPath.match(posMatch);
                    overlayBitmaps[i-1] = {
                        overlay: overlayBitmap,
                        x: coords && coords[1] ? parseInt(coords[1]) : 0,
                        y: coords && coords[2] ? parseInt(coords[2]) : 0
                    };
                }

                if (overlaysFound === 0)
                    return;

                let processed = false;
                const checkAndProcessOverlays = () => {
                    if (processed || !areAllBitmapsReady(overlayBitmaps.filter(b => b !== null).map(b => b.overlay))) return;
                    processed = true;
                    processOverlays(bitmap, overlayBitmaps.filter(b => b !== null));
                    _compositeCache.set(cacheKey, bitmap);
                };

                overlayBitmaps.forEach(ovr => {
                    if (ovr && ovr.overlay && !ovr.overlay.isReady())
                        ovr.overlay.addLoadListener(checkAndProcessOverlays);
                });
                checkAndProcessOverlays();
            });
        }
    }

    return bitmap;
};

const _Scene_Map_terminate = Scene_Map.prototype.terminate;
Scene_Map.prototype.terminate = function() {
    _Scene_Map_terminate.call(this);
    _compositeCache.clear();
};

})();