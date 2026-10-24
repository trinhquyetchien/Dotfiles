import Gdk from "gi://Gdk";
import Gtk from "gi://Gtk";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import { LayoutPage } from "./preferences/pages/layout.js";
import { AdvancedPage } from "./preferences/pages/advanced.js";
import { KeyboardShortcutsPage } from "./preferences/pages/keyboardShortcuts.js";
export default class TactilePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const provider = new Gtk.CssProvider();
        provider.load_from_path(this.dir.get_path() + "/prefs.css");
        Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        window.add(new LayoutPage(settings, 1));
        window.add(new LayoutPage(settings, 2));
        window.add(new LayoutPage(settings, 3));
        window.add(new LayoutPage(settings, 4));
        window.add(new KeyboardShortcutsPage(settings));
        window.add(new AdvancedPage(settings));
        // Set appropriate window size based on number of columns
        const num_cols = settings.get_int("grid-cols");
        const desired_width = Math.max(800, 102 + 141 * num_cols);
        const desired_height = 600;
        window.set_default_size(desired_width, desired_height);
        window.set_size_request(600, 400);
        // GNOME 47+ expect a promise
        return Promise.resolve();
    }
}
