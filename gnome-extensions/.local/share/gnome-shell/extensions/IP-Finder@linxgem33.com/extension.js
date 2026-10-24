import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Mtk from 'gi://Mtk';
import NM from 'gi://NM';
import Soup from 'gi://Soup';
import St from 'gi://St';

import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {NetworkManager, NetworkStatus} from './networkManager.js';
import {UpdateNotification} from './updateNotifier.js';
import {ElementType, getIPDetails, getMapTile, getMapTileInfo} from './utils.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

/**
 * @param {string} countryCode - country code
 */
function getFlagEmoji(countryCode) {
    return [...countryCode.toUpperCase()].map(char =>
        String.fromCodePoint(127397 + char.charCodeAt())
    ).reduce((a, b) => `${a}${b}`);
}

class VpnInfoBox extends St.BoxLayout {
    static {
        GObject.registerClass(this);
    }

    constructor(params) {
        super(params);

        this._vpnStatusLabel = new St.Label({
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.START,
            x_expand: true,
            y_expand: false,
            style_class: 'ip-info-vpn-off',
        });
        this.add_child(this._vpnStatusLabel);

        this._vpnIcon = new St.Icon({
            style_class: 'popup-menu-icon ip-info-vpn-off',
        });
        this.add_child(this._vpnIcon);
    }

    setVpnStatus(vpnStatus) {
        this._vpnStatusLabel.set_style_class_name(vpnStatus.styleClass);
        this._vpnIcon.set_style_class_name(`popup-menu-icon ${vpnStatus.styleClass}`);

        this._vpnStatusLabel.text = `${_('VPN')}: %s`.format(vpnStatus.vpnOn ? vpnStatus.vpnName : _('Off'));
        this._vpnIcon.gicon = Gio.icon_new_for_string(vpnStatus.iconPath);
    }
}

class BaseButton extends St.Button {
    static {
        GObject.registerClass(this);
    }

    constructor(text, params) {
        super({
            style_class: 'icon-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
            button_mask: St.ButtonMask.ONE | St.ButtonMask.TWO,
            ...params,
        });

        this.connect('notify::hover', () => this._onHover());
        this.connect('destroy', () => this._onDestroy());

        this.tooltipLabel = new St.Label({
            style_class: 'dash-label tooltip-label',
            text: _(text),
        });
        this.tooltipLabel.hide();
        global.stage.add_child(this.tooltipLabel);
    }

    _onHover() {
        if (this.hover)
            this.showLabel();
        else
            this.hideLabel();
    }

    showLabel() {
        this.tooltipLabel.opacity = 0;
        this.tooltipLabel.show();

        const [stageX, stageY] = this.get_transformed_position();

        const itemWidth = this.allocation.get_width();
        const itemHeight = this.allocation.get_height();

        const labelWidth = this.tooltipLabel.get_width();
        const labelHeight = this.tooltipLabel.get_height();
        const offset = 6;
        const xOffset = Math.floor((itemWidth - labelWidth) / 2);

        const monitorIndex = Main.layoutManager.findIndexForActor(this);
        const workArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);

        let y;
        const x = Math.clamp(stageX + xOffset, 0 + offset, workArea.x + workArea.width - labelWidth - offset);

        // Check if should place tool-tip above or below icon
        // Needed in case user has moved the panel to bottom of screen
        const labelBelowIconRect = new Mtk.Rectangle({
            x,
            y: stageY + itemHeight + offset,
            width: labelWidth,
            height: labelHeight,
        });

        if (workArea.contains_rect(labelBelowIconRect))
            y = labelBelowIconRect.y;
        else
            y = stageY - labelHeight - offset;

        this.tooltipLabel.remove_all_transitions();
        this.tooltipLabel.set_position(x, y);
        this.tooltipLabel.ease({
            opacity: 255,
            duration: 250,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    hideLabel() {
        this.tooltipLabel.remove_all_transitions();
        this.tooltipLabel.ease({
            opacity: 0,
            duration: 100,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => this.tooltipLabel.hide(),
        });
    }

    _onDestroy() {
        this.tooltipLabel.remove_all_transitions();
        this.tooltipLabel.hide();
        global.stage.remove_child(this.tooltipLabel);
        this.tooltipLabel.destroy();
    }
}

class IpFinderMenuButton extends PanelMenu.Button {
    static {
        GObject.registerClass(this);
    }

    constructor(extension) {
        super(0.5, _('IP Details'));
        this.menu.box.style = 'padding: 16px;';

        this._soupParams = {
            id: `ip-finder/'v${extension.metadata.version}`,
        };

        this._defaultIpData = {
            ip: {name: _('IP Address')},
            hostname: {name: _('Hostname')},
            org: {name: _('Org')},
            city: {name: _('City')},
            region: {name: _('Region')},
            country: {name: _('Country')},
            loc: {name: _('Location')},
            postal: {name: _('Postal')},
            zip: {name: _('Postal')},
            timezone: {name: _('Timezone')},
        };

        this._extension = extension;
        this._settings = extension.getSettings();
        this._createSettingsConnections();

        const SESSION_TYPE = GLib.getenv('XDG_SESSION_TYPE');
        const PACKAGE_VERSION = Config.PACKAGE_VERSION;
        const USER_AGENT = `User-Agent: Mozilla/5.0 (${SESSION_TYPE}; GNOME Shell/${PACKAGE_VERSION}; Linux ${GLib.getenv('CPU')};) ip-finder/${this._extension.metadata.version}`;
        this._session = new Soup.Session({user_agent: USER_AGENT, timeout: 60});

        this._defaultMapTile = `${this._extension.path}/icons/ip-finder-logo.svg`;
        this._latestMapTile = `${this._extension.path}/icons/latest_map.png`;

        this._panelBox = new St.BoxLayout({
            x_align: Clutter.ActorAlign.FILL,
            y_align: Clutter.ActorAlign.FILL,
            style_class: 'panel-status-indicators-box',
        });
        this.add_child(this._panelBox);

        this._vpnStatusIcon = new St.Icon({
            icon_name: 'changes-prevent-symbolic',
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-icon',
        });
        this._ipAddress = '';
        this._ipAddressLabel = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-icon',
        });
        this._cityLabel = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-icon',
        });
        this._flagIcon = new St.Label({
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-icon',
            visible: false,
        });

        this._statusText = new St.Label({
            text: _('Loading IP Details'),
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-icon',
        });
        this._panelBox.add_child(this._statusText);

        this._statusIcon = new St.Icon({
            icon_name: 'network-wired-acquiring-symbolic',
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-icon',
        });
        this._panelBox.add_child(this._statusIcon);

        const menuSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(menuSection);

        const mapAndIpDetailsBox = new St.BoxLayout({
            x_align: Clutter.ActorAlign.FILL,
            x_expand: true,
            style: 'spacing: 16px;',
        });
        menuSection.actor.add_child(mapAndIpDetailsBox);

        this._mapTileBox = new St.BoxLayout({
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            y_expand: true,
        });
        mapAndIpDetailsBox.add_child(this._mapTileBox);
        this._addMapIcon(this._defaultMapTile);

        const ipInfoParentBox = new St.BoxLayout({
            style_class: 'ip-info-box',
            vertical: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        mapAndIpDetailsBox.add_child(ipInfoParentBox);

        this._vpnInfoBox = new VpnInfoBox();
        ipInfoParentBox.add_child(this._vpnInfoBox);

        this._ipInfoBox = new St.BoxLayout({
            vertical: true,
        });
        ipInfoParentBox.add_child(this._ipInfoBox);

        this._buttonsBox = new St.BoxLayout({
            y_align: Clutter.ActorAlign.END,
            y_expand: true,
        });
        ipInfoParentBox.add_child(this._buttonsBox);

        const settingsButton = new BaseButton(_('Settings'), {
            icon_name: 'applications-system-symbolic',
        });
        settingsButton.connect('clicked', () => {
            extension.openPreferences();
            this.menu.toggle();
        });
        this._buttonsBox.add_child(settingsButton);

        const copyButton = new BaseButton(_('Copy IP'), {
            icon_name: 'edit-copy-symbolic',
            x_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
        });
        copyButton.connect('clicked', () => this._setClipboardText(this._ipAddress));
        this._buttonsBox.add_child(copyButton);

        const refreshButton = new BaseButton(_('Refresh'), {
            icon_name: 'view-refresh-symbolic',
            x_expand: false,
            x_align: Clutter.ActorAlign.END,
        });
        refreshButton.connect('clicked', () => this._startGetIpInfo());
        this._buttonsBox.add_child(refreshButton);

        this._networkManager = new NetworkManager();
        this._networkManager.connectObject('connection-state', this._onConnectionStateChange.bind(this), this);

        this._updatePanelWidgets();
        this._updateVpnMenuText();
        this._setMapTileVisibility();
        this._setMenuButtonsVisibilty();
    }

    _onConnectionStateChange(_self, state) {
        if (state === NetworkStatus.ACTIVATING) {
            this._session.abort();
            this._setAcquiringDetials();
        } else if (state === NetworkStatus.ACTIVE) {
            this._startGetIpInfo();
        } else if (state === NetworkStatus.INACTIVE) {
            this._setIpDetails();
        }
    }

    _createSettingsConnections() {
        this._settings.connectObject('changed::panel-button-elements', () => this._updatePanelWidgets(), this);
        this._settings.connectObject('changed::vpn-status-in-menu', () => this._updateVpnMenuText(), this);

        this._settings.connectObject('changed::mask-ip-in-menu', () => this._startGetIpInfo(), this);
        this._settings.connectObject('changed::vpn-connection-types', () => this._startGetIpInfo(), this);
        this._settings.connectObject('changed::vpn-connections-whitelist', () => this._startGetIpInfo(), this);
        this._settings.connectObject('changed::vpn-connections-blacklist', () => this._startGetIpInfo(), this);
        this._settings.connectObject('changed::api-service', () => this._startGetIpInfo(), this);
        this._settings.connectObject('changed::tile-zoom', () => this._startGetIpInfo(), this);
        this._settings.connectObject('changed::enabled-on-vpn-only', () => this._startGetIpInfo(), this);

        this._settings.connectObject('changed::tile-border-radius', () => this._setMapTileStyle(), this);
        this._settings.connectObject('changed::tile-size', () => this._setMapTileStyle(), this);
        this._settings.connectObject('changed::show-map-tile', () => this._setMapTileVisibility(), this);
        this._settings.connectObject('changed::show-menu-buttons', () => this._setMenuButtonsVisibilty(), this);
    }

    _setClipboardText(text) {
        const clipboard = St.Clipboard.get_default();
        clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
    }

    _removePanelWidgets() {
        if (this._panelBox.contains(this._flagIcon))
            this._panelBox.remove_child(this._flagIcon);
        if (this._panelBox.contains(this._ipAddressLabel))
            this._panelBox.remove_child(this._ipAddressLabel);
        if (this._panelBox.contains(this._cityLabel))
            this._panelBox.remove_child(this._cityLabel);
        if (this._panelBox.contains(this._vpnStatusIcon))
            this._panelBox.remove_child(this._vpnStatusIcon);
    }

    _maskIp(ip) {
        if (!ip || typeof ip !== 'string')
            return '';

        const isIPv4 = ip.includes('.');

        const separator = isIPv4 ? '.' : ':';
        const segments = ip.split(separator);

        return segments.map((segment, index) => index < 2 ? segment : '*'.repeat(segment.length)).join(separator);
    }

    _updatePanelWidgets() {
        this._removePanelWidgets();

        const elements = this._settings.get_value('panel-button-elements').recursiveUnpack();
        elements.forEach(element => {
            if (!element.enabled)
                return;

            if (element.id === ElementType.COUNTRY_FLAG) {
                this._panelBox.add_child(this._flagIcon);
                this._flagIcon.show();
            } else if (element.id === ElementType.IP_ADDRESS) {
                this._panelBox.add_child(this._ipAddressLabel);
                this._ipAddressLabel.show();
                if (element.mask_ip)
                    this._ipAddressLabel.text = this._maskIp(this._ipAddress);
                else
                    this._ipAddressLabel.text = this._ipAddress;

                this._setElementStyle(this._ipAddressLabel, element.colorize);
            } else if (element.id === ElementType.VPN_STATUS_ICON) {
                if (element.always_show || this._vpnConnectionOn) {
                    this._panelBox.add_child(this._vpnStatusIcon);
                    this._vpnStatusIcon.show();
                    this._vpnStatusIcon.icon_name = this._vpnConnectionOn ? 'changes-prevent-symbolic' : 'changes-allow-symbolic';
                    this._setElementStyle(this._vpnStatusIcon, element.colorize);
                }
            } else if (element.id === ElementType.LOCATION) {
                if (!this._locationData)
                    return;

                const {city, region, country} = this._locationData;

                const locationText = [
                    element.show_city ? city : null,
                    element.show_region ? region : null,
                    element.show_country ? country : null,
                ].filter(Boolean).join(', ') || null;

                if (!locationText)
                    return;

                this._panelBox.add_child(this._cityLabel);
                this._cityLabel.show();

                this._cityLabel.text = locationText;

                this._setElementStyle(this._cityLabel, element.colorize);
            }
        });
    }

    _setElementStyle(element, colorize) {
        if (colorize)
            element.style_class = this._vpnConnectionOn ? 'system-status-icon ip-info-vpn-on' : 'system-status-icon ip-info-vpn-off';
        else
            element.style_class = 'system-status-icon';
    }

    _updateVpnMenuText() {
        const showVpnStatus = this._settings.get_boolean('vpn-status-in-menu');
        this._vpnInfoBox.visible = showVpnStatus;
    }

    _startGetIpInfo() {
        this._session.abort();
        this._getIpInfo().catch(err => console.log(err));
    }

    _getPanelButtonVisible() {
        const enabledOnVPN = this._settings.get_boolean('enabled-on-vpn-only');
        if (enabledOnVPN && !this._vpnConnectionOn)
            return false;
        else
            return true;
    }

    async _getIpInfo() {
        this._setAcquiringDetials();

        if (this._networkManager.client.connectivity === NM.ConnectivityState.NONE) {
            this._setIpDetails();
            return;
        }

        const blackList = this._settings.get_strv('vpn-connections-blacklist');
        const whiteList = this._settings.get_strv('vpn-connections-whitelist');
        const activeConnectionIds = [];
        const activeConnections = this._networkManager.client.get_active_connections() || [];
        const handledTypes = this._settings.get_strv('vpn-connection-types');

        activeConnections.forEach(connection => {
            activeConnectionIds.push(connection.id);
            if (connection.state !== NM.ActiveConnectionState.ACTIVATED)
                return;

            if ((handledTypes.includes(connection.type) || whiteList.includes(connection.id)) && !blackList.includes(connection.id)) {
                this._vpnConnectionOn = true;
                this._vpnConnectionName = connection.id;
            }
        });

        this._settings.set_strv('current-connection-ids', activeConnectionIds);

        if (activeConnections.length < 1) {
            this._setIpDetails();
            return;
        }

        this.visible = this._getPanelButtonVisible();
        if (!this.visible)
            return;

        const apiService = this._settings.get_enum('api-service');
        const {data, error} = await getIPDetails(this._session, this._soupParams, apiService);
        this._setIpDetails(data, error);
    }

    _setAcquiringDetials() {
        this._vpnConnectionOn = false;
        this._vpnConnectionName = null;
        this.visible = this._getPanelButtonVisible();

        this._ipInfoBox.destroy_all_children();

        this._addMapIcon(this._defaultMapTile);

        const ipInfoRow = new St.BoxLayout();
        this._ipInfoBox.add_child(ipInfoRow);

        const label = new St.Label({
            style_class: 'ip-info-key',
            text: _('Loading IP Details'),
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
        });
        ipInfoRow.add_child(label);

        // Hide IP Info Elements
        this._removePanelWidgets();

        // Show Status Elements
        this._statusText.text = _('Loading IP Details');
        this._statusIcon.show();

        this._statusIcon.icon_name = 'network-wired-acquiring-symbolic';
        this._statusText.show();

        // Hide Menu VPN Info
        this._vpnInfoBox.hide();
    }

    _setIpDetails(data, error) {
        this._ipInfoBox.destroy_all_children();

        // null data indicates no connection found or error in gathering ip info
        if (!data) {
            this._statusText.text = error ? _('Error!') : _('No Connection');
            this._statusText.show();

            this._statusIcon.icon_name = 'network-offline-symbolic';
            this._statusIcon.show();

            const ipInfoRow = new St.BoxLayout();
            this._ipInfoBox.add_child(ipInfoRow);

            const label = new St.Label({
                style_class: 'ip-info-key',
                text: error ? `${error}` : _('No Connection'),
                x_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });
            ipInfoRow.add_child(label);

            this._addMapIcon(this._defaultMapTile);
            return;
        }

        this._statusIcon.hide();
        this._statusText.hide();

        this._ipAddress = data.ip;
        this._locationData = {
            city: data.city,
            region: data.region,
            country: data.country,
        };

        this._flagIcon.text = getFlagEmoji(data.countryCode || data.country);

        this._vpnInfoBox.setVpnStatus({
            vpnOn: this._vpnConnectionOn,
            iconPath: this._vpnConnectionOn ? 'changes-prevent-symbolic' : 'changes-allow-symbolic',
            vpnName: this._vpnConnectionName ? this._vpnConnectionName : _('On'),
            styleClass: this._vpnConnectionOn ? 'ip-info-vpn-on' : 'ip-info-vpn-off',
        });

        this._updatePanelWidgets(data);
        this._updateVpnMenuText();

        this._ipInfoBox.add_child(new PopupMenu.PopupSeparatorMenuItem());

        for (const key in this._defaultIpData) {
            if (data[key]) {
                if (typeof data[key] !== 'string')
                    continue;

                const dataEntry = data[key];

                const ipInfoRow = new St.BoxLayout();
                this._ipInfoBox.add_child(ipInfoRow);

                const label = new St.Label({
                    style_class: 'ip-info-key',
                    text: `${_(this._defaultIpData[key].name)}: `,
                    x_align: Clutter.ActorAlign.FILL,
                    y_align: Clutter.ActorAlign.CENTER,
                    y_expand: true,
                });
                ipInfoRow.add_child(label);

                let maskedIp = null;
                const maskIp = this._settings.get_boolean('mask-ip-in-menu');
                if ((key === 'ip') && maskIp)
                    maskedIp = this._maskIp(dataEntry);

                const infoLabel = new St.Label({
                    x_align: Clutter.ActorAlign.FILL,
                    y_align: Clutter.ActorAlign.CENTER,
                    x_expand: true,
                    y_expand: true,
                    style_class: 'ip-info-value',
                    text: maskedIp ?? dataEntry,
                });
                const dataLabelBtn = new St.Button({child: infoLabel});
                dataLabelBtn.connect('button-press-event', () => this._setClipboardText(dataEntry));
                ipInfoRow.add_child(dataLabelBtn);
            }
        }

        this._ipInfoBox.add_child(new PopupMenu.PopupSeparatorMenuItem());

        const location = data.loc;
        this._setMapTile(location).catch(e => console.log(e));
    }

    async _setMapTile(location) {
        const zoom = this._settings.get_int('tile-zoom');
        const mapTileInfo = getMapTileInfo(location, zoom);
        const mapTileCoordinates = `${mapTileInfo.xTile},${mapTileInfo.yTile}`;
        const mapTileUrl = `${mapTileInfo.zoom}/${mapTileInfo.xTile}/${mapTileInfo.yTile}`;
        const previousCoords = this._settings.get_string('map-tile-coords');

        if (mapTileCoordinates !== previousCoords || !this._checkLatestFileMapExists()) {
            this._addMapIcon(this._defaultMapTile);

            const mapLabel = new St.Label({
                style_class: 'ip-info-key',
                text: _('Loading new map tile...'),
                x_align: Clutter.ActorAlign.CENTER,
            });
            this._mapTileBox.add_child(mapLabel);

            const {error} = await getMapTile(this._session, this._soupParams, this._extension.path, mapTileUrl);

            if (error) {
                mapLabel.text = _(`Error getting map tile: ${error}`);
                return;
            }

            this._settings.set_string('map-tile-coords', mapTileCoordinates);
        }

        this._addMapIcon(this._latestMapTile);
    }

    _setMenuButtonsVisibilty() {
        const visible = this._settings.get_boolean('show-menu-buttons');
        this._buttonsBox.visible = visible;
    }

    _setMapTileVisibility() {
        const visible = this._settings.get_boolean('show-map-tile');
        this._mapTileBox.visible = visible;
    }

    _setMapTileStyle() {
        if (!this._mapTileBin)
            return;

        const iconSize = this._settings.get_int('tile-size');
        const radius = this._settings.get_int('tile-border-radius');

        this._mapTileBin.style = `width: ${iconSize}px; height: ${iconSize}px; border-radius: ${radius}px;`;

        if (this._mapTileBin.child)
            this._mapTileBin.child.icon_size = iconSize;
        else
            this._mapTileBin.style += `background-image: url("${this._latestMapTile}");`;
    }

    _addMapIcon(mapTile) {
        this._mapTileBox.destroy_all_children();
        this._mapTileBox.visible = true;

        this._mapTileBin = new St.Bin({
            style_class: 'map-tile-round',
        });

        if (mapTile === this._defaultMapTile)
            this._mapTileBin.child = new St.Icon({gicon: Gio.icon_new_for_string(mapTile)});

        this._setMapTileStyle();

        this._mapTileBox.add_child(this._mapTileBin);
    }

    _checkLatestFileMapExists() {
        const file = Gio.File.new_for_path(this._latestMapTile);
        return file.query_exists(null);
    }

    disable() {
        this._session.abort();
        this._session = null;
        this._networkManager.destroy();
        this._networkManager = null;
        this._settings.disconnectObject(this);
        this._settings = null;

        // may be removed from parent box, so manually destroy
        this._flagIcon.destroy();
        this._ipAddressLabel.destroy();
        this._cityLabel.destroy();
        this._vpnStatusIcon.destroy();
    }
}

export default class IpFinder extends Extension {
    enable() {
        this.settings = this.getSettings();
        this._syncPanelButtonElements();
        this._updateNotification = new UpdateNotification(this);
        this._menuButton = new IpFinderMenuButton(this);

        this.settings.connectObject('changed::position-in-panel', () => this._setPanelPosition(), this);
        this.settings.connectObject('changed::position-in-panel-offset', () => this._setPanelPosition(), this);
        this._setPanelPosition();
    }

    disable() {
        this.settings.disconnectObject(this);
        this.settings = null;
        this._updateNotification.destroy();
        this._updateNotification = null;
        this._menuButton?.disable();
        this._menuButton?.destroy();
        this._menuButton = null;
    }

    _syncPanelButtonElements() {
        // If a new version was released, update users 'panel-button-elements' setting
        // to account for any added/removed properties
        const isNewVersion = this.settings.get_int('update-notifier-project-version') < this.metadata.version;
        if (!isNewVersion)
            return;

        const userElements = this.settings.get_value('panel-button-elements').deepUnpack();
        const defaultElements = this.settings.get_default_value('panel-button-elements').deepUnpack();

        const updated = defaultElements.map(defaultElement => {
            const userElement = userElements.find(element => element.id.unpack() === defaultElement.id.unpack());

            // New defaultElement added
            if (!userElement)
                return defaultElement;

            // Sync properties between default and user element
            const merged = {};
            for (const key in defaultElement)
                merged[key] = key in userElement ? userElement[key] : defaultElement[key];

            return merged;
        });

        this.settings.set_value('panel-button-elements', new GLib.Variant('aa{sv}', updated));
    }

    _setPanelPosition() {
        if (Main.panel.statusArea[this.metadata.uuid])
            Main.panel.statusArea[this.metadata.uuid] = null;

        const panelBox = this.settings.get_string('position-in-panel');
        const positionOffset = this.settings.get_int('position-in-panel-offset');
        Main.panel.addToStatusArea(this.metadata.uuid, this._menuButton, positionOffset, panelBox);
    }

    openPreferences() {
        // Find if an extension preferences window is already open
        const prefsWindow = global.get_window_actors().map(wa => wa.meta_window).find(w => w.wm_class === 'org.gnome.Shell.Extensions');

        if (!prefsWindow) {
            super.openPreferences();
            return;
        }

        // The current prefsWindow belongs to this extension, activate it
        if (prefsWindow.title === this.metadata.name) {
            Main.activateWindow(prefsWindow);
            return;
        }

        // If another extension's preferences are open, close it and open this extension's preferences
        prefsWindow.connectObject('unmanaged', () => {
            super.openPreferences();
            prefsWindow.disconnectObject(this);
        }, this);
        prefsWindow.delete(global.get_current_time());
    }
}
