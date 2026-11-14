import GObject from 'gi://GObject';

import { QuickSettingsMenu, QuickSettingsItem } from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import StartButton from './startButton.js';
import ContainerMenu from './containerMenu.js';
import ImageMenu from './imageMenu.js';

import DockerAPI from '../lib/docker.js';
import DockerPanelButton from '../lib/panelButton.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { show_containers, show_images } from '../lib/utils.js';

export default class Menu
	extends DockerPanelButton {

	static {
		GObject.registerClass(this);
	}

	constructor() {
		super(true);
		this._items = {};
		this._containers_snapshot = {};
		this._images_snapshot = {};
		this._docker_running = null;
	}

	async _show() {
		this.setMenu(new QuickSettingsMenu(this, this._settings.get_int('quicksettings-columns')));
		// Avoid error when opening a modal dialog after this menu has been destroyed once.
		Main.layoutManager.disconnectObject(this.menu);
		this._menuRefresher.watch(this.menu);
		this._items = {};
		this._containers_snapshot = {};
		this._images_snapshot = {};
		this._docker_running = null;

		await this._refresh(this.menu);
	}

	/**
	 * Fetch docker state and sync the menu items with it.
	 * @param {QuickSettingsMenu} [menu] - menu being refreshed
	 */
	async _refresh(menu = this.menu) {
		const is_running = await DockerAPI.is_docker_running();

		let containers = [];
		let images = [];
		if (is_running) {
			try {
				[containers, images] = await Promise.all([this._get_containers(), this._get_images()]);
			} catch (e) {
				this._console.error(e);
			}
		}

		// Menu rebuilt while waiting for docker.
		if (menu !== this.menu) {
			return;
		}

		// Docker started or stopped: start over.
		if (is_running !== this._docker_running) {
			this._clear();
			this._docker_running = is_running;
		}

		if (!is_running) {
			if (!this._items._startButton) {
				this._items._startButton = new StartButton(this);
				this.menu.addItem(this._items._startButton, this._settings.get_int('quicksettings-columns'));
			}
			return;
		}

		const first_image = this._sync_items(
			this._images_snapshot,
			images,
			image => `${image.id}:${image.name}`,
			image => new ImageMenu(this, image),
			null,
		);
		this._sync_items(
			this._containers_snapshot,
			containers,
			container => container.id,
			container => new ContainerMenu(this, container),
			first_image,
		);

		const is_empty = !containers.length && !images.length;
		if (is_empty && !this._items._emptyLabel) {
			this._items._emptyLabel = new QuickSettingsItem({ label: _("Empty") });
			this.menu.addItem(this._items._emptyLabel, this._settings.get_int('quicksettings-columns'));
		} else if (!is_empty && this._items._emptyLabel) {
			this._remove_item('_emptyLabel');
		}
	}

	async _get_containers() {
		return show_containers() ? DockerAPI.get_containers() : [];
	}

	async _get_images() {
		return show_images() ? DockerAPI.get_images() : [];
	}

	/**
	 * Add, update, remove and reorder menu items to match the given list.
	 * @param {Object} snapshots - last drawn state of each item, by key
	 * @param {Array} list - containers or images, sorted by name
	 * @param {Function} key - unique key of a list element
	 * @param {Function} create - builds the menu item of a list element
	 * @param {St.Widget|null} sibling - item placed after the list, null for the end of the menu
	 * @return {St.Widget|null} first item of the list, or `sibling` if the list is empty
	 */
	_sync_items(snapshots, list, key, create, sibling) {
		const keys = new Set(list.map(key));
		for (const k of Object.keys(snapshots)) {
			if (keys.has(k)) {
				continue;
			}

			this._remove_item(k);
			delete snapshots[k];
		}

		// Walk backwards placing each item before the next one, so the name order holds also after a rename.
		for (const element of [...list].reverse()) {
			const k = key(element);
			const snapshot = JSON.stringify(element);
			let item = this._items[k];

			if (!item) {
				item = create(element);
				this._items[k] = item;
				this.menu.addItem(item, 1);
			} else if (snapshot !== snapshots[k]) {
				item.update(element);
			}
			snapshots[k] = snapshot;

			if (sibling) {
				this.menu._grid.set_child_below_sibling(item, sibling);
			} else {
				this.menu._grid.set_child_above_sibling(item, null);
			}
			sibling = item;
		}

		return sibling;
	}

	_remove_item(key) {
		const item = this._items[key];
		item.menu?.close();
		item.menu?.destroy();
		item.destroy();
		delete this._items[key];
	}

	_clear() {
		Object.keys(this._items).forEach(key => this._remove_item(key));
		this._containers_snapshot = {};
		this._images_snapshot = {};
	}
}