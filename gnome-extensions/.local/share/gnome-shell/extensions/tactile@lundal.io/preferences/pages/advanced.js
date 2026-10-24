import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import Adw from "gi://Adw";
import * as Config from "resource:///org/gnome/Shell/Extensions/js/misc/config.js";
import { createCheckboxInput } from "../inputs/checkbox.js";
import { createColorInput } from "../inputs/color.js";
import { createNumberInput } from "../inputs/number.js";
const TILE_COLORS = [
    { id: "text-color", desc: "Text color" },
    { id: "border-color", desc: "Border color" },
    { id: "background-color", desc: "Background color" },
];
const TILE_SIZES = [
    { id: "text-size", desc: "Text size" },
    { id: "border-size", desc: "Border size" },
    { id: "gap-size", desc: "Gap size" },
];
const GRID_SIZES = [
    { id: "grid-cols", desc: "Columns", min: 1, max: 7 },
    { id: "grid-rows", desc: "Rows", min: 1, max: 5 },
];
export const AdvancedPage = GObject.registerClass(class AdvancedPage extends Adw.PreferencesPage {
    constructor(settings) {
        super({
            title: "Advanced",
            icon_name: "preferences-other-symbolic",
            name: "Advanced",
        });
        const grid = new Gtk.Grid({
            halign: Gtk.Align.CENTER,
            margin_start: 12,
            margin_end: 12,
            margin_top: 12,
            margin_bottom: 12,
            column_spacing: 12,
            row_spacing: 12,
            visible: true,
        });
        const tilesLabel = new Gtk.Label({
            label: "<b>Tile appearance</b>",
            use_markup: true,
            visible: true,
        });
        grid.attach(tilesLabel, 0, 0, 1, 1);
        grid.attach(createTileAppearanceSection(settings), 0, 1, 1, 1);
        const gridLabel = new Gtk.Label({
            label: "<b>Grid size</b>",
            use_markup: true,
            visible: true,
        });
        grid.attach(gridLabel, 0, 2, 1, 1);
        grid.attach(createGridSizeSection(settings), 0, 3, 1, 1);
        const behaviorLabel = new Gtk.Label({
            label: "<b>Behavior</b>",
            use_markup: true,
            visible: true,
        });
        grid.attach(behaviorLabel, 0, 4, 1, 1);
        grid.attach(createBehaviorSection(settings), 0, 5, 1, 1);
        const group = new Adw.PreferencesGroup();
        group.add(grid);
        this.add(group);
        // Adw.PreferencesPage disables horizontal scrolling, but we need it
        // https://gitlab.gnome.org/GNOME/libadwaita/-/blob/main/src/adw-preferences-page.ui
        this.get_first_child().hscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    }
});
function createTileAppearanceSection(settings) {
    const grid = new Gtk.Grid({
        halign: Gtk.Align.CENTER,
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
    });
    TILE_COLORS.forEach((color, index) => {
        const label = new Gtk.Label({
            halign: Gtk.Align.END,
            label: color.desc,
            visible: true,
        });
        grid.attach(label, 0, index, 1, 1);
        const input = createColorInput(settings, color.id);
        grid.attach(input, 1, index, 1, 1);
    });
    TILE_SIZES.forEach((size, index) => {
        const label = new Gtk.Label({
            halign: Gtk.Align.END,
            label: size.desc,
            visible: true,
        });
        grid.attach(label, 2, index, 1, 1);
        const input = createNumberInput(settings, size.id);
        grid.attach(input, 3, index, 1, 1);
    });
    if (getGnomeVersion() >= 47) {
        const accentColorInput = createCheckboxInput(settings, "use-accent-color", "Use system accent color instead of custom colors");
        grid.attach(accentColorInput, 0, 4, 4, 1);
    }
    return grid;
}
function createGridSizeSection(settings) {
    const grid = new Gtk.Grid({
        halign: Gtk.Align.CENTER,
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
    });
    GRID_SIZES.forEach((size, index) => {
        const label = new Gtk.Label({
            halign: Gtk.Align.END,
            label: size.desc,
            visible: true,
        });
        grid.attach(label, 0, index, 1, 1);
        const input = createNumberInput(settings, size.id, size.min, size.max);
        grid.attach(input, 1, index, 1, 1);
    });
    return grid;
}
function createBehaviorSection(settings) {
    const grid = new Gtk.Grid({
        halign: Gtk.Align.CENTER,
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
    });
    const maximizeInput = createCheckboxInput(settings, "maximize", "Maximize window when possible");
    grid.attach(maximizeInput, 0, 0, 1, 1);
    const debugInput = createCheckboxInput(settings, "debug", "Log debug information to journal");
    grid.attach(debugInput, 0, 1, 1, 1);
    return grid;
}
function getGnomeVersion() {
    const [major] = Config.PACKAGE_VERSION.split(".").map((s) => Number(s));
    return major;
}
