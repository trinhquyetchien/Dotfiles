import GLib from 'gi://GLib'

import DockerManager from './dockerManager.js';

/**
 * Periodically run a refresh callback while a menu is open.
 * Interval comes from the `menu-refresh-timer` setting.
 */
export default class MenuRefresher {
	/**
	 * @param {Function} refresh - async callback run on every tick
	 */
	constructor(refresh) {
		this._settings = DockerManager.settings;
		this._console = DockerManager.console;

		this._refresh = refresh;
		this._timerID = null;
		this._running = false;
		this._open = false;
		this._settings.connectObject('changed::menu-refresh-timer', this._menu_refresh_timer_change.bind(this), this);
	}

	/**
	 * Start or stop the timer when the menu opens or closes.
	 * @param {PopupMenu.PopupMenuBase} menu
	 */
	watch(menu) {
		menu.connectObject('open-state-changed', (_menu, open) => {
			this._open = open;
			if (open) {
				this._set_timer();
			} else {
				this._remove_timer();
			}
		}, this);
	}

	_menu_refresh_timer_change() {
		// Apply the new interval right away if the menu is open.
		if (this._open) {
			this._set_timer();
		}
	}

	_set_timer() {
		this._remove_timer();

		const delay = this._settings.get_int("menu-refresh-timer");
		if (!delay) {
			return;
		}

		this._timerID = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT_IDLE, delay, () => {
			this._tick();
			return GLib.SOURCE_CONTINUE;
		});
	}

	_remove_timer() {
		if (!this._timerID) {
			return;
		}

		GLib.source_remove(this._timerID);
		this._timerID = null;
	}

	async _tick() {
		// Skip if the previous refresh is still waiting for docker.
		if (this._running || !this._refresh) {
			return;
		}

		this._running = true;
		try {
			await this._refresh();
		} catch (e) {
			this._console.error(e);
		} finally {
			this._running = false;
		}
	}

	destroy() {
		this._settings.disconnectObject(this);
		this._remove_timer();
		this._refresh = null;
	}
}
