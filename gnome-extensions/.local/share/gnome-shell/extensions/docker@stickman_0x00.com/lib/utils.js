import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';

import DockerManager from './dockerManager.js';

/**
 * Icon from the extension `resources` folder.
 * @param {string} file
 * @return {Gio.Icon}
 */
export function resource_icon(file) {
	return Gio.icon_new_for_string(`${DockerManager.getDefault().path}/resources/${file}`);
}

/**
 * Docker logo icon, the one from the `logo` setting by default.
 * @param {string} [logo]
 * @return {Gio.Icon}
 */
export function logo_icon(logo = DockerManager.settings.get_string('logo')) {
	return resource_icon(`docker_${logo}.png`);
}

// `show-value` setting: 0 both, 1 containers only, 2 images only.

/** @return {Boolean} whether the menus list containers */
export function show_containers() {
	return DockerManager.settings.get_enum('show-value') !== 2;
}

/** @return {Boolean} whether the menus list images */
export function show_images() {
	return DockerManager.settings.get_enum('show-value') !== 1;
}

/**
 * @param {string} text
 */
export function copy_to_clipboard(text) {
	St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, text);
}

/**
 * Open `http://<address>` with the default browser.
 * @param {string} address - host:port
 */
export function open_url(address) {
	GLib.spawn_command_line_async(`xdg-open http://${address}`);
}

/**
 * Addresses the ports of a container are reachable on, by container IP and by localhost when published.
 * @param {Object} container
 * @return {Array.<{label: string, address: string}>}
 */
export function port_addresses(container) {
	const addresses = [];
	for (const key of Object.keys(container.ports)) {
		const port = key.split("/")[0];
		const by_ip = `${container.ip}:${port}`;
		addresses.push({ label: `${port} -> ${by_ip}`, address: by_ip });

		const host_port = container.ports[key]?.[0]?.HostPort;
		if (host_port) {
			const by_localhost = `localhost:${host_port}`;
			addresses.push({ label: `${port} -> ${by_localhost}`, address: by_localhost });
		}
	}
	return addresses;
}
