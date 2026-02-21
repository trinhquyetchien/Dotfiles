import GObject from 'gi://GObject';

import { QuickMenuToggle } from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { PopupMenuSection } from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import DockerAPI from '../lib/docker.js';
import ConfirmDialog from './dialogs/confirm.js';

export default class ImageMenu
	extends QuickMenuToggle {

	static {
		GObject.registerClass(this);
	}

	constructor(parent, image) {
		super({
			title: image.name,
			toggleMode: false,
			iconName: "image-x-generic-symbolic",
		});
		this._parent = parent;
		this._image = image;

		// TODO: Schema enable header
		this.menu.setHeader("image-x-generic-symbolic", image.name, "");

		this._actionSection = new PopupMenuSection();
		this.menu.addMenuItem(this._actionSection);

		this._actionSection.addAction(
			DockerAPI.docker_commands.i_run.label,
			() => this._action(DockerAPI.docker_commands.i_run),
			"media-playback-start",
		);
		this._actionSection.addAction(
			DockerAPI.docker_commands.i_run_i.label,
			() => this._action(DockerAPI.docker_commands.i_run_i),
			"utilities-terminal",
		);
		this._actionSection.addAction(
			DockerAPI.docker_commands.i_inspect.label,
			() => this._action(DockerAPI.docker_commands.i_inspect),
			"user-info",
		);
		this._actionSection.addAction(
			DockerAPI.docker_commands.i_rm.label,
			() => new ConfirmDialog(
				DockerAPI.docker_commands.i_rm.label, // Dialog title
				_(`Are you sure you want to ${DockerAPI.docker_commands.i_rm.label}?`), // Description
				() => this._action(DockerAPI.docker_commands.i_rm),
			).open(),
			"edit-delete",
		);

		//this._box.remove_child(this._menuButton);
		this.connect('clicked', async () => {
			this.menu.open()
		});
	}

	_action(command) {
		DockerAPI.run_command(command, this._image);
		this._parent.menu.close();
	}
}