import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import Meta from "gi://Meta";
import Shell from "gi://Shell";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Layout } from "../common/layout.js";
import { Styles } from "../common/styles.js";
import { getNumMonitors, getWorkAreaForMonitor } from "./utils.js";
export const TileModal = GObject.registerClass(class TileModal extends St.Widget {
    constructor(settings, window, onHide, onMove) {
        super({
            reactive: true,
            visible: true,
        });
        this._settings = settings;
        this._window = window;
        this._onHide = onHide;
        this._onMove = onMove;
        // Begin with active monitor
        this._monitor = window.get_monitor();
        // No tiles yet
        this._tiles = [];
        // Necessary for Main.pushModal() to work
        Main.layoutManager.uiGroup.add_child(this);
        // Make modal
        this._grab = Main.pushModal(this, { actionMode: Shell.ActionMode.SYSTEM_MODAL });
        // Bind keys
        this.bindKey("show-tiles", () => this._onHide());
        this.bindKey("hide-tiles", () => this._onHide());
        this.bindKey("next-monitor", () => this.onNextMonitor());
        this.bindKey("prev-monitor", () => this.onPrevMonitor());
        this.bindKey("layout-1", () => this.onActivateLayout(1));
        this.bindKey("layout-2", () => this.onActivateLayout(2));
        this.bindKey("layout-3", () => this.onActivateLayout(3));
        this.bindKey("layout-4", () => this.onActivateLayout(4));
        this.createTiles();
    }
    destroy() {
        this.destroyTiles();
        // Unbind keys
        this.unbindKey("layout-4");
        this.unbindKey("layout-3");
        this.unbindKey("layout-2");
        this.unbindKey("layout-1");
        this.unbindKey("prev-monitor");
        this.unbindKey("next-monitor");
        this.unbindKey("hide-tiles");
        this.unbindKey("show-tiles");
        // Unmake modal
        if (this._grab) {
            Main.popModal(this._grab);
            this._grab = undefined;
        }
        super.destroy();
    }
    createTiles() {
        const workarea = getWorkAreaForMonitor(this._monitor);
        const layoutNumber = this.loadMonitorLayout(this._monitor);
        const layout = Layout.fromSettings(this._settings, layoutNumber);
        const styles = Styles.fromSettings(this._settings);
        layout.cols.forEach((col_weight, col) => {
            layout.rows.forEach((row_weight, row) => {
                if (col_weight < 1 || row_weight < 1) {
                    return;
                }
                const name = `tile-${col}-${row}`;
                const text = this._settings.get_strv(name)[0]?.toUpperCase() ?? "";
                const area = workarea.subarea(layout, col, row);
                this.add_child(new Tile(area, text, styles));
                // Bind key
                this.bindKey(name, () => this.onActivateTile(area));
                this._tiles.push(name);
            });
        });
        if (this._tiles.length < 1) {
            const errorStyles = new Styles("rgb(255, 0, 0)", "rgba(255, 128, 128, 0.5)", "rgba(255, 128, 128, 0.1)", styles.textSize, styles.borderSize);
            this.add_child(new Tile(workarea, "Error: No tiles", errorStyles));
        }
    }
    destroyTiles() {
        // Unbind keys
        this._tiles.forEach((name) => this.unbindKey(name));
        this._tiles = [];
        this.destroy_all_children();
    }
    onActivateTile(area) {
        const lastArea = this._lastArea;
        const lastDate = this._lastDate;
        // Assume this is the first tile if more than one second of inactivity
        if (!lastArea || !lastDate || lastDate + 1000 < Date.now()) {
            this._lastArea = area;
            this._lastDate = Date.now();
            return;
        }
        // Once two tiles are activated, move the window and hide the tiles
        this._onMove(this._window, lastArea.combineWith(area));
        this._onHide();
    }
    onNextMonitor() {
        this._monitor = (this._monitor + 1) % getNumMonitors();
        this.destroyTiles();
        this.createTiles();
    }
    onPrevMonitor() {
        this._monitor = (this._monitor - 1 + getNumMonitors()) % getNumMonitors();
        this.destroyTiles();
        this.createTiles();
    }
    onActivateLayout(n) {
        this.saveMonitorLayout(this._monitor, n);
        this.destroyTiles();
        this.createTiles();
    }
    saveMonitorLayout(monitor, layout) {
        this._settings.set_int(`monitor-${monitor}-layout`, layout);
    }
    loadMonitorLayout(monitor) {
        return this._settings.get_int(`monitor-${monitor}-layout`);
    }
    bindKey(name, handler) {
        Main.wm.addKeybinding(name, this._settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT, Shell.ActionMode.SYSTEM_MODAL, handler);
    }
    unbindKey(name) {
        Main.wm.removeKeybinding(name);
    }
});
export const Tile = GObject.registerClass(class Tile extends St.BoxLayout {
    constructor(area, text, styles) {
        super({
            style_class: "tile",
            style: `border-color: ${styles.borderColor};` +
                `background-color: ${styles.backgroundColor};` +
                `border-width: ${styles.borderSize}px;`,
            x: area.x,
            y: area.y,
            width: area.width,
            height: area.height,
            visible: true,
        });
        const label = new St.Label({
            style_class: "name",
            style: `color: ${styles.textColor}; font-size: ${styles.textSize}px;`,
            text: text,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(label);
    }
});
