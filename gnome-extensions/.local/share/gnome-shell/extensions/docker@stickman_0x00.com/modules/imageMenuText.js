import GObject from 'gi://GObject';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import ConfirmDialog from '../ui/dialogs/confirm.js';

import DockerAPI from '../lib/docker.js';

export const Image_Menu = GObject.registerClass(
	class Image_Menu extends PopupMenu.PopupSubMenuMenuItem {
		constructor(image) {
			super(image.name);

			// Set size of sub menu. !important
			this.menu.actor.style = `min-height: ${image.settings.get_int('submenu-text')}px;`;

			this._remove = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.i_run.label);
			this._remove.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.i_run, image));
			this.menu.addMenuItem(this._remove);

			this._remove = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.i_run_i.label);
			this._remove.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.i_run_i, image));
			this.menu.addMenuItem(this._remove);

			this._inspect = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.i_inspect.label);
			this._inspect.connect('activate', () => DockerAPI.run_command(DockerAPI.docker_commands.i_inspect, image));
			this.menu.addMenuItem(this._inspect);

			this._remove = new PopupMenu.PopupMenuItem(DockerAPI.docker_commands.i_rm.label);
			this._remove.connect(
				'activate',
				() => new ConfirmDialog(
					DockerAPI.docker_commands.i_rm.label, // Dialog title
					_(`Are you sure you want to ${DockerAPI.docker_commands.i_rm.label}?`), // Description
					() => DockerAPI.run_command(DockerAPI.docker_commands.i_rm, image),
				).open(),
			);
			this.menu.addMenuItem(this._remove);
		}
	}
)