import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { confirm_command } from '../ui/dialogs/confirm.js';
import DockerAPI from '../lib/docker.js';
import * as Tooltip from '../lib/tooltip.js';

export const PopupSubMenuMenuItem = GObject.registerClass(
	class PopupSubMenuMenuItem extends PopupMenu.PopupSubMenuMenuItem {
		/**
		 * @param {string} name
		 * @param {Gio.Settings} settings
		 */
		constructor(name, settings) {
			super(name);
			this.buttons = 0;
			this._icon_buttons = settings.get_enum('menu-type') === 1;

			// Set size of sub menu. !important
			this.menu.actor.style = `min-height: ${settings.get_int(this._icon_buttons ? 'submenu-image' : 'submenu-text')}px;`;
		}

		/**
		 * Add a menu item, or a button on the icons menu, running a docker command.
		 * Commands with `confirm` ask first.
		 * Commands with `keep_menu_open` stop the menu from closing, the refresh shows the new state.
		 * @param {Object} command - command from DockerAPI.docker_commands
		 * @param {Object} target - container/image struct
		 * @param {string} [title] - title of the confirmation dialog
		 */
		add_command(command, target, title = command.label) {
			const action = () => confirm_command(command, () => DockerAPI.run_command(command, target), title);

			if (this._icon_buttons) {
				this._add_command_button(command, action);
			} else {
				this._add_command_item(command, action);
			}
		}

		_add_command_item(command, action) {
			const item = new PopupMenu.PopupMenuItem(command.label);
			item.connect('activate', () => {
				action();
				if (command.keep_menu_open) {
					GObject.signal_stop_emission_by_name(item, 'activate');
				}
			});
			this.menu.addMenuItem(item);
		}

		_add_command_button(command, action) {
			// Calculate button row, 3 buttons per row
			let menu = "_menu" + ~~(this.buttons / 3);
			if (this.buttons % 3 === 0) {
				this[menu] = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
				this.menu.addMenuItem(this[menu]);
			}

			const button = new St.Button({
				track_hover: true,
				style_class: "button",
				x_expand: true,
				x_align: Clutter.ActorAlign.CENTER
			});

			button.child = new St.Icon({
				icon_name: command.icon,
				style_class: "popup-menu-icon"
			});

			button.tooltip = new Tooltip.Tooltip({
				parent: button,
				markup: command.label,
				y_offset: 35
			});

			button.connect('clicked', () => {
				action();
				if (!command.keep_menu_open) {
					this._parent._parent._parent.close();
				}
			});

			this[menu].actor.add_child(button);
			this.buttons++;
		}
	}
);

export const PopupMenuScrollSection = class PopupMenuScrollSection extends PopupMenu.PopupMenuSection {
	constructor() {
		super();
		this.actor = new St.ScrollView({
			overlay_scrollbars: false,
		});

		this.actor.set_child(this.box);
		this.actor._delegate = this;
	}
};
