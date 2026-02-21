import GLib from 'gi://GLib';
import NM from 'gi://NM';

import {EventEmitter} from 'resource:///org/gnome/shell/misc/signals.js';

export const NetworkStatus = {
    ACTIVATING: 0,
    ACTIVE: 1,
    INACTIVE: 2,
};

export class NetworkManager extends EventEmitter {
    constructor() {
        super();
        this._mainConnection = null;
        NM.Client.new_async(null, this._establishNetworkConnectivity.bind(this));
    }

    get client() {
        return this._client;
    }

    _establishNetworkConnectivity(obj, result) {
        this._client = NM.Client.new_finish(result);
        this._client.connectObject(
            'notify::primary-connection', () => this._syncMainConnection(),
            'notify::activating-connection', () => this._syncMainConnection(),
            'notify::active-connections', () => this._syncMainConnection(),
            'notify::connectivity', () => this._syncConnectivity(),
            this);
        this._syncMainConnection();
    }

    _syncMainConnection() {
        this.emit('connection-state', NetworkStatus.ACTIVATING);
        this._mainConnection?.disconnectObject(this);

        this._mainConnection = this._client.get_primary_connection() || this._client.get_activating_connection();

        if (this._mainConnection) {
            this._mainConnection.connectObject('notify::state', this._mainConnectionStateChanged.bind(this), this);
            this._mainConnectionStateChanged();
        }

        this._syncConnectivity();
    }

    _mainConnectionStateChanged() {
        if (this._mainConnection.state === NM.ActiveConnectionState.ACTIVATED) {
            this.emit('connection-state', NetworkStatus.ACTIVATING);
            this._removeConnectionDelayId();

            this._connectionDelayId = GLib.timeout_add(0, 2000, () => {
                this.emit('connection-state', NetworkStatus.ACTIVE);
                this._connectionDelayId = null;
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _removeConnectionDelayId() {
        if (this._connectionDelayId) {
            GLib.source_remove(this._connectionDelayId);
            this._connectionDelayId = null;
        }
    }

    _syncConnectivity() {
        if (this._client.get_active_connections().length < 1 || this._client.connectivity === NM.ConnectivityState.NONE)
            this.emit('connection-state', NetworkStatus.INACTIVE);

        if (this._mainConnection == null ||
            this._mainConnection.state !== NM.ActiveConnectionState.ACTIVATED)
            this.emit('connection-state', NetworkStatus.INACTIVE);
    }

    destroy() {
        this._client?.disconnectObject(this);
        this._mainConnection?.disconnectObject(this);
        this._removeConnectionDelayId();
        this._mainConnection = null;
        this._client = null;
    }
}
