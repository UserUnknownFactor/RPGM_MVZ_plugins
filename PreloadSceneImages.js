//============================================================================
// PreloadSceneImages.js
//============================================================================
/*:
 * @plugindesc Preloads images for maps and common events, with on-demand common event loading.
 *
 * @param preloadImages
 * @type boolean
 * @on Enable
 * @off Disable
 * @desc Enable or disable image preloading.
 * @default true
 *
 * @param debugMode
 * @type boolean
 * @on Enable
 * @off Disable
 * @desc Enable or disable debug logging to the console.
 * @default false
 *
 * @param batchSize
 * @type number
 * @min 1
 * @desc The number of images to load/unload in each batch.
 * @default 5
 *
 * @param preloadCommonEventsOnDemand
 * @type boolean
 * @on YES
 * @off NO
 * @desc Preload images for common events only when they are called?
 * @default true
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * This plugin preloads images used on maps to minimize lag spikes that can
 * occur when images are loaded on demand. It intelligently manages a resource
 * cache, loading only images that are not already loaded and unloading images
 * that are no longer needed by the current map.  Crucially, it *shares* resources
 * between maps, so if two maps use the same image, it will only be loaded once.
 *
 * ============================================================================
 * How It Works (Updated for On-Demand Common Event Loading)
 * ============================================================================
 *
 * 1. **Resource Extraction:** When a map is loaded, the plugin scans the map
 *	data (events, tilesets, parallax, etc.) to identify all image files
 *	that are used.
 *
 * 2. **Resource Extraction (Common Events - On Demand):** If
 *	`preloadCommonEventsOnDemand` is enabled, the plugin *does not* preload
 *	Common Event images at the start of the game.  Instead, it hooks into
 *	the `Game_Interpreter.prototype.setup` function.  Whenever a Common
 *	Event is called, the plugin extracts the image paths *from that specific
 *	Common Event* and preloads them *before* the Common Event's commands
 *	are executed.
 *
 * 3. **Unloading (Maps Only):**  Unloads map resources. Common Event
 *	resources are *never* unloaded.
 *
 * 4. **Preloading:** The plugin then loads any images needed by the new map
 *	or the called *	Common Event (if not already cached) that are *not* 
 *	already in the resource cache.  It loads images in batches
 *	(controlled by the `batchSize` parameter) to avoid freezing game.
 *
 * 5. **Caching:** Loaded images are stored in a cache.
 *
 * 5. **Scene Termination:** When the map scene is terminated (e.g., when the
 *	player opens the menu or the game ends), the plugin *does not* unload
 *	the cached resources. This allows for efficient reuse if the player
 *	returns to a previously visited map.
 *
 * ============================================================================
 * Parameters
 * ============================================================================
 *
 * * **preloadImages:**  Enables or disables the entire preloading system.
 *   Set to `true` to enable preloading, `false` to disable it.
 *
 * * **debugMode:**  Enables or disables debug logging to the console.  When
 *   enabled, the plugin will print messages about which images are being
 *   loaded and unloaded.  This is useful for troubleshooting.  Set to `true`
 *   to enable debug logging, `false` to disable it.
 *
 * * **batchSize:**  Controls the number of images that are loaded or unloaded
 *   in each "batch".  A smaller batch size can help reduce stuttering during
 *   map transitions, but may increase the overall loading time.  A larger
 *   batch size can be faster, but may cause noticeable pauses.  Experiment
 *   with different values to find the best balance for your game.
 *
 * ============================================================================
 * Compatibility
 * ============================================================================
 *
 * This plugin should be compatible with most other plugins.  It modifies
 * core functions related to map loading and scene termination, but it does
 * so in a way that should not conflict with other plugins.  If you encounter
 * any compatibility issues, please report them.
 * This plugin should work with both RPG Maker MV and MZ.
 *
 * ============================================================================
 * Terms of Use
 * ============================================================================
 *
 * Free to use and modify for commercial and non-commercial projects.
 * Credit is appreciated but not required.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.0.0: Initial release.
 *
 */


(function() {
const PLUGIN_NAME = 'PreloadSceneImages';

const fs = require('fs');
const getBoolean = (str, def) => (!!str ? !!str.match(/(?:true|on|y(?:es)?)/i) : !!def);

const isMZ = Utils.RPGMAKER_NAME === "MZ";
const MAX_ST_IMAGES_IN_CACHE = 200;
const MAX_TRACKED_MAPS = 3; // Number of maps to retain resources for

const parameters = PluginManager.parameters(PLUGIN_NAME);
const preloadImages = getBoolean(parameters['preloadImages'], true);
const checkScripts = getBoolean(parameters['checkScripts'], false);
const debugMode = getBoolean(parameters['debugMode'], false);
const loadBatchSIze = parseInt(parameters['loadBatchSize']) || 5;
const unloadBatchSize = parseInt(parameters['unloadBatchSize']) || 10;
const preloadCEOnDemand = getBoolean(parameters['preloadCommonEventsOnDemand'], true);

var _previousMapId = -1;
var _isPreloading = false;
var _loadedResourcesForMap = new Set();
var _requestedFiles= {};
var _loadedCommonEvents = new Map();
var _recentMapsWithResources = []; // Queue to track recent maps and their resources

function log(message) {
	if (debugMode) console.log(`[${PLUGIN_NAME}] ${message}`);
}

function fileExists(path) {
	try { return fs.existsSync(path); } catch (e) { return false; }
}

function findExistingFile(basePath, extensions) {
	for (const ext of extensions) {
		const filePath = `${isMZ ? '' : 'www/'}${basePath}.${ext}`;
		if (typeof _requestedFiles[basePath] === "boolean") return _requestedFiles[basePath] ? basePath : null;
		if (fileExists(filePath)) { _requestedFiles[basePath] = true; return basePath; }
	}
	_requestedFiles[basePath] = false;
	return null;
}

function isInCache(resourcePath) {
	if (isMZ) return ImageManager._cache[resourcePath]
	let key = ImageManager._generateCacheKey(resourcePath, 0);
	return ImageManager._imageCache._items[key];
}

function deleteFromCache(resourcePath) {
	if (!isMZ) {
		resourcePath = withExtension(resourcePath)
		let key = ImageManager._generateCacheKey(resourcePath, 0);
		let item = ImageManager._imageCache._items[key];
		if (!item) return false;
		/*
		if (item.bitmap) {
			if (item.bitmap.destroy) {
				item.bitmap.destroy();
			} else {
				if (item.bitmap._baseTexture) item.bitmap._baseTexture.destroy();
				if (item.bitmap.__baseTexture) item.bitmap.__baseTexture.destroy(); // for the older version
			}
		}
		*/
		delete ImageManager._imageCache._items[key];
	} else {
		let item = ImageManager._cache[resourcePath];
		if (!item) return false;
		else {
			item.destroy();
			delete ImageManager._cache[resourcePath];
		}
	}
	return true;
}

// Patch to prevent unload on scene change in MZ (unused in MV)
ImageManager.clear = function() {};

if (SceneManager.onUnload) {
	const _SceneManager_onUnload = SceneManager.onUnload;
	SceneManager.onUnload = function() {
		_SceneManager_onUnload.call(this);
		const cache = ImageManager._cache;
		for (const url in cache) {
			cache[url].destroy();
		}
		ImageManager._cache = {};
	};
}

// Patch to prevent the silly timed truncation unload on adding images in MV
if (ImageCache.limit)
	ImageCache.limit = MAX_ST_IMAGES_IN_CACHE * 1280 * 1024;

// Patch to prevent overriding reservations in MV
if (typeof ImageCache !== "undefined" && ImageCache.prototype.reserve)
	ImageCache.prototype.reserve = function(key, value, reservationId){
		if(!this._items[key])
			this._items[key] = { bitmap: value, touch: Date.now(), key: key };
		if (this._items[key].reservationId >= 0)
			this._items[key].reservationId = reservationId;
	};

function withExtension(resourcePath) {
	return resourcePath + ".png";
}

function addToCache(resourcePath) {
	resourcePath = withExtension(resourcePath)
	if (isMZ) {
		if (!ImageManager._cache[resourcePath])
			ImageManager._cache[resourcePath] = Bitmap.load(encodeURIComponent(resourcePath).replace(/%2F/g, '/'));
		return ImageManager._cache[resourcePath];
	}
	else {
		let key = ImageManager._generateCacheKey(resourcePath, 0);
		let bitmap = ImageManager._imageCache.get(key);
		if (!bitmap) {
			bitmap = Bitmap.load(resourcePath);
			bitmap._smooth = true;
			//bitmap.addLoadListener(() => bitmap.rotateHue(hue)); // no need to
			if(!ImageManager._imageCache._items[key]) {
				ImageManager._imageCache._items[key] = 
					{ bitmap: bitmap, touch: Date.now(), key: key, reservationId: -1 };
			} else
				ImageManager._imageCache._items[key].bitmap = bitmap;
		}
		return bitmap;
	}
};

function preloadCommonEvent(commonEventId, preloadImages) {
	if (commonEventId !== -1 && !_loadedCommonEvents.has(commonEventId)) {
		const commonEvent = $dataCommonEvents[commonEventId];
		if (commonEvent) {
			const commonEventResources = extractImagePathsFromCommands(commonEvent.list);
			if (!commonEventResources.size) return;
			if (!preloadImages) {
				_loadedCommonEvents.set(commonEventId, new Set(commonEventResources));
				return;
			}
			_isPreloading = true;
			if (commonEventResources.size)
				preloadResourceBatch(Array.from(commonEventResources), 0, new Set(), true, () => {
					_loadedCommonEvents.set(commonEventId, new Set(commonEventResources));
					_isPreloading = false;
					log(`Finished preloading ${commonEventResources.size} Common Event resources`);
				});
		}
	}
}

function extractImagePathsFromCommands(commandList, extractedPaths) {
	if (!extractedPaths) extractedPaths = new Set();
	const resourcePaths = new Set();
	const imageExtensions = isMZ ? ['png_', 'png'] : ['rpgmvp', 'png'];

	if (!commandList) return resourcePaths;

	for (const command of commandList) {
		if (!command) continue;
		let cmp = command.parameters;
		switch (command.code) {
			case 101: // Show Text
				if (cmp && Array.isArray(cmp) && cmp.length > 0) {
					const facePath = findExistingFile(`img/faces/${cmp[0]}`, imageExtensions);
					if (facePath) resourcePaths.add(facePath);
				}
				break;
			case 231: // Show Picture
			case 232: // Move Picture
				if (cmp && Array.isArray(cmp) && cmp.length > 1) {
					const picPath = findExistingFile(`img/pictures/${cmp[1]}`, imageExtensions);
					if (picPath) resourcePaths.add(picPath);
				}
				break;
			case 285: // Get Location Info (MZ)
				break; // TODO: needed?
				if (isMZ && cmp && Array.isArray(cmp) && cmp.length > 4) {
					const tileId = $gameMap.tileId(cmp[2], cmp[3], cmp[4]);
					const tileset = $dataTilesets[$gameMap.tilesetId()];
					if (tileset) {
						const tilesetName = tileset.tilesetNames[Math.floor(tileId / 256)];
						if (tilesetName) {
							const tilesetPath = findExistingFile(`img/tilesets/${tilesetName}`, imageExtensions);
							if (tilesetPath) resourcePaths.add(tilesetPath);
						}
					}
				}
				break;
			case 201: // Transfer Player
				break; // TODO: needed?
				if (cmp && Array.isArray(cmp) && cmp.length > 1 && cmp[0] === 0) {
					const mapId = cmp[1];
					 if ($dataMapInfos[mapId]) {
						const mapName = `Map${mapId.padZero(3)}`;
						DataManager.loadDataFile(`$data${mapName}`, `${mapName}.json`);

						const _onLoad = Scene_Boot.prototype.onDatabaseLoaded;
						Scene_Boot.prototype.onDatabaseLoaded = function() {
							if (_onLoad) _onLoad.call(this);
							if (window[`$data${mapName}`]) {
								const parallaxPath = findExistingFile(`img/parallaxes/${window[`$data${mapName}`].parallaxName}`, imageExtensions);
								if (parallaxPath) resourcePaths.add(parallaxPath);
								Scene_Boot.prototype.onDatabaseLoaded = _onLoad;
							}
						};
					 }
				}
				break;
			case 355: // Script
			case 356: // Plugin Command (MZ)
			case 655: // Script (continued)
				if (checkScripts && cmp && Array.isArray(cmp) && cmp.length > 0) {
					const script = cmp[0];
					const imageMatches = script.match(/(?:ImageManager\.loadBitmap|ImageManager\.loadSystem)\s*\(\s*['"`]([^'"`]+)['"`]/g);
					if (imageMatches) {
						imageMatches.forEach(match => {
							const pathMatch = match.match(/['"`]([^'"`]+)['"`]/);
							if (pathMatch) {
								const imagePath = findExistingFile(pathMatch[1], imageExtensions);
								if (imagePath) resourcePaths.add(imagePath);
							}
						});
					}
				}
				break;
			case 117: // Call Common Event
				break; // ALT: This is needed only when we load all CE images on map load 
				if (cmp && Array.isArray(cmp) && cmp.length > 0) {
					const calledCommonEventId = cmp[0];
					if(!extractedPaths.has(calledCommonEventId))
					{
						extractedPaths.add(calledCommonEventId);
						const commonEvent = $dataCommonEvents[calledCommonEventId];
						if(commonEvent)
						{
							const nestedPaths = extractImagePathsFromCommands(commonEvent.list, extractedPaths);
							nestedPaths.forEach(p => resourcePaths.add(p));
						}
					}
				}
				break;
			case 111: // Conditional Branch
				if (cmp && Array.isArray(cmp)) {
					// Check "If" branch
					if (cmp.length > 5 && Array.isArray(cmp[5])) {
						const ifBranchPaths = extractImagePathsFromCommands(cmp[5], extractedPaths);
						ifBranchPaths.forEach(path => resourcePaths.add(path));
					}
					// Check "Else" branch
					if (cmp.length > 6 && Array.isArray(cmp[6])) {
						const elseBranchPaths = extractImagePathsFromCommands(cmp[6], extractedPaths);
						elseBranchPaths.forEach(path => resourcePaths.add(path));
					}
				}
				break;
			case 102: // Show Choices
				if (cmp && Array.isArray(cmp) && cmp.length > 0) {
					if (cmp.length > 5 && Array.isArray(cmp[5])) {
						for(let i = 0; i < cmp[0].length; i++)
						{
							const choiceCommands = cmp[5][i];
							if(choiceCommands && Array.isArray(choiceCommands))
							{
								const choicePaths = extractImagePathsFromCommands(choiceCommands, extractedPaths);
								choicePaths.forEach(p => resourcePaths.add(p));
							}
						}
					}
				}
				break;
			case 301: //If player is in battle
				if(cmp && Array.isArray(cmp) && cmp.length > 1 && cmp[0] === 0)
				{
					const troopId = cmp[1];
					const troop = $dataTroops[troopId];
					if (!troop) break;
					for(let member of troop.members)
					{
						if(member && member.enemyId)
						{
							const enemy = $dataEnemies[member.enemyId];
							if(enemy && enemy.battlerName)
							{
								const enemyPath = findExistingFile(`img/enemies/${enemy.battlerName}`, imageExtensions);
								if(enemyPath) resourcePaths.add(enemyPath);
								const enemyPathSV = findExistingFile(`img/sv_enemies/${enemy.battlerName}`, imageExtensions);
								if(enemyPathSV) resourcePaths.add(enemyPathSV);
							}
						}
					}
				}
				break;
			case 122: // Control Variables
				break; // TODO: needed?
				if (cmp && Array.isArray(cmp)) {
					// Check for getting tile IDs
					if (cmp.length > 4 && cmp[4] === 7) {  // Operand is Game Data
						if (cmp.length > 5 && Array.isArray(cmp[5])) {
							const gameData = cmp[5];
							if (gameData && Array.isArray(gameData) && gameData.length > 4 && gameData[0] === 13) { // Tile ID
								const tileset = $dataTilesets[$gameMap.tilesetId()];
								if (tileset) {
									const tilesetName = tileset.tilesetNames[Math.floor(gameData[4] / 256)];
									 if (tilesetName) {
										const tilesetPath = findExistingFile(`img/tilesets/${tilesetName}`, imageExtensions);
										if(tilesetPath) resourcePaths.add(tilesetPath);
									}
								}
							}
						}
					}
				}
				break;
			 case 205: // Set Movement Route
				if (cmp && Array.isArray(cmp) && cmp.length > 1) {
					if (Array.isArray(cmp[1].list)) { // Check if the movement list exists
						for (const move of cmp[1].list) {
							let mcp = move.parameters;
							if (move.code === 41 && mcp && Array.isArray(mcp) && mcp.length > 0) { // Change Image
								const charPath = findExistingFile(`img/characters/${mcp[0]}`, imageExtensions);
								if (charPath) resourcePaths.add(charPath);
							}
						}
					}
				}
				break;
			case 216: // Change Player Followers
			case 217: // Gather Followers
				// Potentially loads character images, but those should be loaded by the map already
				break;
			default:
				break;
		}
	}
	return resourcePaths;
}

function extractImagePaths(mapData) {
	if (!mapData || !mapData.events) return [];

	const resourcePaths = new Set();
	const imageExtensions = isMZ ? ['png_', 'png'] : ['rpgmvp', 'png'];

	for (const event of mapData.events) {
		if (!event) continue;
		if (event.pages) {
			for (const page of event.pages) {
				if (page && page.list) {
					const commandPaths = extractImagePathsFromCommands(page.list);
					commandPaths.forEach(path => resourcePaths.add(path));
				}
			}
		}
		if (event.note) {
			const match = event.note.match(/<characterImage:(.*?)>/);
			if (match) {
				const charPath = findExistingFile(`img/characters/${match[1].trim()}`, imageExtensions);
				if (charPath) resourcePaths.add(charPath);
			}
		}
	}

	if (mapData.parallaxName) {
		const parallaxPath = findExistingFile(`img/parallaxes/${mapData.parallaxName}`, imageExtensions);
		if (parallaxPath) resourcePaths.add(parallaxPath);
	}

	if (mapData.tilesetId) {
		const tileset = $dataTilesets[mapData.tilesetId];
		if (tileset && tileset.tilesetNames) {
			for (const tilesetName of tileset.tilesetNames) {
				if (tilesetName) {
					const tilesetPath = findExistingFile(`img/tilesets/${tilesetName}`, imageExtensions);
					if (tilesetPath) resourcePaths.add(tilesetPath);
				}
			}
		}
	}

	return Array.from(resourcePaths);
}

//Hook into the scene loading to preload battle events
const _Scene_Boot_start = Scene_Boot.prototype.start;
Scene_Boot.prototype.start = function() {
	_Scene_Boot_start.call(this);
	this.onDatabaseLoaded();
}

Scene_Boot.prototype.onDatabaseLoaded = function() {
	if (!$dataTroops) return; // Ensure troops data is loaded.
	// --- Battle Event Preloading ---
	for (const troop of $dataTroops) {
		if (!troop) continue;
		for (const page of troop.pages)
			if (page && page.list)
				extractImagePathsFromCommands(page.list);
	}
}

function preloadResource(resourcePath, isCommonEvent, onResourceLoaded) {
	const bitmap = addToCache(resourcePath);
	if (!bitmap.isReady() && bitmap.decode) bitmap.decode();
	if (bitmap.isReady()) { // Check if it's already loaded
		// Add to map resources only if it's NOT a common event
		if (!isCommonEvent) {
			if (!_loadedResourcesForMap[$gameMap.mapId()])
				_loadedResourcesForMap[$gameMap.mapId()] = new Set();
			_loadedResourcesForMap[$gameMap.mapId()].add(resourcePath);
		}
		log(`${isCommonEvent ? 'Common Event image' : 'Image'} is already loaded: ${resourcePath}`);
		onResourceLoaded();
	} else {
		bitmap.addLoadListener(() => { // Asynchronous loading.
			if (!isCommonEvent) {
				if (!_loadedResourcesForMap[$gameMap.mapId()])
					_loadedResourcesForMap[$gameMap.mapId()] = new Set();
				_loadedResourcesForMap[$gameMap.mapId()].add(resourcePath);
			}
			log(`Preloaded${isCommonEvent ? ' Common Event' : ''} image: ${resourcePath}`);
			onResourceLoaded();
		});
		const errorHandler = function (error) {
			console.error(`Failed to preload image: ${resourcePath}\n`, error);
			onResourceLoaded();
		};
		if (isMZ) bitmap._onError = errorHandler; else bitmap.onError = errorHandler;
	}
}

 function preloadResourceBatch(newResourcePaths, startIndex, previousMapResources, isCommonEvent, onComplete) {
	if (startIndex >= newResourcePaths.length) {
		_isPreloading = false;
		if (onComplete) onComplete();
		return;
	}

	const endIndex = Math.min(startIndex + loadBatchSIze, newResourcePaths.length);
	let loadedCount = 0;
	function onResourceLoaded() {
		loadedCount++;
		if (loadedCount === endIndex - startIndex) {
			setTimeout(() => { 
			 preloadResourceBatch(newResourcePaths, endIndex, previousMapResources, isCommonEvent, onComplete); 
			}, 0);
		}
	}
	for (let i = startIndex; i < endIndex; i++) {
		const resourcePath = newResourcePaths[i];
		// Only check the cache for common events.  Map resources also check previousMapResources.
		if (isInCache(resourcePath) && isCommonEvent) {
			log(`Resource already cached (Common Event): ${resourcePath}`);
			onResourceLoaded();
			continue;
		}
		if (isInCache(resourcePath) || (!isCommonEvent && previousMapResources.has(resourcePath))) {
			log(`Resource already cached or present in previous map: ${resourcePath}`);
			if (!isCommonEvent) {
				if (!_loadedResourcesForMap[$gameMap.mapId()])
					_loadedResourcesForMap[$gameMap.mapId()] = new Set();
				// Still add to the map resources, so it knows it can be used.
				_loadedResourcesForMap[$gameMap.mapId()].add(resourcePath);
			}
			onResourceLoaded();
			continue;
		}
		preloadResource(resourcePath, isCommonEvent, onResourceLoaded);
	}
}

function unloadCommonEvent(commonEventId) {
	if (_loadedCommonEvents.has(commonEventId)) {
		const resources = _loadedCommonEvents.get(commonEventId);
		resources.forEach(resource => {
			if (deleteFromCache(resource))
				log(`Unloaded resource (Common Event: ${commonEventId}): ${resource}`);
		});
		_loadedCommonEvents.delete(commonEventId);
	}
}

function trackMapResources(mapId, resourcePaths) {
	const existingIndex = _recentMapsWithResources.findIndex((map) => map.mapId === mapId);
	if (existingIndex !== -1)
		_recentMapsWithResources.splice(existingIndex, 1);
	_recentMapsWithResources.push({ mapId, resources: new Set(resourcePaths) });
	if (_recentMapsWithResources.length > MAX_TRACKED_MAPS) {
		const removedMap = _recentMapsWithResources.shift();
		log(`Removed map ${removedMap.mapId} from tracking`);
	}
}

function unloadUnusedResources(previousMapId, nextMapResources, onComplete) {
	// If `previousMapId` has no loaded resources, simply call onComplete and return
	if (!_loadedResourcesForMap[previousMapId]) {
		if (onComplete) onComplete();
		return;
	}

	// Combine the resource sets of the most recent tracked maps into a single set
	const recentResourcesSet = new Set();
	_recentMapsWithResources.forEach((map) => {
		map.resources.forEach((resource) => recentResourcesSet.add(resource));
	});

	const resourcesToUnload = Array.from(_loadedResourcesForMap[previousMapId]).filter(
		(resource) => !recentResourcesSet.has(resource)
	);

	if (resourcesToUnload.length === 0) {
		if (onComplete) onComplete();
		return;
	}

	let currentIndex = 0;
	function unloadBatch() {
		const endIndex = Math.min(currentIndex + unloadBatchSize, resourcesToUnload.length);
		for (let i = currentIndex; i < endIndex; i++) {
			if (deleteFromCache(resourcesToUnload[i])) {
				log(`Unloaded resource: ${resourcesToUnload[i]}`);
			}
		}
		currentIndex = endIndex;

		// If all resources have been unloaded, clean up and call onComplete
		if (currentIndex >= resourcesToUnload.length) {
			resourcesToUnload.forEach((resource) => {
				_loadedResourcesForMap[previousMapId].delete(resource);
			});

			if (_loadedResourcesForMap[previousMapId].size === 0)
				delete _loadedResourcesForMap[previousMapId];

			log(`Completed unloading unused resources for map ${previousMapId}`);
			if (onComplete) onComplete();
		} else {
			setTimeout(unloadBatch, 0); // Asynchronous unloading
		}
	}
	unloadBatch();
}

// Extend Scene_Map.prototype.onMapLoaded to use recent maps queue
const _Scene_Map_onMapLoaded = Scene_Map.prototype.onMapLoaded;
Scene_Map.prototype.onMapLoaded = function () {
	_Scene_Map_onMapLoaded.call(this);

	if (!preloadImages) return;

	const mapId = $gameMap.mapId();
	if (mapId === _previousMapId || _isPreloading) return;

	log(`Map loaded: ${mapId}`);

	const mapData = $dataMap;
	const newResourcePaths = extractImagePaths(mapData);
	trackMapResources(mapId, newResourcePaths);

	log(`Resources to preload: ${newResourcePaths.join(', ')}`);

	// Unload unused resources based on the recent maps queue
	unloadUnusedResources(_previousMapId, newResourcePaths, () => {
		_isPreloading = true;
		setTimeout(() => {
			preloadResourceBatch(newResourcePaths, 0, new Set(), false, 
			() => { 
				_previousMapId = mapId; 
				_isPreloading = false; 
				log(`Finished preloading resources`);
			});
		}, 0);
	});
};

const _Scene_Map_terminate = Scene_Map.prototype.terminate;
Scene_Map.prototype.terminate = function() {
	_Scene_Map_terminate.call(this);
	_isPreloading = false;
	log(`Map scene ${$gameMap.mapId()} terminated; resources are KEPT in cache`);
};


// Alias the initialize method to track Common Event ID
const _Game_Interpreter_initialize = Game_Interpreter.prototype.initialize;
Game_Interpreter.prototype.initialize = function(depth) {
	_Game_Interpreter_initialize.call(this, depth);
	this._commonEventId = -1;
};

Game_Interpreter.prototype.isParallelCommonEvent = function() {
	const commonEvent = $dataCommonEvents[this._commonEventId];
	return commonEvent && commonEvent.trigger === 2;
};

// Add a method to check if this is a Common Event
Game_Interpreter.prototype.isCommonEvent = function() {
	return this._commonEventId > -1;
};

const _Game_Interpreter_update = Game_Interpreter.prototype.update;
Game_Interpreter.prototype.update = function() {
	_Game_Interpreter_update.call(this);
	let ce = !!this.isCommonEvent();
	if (ce && this.isParallelCommonEvent()) return;
	if (ce && !this.isRunning()) { // finished
		unloadCommonEvent(this._commonEventId);
		this._commonEventId = -1;
	}
};

// Alias the setupChild method to pass the Common Event ID
_Game_Interpreter_command117 = Game_Interpreter.prototype.command117;
Game_Interpreter.prototype.command117 = function() {
	let ret = _Game_Interpreter_command117.apply(this, arguments);
	let commonEventId = typeof this._params[0] === "number" ? this._params[0] : -1;
	this._commonEventId = commonEventId;
	this._childInterpreter._commonEventId = commonEventId;
	preloadCommonEvent(commonEventId, preloadCEOnDemand);
	return ret;
};

})();