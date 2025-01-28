/*:
 * @pluginname BonusExpGold
 * 
 * @help
 * This plugin allows adding bonus EXP and/or Gold to battles.
 * 
 * Use BattleManager.addBonusExp(amount) to add bonus EXP in Event scripts
 * or BattleManager.addBonusG(amount) to add bonus Gold in Event scripts
 * The bonus will be added to the battle's registered rewards.
 * 
 * Terms of Use:
 * - Free for commercial and non-commercial use.
 */

(function() {

const _BattleManager_setup = BattleManager.initMembers;
BattleManager.initMembers = function() {
    _BattleManager_setup.apply(this, arguments);
    this._bonusExp = 0;
    this._bonusG = 0;
};

BattleManager.setBonusExp = function(amount) {
    this._bonusExp = amount;
};

BattleManager.addBonusExp = function(amount) {
    this._bonusExp += amount;
};

BattleManager.getBonusExp = function() {
    return this._bonusExp;
};

BattleManager.setBonusG = function(amount) {
    this._bonusG = amount;
};

BattleManager.addBonusG = function(amount) {
    this._bonusG += amount;
};

BattleManager.getBonusG = function() {
    return this._bonusG;
};

const _BattleManager_makeRewards = BattleManager.makeRewards;
BattleManager.makeRewards = function() {
    _BattleManager_makeRewards.call(this);
    this._rewards.exp += this.getBonusExp();
    this._rewards.gold += this.getBonusG();
};

const _BattleManager_processVictory = BattleManager.processVictory;
BattleManager.processVictory = function() {
    _BattleManager_processVictory.call(this);
    this.setBonusExp(0);
    this.setBonusG(0);
};

})();