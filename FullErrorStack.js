/*:
 * @plugindesc Displays the full error stack trace for the engine errors.
 *
 * @help
 * This plugin overrides critical methods to capture and display the full
 * error stack trace for script errors, including those in plugin scripts.
 *
 *  Terms of Use:
 *   - Free for commercial and non-commercial use.
 */

(function() {
"use strict";
	
// Utility function to convert absolute to relative paths
function normalizeStackTrace(stack) {
	if (!stack) return stack;
	const basePath = window.location.href.replace(/\/[^/]+$/, '');
	const fixedStack =  stack.replace(new RegExp(basePath, 'g'), '').replace(/\//g, '\\').replace(/ (\()?\\/g, ' $1').split('\n').map(a => a.trim()).splice(1).join("<br>");
	return fixedStack;
}
	
// Utility function to display the full error stack trace in a scrollable HTML overlay
function displayFullError(error) {
	if (Graphics._errorShowed) return;
	SceneManager.stop();
	Graphics._errorShowed = true;
	console.error(error);
	const errorMessage = `
		<div id="error-overlay" style="
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.9);
			color: #fff;
			font-family: Arial, sans-serif;
			padding: 30px;
			overflow: auto;
			z-index: 999999;
			box-sizing: border-box;
		">
			<h2 style="color: #ff4d4d; margin-top: 0;">Game Error:</h2>
			<p style="color: #ff8080; white-space: pre-wrap;"><b>${error.message.replace(/\.$/, '')}</b></p>
			<h3 style="color: #ff6600;">Stack Trace:</h3>
			<pre style="color: #cccccc; white-space: pre-wrap; overflow: auto; max-height: 50vh;">${normalizeStackTrace(error.stack)}</pre>
		</div>
	`;
	document.body.insertAdjacentHTML("beforeend", errorMessage);

	const restartButton = document.createElement("button");
	restartButton.style.position = "fixed";
	restartButton.style.top = "36px";
	restartButton.style.right = "40px";
	restartButton.style.padding = "10px 20px";
	restartButton.style.backgroundColor = "#1560BD";
	restartButton.style.color = "#fff";
	restartButton.style.border = "none";
	restartButton.style.cursor = "pointer";
	restartButton.style.zIndex = "1000000";
	restartButton.innerHTML = '<b style="color: rgb(231 227 247);">Restart Game</b>';
	restartButton.onclick = () => { location.reload(); };
	document.body.appendChild(restartButton);
}

// override DataManager.setupNewGame to catch initialization errors
const _DataManager_setupNewGame = DataManager.setupNewGame;
DataManager.setupNewGame = function () {
	try {
		_DataManager_setupNewGame.apply(this, arguments);
	} catch (error) {
		displayFullError(error);
	}
};

// override Scene_Base.update to catch runtime errors
const _Scene_Base_update = Scene_Base.prototype.update;
Scene_Base.prototype.update = function () {
	try {
		_Scene_Base_update.apply(this, arguments);
	} catch (error) {
		displayFullError(error);
	}
};

// override SceneManager.onError to ensure compatibility with RPGM's error handling
const _SceneManager_onError = SceneManager.onError;
SceneManager.onError = function (e) {
	_SceneManager_onError.apply(this, arguments);
	displayFullError(e);
};

})();