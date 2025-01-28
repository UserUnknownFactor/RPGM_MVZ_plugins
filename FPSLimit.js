//=============================================================================
// FPSLimit.js
//=============================================================================
/*:
 * @plugindesc Limits game refresh rate
 * @author ocean pollen
 *
 * @param FPS Limit
 * @desc For a 20FPS limit, set this to 20, etc.
 * Default: 60
 * @default 60
 *
 * @help This plugin does not provide plugin commands.
 */

;(function() {
var desiredFPS = Number(PluginManager.parameters('FPSLimit')['FPS Limit']),
  frameLimit = 1000/desiredFPS,
  nextUpdate = 0,
  timeout = null

console.log(`Limiting FPS to ${desiredFPS}`);

SceneManager.requestUpdate = function() {
    if (this._stopped) return;

    const now = Date.now();
    const timeUntilNextUpdate = nextUpdate - now;

    if (timeUntilNextUpdate <= 0) {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        nextUpdate = now + frameLimit;
        requestAnimationFrame(this._updateFunction || (this._updateFunction = this.update.bind(this)));
    } else {
        if (!timeout) {
            timeout = setTimeout(() => {
                timeout = null;
                nextUpdate = Date.now() + frameLimit;
                requestAnimationFrame(this._updateFunction || (this._updateFunction = this.update.bind(this)));
            }, timeUntilNextUpdate);
        }
    }
};
  
})()