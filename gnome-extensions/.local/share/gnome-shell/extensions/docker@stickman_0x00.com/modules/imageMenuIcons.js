import GObject from 'gi://GObject';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import ConfirmDialog from '../ui/dialogs/confirm.js';
import * as Me_PopupMenu from './popupMenu.js';

import DockerAPI from '../lib/docker.js';

export const Image_Menu = GObject.registerClass(
	class Image_Menu extends Me_PopupMenu.PopupSubMenuMenuItem {
		constructor(image) {
			super(image.name);

			// Set size of sub menu. !important
			this.menu.actor.style = `min-height: ${image.settings.get_int('submenu-image')}px;`;

			this.new_action_button("media-playback-start", () => {
				DockerAPI.run_command(DockerAPI.docker_commands.i_run, image);
			}, _("Run"));

			this.new_action_button("utilities-terminal", () => {
				DockerAPI.run_command(DockerAPI.docker_commands.i_run_i, image);
			}, _("Run interactive"));

			this.new_action_button("user-info", () => {
				DockerAPI.run_command(DockerAPI.docker_commands.i_inspect, image);
			}, _("Inspect"));

			this.new_action_button(
				"edit-delete",
				() => new ConfirmDialog(
					DockerAPI.docker_commands.i_rm.label, // Dialog title
					_(`Are you sure you want to ${DockerAPI.docker_commands.i_rm.label}?`), // Description
					() => DockerAPI.run_command(DockerAPI.docker_commands.i_rm, image),
				).open(),
				DockerAPI.docker_commands.i_rm.label
			);
		}
	}
)