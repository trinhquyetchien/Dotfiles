import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class DockerPreferences extends ExtensionPreferences {
	constructor(metadata) {
		super(metadata);
	}

	fillPreferencesWindow(window) {
		// Use the same GSettings schema as in `extension.js`
		this._settings = this.getSettings();

		this._add_general_page(window);
		this._add_menu_page(window);
		this._add_old_menu_page(window);
		this._add_technical_page(window);

		window.connect('close-request', () => {
			this._settings = null;
		});
	}

	_add_general_page(window) {
		const general_page = new Adw.PreferencesPage({
			title: _("General"),
			"icon-name": "org.gnome.Settings-symbolic"
		});
		window.add(general_page);

		// GROUP: Logo
		const group_logo = new Adw.PreferencesGroup({
			title: _("Logo")
		});
		general_page.add(group_logo);

		group_logo.add(this._logo());
		group_logo.add(this._up_container_timer());

		// GROUP: Menu
		const group_ui = new Adw.PreferencesGroup({
			title: _("Menu")
		});
		general_page.add(group_ui);

		group_ui.add(this._menu_type());
		group_ui.add(this._visible_menus());
		group_ui.add(this._menu_refresh_timer());

		// GROUP: Show/Hide
		const group_show = new Adw.PreferencesGroup({
			title: _("Show/Hide")
		});
		general_page.add(group_show);

		group_show.add(this._switch("show-health"));
	}

	_add_menu_page(window) {
		const menu_old_page = new Adw.PreferencesPage({
			title: _("Menu Quick Settings"),
			"icon-name": "org.gnome.Settings-appearance-symbolic"
		});
		window.add(menu_old_page);

		const group = new Adw.PreferencesGroup();
		menu_old_page.add(group);

		group.add(this._quicksettings_columns());
	}

	_add_old_menu_page(window) {
		const menu_old_page = new Adw.PreferencesPage({
			title: _("Menu Text/Image"),
			"icon-name": "org.gnome.Settings-appearance-symbolic"
		});
		window.add(menu_old_page);

		// GROUP: Show/Hide
		const group_information = new Adw.PreferencesGroup({
			title: _("Show/Hide")
		});
		menu_old_page.add(group_information);

		group_information.add(this._switch("show-information"));
		group_information.add(this._switch("show-ports"));

		// GROUP: Size
		const group_size = new Adw.PreferencesGroup({
			title: _("Size")
		});
		menu_old_page.add(group_size);

		group_size.add(this._submenu_text_size());
		group_size.add(this._submenu_image_size());
	}

	_add_technical_page(window) {
		const technical_page = new Adw.PreferencesPage({
			title: _("Technical"),
			"icon-name": "org.gnome.Settings-symbolic"
		});
		window.add(technical_page);

		const group = new Adw.PreferencesGroup();
		technical_page.add(group);

		group.add(this._row_input("terminal"));
		group.add(this._row_input("stop-command-options"));

		const group_logs = new Adw.PreferencesGroup({
			title: _("Logs")
		});
		technical_page.add(group_logs);

		group_logs.add(this._switch("logs-include-previous"));
		group_logs.add(this._logs_tail_length());
	}

	/**
	 * Creates a row with title and subtitle from
	 * the key schema and `widget` as suffix
	 *
	 * @param {string} key - the key string from schema
	 * @param {Gtk.Widget} widget
	 * @returns {Adw.ActionRow}
	 */
	_row(key, widget) {
		const schema_key = this._settings.settings_schema.get_key(key);
		const row = new Adw.ActionRow({
			title: schema_key.get_summary(),
			subtitle: this._description(schema_key),
		});

		widget.set_valign(Gtk.Align.CENTER);
		row.add_suffix(widget);
		row.set_activatable_widget(widget);

		return row;
	}

	/**
	 * Translated description of a schema key.
	 * GLib translates it with the paragraph breaks, but xgettext extracts
	 * multi-paragraph descriptions joined in one line, so try that too.
	 *
	 * @param {Gio.SettingsSchemaKey} schema_key
	 * @returns {string}
	 */
	_description(schema_key) {
		const description = schema_key.get_description();
		const joined = description.replace(/\s+/g, ' ');
		const translated = _(joined);

		return translated === joined ? description : translated;
	}

	/**
	 * Creates a row with `widget` bound to the key
	 *
	 * @param {string} key - the key string from schema
	 * @param {Gtk.Widget} widget
	 * @param {string} property - widget property bound to the key
	 * @returns {Adw.ActionRow}
	 */
	_bound_row(key, widget, property) {
		this._settings.bind(
			key,
			widget,
			property,
			Gio.SettingsBindFlags.DEFAULT
		);

		return this._row(key, widget);
	}

	_logs_tail_length() {
		return this._spin("logs-tail-length", 0, 100000, 50);
	}

	_logo() {
		return this._dropdown("logo", [
			_("Default"),
			_("Black"),
			_("Transparent"),
			_("White"),
		]);
	}

	_up_container_timer() {
		return this._spin("up-containers-timer", 0, 60, 5);
	}

	_menu_refresh_timer() {
		return this._spin("menu-refresh-timer", 0, 60, 1);
	}

	_menu_type() {
		return this._dropdown("menu-type", [
			_("Text"),
			_("Icons"),
			_("Quick Settings")
		]);
	}

	_visible_menus() {
		return this._dropdown("show-value", [
			_("Both"),
			_("Containers"),
			_("Images"),
		]);
	}

	_submenu_text_size() {
		return this._spin("submenu-text", 1, 1000, 2);
	}

	_submenu_image_size() {
		return this._spin("submenu-image", 1, 1000, 2);
	}

	_quicksettings_columns() {
		return this._spin("quicksettings-columns", 1, 10, 1);
	}

	/**
	 * Creates a row with a drop down of an enum key
	 *
	 * @param {string} key - the key string from schema
	 * @param {string[]} options - labels, in the order of the enum values
	 * @returns {Adw.ActionRow}
	 */
	_dropdown(key, options) {
		const dropDown = Gtk.DropDown.new_from_strings(options);
		dropDown.set_selected(this._settings.get_enum(key));

		dropDown.connect('notify::selected', () => {
			this._settings.set_enum(key, dropDown.get_selected());
		});

		return this._row(key, dropDown);
	}

	/**
	 * Creates a row with a spin button from
	 * the key schema
	 *
	 * @param {string} key - the key string from schema
	 * @returns {Adw.ActionRow}
	 */
	_spin(key, min, max, step) {
		return this._bound_row(key, Gtk.SpinButton.new_with_range(min, max, step), 'value');
	}

	_row_input(key) {
		return this._bound_row(key, new Gtk.Entry(), 'text');
	}

	/**
	 * Creates a row with a switch from
	 * the key schema
	 *
	 * @param {string} key - the key string from schema
	 * @returns {Adw.ActionRow}
	 */
	_switch(key) {
		return this._bound_row(key, new Gtk.Switch(), 'state');
	}
}
