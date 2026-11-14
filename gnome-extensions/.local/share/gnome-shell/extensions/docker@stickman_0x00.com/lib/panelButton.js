import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import DockerManager from './dockerManager.js';
import DockerCounter from './dockerCounter.js';
import MenuRefresher from './menuRefresher.js';
import { logo_icon } from './utils.js';

const [major] = Config.PACKAGE_VERSION.split('.').map(s => Number(s));

/**
 * Panel button shared by the menus: docker logo, running containers counter
 * and a refresh while the menu is open.
 * Subclasses implement `_show`, which builds the menu on click, and `_refresh`.
 */
export default class DockerPanelButton
	extends PanelMenu.Button {

	static {
		GObject.registerClass(this);
	}

	/**
	 * @param {Boolean} dontCreateMenu - the subclass sets its own menu
	 */
	constructor(dontCreateMenu = false) {
		super(0.0, _('Docker Menu'), dontCreateMenu);
		this._settings = DockerManager.settings;
		this._console = DockerManager.console;

		// Add icon
		const boxLayout = new St.BoxLayout();
		this.add_child(boxLayout);

		this._icon = new St.Icon({ gicon: logo_icon(), icon_size: '24' });
		boxLayout.add_child(this._icon);
		this._settings.connectObject('changed::logo', this._logo_change.bind(this), this);

		// Label to display total of running containers
		this._label = new St.Label({ style_class: 'docker-counter-label' });
		boxLayout.add_child(this._label);
		this._dockerCounter = new DockerCounter(this._label);

		// Refresh containers state while the menu is open
		this._menuRefresher = new MenuRefresher(() => this._refresh());

		// For some reason since Gnome 50 its needs this to work
		if (major >= 50) {
			this.clear_actions();
		}
		this.connect('button-press-event', async () => {
			try {
				await this._show();
			} catch (error) {
				this._console.error(error);
			}
			this.menu.open();
		});
	}

	destroy() {
		this._settings.disconnectObject(this);
		this._dockerCounter.destroy();
		this._menuRefresher.destroy();

		super.destroy();
	}

	_logo_change(settings, key) {
		this._icon.set_gicon(logo_icon(settings.get_string(key)));
	}
}
