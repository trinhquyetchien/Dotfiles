import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { ModalDialog } from 'resource:///org/gnome/shell/ui/modalDialog.js';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { copy_to_clipboard, open_url, port_addresses } from '../../lib/utils.js';

class InformationDialog extends ModalDialog {
	static {
		GObject.registerClass(this);
	}

	constructor(container) {
		super();

		this._main_box = new St.BoxLayout({
			orientation: Clutter.Orientation.VERTICAL,
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

	destroy() {
		this._main_box?.destroy();
		this._main_box = null;
		super.destroy();
	}

	_add_row(label, icon, func) {
		const box = new St.BoxLayout({
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
			() => copy_to_clipboard(container.ip)
		);
	}

	_add_gateway(container) {
		if (!container.gateway) {
			return;
		}

		this._add_row(
			`${_("Gateway")}: ${container.gateway}`,
			"edit-copy-symbolic",
			() => copy_to_clipboard(container.gateway)
		);
	}

	_add_ports(container) {
		if (!Object.keys(container.ports).length) {
			return;
		}

		for (const { label, address } of port_addresses(container)) {
			this._add_row(label, "web-browser-symbolic", () => open_url(address));
		}
	}
}

export default InformationDialog;