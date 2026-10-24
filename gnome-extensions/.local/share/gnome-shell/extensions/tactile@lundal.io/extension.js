import GLib from "gi://GLib";
import Meta from "gi://Meta";
import Shell from "gi://Shell";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { Area } from "./common/area.js";
import { TileModal } from "./extension/tileModal.js";
import { getActiveWindow, isEntireWorkAreaHeight, isEntireWorkAreaWidth } from "./extension/utils.js";
export default class TactileExtension extends Extension {
    enable() {
        this._sourceIds = [];
        this._settings = this.getSettings();
        this.bindKey("show-tiles", () => this.onShowTiles());
        this.bindKey("show-settings", () => this.openPreferences());
    }
    disable() {
        // In case the extension is disabled while sources are still active
        this.removeSources();
        // In case the extension is disabled while tiles are shown
        this.onHideTiles();
        this.unbindKey("show-tiles");
        this.unbindKey("show-settings");
        this._settings = undefined;
        this._sourceIds = undefined;
    }
    removeSources() {
        this._sourceIds.forEach((sourceId) => GLib.Source.remove(sourceId));
    }
    addSourceToList(sourceId) {
        this._sourceIds.push(sourceId);
    }
    removeSourceFromList(sourceId) {
        this._sourceIds = this._sourceIds.filter((id) => id !== sourceId);
    }
    bindKey(key, callback) {
        Main.wm.addKeybinding(key, this._settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT, Shell.ActionMode.NORMAL, callback);
    }
    unbindKey(key) {
        Main.wm.removeKeybinding(key);
    }
    onShowTiles() {
        if (!this._modal) {
            this.displayTiles();
        }
    }
    onHideTiles() {
        if (this._modal) {
            this.discardTiles();
        }
    }
    displayTiles() {
        this.debug("Display tiles (begin)");
        // Find active window
        const activeWindow = getActiveWindow();
        if (!activeWindow) {
            this.debug("No active window");
            return;
        }
        this.debug("Active window: " + activeWindow.get_title());
        // Needs to be rebound with correct action mode after opening modal
        this.unbindKey("show-tiles");
        // Create modal
        this._modal = new TileModal(this._settings, activeWindow, () => this.onHideTiles(), (window, area) => this.moveWindow(window, area));
        this.debug("Display tiles (finish)");
    }
    discardTiles() {
        this.debug("Discard tiles (begin)");
        this._modal?.destroy();
        this._modal = undefined;
        // Needs to be rebound with correct action mode after closing modal
        this.bindKey("show-tiles", () => this.onShowTiles());
        this.debug("Discard tiles (finish)");
    }
    moveWindow(window, area) {
        this.debug("Target area: " + area.stringify());
        this.debug("Window area: " + Area.fromRectangle(window.get_frame_rect()).stringify());
        // GNOME has its own built-in tiling that is activated when pressing
        // Super+Left/Right. There does not appear to be any way to detect this
        // through the Meta APIs, so we always unmaximize to break the tiling.
        // GNOME 49 changed the maximize/unmaximize API. This uses feature
        // detection to support both the new and the old API. Details in
        // https://gitlab.gnome.org/GNOME/mutter/-/merge_requests/4415
        if (window.get_maximize_flags) {
            if (window.get_maximize_flags()) {
                window.set_unmaximize_flags(Meta.MaximizeFlags.BOTH);
            }
            window.move_resize_frame(true, area.x, area.y, area.width, area.height);
            if (this._settings.get_boolean("maximize")) {
                if (isEntireWorkAreaWidth(area)) {
                    window.set_maximize_flags(Meta.MaximizeFlags.HORIZONTAL);
                }
                else {
                    window.set_unmaximize_flags(Meta.MaximizeFlags.HORIZONTAL);
                }
                if (isEntireWorkAreaHeight(area)) {
                    window.set_maximize_flags(Meta.MaximizeFlags.VERTICAL);
                }
                else {
                    window.set_unmaximize_flags(Meta.MaximizeFlags.VERTICAL);
                }
            }
        }
        else {
            const window_GNOME_48_AND_BELOW = window;
            if (window_GNOME_48_AND_BELOW.get_maximized()) {
                window_GNOME_48_AND_BELOW.unmaximize(Meta.MaximizeFlags.BOTH);
            }
            window_GNOME_48_AND_BELOW.move_resize_frame(true, area.x, area.y, area.width, area.height);
            if (this._settings.get_boolean("maximize")) {
                if (isEntireWorkAreaWidth(area)) {
                    window_GNOME_48_AND_BELOW.maximize(Meta.MaximizeFlags.HORIZONTAL);
                }
                else {
                    window_GNOME_48_AND_BELOW.unmaximize(Meta.MaximizeFlags.HORIZONTAL);
                }
                if (isEntireWorkAreaHeight(area)) {
                    window_GNOME_48_AND_BELOW.maximize(Meta.MaximizeFlags.VERTICAL);
                }
                else {
                    window_GNOME_48_AND_BELOW.unmaximize(Meta.MaximizeFlags.VERTICAL);
                }
            }
        }
        // In some cases move_resize_frame() will only resize the window, and we
        // must call move_frame() to move it. This usually happens when the
        // window's minimum size is larger than the selected area. Movement can
        // also be a bit glitchy on Wayland. We therefore make extra attempts,
        // alternating between move_frame() and move_resize_frame().
        let attempts = 1;
        const sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 20, () => {
            const windowArea = Area.fromRectangle(window.get_frame_rect());
            this.debug(`Window area: ${windowArea.stringify()} (attempt ${attempts})`);
            if (attempts >= 5) {
                this.removeSourceFromList(sourceId);
                return GLib.SOURCE_REMOVE;
            }
            if (!windowArea.isEqual(area)) {
                if (attempts % 2 === 1) {
                    window.move_frame(true, area.x, area.y);
                }
                else {
                    window.move_resize_frame(true, area.x, area.y, area.width, area.height);
                }
            }
            attempts += 1;
            return GLib.SOURCE_CONTINUE;
        });
        this.addSourceToList(sourceId);
    }
    debug(message) {
        if (this._settings.get_boolean("debug")) {
            console.log("Tactile: " + message);
        }
    }
}
