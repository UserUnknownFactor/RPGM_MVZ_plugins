//=============================================================================
// TextHexColor.js
// Free for commercial and non-commercial use.
//=============================================================================
/*:
 * @plugindesc A plugin that allows text color to be selected from standard hexadecimal color codes.
 * @author 
 * @version 1.00
 * 
 * @help When changing the text's color with control character \c[ ]
 * It allows you to define the color code with #000000～#ffffff or #000～#fff.
 * 
 * <Examples>
 * \c[5] // standard way
 * \c[#123456] // color codes
 * \c[#b0a]
 */
(function () {
const isHexDigit = char => {let code = char.charCodeAt(0); return (code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102); }
const isDigit = char => char.charCodeAt(0) >= 48 && char.charCodeAt(0) <= 57;

/*
black: #000000　white: #FFFFFF　red: #FF0000　green: #008000　blue: #0000FF　
yellow: #FFFF00　pink: #FFC0CB　girlish: #FF98CE　boyish: #C2E5F7　skyblue: #87CEEB
orange: #FFA500 　purple: #800080　gray: #808080　brown: #A52A2A　cyan: #00FFFF
magenta: #FF00FF　lime: #00FF00　navy: #000080　teal: #008080　coral: #FF7F50
gold: #FFD700　silver: #C0C0C0　indigo: #4B0082　violet: #EE82EE　beige: #F5F5DC
lavender: #E6E6FA　khaki: #F0E68C　mint: #98FF98　salmon: #FA8072　chocolate: #D2691E
tomato: #FF6347　wheat: #F5DEB3　turquoise: #40E0D0　olive: #808000　maroon: #800000
aqua: #00FFFF　fuchsia: #FF00FF　orchid: #DA70D6　plum: #DDA0DD　peach: #FFDAB9
*/


Window_Base.prototype.obtainEscapeParam = function(textState) {
	const text = textState.text,
		index = textState.index;
	if (text[index] === '[') {
		if (text[index + 1] === '#') {
			let isValidHex = true;
			for (let i = 2; i < 8; i++) {
				if (text[index + i] === ']') break;
				if (!isHexDigit(text[index + i])) { isValidHex = false; break; }
			}
			if (isValidHex && text[index + 8] === ']') {
				 textState.index += 9;
				 return text.slice(index + 1, index + 8);
			} else if (isValidHex && text[index + 5] === ']') {
				textState.index += 6;
				return text.slice(index + 1, index + 5);
			}
		} else {
			let i = index + 1;
			while (i < text.length && isDigit(text[i])) i++;
			if (i < text.length && text[i] === ']') {
				textState.index = i + 1;
				return parseInt(text.slice(index + 1, i)); 
			}
		}
	} // ]
	return 0;
};

Window_Base.prototype.textColor = function(n) {
	// NOTE: It's better as long as we don't redefine the windowskin B/W colors
	if (!n) return "#FFFFFF";
	else if (typeof n === 'string') return n;
	else if (n === 15) return "#000000";
	var px = 96 + (n % 8) * 12 + 6;
	var py = 144 + Math.floor(n / 8) * 12 + 6;
	return this.windowskin.getPixel(px, py);
};

})();
