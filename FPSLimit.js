//=============================================================================
// FPSLimit.js
//=============================================================================
/*:
 * @plugindesc Limits game refresh rate
 * @author ocean pollen
 *
 * @param FPS Limit
 * @desc Example: for a 60 FPS limit, set this to 60 (default: 30).
 * @default 30
 *
 * @help This plugin does not provide plugin commands.
 */
 
(function() {
const PLUGIN_NAME = "FPSLimit";
const desiredFPS = Number(PluginManager.parameters(PLUGIN_NAME)['FPS Limit'] || 30);
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


})();