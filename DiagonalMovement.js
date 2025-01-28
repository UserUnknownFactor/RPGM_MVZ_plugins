//-----------------------------------------------------------------------------
//  Diagonal Movement Plugin
//-----------------------------------------------------------------------------
//  For: RPGMAKER MV/MZ
//  DiagonalMovement.js
//  Version: 2.0 (2025-02-09)
//-----------------------------------------------------------------------------
/*:
 * @plugindesc (v2.0) Diagonal movement plugin
 * @author Galv and others
 *
 * @param Enable With Mouse
 * @desc [Boolean] Allow to move diagonally on mouse clicks (mods path-finding so it may conflict with plugins that do it too).
 * @default true
 *
 * @param Diagonal Charset
 * @desc [Boolean] Whether to use diagonal character images from the characterset (see help for more).
 * @default false
 *
 * @param Diagonal Speed Multiplier
 * @desc [Number; 50-100] Percentage of movement speed characters use while traveling diagonally.
 * @default 88
 *
 * @param Block Impassable
 * @desc [Boolean] Ensure that diagonally moving character won't clip through corners or walls.
 * @default true
 *
 * @param Pathfinding Limit
 * @desc [Number; 12-22] Limit of searches in the path-finding algorithm.
 * @default 16
 *
 * @help
 *  Diagonal Movement Plugin for RPGM MV/MZ
 * ----------------------------------------------------------------------------
 * Plug and play. If this doesn't play nice with other plugins, try putting it
 * at the top of the plugin list. It overwrites the default diagonal function.
 *
 * If this conflicts with additional path-finding plugins you might have,
 * change 'Enable With Mouse' setting to false.
 *
 * When 'Diagonal Charsets' is true, the plugin will change the sprite if the
 * character is on a diagonal. The new sprite used will be in the position
 * directly below the selected character graphic. This means that only sprites
 * on the top of a character sheet will be able to have diagonal graphics.
 *
 * Sprites on the bottom will not have diagonal graphics.
 * ----------------------------------------------------------------------------
 *   SCRIPT CALL
 * ----------------------------------------------------------------------------
 *
 *   $gameSystem.disableVert = true;	// DISABLE diagonal movement
 *   $gameSystem.disableVert = false;  // ENABLE diagonal movement
 *
 * ----------------------------------------------------------------------------
 *
 * Terms of Use:
 * - Free for commercial and non-commercial use.
 */
 
var Imported = Imported || {};
Imported.Galv_DiagonalMovement = false;

var Galv = Galv || {};
Galv.DM = Galv.DM || {};

(function () {
const PLUGIN_NAME = 'DiagonalMovement';
const DIAGONAL_SPEED_MUL = 88;
const SEARCH_LIMIT = 16; // path-finding search limit (RPGM: 12)

// Plugin Parameters
const parameters = PluginManager.parameters(PLUGIN_NAME);
const getBoolean = (str, def) => (!!str ? !!str.match(/(?:true|on|y(?:es)?)/i) : !!def);

Galv.DM.mouseMove = getBoolean(parameters["Enable With Mouse"], true);
Galv.DM.diagGraphic = getBoolean(parameters["Diagonal Charset"], false);
Galv.DM.diagMod = Number(parameters["Diagonal Speed Multiplier"] || DIAGONAL_SPEED_MUL) * 0.01;
Galv.DM.diagBlocked = getBoolean(parameters["Block Impassable"], true);
Galv.DM.searchLimit = Number(parameters["Pathfinding Limit"] || SEARCH_LIMIT);

const _realMoveSpeed = Game_CharacterBase.prototype.realMoveSpeed;
Game_CharacterBase.prototype.realMoveSpeed = function () {
	const baseSpeed = _realMoveSpeed.call(this);
	return this._diagDir ? baseSpeed * Galv.DM.diagMod : baseSpeed;
};

// Ensure Followers match player speed
Game_Follower.prototype.realMoveSpeed = function () {
	return $gamePlayer.realMoveSpeed();
};

// Direction Helpers
Galv.DM.getHorzVertDirs = function (direction) {
	switch (direction) {
		case 1: return [4, 2];
		case 3: return [6, 2];
		case 7: return [4, 8];
		case 9: return [6, 8];
		default: return [0, 0];
	}
};

Galv.DM.getDir = function (horz, vert) {
	if (horz === 4 && vert === 2) return 1;
	if (horz === 6 && vert === 2) return 3;
	if (horz === 4 && vert === 8) return 7;
	if (horz === 6 && vert === 8) return 9;
	return 0;
};

Galv.DM.diagRow = { 3: 0, 1: 1, 9: 2, 7: 3 };

const _moveStraight = Game_CharacterBase.prototype.moveStraight;
Game_CharacterBase.prototype.moveStraight = function (d) {
	this._diagDir = false;
	_moveStraight.call(this, d);
};

const _setDirection = Game_CharacterBase.prototype.setDirection;
Game_CharacterBase.prototype.setDirection = function (d) {
	if (this._diagStraigten) this._diagDir = false;
	_setDirection.call(this, d);
};

// Block impassable diagonal movement
if (Galv.DM.diagBlocked) {
	Game_Player.prototype.canPassDiagonally = function (x, y, horz, vert) {
		const x2 = $gameMap.roundXWithDirection(x, horz);
		const y2 = $gameMap.roundYWithDirection(y, vert);
		return this.canPass(x, y, vert) && this.canPass(x, y2, horz) &&
					this.canPass(x, y, horz) && this.canPass(x2, y, vert);
	};
}

const _canPassDiagonally = Game_Player.prototype.canPassDiagonally;
Game_Player.prototype.canPassDiagonally = function(x, y, horz, vert) {
	if ($gameSystem.disableVert) return false;
	return _canPassDiagonally.call(this, x, y, horz, vert);
};

Game_CharacterBase.prototype.moveDiagonally = function (horz, vert) {
	const canDiagonal = this.canPassDiagonally(this._x, this._y, horz, vert);
	const canNormal = this.canPass(this._x, this._y, horz) || this.canPass(this._x, this._y, vert);

	if (canDiagonal) {
		this._diagDir = Galv.DM.getDir(horz, vert);
		this._x = $gameMap.roundXWithDirection(this._x, horz);
		this._y = $gameMap.roundYWithDirection(this._y, vert);
		this._realX = $gameMap.xWithDirection(this._x, this.reverseDir(horz));
		this._realY = $gameMap.yWithDirection(this._y, this.reverseDir(vert));
		this.increaseSteps();
	} else if (canNormal) {
		this._diagDir = false;
		this.moveStraight(this.getOtherDir(horz, vert));
	}

	this._diagStraigten = false;
	if (this._direction === this.reverseDir(horz)) this.setDirection(horz);
	if (this._direction === this.reverseDir(vert)) this.setDirection(vert);
	this._diagStraigten = true;
};

Game_CharacterBase.prototype.getOtherDir = function (horz, vert) {
	return this.canPass(this._x, this._y, horz) ? horz : vert;
};

// OVERWRITE: Allow diagonal movement with Input.dir8
Game_Player.prototype.getInputDirection = function () {
	return Input.dir8;
};

const _executeMove = Game_Player.prototype.executeMove;
Game_Player.prototype.executeMove = function (direction) {
	if (direction % 2 === 0) {
		_executeMove.call(this, direction);
	} else {
		const [horz, vert] = Galv.DM.getHorzVertDirs(direction);
		this.moveDiagonally(horz, vert);
	}
};

// Diagonal charset sprites support
if (Galv.DM.diagGraphic) {
	// Character Base Adjustments
	Game_CharacterBase.prototype._cframes = 3;

	const _characterPatternY = Sprite_Character.prototype.characterPatternY;
	Sprite_Character.prototype.characterPatternY = function () {
		if (!this._isBigCharacter && this._character._diagDir && this._character.characterIndex() < 4) {
				return Galv.DM.diagRow[this._character._diagDir];
		}
		return _characterPatternY.call(this);
	};

	const _characterBlockX = Sprite_Character.prototype.characterBlockX;
	Sprite_Character.prototype.characterBlockX = function () {
		if (!this._isBigCharacter && this._character._diagDir && this._character.characterIndex() < 4) {
				const index = this._character.characterIndex() + 4;
				return (index % 4) * this._character._cframes;
		}
		return _characterBlockX.call(this);
	};

	const _characterBlockY = Sprite_Character.prototype.characterBlockY;
	Sprite_Character.prototype.characterBlockY = function () {
		if (!this._isBigCharacter && this._character._diagDir && this._character.characterIndex() < 4) {
				const index = this._character.characterIndex() + 4;
				return Math.floor(index / 4) * 4;
		}
		return _characterBlockY.call(this);
	};
}
// end of diagonal charset support

// OVERWRITE: Adjust character behavior for turning towards diagonal directions
Game_Character.prototype.turnTowardCharacter = function (character) {
	const sx = this.deltaXFrom(character.x);
	const sy = this.deltaYFrom(character.y);
	const absSx = Math.abs(sx);
	const absSy = Math.abs(sy);

	if (absSx === absSy) {
		if (sx < 0)
			this._diagDir = sy > 0 ? 9 : 3;
		else if (sx > 0)
			this._diagDir = sy > 0 ? 7 : 1;
	} else
		this._diagDir = 0;

	if (absSx > absSy)
		this.setDirection(sx > 0 ? 4 : 6);
	else if (sy !== 0)
		this.setDirection(sy > 0 ? 8 : 2);
};

// Daigonal mouse movement path-finding compatibility
if (Galv.DM.mouseMove) {
	const _findDirectionTo = Game_Character.prototype.findDirectionTo;
	Game_Character.prototype.findDirectionTo = function (goalX, goalY) {
		if ($gameSystem.disableVert)
			return _findDirectionTo.call(this, goalX, goalY);

		if (this.x === goalX && this.y === goalY)
			return 0;

		const mapWidth = $gameMap.width();
		const openList = [];
		const closedList = [];
		const nodeList = [];
		const start = { 
			x: this.x, y: this.y, g: 0, 
			f: $gameMap.distance(this.x, this.y, goalX, goalY),
			parent: null 
		};

		nodeList.push(start);
		openList.push(start.y * mapWidth + start.x);

		let best = start;

		while (nodeList.length > 0) {
			const current = nodeList.reduce((a, b) => (a.f < b.f ? a : b));
			const pos1 = current.y * mapWidth + current.x;

			nodeList.splice(nodeList.indexOf(current), 1);
			openList.splice(openList.indexOf(pos1), 1);
			closedList.push(pos1);

			if (current.x === goalX && current.y === goalY) {
				best = current;
				break;
			}

			if (current.g >= Galv.DM.searchLimit) continue;

			for (let direction = 1; direction <= 9; direction++) {
				if (direction === 5) continue;

				const isDiagonal = direction % 2 === 1;
				const [horz, vert] = Galv.DM.getHorzVertDirs(direction);

				let x2, y2;
				if (isDiagonal) {
					// Check if diagonal movement is possible
					if (this.canPassDiagonally(current.x, current.y, horz, vert)) {
						// If can go diagonally / not blocking
						x2 = $gameMap.roundXWithDirection(current.x, horz);
						y2 = $gameMap.roundYWithDirection(current.y, vert);
					} else
						continue;
				} else {
					// Check if straight movement is possible
					if (this.canPass(current.x, current.y, direction)) {
						x2 = $gameMap.roundXWithDirection(current.x, direction);
						y2 = $gameMap.roundYWithDirection(current.y, direction);
					} else
						continue;
				}

				const pos2 = y2 * mapWidth + x2;
				if (closedList.includes(pos2)) continue;

				const g2 = current.g + 1;
				const existingNodeIndex = openList.indexOf(pos2);

				if (existingNodeIndex < 0 || g2 < nodeList[existingNodeIndex].g) {
					let neighbor;
					if (existingNodeIndex >= 0) {
						neighbor = nodeList[existingNodeIndex];
					} else {
						neighbor = {};
						nodeList.push(neighbor);
						openList.push(pos2);
					}

					neighbor.parent = current;
					neighbor.x = x2;
					neighbor.y = y2;
					neighbor.g = g2;
					neighbor.f = g2 + $gameMap.distance(x2, y2, goalX, goalY);

					if (!best || neighbor.f - neighbor.g < best.f - best.g)
						best = neighbor;
				}
			}
		}

		let node = best;
		while (node.parent && node.parent !== start)
			node = node.parent;

		const deltaX1 = $gameMap.deltaX(node.x, start.x);
		const deltaY1 = $gameMap.deltaY(node.y, start.y);

		if (deltaY1 > 0 && deltaX1 > 0) return 3; // Down-Right
		if (deltaY1 > 0 && deltaX1 < 0) return 1; // Down-Left
		if (deltaY1 < 0 && deltaX1 < 0) return 7; // Up-Left
		if (deltaY1 < 0 && deltaX1 > 0) return 9; // Up-Right
		if (deltaY1 > 0) return 2; // Down
		if (deltaX1 < 0) return 4; // Left
		if (deltaX1 > 0) return 6; // Right
		if (deltaY1 < 0) return 8; // Up

		// If no valid direction is found, fallback to the closest axis
		const deltaX2 = this.deltaXFrom(goalX);
		const deltaY2 = this.deltaYFrom(goalY);
		if (Math.abs(deltaX2) > Math.abs(deltaY2))
			return deltaX2 > 0 ? 4 : 6;
		else if (deltaY2 !== 0)
			return deltaY2 > 0 ? 8 : 2;

		return 0;
	};
}

Imported.Galv_DiagonalMovement = true;
})();