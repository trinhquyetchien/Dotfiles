import GObject from 'gi://GObject';
import St from 'gi://St';

import { PopupMenuSection, PopupSeparatorMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import DockerAPI from '../lib/docker.js';
import DockerManager from '../lib/dockerManager.js';
import { logo_icon, resource_icon } from '../lib/utils.js';
import CommandToggle from './commandToggle.js';
import InformationDialog from './dialogs/information.js';

export default class ContainerMenu
	extends CommandToggle {

	static {
		GObject.registerClass(this);
	}

	constructor(parent, container) {
		super(parent);

		// HEADER INFORMATION BUTTON
		const button = new St.Button({ "icon-name": 'help-about-symbolic' });
		button.connect('clicked', () => new InformationDialog(this._container).open());
		this.menu.addHeaderSuffix(button);

		this.update(container);
	}

	/**
	 * Redraw the toggle and its menu with the given container state.
	 * @param {Object} container
	 */
	update(container) {
		this._container = container;

		this.title = container.health === 'unhealthy' && DockerManager.settings.get_boolean('show-health') ? `⚠ ${container.name}` : container.name;
		this.subtitle = container.compose_project || "";
		this.checked = container.state === "running";

		// ICON
		if (!container.compose_project) {
			this.gicon = logo_icon();
		} else {
			this.gicon = resource_icon('compose.png');
		}

		// HEADER
		if (!container.compose_project) {
			this.menu.setHeader(this.gicon, container.name, "");
		} else {
			this.menu.setHeader(this.gicon, container.name, container.compose_project + "\n" + container.compose_dir);
		}

		this.menu.removeAll();
		this._add_health();
		this._add_action();
		this._add_compose();
	}

	_add_health() {
		if (!DockerManager.settings.get_boolean('show-health')) return;
		this.menu.addMenuItem(new PopupSeparatorMenuItem(
			`${_('Health')}: ${DockerAPI.health_label(this._container.health)}`
		));
	}

	_add_action() {
		this._actionSection = new PopupMenuSection();
		this.menu.addMenuItem(this._actionSection);

		for (const command of DockerAPI.container_commands(this._container.state)) {
			this._add_command(this._actionSection, command, this._container);
		}
	}

	_add_compose() {
		// Check if container belongs to compose.
		if (!this._container.compose_dir) {
			return;
		}

		this.menu.addMenuItem(new PopupSeparatorMenuItem(`Compose:${this._container.compose_project}`));

		this._composeSection = new PopupMenuSection();
		this.menu.addMenuItem(this._composeSection);

		for (const command of DockerAPI.compose_commands(this._container.state)) {
			this._add_command(this._composeSection, command, this._container, command.label + " " + this._container.compose_project);
		}
	}
}
