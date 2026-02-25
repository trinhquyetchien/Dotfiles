import Gio from 'gi://Gio';

import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import {domain} from 'gettext';
const {gettext: _} = domain('azwallpaper');

const [ShellVersion] = Config.PACKAGE_VERSION.split('.').map(s => Number(s));
const PROJECT_NAME = _('Wallpaper Slideshow');

/**
 * @param {string} filename
 * @description Clean up the filename by removing resolution tags and file extensions, and adding spaces for readability.
 */
export function getPrettyFileName(filename) {
    if (!filename)
        return _('None');

    const isBingWallpaper = /-(\d{3,4}x\d{3,4}|UHD)(?=\.[^/.]+$)/.test(filename);
    if (isBingWallpaper) {
        let cleanName = filename.replace(/-\d{3,4}x\d{3,4}|-UHD(?=\.[^/.]+$)/, '').replace(/\.[^/.]+$/, '');
        cleanName = cleanName.replace(/([a-z])([A-Z])/g, '$1 $2');
        cleanName = cleanName.replace(/([a-z])(\d)/g, '$1 $2');
        cleanName = cleanName.replace(/(\d)([a-zA-Z])/g, '$1 $2');

        return cleanName;
    }

    return filename.replace(/\.[^/.]+$/, '');
}

/**
 *
 * @param {string} title notification title
 * @param {string} body notification body
 * @param {string} actionLabel the label for the action
 * @param {Function} actionCallback the callback for the action
 */
export function notify(title, body, actionLabel = null, actionCallback = null) {
    const extension = Extension.lookupByURL(import.meta.url);
    const gicon = Gio.icon_new_for_string(`${extension.path}/media/azwallpaper-logo.svg`);

    const source = getSource(PROJECT_NAME, 'application-x-addon-symbolic');
    Main.messageTray.add(source);

    const notification = getNotification(source, title, body, gicon);

    if (actionLabel && actionCallback) {
        notification.urgency = MessageTray.Urgency.CRITICAL;
        notification.addAction(actionLabel, () => {
            actionCallback();
            notification.destroy();
        });
        notification.resident = true;
    } else {
        notification.isTransient = true;
    }

    if (ShellVersion >= 46)
        source.addNotification(notification);
    else
        source.showNotification(notification);
}

function getNotification(source, title, body, gicon) {
    if (ShellVersion >= 46)
        return new MessageTray.Notification({source, title, body, gicon});
    else
        return new MessageTray.Notification(source, title, body, {gicon});
}

function getSource(title, iconName) {
    if (ShellVersion >= 46)
        return new MessageTray.Source({title, iconName});
    else
        return new MessageTray.Source(title, iconName);
}
