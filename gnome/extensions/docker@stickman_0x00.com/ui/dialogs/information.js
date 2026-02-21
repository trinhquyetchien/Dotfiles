import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { ModalDialog } from 'resource:///org/gnome/shell/ui/modalDialog.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

class InformationDialog extends ModalDialog {
	static {
		GObject.registerClass(this);
	}

	constructor(container) {
		super();

		this._main_box = new St.BoxLayout({
			vertical: true,
		});
		this.contentLayout.add_child(this._main_box);

		this._main_box.add_child(new St.Label({
			style: 'font-weight: bold',
			x_align: Clutter.ActorAlign.CENTER,
			text: _("Information")
		}));
		this._main_box.add_child(new St.Label());

		this._add_ip(container);
		this._add_gateway(container);
		this._add_ports(container);

		this.addButton({
			label: _('Close'),
			isDefault: true,
			action: () => {
				this.close();
			},
		});
	}

	_add_row(label, icon, func) {
		const box = new St.BoxLayout({
			vertical: false,
			x_expand: true,
		});
		this._main_box.add_child(box);

		box.add_child(new St.Label({
			x_align: Clutter.ActorAlign.START,
			y_align: Clutter.ActorAlign.CENTER,
			text: label
		}));

		box.add_child(new St.Label({
			text: "\t\t"
		}));

		const button = new St.Button({
			track_hover: true,
			style_class: "button",
			x_expand: true,
			x_align: Clutter.ActorAlign.END
		});
		button.child = new St.Icon({
			icon_name: icon,
			icon_size: '24'
		});
		button.connect('clicked', func);
		box.add_child(button)
	}

	_add_ip(container) {
		if (!container.ip) {
			return;
		}

		this._add_row(
			`IP: ${container.ip}/${container.ip_prefix}`,
			"edit-copy-symbolic",
			() => {
				St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, container.ip);
			}
		);
	}

	_add_gateway(container) {
		if (!container.gateway) {
			return;
		}

		this._add_row(
			`Gateway: ${container.gateway}`,
			"edit-copy-symbolic",
			() => {
				St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, container.gateway);
			}
		);
	}

	_add_ports(container) {
		if (!Object.keys(container.ports).length) {
			return;
		}

		for (let key of Object.keys(container.ports)) {
			const port = key.split("/")[0];
			const by_ip = `${container.ip}:${port}`;
			this._add_row(
				`${port} -> ${by_ip}`,
				"web-browser-symbolic",
				() => {
					GLib.spawn_command_line_async(`xdg-open http://${by_ip}`);
				}
			);

			if (container.ports[key][0].HostPort) {
				const host_port = container.ports[key][0].HostPort;
				const by_localhost = `localhost:${host_port}`;
				this._add_row(
					`${port} -> ${by_localhost}`,
					"web-browser-symbolic",
					() => {
						GLib.spawn_command_line_async(`xdg-open http://${by_localhost}`);
					}
				);
			}
		}
	}
}

export default InformationDialog;