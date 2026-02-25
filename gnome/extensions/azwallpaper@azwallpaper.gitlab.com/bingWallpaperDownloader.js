import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Config from 'resource:///org/gnome/shell/misc/config.js';

import {Logger} from './extension.js';
import * as Constants from './constants.js';
import {notify} from './utils.js';

const STARTUP_DELAY = 10;
const DELAY_TIME = 3;
const TWELVE_HOURS_IN_SECONDS = 43200;
const TWELVE_HOURS_IN_MILLISECONDS = TWELVE_HOURS_IN_SECONDS * 1000;
const SESSION_TYPE = GLib.getenv('XDG_SESSION_TYPE');
const PACKAGE_VERSION = Config.PACKAGE_VERSION;

Gio._promisify(Soup.Session.prototype, 'send_and_read_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_bytes_async', 'replace_contents_finish');

export const BingWallpaperDownloader = class {
    constructor(extension) {
        this._settings = extension.settings;
        this._userAgent = `User-Agent: Mozilla/5.0 (${SESSION_TYPE}; GNOME Shell/${PACKAGE_VERSION}; Linux ${GLib.getenv('CPU')};) AzWallpaper/${extension.metadata.version}`;
    }

    initiate() {
        Logger.log('BING Downloader - Initiate BING Wallpaper downloader');
        this.setBingParams();
        this.setDownloadDirectory();
        this._session = new Soup.Session({user_agent: this._userAgent, timeout: 60});

        this.downloadOnceWithDelay(this._getTimerDelay());
    }

    setDownloadDirectory() {
        this._bingWallpapersDirectory = this._settings.get_string('bing-download-directory');

        if (!this._bingWallpapersDirectory) {
            this._setToDefaultDownloadDirectory();
            Logger.log(`BING Downloader - Download Directory ${this._bingWallpapersDirectory}`);
        } else {
            const dir = Gio.File.new_for_path(this._bingWallpapersDirectory);
            if (!dir.query_exists(null)) {
                const success = dir.make_directory(null);
                if (!success) {
                    Logger.log(`BING Downloader - Failed to create directory: ${this._bingWallpapersDirectory}`);
                    this._setToDefaultDownloadDirectory();
                    Logger.log(`BING Downloader - Set to default directory: ${this._bingWallpapersDirectory}`);
                    notify(_('Error creating download directory!'),
                        _('Directory set to - %s').format(this._bingWallpapersDirectory));
                }
            }
        }
    }

    setBingParams() {
        const numberOfDownloads = this._settings.get_int('bing-wallpaper-download-count').toString();
        const marketSetting = this._settings.get_string('bing-wallpaper-market');
        const isValidMarket = Constants.Markets.indexOf(marketSetting) >= 0;
        const market = isValidMarket ? marketSetting : 'Automatic';

        Logger.log(`BING Downloader - Set BING download Params. Number of downloads: ${numberOfDownloads}. Market: ${market}`);
        this._bingParams = {
            format: 'js', idx: '0', n: numberOfDownloads, mbl: '1', mkt: market === 'Automatic' ? '' : market,
        };
    }

    _setToDefaultDownloadDirectory() {
        const pictureDirectory = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
        this._bingWallpapersDirectory = GLib.build_filenamev([pictureDirectory, 'Bing Wallpapers']);
        this._settings.set_string('bing-download-directory', this._bingWallpapersDirectory);

        const dir = Gio.File.new_for_path(this._bingWallpapersDirectory);
        if (!dir.query_exists(null))
            dir.make_directory(null);
    }

    _getPrettyTime(timespan) {
        const minutesAgo = timespan / 60;
        const hoursAgo = timespan / 3600;

        if (timespan <= 60)
            return `${timespan} seconds`;
        if (minutesAgo <= 60)
            return `${minutesAgo.toFixed(1)} minutes`;

        return `${hoursAgo.toFixed(1)} hours`;
    }

    downloadOnceWithDelay(delay = DELAY_TIME) {
        Logger.log(`BING Downloader - Next download attempt in ${this._getPrettyTime(delay)}`);
        this.endSingleDownload();
        this._singleDownloadTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, delay, () => {
            this._queueDownload();
            this._setLastDataFetch();
            GLib.source_remove(this._singleDownloadTimerId);
            this._singleDownloadTimerId = null;
            this._startDownloaderTimer(TWELVE_HOURS_IN_SECONDS);
            return GLib.SOURCE_REMOVE;
        });
    }

    _startDownloaderTimer(delay) {
        this.endDownloadTimer();
        Logger.log(`BING Downloader - Next download attempt in ${this._getPrettyTime(delay)}`);
        this._downloadTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, delay, () => {
            this._queueDownload();
            this._setLastDataFetch();
            return GLib.SOURCE_CONTINUE;
        });
    }

    endSingleDownload() {
        if (this._singleDownloadTimerId) {
            GLib.source_remove(this._singleDownloadTimerId);
            this._singleDownloadTimerId = null;
        }
    }

    endDownloadTimer() {
        if (this._downloadTimerId) {
            GLib.source_remove(this._downloadTimerId);
            this._downloadTimerId = null;
        }
    }

    async _queueDownload() {
        Logger.log('BING Downloader - Starting download...');

        const {jsonData, error} = await this._getJsonData();
        if (!jsonData || error) {
            if (error)
                Logger.log(`BING Downloader - Download Failed! ${error}`);
            else
                Logger.log('BING Downloader - Download Failed! JSON data null.');

            if (this._settings.get_boolean('bing-wallpaper-notify-on-error')) {
                notify(_('BING wallpaper download failed.'), _('Error: %s').format(error ?? _('JSON data null')),
                    _('Try again?'), () => this.downloadOnceWithDelay());
            }
        } else {
            const results = [];
            for (const image of jsonData.images)
                results.push(this._downloadAndSaveImage(image));

            await Promise.all(results).then(values => {
                for (const value of values) {
                    const {msg} = value;
                    Logger.log(msg);
                }
            });
            Logger.log('BING Downloader - Download Finished!');
        }
        this.maybeDeleteOldWallpapers();
    }

    _getElapsedTime() {
        const lastDataFetch = this._settings.get_uint64('bing-last-data-fetch');
        const dateNow = Date.now();

        const elapsedTime = dateNow - lastDataFetch;

        return elapsedTime;
    }

    _getTimerDelay() {
        const lastDataFetch = this._settings.get_uint64('bing-last-data-fetch');
        const elapsedTime = this._getElapsedTime();
        const has12HoursPassed = elapsedTime >= TWELVE_HOURS_IN_MILLISECONDS;

        if (lastDataFetch === 0 || has12HoursPassed) {
            Logger.log('BING Downloader - 12 hours passed. Queue download...');
            return STARTUP_DELAY;
        }

        const nextDataFetch = Math.floor((TWELVE_HOURS_IN_MILLISECONDS - elapsedTime) / 1000);
        return Math.max(nextDataFetch, STARTUP_DELAY);
    }

    _setLastDataFetch() {
        const dateNow = Date.now();
        this._settings.set_uint64('bing-last-data-fetch', dateNow);
    }

    async _getJsonData() {
        const message = Soup.Message.new_from_encoded_form(
            'GET',
            'https://www.bing.com/HPImageArchive.aspx',
            Soup.form_encode_hash(this._bingParams)
        );
        message.request_headers.append('Accept', 'application/json');

        let info;
        try {
            const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
            const decoder = new TextDecoder('utf-8');
            info = JSON.parse(decoder.decode(bytes.get_data()));

            if (message.statusCode === Soup.Status.OK)
                return {jsonData: info};
            else
                return {error: `getJsonData() failed with status code - ${message.statusCode}`};
        } catch (e) {
            return {error: `getJsonData() error - ${e.message}`};
        }
    }

    async _downloadAndSaveImage(data) {
        const [deletionEnabled, daysToDeletion_] = this._settings.get_value('bing-wallpaper-delete-old').deep_unpack();
        const resolutionSetting = this._settings.get_string('bing-wallpaper-resolution');
        const isValidResolution = Constants.Resolutions.indexOf(resolutionSetting) >= 0;
        const resolution = isValidResolution ? resolutionSetting : 'UHD';

        const urlBase = data.urlbase;
        const url = `https://bing.com${urlBase}_${resolution}.jpg`;

        // Clean up the urlBase for a prettier file name
        const prettyUrlBase = urlBase.replace(/^.*[\\/]/, '').replace('th?id=OHR.', '').split('_')[0];

        const fileName = `${prettyUrlBase}-${resolution}`;
        const filePath = GLib.build_filenamev([this._bingWallpapersDirectory, `${fileName}.jpg`]);
        const file = Gio.file_new_for_path(filePath);

        if (file.query_exists(null))
            return {msg: `BING Downloader - "${fileName}" already downloaded!`};

        Logger.log(`BING Downloader - Retrieving "${fileName}" from BING`);

        const message = Soup.Message.new('GET', url);

        let info;
        try {
            const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);

            if (message.statusCode === Soup.Status.OK) {
                info = bytes.get_data();
                const [success] = await file.replace_contents_bytes_async(info, null, false,
                    Gio.FileCreateFlags.REPLACE_DESTINATION, null);
                if (success) {
                    if (deletionEnabled) {
                        const downloadedImages = this._settings.get_strv('bing-wallpapers-downloaded');
                        downloadedImages.push(filePath);
                        this._settings.set_strv('bing-wallpapers-downloaded', downloadedImages);
                    }

                    return {msg: `BING Downloader - ${fileName} download complete!`};
                } else {
                    return {msg: `BING Downloader - Error saving ${fileName}`};
                }
            } else {
                return {msg: `BING Downloader - ${fileName} download failed with status code - ${message.statusCode}`};
            }
        } catch (e) {
            return {msg: `BING Downloader - ${fileName} download failed - ${e}`};
        }
    }

    maybeDeleteOldWallpapers() {
        const [deletionEnabled, amountToKeep] = this._settings.get_value('bing-wallpaper-delete-old').deep_unpack();
        if (!deletionEnabled)
            return;

        Logger.log('BING Downloader - Checking to delete old BING wallpapers...');
        const downloadedImages = this._settings.get_strv('bing-wallpapers-downloaded');

        if (downloadedImages <= amountToKeep) {
            Logger.log('BING Downloader - Wallpapers to keep less than downloaded images count. Skip Deletion');
            return;
        }

        const amountToRemove = downloadedImages.length - amountToKeep;

        for (let i = 0; i < amountToRemove; i++) {
            const filePath = downloadedImages.shift();
            const file = Gio.File.new_for_path(filePath);
            if (!file.query_exists(null))
                continue;

            const fileName = file.get_basename();
            try {
                Logger.log(`BING Downloader - Delete ${fileName}`);
                file.delete(null);
            } catch {
                Logger.log(`BING Downloader - Error gathering ${fileName} info.`);
                continue;
            }
        }

        this._settings.set_strv('bing-wallpapers-downloaded', downloadedImages);
        Logger.log('BING Downloader - Check to delete old BING wallpapers complete!');
    }

    disable() {
        Logger.log('BING Downloader - Disabled!');
        this.endSingleDownload();
        this.endDownloadTimer();
        if (this._session) {
            this._session.abort();
            this._session = null;
        }
    }

    destroy() {
        Logger.log('BING Downloader - Destroyed!');
        this.disable();
        this._settings = null;
    }
};
