/* utils.js
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
import GLib from 'gi://GLib';

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

/**
 * @typedef {Object} RunningDevice
 * @property {String} deviceId
 * @property {String | null} deviceName
 */

/**
 * Returns path to default Android Sdk directory
 *
 * @returns {String} - path to `~/Android/Sdk`
 */
export function getDefaultPathToAndroidSDK() {
    const HOME_DIR = GLib.get_home_dir();
    const ANDROID_HOME = 'Android/Sdk';

    return `${HOME_DIR}/${ANDROID_HOME}`;
}

/**
 * @param {String} pathToAndroidSDK - path to Android SDK
 * @returns {Boolean}
 */
export function isPathToAndroidSDKValid(pathToAndroidSDK) {
    const emulatorPath = Gio.file_new_for_path(
        `${pathToAndroidSDK}/emulator/emulator`
    );
    const adbPath = Gio.file_new_for_path(
        `${pathToAndroidSDK}/platform-tools/adb`
    );

    return emulatorPath.query_exists(null) && adbPath.query_exists(null);
}

/**
 * Checks available emulators asynchronously
 *
 * @param {String} pathToAndroidSDK - path to Android SDK
 * @returns {Promise<Array<String>>} - list of emulator names
 */
export async function getEmulators(pathToAndroidSDK) {
    const proc = Gio.Subprocess.new(
        [`${pathToAndroidSDK}/emulator/emulator`, '-list-avds'],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
    );
    /** @type {[string, string]} */
    const [stdout, stderr] = await proc.communicate_utf8_async(null, null);

    if (!proc.get_successful()) {
        throw new Error(stderr);
    }

    return stdout
        .split('\n')
        .filter(emulator => !!emulator && !emulator.startsWith('INFO'));
}

/**
 * Asynchronously retrieves emulator's name from given device id
 *
 * @param {String} deviceId - id of attached device
 * @param {String} pathToAndroidSDK - path to Android SDK
 * @returns {Promise<String> | null} - emulator's name or null if there is no emulator under given deviceId
 */
async function getDeviceNameFromId(deviceId, pathToAndroidSDK) {
    const proc = Gio.Subprocess.new(
        [
            `${pathToAndroidSDK}/platform-tools/adb`,
            '-s',
            deviceId,
            'emu',
            'avd',
            'name',
        ],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
    );
    /** @type {[string, string]} */
    const [stdout, stderr] = await proc.communicate_utf8_async(null, null);

    if (!proc.get_successful()) {
        throw new Error(stderr);
    }

    if (stdout.trim() === '') {
        return null;
    }

    return stdout.split('\n')[0].trim();
}

/**
 * Asynchronously retrieves list of attached devices
 *
 * @param {String} pathToAndroidSDK - path to Android SDK
 * @returns {Promise<Array<RunningDevice>>} - list of attached devices
 */
export async function getRunningDevices(pathToAndroidSDK) {
    const proc = Gio.Subprocess.new(
        [`${pathToAndroidSDK}/platform-tools/adb`, 'devices'],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
    );
    /** @type {[string, string]} */
    const [stdout, stderr] = await proc.communicate_utf8_async(null, null);

    if (!proc.get_successful()) {
        throw new Error(stderr);
    }

    return Promise.all(
        stdout
            .split('\n')
            .map(line => line.match(/^emulator-[0-9]+/)?.[0])
            .filter(match => !!match)
            .map(async deviceId => {
                const deviceName = await getDeviceNameFromId(
                    deviceId,
                    pathToAndroidSDK
                );
                return {deviceId, deviceName};
            })
    );
}

/**
 * Starts emulator process for given emulator
 *
 * @param {String} emulatorName - emulator name
 * @param {String} pathToAndroidSDK - path to Android SDK
 * @returns {Promise<void>} - function used to cancel process
 */
export async function startEmulator(emulatorName, pathToAndroidSDK) {
    const proc = Gio.Subprocess.new(
        [
            `${pathToAndroidSDK}/emulator/emulator`,
            '-avd',
            emulatorName,
            '-no-snapshot',
        ],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
    );

    return proc.wait_check_async(null);
}
