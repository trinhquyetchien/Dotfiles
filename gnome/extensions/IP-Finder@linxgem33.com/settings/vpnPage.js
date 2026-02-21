import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export const VpnPage = GObject.registerClass(
class IpFinderVpnPage extends Adw.PreferencesPage {
    _init(settings) {
        super._init({
            title: _('VPN'),
            icon_name: 'changes-prevent-symbolic',
            name: 'VPNPage',
        });

        this._settings = settings;

        const restoreVpnTypesButton = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            tooltip_text: _('Reset VPN Connection Types'),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.START,
        });
        restoreVpnTypesButton.connect('clicked', () => {
            const dialog = new Gtk.MessageDialog({
                text: `<b>${_('Reset VPN Connection Types?')}</b>`,
                secondary_text: _('All VPN Connection Types will be reset to the default value.'),
                use_markup: true,
                buttons: Gtk.ButtonsType.YES_NO,
                message_type: Gtk.MessageType.WARNING,
                transient_for: this.get_root(),
                modal: true,
            });
            dialog.connect('response', (widget, response) => {
                if (response === Gtk.ResponseType.YES) {
                    for (let i = 0; i < this._vpnTypes.length; i++) {
                        const row = this._vpnTypes[i];
                        this.vpnTypesExpanderRow.remove(row);
                    }

                    this._vpnTypes = [];

                    const defaultVpnTypes = this._settings.get_default_value('vpn-connection-types').deep_unpack();
                    this._settings.set_strv('vpn-connection-types', defaultVpnTypes);

                    const vpnConnectionTypes = this._settings.get_strv('vpn-connection-types');
                    for (let i = 0; i < vpnConnectionTypes.length; i++)
                        this._addVpnConnectionType(vpnConnectionTypes[i]);
                }
                dialog.destroy();
            });
            dialog.show();
        });

        const vpnTypesGroup = new Adw.PreferencesGroup({
            title: _('VPN Connection Types'),
            description: _('Connection types to be recognized as a VPN'),
            header_suffix: restoreVpnTypesButton,
        });
        this.add(vpnTypesGroup);

        const addToVpnTypesEntry = new Gtk.Entry({
            valign: Gtk.Align.CENTER,
        });

        const addToVpnTypesButton = new Gtk.Button({
            label: _('Add'),
            valign: Gtk.Align.CENTER,
        });
        addToVpnTypesButton.connect('clicked', () => {
            const connectionType = addToVpnTypesEntry.text;
            if (!connectionType || !connectionType.length > 0)
                return;

            this.vpnTypesExpanderRow.expanded = true;

            this._addVpnConnectionType(connectionType);

            const connectionTypes = this._settings.get_strv('vpn-connection-types');
            connectionTypes.push(connectionType);

            this._settings.set_strv('vpn-connection-types', connectionTypes);
        });

        const infoButton = new Gtk.Button({
            icon_name: 'help-about-symbolic',
            tooltip_text: _('Show Connection Types Info'),
            valign: Gtk.Align.CENTER,
        });
        infoButton.connect('clicked', () => {
            const dialog = new Gtk.MessageDialog({
                text: `<b>${_('Examples of Connection Types')}</b>`,
                use_markup: true,
                buttons: Gtk.ButtonsType.OK,
                message_type: Gtk.MessageType.INFO,
                transient_for: this.get_root(),
                modal: true,
            });

            const buffer = new Gtk.TextBuffer({
                text: '802-3-ethernet\n802-11-wireless\nbluetooth\nbridge\nbond\ncdma\ngsm\ninfiniband\nolpc-mesh\npppoe\nteam\nvlan\nvpn\nwimax\nloopback\ndummy\nwireguard\ntun\ntap\nmacvlan\nvxlan',
            });
            const textView = new Gtk.TextView({
                buffer,
                editable: false,
                wrap_mode: Gtk.WrapMode.WORD,
                left_margin: 6,
                right_margin: 6,
                top_margin: 6,
                bottom_margin: 6,
            });
            textView.get_style_context().add_class('card');
            dialog.message_area.append(textView);

            dialog.connect('response', () => {
                dialog.destroy();
            });
            dialog.show();
        });
        const addToVpnTypesRow = new Adw.ActionRow({
            title: _('Add new VPN Connection Type'),
        });
        addToVpnTypesRow.add_suffix(infoButton);
        addToVpnTypesRow.add_suffix(addToVpnTypesEntry);
        addToVpnTypesRow.add_suffix(addToVpnTypesButton);

        this.vpnTypesExpanderRow = new Adw.ExpanderRow({
            title: _('VPN Connection Types'),
        });

        this._vpnTypes = [];
        const vpnConnectionTypes = this._settings.get_strv('vpn-connection-types');
        for (let i = 0; i < vpnConnectionTypes.length; i++)
            this._addVpnConnectionType(vpnConnectionTypes[i]);

        vpnTypesGroup.add(addToVpnTypesRow);
        vpnTypesGroup.add(this.vpnTypesExpanderRow);

        const blacklistDropDown = this._createConnectionList(_('Blacklist'), _('Force a connection to not be recognized as a VPN'), 'vpn-connections-blacklist');
        const whitelistDropDown = this._createConnectionList(_('Whitelist'), _('Force a connection to be recognized as a VPN'), 'vpn-connections-whitelist');

        this._settings.connect('changed::current-connection-ids', () => {
            this._populateDropDowns(blacklistDropDown, whitelistDropDown);
        });
        this._populateDropDowns(blacklistDropDown, whitelistDropDown);
    }

    _createConnectionList(title, description, setting) {
        const listGroup = new Adw.PreferencesGroup({
            title: _('%s Connections').format(title),
            description: _(description),
        });
        this.add(listGroup);

        const listDropDown = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            halign: Gtk.Align.FILL,
        });

        const addtoListButton = new Gtk.Button({
            label: _('Add'),
            valign: Gtk.Align.CENTER,
        });
        addtoListButton.connect('clicked', () => {
            listExpanderRow.expanded = true;
            const selectedConnection = listDropDown.get_selected_item();
            const connectionId = selectedConnection.string;

            this._addConnectionToList(_(title), connectionId, setting, listExpanderRow);

            const list = this._settings.get_strv(setting);
            list.push(connectionId);

            this._settings.set_strv(setting, list);
        });
        const addToListRow = new Adw.ActionRow({
            title: _('Choose a connection to add to %s').format(title),
            activatable_widget: addtoListButton,
        });
        addToListRow.add_suffix(listDropDown);
        addToListRow.add_suffix(addtoListButton);

        const listExpanderRow = new Adw.ExpanderRow({
            title: _('%s Connections List').format(title),
        });

        const list = this._settings.get_strv(setting);
        for (let i = 0; i < list.length; i++)
            this._addConnectionToList(_(title), list[i], setting, listExpanderRow);

        listGroup.add(addToListRow);
        listGroup.add(listExpanderRow);
        return listDropDown;
    }

    _populateDropDowns(blacklistDropDown, whitelistDropDown) {
        const currentConnectionsList = new Gtk.StringList();
        const currentConnectionIds = this._settings.get_strv('current-connection-ids');

        for (let i = 0; i < currentConnectionIds.length; i++)
            currentConnectionsList.append(currentConnectionIds[i]);

        blacklistDropDown.model = currentConnectionsList;
        whitelistDropDown.model = currentConnectionsList;
    }

    _addConnectionToList(listName, title, setting, expanderRow) {
        const deleteEntry = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('Remove %s from %s Connections').format(title, listName),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });
        deleteEntry.connect('clicked', () => {
            const dialog = new Gtk.MessageDialog({
                text: `<b>${_('Remove %s from %s Connections?').format(`<i>${title}</i>`, listName)}</b>`,
                use_markup: true,
                buttons: Gtk.ButtonsType.YES_NO,
                message_type: Gtk.MessageType.WARNING,
                transient_for: this.get_root(),
                modal: true,
            });
            dialog.connect('response', (widget, response) => {
                if (response === Gtk.ResponseType.YES) {
                    expanderRow.remove(connectionRow);

                    const list = this._settings.get_strv(setting);
                    const index = list.indexOf(title);
                    list.splice(index, 1);

                    this._settings.set_strv(setting, list);
                }
                dialog.destroy();
            });
            dialog.show();
        });
        const connectionRow = new Adw.ActionRow({
            title,
            activatable_widget: deleteEntry,
        });
        connectionRow.add_suffix(deleteEntry);
        expanderRow.add_row(connectionRow);
    }

    _addVpnConnectionType(title) {
        const listName = _('VPN Connection Types');
        const deleteEntry = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('Remove %s from %s').format(title, listName),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });

        deleteEntry.connect('clicked', () => {
            const dialog = new Gtk.MessageDialog({
                text: `<b>${_('Remove %s from %s?').format(`<i>${title}</i>`, listName)}</b>`,
                use_markup: true,
                buttons: Gtk.ButtonsType.YES_NO,
                message_type: Gtk.MessageType.WARNING,
                transient_for: this.get_root(),
                modal: true,
            });
            dialog.connect('response', (widget, response) => {
                if (response === Gtk.ResponseType.YES) {
                    this.vpnTypesExpanderRow.remove(connectionRow);

                    let index = this._vpnTypes.indexOf(connectionRow);
                    this._vpnTypes.splice(index, 1);

                    const connectionTypes = this._settings.get_strv('vpn-connection-types');
                    index = connectionTypes.indexOf(title);
                    connectionTypes.splice(index, 1);

                    this._settings.set_strv('vpn-connection-types', connectionTypes);
                }
                dialog.destroy();
            });
            dialog.show();
        });
        const connectionRow = new Adw.ActionRow({
            title,
            activatable_widget: deleteEntry,
        });
        connectionRow.add_suffix(deleteEntry);
        this.vpnTypesExpanderRow.add_row(connectionRow);
        this._vpnTypes.push(connectionRow);
    }
});
