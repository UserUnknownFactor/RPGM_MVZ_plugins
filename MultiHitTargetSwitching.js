/*:
 * @pluginname MultiHitTargetSwitching
 *
 * @help
 * This plugin makes multi-hit attacks (skills/items with repeat > 1)
 * switch targets if the current target dies during the attack sequence.
 * 
 * Compatible with RPG Maker MV/MZ.
 * No configuration needed - it's plug & play!
 * 
 * Terms of Use:
 * - Free for commercial and non-commercial use.
 */

(function() {

const isMZ = Utils.RPGMAKER_NAME === "MZ";

const _Game_Action_numRepeats = Game_Action.prototype.numRepeats;
Game_Action.prototype.numRepeats = function() {
	const repeats = _Game_Action_numRepeats.call(this);
	this._actualRepeats = repeats;
	return 1;
};

const _BattleManager_endAction = BattleManager.endAction;
BattleManager.endAction = function() {
	if (this._action && this._action._actualRepeats > 1) {
		this._action._actualRepeats--;
		if (this._action._actualRepeats > 0) {
			const newTargets = this.getAliveTargets();
			if (newTargets.length > 0) {
				this._targets = newTargets;
				if (!isMZ) {
					if (this._action.isForOne())
						this.invokeAction(this._subject, this._targets[0]);
					else
						for (let i = 0; i < this._targets.length; i++)
							this.invokeAction(this._subject, this._targets[i]);
				} else
					this._phase = 'action';
				return;
			}
		}
	}
	_BattleManager_endAction.call(this);
};

BattleManager.getAliveTargets = function() {
	const action = this._action;
	let targets = [];

	if (action.isForOpponent()) {
		targets = $gameTroop.aliveMembers();
	} else if (action.isForFriend()) {
		if (action.isForDeadFriend())
			targets = $gameParty.deadMembers();
		else
			targets = $gameParty.aliveMembers();
	}
	if (action.isForRandom()) {
		const numTargets = action.numTargets();
		const result = [];
		const availableTargets = targets.slice();
		for (let i = 0; i < numTargets && availableTargets.length > 0; i++) {
			const index = Math.floor(Math.random() * availableTargets.length);
			result.push(availableTargets[index]);
			availableTargets.splice(index, 1);
		}
			
		return result;
	} else if (action.isForOne()) {
		// For single target, select the next target randomly
		if (targets.length > 0) {
			const index = Math.floor(Math.random() * targets.length);
			return [targets[index]];
		}
		return [];
	}

	return targets;
};

})();