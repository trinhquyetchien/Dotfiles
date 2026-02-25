import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import Cogl from 'gi://Cogl';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

let ImageWidget;
let imagePath;

let _timeoutId;
let _renderTimeoutId = null;


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
            clip_to_allocation: true,
            layout_manager: new Clutter.BinLayout(),
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
            this.settings.connect('changed::widget-size', this.queueWidgetUpdate),
            this.settings.connect('changed::widget-aspect-ratio', this.queueWidgetUpdate),
            this.settings.connect('changed::widget-position-x', this.queueWidgetPosition),
            this.settings.connect('changed::widget-position-y', this.queueWidgetPosition),
            this.settings.connect('changed::image-path', this.updateImagePath),
            this.settings.connect('changed::widget-timeout', this.updateTimeout),
            this.settings.connect('changed::widget-corner-radius', this.queueWidgetUpdate)
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
        if (_renderTimeoutId) {
            GLib.source_remove(_renderTimeoutId);
            _renderTimeoutId = null;
        }

    }

    queueWidgetUpdate = () => {
        if (_renderTimeoutId) {
            GLib.source_remove(_renderTimeoutId);
        }
        _renderTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
            this.updateWidgetSize();
            _renderTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    };

    queueWidgetPosition = () => {
        // Position isn't as heavy to update as the image mask, but still good to throttle during drags
        this.updateWidgetPosition();
    };

    updateWidgetSize = () => {
        let aspect_ratio = this.settings.get_double('widget-aspect-ratio');
        let widget_size = this.settings.get_int('widget-size');

        let target_w = widget_size * Math.sqrt(aspect_ratio) * 1.5;
        let target_h = (widget_size / Math.sqrt(aspect_ratio)) * 1.5;

        ImageWidget.set_width(target_w);
        ImageWidget.set_height(target_h);

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
            this._fileNamesCache = null;
        } else {
            const folderPath = this.settings.get_string('image-path');

            if (this._lastFolderPath !== folderPath || !this._fileNamesCache) {
                this._lastFolderPath = folderPath;
                this._fileNamesCache = [];

                let folder = Gio.File.new_for_path(folderPath);

                try {
                    if (folder.query_exists(null)) {
                        let enumerator = folder.enumerate_children(
                            'standard::name,standard::type',
                            Gio.FileQueryInfoFlags.NONE,
                            null
                        );

                        let info;
                        while ((info = enumerator.next_file(null)) !== null) {
                            const fileName = info.get_name();
                            const type = info.get_file_type();

                            if (type === Gio.FileType.DIRECTORY) {
                                try {
                                    const subFilePath = folder.get_child(fileName);
                                    const subEnumerator = subFilePath.enumerate_children(
                                        'standard::name',
                                        Gio.FileQueryInfoFlags.NONE,
                                        null
                                    );
                                    let subInfo;
                                    while ((subInfo = subEnumerator.next_file(null)) !== null) {
                                        this._fileNamesCache.push(`${fileName}/${subInfo.get_name()}`);
                                    }
                                    subEnumerator.close(null);
                                } catch (e) {
                                    console.log(`Picture-desktop-widget: Error reading subdirectory ${fileName}: ${e.message}`);
                                }
                            } else {
                                this._fileNamesCache.push(fileName);
                            }
                        }
                        enumerator.close(null);

                        // Filter for image files
                        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
                        this._fileNamesCache = this._fileNamesCache.filter(fileName =>
                            imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext))
                        );
                    }
                } catch (e) {
                    console.warn(`Picture-desktop-widget: Failed to enumerate directory ${folderPath}: ${e.message}`);
                    this._fileNamesCache = [];
                }
            }

            if (this._fileNamesCache && this._fileNamesCache.length > 0) {
                // Pick random one
                const randomIndex = Math.floor(Math.random() * this._fileNamesCache.length);
                const randomFile = this._fileNamesCache[randomIndex];
                imagePath = `${folderPath}/${randomFile}`;
            } else {
                console.log('Picture-desktop-widget: No files found');
                imagePath = '';
            }
        }
        this.settings.set_string('current-image-path', imagePath);
        this.updateWidget();
    };

    updateWidget = () => {

        let aspect_ratio = this.settings.get_double('widget-aspect-ratio');
        let widget_size = this.settings.get_int('widget-size');

        let target_w = widget_size * Math.sqrt(aspect_ratio) * 1.5;
        let target_h = (widget_size / Math.sqrt(aspect_ratio)) * 1.5;

        let size = Math.min(target_w, target_h);

        let radius_percent = this.settings.get_int('widget-corner-radius') / 100;
        imagePath = this.settings.get_string('current-image-path');

        // Xoá label cũ nếu có
        if (ImageWidget._label) {
            ImageWidget._label.destroy();
            ImageWidget._label = null;
        }

        let radius_px = Math.floor(radius_percent * size / 2);
        ImageWidget.set_style(`
        border-radius: ${radius_px}px;
        background-color: transparent;
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
            let w = target_w;
            let h = target_h;
            // Use slightly reduced HiDPI resolution to prevent crashes with HUGE widget sizes
            w = Math.max(Math.floor(w * 1.5), 100);
            h = Math.max(Math.floor(h * 1.5), 100);

            let max_dim = Math.max(w, h);

            let fallbackToCss = () => {
                if (!ImageWidget || !ImageWidget._imageLayer) return;
                ImageWidget._imageLayer.destroy_all_children();
                ImageWidget._imageLayer.set_style(`
                    background-image: url("file://${imagePath}");
                    background-size: cover;
                    background-repeat: no-repeat;
                    background-position: center;
                    border-radius: ${radius_px}px;
                `);
            };

            let file = Gio.File.new_for_path(imagePath);
            try {
                file.read_async(GLib.PRIORITY_DEFAULT, null, (source, res) => {
                    try {
                        let stream = source.read_finish(res);

                        // Load the image asynchronously from stream with downscaling to prevent main thread blocking!
                        GdkPixbuf.Pixbuf.new_from_stream_at_scale_async(
                            stream,
                            w * 2, h * 2,
                            true, // preserve_aspect_ratio
                            null,
                            (sourceStream, res2) => {
                                try {
                                    let originalPixbuf = GdkPixbuf.Pixbuf.new_from_stream_finish(res2);
                                    let imgW = originalPixbuf.get_width();
                                    let imgH = originalPixbuf.get_height();

                                    // Compute Aspect Ratio scaled dimensions (Cover Algorithm)
                                    let scaleX = w / imgW;
                                    let scaleY = h / imgH;
                                    let scale = Math.max(scaleX, scaleY);

                                    let newW = Math.round(imgW * scale);
                                    let newH = Math.round(imgH * scale);

                                    // Since it's already downscaled asynchronously, BILINEAR is fast and looks fine.
                                    let scaledPixbuf = originalPixbuf.scale_simple(newW, newH, GdkPixbuf.InterpType.BILINEAR);

                                    // Keep image centered during crop
                                    let offsetX = Math.floor((newW - w) / 2);
                                    let offsetY = Math.floor((newH - h) / 2);

                                    let squarePixbuf = GdkPixbuf.Pixbuf.new(
                                        originalPixbuf.get_colorspace(),
                                        true, // MUST HAVE ALPHA
                                        originalPixbuf.get_bits_per_sample(),
                                        max_dim,
                                        max_dim
                                    );
                                    squarePixbuf.fill(0x00000000);

                                    let drawX = Math.floor((max_dim - w) / 2);
                                    let drawY = Math.floor((max_dim - h) / 2);

                                    let scaledAlpha = scaledPixbuf;
                                    if (!scaledPixbuf.get_has_alpha()) {
                                        scaledAlpha = scaledPixbuf.add_alpha(false, 0, 0, 0);
                                    }
                                    scaledAlpha.copy_area(offsetX, offsetY, w, h, squarePixbuf, drawX, drawY);

                                    // Mask alpha pixels for rounded corners on the WxH area
                                    let pixel_radius = Math.floor(radius_percent * Math.min(w, h) / 2);
                                    if (pixel_radius > 0) {
                                        let pixels = squarePixbuf.get_pixels();
                                        let rowstride = squarePixbuf.get_rowstride();
                                        let n_channels = squarePixbuf.get_n_channels(); // 4

                                        let r_sq = pixel_radius * pixel_radius;
                                        for (let cy = 0; cy < pixel_radius; cy++) {
                                            for (let cx = 0; cx < pixel_radius; cx++) {
                                                let dx = pixel_radius - cx;
                                                let dy = pixel_radius - cy;
                                                if (dx * dx + dy * dy > r_sq) {
                                                    // Top-Left relative to WxH area
                                                    pixels[(drawY + cy) * rowstride + (drawX + cx) * n_channels + 3] = 0;
                                                    // Top-Right
                                                    pixels[(drawY + cy) * rowstride + (drawX + w - 1 - cx) * n_channels + 3] = 0;
                                                    // Bottom-Left
                                                    pixels[(drawY + h - 1 - cy) * rowstride + (drawX + cx) * n_channels + 3] = 0;
                                                    // Bottom-Right
                                                    pixels[(drawY + h - 1 - cy) * rowstride + (drawX + w - 1 - cx) * n_channels + 3] = 0;
                                                }
                                            }
                                        }
                                    }

                                    if (!ImageWidget || !ImageWidget._imageLayer) return;

                                    let image = new Clutter.Image();
                                    let success_image = image.set_data(
                                        squarePixbuf.get_pixels(),
                                        squarePixbuf.get_has_alpha() ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGB_888,
                                        max_dim,
                                        max_dim,
                                        squarePixbuf.get_rowstride()
                                    );

                                    // Clear any leftover CSS URL caches / images
                                    ImageWidget._imageLayer.set_style(`
                                        border-radius: ${radius_px}px;
                                    `);
                                    ImageWidget._imageLayer.destroy_all_children();

                                    if (success_image) {
                                        let imgActor = new Clutter.Actor({
                                            width: target_w,
                                            height: target_h,
                                            content_gravity: Clutter.ContentGravity.RESIZE_ASPECT,
                                        });
                                        imgActor.set_content(image);
                                        ImageWidget._imageLayer.add_child(imgActor);
                                    } else {
                                        fallbackToCss();
                                    }

                                    // Force Garbage Collection to immediately release old unmanaged C++ Pixbuf data 
                                    // avoiding long GJS garbage collection delays.
                                    let System = imports.system;
                                    System.gc();

                                } catch (e) {
                                    console.log(`Picture-desktop-widget: Failed to generate direct memory icon: ${e.message}`);
                                    fallbackToCss();
                                }
                            }
                        );
                    } catch (e) {
                        console.log(`Picture-desktop-widget: Stream read failed: ${e.message}`);
                        fallbackToCss();
                    }
                });
            } catch (e) {
                console.log(`Picture-desktop-widget: Setup failed: ${e.message}`);
                fallbackToCss();
            }
        }
    };
}
