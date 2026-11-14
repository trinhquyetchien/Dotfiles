import GObject from 'gi://GObject';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Me_PopupMenu from './popupMenu.js';

import * as ContainerMenu from './containerMenu.js';
import * as ImageMenu from './imageMenu.js';

import DockerAPI from '../lib/docker.js';
import DockerPanelButton from '../lib/panelButton.js';
import { show_containers, show_images } from '../lib/utils.js';

/**
 * Lists shown in the menu.
 * `key` identifies a menu item across redraws.
 * A function, so the titles are translated after the extension loads its translations.
 */
const lists = () => [
	{
		title: _('Containers'),
		show: show_containers,
		fetch: () => DockerAPI.get_containers(),
		create: container => new ContainerMenu.Container_Menu(container),
		key: item => item._container?.id,
	},
	{
		title: _('Images'),
		show: show_images,
		fetch: () => DockerAPI.get_images(),
		create: image => new ImageMenu.Image_Menu(image),
		key: item => item._image && `${item._image.id}:${item._image.name}`,
	},
];

export default class Menu
	extends DockerPanelButton {

	static {
		GObject.registerClass(this);
	}

	constructor() {
		super();
		this._sections = [];
		this._menuRefresher.watch(this.menu);
	}

	async _show() {
		this.menu.removeAll();
		this._sections = [];

		// Check if docker is running
		this._docker_running = await DockerAPI.is_docker_running();
		if (!this._docker_running) {
			// Docker is not running.
			// Add button start
			this.menu.addAction(DockerAPI.docker_commands.s_start.label, () => {
				DockerAPI.run_command(DockerAPI.docker_commands.s_start);
			});
			return;
		}

		// Docker is running.
		this._scroll_section = new Me_PopupMenu.PopupMenuScrollSection();
		this.menu.addMenuItem(this._scroll_section);

		this._sections = lists().map(list => {
			const section = new PopupMenu.PopupMenuSection();
			this._scroll_section.addMenuItem(section);
			return { list, section, snapshot: null };
		});

		try {
			await Promise.all(this._sections.map(async (s) => {
				if (s.list.show()) {
					this._add_items(s, await s.list.fetch());
				}
			}));
		} catch (e) {
			this._console.error(e)
		}
	}

	/**
	 * Add the menu items of a list to its section.
	 * @param {Object} s - entry of `this._sections`
	 * @param {Array} elements - containers or images
	 */
	_add_items(s, elements) {
		// Snapshot used to detect changes on refresh.
		s.snapshot = JSON.stringify(elements);

		if (elements.length === 0) {
			return;
		}

		s.section.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(s.list.title));
		elements.forEach((element) => {
			element.settings = this._settings;
			s.section.addMenuItem(s.list.create(element));
		});
	}

	async _refresh() {
		const is_running = await DockerAPI.is_docker_running();
		if (!this.menu.isOpen) {
			return;
		}

		// Docker started or stopped: rebuild the whole menu.
		if (is_running !== this._docker_running) {
			await this._show();
			return;
		}

		if (!is_running) {
			return;
		}

		await Promise.all(this._sections.map(s => this._refresh_section(s)));
	}

	/**
	 * Redraw a section if its list changed.
	 * @param {Object} s - entry of `this._sections`
	 */
	async _refresh_section(s) {
		if (!s.list.show()) {
			return;
		}

		const elements = await s.list.fetch();

		// Menu closed or rebuilt while waiting for docker.
		if (!this.menu.isOpen || !this._sections.includes(s)) {
			return;
		}

		if (JSON.stringify(elements) === s.snapshot) {
			return;
		}

		this._redraw_section(s.section, () => this._add_items(s, elements), s.list.key);
	}

	/**
	 * Redraw a menu section and reopen the submenu that was open.
	 * @param {PopupMenu.PopupMenuSection} section
	 * @param {Function} add - adds the new items to the section
	 * @param {Function} key - identifies an item across redraws
	 */
	_redraw_section(section, add, key) {
		const open = section._getMenuItems().find(item => item.menu?.isOpen);
		const open_key = open && key(open);

		section.removeAll();
		add();

		if (open_key) {
			section._getMenuItems()
				.find(item => key(item) === open_key)
				?.setSubmenuShown(true);
		}
	}
}
