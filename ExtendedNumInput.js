//=============================================================================
// ExtendedNumInput.js
//=============================================================================
/*:
 * @plugindesc Plugin for using keyboard number keys in the Number Input.
 * @target MV MZ
 * @help This plugin allows players to use keyboard keys to input digits
 * in the multi-number input, automatically moving to the next digit.
 * Non-digit keys will play a buzzer sound.
  *
 * Terms of Use:
 * - Free for commercial and non-commercial use.
 */

(function() {
const _Window_NumberInput_initialize = Window_NumberInput.prototype.initialize;
Window_NumberInput.prototype.initialize = function() {
	_Window_NumberInput_initialize.apply(this, arguments);
	this._lastKeyCode = null;
	document.addEventListener('keydown', this.onKeyDown.bind(this));
};

Window_NumberInput.prototype.onKeyDown = function(event) {
	if (this.active) {
		const keyCode = event.keyCode;

		if (this.isNumberKey(keyCode)) {
			this.changeDigitTo(this.keyCodeToDigit(keyCode));
			this.moveRight();
			this.refresh();
			event.preventDefault();
		} else if ([37, 38, 39, 40].indexOf(keyCode) !== -1) { // 38=up 40=down
		} else if (keyCode === 27) { // esc = ok
			this.processOk();
			event.preventDefault();
		} else if (![16, 17, 18, 91, 93].includes(keyCode)) // ignore modifier keys
			SoundManager.playBuzzer();
	}
};

Window_NumberInput.prototype.isNumberKey = function(keyCode) {
	return (keyCode >= 48 && keyCode <= 57) || (keyCode >= 96 && keyCode <= 105);
};

Window_NumberInput.prototype.keyCodeToDigit = function(keyCode) {
	if (keyCode >= 48 && keyCode <= 57)
		return (keyCode - 48);
	else if (keyCode >= 96 && keyCode <= 105)
		return (keyCode - 96);
	return 0;
};

Window_NumberInput.prototype.changeDigitTo = function(number) {
	const place = this._maxDigits - 1 - this.index();
	const n = this._number;
	const m = Math.pow(10, place);
	this._number -= Math.floor((n % (m * 10)) / m) * m;
	this._number += number * m;
};

Window_NumberInput.prototype.moveRight = function() {
	SoundManager.playCursor();
	if (this.index() < this._maxDigits - 1)
		this.select((this.index() + 1) % this._maxDigits);
};
})();