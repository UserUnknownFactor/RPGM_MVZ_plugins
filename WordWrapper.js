/* Automatic Word Wrapping Plugin for RPG Maker MV
 Example config in \www\js\plugins.js:
 { "name": "WordWrapper","status":true,"description":"Word-wrapper plugin","parameters":{"Word Wrap Style":"break-word"} },

 Some other plugins may overwrite startMessage, newPage or updateMessage or call their
 cached versions, in that case you need to replace these methods directly in the plugin that
 overwrites them (or in rpg_windows.js in case they call their saved original version)
 uncommenting this module check and commenting them out from this file.

 Free for commercial and non commercial use.
*/

/*
 * @plugindesc Show Text code word-wrapping
 * @filename WordWrapper.js
 * @author 
 *
 * @help Using this plugin is easy! Just enter your dialog in the message window
 * and watch is wrap around. May not work for all languages.
 * This plugin does not provide plugin commands.
 *
 * @param Word Wrap Style
 * @desc break-all to wrap at any character, break-word to wrap at word start. Default: break-word
 * @default break-word
 */

WordWrapper = {};
WordWrapper.Parameters = PluginManager.parameters('WordWrapper');
WordWrapper.WordWrapStyle = String(WordWrapper.Parameters['Word Wrap Style']);
WordWrapper.MessageIndent = +(WordWrapper.Parameters['Message Indent'] || 10);
WordWrapper.OverrideFontSizes = (
    (typeof WordWrapper.Parameters['OverrideFontSizeTo'] !== "undefined") ? 
        JSON.parse(WordWrapper.Parameters['OverrideFontSizeTo']) : {33: 30}
);

(function () {
const _Window_Message_newLineX = Window_Message.prototype.newLineX;
Window_Message.prototype.newLineX = function () {
	return _Window_Message_newLineX.call(this) + WordWrapper.MessageIndent;
};

/***
 * wrapToNewLine
 * Wraps content to new line. If doing so pushes the rest of the message off
 * current page, then we pause and wait for user input to continue displaying
 * the message
 * textState - contains information related to the message
 */
Window_Message.prototype.wrapToNewLine = function (textState) {
	this._lineShowFast = false;
	textState.x = this.newLineX();
	textState.y += textState.height;
	textState.height = this.calcTextHeight(textState, false);
	if (this.needsNewPage(textState)) {
		this._processWordWrapBreak = true;
		this.startPause();
	}
};

/***
 * getWordBoundaries
 * Takes the current message and does regex processing to retrieve the index
 * of the beginning of all words. Since this is javascript, unfortunately
 * the unicode support is lacking. But it should work with english
 * characters and some accented characters as well.
 * returns array of indices representing the start of each word in the
 * full message
 */
const WORDS_REGEX = /(?:[\*"'\^\(\{\[_]|\b)[\S]+(?:[\*"'\.,;\^_\)\}\]$!\?]|\b)\S*/gm;
Window_Message.prototype.getWordBoundaries = function () {
	var result = [];
	var wordBoundaryArr = [];
	while ((wordBoundaryArr = WORDS_REGEX.exec(this._textState.text)) !== null)
		result.push(wordBoundaryArr);
	this._textState.wordBoundaries = result.map(match => match.index);
};

const _Window_Message_initMembers = Window_Message.prototype.initMembers;
Window_Message.prototype.initMembers = function () {
	this._processWordWrapBreak = false;
	_Window_Message_initMembers.call(this);
};

Window_Message.prototype.updateMessage = function () {
	if (this._textState && this._processWordWrapBreak === false) {
		while (!this.isEndOfText(this._textState)) {
			if (this.needsNewPage(this._textState))
				this.newPage(this._textState);
			this.updateShowFast();
			this.processCharacter(this._textState);
			if (!this._showFast && !this._lineShowFast)
				break;
			if (this.pause || this._waitCount > 0)
				break;
		}
		if (this.isEndOfText(this._textState))
			this.onEndOfText();
		return true;
	} else
		return false;
};

/***
 * Overwrite Window_Message.prototype.startMessage to call getWordBoundaries
 * after escaping the text and before displaying the message
 */
Window_Message.prototype.startMessage = function () {
	if (this._processWordWrapBreak === false) {
		this._nameWindow.deactivate();
		if (typeof this._faceBoxWindow !== "undefined") {
			this._faceBoxWindow.clear();
			this.clearMessageExFlags();
		}

		this._textState = {};
		this._textState.index = 0;
		this._textState.text = this.convertEscapeCharacters($gameMessage.allText()).trim();
		this.getWordBoundaries();
		if (typeof this.villaA_procLine !== "undefined")
				this.villaA_procLine = 0;
	}
	
	this.newPage(this._textState);
	this._processWordWrapBreak = false;
	this.updatePlacement();
	this.updateBackground();
	this.open();

	if (typeof this._faceBoxWindow !== "undefined") {
		this._faceBoxWindow.start();
		this._nameBoxWindow.start();
	}
	
	if (this.contents && this.contents.height !== this.contentsHeight())
		this.createContents();
};

Window_Message.prototype.newPage = function (textState) {
	this.contents.clear();
	if (this._processWordWrapBreak === false)
		this.resetFontSettings();
	if (this.contents.fontSize in WordWrapper.OverrideFontSizes)
		this.contents.fontSize = WordWrapper.OverrideFontSizes[this.contents.fontSize]; // HACK: IDK where it's set now
	this.clearFlags();
	this.loadMessageFace();
	textState.x = this.newLineX();
	textState.y = 0;
	textState.left = this.newLineX()
	textState.height = this.calcTextHeight(textState, false);
	if (typeof this.updateSpeakerNameMv !== "undefined") {
		this.updateSpeakerNameMv();
		this.updateSpeakerFace();
	}
};

const _Window_Base_processNormalCharacterForAnimation = Window_Message.prototype.processNormalCharacterForAnimation;
Window_Message.prototype.processNormalCharacterForAnimation = function(textState) {
	if (typeof textState.wordBoundaries === 'undefined'||
			typeof this.villaA_paddingleft !== 'undefined' && this.villaA_paddingleft > 0) {
		_Window_Base_processNormalCharacterForAnimation.apply(this, arguments);
		return;
	}
	const maxWindowWidth = this.contents.width - this.textPadding() * 2 - Window_Base._faceWidth + 100;
	switch (WordWrapper.WordWrapStyle) {
		case 'break-all':
			const c = textState.text[textState.index];
			if (textState.x >= maxWindowWidth || textState.x + (this.textWidth(c) * 2) >= maxWindowWidth)
				this.wrapToNewLine(textState);
			break;
		case 'break-word':
		default:
			const lastBoundaryIndex = textState.wordBoundaries[textState.wordBoundaries.length - 1];
			var boundaryStartIndex = textState.wordBoundaries.lastIndexOf(textState.index);
			if (boundaryStartIndex === -1)
				break;
			var boundaryEndIndex;
			if (textState.wordBoundaries[boundaryStartIndex] === lastBoundaryIndex)
				boundaryEndIndex = textState.text.length - 1;
			else
				boundaryEndIndex = textState.wordBoundaries[boundaryStartIndex + 1] - 1;
			boundaryStartIndex = textState.wordBoundaries[boundaryStartIndex];
			var word = textState.text.substring(boundaryStartIndex, boundaryEndIndex);
			if (textState[textState.index] === '\n' || textState.x >= maxWindowWidth || textState.x + this.textWidth(word) >= maxWindowWidth)
				this.wrapToNewLine(textState);
			break;
	}
	if (!this.needsNewPage(textState))
		_Window_Base_processNormalCharacterForAnimation.apply(this, arguments);
	else {
		// We need to emulate default behaviour to avoid
		// infinite loops with other plugins.
		textState.x += this.textWidth(textState.text[textState.index]);
		while (textState.text[--textState.index] !== ' ' && textState.index > 0) continue;
		textState.index++;
	}
};

/***
 * Check if word wrapping needs to take place in processNormalCharacter
 * textState - contains information related to the message
 */
const _Window_Base_processNormalCharacter = Window_Base.prototype.processNormalCharacter ;
Window_Base.prototype.processNormalCharacter = function (textState) {
	if (typeof textState.wordBoundaries === 'undefined'||
			typeof this.villaA_paddingleft !== 'undefined' && this.villaA_paddingleft > 0) {
		_Window_Base_processNormalCharacter.apply(this, arguments);
		return;
	}
	const maxWindowWidth = this.contents.width - this.textPadding() * 2 - Window_Base._faceWidth + 100;
	switch (WordWrapper.WordWrapStyle) {
		case 'break-all':
			const c = textState.text[textState.index];
			if (textState.x >= maxWindowWidth || textState.x + (this.textWidth(c) * 2) >= maxWindowWidth)
				this.wrapToNewLine(textState);
			break;
		case 'break-word':
		default:
			const lastBoundaryIndex = textState.wordBoundaries[textState.wordBoundaries.length - 1];
			var boundaryStartIndex = textState.wordBoundaries.lastIndexOf(textState.index);
			if (boundaryStartIndex === -1)
				break;
			var boundaryEndIndex;
			if (textState.wordBoundaries[boundaryStartIndex] === lastBoundaryIndex)
				boundaryEndIndex = textState.text.length - 1;
			else
				boundaryEndIndex = textState.wordBoundaries[boundaryStartIndex + 1] - 1;
			boundaryStartIndex = textState.wordBoundaries[boundaryStartIndex];
			var word = textState.text.substring(boundaryStartIndex, boundaryEndIndex);
			if (textState[textState.index] === '\n' || textState.x >= maxWindowWidth || textState.x + this.textWidth(word) >= maxWindowWidth)
				this.wrapToNewLine(textState);
			break;
	}
	if (!this.needsNewPage(textState))
		_Window_Base_processNormalCharacter.apply(this, arguments);
	else {
		// We need to emulate default behaviour otherwise to avoid infinite loops
		// with other plugins.
		textState.index++;
	}
};

/***
 * Check if word wrapping needs to take place in processDrawIcon. Since icons
 * are images we don't need to check the WordWrapStyle setting, we just move
 * the icon to the next line if it doesn't fit
 * iconIndex - index corresponding to icon to be displayed
 * textState - contains information related to the message
 */
const _Window_Base_processDrawIcon = Window_Base.prototype.processDrawIcon;
Window_Message.prototype.processDrawIcon = function (iconIndex, textState) {
	var maxWindowWidth = this.contents.width;
	var iconWidth = Window_Base._iconWidth + 4;
	if (textState.x >= maxWindowWidth || textState.x + iconWidth >= maxWindowWidth)
		this.wrapToNewLine(textState);
	_Window_Base_processDrawIcon.apply(this, arguments);
};

/***
 * Overridee Window_Base.prototype.processNewLine
 * We have to make sure to check if a new line has pushed content off the page,
 * in the case of a message that has a mixture of manual line breaks and
 * word wrap.
 * textState - contains information related to the message
 */
const _Window_Base_processNewLine = Window_Base.prototype.processNewLine;
Window_Base.prototype.processNewLine = function (textState) {
	_Window_Base_processNewLine.apply(this, arguments);
	if (typeof this.needsNewPage === 'function' && this.needsNewPage(textState)) {
		this._processWordWrapBreak = true;
	}
};
})();
