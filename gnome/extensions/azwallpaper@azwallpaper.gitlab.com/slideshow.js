import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {Logger} from './extension.js';
import {SlideshowSortType} from './constants.js';
import {getPrettyFileName, notify} from './utils.js';

Gio._promisify(Gio.File.prototype, 'query_info_async', 'query_info_finish');
Gio._promisify(Gio.File.prototype, 'enumerate_children_async', 'enumerate_children_finish');
Gio._promisify(Gio.FileEnumerator.prototype, 'next_files_async', 'next_files_finish');

// Cap the slide duration to a minimun of 5 seconds
const MIN_DURATION = 5;

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const randomIndex = Math.floor(Math.random() * (i + 1));
        const b = array[i];
        array[i] = array[randomIndex];
        array[randomIndex] = b;
    }
}

async function getFileInfo(file) {
    let info;
    try {
        info = await file.query_info_async('standard::content-type,time::created,standard::is-hidden', Gio.FileQueryInfoFlags.NONE, 0, null);
    } catch {
        return false;
    }

    const contentType = info.get_content_type();
    const date = info.get_attribute_uint64('time::created').toString();
    const isHidden = info.get_is_hidden();
    const isImage = contentType.startsWith('image/') && !isHidden;
    return {isImage, date};
}

function insertWallpaper(wallpaperQueue, newWallpaper, sortType) {
    let low = 0;
    let high = wallpaperQueue.length;

    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        let comparison;

        switch (sortType) {
        case SlideshowSortType.NEWEST:
            comparison = wallpaperQueue[mid].date - newWallpaper.date;
            break;
        case SlideshowSortType.OLDEST:
            comparison = newWallpaper.date - wallpaperQueue[mid].date;
            break;
        case SlideshowSortType.A_Z:
            comparison = collator.compare(wallpaperQueue[mid].name, newWallpaper.name);
            break;
        case SlideshowSortType.Z_A:
            comparison = collator.compare(newWallpaper.name, wallpaperQueue[mid].name);
            break;
        default:
            return false;
        }

        if (comparison < 0)
            low = mid + 1;
        else
            high = mid;
    }

    wallpaperQueue.splice(low, 0, newWallpaper);
    return low;
}

export class Slideshow extends GObject.Object {
    static [GObject.properties] = {
        'slide-index': GObject.ParamSpec.int('slide-index', 'slide-index', 'slide-index',
            GObject.ParamFlags.READWRITE, 0, GLib.MAXINT32, 0),
        'queue-length': GObject.ParamSpec.int('queue-length', 'queue-length', 'queue-length',
            GObject.ParamFlags.READWRITE, 0, GLib.MAXINT32, 0),
    };

    static {
        GObject.registerClass(this);
    }

    constructor(extension) {
        super();
        this._extension = extension;
        this._settings = this._extension.settings;
        this._wallpaperQueue = this._settings.get_value('slideshow-queue').deep_unpack();
        this.queueLength = this._wallpaperQueue.length;
        this.slideIndex = this._settings.get_int('slideshow-current-slide-index');
        this._backgroundSettings = new Gio.Settings({schema: 'org.gnome.desktop.background'});

        this._settings.bind(
            'slideshow-current-slide-index', this,
            'slide-index',
            Gio.SettingsBindFlags.DEFAULT
        );

        this._loadSlideshowQueue().catch(e => console.log(e));

        this._settings.connectObject('changed::slideshow-queue-sort-type', () => {
            this._wallpaperQueue = [];
            this.slideIndex = -1;
            this._loadSlideshowQueue();
        }, this);

        this._settings.connectObject('changed::slideshow-slide-duration', () => this._onDurationChange(), this);
        this._settings.connectObject('changed::slideshow-use-absolute-time-for-duration', () => this._onDurationChange(), this);
        this._settings.connectObject('changed::slideshow-directory', () => this._reset(), this);
        this._settings.connectObject('changed::slideshow-change-slide-event', () => this._onChangeSlideEvent(), this);
    }

    _initiate() {
        const isValidDirectory = this._isValidDirectory();
        if (!isValidDirectory)
            return;

        Logger.log('Initiate slideshow.');
        this._createFileMonitor();

        this._setWallpaper();

        const isPaused = this._settings.get_boolean('slideshow-pause');
        if (isPaused) {
            Logger.log('Slideshow is paused. Not initiating slideshow.');
            return;
        }

        const timer = this._getTimerDelay();
        this._slideshowStartTime = Date.now();
        this._settings.set_uint64('slideshow-time-of-slide-start', this._slideshowStartTime);

        Logger.log('Starting slideshow...');
        Logger.log(`Next slide in ${timer} seconds.`);
        this._startSlideshowTimer(timer, true);
    }

    _isValidDirectory() {
        const slideshowDirectory = this._settings.get_string('slideshow-directory');
        const directory = Gio.file_new_for_path(slideshowDirectory);

        if (!slideshowDirectory || !directory.query_exists(null)) {
            notify(_('Slideshow directory does not exist!'), _('Change directory in settings to begin slideshow.'),
                _('Open Settings'), () => this._extension.openPreferences());
            this._monitorInvalidDirectory();
            return false;
        }

        return true;
    }

    async _loadSlideshowQueue(initiate = true) {
        const isValidDirectory = this._isValidDirectory();
        if (!isValidDirectory)
            return;

        const wallpapers = await this._getWallpapersFromDirectory().catch(e => console.log(e));
        this._updateQueue(wallpapers);

        const isQueueEmpty = this._isQueueEmpty();
        const slideIndexInRange = this._isIndexInRange();
        // If the queue is empty or slideIndex out of range, create a new queue.
        if (isQueueEmpty || !slideIndexInRange) {
            this._sortSlideshowQueue();
            this._saveWallpaperQueue(this._wallpaperQueue);
            this.slideIndex = 0;
        }

        const isQueueStillEmpty = this._isQueueEmpty();
        if (isQueueStillEmpty) {
            notify(_('Slideshow directory contains no images!'), _('Change directory in settings to begin slideshow.'),
                _('Open Settings'), () => this._extension.openPreferences());
            return;
        }

        if (initiate)
            this._initiate();
    }

    _sortSlideshowQueue() {
        const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
        const sortType = this._settings.get_enum('slideshow-queue-sort-type');

        switch (sortType) {
        case SlideshowSortType.RANDOM:
            shuffle(this._wallpaperQueue);
            break;
        case SlideshowSortType.A_Z:
            this._wallpaperQueue.sort((a, b) => collator.compare(a.name, b.name));
            break;
        case SlideshowSortType.Z_A:
            this._wallpaperQueue.sort((a, b) => collator.compare(b.name, a.name));
            break;
        case SlideshowSortType.NEWEST:
            this._wallpaperQueue.sort((a, b) => b.date - a.date);
            break;
        case SlideshowSortType.OLDEST:
            this._wallpaperQueue.sort((a, b) => a.date - b.date);
            break;
        default:
            shuffle(this._wallpaperQueue);
            break;
        }
    }

    _updateQueue(directoryImages) {
        Logger.log('Checking slideshow queue validity...');

        if (directoryImages.length === 0) {
            Logger.log('Slideshow queue empty! Attempting to create new slideshow queue...');
            return;
        }

        const currentQueueMap = new Map(this._wallpaperQueue.map(img => [img.name, img]));
        const directoryImagesMap = new Map(directoryImages.map(img => [img.name, img]));

        const toAdd = [...directoryImagesMap.values()].filter(img => !currentQueueMap.has(img.name));
        const toRemove = [...currentQueueMap.values()].filter(img => !directoryImagesMap.has(img.name));

        toRemove.forEach(img => {
            const index = this._wallpaperQueue.findIndex(q => q.name === img.name);
            if (index !== -1)
                this._removeFromQueue(img.name, index);
        });

        toAdd.forEach(img => {
            this._addToQueue(img.name, img);
        });

        this._saveWallpaperQueue(this._wallpaperQueue);
        Logger.log('Queue validity check done!');
    }

    async _getWallpapersFromDirectory() {
        Logger.log('Get Wallpaper List');
        const wallpaperPaths = [];

        const slideshowDirectoryPath = this._settings.get_string('slideshow-directory');
        const dir = Gio.file_new_for_path(slideshowDirectoryPath);

        const fileInfos = [];
        let fileEnum;

        try {
            fileEnum = await dir.enumerate_children_async(
                'standard::name,standard::type,standard::content-type,time::created',
                Gio.FileQueryInfoFlags.NONE,
                GLib.PRIORITY_DEFAULT, null);
        } catch (e) {
            console.log(e);
            return [];
        }

        let infos;
        do {
            // eslint-disable-next-line no-await-in-loop
            infos = await fileEnum.next_files_async(100, GLib.PRIORITY_DEFAULT, null);
            fileInfos.push(...infos);
        } while (infos.length > 0);

        for (const info of fileInfos) {
            const name = info.get_name();
            const contentType = info.get_content_type();
            const date = info.get_attribute_uint64('time::created').toString();
            if (contentType.startsWith('image/'))
                wallpaperPaths.push({name, date});
        }

        return wallpaperPaths;
    }

    _isQueueEmpty() {
        return this._wallpaperQueue.length === 0;
    }

    _isIndexInRange() {
        return this.slideIndex < this._wallpaperQueue.length && this.slideIndex >= 0;
    }

    async _createNewSlideshowQueue() {
        Logger.log('Attempting to create new slideshow queue...');
        await this._loadSlideshowQueue(false).catch(e => console.log(e));

        const isQueueStillEmpty = this._isQueueEmpty();
        if (isQueueStillEmpty)
            return;

        Logger.log('New slideshow queue created! Starting new slideshow...');

        // If the new wallpaperQueue first entry is the same as the previous wallpaper,
        // remove first entry and push to end of queue.
        const sortType = this._settings.get_enum('slideshow-queue-sort-type');
        const currentWallaper = this._settings.get_string('slideshow-current-wallpaper');
        if (this._wallpaperQueue[0].name === currentWallaper && sortType === SlideshowSortType.RANDOM) {
            const duplicate = this._wallpaperQueue.shift();
            this._wallpaperQueue.push(duplicate);
            this._saveWallpaperQueue(this._wallpaperQueue);
        }
        this._changeSlide();
        this._maybeStartSlideshow();
    }

    /**
     * A change slide request was triggered from the settings.
     */
    _onChangeSlideEvent() {
        const changeEvent = this._settings.get_int('slideshow-change-slide-event');
        if (changeEvent === 1)
            this.goToPreviousSlide();
        else if (changeEvent === 2)
            this.goToNextSlide();
        else if (changeEvent === 0)
            return;

        this._settings.set_int('slideshow-change-slide-event', 0);
    }

    /**
     * Manually goes to the previous slide and restarts the timer.
     */
    goToPreviousSlide() {
        if (this._wallpaperQueue.length === 0)
            return;

        this._endSlideshowTimer();
        this.slideIndex = (this.slideIndex - 1 + this._wallpaperQueue.length) % this._wallpaperQueue.length;
        this._changeSlide();
        this._maybeStartSlideshow();
    }

    /**
     * Manually goes to the next slide and restarts the timer.
     */
    goToNextSlide() {
        if (this._wallpaperQueue.length === 0)
            return;

        this._endSlideshowTimer();
        this.slideIndex = (this.slideIndex + 1) % this._wallpaperQueue.length;
        this._changeSlide();
        this._maybeStartSlideshow();
    }

    getCurrentSlide() {
        if (this._wallpaperQueue.length === 0 || !this._wallpaperQueue[this.slideIndex])
            return {path: null, name: null};

        const name = this._wallpaperQueue[this.slideIndex].name;
        const directoryPath = this._settings.get_string('slideshow-directory');
        const path = GLib.build_filenamev([directoryPath, name]);
        return {path, name};
    }

    getSlideshowLength() {
        return this._wallpaperQueue.length;
    }

    _setWallpaper() {
        const wallpaper = this._wallpaperQueue[this.slideIndex].name;
        Logger.log(`Current wallpaper "${wallpaper}"`);
        Logger.log(`Currently on slide #${this.slideIndex + 1} out of ${this._wallpaperQueue.length}`);
        this._settings.set_string('slideshow-current-wallpaper', wallpaper);

        this._setPictureUriSettings(wallpaper);
    }

    _setPictureUriSettings(fileName) {
        this._removeChangedIdleId();

        const directory = this._settings.get_string('slideshow-directory');
        const filePath = GLib.build_filenamev([directory, fileName]);
        const startTime = Date.now();

        this._changedIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            try {
                const uri = GLib.filename_to_uri(filePath, null);
                this._backgroundSettings.set_string('picture-uri', uri);
                this._backgroundSettings.set_string('picture-uri-dark', uri);
            } catch (e) {
                console.log(`Wallpaper Slideshow Error: Failed to convert slide path to URI: ${filePath}, error: ${e.message}`);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;
            Logger.log(`Wallpaper change event took ${duration}ms to complete.`);

            this._changedIdleId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _removeChangedIdleId() {
        if (this._changedIdleId) {
            GLib.source_remove(this._changedIdleId);
            this._changedIdleId = null;
        }
    }

    _changeSlide() {
        const isQueueEmpty = this._isQueueEmpty();
        const slideIndexInRange = this._isIndexInRange();
        const reshuffleOnComplete = this._settings.get_boolean('slideshow-queue-reshuffle-on-complete');
        const sortType = this._settings.get_enum('slideshow-queue-sort-type');
        const needsReshuffle = reshuffleOnComplete && sortType === SlideshowSortType.RANDOM && !slideIndexInRange;

        if (isQueueEmpty) {
            Logger.log('Slideshow queue empty!');
            this._createNewSlideshowQueue();
            return false;
        }

        if (needsReshuffle) {
            Logger.log('Reshuffling queue.');
            shuffle(this._wallpaperQueue);
            this._saveWallpaperQueue(this._wallpaperQueue);
        }

        if (!slideIndexInRange) {
            Logger.log('Reached end of slideshow. Go to first slide.');
            this.slideIndex = 0;
        }

        this._setWallpaper();

        // Store the Date.now() when the wallpaper changed.
        this._slideshowStartTime = Date.now();
        this._settings.set_uint64('slideshow-time-of-slide-start', this._slideshowStartTime);
        const slideDuration = this._getSlideDuration();
        this._settings.set_int('slideshow-timer-remaining', slideDuration);
        return true;
    }

    _maybeStartSlideshow(delay, runOnce) {
        const isPaused = this._settings.get_boolean('slideshow-pause');
        if (!isPaused)
            this._startSlideshowTimer(delay, runOnce);
    }

    _startSlideshowTimer(delay = this._getSlideDuration(), runOnce = false) {
        this._endSlideshowTimer(false);

        if (!runOnce)
            Logger.log(`Next slide in ${delay} seconds.`);

        this._slideshowId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, delay, () => {
            this.slideIndex++;
            const success = this._changeSlide();
            if (!success) {
                this._slideshowId = null;
                return GLib.SOURCE_REMOVE;
            }

            if (runOnce) {
                this._startSlideshowTimer();
                return GLib.SOURCE_REMOVE;
            }

            Logger.log(`Next slide in ${delay} seconds.`);
            return GLib.SOURCE_CONTINUE;
        });
    }

    _endSlideshowTimer(removeChangedIdleId = true) {
        if (removeChangedIdleId)
            this._removeChangedIdleId();
        if (this._slideshowId) {
            GLib.source_remove(this._slideshowId);
            this._slideshowId = null;
        }
    }

    _clearFileMonitor() {
        if (this._fileMonitor) {
            Logger.log('Clear FileMonitor');
            if (this._fileMonitorChangedId) {
                Logger.log('Disconnect FileMonitor ChangedId');
                this._fileMonitor.disconnect(this._fileMonitorChangedId);
                this._fileMonitorChangedId = null;
            }
            this._fileMonitor.cancel();
            this._fileMonitor = null;
        }
    }

    _monitorInvalidDirectory() {
        this._clearFileMonitor();
        const directoryPath = this._settings.get_string('slideshow-directory');
        const dir = Gio.file_new_for_path(directoryPath);
        try {
            this._fileMonitor = dir.monitor_directory(Gio.FileMonitorFlags.NONE, null);
            this._fileMonitor.set_rate_limit(1000);
            this._fileMonitorChangedId = this._fileMonitor.connect('changed', (_monitor, file, otherFile, eventType) => {
                if (eventType === Gio.FileMonitorEvent.CREATED && file.get_path() === directoryPath)
                    this._restart();
            });
        } catch (e) {
            console.log(`Wallpaper Slideshow: Error monitoring directroy - ${e}`);
        }
    }

    _createFileMonitor() {
        this._clearFileMonitor();

        const sortType = this._settings.get_enum('slideshow-queue-sort-type');
        const slideshowDirectoryPath = this._settings.get_string('slideshow-directory');
        const dir = Gio.file_new_for_path(slideshowDirectoryPath);
        this._fileMonitor = dir.monitor_directory(Gio.FileMonitorFlags.WATCH_MOUNTS | Gio.FileMonitorFlags.WATCH_MOVES, null);
        this._fileMonitor.set_rate_limit(1000);
        this._fileMonitorChangedId = this._fileMonitor.connect('changed', async (_monitor, file, otherFile, eventType) => {
            const currentWallpaper = this._settings.get_string('slideshow-current-wallpaper');
            const fileName = file.get_basename();

            const index = this._wallpaperQueue.findIndex(q => q.name === fileName);
            const fileInQueue = index >= 0;

            const newFileName = otherFile?.get_basename();

            switch (eventType) {
            case Gio.FileMonitorEvent.CREATED:
                Logger.log(`Slideshow Directory - ${fileName} created.`);
                break;
            case Gio.FileMonitorEvent.DELETED:
            case Gio.FileMonitorEvent.MOVED_OUT:
                Logger.log(`Slideshow Directory - ${fileName} deleted/moved out.`);
                if (fileInQueue) {
                    this._removeFromQueue(fileName, index);
                    this._saveWallpaperQueue(this._wallpaperQueue);
                }
                if (currentWallpaper === fileName) {
                    // The deleted file was the current wallpaper, go to next slide in queue
                    this.goToNextSlide();
                } else if (file.get_path() === slideshowDirectoryPath) {
                    this._restart();
                }
                break;
            case Gio.FileMonitorEvent.CHANGES_DONE_HINT:
            case Gio.FileMonitorEvent.MOVED_IN: {
                if (eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT)
                    Logger.log(`Slideshow Directory - ${fileName} ready (writing finished).`);
                else
                    Logger.log(`Slideshow Directory - ${fileName} moved in.`);

                const fileInfo = await getFileInfo(file);
                const newWallpaperData = {name: fileName, date: fileInfo.date};
                if (!fileInfo.isImage) {
                    Logger.log(`Slideshow Directory - "${fileName}" is not a valid image.`);
                    break;
                }

                this._addToQueue(fileName, newWallpaperData);
                this._saveWallpaperQueue(this._wallpaperQueue);

                break;
            }
            case Gio.FileMonitorEvent.RENAMED: {
                Logger.log(`Slideshow Directory - ${fileName} renamed.`);
                const fileInfo = await getFileInfo(otherFile);
                const newWallpaperData = {name: newFileName, date: fileInfo.date};

                if (fileInQueue && fileInfo.isImage) {
                    // Replace the old file with the new file
                    if (sortType === SlideshowSortType.RANDOM) {
                        Logger.log(`Slideshow Directory - Renamed "${fileName}" at index:${index} to "${newFileName}"`);
                        this._wallpaperQueue.splice(index, 1, newWallpaperData);
                    } else {
                        Logger.log(`Slideshow Directory - File "${fileName}" has been renamed.`);
                        this._removeFromQueue(fileName, index);
                        this._addToQueue(newFileName, newWallpaperData);
                    }
                } else if (fileInQueue && !fileInfo.isImage) {
                    // Remove the old file from the queue
                    this._removeFromQueue(fileName, index);
                    Logger.log(`Slideshow Directory - "${newFileName}" is not a valid image.`);
                } else if (fileInfo.isImage) {
                    // The old file wasn't in queue, but the renamed file type is valid.
                    Logger.log(`Slideshow Directory - Renamed "${fileName}" to "${newFileName}".`);
                    this._addToQueue(newFileName, newWallpaperData);
                } else {
                    Logger.log(`Slideshow Directory - "${newFileName}" is not a valid image.`);
                    break;
                }

                this._saveWallpaperQueue(this._wallpaperQueue);

                if (currentWallpaper === fileName || currentWallpaper === newFileName) {
                    // The renamed file was the current wallpaper, go to next slide in queue
                    this.goToNextSlide();
                }
                break;
            }
            case Gio.FileMonitorEvent.UNMOUNTED: {
                if (file.get_path() === slideshowDirectoryPath)
                    this._restart();
                break;
            }
            default:
                break;
            }
        });
    }

    _removeFromQueue(fileName, index) {
        this._wallpaperQueue.splice(index, 1);
        Logger.log(`Remove "${fileName}" from index:${index}`);

        if (index < this.slideIndex)
            this.slideIndex--;
    }

    _addToQueue(fileName, newWallpaperData) {
        const sortType = this._settings.get_enum('slideshow-queue-sort-type');
        const existingIndex = this._wallpaperQueue.findIndex(item => item.name === fileName);

        // If the wallpaper is already in queue, update the wallpaper data.
        if (existingIndex !== -1) {
            Logger.log(`"${fileName}" already in queue at index ${existingIndex}. Update data.`);
            if (sortType === SlideshowSortType.RANDOM) {
                this._wallpaperQueue.splice(existingIndex, 1, newWallpaperData);
            } else {
                this._removeFromQueue(fileName, existingIndex);
                const index = insertWallpaper(this._wallpaperQueue, newWallpaperData, sortType);
                Logger.log(`Reinserted "${fileName}" at index:${index}`);
                if (index <= this.slideIndex)
                    this.slideIndex++;
            }
            return;
        }

        let index;
        if (sortType === SlideshowSortType.RANDOM) {
            index = Math.floor(Math.random() * (this._wallpaperQueue.length + 1));
            this._wallpaperQueue.splice(index, 0, newWallpaperData);
        } else {
            index = insertWallpaper(this._wallpaperQueue, newWallpaperData, sortType);
        }

        Logger.log(`Insert "${fileName}" at index:${index}`);

        if (index <= this.slideIndex)
            this.slideIndex++;
    }

    _saveWallpaperQueue(wallpaperQueue) {
        this._settings.set_value('slideshow-queue', new GLib.Variant('aa{ss}', wallpaperQueue));
        this.queueLength = wallpaperQueue.length;
    }

    _onDurationChange() {
        Logger.log('Slide Duration or Absoulte Time setting changed. Current Slide Timer reset.');

        this._settings.set_int('slideshow-timer-remaining', this._getSlideDuration());
        this._settings.set_uint64('slideshow-time-of-slide-start', Date.now());
        const timer = this._getTimerDelay();
        this._maybeStartSlideshow(timer, true);
        this._slideshowStartTime = Date.now();
    }

    _getSlideDuration() {
        const [hours, minutes, seconds] = this._settings.get_value('slideshow-slide-duration').deep_unpack();
        const durationInSeconds = (hours * 3600) + (minutes * 60) + seconds;

        // Cap slide duration minimum to 5 seconds
        return Math.max(durationInSeconds, MIN_DURATION);
    }

    _getElapsedTime() {
        const lastSlideTime = this._settings.get_uint64('slideshow-time-of-slide-start');
        const dateNow = Date.now();

        const elapsedTime = dateNow - lastSlideTime;

        return elapsedTime;
    }

    _getTimerDelay() {
        const slideDuration = this._getSlideDuration();
        const remainingTimer = this._settings.get_int('slideshow-timer-remaining');
        const useAbsoluteTime = this._settings.get_boolean('slideshow-use-absolute-time-for-duration');

        if (!useAbsoluteTime) {
            if (remainingTimer === 0 || remainingTimer <= slideDuration)
                return Math.max(remainingTimer, MIN_DURATION);

            return Math.max(slideDuration, MIN_DURATION);
        }

        const lastSlideTime = this._settings.get_uint64('slideshow-time-of-slide-start');
        // This only occurs when 'slideshow-time-of-slide-start' is set to the default value.
        if (lastSlideTime === 0) {
            this._settings.set_int('slideshow-timer-remaining', slideDuration);
            return slideDuration;
        }

        const remainingTimerMs = remainingTimer * 1000;
        const elapsedTimeMs = this._getElapsedTime();

        const hasTimerElapsed = elapsedTimeMs >= remainingTimerMs;
        if (hasTimerElapsed) {
            Logger.log('Time elapsed exceeded slide duration. Next slide in 5 seconds.');
            this._settings.set_int('slideshow-timer-remaining', MIN_DURATION);
            return MIN_DURATION;
        }

        const absoluteTimeRemaining = Math.floor((remainingTimerMs - elapsedTimeMs) / 1000);
        const remainingTime = Math.max(absoluteTimeRemaining, MIN_DURATION);
        this._settings.set_int('slideshow-timer-remaining', remainingTime);

        Logger.log(`Time elapsed has not exceeded slide duration. Next slide in ${remainingTime} seconds.`);

        return remainingTime;
    }

    _getTimeRemainingString() {
        const timer = this._getTimerDelay();
        const hours = Math.floor(timer / 3600);
        const minutes = Math.floor((timer % 3600) / 60);
        const seconds = timer % 60;

        const timeString = [];
        if (hours > 0)
            timeString.push(_('%s hours').format(hours));
        if (minutes > 0 || hours > 0)
            timeString.push(_('%s minutes').format(minutes));
        timeString.push(_('%s seconds').format(seconds));

        return timeString.join(', ');
    }

    pause() {
        Logger.log('Pause slideshow.');

        this.saveTimer(true);
        this._endSlideshowTimer();

        const currentSlidePath = this._settings.get_string('slideshow-current-wallpaper');
        const prettyFileName = getPrettyFileName(currentSlidePath);
        const bodyText = _('Slideshow paused on slide %s').format(prettyFileName);
        notify(_('Slideshow Paused'), bodyText);
    }

    resume() {
        const timer = this._getTimerDelay();
        this._slideshowStartTime = Date.now();
        this._settings.set_uint64('slideshow-time-of-slide-start', this._slideshowStartTime);

        Logger.log('Resuming slideshow...');
        this._setWallpaper();
        Logger.log(`Next slide in ${timer} seconds.`);
        this._startSlideshowTimer(timer, true);

        const timeRemaining = this._getTimeRemainingString();
        const bodyText = _('Next slide in %s').format(timeRemaining);
        notify(_('Slideshow Resumed'), bodyText);
    }

    async _restart() {
        this._wallpaperQueue = [];
        this.slideIndex = -1;
        this._endSlideshowTimer();
        this._clearFileMonitor();
        await this._loadSlideshowQueue();

        const fileName = this._settings.get_string('slideshow-current-wallpaper');
        this._setPictureUriSettings(fileName);
    }

    async _reset() {
        Logger.log('Reset slideshow');
        this._wallpaperQueue = [];
        this.slideIndex = -1;
        this._saveWallpaperQueue([]);
        this._settings.set_int('slideshow-timer-remaining', this._getSlideDuration());
        this._settings.set_uint64('slideshow-time-of-slide-start', 0);

        this._endSlideshowTimer();
        this._clearFileMonitor();
        await this._loadSlideshowQueue();
    }

    saveTimer(forceSave = false) {
        if (this._settings.get_boolean('slideshow-pause') && !forceSave)
            return; // Don't update the timer if the slideshow is paused, unless forced

        const slideShowEndTime = Date.now();
        const elapsedTime = Math.floor((slideShowEndTime - this._slideshowStartTime) / 1000);

        const timerRemaining = this._settings.get_int('slideshow-timer-remaining');
        const remainingTimer = Math.max(timerRemaining - elapsedTime, 0);

        Logger.log(`Total 'On' Time: ${elapsedTime}`);
        Logger.log(`Save remaining timer: ${remainingTimer}`);
        this._settings.set_int('slideshow-timer-remaining', remainingTimer);
        this._settings.set_uint64('slideshow-time-of-slide-start', slideShowEndTime);
    }

    destroy() {
        Gio.Settings.unbind(this, 'slide-index');
        this._settings.disconnectObject(this);
        this.saveTimer();
        this._endSlideshowTimer();
        this._clearFileMonitor();
        this._backgroundSettings = null;
        this._extension = null;
        this._settings = null;
        this._wallpaperQueue = null;
    }
}
