import GObject from 'gi://GObject';
import { ModalDialog } from 'resource:///org/gnome/shell/ui/modalDialog.js';
import { MessageDialogContent } from 'resource:///org/gnome/shell/ui/dialog.js';
import Clutter from 'gi://Clutter';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

class ConfirmDialog extends ModalDialog {
	static {
		GObject.registerClass(this);
	}

	constructor(title, desc, callback) {
		super();

		const content = new MessageDialogContent({
			title: title,
			description: desc,
		});
		this.contentLayout.add_child(content);

		this.setButtons([
			{
				label: _("Cancel"),
				action: () => {
					this.close();
				},
				key: Clutter.Escape,
				isDefault: true,
			},
			{
				label: _("Ok"),
				action: () => {
					this.close();
					callback();
				}
			}
		]);
	}
}

export default ConfirmDialog;