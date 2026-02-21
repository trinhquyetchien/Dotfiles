import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import { QuickMenuToggle } from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { PopupMenuSection, PopupSeparatorMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import ConfirmDialog from './dialogs/confirm.js';

import DockerAPI from '../lib/docker.js';
import DockerManager from '../lib/dockerManager.js';
import InformationDialog from './dialogs/information.js';

export default class ContainerMenu
	extends QuickMenuToggle {

	static {
		GObject.registerClass(this);
	}

	constructor(parent, container) {
		super({
			title: container.name,
			subtitle: container.compose_project || "",
			toggleMode: false,
			checked: container.state === "running",
		});
		this._parent = parent;
		this._container = container;

		// ICON
		if (!container.compose_project) {
			this.gicon = Gio.icon_new_for_string(DockerManager.getDefault().path + `/resources/docker_${DockerManager.settings.get_string('logo')}.png`);
		} else {
			this.gicon = Gio.icon_new_for_string(DockerManager.getDefault().path + `/resources/compose.png`);
		}

		// HEADER
		if (!container.compose_project) {
			this.menu.setHeader(this.gicon, container.name, "");
		} else {
			this.menu.setHeader(this.gicon, container.name, container.compose_project + "\n" + container.compose_dir);
		}

		// HEADER INFORMATION BUTTON
		const button = new St.Button({ "icon-name": 'help-about-symbolic' });
		button.connect('clicked', () => new InformationDialog(container).open());
		this.menu.addHeaderSuffix(button);

		//this._box.remove_child(this._menuButton);
		this.connect('clicked', async () => {
			// TODO: Instead of opening start and stop with a dialog?
			this.menu.open()
		});

		this._add_action();
		this._add_compose();
	}

	_add_action() {
		this._actionSection = new PopupMenuSection();
		this.menu.addMenuItem(this._actionSection);

		switch (this._container.state) {
			case "running":
				this._actionSection.addAction(
					DockerAPI.docker_commands.c_exec.label,
					() => this._action(DockerAPI.docker_commands.c_exec),
					"utilities-terminal",
				);
				this._actionSection.addAction(
					DockerAPI.docker_commands.c_attach.label,
					() => this._action(DockerAPI.docker_commands.c_attach),
					"emblem-symbolic-link",
				);
				this._actionSection.addAction(
					DockerAPI.docker_commands.c_pause.label,
					() => this._action(DockerAPI.docker_commands.c_pause),
					"media-playback-pause"
				);
				this._actionSection.addAction(
					DockerAPI.docker_commands.c_stop.label,
					() => this._action(DockerAPI.docker_commands.c_stop),
					"media-playback-stop",
				);
				this._actionSection.addAction(
					DockerAPI.docker_commands.c_restart.label,
					() => this._action(DockerAPI.docker_commands.c_restart),
					"object-rotate-left",
				);
				break;

			case "paused":
				this._actionSection.addAction(
					DockerAPI.docker_commands.c_unpause.label,
					() => this._action(DockerAPI.docker_commands.c_unpause),
					"media-playback-start",
				);
				this._actionSection.addAction(
					DockerAPI.docker_commands.c_stop.label,
					() => this._action(DockerAPI.docker_commands.c_stop),
					"media-playback-stop"
				);
				this._actionSection.addAction(
					DockerAPI.docker_commands.c_restart.label,
					() => this._action(DockerAPI.docker_commands.c_restart),
					"object-rotate-left",
				);
				break;

			default:
				this._actionSection.addAction(
					DockerAPI.docker_commands.c_start.label,
					() => this._action(DockerAPI.docker_commands.c_start),
					"media-playback-start",
				);
				this._actionSection.addAction(
					DockerAPI.docker_commands.c_start_i.label,
					() => this._action(DockerAPI.docker_commands.c_start_i),
					"utilities-terminal"
				);
		}

		this._actionSection.addAction(
			DockerAPI.docker_commands.c_logs.label,
			() => this._action(DockerAPI.docker_commands.c_logs),
			"format-justify-fill"
		);
		this._actionSection.addAction(
			DockerAPI.docker_commands.c_inspect.label,
			() => this._action(DockerAPI.docker_commands.c_inspect),
			"user-info"
		);
		this._actionSection.addAction(
			DockerAPI.docker_commands.c_rm.label,
			() => new ConfirmDialog(
				DockerAPI.docker_commands.c_rm.label,
				_(`Are you sure you want to ${DockerAPI.docker_commands.c_rm.label}?`),
				() => this._action(DockerAPI.docker_commands.c_rm),
			).open(),
			"edit-delete"
		);
	}

	_add_compose() {
		// Check if container belongs to compose.
		if (!this._container.compose_dir) {
			return;
		}

		this.menu.addMenuItem(new PopupSeparatorMenuItem(`Compose:${this._container.compose_project}`));

		this._composeSection = new PopupMenuSection();
		this.menu.addMenuItem(this._composeSection);


		switch (this._container.state) {
			case "running":
				this._composeSection.addAction( // Stop
					DockerAPI.docker_commands.compose_stop.label,
					() => this._action(DockerAPI.docker_commands.compose_stop),
					"media-playback-stop"
				);
				break;

			default:
				this._composeSection.addAction( // Up
					DockerAPI.docker_commands.compose_up.label,
					() => this._action(DockerAPI.docker_commands.compose_up),
					"media-playback-start"
				);
				this._composeSection.addAction( // Remove
					DockerAPI.docker_commands.compose_rm.label,
					() => new ConfirmDialog(
						DockerAPI.docker_commands.compose_rm.label + " " + this._container.compose_project,
						_(`Are you sure you want to ${DockerAPI.docker_commands.compose_rm.label}?`),
						() => this._action(DockerAPI.docker_commands.compose_rm),
					).open(),
					"edit-delete"
				);
				break;
		}
	}

	_action(command) {
		DockerAPI.run_command(command, this._container);
		this._parent.menu.close();
	}
}
