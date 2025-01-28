//=============================================================================
// TextHexColor.js
// Free for commercial and non commercial use.
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
const isHexDigit = char => ((code = char.charCodeAt(0)) >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102);
const isDigit = char => char.charCodeAt(0) >= 48 && char.charCodeAt(0) <= 57;

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
					 return text.slice(index + 2, index + 8);
				} else if (isValidHex && text[index + 5] === ']') {
					 textState.index += 6;
					 return text.slice(index + 2, index + 5);
				}
		  } else {
				let i = index + 1;
				while (isDigit(text[i])) i++;
				if (text[i] === ']') {
					 textState.index = i + 1;
					 return parseInt(text.slice(index + 1, i)); 
				}
		  }
	 }
};

Window_Base.prototype.textColor = function(n) {
	 if (typeof n === 'string')  return n;
	 var px = 96 + (n % 8) * 12 + 6;
	 var py = 144 + Math.floor(n / 8) * 12 + 6;
	 return this.windowskin.getPixel(px, py);
};
})();
