import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import Menu from "./modules/menu.js";
import QuickSettingsMenu from "./ui/menu.js";

import DockerManager from "./lib/dockerManager.js";
import DockerAPI from "./lib/docker.js";

export default class DockerExtension extends Extension {
	constructor(metadata) {
		super(metadata);
	}

	enable() {
		this._settings = this.getSettings();
		this._dokcerManager = new DockerManager(this);
		this._dockerAPI = new DockerAPI();
		this._settings.connect('changed::menu-type', this._set_menu.bind(this));

		this._set_menu();
	}

	_set_menu() {
		this._indicator?.destroy();
		this._indicator = null;
		delete Main.panel.statusArea[this.uuid];

		if (this._settings.get_enum('menu-type') === 2) {
			this._indicator = new QuickSettingsMenu();
		} else {
			this._indicator = new Menu();
		}

		Main.panel.addToStatusArea(this.uuid, this._indicator);
	}

	disable() {
		this._indicator?.destroy();
		this._indicator = null;

		this._settings = null;

		this._dokcerManager.destroy();
		this._dokcerManager = null;
		this._dockerAPI.destroy();
		this._dockerAPI = null;

	}
}