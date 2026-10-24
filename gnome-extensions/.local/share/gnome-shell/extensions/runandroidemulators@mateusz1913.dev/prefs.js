/* prefs.js
 *
 * This file is part of Run Android Emulators (gnome-shell-extension-runandroidemulators)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

//Extension system imports
import {
    ExtensionPreferences,
    gettext as _,
    pgettext,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {GSETTINGS_ANDROID_SDK_PATH_KEY} from './constants.js';
import {getDefaultPathToAndroidSDK, isPathToAndroidSDKValid} from './utils.js';

export default class RunAndroidEmulatorsPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Get the instance of GSettings
        window._settings = this.getSettings();

        // Create a preferences page, with a single group
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: pgettext('preferences-group', 'Android SDK path'),
            description: _(
                'If input is empty, it uses the default path ( "%s" )'
            ).format(getDefaultPathToAndroidSDK()),
        });
        page.add(group);

        // Create a new preferences row
        const warning_image_suffix = new Gtk.Image({
            icon_name: 'dialog-warning-symbolic',
        });
        const row = new Adw.EntryRow({
            title: pgettext('preferences-row', 'Android SDK path'),
            show_apply_button: true,
        });
        row.connect('apply', r => {
            // If the value in row was applied, save it to GSettings
            const new_path = r.text;
            window._settings.set_string(
                GSETTINGS_ANDROID_SDK_PATH_KEY,
                new_path
            );

            if (!new_path || isPathToAndroidSDKValid(new_path)) {
                if (warning_image_suffix.get_parent()) {
                    row.remove(warning_image_suffix);
                }
                return;
            }

            row.add_suffix(warning_image_suffix);
        });
        const initial_path = window._settings.get_string(
            GSETTINGS_ANDROID_SDK_PATH_KEY
        );
        if (initial_path && !isPathToAndroidSDKValid(initial_path)) {
            row.add_suffix(warning_image_suffix);
        }
        group.add(row);

        // If the value changes in GSettings, update the row text
        window._settings.bind(
            GSETTINGS_ANDROID_SDK_PATH_KEY,
            row,
            'text',
            Gio.SettingsBindFlags.GET
        );

        window.set_search_enabled(true);
    }
}
