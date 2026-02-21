import GObject from 'gi://GObject';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import ConfirmDialog from '../ui/dialogs/confirm.js';
import * as ContainerMenu from './containerMenu.js';

import DockerAPI from '../lib/docker.js';



export const Container_Menu = GObject.registerClass(
	class Container_Menu extends ContainerMenu.Container_Menu {
		constructor(container) {
			super(container);

			// Set size of sub menu. !important
			this.menu.actor.style = `min-height: ${container.settings.get_int('submenu-text')}px;`;

			this.add_information();

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("Docker"));

			switch (container.state) {
				case "running":
					this._shell = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_exec.label);
					this._shell.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_exec, container));
					this.menu.addMenuItem(this._shell);

					this._attach = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_attach.label);
					this._attach.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_attach, container));
					this.menu.addMenuItem(this._attach);

					this._pause = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_pause.label);
					this._pause.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_pause, container));
					this.menu.addMenuItem(this._pause);

					this._stop = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_stop.label);
					this._stop.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_stop, container));
					this.menu.addMenuItem(this._stop);

					this._restart = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_restart.label);
					this._restart.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_restart, container));
					this.menu.addMenuItem(this._restart);
					break;

				case "paused":
					this._unpause = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_unpause.label);
					this._unpause.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_unpause, container));
					this.menu.addMenuItem(this._unpause);

					this._stop = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_stop.label);
					this._stop.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_stop, container));
					this.menu.addMenuItem(this._stop);

					this._restart = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_restart.label);
					this._restart.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_restart, container));
					this.menu.addMenuItem(this._restart);
					break;

				default:
					this._start = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_start.label);
					this._start.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_start, container));
					this.menu.addMenuItem(this._start);

					this._start_i = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_start_i.label);
					this._start_i.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_start_i, container));
					this.menu.addMenuItem(this._start_i);
			}

			this._logs = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_logs.label);
			this._logs.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_logs, container));
			this.menu.addMenuItem(this._logs);

			this._inspect = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_inspect.label);
			this._inspect.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.c_inspect, container));
			this.menu.addMenuItem(this._inspect);

			// Remove
			this._remove = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.c_rm.label);
			this._remove.connect(
				'activate',
				() => new ConfirmDialog(DockerAPI.docker_commands.c_rm.label,
					_(`Are you sure you want to ${DockerAPI.docker_commands.c_rm.label}?`),
					() => DockerAPI.run_command(DockerAPI.docker_commands.c_rm, container)
				).open()
			);
			this.menu.addMenuItem(this._remove);

			this.add_compose();
			this.add_ports();
		}
		add_compose() {
			// Check if container belongs to compose.
			if (!this._container.compose_dir) {
				return;
			}

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(`Compose:${this._container.compose_project}`));

			switch (this._container.state) {
				case "running":
					// Stop
					this._compose_stop = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.compose_stop.label);
					this._compose_stop.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.compose_stop, this._container));
					this.menu.addMenuItem(this._compose_stop);
					break;

				default:
					// Up
					this._compose_up = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.compose_up.label);
					this._compose_up.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.compose_up, this._container));
					this.menu.addMenuItem(this._compose_up);

					// Remove
					this._compose_remove = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.compose_rm.label);
					this._compose_remove.connect(
						'activate',
						() => new ConfirmDialog(
							DockerAPI.docker_commands.compose_rm.label + this._compose_label,
							_(`Are you sure you want to ${DockerAPI.docker_commands.compose_rm.label}?`),
							() => DockerAPI.run_command(DockerAPI.docker_commands.compose_rm, this._container),
						).open()
					);
					this.menu.addMenuItem(this._compose_remove);
					break;
			}
		}
	}
)