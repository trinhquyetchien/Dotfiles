import GObject from 'gi://GObject';

import { PopupMenuSection } from 'resource:///org/gnome/shell/ui/popupMenu.js';

import DockerAPI from '../lib/docker.js';
import CommandToggle from './commandToggle.js';

export default class ImageMenu
	extends CommandToggle {

	static {
		GObject.registerClass(this);
	}

	constructor(parent, image) {
		super(parent, {
			title: image.name,
			iconName: "image-x-generic-symbolic",
		});
		this._image = image;

		// TODO: Schema enable header
		this.menu.setHeader("image-x-generic-symbolic", image.name, "");

		this._actionSection = new PopupMenuSection();
		this.menu.addMenuItem(this._actionSection);

		for (const command of DockerAPI.image_commands()) {
			this._add_command(this._actionSection, command, image);
		}
	}
}
