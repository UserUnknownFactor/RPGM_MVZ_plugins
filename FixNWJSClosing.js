const SceneBootStart_default = Scene_Boot.prototype.start;
Scene_Boot.prototype.start = function () {
	if (typeof nw === "object") {
		nw.Window.get().on("close", () => nw.App.quit());
	}
	SceneBootStart_default.call(this);
};

