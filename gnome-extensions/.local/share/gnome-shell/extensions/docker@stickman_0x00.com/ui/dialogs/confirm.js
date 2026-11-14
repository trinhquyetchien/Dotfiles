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

/**
 * Run the action of a docker command, asking first if the command has `confirm`.
 * @param {Object} command - command from DockerAPI.docker_commands
 * @param {Function} action
 * @param {string} [title] - dialog title
 */
export function confirm_command(command, action, title = command.label) {
	if (!command.confirm) {
		action();
		return;
	}

	new ConfirmDialog(
		title,
		_("Are you sure you want to %s?").replace('%s', command.label),
		action,
	).open();
}

export default ConfirmDialog;
