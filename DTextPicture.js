//=============================================================================
// DTextPicture.js
// ----------------------------------------------------------------------------
// (C) 2015 Triacontane
// This software is released under the MIT License.
// http://opensource.org/licenses/mit-license.php
// ----------------------------------------------------------------------------
//=============================================================================

/*:
 * @plugindesc 動的文字列ピクチャ生成プラグイン
 * @author トリアコンタン
 *
 * @param itemIconSwitchId
 * @text アイテムアイコンスイッチID
 * @desc 指定した番号のスイッチがONのとき\ITEM[n]でアイコンが表示されます。指定しない場合、常に表示されます。
 * @default 0
 * @type switch
 *
 * @param lineSpacingVariableId
 * @text 行間補正変数ID
 * @desc 複数行表示の際の行間に、指定した変数の値の分だけ補正が掛かります。大きすぎる値を設定すると見切れる場合があります。
 * @default 0
 * @type variable
 *
 * @param frameWindowSkin
 * @text フレームウィンドウスキン
 * @desc フレームウィンドウのスキンファイル名です。ウィンドウビルダーを使っている場合は、指定する必要があります。
 * @default
 * @require 1
 * @dir img/system/
 * @type file
 *
 * @param frameWindowPadding
 * @text フレームウィンドウ余白
 * @desc フレームウィンドウの余白です。
 * @default 18
 * @type number
 *
 * @param padCharacter
 * @text 埋め文字
 * @desc 数値描画時、指定桁数に満たないときに埋められる文字です。半角で1文字だけ指定してください。
 * @default 0
 *
 * @param prefixText
 * @text 接頭辞文字列
 * @desc すべての文字列ピクチャの前に挿入されるテキストです。主にデフォルトの制御文字などを指定します。
 * @default
 *
 * @help 指定した文字列でピクチャを動的に生成するコマンドを提供します。
 * 文字列には各種制御文字（\v[n]等）も使用可能で、制御文字で表示した変数の値が
 * 変更されたときにリアルタイムでピクチャの内容を更新できます。
 *
 * 以下の手順で表示します。
 *  1 : プラグインコマンド[D_TEXT]で描画したい文字列と引数を指定（下記の例参照）
 *  2 : プラグインコマンド[D_TEXT_SETTING]で背景色や揃えを指定（任意）
 *  3 : イベントコマンド「ピクチャの表示」で「画像」を未選択に指定。
 * ※ 1の時点ではピクチャは表示されないので必ずセットで呼び出してください。
 * ※ ピクチャ表示前にD_TEXTを複数回実行すると、複数行表示できます。
 *
 * ※ ver1.4.0より、[D_TEXT]実行後に「ピクチャの表示」で「画像」を指定した場合は
 *    動的文字列ピクチャ生成を保留として通常通り「画像」ピクチャが表示される
 *    ように挙動が変更になりました。
 *
 * プラグインコマンド詳細
 *   イベントコマンド「プラグインコマンド」から実行。
 *   （引数の間は半角スペースで区切る）
 *
 *  D_TEXT [描画文字列] [文字サイズ] : 動的文字列ピクチャ生成の準備
 *  例：D_TEXT テスト文字列 32
 *
 * 表示後は通常のピクチャと同様に移動や回転、消去ができます。
 * また、変数やアクターの表示など制御文字にも対応しています。
 *
 *  D_TEXT_SETTING ALIGN [揃え] : 揃え（左揃え、中央揃え、右揃え）の設定
 *  0:左揃え 1:中央揃え 2:右揃え
 *
 *  例：D_TEXT_SETTING ALIGN 0
 *      D_TEXT_SETTING ALIGN CENTER
 *
 * ※ 揃えの設定は複数行を指定したときに最も横幅の大きい行に合わせられます。
 * 　 よって単一行しか描画しないときは、この設定は機能しません。
 *
 *  D_TEXT_SETTING BG_COLOR [背景色] : 背景色の設定(CSSの色指定と同様の書式)
 *
 *  例：D_TEXT_SETTING BG_COLOR black
 *      D_TEXT_SETTING BG_COLOR #336699
 *      D_TEXT_SETTING BG_COLOR rgba(255,255,255,0.5)
 *
 *  背景色のグラデーションをピクセル数で指定できます。
 *  D_TEXT_SETTING BG_GRADATION_RIGHT [ピクセル数]
 *  D_TEXT_SETTING BG_GRADATION_LEFT [ピクセル数]
 *
 *  例：D_TEXT_SETTING BG_GRADATION_RIGHT 50
 *  　　D_TEXT_SETTING BG_GRADATION_LEFT 50
 *
 *  D_TEXT_SETTING REAL_TIME ON : 制御文字で表示した変数のリアルタイム表示
 *
 *  例：D_TEXT_SETTING REAL_TIME ON
 *
 *  リアルタイム表示を有効にしておくと、ピクチャの表示後に変数の値が変化したとき
 *  自動でピクチャの内容も更新されます。
 *
 *  D_TEXT_SETTING WINDOW ON : 背景にウィンドウを表示する
 *  例：D_TEXT_SETTING WINDOW ON
 *
 *  D_TEXT_SETTING FONT [フォント名] : 描画で使用するフォントを指定した名称に変更
 *  例：D_TEXT_SETTING FONT ＭＳ Ｐ明朝
 *
 * これらの設定はD_TEXTと同様、ピクチャを表示する前に行ってください。
 *
 * 対応制御文字一覧（イベントコマンド「文章の表示」と同一です）
 * \V[n]
 * \N[n]
 * \P[n]
 * \G
 * \C[n]
 * \I[n]
 * \{
 * \}
 *
 * 専用制御文字
 * \V[n,m](m桁分のパラメータで指定した文字で埋めた変数の値)
 * \item[n]   n 番のアイテム情報（アイコン＋名称）
 * \weapon[n] n 番の武器情報（アイコン＋名称）
 * \armor[n]  n 番の防具情報（アイコン＋名称）
 * \skill[n]  n 番のスキル情報（アイコン＋名称）
 * \state[n]  n 番のステート情報（アイコン＋名称）
 * \oc[c] アウトラインカラーを「c」に設定(※1)
 * \ow[n] アウトライン幅を「n」に設定(例:\ow[5])
 * \f[b] フォントの太字化
 * \f[i] フォントのイタリック化
 * \f[n] フォントの太字とイタリックを通常に戻す
 *
 * ※1 アウトラインカラーの指定方法
 * \oc[red]  色名で指定
 * \oc[rgb(0,255,0)] カラーコードで指定
 * \oc[2] 文字色番号\c[n]と同様のもので指定
 *
 * 背景にウィンドウを表示しているときにカーソルを表示します。
 * このコマンドは動的文字列ピクチャを表示後に実行してください。
 *  D_TEXT_WINDOW_CURSOR 1 ON  # ピクチャ[1]にウィンドウカーソルを表示
 *  D_TEXT_WINDOW_CURSOR 2 OFF # ピクチャ[2]にウィンドウカーソルを消去
 *
 * カーソルのアクティブ状態を変更するコマンドは以下の通りです。
 *  D_TEXT_WINDOW_CURSOR_ACTIVE 2 ON  # ピクチャ[1]のカーソルをアクティブ
 *  D_TEXT_WINDOW_CURSOR_ACTIVE 1 OFF # ピクチャ[1]のカーソルをストップ
 *
 * カーソル矩形の座標を指定する場合は以下の通りです。
 *  D_TEXT_WINDOW_CURSOR 1 ON 0 0 100 100  # ピクチャ[1]に[0,0,100,100]のサイズの
 *                                         # ウィンドウカーソルを表示
 *
 * 利用規約：
 *  作者に無断で改変、再配布が可能で、利用形態（商用、18禁利用等）
 *  についても制限はありません。
 *  このプラグインはもうあなたのものです。
 */
(function() {
    'use strict';

    var getCommandName = function(command) {
        return (command || '').toUpperCase();
    };

    var getArgNumber = function(arg, min, max) {
        if (arguments.length < 2) min = -Infinity;
        if (arguments.length < 3) max = Infinity;
        return (parseInt(convertEscapeCharacters(arg.toString())) || 0).clamp(min, max);
    };

    var getArgString = function(arg, upperFlg) {
        arg = convertEscapeCharacters(arg);
        return upperFlg ? arg.toUpperCase() : arg;
    };

    var getArgBoolean = function(arg) {
        return (arg || '').toUpperCase() === 'ON';
    };

    var connectArgs = function(args, startIndex, endIndex) {
        if (arguments.length < 2) startIndex = 0;
        if (arguments.length < 3) endIndex = args.length;
        var text = '';
        for (var i = startIndex; i < endIndex; i++) {
            text += args[i];
            if (i < endIndex - 1) text += ' ';
        }
        return text;
    };

    var convertEscapeCharacters = function(text) {
        if (text === undefined || text === null) text = '';
        var window = SceneManager.getHiddenWindow();
        return window ? window.convertEscapeCharacters(text) : text;
    };

    var getUsingVariables = function(text) {
        var usingVariables = [];

        text = text.replace(/\\/g, '\x1b');
        text = text.replace(/\x1b\x1b/g, '\\');
        text = text.replace(/\x1bV\[(\d+),\s*(\d+)]/gi, function() {
            var number = parseInt(arguments[1], 10);
            usingVariables.push(number);
            return $gameVariables.value(number);
        }.bind(this));
        text = text.replace(/\x1bV\[(\d+)]/gi, function() {
            var number = parseInt(arguments[1], 10);
            usingVariables.push(number);
            return $gameVariables.value(number);
        }.bind(this));
        text = text.replace(/\x1bV\[(\d+)]/gi, function() {
            var number = parseInt(arguments[1], 10);
            usingVariables.push(number);
            return $gameVariables.value(number);
        }.bind(this));
        return usingVariables;
    };

    /**
     * Create plugin parameter. param[paramName] ex. param.commandPrefix
     * @param pluginName plugin name(EncounterSwitchConditions)
     * @returns {Object} Created parameter
     */
    var createPluginParameter = function(pluginName) {
        var paramReplacer = function(key, value) {
            if (value === 'null') {
                return value;
            }
            if (value[0] === '"' && value[value.length - 1] === '"') {
                return value;
            }
            try {
                return JSON.parse(value);
            } catch (e) {
                return value;
            }
        };
        var parameter     = JSON.parse(JSON.stringify(PluginManager.parameters(pluginName), paramReplacer));
        PluginManager.setParameters(pluginName, parameter);
        return parameter;
    };
    var textDecParam          = createPluginParameter('TextDecoration');
    var param                 = createPluginParameter('DTextPicture');

    //=============================================================================
    // Game_Interpreter
    //  プラグインコマンド[D_TEXT]を追加定義します。
    //=============================================================================
    if (PluginManager.parameters('NRP_EvalPluginCommand')) {
        var _Game_Interpreter_command356 = Game_Interpreter.prototype.command356;
        Game_Interpreter.prototype.command356 = function() {
            this._argClone = this._params[0].split(" ");
            this._argClone.shift();
            return _Game_Interpreter_command356.apply(this, arguments);
        };
    }

    var _Game_Interpreter_pluginCommand      = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.apply(this, arguments);
        if (this._argClone) {
            args = this._argClone;
            this._argClone = null;
        }
        this.pluginCommandDTextPicture(command, args);
    };

    // Resolve conflict for YEP_PluginCmdSwVar.js
    var _Game_Interpreter_processPluginCommandSwitchVariables = Game_Interpreter.prototype.processPluginCommandSwitchVariables;
    Game_Interpreter.prototype.processPluginCommandSwitchVariables = function() {
        if (this._params[0].toUpperCase().indexOf('D_TEXT') >= 0) {
            return;
        }
        _Game_Interpreter_processPluginCommandSwitchVariables.apply(this, arguments);
    };

    Game_Interpreter.textAlignMapper = {
        LEFT: 0, CENTER: 1, RIGHT: 2, 左: 0, 中央: 1, 右: 2
    };

    Game_Interpreter.prototype.pluginCommandDTextPicture = function(command, args) {
        switch (getCommandName(command)) {
            case 'D_TEXT' :
                if (isNaN(convertEscapeCharacters(args[args.length - 1])) || args.length === 1) {
                    args.push($gameScreen.dTextSize || 28);
                }
                var fontSize = getArgNumber(args.pop());
                $gameScreen.setDTextPicture(connectArgs(args), fontSize);
                break;
            case 'D_TEXT_SETTING':
                switch (getCommandName(args[0])) {
                    case 'ALIGN' :
                        $gameScreen.dTextAlign = isNaN(args[1]) ?
                            Game_Interpreter.textAlignMapper[getArgString(args[1], true)] : getArgNumber(args[1], 0, 2);
                        break;
                    case 'BG_COLOR' :
                        $gameScreen.dTextBackColor = getArgString(connectArgs(args, 1));
                        break;
                    case 'BG_GRADATION_LEFT' :
                        $gameScreen.dTextGradationLeft = getArgNumber(args[1], 0);
                        break;
                    case 'BG_GRADATION_RIGHT' :
                        $gameScreen.dTextGradationRight = getArgNumber(args[1], 0);
                        break;
                    case 'FONT':
                        args.shift();
                        $gameScreen.setDtextFont(getArgString(connectArgs(args)));
                        break;
                    case 'REAL_TIME' :
                        $gameScreen.dTextRealTime = getArgBoolean(args[1]);
                        break;
                    case 'WINDOW':
                        $gameScreen.dWindowFrame = getArgBoolean(args[1]);
                        break;
                }
                break;
            case 'D_TEXT_WINDOW_CURSOR' :
                var windowRect = null;
                if (getArgBoolean(args[1])) {
                    windowRect = {
                        x     : getArgNumber(args[2] || '', 0),
                        y     : getArgNumber(args[3] || '', 0),
                        width : getArgNumber(args[4] || '', 0),
                        height: getArgNumber(args[5] || '', 0)
                    };
                }
                $gameScreen.setDTextWindowCursor(getArgNumber(args[0], 0), windowRect);
                break;
            case 'D_TEXT_WINDOW_CURSOR_ACTIVE' :
                $gameScreen.setDTextWindowCursorActive(getArgNumber(args[0], 0), getArgBoolean(args[1]));
                break;
        }
    };

    //=============================================================================
    // Game_Variables
    //  値を変更した変数の履歴を取得します。
    //=============================================================================
    var _Game_Variables_setValue      = Game_Variables.prototype.setValue;
    Game_Variables.prototype.setValue = function(variableId, value) {
        variableId = parseInt(variableId);
        if (this.value(variableId) !== value) {
            this._changedVariables = this.getChangedVariables();
            if (!this._changedVariables.contains(variableId)) {
                this._changedVariables.push(variableId);
            }
        }
        _Game_Variables_setValue.apply(this, arguments);
    };

    Game_Variables.prototype.getChangedVariables = function() {
        return this._changedVariables || [];
    };

    Game_Variables.prototype.clearChangedVariables = function() {
        return this._changedVariables = [];
    };

    //=============================================================================
    // Game_Screen
    //  動的ピクチャ用のプロパティを追加定義します。
    //=============================================================================
    var _Game_Screen_clear      = Game_Screen.prototype.clear;
    Game_Screen.prototype.clear = function() {
        _Game_Screen_clear.call(this);
        this.clearDTextPicture();
    };

    Game_Screen.prototype.clearDTextPicture = function() {
        this.dTextValue          = null;
        this.dTextOriginal       = null;
        this.dTextRealTime       = null;
        this.dTextSize           = 0;
        this.dTextAlign          = 0;
        this.dTextBackColor      = null;
        this.dTextFont           = null;
        this.dUsingVariables     = null;
        this.dWindowFrame        = null;
        this.dTextGradationRight = 0;
        this.dTextGradationLeft  = 0;
    };

    Game_Screen.prototype.setDTextPicture = function(value, size) {
        if (typeof TranslationManager !== 'undefined') {
            TranslationManager.translateIfNeed(value, function(translatedText) {
                value = translatedText;
            });
        }
        this.dUsingVariables = (this.dUsingVariables || []).concat(getUsingVariables(value));
        this.dTextValue      = (this.dTextValue || '') + getArgString(value, false).replace(/_/g, ' ') + '\n';
        this.dTextOriginal   = (this.dTextOriginal || '') + value + '\n';
        this.dTextSize       = size;
    };

    Game_Screen.prototype.setDTextWindowCursor = function(pictureId, rect) {
        var picture = this.picture(pictureId);
        if (picture) {
            picture.setWindowCursor(rect);
            picture.setWindowCursorActive(true);
        }
    };

    Game_Screen.prototype.setDTextWindowCursorActive = function(pictureId, value) {
        var picture = this.picture(pictureId);
        if (picture) {
            picture.setWindowCursorActive(value);
        }
    };

    Game_Screen.prototype.getDTextPictureInfo = function() {
        var prefix = getArgString(param.prefixText) || '';
        return {
            value         : prefix + this.dTextValue,
            size          : this.dTextSize || 0,
            align         : this.dTextAlign || 0,
            color         : this.dTextBackColor,
            font          : this.dTextFont,
            usingVariables: this.dUsingVariables,
            realTime      : this.dTextRealTime,
            originalValue : prefix + this.dTextOriginal,
            windowFrame   : this.dWindowFrame,
            gradationLeft : this.dTextGradationLeft,
            gradationRight: this.dTextGradationRight,
        };
    };

    Game_Screen.prototype.isSettingDText = function() {
        return !!this.dTextValue;
    };

    Game_Screen.prototype.setDtextFont = function(name) {
        this.dTextFont = name;
    };

    var _Game_Screen_updatePictures      = Game_Screen.prototype.updatePictures;
    Game_Screen.prototype.updatePictures = function() {
        _Game_Screen_updatePictures.apply(this, arguments);
        $gameVariables.clearChangedVariables();
    };

    //=============================================================================
    // Game_Picture
    //  動的ピクチャ用のプロパティを追加定義し、表示処理を動的ピクチャ対応に変更します。
    //=============================================================================
    var _Game_Picture_initBasic      = Game_Picture.prototype.initBasic;
    Game_Picture.prototype.initBasic = function() {
        _Game_Picture_initBasic.call(this);
        this.dTextValue = null;
        this.dTextInfo  = null;
    };

    var _Game_Picture_show      = Game_Picture.prototype.show;
    Game_Picture.prototype.show = function(name, origin, x, y, scaleX,
                                           scaleY, opacity, blendMode) {
        if ($gameScreen.isSettingDText() && !name) {
            arguments[0]   = Date.now().toString();
            this.dTextInfo = $gameScreen.getDTextPictureInfo();
            $gameScreen.clearDTextPicture();
        } else {
            this.dTextInfo = null;
        }
        _Game_Picture_show.apply(this, arguments);
    };

    var _Game_Picture_update      = Game_Picture.prototype.update;
    Game_Picture.prototype.update = function() {
        _Game_Picture_update.apply(this, arguments);
        if (this.dTextInfo && this.dTextInfo.realTime) {
            this.updateDTextVariable();
        }
    };

    Game_Picture.prototype.updateDTextVariable = function() {
        $gameVariables.getChangedVariables().forEach(function(variableId) {
            if (this.dTextInfo.usingVariables.contains(variableId)) {
                this._name           = Date.now().toString();
                this.dTextInfo.value = getArgString(this.dTextInfo.originalValue, false);
            }
        }, this);
    };

    Game_Picture.prototype.setWindowCursor = function(rect) {
        this._windowCursor = rect;
    };

    Game_Picture.prototype.getWindowCursor = function() {
        return this._windowCursor;
    };

    Game_Picture.prototype.setWindowCursorActive = function(value) {
        this._windowCursorActive = value;
    };

    Game_Picture.prototype.getWindowCursorActive = function() {
        return this._windowCursorActive;
    };

    //=============================================================================
    // SceneManager
    //  文字描画用の隠しウィンドウを取得します。
    //=============================================================================
    SceneManager.getHiddenWindow = function() {
        if (!this._hiddenWindow) {
            this._hiddenWindow = new Window_Hidden(1, 1, 1, 1);
        }
        return this._hiddenWindow;
    };

    SceneManager.getSpriteset = function() {
        return this._scene._spriteset;
    };

    //=============================================================================
    // Window_Base
    //  文字列変換処理に追加制御文字を設定します。
    //=============================================================================
    var _Window_Base_convertEscapeCharacters      = Window_Base.prototype.convertEscapeCharacters;
    Window_Base.prototype.convertEscapeCharacters = function(text) {
        text = _Window_Base_convertEscapeCharacters.call(this, text);
        text = text.replace(/\x1bV\[(\d+),\s*(\d+)]/gi, function() {
            return this.getVariablePadCharacter($gameVariables.value(parseInt(arguments[1], 10)), arguments[2]);
        }.bind(this));
        text = text.replace(/\x1bITEM\[(\d+)]/gi, function() {
            var item = $dataItems[getArgNumber(arguments[1], 1, $dataItems.length)];
            return this.getItemInfoText(item);
        }.bind(this));
        text = text.replace(/\x1bWEAPON\[(\d+)]/gi, function() {
            var item = $dataWeapons[getArgNumber(arguments[1], 1, $dataWeapons.length)];
            return this.getItemInfoText(item);
        }.bind(this));
        text = text.replace(/\x1bARMOR\[(\d+)]/gi, function() {
            var item = $dataArmors[getArgNumber(arguments[1], 1, $dataArmors.length)];
            return this.getItemInfoText(item);
        }.bind(this));
        text = text.replace(/\x1bSKILL\[(\d+)]/gi, function() {
            var item = $dataSkills[getArgNumber(arguments[1], 1, $dataSkills.length)];
            return this.getItemInfoText(item);
        }.bind(this));
        text = text.replace(/\x1bSTATE\[(\d+)]/gi, function() {
            var item = $dataStates[getArgNumber(arguments[1], 1, $dataStates.length)];
            return this.getItemInfoText(item);
        }.bind(this));
        return text;
    };

    Window_Base.prototype.getItemInfoText = function(item) {
        if (!item) {
            return '';
        }
        return (this.isValidDTextIconSwitch() ? '\x1bi[' + item.iconIndex + ']' : '') + item.name;
    };

    Window_Base.prototype.isValidDTextIconSwitch = function() {
        return !param.itemIconSwitchId || $gameSwitches.value(param.itemIconSwitchId);
    };

    Window_Base.prototype.getVariablePadCharacter = function(value, digit) {
        var numText = String(Math.abs(value));
        var pad = String(param.padCharacter) || '0';
        while (numText.length < digit) {
            numText = pad + numText;
        }
        return (value < 0 ? '-' : '') + numText;
    };

    //=============================================================================
    // Sprite_Picture
    //  画像の動的生成を追加定義します。
    //=============================================================================
    var _Sprite_Picture_update      = Sprite_Picture.prototype.update;
    Sprite_Picture.prototype.update = function() {
        _Sprite_Picture_update.apply(this, arguments);
        if (this._frameWindow) {
            this.updateFrameWindow();
        }
    };

    Sprite_Picture.prototype.updateFrameWindow = function() {
        var padding               = this._frameWindow.standardPadding();
        this._frameWindow.x       = this.x - (this.anchor.x * this.width * this.scale.x) - padding;
        this._frameWindow.y       = this.y - (this.anchor.y * this.height * this.scale.y) - padding;
        this._frameWindow.opacity = this.opacity;
        if (!this.visible) {
            this.removeFrameWindow();
            return;
        }
        if (!this._addFrameWindow) {
            this.addFrameWindow();
        }
        if (Graphics.frameCount % 2 === 0) {
            this.adjustScaleFrameWindow();
        }
        this.updateFrameWindowCursor();
    };

    Sprite_Picture.prototype.updateFrameWindowCursor = function() {
        var picture = this.picture();
        if (!picture) {
            return;
        }
        var rect = picture.getWindowCursor();
        if (rect) {
            var width  = rect.width || this._frameWindow.contentsWidth();
            var height = rect.height || this._frameWindow.contentsHeight();
            this._frameWindow.setCursorRect(rect.x || 0, rect.y || 0, width, height);
            this._frameWindow.active = picture.getWindowCursorActive();
        } else {
            this._frameWindow.setCursorRect(0, 0, 0, 0);
        }
    };

    Sprite_Picture.prototype.adjustScaleFrameWindow = function() {
        var padding        = this._frameWindow.standardPadding();
        var newFrameWidth  = Math.floor(this.width * this.scale.x + padding * 2);
        var newFrameHeight = Math.floor(this.height * this.scale.x + padding * 2);
        if (this._frameWindow.width !== newFrameWidth || this._frameWindow.height !== newFrameHeight) {
            this._frameWindow.move(this._frameWindow.x, this._frameWindow.y, newFrameWidth, newFrameHeight);
        }
    };

    Sprite_Picture.prototype.addFrameWindow = function() {
        var parent = this.parent;
        if (parent) {
            var index = parent.getChildIndex(this);
            parent.addChildAt(this._frameWindow, index);
            this._addFrameWindow = true;
        }
    };

    Sprite_Picture.prototype.removeFrameWindow = function() {
        var parent = this.parent;
        if (parent) {
            parent.removeChild(this._frameWindow);
            this._frameWindow    = null;
            this._addFrameWindow = false;
        }
    };

    var _Sprite_Picture_loadBitmap      = Sprite_Picture.prototype.loadBitmap;
    Sprite_Picture.prototype.loadBitmap = function() {
        this.dTextInfo = this.picture().dTextInfo;
        if (this.dTextInfo) {
            this.makeDynamicBitmap();
        } else {
            _Sprite_Picture_loadBitmap.apply(this, arguments);
        }
    };

    Sprite_Picture.prototype.makeDynamicBitmap = function() {
        this.textWidths   = [];
        this.hiddenWindow = SceneManager.getHiddenWindow();
        this.hiddenWindow.resetFontSettings(this.dTextInfo);
        var bitmapVirtual = new Bitmap_Virtual();
        this._processText(bitmapVirtual);
        this.hiddenWindow.resetFontSettings(this.dTextInfo);
        this.bitmap = new Bitmap(bitmapVirtual.width, bitmapVirtual.height);
        this.applyTextDecoration();
        this.bitmap.fontFace = this.hiddenWindow.contents.fontFace;
        if (this.dTextInfo.color) {
            this.bitmap.fillAll(this.dTextInfo.color);
            var h             = this.bitmap.height;
            var w             = this.bitmap.width;
            var gradationLeft = this.dTextInfo.gradationLeft;
            if (gradationLeft > 0) {
                this.bitmap.clearRect(0, 0, gradationLeft, h);
                this.bitmap.gradientFillRect(0, 0, gradationLeft, h, 'rgba(0, 0, 0, 0)', this.dTextInfo.color, false);
            }
            var gradationRight = this.dTextInfo.gradationRight;
            if (gradationRight > 0) {
                this.bitmap.clearRect(w - gradationRight, 0, gradationRight, h);
                this.bitmap.gradientFillRect(w - gradationRight, 0, gradationRight, h, this.dTextInfo.color, 'rgba(0, 0, 0, 0)', false);
            }
        }
        this._processText(this.bitmap);
        this.setColorTone([0, 0, 0, 0]);
        if (this._frameWindow) {
            this.removeFrameWindow();
        }
        if (this.dTextInfo.windowFrame) {
            var scaleX = this.picture().scaleX() / 100;
            var scaleY = this.picture().scaleY() / 100;
            this.makeFrameWindow(bitmapVirtual.width * scaleX, bitmapVirtual.height * scaleY);
        }
        this.hiddenWindow = null;
    };

    Sprite_Picture.prototype.applyTextDecoration = function() {
        if (textDecParam.Mode >= 0) {
            this.bitmap.outlineColor   =
                'rgba(%1,%2,%3,%4)'.format(textDecParam.Red, textDecParam.Green, textDecParam.Blue, textDecParam.Alpha / 255);
            this.bitmap.decorationMode = textDecParam.Mode;
        }
    };

    Sprite_Picture.prototype.makeFrameWindow = function(width, height) {
        var padding       = this.hiddenWindow.standardPadding();
        this._frameWindow = new Window_BackFrame(0, 0, width + padding * 2, height + padding * 2);
        if (param.frameWindowSkin) {
            this._frameWindow.windowskin = ImageManager.loadSystem(param.frameWindowSkin);
        }
    };

    Sprite_Picture.prototype._processText = function(bitmap) {
        var textState = {index: 0, x: 0, y: 0, text: this.dTextInfo.value, left: 0, line: -1, height: 0};
        this._processNewLine(textState, bitmap);
        textState.height = this.hiddenWindow.calcTextHeight(textState, false);
        textState.index  = 0;
        while (textState.text[textState.index]) {
            this._processCharacter(textState, bitmap);
        }
    };

    Sprite_Picture.prototype._processCharacter = function(textState, bitmap) {
        if (textState.text[textState.index] === '\x1b') {
            var code = this.hiddenWindow.obtainEscapeCode(textState);
            switch (code) {
                case 'C':
                    bitmap.textColor = this.hiddenWindow.textColor(this.hiddenWindow.obtainEscapeParam(textState));
                    break;
                case 'I':
                    this._processDrawIcon(this.hiddenWindow.obtainEscapeParam(textState), textState, bitmap);
                    break;
                case '{':
                    this.hiddenWindow.makeFontBigger();
                    break;
                case '}':
                    this.hiddenWindow.makeFontSmaller();
                    break;
                case 'F':
                    switch (this.hiddenWindow.obtainEscapeParamString(textState).toUpperCase()) {
                        case 'I':
                            bitmap.fontItalic = true;
                            break;
                        case 'B':
                            bitmap.fontBoldFotDtext = true;
                            break;
                        case '/':
                        case 'N':
                            bitmap.fontItalic       = false;
                            bitmap.fontBoldFotDtext = false;
                            break;
                    }
                    break;
                case 'OC':
                    var colorCode  = this.hiddenWindow.obtainEscapeParamString(textState);
                    var colorIndex = Number(colorCode);
                    if (!isNaN(colorIndex)) {
                        bitmap.outlineColor = this.hiddenWindow.textColor(colorIndex);
                    } else {
                        bitmap.outlineColor = colorCode;
                    }
                    break;
                case 'OW':
                    bitmap.outlineWidth = this.hiddenWindow.obtainEscapeParam(textState);
                    break;
            }
        } else if (textState.text[textState.index] === '\n') {
            this._processNewLine(textState, bitmap);
        } else {
            var c = textState.text[textState.index++];
            var w = this.hiddenWindow.textWidth(c);

            bitmap.fontSize = this.hiddenWindow.contents.fontSize;
            bitmap.drawText(c, textState.x, textState.y, w * 2, textState.height, 'left');
            textState.x += w;
        }
    };

    Sprite_Picture.prototype._processNewLine = function(textState, bitmap) {
        if (bitmap instanceof Bitmap_Virtual)
            this.textWidths[textState.line] = textState.x;
        this.hiddenWindow.processNewLine(textState);
        textState.line++;
        if (bitmap instanceof Bitmap)
            textState.x = (bitmap.width - this.textWidths[textState.line]) / 2 * this.dTextInfo.align;
    };

    Sprite_Picture.prototype._processDrawIcon = function(iconIndex, textState, bitmap) {
        var iconBitmap = ImageManager.loadSystem('IconSet');
        var pw         = Window_Base._iconWidth;
        var ph         = Window_Base._iconHeight;
        var sx         = iconIndex % 16 * pw;
        var sy         = Math.floor(iconIndex / 16) * ph;
        bitmap.blt(iconBitmap, sx, sy, pw, ph, textState.x + 2, textState.y + (textState.height - ph) / 2);
        textState.x += Window_Base._iconWidth + 4;
    };

    //=============================================================================
    // Bitmap_Virtual
    //  サイズを計算するための仮想ビットマップクラス
    //=============================================================================
    function Bitmap_Virtual() {
        this.initialize.apply(this, arguments);
    }

    Bitmap_Virtual.prototype.initialize = function() {
        this.window = SceneManager.getHiddenWindow();
        this.width  = 0;
        this.height = 0;
    };

    Bitmap_Virtual.prototype.drawText = function(text, x, y) {
        var baseWidth = this.window.textWidth(text);
        var fontSize  = this.window.contents.fontSize;
        if (this.fontItalic) {
            baseWidth += Math.floor(fontSize / 6);
        }
        if (this.fontBoldFotDtext) {
            baseWidth += 2;
        }
        this.width  = Math.max(x + baseWidth, this.width);
        this.height = Math.max(y + fontSize + 8, this.height);
    };

    Bitmap_Virtual.prototype.blt = function(source, sx, sy, sw, sh, dx, dy, dw, dh) {
        this.width  = Math.max(dx + (dw || sw), this.width);
        this.height = Math.max(dy + (dh || sh), this.height);
    };

    //=============================================================================
    // Window_BackFrame
    //  バックフレームウィンドウ
    //=============================================================================
    function Window_BackFrame() {
        this.initialize.apply(this, arguments);
    }

    Window_BackFrame.prototype.backOpacity = null;

    Window_BackFrame.prototype             = Object.create(Window_Base.prototype);
    Window_BackFrame.prototype.constructor = Window_BackFrame;

    Window_BackFrame.prototype.standardPadding = function() {
        return param.frameWindowPadding;
    };


    //=============================================================================
    // Window_Hidden
    //  文字描画用の隠しウィンドウ
    //=============================================================================
    function Window_Hidden() {
        this.initialize.apply(this, arguments);
    }

    Window_Hidden.prototype.backOpacity = null;

    Window_Hidden.prototype             = Object.create(Window_Base.prototype);
    Window_Hidden.prototype.constructor = Window_Hidden;

    Window_Hidden.prototype._createAllParts = function() {
        this._windowBackSprite      = {};
        this._windowSpriteContainer = {};
        this._windowContentsSprite  = new Sprite();
        this.addChild(this._windowContentsSprite);
    };

    Window_Hidden.prototype._refreshAllParts = function() {};

    Window_Hidden.prototype._refreshBack = function() {};

    Window_Hidden.prototype._refreshFrame = function() {};

    Window_Hidden.prototype._refreshCursor = function() {};

    Window_Hidden.prototype._refreshArrows = function() {};

    Window_Hidden.prototype._refreshPauseSign = function() {};

    Window_Hidden.prototype.updateTransform = function() {};

    Window_Hidden.prototype.resetFontSettings = function(dTextInfo) {
        if (dTextInfo) {
            var customFont         = dTextInfo.font ? dTextInfo.font + ',' : '';
            this.contents.fontFace = customFont + this.standardFontFace();
            this.contents.fontSize = dTextInfo.size || this.standardFontSize();
        } else {
            Window_Base.prototype.resetFontSettings.apply(this, arguments);
        }
    };

    Window_Hidden.prototype.obtainEscapeParamString = function(textState) {
        var arr = /^\[.+?]/.exec(textState.text.slice(textState.index));
        if (arr) {
            textState.index += arr[0].length;
            return arr[0].substring(1, arr[0].length - 1);
        } else {
            return '';
        }
    };

    var _Window_Hidden_calcTextHeight = Window_Hidden.prototype.calcTextHeight;
    Window_Hidden.prototype.calcTextHeight = function(textState, all) {
        var result = _Window_Hidden_calcTextHeight.apply(this, arguments);
        if (param.lineSpacingVariableId) {
            result += $gameVariables.value(param.lineSpacingVariableId);
        }
        return result;
    };

    //=============================================================================
    // Bitmap
    //  太字対応
    //=============================================================================
    var _Bitmap__makeFontNameText      = Bitmap.prototype._makeFontNameText;
    Bitmap.prototype._makeFontNameText = function() {
        return (this.fontBoldFotDtext ? 'bold ' : '') + _Bitmap__makeFontNameText.apply(this, arguments);
    };
})();
