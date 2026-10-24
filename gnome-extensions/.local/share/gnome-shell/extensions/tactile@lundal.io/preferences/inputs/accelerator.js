import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
const COLUMN_KEY = 0;
const COLUMN_MODS = 1;
// The only widget for capturing accelerators is CellRendererAccel
// It must be embedded in a TreeView, which adds a lot of complexity
export function createAcceleratorInput(settings, id, allTreeViews) {
    // Model
    const model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_INT, GObject.TYPE_INT]);
    model.set(model.append(), [COLUMN_KEY, COLUMN_MODS], parseAccelerator(settings, id));
    // Renderer
    const renderer = new Gtk.CellRendererAccel({
        accel_mode: Gtk.CellRendererAccelMode.GTK,
        editable: true,
    });
    renderer.connect("accel-edited", function (_, path, key, mods) {
        const [ok, iter] = model.get_iter_from_string(path);
        if (!ok) {
            return;
        }
        model.set(iter, [COLUMN_KEY, COLUMN_MODS], [key, mods]);
        settings.set_strv(id, [Gtk.accelerator_name(key, mods)]);
    });
    renderer.connect("accel-cleared", function (_, path) {
        const [ok, iter] = model.get_iter_from_string(path);
        if (!ok) {
            return;
        }
        model.set(iter, [COLUMN_KEY, COLUMN_MODS], [0, 0]);
        settings.set_strv(id, []);
    });
    // Column
    const column = new Gtk.TreeViewColumn();
    column.pack_start(renderer, true);
    column.add_attribute(renderer, "accel-key", COLUMN_KEY);
    column.add_attribute(renderer, "accel-mods", COLUMN_MODS);
    // TreeView
    const treeView = new Gtk.TreeView({
        model: model,
        headers_visible: false,
        visible: true,
    });
    treeView.append_column(column);
    treeView.get_style_context().add_class("accelerator");
    // TreeViews keep their selection when they loose focus
    // This prevents more than one from being selected
    treeView.get_selection().connect("changed", function (selection) {
        if (selection.count_selected_rows() > 0) {
            allTreeViews.filter((it) => it !== treeView).forEach((it) => it.get_selection().unselect_all());
        }
    });
    allTreeViews.push(treeView);
    return treeView;
}
function parseAccelerator(settings, id) {
    const accelerator = settings.get_strv(id)[0] || "";
    const [_, key, mods] = Gtk.accelerator_parse(accelerator);
    return [key, mods];
}
