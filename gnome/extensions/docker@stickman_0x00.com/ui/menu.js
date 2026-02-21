import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { QuickSettingsMenu, QuickSettingsItem } from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import StartButton from './startButton.js';
import ContainerMenu from './containerMenu.js';
import ImageMenu from './imageMenu.js';

import DockerAPI from '../lib/docker.js';
import DockerManager from '../lib/dockerManager.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class Menu
	extends PanelMenu.Button {

	static {
		GObject.registerClass(this);
	}

	constructor() {
		super(0.0, _('Docker Menu'), true);
		this._settings = DockerManager.settings;
		this._timerID = null;
		this._items = {};

		// Add icon
		const boxLayout = new St.BoxLayout();
		this.add_child(boxLayout);

		// Set icon
		this._gicon = Gio.icon_new_for_string(DockerManager.getDefault().path + `/resources/docker_${DockerManager.settings.get_string('logo')}.png`);
		this._icon = new St.Icon({ gicon: this._gicon, icon_size: '24' });
		boxLayout.add_child(this._icon);

		// Label to display total of running containers
		this._label = new St.Label();
		boxLayout.add_child(this._label);
		this._set_timer();

		DockerManager.settings.connect('changed::logo', this._logo_change.bind(this));

		DockerManager.settings.connect('changed::up-containers-timer', this._up_containers_timer_change.bind(this));

		this.connect('button-press-event', async () => {
			await this._show();
			this.menu.open();
		});
	}

	destroy() {
		this._remove_timer();
		super.destroy();
	}

	async _show() {
		this.setMenu(new QuickSettingsMenu(this, this._settings.get_int('quicksettings-columns')));
		// Avoid error when opening a modal dialog after this menu has been destroyed once.
		Main.layoutManager.disconnectObject(this.menu);

		if (!await DockerAPI.is_docker_running()) {
			this._items._startButton = new StartButton(this);
			this.menu.addItem(this._items._startButton, this._settings.get_int('quicksettings-columns'));
			return;
		}

		// Docker is running.
		try {
			await this._show_containers();
			await this._show_images();
		} catch (e) {
			console.error(e);
		}

		if (this.menu._grid.get_n_children() === 1) {
			this._items._emptyLabel = new QuickSettingsItem({ label: _("Empty") });
			this.menu.addItem(this._items._emptyLabel, this._settings.get_int('quicksettings-columns'));
		}
	}

	async _show_containers() {
		// Check if show containers.
		if (DockerManager.settings.get_enum('show-value').toString() === "2") {
			return;
		}

		const containers = await DockerAPI.get_containers();
		containers.forEach((container) => {
			this._items[container.id] = new ContainerMenu(this, container);
			this.menu.addItem(this._items[container.id], 1);
		});
	}

	async _show_images() {
		// Check if show images.
		if (DockerManager.settings.get_enum('show-value').toString() === "1") {
			return;
		}

		const images = await DockerAPI.get_images();
		images.forEach((image) => {
			this._items[image.id] = new ImageMenu(this, image);
			this.menu.addItem(this._items[image.id], 1);
		});
	}

	_logo_change(settings, key) {
		this._gicon = Gio.icon_new_for_string(DockerManager.getDefault().path + `/resources/docker_${settings.get_string(key)}.png`);
		this._icon.set_gicon(this._gicon);
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
		const delay = DockerManager.settings.get_int("up-containers-timer");
		if (!delay) {
			return;
		}

		this._remove_timer();

		this._timerID = GLib.timeout_add_seconds(
			GLib.PRIORITY_DEFAULT_IDLE,
			DockerManager.settings.get_int("up-containers-timer"),
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
}