import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Config from 'resource:///org/gnome/shell/misc/config.js';
const [major, _minor] = Config.PACKAGE_VERSION.split('.').map(s => Number(s));

import * as Tooltip from '../lib/tooltip.js';

export const PopupSubMenuMenuItem = GObject.registerClass(
	class PopupSubMenuMenuItem extends PopupMenu.PopupSubMenuMenuItem {
		constructor(name) {
			super(name);
			this.buttons = 0;
			// this.style = "word-wrap: break-word; width: 200px;";
		}

		new_action_button(icon, onClickAction, tooltip) {
			// Calculate button row, 3 buttons per row
			let menu = "_menu" + ~~(this.buttons / 3);
			if (this.buttons % 3 === 0) {
				this[menu] = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
				this.menu.addMenuItem(this[menu]);
			}

			this[tooltip] = new St.Button({
				track_hover: true,
				style_class: "button",
				x_expand: true,
				x_align: Clutter.ActorAlign.CENTER
			});

			this[tooltip].child = new St.Icon({
				icon_name: icon,
				style_class: "popup-menu-icon"
			});

			this[tooltip].tooltip = new Tooltip.Tooltip({
				parent: this[tooltip],
				markup: tooltip,
				y_offset: 35
			});

			this[tooltip].connect('clicked', () => {
				onClickAction();
				this._parent._parent._parent.close();
			});

			this[menu].actor.add_child(this[tooltip]);
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

		if (major < 46) {
			this.actor.add_actor(this.box);
		} else {
			this.actor.set_child(this.box);
		}

		this.actor._delegate = this;
	}
};