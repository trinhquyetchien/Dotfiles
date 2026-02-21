import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Me_PopupMenu from './popupMenu.js';

import * as ContainerMenuText from './containerMenuText.js';
import * as ContainerMenuIcons from './containerMenuIcons.js';
import * as ImageMenuText from './imageMenuText.js';
import * as ImageMenuIcons from './imageMenuIcons.js';

import DockerAPI from '../lib/docker.js';
import DockerManager from '../lib/dockerManager.js';

const Menu = GObject.registerClass(
	class Menu extends PanelMenu.Button {
		_init() {
			super._init(0.0, _('Docker Menu'));
			this._settings = DockerManager.settings;
			this._timerID = null;

			// Add icon
			const boxLayout = new St.BoxLayout();
			this.add_child(boxLayout);

			// Set icon
			this._gicon = Gio.icon_new_for_string(DockerManager.getDefault().path + `/resources/docker_${this._settings.get_string('logo')}.png`);
			this._icon = new St.Icon({ gicon: this._gicon, icon_size: '24' });
			boxLayout.add_child(this._icon);

			// Label to display total of running containers
			this._label = new St.Label();
			boxLayout.add_child(this._label);
			this._set_timer();

			this._settings.connect('changed::logo', this._logo_change.bind(this));

			this._settings.connect('changed::up-containers-timer', this._up_containers_timer_change.bind(this));

			this.connect('button-press-event', async () => {
				this.menu.removeAll();
				try {
					await this._show();
				} catch (error) {
					console.error(error);
				}
				this.menu.open();
			});
		}

		destroy() {
			this._remove_timer();
			super.destroy();
		}

		async _show() {
			// Check if docker is running
			let is_running = await DockerAPI.is_docker_running();
			if (!is_running) {
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


			this._containers = new PopupMenu.PopupMenuSection();
			this._scroll_section.addMenuItem(this._containers);
			this._images = new PopupMenu.PopupMenuSection();
			this._scroll_section.addMenuItem(this._images);

			try {
				await Promise.all([this._show_containers(), this._show_images()]);
			} catch (e) {
				console.error(e)
			}
		}

		async _show_containers() {
			// Check if show containers.
			if (this._settings.get_enum('show-value') === 2) {
				return;
			}

			// Menu type.
			let menu = ContainerMenuText;
			if (this._settings.get_enum('menu-type') === 1) {
				menu = ContainerMenuIcons;
			}

			await DockerAPI.get_containers()
				.then((containers) => {
					if (containers.length === 0) {
						return;
					}

					this._containers.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Containers'));
					containers.forEach((container) => {
						container.settings = this._settings;
						this[container.id] = new menu.Container_Menu(container);
						this._containers.addMenuItem(this[container.id]);
					});
				});
		}

		async _show_images() {
			// Check if show images.
			if (this._settings.get_enum('show-value').toString() === "1") {
				return;
			}

			// Menu type.
			let menu = ImageMenuText;
			if (this._settings.get_enum('menu-type').toString() === "1") {
				menu = ImageMenuIcons;
			}

			await DockerAPI.get_images()
				.then((images) => {
					if (images.length === 0) {
						return;
					}

					this._images.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Images'));
					images.forEach((image) => {
						image.settings = this._settings;
						this[image.id] = new menu.Image_Menu(image);
						this._images.addMenuItem(this[image.id]);
					});
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
	}
);

export default Menu;