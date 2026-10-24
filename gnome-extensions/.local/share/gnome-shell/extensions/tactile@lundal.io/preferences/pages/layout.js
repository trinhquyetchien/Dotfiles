import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import Adw from "gi://Adw";
import { Area } from "../../common/area.js";
import { Layout } from "../../common/layout.js";
import { sumAll } from "../../common/arrays.js";
import { createNumberInput } from "../inputs/number.js";
export const LayoutPage = GObject.registerClass(class LayoutPage extends Adw.PreferencesPage {
    constructor(settings, n) {
        super({
            title: `Layout ${n}`,
            icon_name: "preferences-desktop-display-symbolic",
            name: `LayoutPage${n}`,
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
        const weightsLabel = new Gtk.Label({
            label: "<b>Column/row weights</b>",
            use_markup: true,
            visible: true,
        });
        grid.attach(weightsLabel, 0, 0, 1, 1);
        grid.attach(createWeightsSection(settings, n), 0, 1, 1, 1);
        // Recreate WeightsSection when grid size changes
        function recreateWeightsSection() {
            grid.remove(grid.get_child_at(0, 1));
            grid.attach(createWeightsSection(settings, n), 0, 1, 1, 1);
        }
        settings.connect("changed::grid-cols", recreateWeightsSection);
        settings.connect("changed::grid-rows", recreateWeightsSection);
        const weightsFootnote = new Gtk.Label({
            label: "Tip: Set weight to 0 to remove any column/row from this layout",
            visible: true,
        });
        grid.attach(weightsFootnote, 0, 2, 1, 1);
        const group = new Adw.PreferencesGroup();
        group.add(grid);
        this.add(group);
        // Adw.PreferencesPage disables horizontal scrolling, but we need it
        // https://gitlab.gnome.org/GNOME/libadwaita/-/blob/main/src/adw-preferences-page.ui
        this.get_first_child().hscrollbar_policy = Gtk.PolicyType.AUTOMATIC;
    }
});
function createWeightsSection(settings, n) {
    const num_cols = settings.get_int("grid-cols");
    const num_rows = settings.get_int("grid-rows");
    const grid = new Gtk.Grid({
        halign: Gtk.Align.CENTER,
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
    });
    const prefix = Layout.prefix(n);
    // Column weights
    for (let col = 0; col < num_cols; col++) {
        const input = createNumberInput(settings, `${prefix}col-${col}`);
        grid.attach(input, col + 1, 0, 1, 1);
    }
    // Row weights
    for (let row = 0; row < num_rows; row++) {
        const input = createNumberInput(settings, `${prefix}row-${row}`);
        grid.attach(input, 0, row + 1, 1, 1);
    }
    // Preview
    const preview = createPreviewWidget(settings, n);
    grid.attach(preview, 1, 1, num_cols, num_rows);
    return grid;
}
function createPreviewWidget(settings, n) {
    const grid = new Gtk.Grid({
        column_homogeneous: true,
        row_homogeneous: true,
        visible: true,
    });
    let tiles = [];
    function discardTiles() {
        tiles.forEach((tile) => grid.remove(tile));
        tiles = [];
    }
    function createTiles() {
        const layout = Layout.fromSettings(settings, n);
        const tablearea = new Area(0, 0, sumAll(layout.cols), sumAll(layout.rows));
        layout.cols.forEach((col_weight, col) => {
            layout.rows.forEach((row_weight, row) => {
                if (col_weight < 1 || row_weight < 1) {
                    return;
                }
                const id = `tile-${col}-${row}`;
                const name = settings.get_strv(id)[0] || "";
                const area = tablearea.subareaIgnoreGaps(layout, col, row);
                const tile = new Gtk.Label({
                    halign: Gtk.Align.FILL,
                    label: name.toUpperCase(),
                    visible: true,
                });
                tile.get_style_context().add_class("tile");
                grid.attach(tile, area.x, area.y, area.width, area.height);
                tiles.push(tile);
            });
        });
        if (tiles.length < 1) {
            const tile = new Gtk.Label({
                halign: Gtk.Align.FILL,
                label: "Error: No tiles",
                visible: true,
            });
            tile.get_style_context().add_class("error-tile");
            grid.attach(tile, 0, 0, 1, 1);
            tiles.push(tile);
        }
    }
    createTiles();
    settings.connect("changed", () => {
        discardTiles();
        createTiles();
    });
    return grid;
}
