import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import * as Config from 'resource:///org/gnome/Shell/Extensions/js/misc/config.js';

import * as Constants from './constants.js';

import {ExtensionPreferences, gettext as _, ngettext} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

function createOpenDirectoryButton(parent, settings, setting) {
    const button = new Gtk.Button({
        icon_name: 'folder-open-symbolic',
        tooltip_text: _('Open directory...'),
        valign: Gtk.Align.CENTER,
    });

    button.connect('clicked', () => {
        const directory = settings.get_string(setting);
        const file = Gio.file_new_for_path(directory);
        const fileUri = file.get_uri();
        Gtk.show_uri(parent.get_root(), fileUri, Gdk.CURRENT_TIME);
    });

    return button;
}

function createFileChooserButton(parent, settings, setting) {
    const fileChooserButton = new Gtk.Button({
        icon_name: 'folder-new-symbolic',
        tooltip_text: _('Choose new directory...'),
        valign: Gtk.Align.CENTER,
    });

    fileChooserButton.connect('clicked', () => {
        const dialog = new Gtk.FileChooserDialog({
            title: _('Select a directory'),
            transient_for: parent.get_root(),
            action: Gtk.FileChooserAction.SELECT_FOLDER,
        });
        dialog.add_button('_Cancel', Gtk.ResponseType.CANCEL);
        dialog.add_button('_Select', Gtk.ResponseType.ACCEPT);

        dialog.connect('response', (self, response) => {
            if (response === Gtk.ResponseType.ACCEPT) {
                const filePath = dialog.get_file().get_path();
                settings.set_string(setting, filePath);
                dialog.destroy();
            } else if (response === Gtk.ResponseType.CANCEL) {
                dialog.destroy();
            }
        });
        dialog.show();
    });

    return fileChooserButton;
}

export default class AzWallpaperPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const iconPath = `${this.path}/media`;

        let pageChangedId = settings.connect('changed::prefs-visible-page', () => {
            if (settings.get_string('prefs-visible-page') !== '')
                this._setVisiblePage(window, settings);
        });
        window.connect('close-request', () => {
            if (pageChangedId) {
                settings.disconnect(pageChangedId);
                pageChangedId = null;
            }
        });

        window.set_default_size(750, 800);

        const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        if (!iconTheme.get_search_path().includes(iconPath))
            iconTheme.add_search_path(iconPath);

        const slideShowPage = new SlideShowPage(settings);
        window.add(slideShowPage);

        const bingPage = new BingPage(settings);
        window.add(bingPage);

        const donatePage = new DonatePage(this.metadata);
        window.add(donatePage);

        const aboutPage = new AboutPage(settings, this.metadata, this.path);
        window.add(aboutPage);
        this._setVisiblePage(window, settings);
    }

    _setVisiblePage(window, settings) {
        const prefsVisiblePage = settings.get_string('prefs-visible-page');

        window.pop_subpage();
        if (prefsVisiblePage === '') {
            window.set_visible_page_name('HomePage');
        } else if (prefsVisiblePage === 'DonatePage') {
            window.set_visible_page_name('DonatePage');
        } else if (prefsVisiblePage === 'WhatsNewPage') {
            window.set_visible_page_name('AboutPage');
            const page = window.get_visible_page();
            page.showWhatsNewPage();
        }

        settings.set_string('prefs-visible-page', '');
    }
}

var SlideShowPage = GObject.registerClass(
class azWallpaperSlideShowPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('Slideshow'),
            icon_name: 'image-x-generic-symbolic',
            name: 'HomePage',
        });

        this._settings = settings;
        this._backgroundSettings = new Gio.Settings({schema: 'org.gnome.desktop.background'});

        const slideShowGroup = new Adw.PreferencesGroup({
            title: _('Slideshow Options'),
        });
        this.add(slideShowGroup);

        const slideShowDirRow = new Adw.ActionRow({
            title: _('Slideshow Directory'),
            subtitle: this._settings.get_string('slideshow-directory'),
        });
        this._settings.bind('slideshow-directory', slideShowDirRow, 'subtitle', Gio.SettingsBindFlags.DEFAULT);

        const fileChooserButton = createFileChooserButton(this, this._settings, 'slideshow-directory');
        const openDirectoryButton = createOpenDirectoryButton(this, this._settings, 'slideshow-directory');
        slideShowDirRow.add_prefix(openDirectoryButton);
        slideShowDirRow.add_suffix(fileChooserButton);
        slideShowDirRow.activatable_widget = fileChooserButton;
        slideShowGroup.add(slideShowDirRow);

        const queueSortingList = new Gtk.StringList();
        queueSortingList.append(_('Random'));
        queueSortingList.append(_('A-Z (Ascending Order)'));
        queueSortingList.append(_('Z-A (Descending Order)'));
        queueSortingList.append(_('Newest First (Date)'));
        queueSortingList.append(_('Oldest First (Date)'));

        const queueSortingRow = new Adw.ComboRow({
            title: _('Slideshow Queue Sorting'),
            model: queueSortingList,
            selected: this._settings.get_enum('slideshow-queue-sort-type'),
        });
        queueSortingRow.connect('notify::selected', widget => {
            this._settings.set_enum('slideshow-queue-sort-type', widget.selected);
            reShuffleRow.visible = widget.selected === 0;
        });
        slideShowGroup.add(queueSortingRow);

        const reShuffleRow = new Adw.SwitchRow({
            title: _('Shuffle Slideshow on Completion'),
            active: this._settings.get_boolean('slideshow-queue-reshuffle-on-complete'),
            visible: queueSortingRow.selected === 0,
        });
        reShuffleRow.connect('notify::active', widget => {
            this._settings.set_boolean('slideshow-queue-reshuffle-on-complete', widget.get_active());
        });
        slideShowGroup.add(reShuffleRow);

        const slideDurationRow = new Adw.ActionRow({
            title: _('Slide Duration'),
            subtitle: `${_('Hours')}:${_('Minutes')}:${_('Seconds')}`,
        });
        slideShowGroup.add(slideDurationRow);

        const updateSlideDuration = () => {
            if (this._updateTimeoutId)
                GLib.source_remove(this._updateTimeoutId);

            const hours = hoursSpinButton.get_value();
            const minutes = minutesSpinButton.get_value();
            const seconds = secondsSpinButton.get_value();

            this._updateTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                this._settings.set_value('slideshow-slide-duration', new GLib.Variant('(iii)', [hours, minutes, seconds]));
                this._updateTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            });
        };

        const slideDurationGrid = new Gtk.Grid({
            row_spacing: 2,
            column_spacing: 4,
        });
        slideDurationRow.add_suffix(slideDurationGrid);

        const [hours, minutes, seconds] = this._settings.get_value('slideshow-slide-duration').deep_unpack();
        const hoursSpinButton = this._createSpinButton(hours, 0, 24);
        hoursSpinButton.connect('value-changed', () => {
            updateSlideDuration();
        });
        const hoursLabel = new Gtk.Label({
            label: '∶',
            css_classes: ['title-3'],
            halign: Gtk.Align.START,
        });

        const minutesSpinButton = this._createSpinButton(minutes, 0, 60);
        minutesSpinButton.connect('value-changed', () => {
            updateSlideDuration();
        });
        const minutesLabel = new Gtk.Label({
            label: '∶',
            css_classes: ['title-3'],
            halign: Gtk.Align.START,
        });

        const secondsSpinButton = this._createSpinButton(seconds, 0, 60);
        secondsSpinButton.connect('value-changed', () => {
            updateSlideDuration();
        });

        slideDurationGrid.attach(hoursSpinButton, 0, 0, 1, 1);
        slideDurationGrid.attach(hoursLabel, 1, 0, 1, 1);
        slideDurationGrid.attach(minutesSpinButton, 2, 0, 1, 1);
        slideDurationGrid.attach(minutesLabel, 3, 0, 1, 1);
        slideDurationGrid.attach(secondsSpinButton, 4, 0, 1, 1);

        const slideDurationTypeRow = new Adw.SwitchRow({
            title: _('Use Absolute Time Elapsed for Slide Duration'),
            subtitle: _('Disabled: Slide duration counts down only while the extension is active.\nEnabled: Slide duration counts down even when the extension is inactive (e.g., Lock Screen, Power Off, etc.).'),
            active: this._settings.get_boolean('slideshow-use-absolute-time-for-duration'),
        });
        slideDurationTypeRow.connect('notify::active', widget => {
            this._settings.set_boolean('slideshow-use-absolute-time-for-duration', widget.get_active());
        });
        slideShowGroup.add(slideDurationTypeRow);

        const slideControlsRow = new Adw.ActionRow({
            title: _('Slide Controls'),
            subtitle: _('Control the current wallpaper in the slideshow'),
        });
        const prevSlideButton = new Gtk.Button({
            icon_name: 'media-seek-backward-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Previous Wallpaper'),
        });
        prevSlideButton.connect('clicked', () => {
            this._settings.set_int('slideshow-change-slide-event', 0);
            this._settings.set_int('slideshow-change-slide-event', 1);
        });

        const iconName = this._settings.get_boolean('slideshow-pause') ? 'start' : 'pause';
        const playPauseSlideButton = new Gtk.Button({
            icon_name: `media-playback-${iconName}-symbolic`,
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Play/Pause'),
        });
        this._settings.connect('changed::slideshow-pause', () => {
            const isPaused = this._settings.get_boolean('slideshow-pause');
            const icon = isPaused ? 'start' : 'pause';
            playPauseSlideButton.icon_name = `media-playback-${icon}-symbolic`;
        });
        playPauseSlideButton.connect('clicked', () => {
            const isPaused = this._settings.get_boolean('slideshow-pause');
            const newPaused = !isPaused;
            this._settings.set_boolean('slideshow-pause', newPaused);
        });
        const nextSlideButton = new Gtk.Button({
            icon_name: 'media-seek-forward-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Next Wallpaper'),
        });
        nextSlideButton.connect('clicked', () => {
            this._settings.set_int('slideshow-change-slide-event', 0);
            this._settings.set_int('slideshow-change-slide-event', 2);
        });

        slideControlsRow.add_suffix(prevSlideButton);
        slideControlsRow.add_suffix(playPauseSlideButton);
        slideControlsRow.add_suffix(nextSlideButton);
        slideShowGroup.add(slideControlsRow);

        const quickSettingsRow = new Adw.SwitchRow({
            title: _('Show Slide Controls in Quick Settings Menu'),
            active: this._settings.get_boolean('slideshow-show-quick-settings-entry'),
        });
        quickSettingsRow.connect('notify::active', widget => {
            this._settings.set_boolean('slideshow-show-quick-settings-entry', widget.get_active());
        });
        slideShowGroup.add(quickSettingsRow);

        const wallpaperOptionsGroup = new Adw.PreferencesGroup({
            title: _('Wallpaper Options'),
        });
        this.add(wallpaperOptionsGroup);

        const adjustmentList = new Gtk.StringList();
        adjustmentList.append(_('None'));
        adjustmentList.append(_('Wallpaper'));
        adjustmentList.append(_('Centered'));
        adjustmentList.append(_('Scaled'));
        adjustmentList.append(_('Streched'));
        adjustmentList.append(_('Zoom'));
        adjustmentList.append(_('Spanned'));

        const backgroundAdjustRow = new Adw.ComboRow({
            title: _('Image Adjustment'),
            model: adjustmentList,
            selected: this._backgroundSettings.get_enum('picture-options'),
        });
        backgroundAdjustRow.connect('notify::selected', widget => {
            this._backgroundSettings.set_enum('picture-options', widget.selected);
        });
        wallpaperOptionsGroup.add(backgroundAdjustRow);

        const backgroundOptionsGroup = new Adw.PreferencesGroup({
            title: _('Background Color Options'),
            description: _('The background fill type and colors to be shown when the wallpaper does not fill the screen'),
        });
        this.add(backgroundOptionsGroup);

        const backgroundShadingType = new Gtk.StringList();
        backgroundShadingType.append(_('Solid'));
        backgroundShadingType.append(_('Vertical Gradient'));
        backgroundShadingType.append(_('Horizontal Gradient'));

        const backgroundShadingTypeRow = new Adw.ComboRow({
            title: _('Fill Type'),
            model: backgroundShadingType,
            selected: this._backgroundSettings.get_enum('color-shading-type'),
        });
        backgroundShadingTypeRow.connect('notify::selected', widget => {
            this._backgroundSettings.set_enum('color-shading-type', widget.selected);
        });
        backgroundOptionsGroup.add(backgroundShadingTypeRow);

        const backgroundRGBA = new Gdk.RGBA();
        backgroundRGBA.parse(this._backgroundSettings.get_string('primary-color'));
        const backgroundColorButton = new Gtk.ColorDialogButton({
            valign: Gtk.Align.CENTER,
            dialog: new Gtk.ColorDialog(),
            rgba: backgroundRGBA,
        });
        backgroundColorButton.connect('notify::rgba', widget => {
            const colorString = widget.get_rgba().to_string();
            this._backgroundSettings.set_string('primary-color', colorString);
        });
        const backgroundColorRow = new Adw.ActionRow({
            title: _('Primary Color'),
            activatable_widget: backgroundColorButton,
        });
        backgroundColorRow.add_suffix(backgroundColorButton);
        backgroundOptionsGroup.add(backgroundColorRow);

        const backgroundSecondaryRGBA = new Gdk.RGBA();
        backgroundSecondaryRGBA.parse(this._backgroundSettings.get_string('secondary-color'));
        const backgroundSecondaryColorButton = new Gtk.ColorDialogButton({
            valign: Gtk.Align.CENTER,
            dialog: new Gtk.ColorDialog(),
            rgba: backgroundSecondaryRGBA,
        });
        backgroundSecondaryColorButton.connect('notify::rgba', widget => {
            const colorString = widget.get_rgba().to_string();
            this._backgroundSettings.set_string('secondary-color', colorString);
        });
        const backgroundSecondaryColorRow = new Adw.ActionRow({
            title: _('Secondary Color'),
            subtitle: _("Only shown if 'Fill Type' is a gradient."),
            activatable_widget: backgroundSecondaryColorButton,
        });
        backgroundSecondaryColorRow.add_suffix(backgroundSecondaryColorButton);
        backgroundOptionsGroup.add(backgroundSecondaryColorRow);
    }

    _createSpinButton(value, lower, upper) {
        const spinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower, upper, step_increment: 1, page_increment: 1, page_size: 0,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
            wrap: true,
            value,
            orientation: Gtk.Orientation.VERTICAL,
            width_chars: 2,
        });
        return spinButton;
    }
});

var BingPage = GObject.registerClass(
class azWallpaperBingPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('Bing Wallpapers'),
            icon_name: 'insert-image-symbolic',
            name: 'BingPage',
        });

        this._settings = settings;

        const bingDlSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: this._settings.get_boolean('bing-wallpaper-download'),
        });
        bingDlSwitch.connect('notify::active', widget => {
            this._settings.set_boolean('bing-wallpaper-download', widget.get_active());
        });
        const bingDLGroup = new Adw.PreferencesGroup({
            title: _('Download BING wallpaper of the day'),
            header_suffix: bingDlSwitch,
        });
        this.add(bingDLGroup);

        const bingDirectoryRow = new Adw.ActionRow({
            title: _('Download Directory'),
            subtitle: this._settings.get_string('bing-download-directory'),
        });
        this._settings.bind('bing-download-directory', bingDirectoryRow, 'subtitle', Gio.SettingsBindFlags.DEFAULT);

        const fileChooserButton = createFileChooserButton(this, this._settings, 'bing-download-directory');
        const openDirectoryButton = createOpenDirectoryButton(this, this._settings, 'bing-download-directory');
        bingDirectoryRow.add_suffix(fileChooserButton);
        bingDirectoryRow.add_prefix(openDirectoryButton);
        bingDirectoryRow.activatable_widget = fileChooserButton;
        bingDLGroup.add(bingDirectoryRow);

        const notifyOnErrorRow = new Adw.SwitchRow({
            title: _('Notify on Download Error'),
            subtitle: _('Displays a notification with error message and option to retry download.'),
            active: this._settings.get_boolean('bing-wallpaper-notify-on-error'),
        });
        notifyOnErrorRow.connect('notify::active', widget => {
            this._settings.set_boolean('bing-wallpaper-notify-on-error', widget.get_active());
        });
        bingDLGroup.add(notifyOnErrorRow);

        const resolutionsList = new Gtk.StringList();
        for (let i = 0; i < Constants.Resolutions.length; i++)
            resolutionsList.append(Constants.Resolutions[i]);

        const selectedResolution = this._settings.get_string('bing-wallpaper-resolution');
        const selectedResolutionIndex = Constants.Resolutions.indexOf(selectedResolution);

        const imageResolutionRow = new Adw.ComboRow({
            title: _('Image Resolution'),
            model: resolutionsList,
            selected: selectedResolutionIndex,
        });
        imageResolutionRow.connect('notify::selected', widget => {
            this._settings.set_string('bing-wallpaper-resolution', widget.selected_item.string);
        });
        bingDLGroup.add(imageResolutionRow);

        const locale = Intl.DateTimeFormat().resolvedOptions().locale;
        const regionNameInLocale = new Intl.DisplayNames([locale], {type: 'region'});
        const languageInLocale = new Intl.DisplayNames([locale], {type: 'language'});

        const marketsList = new Gtk.StringList();
        marketsList.append('Automatic');
        for (let i = 1; i < Constants.Markets.length; i++) {
            const regionName = regionNameInLocale.of(Constants.Markets[i].split('-')[1]);
            const regionLanguage = languageInLocale.of(Constants.Markets[i].split('-')[0]);
            marketsList.append(`${regionName}: ${regionLanguage}`);
        }

        const market = this._settings.get_string('bing-wallpaper-market');
        const selectedMarket = Constants.Markets.indexOf(market);

        const marketsRow = new Adw.ComboRow({
            /* TRANSLATORS: Markets are specific regions, defined by their language codes.
            See https://learn.microsoft.com/en-us/bing/search-apis/bing-image-search/reference/market-codes */
            title: _('Market Location'),
            /* TRANSLATORS: Markets are specific regions, defined by their language codes.
            See https://learn.microsoft.com/en-us/bing/search-apis/bing-image-search/reference/market-codes */
            subtitle: _('The market where the BING wallpaper comes from.\nWallpapers may vary in different markets.'),
            model: marketsList,
            selected: selectedMarket,
        });
        marketsRow.connect('notify::selected', widget => {
            this._settings.set_string('bing-wallpaper-market', Constants.Markets[widget.selected]);
        });
        bingDLGroup.add(marketsRow);

        const downloadsCountSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 1, upper: 8, step_increment: 1, page_increment: 1, page_size: 0,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
            wrap: true,
            value: this._settings.get_int('bing-wallpaper-download-count'),
        });
        downloadsCountSpinButton.connect('value-changed', widget => {
            if (this._updateTimeoutId)
                GLib.source_remove(this._updateTimeoutId);

            this._updateTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                this._settings.set_int('bing-wallpaper-download-count', widget.get_value());
                this._updateTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            });
        });
        const downloadsCountRow = new Adw.ActionRow({
            title: _('Images to Download'),
            subtitle: _('You can download up to 7 previous wallpapers plus the current wallpaper of the day.'),
        });
        downloadsCountRow.add_suffix(downloadsCountSpinButton);
        bingDLGroup.add(downloadsCountRow);

        const [deletionEnabled, amountToKeep] = this._settings.get_value('bing-wallpaper-delete-old').deep_unpack();
        const deleteImagesExpanderRow = new Adw.ExpanderRow({
            title: _('Delete Previously Downloaded Wallpapers'),
            subtitle: `${_('Stores a download history of wallpapers and limits how many wallpapers to keep.')}\n${
                _('Only works for wallpapers downloaded when this setting is enabled.')}\n${
                _('Previous download history is cleared when this setting is disabled.')}`,
            show_enable_switch: true,
            expanded: deletionEnabled,
            enable_expansion: deletionEnabled,
        });
        deleteImagesExpanderRow.connect('notify::enable-expansion', widget => {
            const [oldEnabled_, oldValue] = this._settings.get_value('bing-wallpaper-delete-old').deep_unpack();
            this._settings.set_value('bing-wallpaper-delete-old', new GLib.Variant('(bi)', [widget.enable_expansion, oldValue]));
        });
        bingDLGroup.add(deleteImagesExpanderRow);

        const amountToKeepRow = new Adw.ActionRow({
            title: ngettext('Keep %s most recent wallpaper',
                'Keep %s most recent wallpapers', amountToKeep).format(amountToKeep),
        });
        deleteImagesExpanderRow.add_row(amountToKeepRow);

        const amountToKeepSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 1, upper: 60, step_increment: 1, page_increment: 1, page_size: 0,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
            wrap: true,
            value: amountToKeep,
        });
        amountToKeepSpinButton.connect('value-changed', widget => {
            const newValue = widget.get_value();
            amountToKeepRow.title = ngettext('Keep %s most recent wallpaper',
                'Keep %s most recent wallpapers', newValue).format(newValue);

            confirmAmountToKeepButton.sensitive = true;
            confirmAmountToKeepButton.css_classes = ['suggested-action'];
        });
        amountToKeepRow.add_suffix(amountToKeepSpinButton);

        const confirmAmountToKeepButton = new Gtk.Button({
            icon_name: 'object-select-symbolic',
            sensitive: false,
            valign: Gtk.Align.CENTER,
            tooltip_text: _('Apply'),
        });
        confirmAmountToKeepButton.connect('clicked', () => {
            const [oldEnabled, oldValue_] = this._settings.get_value('bing-wallpaper-delete-old').deep_unpack();
            this._settings.set_value('bing-wallpaper-delete-old', new GLib.Variant('(bi)', [oldEnabled, amountToKeepSpinButton.get_value()]));
            confirmAmountToKeepButton.sensitive = false;
            confirmAmountToKeepButton.css_classes = [];
        });
        amountToKeepRow.add_suffix(confirmAmountToKeepButton);
    }
});

var AboutPage = GObject.registerClass(
class AzWallpaperAboutPage extends Adw.PreferencesPage {
    _init(settings, metadata, path) {
        super._init({
            title: _('About'),
            icon_name: 'help-about-symbolic',
            name: 'AboutPage',
        });

        const PROJECT_NAME = _('Wallpaper Slideshow');
        const PROJECT_DESCRIPTION = _('Optionally downloads BING wallpaper of the day.');
        const PROJECT_IMAGE = 'azwallpaper-logo';
        const SCHEMA_PATH = '/org/gnome/shell/extensions/azwallpaper/';

        const VERSION = metadata['version-name'] ? metadata['version-name'] : metadata.version.toString();

        // Project Logo, title, description-------------------------------------
        const projectHeaderGroup = new Adw.PreferencesGroup();
        this.add(projectHeaderGroup);

        const projectHeaderBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            hexpand: false,
            vexpand: false,
        });

        const projectImage = new Gtk.Image({
            margin_bottom: 5,
            icon_name: PROJECT_IMAGE,
            pixel_size: 100,
        });

        const projectTitleLabel = new Gtk.Label({
            label: _(PROJECT_NAME),
            css_classes: ['title-1'],
            vexpand: true,
            valign: Gtk.Align.FILL,
        });

        const projectDescriptionLabel = new Gtk.Label({
            label: PROJECT_DESCRIPTION,
            hexpand: false,
            vexpand: false,
        });
        projectHeaderBox.append(projectImage);
        projectHeaderBox.append(projectTitleLabel);
        projectHeaderBox.append(projectDescriptionLabel);
        projectHeaderGroup.add(projectHeaderBox);
        // -----------------------------------------------------------------------

        // Extension/OS Info------------------------------------------------
        const infoGroup = new Adw.PreferencesGroup();
        this.add(infoGroup);

        const projectVersionRow = new Adw.ActionRow({
            /* TRANSLATORS: 'PROJECT_NAME' Version*/
            title: _('%s Version').format(PROJECT_NAME),
        });
        projectVersionRow.add_suffix(new Gtk.Label({
            label: VERSION,
            css_classes: ['dim-label'],
        }));
        infoGroup.add(projectVersionRow);

        /* TRANSLATORS: 'PROJECT_NAME' - Release Notes*/
        const {subpage: whatsNewSubPage, page: whatsNewPage} = this._createSubPage(_('%s - Release Notes').format(PROJECT_NAME));
        this._whatsNewSubPage = whatsNewSubPage;
        const whatsNewRow = this._createSubPageRow(_("What's New"), whatsNewSubPage);
        infoGroup.add(whatsNewRow);

        const whatsNewGroup = new Adw.PreferencesGroup();
        whatsNewPage.add(whatsNewGroup);

        let releaseNotes = '';
        try {
            const fileContent = GLib.file_get_contents(`${path}/RELEASENOTES.md`)[1];
            const decoder = new TextDecoder('utf-8');
            releaseNotes = decoder.decode(fileContent);
            releaseNotes = releaseNotes.replace(/^(?:(\t| {4}))?- /gm,
                (_match, indent) => indent ? `${indent}◦ ` : '• '
            );
        } catch {
            releaseNotes = "Failed to load 'What's New' content.";
        }

        const releaseNotesLabel = new Gtk.Label({
            label: releaseNotes,
            use_markup: true,
            xalign: Gtk.Align.START,
            justify: Gtk.Justification.LEFT,
            wrap: true,
            margin_top: 14,
            margin_bottom: 14,
            margin_start: 14,
            margin_end: 14,
        });
        const releaseNotesBox = new Gtk.Box({
            css_classes: ['card'],
        });
        releaseNotesBox.append(releaseNotesLabel);
        whatsNewGroup.add(releaseNotesBox);

        const enableNotificationsGroup = new Adw.PreferencesGroup({
            vexpand: true,
            valign: Gtk.Align.END,
        });
        whatsNewPage.add(enableNotificationsGroup);

        const enableNotificationsSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: settings.get_boolean('update-notifier-enabled'),
        });
        enableNotificationsSwitch.connect('notify::active', widget => {
            settings.set_boolean('update-notifier-enabled', widget.get_active());
        });
        const enableNotificationsRow = new Adw.ActionRow({
            title: _('Message Tray Update Notification'),
            subtitle: _('Show a notification when %s receives an update.').format(_(PROJECT_NAME)),
            activatable_widget: enableNotificationsSwitch,
        });
        enableNotificationsRow.add_suffix(enableNotificationsSwitch);
        enableNotificationsGroup.add(enableNotificationsRow);

        if (metadata.commit) {
            const commitRow = new Adw.ActionRow({
                title: _('Git Commit'),
            });
            commitRow.add_suffix(new Gtk.Label({
                label: metadata.commit.toString(),
                css_classes: ['dim-label'],
            }));
            infoGroup.add(commitRow);
        }

        const gnomeVersionRow = new Adw.ActionRow({
            title: _('GNOME Version'),
        });
        gnomeVersionRow.add_suffix(new Gtk.Label({
            label: Config.PACKAGE_VERSION.toString(),
            css_classes: ['dim-label'],
        }));
        infoGroup.add(gnomeVersionRow);

        const osRow = new Adw.ActionRow({
            title: _('OS Name'),
        });

        const name = GLib.get_os_info('NAME');
        const prettyName = GLib.get_os_info('PRETTY_NAME');

        osRow.add_suffix(new Gtk.Label({
            label: prettyName ? prettyName : name,
            css_classes: ['dim-label'],
        }));
        infoGroup.add(osRow);

        const sessionTypeRow = new Adw.ActionRow({
            title: _('Windowing System'),
        });
        sessionTypeRow.add_suffix(new Gtk.Label({
            label: GLib.getenv('XDG_SESSION_TYPE') === 'wayland' ? 'Wayland' : 'X11',
            css_classes: ['dim-label'],
        }));
        infoGroup.add(sessionTypeRow);
        // -----------------------------------------------------------------------

        // Links -----------------------------------------------------------------
        /* TRANSLATORS: 'PROJECT_NAME' on GitLab*/
        const gitlabRow = this._createLinkRow(_('%s on GitLab').format(PROJECT_NAME), `${metadata.url}`);
        infoGroup.add(gitlabRow);

        const reportIssueRow = this._createLinkRow(_('Report an Issue'), `${metadata.url}/-/issues`);
        infoGroup.add(reportIssueRow);
        // -----------------------------------------------------------------------

        // Save/Load Settings----------------------------------------------------------
        const settingsGroup = new Adw.PreferencesGroup();
        this.add(settingsGroup);

        const settingsRow = new Adw.ActionRow({
            /* TRANSLATORS: 'PROJECT_NAME' Settings*/
            title: _('%s Settings').format(PROJECT_NAME),
        });
        const loadButton = new Gtk.Button({
            label: _('Load'),
            valign: Gtk.Align.CENTER,
        });
        loadButton.connect('clicked', () => {
            this._showFileChooser(
                _('Load Settings'),
                {action: Gtk.FileChooserAction.OPEN},
                '_Open',
                filename => {
                    if (filename && GLib.file_test(filename, GLib.FileTest.EXISTS)) {
                        const settingsFile = Gio.File.new_for_path(filename);
                        const [success_, pid_, stdin, stdout, stderr] =
                           GLib.spawn_async_with_pipes(
                               null,
                               ['dconf', 'load', SCHEMA_PATH],
                               null,
                               GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                               null
                           );

                        // TODO: Replace this with `GioUnix.OutputStream` later
                        const outputStream = new Gio.UnixOutputStream({fd: stdin, close_fd: true});
                        GLib.close(stdout);
                        GLib.close(stderr);
                        outputStream.splice(settingsFile.read(null),
                            Gio.OutputStreamSpliceFlags.CLOSE_SOURCE | Gio.OutputStreamSpliceFlags.CLOSE_TARGET, null);
                    }
                }
            );
        });
        const saveButton = new Gtk.Button({
            label: _('Save'),
            valign: Gtk.Align.CENTER,
        });
        saveButton.connect('clicked', () => {
            this._showFileChooser(
                _('Save Settings'),
                {action: Gtk.FileChooserAction.SAVE},
                '_Save',
                filename => {
                    const file = Gio.file_new_for_path(filename);
                    const raw = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
                    const out = Gio.BufferedOutputStream.new_sized(raw, 4096);

                    out.write_all(GLib.spawn_command_line_sync(`dconf dump ${SCHEMA_PATH}`)[1], null);
                    out.close(null);
                }
            );
        });
        settingsRow.add_suffix(saveButton);
        settingsRow.add_suffix(loadButton);
        settingsGroup.add(settingsRow);
        // -----------------------------------------------------------------------

        // Legal/Misc ----------------------------------------------------------------
        const miscGroup = new Adw.PreferencesGroup();
        this.add(miscGroup);

        const debugLogsSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            active: settings.get_boolean('debug-logs'),
        });
        debugLogsSwitch.connect('notify::active', widget => {
            settings.set_boolean('debug-logs', widget.get_active());
        });
        const debugLogsRow = new Adw.ActionRow({
            title: _('Enable Debug Mode'),
            subtitle: _('Show extensive messages in logs for debugging.'),
            activatable_widget: debugLogsSwitch,
        });
        debugLogsRow.add_suffix(debugLogsSwitch);
        miscGroup.add(debugLogsRow);

        const {subpage: legalSubPage, page: legalPage} = this._createSubPage(_('Legal'));
        const legalRow = this._createSubPageRow(_('Legal'), legalSubPage);
        miscGroup.add(legalRow);

        const gnuSoftwareGroup = new Adw.PreferencesGroup();
        legalPage.add(gnuSoftwareGroup);

        const warrantyLabel = _('This program comes with absolutely no warranty.');
        /* TRANSLATORS: this is the program license url; the string contains the name of the license as link text.*/
        const urlLabel = _('See the <a href="%s">%s</a> for details.').format('https://gnu.org/licenses/old-licenses/gpl-2.0.html', _('GNU General Public License, version 2 or later'));

        const gnuSofwareLabel = new Gtk.Label({
            label: `${_(warrantyLabel)}\n${_(urlLabel)}`,
            use_markup: true,
            justify: Gtk.Justification.CENTER,
        });
        gnuSoftwareGroup.add(gnuSofwareLabel);
        // -----------------------------------------------------------------------
    }

    showWhatsNewPage() {
        this.get_root().push_subpage(this._whatsNewSubPage);
    }

    _createSubPage(title) {
        const subpage = new Adw.NavigationPage({
            title,
        });

        const headerBar = new Adw.HeaderBar();

        const sidebarToolBarView = new Adw.ToolbarView();

        sidebarToolBarView.add_top_bar(headerBar);
        subpage.set_child(sidebarToolBarView);
        const page = new Adw.PreferencesPage();
        sidebarToolBarView.set_content(page);

        return {subpage, page};
    }

    _createSubPageRow(title, subpage) {
        const subpageRow = new Adw.ActionRow({
            title: _(title),
            activatable: true,
        });

        subpageRow.connect('activated', () => {
            this.get_root().push_subpage(subpage);
        });

        const goNextImage = new Gtk.Image({
            gicon: Gio.icon_new_for_string('go-next-symbolic'),
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            hexpand: false,
            vexpand: false,
        });

        subpageRow.add_suffix(goNextImage);
        return subpageRow;
    }

    _createLinkRow(title, uri, subtitle = null) {
        const image = new Gtk.Image({
            icon_name: 'adw-external-link-symbolic',
            valign: Gtk.Align.CENTER,
        });
        const linkRow = new Adw.ActionRow({
            title: _(title),
            activatable: true,
            tooltip_text: uri,
            subtitle: subtitle ? _(subtitle) : null,
        });
        linkRow.connect('activated', () => {
            Gtk.show_uri(this.get_root(), uri, Gdk.CURRENT_TIME);
        });
        linkRow.add_suffix(image);

        return linkRow;
    }

    _showFileChooser(title, params, acceptBtn, acceptHandler) {
        const dialog = new Gtk.FileChooserDialog({
            title: _(title),
            transient_for: this.get_root(),
            modal: true,
            action: params.action,
        });
        dialog.add_button('_Cancel', Gtk.ResponseType.CANCEL);
        dialog.add_button(acceptBtn, Gtk.ResponseType.ACCEPT);

        dialog.connect('response', (self, response) => {
            if (response === Gtk.ResponseType.ACCEPT) {
                try {
                    acceptHandler(dialog.get_file().get_path());
                } catch (e) {
                    console.log(`Wallpaper Slideshow - Filechooser error: ${e}`);
                }
            }
            dialog.destroy();
        });

        dialog.show();
    }
});

var DonatePage = GObject.registerClass(
class AzWallpaperDonatePage extends Adw.PreferencesPage {
    _init(metadata) {
        super._init({
            title: _('Donate'),
            icon_name: 'emote-love-symbolic',
            name: 'DonatePage',
        });

        const PROJECT_NAME = _('Wallpaper Slideshow');
        const PAYPAL_LINK = `https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=53CWA7NR743WC&item_name=Support+${metadata.name}&source=url`;
        const BUYMEACOFFEE_LINK = 'https://buymeacoffee.com/azaech';

        const donateGroup = new Adw.PreferencesGroup({
            title: _('Help Support %s').format(_(PROJECT_NAME)),
            description: _('Thank you for using %s! If you enjoy it and would like to help support its continued development, please consider making a donation.').format(_(PROJECT_NAME)),
        });
        this.add(donateGroup);

        const paypalRow = this._createLinkRow(_('Donate via PayPal'), 'settings-paypal-logo', PAYPAL_LINK);
        donateGroup.add(paypalRow);

        const buyMeACoffeeRow = this._createLinkRow(_('Donate via Buy Me a Coffee'), 'settings-bmc-logo', BUYMEACOFFEE_LINK);
        donateGroup.add(buyMeACoffeeRow);

        const thankYouGroup = new Adw.PreferencesGroup();
        this.add(thankYouGroup);
        const thankYouBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: true,
            valign: Gtk.Align.END,
        });
        thankYouGroup.add(thankYouBox);
        const thankYouLabel = new Gtk.Label({
            label: _('A huge thank you to everyone who has supported %s! Your support helps keep %s going. It is truly appreciated!').format(_(PROJECT_NAME), _(PROJECT_NAME)),
            css_classes: ['title-5'],
            hexpand: true,
            wrap: true,
            justify: Gtk.Justification.CENTER,
            halign: Gtk.Align.CENTER,
        });
        thankYouBox.append(thankYouLabel);
    }

    _createLinkRow(title, iconName, uri, subtitle = null) {
        const image = new Gtk.Image({
            icon_name: 'adw-external-link-symbolic',
            valign: Gtk.Align.CENTER,
        });
        const prefixImage = new Gtk.Image({
            icon_name: iconName,
            valign: Gtk.Align.CENTER,
        });
        const linkRow = new Adw.ActionRow({
            title: _(title),
            activatable: true,
            tooltip_text: uri,
            subtitle: subtitle ? _(subtitle) : null,
        });
        linkRow.connect('activated', () => {
            Gtk.show_uri(this.get_root(), uri, Gdk.CURRENT_TIME);
        });
        linkRow.add_suffix(image);
        linkRow.add_prefix(prefixImage);

        return linkRow;
    }
});
