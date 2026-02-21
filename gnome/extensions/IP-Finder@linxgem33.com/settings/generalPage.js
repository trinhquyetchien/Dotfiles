import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {ElementKey, ElementType} from '../utils.js';

function updatePanelElement(settings, elementId, key, newValue) {
    const elements = settings.get_value('panel-button-elements').deepUnpack();

    const match = elements.find(e => e.id.unpack() === elementId);
    match[key] = new GLib.Variant('b', newValue);

    settings.set_value('panel-button-elements', new GLib.Variant('aa{sv}', elements));
}

function getTitleForElementId(id) {
    switch (id) {
    case ElementType.VPN_STATUS_ICON:
        return _('VPN Status Icon');
    case ElementType.IP_ADDRESS:
        return _('IP Address');
    case ElementType.COUNTRY_FLAG:
        return _('Country Flag');
    case ElementType.LOCATION:
        return _('Location');
    default:
        return null;
    }
}

function getTitleForElementKey(key) {
    switch (key) {
    case ElementKey.ALWAYS_SHOW:
        return {title: _('Always Show'), subtitle: _('Disable to show only when VPN on.')};
    case ElementKey.SHOW_CITY:
        return {title: _('Show City')};
    case ElementKey.SHOW_REGION:
        return {title: _('Show Region')};
    case ElementKey.SHOW_COUNTRY:
        return {title: _('Show Country')};
    case ElementKey.COLORIZE:
        return {title: _('Colorize based on VPN Status')};
    case ElementKey.MASK_IP:
        return {title: _('Mask IP Address')};
    default:
        return {};
    }
}

const ApiListItem = GObject.registerClass({
    Properties: {
        'name': GObject.ParamSpec.string('name', 'Name', 'Name', GObject.ParamFlags.READWRITE, ''),
        'icon_name': GObject.ParamSpec.string('icon_name', 'Icon Name', 'Icon Name', GObject.ParamFlags.READWRITE, ''),
        'https': GObject.ParamSpec.boolean('https', 'https', 'https', GObject.ParamFlags.READWRITE, false),
    },
}, class Item extends GObject.Object {});

export const GeneralPage = GObject.registerClass(
class IpFinderGeneralPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
            name: 'GeneralPage',
        });

        this._settings = settings;

        const generalGroup = new Adw.PreferencesGroup({
            title: _('General'),
        });
        this.add(generalGroup);

        const enabledOnVPNSwitch = new Gtk.Switch({
            active: this._settings.get_boolean('enabled-on-vpn-only'),
            valign: Gtk.Align.CENTER,
        });
        enabledOnVPNSwitch.connect('notify::active', widget => {
            this._settings.set_boolean('enabled-on-vpn-only', widget.get_active());
        });

        const enabledOnVPNRow = new Adw.ActionRow({
            title: _('Only Show Panel Button When Connected to a VPN'),
            activatable_widget: enabledOnVPNSwitch,
        });
        enabledOnVPNRow.add_suffix(enabledOnVPNSwitch);
        generalGroup.add(enabledOnVPNRow);

        const panelPositions = new Gtk.StringList();
        panelPositions.append(_('Left'));
        panelPositions.append(_('Center'));
        panelPositions.append(_('Right'));
        const panelPositionRow = new Adw.ComboRow({
            title: _('Position in Panel'),
            model: panelPositions,
            selected: this._settings.get_enum('position-in-panel'),
        });
        panelPositionRow.connect('notify::selected', widget => {
            this._settings.set_enum('position-in-panel', widget.selected);
        });
        generalGroup.add(panelPositionRow);

        const panelPositionOffsetButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 15,
                step_increment: 1,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
            value: this._settings.get_int('position-in-panel-offset'),
        });
        panelPositionOffsetButton.connect('notify::value', widget => {
            this._settings.set_int('position-in-panel-offset', widget.get_value());
        });

        const panelPositionOffsetRow = new Adw.ActionRow({
            title: _('Position in Panel Offset'),
            activatable_widget: panelPositionOffsetButton,
        });
        panelPositionOffsetRow.add_suffix(panelPositionOffsetButton);
        generalGroup.add(panelPositionOffsetRow);

        const apiOptions = [
            {name: 'ipinfo.io', https: true},
            {name: 'ip-api.com', https: false},
            {name: 'ipapi.co', https: true},
            {name: 'ipwhois.io', https: true},
        ];

        const apiListStore = new Gio.ListStore();
        apiOptions.forEach(api => {
            const iconName = api.https ? 'changes-prevent-symbolic' : 'changes-allow-symbolic';
            const apiListItem = new ApiListItem({
                name: api.name,
                icon_name: iconName,
                https: api.https,
            });
            apiListStore.append(apiListItem);
        });

        const factory = new Gtk.SignalListItemFactory();
        factory.connect('setup', (factory_, listItem) => {
            const box = new Gtk.Grid({
                column_spacing: 8,
                valign: Gtk.Align.CENTER,
            });

            const image = new Gtk.Image({
                pixel_size: 16,
            });
            const label = new Gtk.Label({
                valign: Gtk.Align.CENTER,
            });

            box.attach(image, 0, 0, 1, 1);
            box.attach(label, 1, 0, 1, 1);
            listItem.set_child(box);

            listItem._image = image;
            listItem._label = label;
        });

        factory.connect('bind', (factory_, listItem) => {
            const item = listItem.get_item();

            listItem._label.set_label(item.name);
            listItem._image.gicon = Gio.icon_new_for_string(item.icon_name);
            listItem._image.css_classes = item.https ? ['success'] : ['error'];
        });

        const apiMenu = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            factory,
            model: apiListStore,
            selected: this._settings.get_enum('api-service'),
        });

        const infoButton = new Gtk.Button({
            icon_name: 'help-about-symbolic',
            valign: Gtk.Align.CENTER,
        });
        infoButton.connect('clicked', () => {
            const dialog = new Gtk.MessageDialog({
                text: _('All API services with a green padlock use the HTTPS protocol for encryption for secure communication over a computer network while any API service with a red padlock does not.'),
                use_markup: true,
                buttons: Gtk.ButtonsType.OK,
                message_type: Gtk.MessageType.INFO,
                transient_for: this.get_root(),
                modal: true,
            });
            dialog.connect('response', () => {
                dialog.destroy();
            });
            dialog.show();
        });
        const apiRow = new Adw.ActionRow({
            title: _('API Service'),
            activatable_widget: apiMenu,
        });
        apiRow.add_suffix(infoButton);
        apiRow.add_suffix(apiMenu);
        apiMenu.connect('notify::selected', widget => {
            this._settings.set_enum('api-service', widget.selected);
        });
        generalGroup.add(apiRow);

        const headerSuffixBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
        });
        const resetElementsButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            tooltip_text: _('Reset Panel Elements'),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });

        headerSuffixBox.append(resetElementsButton);

        const panelGroup = new Adw.PreferencesGroup({
            title: _('Elements to Show on Panel'),
            description: _('Drag and drop to change the order of the elements on the panel.'),
            header_suffix: headerSuffixBox,
        });
        this.add(panelGroup);
        this._elements = [];

        resetElementsButton.connect('clicked', () => {
            const dialog = new Gtk.MessageDialog({
                text: `<b>${_('Reset Panel Elements?')}</b>`,
                secondary_text: _('All Panel Elements will be reset to the default value.'),
                use_markup: true,
                buttons: Gtk.ButtonsType.YES_NO,
                message_type: Gtk.MessageType.WARNING,
                transient_for: this.get_root(),
                modal: true,
            });
            dialog.connect('response', (widget, response) => {
                if (response === Gtk.ResponseType.YES) {
                    for (let i = 0; i < this._elements.length; i++) {
                        const row = this._elements[i];
                        panelGroup.remove(row);
                    }

                    this._elements = [];

                    const defaultElements = this._settings.get_default_value('panel-button-elements').deep_unpack();
                    this._settings.set_value('panel-button-elements', new GLib.Variant('aa{sv}', defaultElements));

                    const elements = this._settings.get_value('panel-button-elements').recursiveUnpack();
                    elements.forEach(element => {
                        this._addDisplayRow(element, panelGroup);
                    });
                }
                dialog.destroy();
            });
            dialog.show();
        });

        const elements = this._settings.get_value('panel-button-elements').recursiveUnpack();
        elements.forEach(element => {
            this._addDisplayRow(element, panelGroup);
        });

        const popupMenuGroup = new Adw.PreferencesGroup({
            title: _('Menu Options'),
        });
        this.add(popupMenuGroup);

        const mapTileExpanderRow = new Adw.ExpanderRow({
            title: _('Show Map Tile Image'),
            show_enable_switch: true,
            enable_expansion: this._settings.get_boolean('show-map-tile'),
            expanded: false,
        });
        mapTileExpanderRow.connect('notify::enable-expansion', widget => {
            this._settings.set_boolean('show-map-tile', widget.enable_expansion);
        });
        popupMenuGroup.add(mapTileExpanderRow);

        const tileZoomSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 7,
                upper: 13,
                step_increment: 1,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
            value: this._settings.get_int('tile-zoom'),
        });
        tileZoomSpinButton.connect('notify::value', widget => {
            this._settings.set_int('tile-zoom', widget.get_value());
        });

        const tileZoomRow = new Adw.ActionRow({
            title: _('Zoom Factor'),
            activatable_widget: tileZoomSpinButton,
        });
        tileZoomRow.add_suffix(tileZoomSpinButton);
        mapTileExpanderRow.add_row(tileZoomRow);

        const tileSizeSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 100,
                upper: 400,
                step_increment: 1,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
            value: this._settings.get_int('tile-size'),
        });
        tileSizeSpinButton.connect('notify::value', widget => {
            this._settings.set_int('tile-size', widget.get_value());
        });

        const tileSizeRow = new Adw.ActionRow({
            title: _('Image Size (px)'),
            activatable_widget: tileSizeSpinButton,
        });
        tileSizeRow.add_suffix(tileSizeSpinButton);
        mapTileExpanderRow.add_row(tileSizeRow);

        const tileRadiusSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 999,
                step_increment: 1,
            }),
            climb_rate: 1,
            digits: 0,
            numeric: true,
            valign: Gtk.Align.CENTER,
            value: this._settings.get_int('tile-border-radius'),
        });
        tileRadiusSpinButton.connect('notify::value', widget => {
            this._settings.set_int('tile-border-radius', widget.get_value());
        });

        const tileRadiusRow = new Adw.ActionRow({
            title: _('Border Radius (px)'),
            activatable_widget: tileRadiusSpinButton,
        });
        tileRadiusRow.add_suffix(tileRadiusSpinButton);
        mapTileExpanderRow.add_row(tileRadiusRow);

        const menuVpnStatusSwitch = new Gtk.Switch({
            active: this._settings.get_boolean('vpn-status-in-menu'),
            valign: Gtk.Align.CENTER,
        });
        menuVpnStatusSwitch.connect('notify::active', widget => {
            this._settings.set_boolean('vpn-status-in-menu', widget.get_active());
        });

        const menuVpnStatusRow = new Adw.ActionRow({
            title: _('Show VPN Status'),
            activatable_widget: menuVpnStatusSwitch,
        });
        menuVpnStatusRow.add_suffix(menuVpnStatusSwitch);
        popupMenuGroup.add(menuVpnStatusRow);

        const showButtonsSwitch = new Gtk.Switch({
            active: this._settings.get_boolean('show-menu-buttons'),
            valign: Gtk.Align.CENTER,
        });
        showButtonsSwitch.connect('notify::active', widget => {
            this._settings.set_boolean('show-menu-buttons', widget.get_active());
        });

        const showButtonsRow = new Adw.ActionRow({
            title: _('Show Buttons'),
            activatable_widget: showButtonsSwitch,
        });
        showButtonsRow.add_suffix(showButtonsSwitch);
        popupMenuGroup.add(showButtonsRow);

        const maskIpSwitch = new Gtk.Switch({
            active: this._settings.get_boolean('mask-ip-in-menu'),
            valign: Gtk.Align.CENTER,
        });
        maskIpSwitch.connect('notify::active', widget => {
            this._settings.set_boolean('mask-ip-in-menu', widget.get_active());
        });

        const maskIpRow = new Adw.ActionRow({
            title: _('Mask IP Address'),
            activatable_widget: maskIpSwitch,
        });
        maskIpRow.add_suffix(maskIpSwitch);
        popupMenuGroup.add(maskIpRow);
    }

    _addDisplayRow(element, group) {
        const title = getTitleForElementId(element.id);

        if (!element.id  || !title)
            return;

        const row = new DragRow({
            title: _(title),
            element_type: element.id,
            switch_active: element.enabled,
        }, this._settings);

        row.connect('index-changed', (_self, index) => this._saveSettings(element.id, index));
        group.add(row);
        this._elements.push(row);
    }

    _saveSettings(elementId, toIndex) {
        const elements = this._settings.get_value('panel-button-elements').deepUnpack();

        const fromIndex = elements.findIndex(e => e.id.unpack() === elementId);
        if (fromIndex === -1)
            return;

        const [moved] = elements.splice(fromIndex, 1);
        elements.splice(toIndex, 0, moved);

        this._settings.set_value('panel-button-elements', new GLib.Variant('aa{sv}', elements));
    }
});

const ElementOptionsDialog = GObject.registerClass({
    Signals: {
        'response': {param_types: [GObject.TYPE_INT]},
    },
}, class IpFinderElementOptionsDialog extends Adw.PreferencesWindow {
    _init(settings, title, element, parent) {
        super._init({
            title,
            transient_for: parent.get_root(),
            modal: true,
            search_enabled: false,
        });
        this.set_default_size(625, 350);
        this._settings = settings;
        this._element = element;

        this.page = new Adw.PreferencesPage();
        this.pageGroup = new Adw.PreferencesGroup();

        this.add(this.page);
        this.page.add(this.pageGroup);

        for (const key in element) {
            if (key === 'id' || key === 'enabled')
                continue;

            const {title: rowTitle, subtitle} = getTitleForElementKey(key);

            // Will need new implementation if adding new element settings other than a bool value
            if (rowTitle)
                this.addSwitchRow(key, rowTitle, subtitle);
        }
    }

    addSwitchRow(key, title, subtitle) {
        const switchButton = new Gtk.Switch({
            active: this._element[key],
            valign: Gtk.Align.CENTER,
        });
        switchButton.connect('notify::active', widget => {
            updatePanelElement(this._settings, this._element.id, key, widget.get_active());
        });
        const row = new Adw.ActionRow({
            title: _(title),
            subtitle: subtitle ? _(subtitle) : null,
            activatable_widget: switchButton,
        });
        row.add_suffix(switchButton);
        this.pageGroup.add(row);
    }
});

export const DragRow = GObject.registerClass({
    Properties: {
        'switch-active': GObject.ParamSpec.boolean(
            'switch-active', 'switch-active', 'switch-active',
            GObject.ParamFlags.READWRITE,
            false),
        'element-type': GObject.ParamSpec.string(
            'element-type', 'element-type', 'element-type',
            GObject.ParamFlags.READWRITE,
            ''),
    },
    Signals: {
        'index-changed':  {param_types: [GObject.TYPE_INT]},
    },
}, class IpFinderDragRow extends Adw.ActionRow {
    _init(params, settings) {
        super._init(params);

        this._settings = settings;
        this._params = params;

        this.dragIcon = new Gtk.Image({
            gicon: Gio.icon_new_for_string('list-drag-handle-symbolic'),
            pixel_size: 12,
        });
        this.add_prefix(this.dragIcon);

        if (this.element_type !== ElementType.COUNTRY_FLAG) {
            const optionsButton = new Gtk.Button({
                icon_name: 'applications-system-symbolic',
                valign: Gtk.Align.CENTER,
                sensitive: this.switch_active,
            });
            this.add_suffix(optionsButton);

            optionsButton.connect('clicked', () => {
                const elements = this._settings.get_value('panel-button-elements').recursiveUnpack();
                const match = elements.find(e => e.id === this.element_type);
                const optionsDialog = new ElementOptionsDialog(this._settings, this.title, match, this.get_root());
                optionsDialog.show();
            });

            this.bind_property('switch-active', optionsButton, 'sensitive', GObject.BindingFlags.DEFAULT);

            this.add_suffix(new Gtk.Separator({
                orientation: Gtk.Orientation.VERTICAL,
                margin_top: 13,
                margin_bottom: 13,
            }));
        }

        const enabledSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            vexpand: false,
            active: this.switch_active,
        });
        enabledSwitch.connect('notify::active', widget => {
            updatePanelElement(this._settings, this.element_type, 'enabled', widget.get_active());
            this.switch_active = widget.get_active();
        });
        this.add_suffix(enabledSwitch);

        this.activatable_widget = enabledSwitch;

        const dragSource = new Gtk.DragSource({actions: Gdk.DragAction.MOVE});
        this.add_controller(dragSource);

        const dropTarget = new Gtk.DropTargetAsync({actions: Gdk.DragAction.MOVE});
        this.add_controller(dropTarget);

        dragSource.connect('drag-begin', (self, gdkDrag) => {
            this._dragParent = self.get_widget().get_parent();
            this._dragParent.dragRow = this;

            const alloc = this.get_allocation();
            const dragWidget = self.get_widget().createDragRow(alloc);
            this._dragParent.dragWidget = dragWidget;

            const icon = Gtk.DragIcon.get_for_drag(gdkDrag);
            icon.set_child(dragWidget);

            gdkDrag.set_hotspot(this._dragParent.dragX, this._dragParent.dragY);
        });

        dragSource.connect('prepare', (self, x, y) => {
            this.set_state_flags(Gtk.StateFlags.NORMAL, true);
            const parent = self.get_widget().get_parent();
            // store drag start cursor location
            parent.dragX = x;
            parent.dragY = y;
            return new Gdk.ContentProvider();
        });

        dragSource.connect('drag-end', (_self, _gdkDrag) => {
            this._dragParent.dragWidget = null;
            this._dragParent.drag_unhighlight_row();
        });

        dropTarget.connect('drag-enter', self => {
            const parent = self.get_widget().get_parent();
            const widget = self.get_widget();

            parent.drag_highlight_row(widget);
        });

        dropTarget.connect('drag-leave', self => {
            const parent = self.get_widget().get_parent();
            parent.drag_unhighlight_row();
        });

        dropTarget.connect('drop', (_self, gdkDrop) => {
            const parent = this.get_parent();
            const {dragRow} = parent; // The row being dragged.
            const dragRowStartIndex = dragRow.get_index();
            const dragRowNewIndex = this.get_index();

            gdkDrop.read_value_async(IpFinderDragRow, 1, null, () => gdkDrop.finish(Gdk.DragAction.MOVE));

            // The drag row hasn't moved
            if (dragRowStartIndex === dragRowNewIndex)
                return true;

            parent.remove(dragRow);
            parent.show();
            parent.insert(dragRow, dragRowNewIndex);

            dragRow.emit('index-changed', dragRowNewIndex);
            return true;
        });
    }

    createDragRow(alloc) {
        const dragWidget = new Gtk.ListBox();
        dragWidget.set_size_request(alloc.width, alloc.height);

        const dragRow = new DragRow(this._params);
        dragWidget.append(dragRow);
        dragWidget.drag_highlight_row(dragRow);

        dragRow.title = _(this.title);
        dragRow.css_classes = this.css_classes;

        return dragWidget;
    }
});
