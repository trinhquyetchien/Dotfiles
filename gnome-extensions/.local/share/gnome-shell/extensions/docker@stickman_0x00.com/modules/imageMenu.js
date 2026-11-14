import GObject from 'gi://GObject';

import * as Me_PopupMenu from './popupMenu.js';

import DockerAPI from '../lib/docker.js';

export const Image_Menu = GObject.registerClass(
	class Image_Menu extends Me_PopupMenu.PopupSubMenuMenuItem {
		constructor(image) {
			super(image.name, image.settings);
			this._image = image;

			for (const command of DockerAPI.image_commands()) {
				this.add_command(command, image);
			}
		}
	}
)
