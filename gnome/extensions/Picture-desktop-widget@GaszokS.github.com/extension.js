import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

let ImageWidget;
let imagePath;
let _timeoutId;
let currentTempFile = null;

function cleanupTempFile() {
    if (currentTempFile) {
        let file = Gio.File.new_for_path(currentTempFile);
        try {
            if (file.query_exists(null)) {
                file.delete(null);
            }
        } catch (e) {
            console.log(`Failed to delete temp file: ${e}`);
        }
        currentTempFile = null;
    }
}

export default class Picture_desktop_widget_extension extends Extension {
    enable() {

        this.settings = this.getSettings();

        // Check if the timeout is passed
        let lastUpdateTime = this.settings.get_int("time-last-update")
        let currentTime = Math.floor(Date.now() / 1000);
        let passedTime = currentTime - lastUpdateTime;

        // Create widget
        ImageWidget = new St.Widget({
            layout_manager: new Clutter.BinLayout()
        });
        ImageWidget._imageLayer = new St.Widget({
            x_expand: true,
            y_expand: true
        });

        ImageWidget.add_child(ImageWidget._imageLayer);
        this.updateWidgetSize();
        this.updateWidgetPosition();
        if (lastUpdateTime === 0 || passedTime >= this.settings.get_int('widget-timeout')) {
            this.updateImagePath();
        } else {
            this.updateWidget();
        }

        // Add to background group (under windows)
        Main.layoutManager._backgroundGroup.add_child(ImageWidget);

        // Start repeating task
        this.updateTimeout();

        // Listen for changes
        this._settingsChangedIds = [];

        // Connect signals and store their IDs
        this._settingsChangedIds.push(
            this.settings.connect('changed::widget-size', this.updateWidgetSize),
            this.settings.connect('changed::widget-aspect-ratio', this.updateWidgetSize),
            this.settings.connect('changed::widget-position-x', this.updateWidgetPosition),
            this.settings.connect('changed::widget-position-y', this.updateWidgetPosition),
            this.settings.connect('changed::image-path', this.updateImagePath),
            this.settings.connect('changed::widget-timeout', this.updateTimeout),
            this.settings.connect('changed::widget-corner-radius', this.updateWidget)
        );
    }

    disable() {
        ImageWidget?.destroy();
        ImageWidget = null;

        if (this._settingsChangedIds) {
            this._settingsChangedIds.forEach(id => this.settings.disconnect(id));
            this._settingsChangedIds = [];
        }

        this.settings = null;

        if (_timeoutId) {
            GLib.source_remove(_timeoutId);
            _timeoutId = null;
        }
        cleanupTempFile();
    }

    updateWidgetSize = () => {
        let newSize = this.settings.get_int('widget-size');
        let newAspectRatio = this.settings.get_double('widget-aspect-ratio');
        let newWidth = newSize * Math.sqrt(newAspectRatio);
        let newHeight = newSize / Math.sqrt(newAspectRatio);
        ImageWidget.set_width(newWidth);
        ImageWidget.set_height(newHeight);

        this.updateWidget();
    };

    updateWidgetPosition = () => {
        let newX = this.settings.get_int('widget-position-x');
        let newY = this.settings.get_int('widget-position-y');
        ImageWidget.set_position(newX, newY);
    };

    updateTimeout = () => {
        // Check if the timeout is passed
        let nextTimeout;
        let lastUpdateTime = this.settings.get_int("time-last-update")
        let currentTime = Math.floor(Date.now() / 1000);
        let passedTime = currentTime - lastUpdateTime;
        console.log(`Last update time: ${lastUpdateTime}, Current time: ${currentTime}, Passed time: ${passedTime}`);

        if (lastUpdateTime === 0 || passedTime >= this.settings.get_int('widget-timeout')) {
            nextTimeout = this.settings.get_int('widget-timeout');
        } else {
            nextTimeout = this.settings.get_int('widget-timeout') - passedTime;
        }

        // Clear previous timeout if it exists
        if (_timeoutId) {
            GLib.source_remove(_timeoutId);
        }

        // Set a new timeout
        _timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, nextTimeout, () => {
            this.updateImagePath();
            return true;
        });

        // Update the last update time in settings
        this.settings.set_int("time-last-update", Math.floor(Date.now() / 1000));
    };

    updateImagePath = () => {
        if (this.settings.get_string('image-path') === '') {
            imagePath = '';
        } else {
            const folderPath = this.settings.get_string('image-path');
            const folder = Gio.File.new_for_path(folderPath);
            const enumerator = folder.enumerate_children(
                'standard::name',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            // Collect all file names
            let fileNames = [];
            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                const fileName = info.get_name();
                const filePath = folder.get_child(fileName);

                // Include files from subdirectories
                if (info.get_file_type() === Gio.FileType.DIRECTORY) {
                    try {
                        const subEnumerator = filePath.enumerate_children(
                            'standard::name',
                            Gio.FileQueryInfoFlags.NONE,
                            null
                        );
                        let subInfo;
                        while ((subInfo = subEnumerator.next_file(null)) !== null) {
                            fileNames.push(`${fileName}/${subInfo.get_name()}`);
                        }
                        subEnumerator.close(null);
                    } catch (e) {
                        log(`Error reading subdirectory: ${e}`);
                    }
                } else {
                    fileNames.push(fileName);
                }
            }
            enumerator.close(null);

            // Filter for image files
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
            fileNames = fileNames.filter(fileName =>
                imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
            );

            if (fileNames.length > 0) {
                // Pick random one
                const randomIndex = Math.floor(Math.random() * fileNames.length);
                const randomFile = fileNames[randomIndex];
                imagePath = `${folderPath}/${randomFile}`;
            } else {
                log('No files found');
            }
        }
        this.settings.set_string('current-image-path', imagePath);
        this.updateWidget();
    };

    updateWidget = () => {

        let aspect_ratio = this.settings.get_double('widget-aspect-ratio');

        let size;
        if (aspect_ratio <= 1) {
            size = this.settings.get_int('widget-size') * Math.sqrt(aspect_ratio);
        } else {
            size = this.settings.get_int('widget-size') / Math.sqrt(aspect_ratio);
        }

        let radius_percent = this.settings.get_int('widget-corner-radius') / 100;
        imagePath = this.settings.get_string('current-image-path');

        // Xoá label cũ nếu có
        if (ImageWidget._label) {
            ImageWidget._label.destroy();
            ImageWidget._label = null;
        }

        // Luôn set border ở parent
        let radius_px = Math.floor(radius_percent * size / 2);
        ImageWidget.set_style(`
        border-radius: ${radius_px}px;
    `);

        if (!imagePath) {

            // Xoá ảnh
            ImageWidget._imageLayer.set_style(null);

            // Thêm nền đen
            ImageWidget.set_style(`
            background-color: rgba(0,0,0,1);
            border-radius: ${radius_px}px;
        `);

            let label = new St.Label({
                text: _("Add a path\n to folder with images")
            });

            label.set_style(`
            color: white;
            font-size: ${size / 10}px;
            text-align: center;
        `);

            ImageWidget.add_child(label);
            ImageWidget._label = label;

        } else {
            let displayPath = imagePath;
            try {
                let w = ImageWidget.width > 0 ? ImageWidget.width : size;
                let h = ImageWidget.height > 0 ? ImageWidget.height : size;
                // Scale up resolution for HiDPI to keep images sharp
                w = Math.max(Math.floor(w * 2), 100);
                h = Math.max(Math.floor(h * 2), 100);

                let tempPath = GLib.get_tmp_dir() + '/pic_widget_' + GLib.uuid_string_random() + '.jpg';
                let pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(imagePath, w, h);
                pixbuf.savev(tempPath, 'jpeg', ['quality'], ['100']);

                cleanupTempFile();
                currentTempFile = tempPath;
                displayPath = tempPath;
            } catch (e) {
                console.log(`Picture-desktop-widget: Failed to scale image: ${e.message}`);
                // fallback to original path if scaling fails
            }

            let radius_px = Math.floor(radius_percent * size / 2);
            // Use background-size: cover and border-radius so the image matches the widget border properly
            ImageWidget._imageLayer.set_style(`
            background-image: url("file://${displayPath}");
            background-size: cover;
            background-repeat: no-repeat;
            background-position: center;
            border-radius: ${radius_px}px;
        `);
        }
    };
}
