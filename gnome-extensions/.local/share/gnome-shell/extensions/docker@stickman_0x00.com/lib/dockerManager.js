// Based: https://gitlab.com/arcmenu/ArcMenu/-/blob/master/arcmenuManager.js?ref_type=heads
export default class DockerManager {
	constructor(extension) {
		if (DockerManager._singleton)
			throw new Error('DockerManager has been already initialized');
		DockerManager._singleton = extension;
	}

	static getDefault() {
		return DockerManager._singleton;
	}

	static get extension() {
		return DockerManager.getDefault();
	}

	static get settings() {
		return DockerManager.getDefault()._settings;
	}

	/**
	 * @returns {Console}
	 */
	static get console() {
		return DockerManager.getDefault().getLogger();
	}

	destroy() {
		DockerManager._singleton = null;
	}
}