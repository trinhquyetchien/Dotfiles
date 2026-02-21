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

		group.add(this._terminal());
	}

	_logo() {
		const row_logo = new Adw.ActionRow({
			title: this._settings.settings_schema.get_key("logo").get_summary(),
			subtitle: this._settings.settings_schema.get_key("logo").get_description(),
		});

		const dropDown = Gtk.DropDown.new_from_strings([
			"Default",
			"Black",
			"Transparent",
			"White",
		]);
		dropDown.set_selected(this._settings.get_enum("logo"));
		dropDown.set_valign(Gtk.Align.CENTER);

		dropDown.connect('notify::selected', () => {
			let selected = dropDown.get_selected_item().get_string().toLowerCase();
			this._settings.set_string("logo", selected);
		});

		row_logo.add_suffix(dropDown);
		row_logo.activatable_widget = dropDown;

		return row_logo;
	}

	_up_container_timer() {
		const row = new Adw.ActionRow({
			title: this._settings.settings_schema.get_key("up-containers-timer").get_summary(),
			subtitle: this._settings.settings_schema.get_key("up-containers-timer").get_description(),
		});

		const spin = Gtk.SpinButton.new_with_range(0, 60, 5);
		spin.set_valign(Gtk.Align.CENTER);

		this._settings.bind(
			"up-containers-timer",
			spin,
			"value",
			Gio.SettingsBindFlags.DEFAULT
		);


		row.add_suffix(spin);
		row.set_activatable_widget(spin);

		return row
	}

	_menu_type() {
		const row_menu_type = new Adw.ActionRow({
			title: this._settings.settings_schema.get_key("menu-type").get_summary(),
			subtitle: this._settings.settings_schema.get_key("menu-type").get_description(),
		});

		const dropDown = Gtk.DropDown.new_from_strings([
			"Text",
			"Icons",
			"Quick Settings"
		]);
		dropDown.set_selected(this._settings.get_enum("menu-type"));
		dropDown.set_valign(Gtk.Align.CENTER);

		dropDown.connect('notify::selected', () => {
			const selected = dropDown.get_selected_item().get_string().toLowerCase().replaceAll(' ', '');
			this._settings.set_string("menu-type", selected);
		});

		row_menu_type.add_suffix(dropDown);
		row_menu_type.activatable_widget = dropDown;

		return row_menu_type;
	}

	_visible_menus() {
		const row_visible_menu = new Adw.ActionRow({
			title: this._settings.settings_schema.get_key("show-value").get_summary(),
			subtitle: this._settings.settings_schema.get_key("show-value").get_description(),
		});

		const dropDown = Gtk.DropDown.new_from_strings([
			"Both",
			"Containers",
			"Images",
		]);
		dropDown.set_selected(this._settings.get_enum("show-value"));
		dropDown.set_valign(Gtk.Align.CENTER);

		dropDown.connect('notify::selected', () => {
			const selected = dropDown.get_selected_item().get_string().toLowerCase();
			this._settings.set_string("show-value", selected);
		});

		row_visible_menu.add_suffix(dropDown);
		row_visible_menu.activatable_widget = dropDown;

		return row_visible_menu;
	}

	_submenu_text_size() {
		const row_submenu_text_size = new Adw.ActionRow({
			title: this._settings.settings_schema.get_key("submenu-text").get_summary(),
			subtitle: this._settings.settings_schema.get_key("submenu-text").get_description(),
		});

		const spinButton_submenu_text_size = Gtk.SpinButton.new_with_range(1, 1000, 2)
		spinButton_submenu_text_size.set_valign(Gtk.Align.CENTER);

		this._settings.bind(
			'submenu-text',
			spinButton_submenu_text_size,
			'value',
			Gio.SettingsBindFlags.DEFAULT
		);


		row_submenu_text_size.add_suffix(spinButton_submenu_text_size);
		row_submenu_text_size.activatable_widget = spinButton_submenu_text_size;

		return row_submenu_text_size;
	}

	_submenu_image_size() {
		const row_submenu_img_size = new Adw.ActionRow({
			title: this._settings.settings_schema.get_key("submenu-image").get_summary(),
			subtitle: this._settings.settings_schema.get_key("submenu-image").get_description(),
		});

		const spinButton_submenu_img_size = Gtk.SpinButton.new_with_range(1, 1000, 2)
		spinButton_submenu_img_size.set_valign(Gtk.Align.CENTER);

		this._settings.bind(
			'submenu-image',
			spinButton_submenu_img_size,
			'value',
			Gio.SettingsBindFlags.DEFAULT
		);


		row_submenu_img_size.add_suffix(spinButton_submenu_img_size);
		row_submenu_img_size.activatable_widget = spinButton_submenu_img_size;

		return row_submenu_img_size;
	}

	_terminal() {
		const row_terminal = new Adw.ActionRow({
			title: this._settings.settings_schema.get_key("terminal").get_summary(),
			subtitle: this._settings.settings_schema.get_key("terminal").get_description(),
		});

		const input_terminal = new Gtk.Entry();
		input_terminal.set_valign(Gtk.Align.CENTER);

		this._settings.bind(
			'terminal',
			input_terminal,
			'text',
			Gio.SettingsBindFlags.DEFAULT
		);

		row_terminal.add_suffix(input_terminal);
		row_terminal.activatable_widget = input_terminal;

		return row_terminal;
	}

	_quicksettings_columns() {
		const row = new Adw.ActionRow({
			title: this._settings.settings_schema.get_key("quicksettings-columns").get_summary(),
			subtitle: this._settings.settings_schema.get_key("quicksettings-columns").get_description(),
		});

		const spin = Gtk.SpinButton.new_with_range(1, 10, 1);
		spin.set_valign(Gtk.Align.CENTER);

		this._settings.bind(
			"quicksettings-columns",
			spin,
			"value",
			Gio.SettingsBindFlags.DEFAULT
		);


		row.add_suffix(spin);
		row.set_activatable_widget(spin);

		return row
	}

	/**
	 * Creates a row with a switch from
	 * the key schema
	 *
	 * @param {string} key - the key string from schema
	 * @returns {Adw.ActionRow}
	 */
	_switch(key) {
		const row = new Adw.ActionRow({
			title: this._settings.settings_schema.get_key(key).get_summary(),
			subtitle: this._settings.settings_schema.get_key(key).get_description(),
		});

		const gtk_switch = new Gtk.Switch();
		gtk_switch.set_valign(Gtk.Align.CENTER);

		this._settings.bind(
			key,
			gtk_switch,
			'state',
			Gio.SettingsBindFlags.DEFAULT
		);

		row.add_suffix(gtk_switch);
		row.set_activatable_widget(gtk_switch);

		return row
	}
}
