import GObject from 'gi://GObject';

import { QuickMenuToggle } from 'resource:///org/gnome/shell/ui/quickSettings.js';

import { confirm_command } from './dialogs/confirm.js';

import DockerAPI from '../lib/docker.js';

/**
 * Quick settings toggle with a menu of docker commands.
 */
export default class CommandToggle
	extends QuickMenuToggle {

	static {
		GObject.registerClass(this);
	}

	/**
	 * @param {PanelMenu.Button} parent
	 * @param {Object} [params] - QuickMenuToggle params
	 */
	constructor(parent, params = {}) {
		super({ ...params, toggleMode: false });
		this._parent = parent;

		//this._box.remove_child(this._menuButton);
		this.connect('clicked', () => {
			// TODO: Instead of opening start and stop with a dialog?
			this.menu.open()
		});
	}

	/**
	 * Add a menu item running a docker command.
	 * Commands with `confirm` ask first.
	 * Commands with `keep_menu_open` stop the menus from closing, the refresh shows the new state.
	 * @param {PopupMenu.PopupMenuSection} section
	 * @param {Object} command - command from DockerAPI.docker_commands
	 * @param {Object} target - container/image struct
	 * @param {string} [title] - title of the confirmation dialog
	 */
	_add_command(section, command, target, title = command.label) {
		const action = () => {
			DockerAPI.run_command(command, target);
			if (!command.keep_menu_open) {
				this._parent.menu.close();
			}
		};

		const item = section.addAction(command.label, () => confirm_command(command, action, title), command.icon);
		if (command.keep_menu_open) {
			item.connect('activate', () => GObject.signal_stop_emission_by_name(item, 'activate'));
		}
	}
}
