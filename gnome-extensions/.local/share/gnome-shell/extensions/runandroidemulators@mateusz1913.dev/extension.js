/* extension.js
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

import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {
    Extension,
    gettext as _,
} from 'resource:///org/gnome/shell/extensions/extension.js';
import {
    QuickToggle,
    SystemIndicator,
} from 'resource:///org/gnome/shell/ui/quickSettings.js';

import {
    GSETTINGS_ANDROID_SDK_PATH_KEY,
    EXTENSION_TITLE,
    INITIALIZE_MENU_ITEMS_DELAY_IN_MS,
    SYNC_MENU_ITEMS_INTERVAL_IN_MS,
} from './constants.js';
import {
    getDefaultPathToAndroidSDK,
    getEmulators,
    getRunningDevices,
    startEmulator,
} from './utils.js';

class RunAndroidEmulatorsToggle extends QuickToggle {
    static {
        GObject.registerClass(
            {
                Properties: {
                    [GSETTINGS_ANDROID_SDK_PATH_KEY]: GObject.ParamSpec.string(
                        GSETTINGS_ANDROID_SDK_PATH_KEY,
                        '',
                        '',
                        GObject.ParamFlags.READWRITE,
                        ''
                    ),
                },
            },
            this
        );
    }

    /**
     * Gets Android SDK path value from GSettings or the default one
     */
    get androidSDKPath() {
        return this.androidSdkPath || getDefaultPathToAndroidSDK();
    }

    /**
     * @param {Extension} extensionObject
     */
    constructor(extensionObject) {
        super({
            title: EXTENSION_TITLE,
            hasMenu: true,
            iconName: 'go-next-symbolic',
        });

        this.extensionObject = extensionObject;
        this.emulatorsMenuItemsMap = new Map();
        this.startedEmulatorProcesses = new Map();

        this.initializeMenuItems.bind(this);
        this.setupEmulatorsListMenuItem.bind(this);
        this.setupHeader.bind(this);
        this.setupPreferencesMenuItem.bind(this);
        this.startEmulatorIfNeeded.bind(this);

        this._box.set_child_above_sibling(this._icon, null);

        this.settings = extensionObject.getSettings();

        this.settings.bind(
            GSETTINGS_ANDROID_SDK_PATH_KEY,
            this,
            GSETTINGS_ANDROID_SDK_PATH_KEY,
            Gio.SettingsBindFlags.GET
        );
        this.settingsAndroidSDKKeySignalHandlerId = this.settings.connect(
            `changed::${GSETTINGS_ANDROID_SDK_PATH_KEY}`,
            () => {
                this.initializeMenuItems();
            }
        );

        // Setup header title & icon
        this.setupHeader();

        // Make toggle expandable
        this.clickedSignalHandlerId = this.connect('clicked', () =>
            this.menu.open(true)
        );

        // Initialize menu items for the first time after a delay to not freeze the shell with immediately spawned subprocesses
        this.initializeTimeoutId = setTimeout(() => {
            this.initializeMenuItems();
        }, INITIALIZE_MENU_ITEMS_DELAY_IN_MS);

        // Refresh menu items within specified interval
        this.initializeIntervalId = setInterval(() => {
            this.initializeMenuItems();
        }, SYNC_MENU_ITEMS_INTERVAL_IN_MS);
    }

    destroy() {
        if (this.settingsAndroidSDKKeySignalHandlerId) {
            this.settings.disconnect(this.settingsAndroidSDKKeySignalHandlerId);
        }
        if (this.clickedSignalHandlerId) {
            this.disconnect(this.clickedSignalHandlerId);
        }
        if (this.initializeTimeoutId) {
            clearTimeout(this.initializeTimeoutId);
        }
        if (this.initializeIntervalId) {
            clearInterval(this.initializeIntervalId);
        }

        super.destroy();
    }

    /**
     * Set menu items for emulators (or info when no emulators available) and preferences button
     */
    async initializeMenuItems() {
        await this.setupEmulatorsListMenuItem();
        this.setupPreferencesMenuItem();
    }

    /**
     * Setup header title and icon
     */
    setupHeader() {
        const gicon = Gio.icon_new_for_string(
            this.extensionObject.path + '/icons/smartphone-symbolic.svg'
        );

        this.menu.setHeader(gicon, EXTENSION_TITLE);
    }

    /**
     * Add an item for section with a list of running emulators
     */
    async setupEmulatorsListMenuItem() {
        /** @type {Array<String>} */
        let emulators;
        /** @type {Array<import('./utils.js').RunningDevice>} */
        let runningDevices;

        this.menu.removeAll();

        /**
         * Get a list of available emulators
         *
         * If there's an error, create a menu item with error description and return early
         *
         * If there're no available emulators, create a menu item with appropriate message and return early
         */
        try {
            emulators = await getEmulators(this.androidSDKPath);

            if (!emulators?.length) {
                const menuItem = new PopupMenu.PopupMenuItem(
                    _('No emulators found'),
                    {
                        activate: false,
                        can_focus: false,
                        hover: false,
                        reactive: false,
                    }
                );
                this.menu.addMenuItem(menuItem);
                return;
            }
        } catch (error) {
            console.error(error);
            const errorMenuItemLabel = _(
                'There was an error, when getting the list of available emulators: %s'
            )
                .format(error)
                .split(' ')
                .reduce((acc, curr, index) => {
                    if (index % 3 === 2) {
                        return acc + '\n' + curr;
                    }
                    return acc + ' ' + curr;
                }, '');
            const menuItem = new PopupMenu.PopupMenuItem(errorMenuItemLabel, {
                activate: false,
                can_focus: false,
                hover: false,
                reactive: false,
            });
            this.menu.addMenuItem(menuItem);
            return;
        }

        /**
         * Get a list of running emulators
         *
         * If there's an error, log it to console, but do not return early
         */
        try {
            runningDevices = await getRunningDevices(this.androidSDKPath);
        } catch (error) {
            console.error(error);
            runningDevices = [];
        }

        const emulatorsSection = new PopupMenu.PopupMenuSection();

        this.emulatorsMenuItemsMap.clear();

        /**
         * Map available emulators to their respective menu items in the list
         */
        emulators.forEach(emulator => {
            const isEmulatorRunning = !!runningDevices?.find(
                runningDevice => runningDevice.deviceName === emulator
            );
            const menuItem = emulatorsSection.addAction(
                emulator.replace(/_/g, ' '),
                () => {
                    this.startEmulatorIfNeeded(emulator);
                }
            );

            menuItem.setOrnament(
                isEmulatorRunning
                    ? PopupMenu.Ornament.CHECK
                    : PopupMenu.Ornament.NONE
            );

            this.emulatorsMenuItemsMap.set(emulator, menuItem);
        });

        this.menu.addMenuItem(emulatorsSection);
    }

    /**
     * Add an item for extension's preferences
     */
    setupPreferencesMenuItem() {
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const settingsItem = this.menu.addAction(_('Open preferences'), () =>
            this.extensionObject.openPreferences()
        );

        // Ensure the settings are unavailable when the screen is locked
        settingsItem.visible = Main.sessionMode.allowSettings;
        this.menu._settingsActions[this.extensionObject.uuid] = settingsItem;
    }

    /**
     * Starts emulator process if it's not running already
     *
     * @param {String} emulator
     */
    startEmulatorIfNeeded(emulator) {
        /**
         * Mark selected menu item as checked, when emulator is started
         */
        const item = this.emulatorsMenuItemsMap.get(emulator);

        if (item) {
            item.setOrnament(PopupMenu.Ornament.CHECK);
        }

        if (this.startedEmulatorProcesses.get(emulator)) {
            // Emulator is already running
            return;
        }

        const startedProcess = startEmulator(
            emulator,
            this.androidSDKPath
        ).then(() => {
            /**
             * Mark selected menu item as unchecked, when emulator is terminated
             */
            const menuItem = this.emulatorsMenuItemsMap.get(emulator);

            if (menuItem) {
                menuItem.setOrnament(PopupMenu.Ornament.NONE);
            }

            this.startedEmulatorProcesses.delete(emulator);
        });
        this.startedEmulatorProcesses.set(emulator, startedProcess);
    }
}

class RunAndroidEmulatorsIndicator extends SystemIndicator {
    static {
        GObject.registerClass(this);
    }

    /**
     * @param {Extension} extensionObject
     */
    constructor(extensionObject) {
        super();

        this.quickSettingsItems.push(
            new RunAndroidEmulatorsToggle(extensionObject)
        );
    }

    destroy() {
        this.quickSettingsItems.forEach(item => item.destroy());

        super.destroy();
    }
}

export default class RunAndroidEmulatorsExtension extends Extension {
    enable() {
        this._indicator = new RunAndroidEmulatorsIndicator(this);
        Main.panel.statusArea.quickSettings.addExternalIndicator(
            this._indicator,
            2
        );
    }

    disable() {
        this._indicator.destroy();
        delete this._indicator;
    }
}
