import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
export function createColorInput(settings, id) {
    const rgba = new Gdk.RGBA();
    rgba.parse(settings.get_string(id));
    const color = new Gtk.ColorButton({
        rgba: rgba,
        show_editor: true,
        use_alpha: true,
        visible: true,
    });
    color.connect("color-set", function () {
        settings.set_string(id, color.get_rgba().to_string());
    });
    return color;
}
