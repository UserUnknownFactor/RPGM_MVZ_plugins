/*:
 * @plugindesc Quick Save and Load Plugin - Allows saving with F5 and loading with F8. Configurable via Plugin Manager. 
 * @author 
 *
 * @param Save Slot
 * @type number
 * @min 1
 * @default 1
 * @desc The save file slot to use for quick save and quick load (default is 1).
 *
 * @param Save Key
 * @type string
 * @default F5
 * @desc The key to trigger quick save (default is F5).
 *
 * @param Load Key
 * @type string
 * @default F8
 * @desc The key to trigger quick load (default is F8).
 *
 * @help
 * ============================================================================
 * Quick Save and Load Plugin
 * ============================================================================
 * 
 * This plugin lets players quickly save their game by pressing a key (default: F5) 
 * and load their game by pressing another key (default: F8). The save slot and
 * key bindings can be configured via the Plugin Manager.
 * 
 * ============================================================================
 * Configuration
 * ============================================================================
 * Plugin Parameters:
 * - Save Slot: The save slot ID to use for saving and loading (default: 1).
 * - Save Key: The key to perform a quick save (default: F5).
 * - Load Key: The key to perform a quick load (default: F8).
 * 
 * Note: You must use valid key names. For example: F1, F2, F5, F8, A, B, etc.
 * 
 * ============================================================================
 * Terms of Use
 * ============================================================================
 * - Free for use in personal and commercial projects.
 * 
 * ============================================================================
 * Changelog
 * ============================================================================
 * Version 1.0.0:
 * - Initial release.
 * ============================================================================
 */

(function() {
const pluginName = 'QSaveLoad';
const parameters = PluginManager.parameters(pluginName);
const SAVE_SLOT = Number(parameters['Save Slot'] || 1);
const SAVE_KEY = String(parameters['Save Key'] || 'F5').toUpperCase();
const LOAD_KEY = String(parameters['Load Key'] || 'F8').toUpperCase();

// Map of RPG Maker's Input system
const keyMapper = {
    F1: 112, F2: 113, F3: 114, F4: 115, F5: 116,
    F6: 117, F7: 118, F8: 119, F9: 120,
    A: 65, B: 66, C: 67, D: 68, E: 69,
    F: 70, G: 71, H: 72, I: 73, J: 74,
    K: 75, L: 76, M: 77, N: 78, O: 79,
    P: 80, Q: 81, R: 82, S: 83, T: 84,
    U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90
};

const saveKeyCode = keyMapper[SAVE_KEY] || 116; // Default to F5 (116)
const loadKeyCode = keyMapper[LOAD_KEY] || 119; // Default to F8 (119)

Input.keyMapper[saveKeyCode] = 'quickSave';
Input.keyMapper[loadKeyCode] = 'quickLoad';

const _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);

    if (Input.isTriggered('quickSave'))
        this.performSave();
    else if (Input.isTriggered('quickLoad'))
        this.performLoad();
};

Scene_Map.prototype.performSave = function() {
    try {
        $gameSystem.onBeforeSave();
        if (DataManager.saveGame(SAVE_SLOT)) {
            StorageManager.cleanBackup(SAVE_SLOT);
            SoundManager.playSave();
            console.log(`Game saved to slot ${SAVE_SLOT}`);
        } else {
            throw new Error(`Failed to save game to slot ${SAVE_SLOT}`);
        }
    } catch (error) {
        console.error(`Error during save operation: ${error.message}`);
        //SceneManager.catchException(error);
    }
};

Scene_Map.prototype.performLoad = function() {
    try {
        if (DataManager.loadGame(SAVE_SLOT)) {
            SoundManager.playLoad();
            SceneManager._scene.fadeOutAll();
            $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y);
            $gamePlayer.requestMapReload();
            SceneManager.goto(Scene_Map);
            $gameSystem.onAfterLoad();
            console.log(`Game loaded from slot ${SAVE_SLOT}`);
        } else {
            throw new Error(`Failed to load game from slot ${SAVE_SLOT}`);
        }
    } catch (error) {
        console.error(`Error during load operation: ${error.message}`);
        //SceneManager.catchException(error);
    }
};
})();