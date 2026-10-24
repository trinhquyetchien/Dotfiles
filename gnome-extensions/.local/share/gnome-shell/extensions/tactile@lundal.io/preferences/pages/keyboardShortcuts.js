import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import Adw from "gi://Adw";
import { createAcceleratorInput } from "../inputs/accelerator.js";
const GENERAL_SHORTCUTS = [
    { id: "show-tiles", desc: "Show tiles" },
    { id: "hide-tiles", desc: "Hide tiles" },
    { id: "next-monitor", desc: "Move tiles to next monitor" },
    { id: "prev-monitor", desc: "Move tiles to previous monitor" },
    { id: "show-settings", desc: "Open extension settings" },
];
const LAYOUT_SHORTCUTS = [
    { id: "layout-1", desc: "Layout 1" },
    { id: "layout-2", desc: "Layout 2" },
    { id: "layout-3", desc: "Layout 3" },
    { id: "layout-4", desc: "Layout 4" },
];
export const KeyboardShortcutsPage = GObject.registerClass(class KeyboardShortcutsPage extends Adw.PreferencesPage {
    constructor(settings) {
        super({
            title: "Keyboard Shortcuts",
            icon_name: "input-keyboard-symbolic",
            name: "KeyboardShortcuts",
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
        const allTreeViews = [];
        const tileLabel = new Gtk.Label({
            label: "<b>Tile activation keys</b>",
            use_markup: true,
            visible: true,
        });
        grid.attach(tileLabel, 0, 0, 2, 1);
        grid.attach(createTileKeyboardShortcutsSection(settings, allTreeViews), 0, 1, 2, 1);
        // Recreate TileKeyboardShortcutsSection when grid size changes
        function recreateTileKeyboardShortcutsSection() {
            grid.remove(grid.get_child_at(0, 1));
            grid.attach(createTileKeyboardShortcutsSection(settings, allTreeViews), 0, 1, 2, 1);
        }
        settings.connect("changed::grid-cols", recreateTileKeyboardShortcutsSection);
        settings.connect("changed::grid-rows", recreateTileKeyboardShortcutsSection);
        const layoutLabel = new Gtk.Label({
            label: "<b>Layout activation keys</b>",
            use_markup: true,
            visible: true,
        });
        grid.attach(layoutLabel, 0, 2, 1, 1);
        grid.attach(createKeyboardShortcutsSection(settings, LAYOUT_SHORTCUTS, allTreeViews), 0, 3, 1, 1);
        const generalLabel = new Gtk.Label({
            label: "<b>General shortcuts</b>",
            use_markup: true,
            visible: true,
        });
        grid.attach(generalLabel, 1, 2, 1, 1);
        grid.attach(createKeyboardShortcutsSection(settings, GENERAL_SHORTCUTS, allTreeViews), 1, 3, 1, 1);
        const group = new Adw.PreferencesGroup();
        group.add(grid);
        this.add(group);
        // Adw.PreferencesPage disables horizontal scrolling, but we need it
        // https://gitlab.gnome.org/GNOME/libadwaita/-/blob/main/src/adw-preferences-page.ui
        this.get_first_child().hscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    }
});
function createTileKeyboardShortcutsSection(settings, allTreeViews) {
    const num_cols = settings.get_int("grid-cols");
    const num_rows = settings.get_int("grid-rows");
    const grid = new Gtk.Grid({
        halign: Gtk.Align.CENTER,
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
    });
    // Columns
    for (let col = 0; col < num_cols; col++) {
        const label = new Gtk.Label({
            halign: Gtk.Align.START,
            label: `Column ${col + 1}`,
            visible: true,
        });
        grid.attach(label, col + 1, 0, 1, 1);
    }
    // Rows
    for (let row = 0; row < num_rows; row++) {
        const label = new Gtk.Label({
            halign: Gtk.Align.START,
            label: `Row ${row + 1}`,
            visible: true,
        });
        grid.attach(label, 0, row + 1, 1, 1);
    }
    // Tile hotkeys
    for (let col = 0; col < num_cols; col++) {
        for (let row = 0; row < num_rows; row++) {
            const input = createAcceleratorInput(settings, `tile-${col}-${row}`, allTreeViews);
            grid.attach(input, col + 1, row + 1, 1, 1);
        }
    }
    return grid;
}
function createKeyboardShortcutsSection(settings, shortcuts, allTreeViews) {
    const grid = new Gtk.Grid({
        halign: Gtk.Align.CENTER,
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
    });
    shortcuts.forEach((shortcut, index) => {
        const label = new Gtk.Label({
            halign: Gtk.Align.END,
            label: shortcut.desc,
            visible: true,
        });
        grid.attach(label, 0, index, 1, 1);
        const input = createAcceleratorInput(settings, shortcut.id, allTreeViews);
        grid.attach(input, 1, index, 1, 1);
    });
    return grid;
}
