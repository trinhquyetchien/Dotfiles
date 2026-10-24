import GObject from 'gi://GObject';

import { QuickSettingsItem } from 'resource:///org/gnome/shell/ui/quickSettings.js';

import DockerAPI from '../lib/docker.js';

export default class StartButton
	extends QuickSettingsItem {

	static {
		GObject.registerClass(this);
	}

	constructor(parent) {
		super({
			style_class: 'icon-button',
			can_focus: true,
			label: DockerAPI.docker_commands.s_start.label,
		});
		this._parent = parent;

		this.connect('clicked', () => {
			DockerAPI.run_command(DockerAPI.docker_commands.s_start)
			this._parent.menu.close();
		});
	}
}
