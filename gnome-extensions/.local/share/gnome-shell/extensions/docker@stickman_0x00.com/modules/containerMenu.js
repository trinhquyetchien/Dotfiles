import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Me_PopupMenu from './popupMenu.js';
import DockerAPI from '../lib/docker.js';
import { copy_to_clipboard, open_url, port_addresses } from '../lib/utils.js';

export const Container_Menu = GObject.registerClass(
	class Container_Menu extends Me_PopupMenu.PopupSubMenuMenuItem {
		constructor(container) {
			super(container.name, container.settings);
			this._container = container;
			this._set_state();
			this._set_docker_compose();

			this.add_health();
			this.add_information();
			this.add_commands();
			this.add_ports();
		}

		_set_docker_compose() {
			if (this._container.compose_dir) {
				this._icon = new St.Icon({
					icon_name: 'media-record-symbolic',
					style_class: 'compose',
					icon_size: '14'
				});
				this.actor.insert_child_at_index(this._icon, 2);
			}
		}

		_set_state() {
			this._icon = new St.Icon({
				icon_name: 'media-record-symbolic',
				style_class: 'stop',
				icon_size: '14'
			});

			if (this._container.state === "running") {
				this._icon.style_class = 'running';
			}

			this.actor.insert_child_at_index(this._icon, 1);

			if (this._container.health === 'unhealthy' && this._container.settings.get_boolean('show-health')) {
				this._unhealthy_icon = new St.Icon({
					icon_name: 'dialog-warning-symbolic',
					style_class: 'unhealthy',
					icon_size: '14'
				});
				this.actor.insert_child_below(this._unhealthy_icon, this.label);
			}
		}

		add_health() {
			if (!this._container.settings.get_boolean('show-health')) return;
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(
				`${_('Health')}: ${DockerAPI.health_label(this._container.health)}`
			));
		}

		add_information() {
			if (!this._container.ip) {
				return;
			}

			if (!this._container.settings.get_boolean('show-information')) {
				return;
			}

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(_("Information")));

			const copied = name => _("%s copied to clipboard").replace('%s', name);

			this._ip = new PopupMenu.PopupMenuItem(`IP: ${this._container.ip}/${this._container.ip_prefix}`);
			this._ip.connect('activate', () => {
				copy_to_clipboard(this._container.ip);
				Main.notify(copied('IP'), null);
			});

			this.menu.addMenuItem(this._ip);

			this._gateway = new PopupMenu.PopupMenuItem(`${_("Gateway")}: ${this._container.gateway}`);
			this._gateway.connect('activate', () => {
				copy_to_clipboard(this._container.gateway);
				Main.notify(copied(_("Gateway")), null);
			});

			this.menu.addMenuItem(this._gateway);
		}

		add_commands() {
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("Docker"));
			for (const command of DockerAPI.container_commands(this._container.state)) {
				this.add_command(command, this._container);
			}

			// Check if container belongs to compose.
			if (!this._container.compose_dir) {
				return;
			}

			// Start a new row of buttons
			this.buttons = 0;

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(`Compose:${this._container.compose_project}`));
			const title_suffix = ` (${this._container.compose_project})`;
			for (const command of DockerAPI.compose_commands(this._container.state)) {
				this.add_command(command, this._container, command.label + title_suffix);
			}
		}

		add_ports() {
			if (!this._container.settings.get_boolean('show-ports') ||
				this._container.state !== "running") {
				return;
			}

			if (!Object.keys(this._container.ports).length) {
				return;
			}

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(_("Ports")));

			for (const { label, address } of port_addresses(this._container)) {
				const item = new PopupMenu.PopupMenuItem(label);
				item.connect('activate', () => open_url(address));
				this.menu.addMenuItem(item);
			}
		}
	}
)
