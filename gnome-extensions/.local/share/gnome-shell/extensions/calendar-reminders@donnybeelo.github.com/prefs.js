/* prefs.ts
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import { ExtensionPreferences, gettext as _, } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
export default class CalendarRemindersPrefs extends ExtensionPreferences {
    async fillPreferencesWindow(window) {
        const row = new Adw.SpinRow({
            title: _("Snooze length"),
            subtitle: _("Minutes before a snoozed reminder fires again"),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 1440,
                step_increment: 1,
                page_increment: 5,
            }),
        });
        this.getSettings().bind("snooze-minutes", row, "value", 0);
        const group = new Adw.PreferencesGroup();
        group.add(row);
        const page = new Adw.PreferencesPage();
        page.add(group);
        window.add(page);
    }
}
