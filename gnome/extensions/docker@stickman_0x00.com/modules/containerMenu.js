import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Me_PopupMenu from './popupMenu.js';

export const Container_Menu = GObject.registerClass(
	class Container_Menu extends Me_PopupMenu.PopupSubMenuMenuItem {
		constructor(container) {
			super(container.name);
			this._container = container;
			this._compose_label = ` (${container.compose_project})`;
			this._set_state();
			this._set_docker_compose();
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
		}

		add_information() {
			if (!this._container.settings.get_boolean('show-information')) {
				return;
			}

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(_("Information")));

			const clipboard = St.Clipboard.get_default();
			const clipboard_copied = _("copied to clipboard");

			this._ip = new PopupMenu.PopupMenuItem(`IP: ${this._container.ip}/${this._container.ip_prefix}`);
			this._ip.connect('activate', () => {
				clipboard.set_text(St.ClipboardType.CLIPBOARD, this._container.ip);
				Main.notify(`IP ${clipboard_copied}`, null);
			});

			this.menu.addMenuItem(this._ip);

			this._gateway = new PopupMenu.PopupMenuItem(`Gateway: ${this._container.gateway}`);
			this._gateway.connect('activate', () => {
				clipboard.set_text(St.ClipboardType.CLIPBOARD, this._container.gateway);
				Main.notify(`Gateway ${clipboard_copied}}`, null);
			});

			this.menu.addMenuItem(this._gateway);
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

			for (let key of Object.keys(this._container.ports)) {
				let port = key.split("/")[0];
				let by_ip = `${this._container.ip}:${port}`;
				this[by_ip] = new PopupMenu.PopupMenuItem(`${port} -> ${by_ip}`);
				this[by_ip].connect('activate', () => {
					// Open in browser
					GLib.spawn_command_line_async(`xdg-open http://${by_ip}`);
				});

				this.menu.addMenuItem(this[by_ip]);

				if (this._container.ports[key][0].HostPort) {
					let host_port = this._container.ports[key][0].HostPort;
					let by_localhost = `localhost:${host_port}`;
					this[by_localhost] = new PopupMenu.PopupMenuItem(`${port} -> ${by_localhost}`);
					this[by_localhost].connect('activate', () => {
						// Open in browser
						GLib.spawn_command_line_async(`xdg-open http://${by_localhost}`);
					});

					this.menu.addMenuItem(this[by_localhost]);
				}
			}
		}
	}
)