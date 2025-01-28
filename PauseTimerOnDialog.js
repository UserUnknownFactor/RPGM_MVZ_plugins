/*:
 * @plugindesc Pauses the game timer during dialogs
 * @target MV MZ
 * @help This plugin pauses the game timer when a dialog window is open.
 */

(function() {
	var _Game_Timer_update = Game_Timer.prototype.update;
	Game_Timer.prototype.update = function(sceneActive) {
		// Only update the timer if there's no message window open
		if (!$gameMessage.isBusy())
			_Game_Timer_update.call(this, sceneActive);
	};
})();
