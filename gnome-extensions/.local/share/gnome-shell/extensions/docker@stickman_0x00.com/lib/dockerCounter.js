
import GLib from 'gi://GLib'

import DockerManager from './dockerManager.js';
import DockerAPI from './docker.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class DockerCounter {
	constructor(label) {
		this._settings = DockerManager.settings;

		this._label = label;
		this._set_timer();
		this._settings.connectObject('changed::up-containers-timer', this._up_containers_timer_change.bind(this), this);
	}

	_up_containers_timer_change(settings, key) {
		if (!settings.get_int(key)) {
			// disable
			this._remove_timer();
			return;
		}

		this._set_timer();
	}

	_set_timer() {
		const delay = this._settings.get_int("up-containers-timer");
		if (!delay) {
			return;
		}

		this._remove_timer();

		this._timerID = GLib.timeout_add_seconds(
			GLib.PRIORITY_DEFAULT_IDLE,
			this._settings.get_int("up-containers-timer"),
			this._set_count.bind(this)
		);
	}

	_remove_timer() {
		if (!this._timerID) {
			return;
		}

		GLib.source_remove(this._timerID);
		this._timerID = null;
	}

	async _set_count() {
		let total = await DockerAPI.get_containers_running();
		if (!+total) {
			total = "";
		}

		this._label.set_text(total);
	}

	destroy() {
		this._settings.disconnectObject(this);
		this._remove_timer();
	}
}
