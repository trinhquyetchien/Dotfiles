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
			this.menu.actor.style = `min-height: ${container.settings.get_int('submenu-image')}px;`;

			this.add_information();

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem("Docker"));

			switch (container.state) {
				case "running":
					this.new_action_button("utilities-terminal", () => {
						DockerAPI.run_command(DockerAPI.docker_commands.c_exec, container)
					}, DockerAPI.docker_commands.c_exec.label);

					this.new_action_button("emblem-symbolic-link", () => {
						DockerAPI.run_command(DockerAPI.docker_commands.c_attach, container)
					}, DockerAPI.docker_commands.c_attach.label);

					this.new_action_button("media-playback-pause", () => {
						DockerAPI.run_command(DockerAPI.docker_commands.c_pause, container)
					}, DockerAPI.docker_commands.c_pause.label);

					this.new_action_button("media-playback-stop", () => {
						DockerAPI.run_command(DockerAPI.docker_commands.c_stop, container)
					}, DockerAPI.docker_commands.c_stop.label);

					this.new_action_button("object-rotate-left", () => {
						DockerAPI.run_command(DockerAPI.docker_commands.c_restart, container)
					}, DockerAPI.docker_commands.c_restart.label);

					break;

				case "paused":
					this.new_action_button("media-playback-start", () => {
						DockerAPI.run_command(DockerAPI.docker_commands.c_unpause, container)
					}, DockerAPI.docker_commands.c_unpause.label);

					this.new_action_button("media-playback-stop", () => {
						DockerAPI.run_command(DockerAPI.docker_commands.c_stop, container)
					}, DockerAPI.docker_commands.c_stop.label);

					this.new_action_button("object-rotate-left", () => {
						DockerAPI.run_command(DockerAPI.docker_commands.c_restart, container)
					}, DockerAPI.docker_commands.c_restart.label);
					break;

				default:
					this.new_action_button("media-playback-start", () => {
						DockerAPI.run_command(DockerAPI.docker_commands.c_start, container)
					}, DockerAPI.docker_commands.c_start.label);

					this.new_action_button("utilities-terminal", () => {
						DockerAPI.run_command(DockerAPI.docker_commands.c_start_i, container)
					}, DockerAPI.docker_commands.c_start_i.label);
			}

			this.new_action_button("format-justify-fill", () => {
				DockerAPI.run_command(DockerAPI.docker_commands.c_logs, container)
			}, DockerAPI.docker_commands.c_logs.label);

			this.new_action_button("user-info", () => {
				DockerAPI.run_command(DockerAPI.docker_commands.c_inspect, container)
			}, DockerAPI.docker_commands.c_inspect.label);

			// Remove
			this.new_action_button(
				"edit-delete",
				() => new ConfirmDialog(
					DockerAPI.docker_commands.c_rm.label, // Title
					_(`Are you sure you want to ${DockerAPI.docker_commands.c_rm.label}?`), // Description
					() => DockerAPI.run_command(DockerAPI.docker_commands.c_rm, container),
				).open(),
				DockerAPI.docker_commands.c_rm.label // Button
			);

			this.add_compose();
			this.add_ports();
		}

		add_compose() {
			// Check if container belongs to compose.
			if (!this._container.compose_dir) {
				return;
			}
			this.buttons = 0;

			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem(`Compose:${this._container.compose_project}`));

			switch (this._container.state) {
				case "running":
					// Stop
					this.new_action_button("media-playback-stop", () => {
						DockerAPI.run_command(DockerAPI.docker_commands.compose_stop, this._container);
					}, DockerAPI.docker_commands.compose_stop.label);
					break;

				default:
					// Up
					this.new_action_button(
						"media-playback-start",
						() => DockerAPI.run_command(DockerAPI.docker_commands.compose_up, this._container),
						DockerAPI.docker_commands.compose_up.label
					);

					// Remove
					this.new_action_button(
						"edit-delete",
						() => new ConfirmDialog(
							DockerAPI.docker_commands.compose_rm.label + this._compose_label, // Dialog title
							_(`Are you sure you want to ${DockerAPI.docker_commands.compose_rm.label}?`), // Description
							() => DockerAPI.run_command(DockerAPI.docker_commands.compose_rm, this._container),
						).open(),
						DockerAPI.docker_commands.compose_rm.label // Button label
					);
					break;
			}
		}
	}
)