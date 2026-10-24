'use strict';

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import SoundPlayer from './sound_player.js';
import AlarmClock from './alarm_clock.js';

var SavedReminders = null;

const Icon = {
    ON: 'icons/sand-clock-on-symbolic.svg',
    OFF: 'icons/sand-clock-off-symbolic.svg',
};

Number.prototype.pad = function (size) {
    let s = String(this);
    while (s.length < (size || 2)) { s = "0" + s; }
    return s;
};

var ReminderAlarmClock = GObject.registerClass(
class ReminderAlarmClock extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, `${extension.metadata.name} ReminderAlarmClock`, false);

        this.extension = extension;
        this.ResetLabel = _('R');
        this.AddLabel = '+';
        this.pendingMinutes = 0;

        this.icon = new St.Icon({ style_class: 'system-status-icon' });
        this.label = new St.Label({
            text: ':00', y_align: Clutter.ActorAlign.CENTER
        });
        this.insert_child_at_index(this.icon, 0);

        this.timeLabel = new St.Label({
            style_class: 'rac-time-label',
            text: '+0m',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        this.settings = extension.getSettings();

        this.messageEntry = new St.Entry({
            track_hover: false,
            can_focus: true,
            style_class: 'rac-message-entry',
            hint_text: _('Message...'),
            text: this.settings.get_value('message').deep_unpack()
        });

        this.messageEntry.clutter_text.connect('activate', () => {
            this._onAddReminder();
        });

        this.alarmClock = new AlarmClock(
            (remainingSec, count) => {
                this._onClockTick(remainingSec, count);
            },
            (reminder) => {
                this._onReminderTriggered(reminder);
            }
        );

        let menuItem = new PopupMenu.PopupBaseMenuItem({
            can_focus: false, reactive: false
        });
        let presents = this.settings.get_value('presents').deep_unpack();
        menuItem.actor.add_child(this._makeUi(this._toLabels(presents)));
        this.menu.addMenuItem(menuItem);

        this.menu.connect('open-state-changed', (menu, isOpen) => {
            if (isOpen) {
                this._updateTimeLabel();
                this._updateRemindersList();
            } else {
                this.settings.set_value(
                    'message', new GLib.Variant('s', this.messageEntry.text));
            }
        });

        this.settings.connect(
            'changed::drop-seconds',
            this._onDropSecondsChanged.bind(this)
        );

        this.settings.connect(
            'changed::play-sound',
            this._onPlaySoundChanged.bind(this)
        );

        this.settings.connect(
            'changed::auto-close-reminder-window',
            this._onAutoCloseReminderWindowChanged.bind(this)
        );

        this.settings.connect(
            'changed::show-test-notification', () => {
                this._showReminder({ message: _('Test Notification') });
            }
        );

        this.settings.connect(
            'changed::show-remaining-time-in-taskbar',
            this._onShowRemainingTimeInTaskbarChanged.bind(this)
        );

        this.settings.connect(
            'changed::repeat', this._onRepeatChanged.bind(this)
        );

        this.settings.connect(
            'changed::time-repeat', this._onRepeatChanged.bind(this)
        );

        this._onDropSecondsChanged();
        this._onPlaySoundChanged();
        this._onAutoCloseReminderWindowChanged();
        this._onShowRemainingTimeInTaskbarChanged();
        this._onRepeatChanged();

        this._updateTimeLabel();
        this._updateRemindersList();
        this._updateTaskbar();
    }

    _makeUi(labels) {
        let topRow = new St.BoxLayout({
            vertical: false,
            style_class: 'rac-top-row',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this.resetButton = new St.Button({
            label: this.ResetLabel,
            style_class: 'button rac-action-button',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.resetButton.connect('clicked', () => this._onResetPending());

        this.addButton = new St.Button({
            label: this.AddLabel,
            style_class: 'button rac-add-button',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.addButton.connect('clicked', () => this._onAddReminder());

        topRow.add_child(this.resetButton);
        topRow.add_child(this.timeLabel);
        topRow.add_child(this.addButton);

        let buttonGrid = new St.BoxLayout({
            vertical: false,
            style_class: 'rac-button-grid',
            x_expand: true,
        });
        buttonGrid.add_child(this._makeButtonsColon([labels[0], labels[1]]));
        buttonGrid.add_child(this._makeButtonsColon([labels[2], labels[3]]));
        buttonGrid.add_child(this._makeButtonsColon([labels[4], labels[5]]));

        let mainBox = new St.BoxLayout({
            vertical: true,
            style_class: 'rac-main-box',
        });
        mainBox.add_child(topRow);
        mainBox.add_child(buttonGrid);
        mainBox.add_child(this.messageEntry);

        // Active reminders list header
        let listHeaderBox = new St.BoxLayout({
            vertical: false,
            style_class: 'rac-section-header-box',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        let headerLabel = new St.Label({
            text: _('Active Reminders'),
            style_class: 'rac-section-header',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        listHeaderBox.add_child(headerLabel);

        this.clearAllBtn = new St.Button({
            label: _('Clear all'),
            style_class: 'button rac-clear-all-btn',
            y_align: Clutter.ActorAlign.CENTER,
            visible: false,
        });
        this.clearAllBtn.connect('clicked', () => {
            this.alarmClock.clearAll();
            this._updateRemindersList();
            this._updateTaskbar();
        });
        listHeaderBox.add_child(this.clearAllBtn);

        mainBox.add_child(listHeaderBox);

        let scrollView = new St.ScrollView({
            style_class: 'rac-scroll-view',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            enable_mouse_scrolling: true,
        });

        this.remindersListBox = new St.BoxLayout({
            vertical: true,
            style_class: 'rac-reminders-list',
            x_expand: true,
        });
        scrollView.set_child(this.remindersListBox);

        mainBox.add_child(scrollView);

        return mainBox;
    }

    _makeButtonsColon(labels) {
        let box = new St.BoxLayout({ vertical: true, x_expand: true });
        labels.forEach(label => {
            if (label) {
                box.add_child(this._createButton(label));
            }
        });
        return box;
    }

    _createButton(label) {
        let button = new St.Button({
            label: label,
            style_class: 'button rac-minutes-button',
            x_expand: true,
        });
        button.connect('clicked', () => {
            let integer = parseInt(button.label.replace('+', ''), 10);
            let minutes = isNaN(integer) ? 0 : integer;
            this._addPendingMinutes(minutes);
        });
        return button;
    }

    _addPendingMinutes(minutes) {
        this.pendingMinutes += minutes;
        this._updateTimeLabel();
    }

    _onResetPending() {
        this.pendingMinutes = 0;
        this._updateTimeLabel();
    }

    _onAddReminder() {
        let minutes = this.pendingMinutes > 0 ? this.pendingMinutes : 5;
        let message = this.messageEntry.text.trim();
        if (!message) {
            message = this.settings.get_string('message') || 'Knock knock';
        }

        this.alarmClock.add(minutes, message);
        this.pendingMinutes = 0;
        this._updateTimeLabel();
        this._updateRemindersList();
        this._updateTaskbar();
    }

    _updateTimeLabel() {
        if (this.pendingMinutes > 0) {
            let target = new Date(Date.now() + this.pendingMinutes * 60000);
            let hours = target.getHours().pad();
            let mins = target.getMinutes().pad();
            this.timeLabel.text = `+${this.pendingMinutes}m (${hours}:${mins})`;
        } else {
            this.timeLabel.text = '+0m';
        }
    }

    _updateRemindersList() {
        if (!this.remindersListBox) return;

        this.remindersListBox.destroy_all_children();

        let reminders = this.alarmClock.getReminders();
        if (this.clearAllBtn) {
            this.clearAllBtn.visible = reminders.length > 1;
        }

        if (reminders.length === 0) {
            let emptyLabel = new St.Label({
                text: _('No active reminders'),
                style_class: 'rac-empty-label',
                x_align: Clutter.ActorAlign.CENTER,
            });
            this.remindersListBox.add_child(emptyLabel);
            return;
        }

        let now = Date.now();
        reminders.forEach((r) => {
            let itemBox = new St.BoxLayout({
                vertical: false,
                style_class: 'rac-reminder-row',
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });

            let remainingSec = Math.max(0, Math.floor((r.endDate.getTime() - now) / 1000));
            let remMin = Math.floor(remainingSec / 60);
            let remSec = remainingSec % 60;
            let timeStr = remMin > 0 ? `${remMin}m` : `${remSec}s`;

            let hours = r.endDate.getHours().pad();
            let mins = r.endDate.getMinutes().pad();

            let timeBadge = new St.Label({
                text: `${hours}:${mins} (${timeStr})`,
                style_class: 'rac-reminder-time',
                y_align: Clutter.ActorAlign.CENTER,
            });

            let textLabel = new St.Label({
                text: r.message,
                style_class: 'rac-reminder-text',
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            textLabel.clutter_text.ellipsize = Pango.EllipsizeMode.END;
            textLabel.clutter_text.line_wrap = false;

            let delBtn = new St.Button({
                label: '✕',
                style_class: 'button rac-reminder-del-btn',
                y_align: Clutter.ActorAlign.CENTER,
            });

            delBtn.connect('clicked', () => {
                this.alarmClock.remove(r.id);
                this._updateRemindersList();
                this._updateTaskbar();
            });

            itemBox.add_child(timeBadge);
            itemBox.add_child(textLabel);
            itemBox.add_child(delBtn);

            this.remindersListBox.add_child(itemBox);
        });
    }

    _onClockTick(remainingSec, count) {
        this._updateTaskbar(remainingSec, count);
        if (this.menu && this.menu.isOpen) {
            this._updateRemindersList();
        }
    }

    _onReminderTriggered(reminder) {
        this._showReminder(reminder);

        if (reminder.isRepeat && this.settings.get_value('repeat').deep_unpack()) {
            let repeatTime = this._getRepeatTime(this.settings.get_value('time-repeat').deep_unpack());
            let diffMin = Math.max(1, Math.round((repeatTime.getTime() - Date.now()) / 60000));
            this.alarmClock.add(diffMin, reminder.message, true);
        }

        this._updateTaskbar();
        if (this.menu && this.menu.isOpen) {
            this._updateRemindersList();
        }
    }

    _setPanelMenuIcon(icon) {
        this.icon.gicon = new Gio.FileIcon({
            file: Gio.File.new_for_path(this.extension.dir.get_child(icon).get_path())
        });
    }

    _showReminder(reminder) {
        let msg = (reminder && reminder.message) ? reminder.message : this.messageEntry.text;
        if (!msg) {
            msg = this.settings.get_string('message') || 'Knock knock';
        }

        if (this.isPlaySound) {
            this._playSound();
        }
        if (this.isAutoCloseReminderWindow) {
            this._showReminderWithoutCloseButton(msg);
        }
        else {
            this._showReminderWithCloseButton(msg);
        }
    }

    _showReminderWithoutCloseButton(msg) {
        let reminder = new St.Label({
            style_class: 'rac-message-label-with-border',
            text: msg
        });
        Main.uiGroup.add_child(reminder);
        reminder.opacity = 255;
        this._setReminderPosition(reminder);

        reminder.ease({
            opacity: 0,
            duration: 5000,
            transition: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                Main.uiGroup.remove_child(reminder);
            }
        });
    }

    _showReminderWithCloseButton(msg) {
        let label = new St.Label({
            text: msg, style_class: 'rac-message-label'
        });
        let button = new St.Button({
            label: _('Close'), style_class: 'rac-message-close-button'
        });
        let reminder = new St.BoxLayout({
            vertical: true, style_class: 'rac-message-layout'
        });
        let modalGrab = null;
        button.connect('clicked', () => {
            if (modalGrab) {
                Main.popModal(modalGrab);
                modalGrab = null;
            }
            Main.uiGroup.remove_child(reminder);
        });
        reminder.add_child(label);
        reminder.add_child(button);
        Main.uiGroup.add_child(reminder);
        this._setReminderPosition(reminder);
        modalGrab = Main.pushModal(reminder);
    }

    _setReminderPosition(reminder) {
        let monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;

        reminder.set_position(
            monitor.x + Math.floor(monitor.width / 2 - reminder.width / 2),
            monitor.y + Math.floor(monitor.height / 2 - reminder.height / 2));
    }

    _playSound() {
        new SoundPlayer().play(
            this.settings.get_string('sound-file-path'));
    }

    _updateTaskbar(remainingSec, count) {
        if (count === undefined) {
            count = this.alarmClock.getReminders().length;
        }
        let isRunning = count > 0;

        if (this.isShowRemainingTimeInTaskbar && isRunning) {
            let sec = remainingSec;
            if (sec === undefined) {
                let nearest = this.alarmClock.getNearestReminder();
                sec = nearest
                    ? Math.max(0, Math.floor((nearest.endDate.getTime() - Date.now()) / 1000))
                    : 0;
            }

            if (sec >= 60) {
                let min = Math.ceil(sec / 60);
                this.label.text = min + ':';
            } else {
                this.label.text = ':' + Number(sec).pad();
            }

            let oldChild = this.get_first_child();
            if (oldChild !== this.label) {
                this.replace_child(oldChild, this.label);
            }
        } else {
            this._setPanelMenuIcon(isRunning ? Icon.ON : Icon.OFF);
            let oldChild = this.get_first_child();
            if (oldChild !== this.icon) {
                this.replace_child(oldChild, this.icon);
            }
        }
    }

    _getRepeatTime(timeString) {
        let parts = timeString.split(':');
        let repeatTime = new Date();
        repeatTime.setHours(parts[0]);
        repeatTime.setMinutes(parts[1]);
        repeatTime.setSeconds(0);
        repeatTime.setMilliseconds(0);
        let oneSecond = 1000;
        return repeatTime.getTime() - Date.now() < oneSecond
            ? new Date(repeatTime.getTime() + 24 * 60 * 60 * 1000)
            : repeatTime;
    }

    _onDropSecondsChanged() {
        this.alarmClock.isDropSeconds = this.settings.get_value(
            'drop-seconds').deep_unpack();
    }

    _onPlaySoundChanged() {
        this.isPlaySound = this.settings.get_value('play-sound').deep_unpack();
    }

    _onAutoCloseReminderWindowChanged() {
        this.isAutoCloseReminderWindow = this.settings.get_value(
            'auto-close-reminder-window').deep_unpack();
    }

    _onShowRemainingTimeInTaskbarChanged() {
        this.isShowRemainingTimeInTaskbar = this.settings.get_value(
            'show-remaining-time-in-taskbar').deep_unpack();
        this._updateTaskbar();
    }

    _onRepeatChanged() {
        let isRepeat = this.settings.get_value('repeat').deep_unpack();
        let existing = this.alarmClock.getReminders().find(r => r.isRepeat);
        if (isRepeat) {
            if (existing) {
                this.alarmClock.remove(existing.id);
            }
            let timeStr = this.settings.get_value('time-repeat').deep_unpack();
            let repeatTime = this._getRepeatTime(timeStr);
            let diffMin = Math.max(1, Math.round((repeatTime.getTime() - Date.now()) / 60000));
            this.alarmClock.add(diffMin, _('Daily Reminder'), true);
        } else if (existing) {
            this.alarmClock.remove(existing.id);
        }
        this._updateRemindersList();
        this._updateTaskbar();
    }

    _toLabels(presents) {
        let r = [];
        presents = presents.replace(/\s\s+/g, ' ').trim();
        presents.split(' ').forEach((item) => {
            r.push('+' + item);
        });
        return r;
    }

    destroy() {
        this.alarmClock.clearAll();
        super.destroy();
    }
});

export default class ReminderAlarmClockExtension extends Extension {
    enable() {
        this.reminderAlarmClock = new ReminderAlarmClock(this);
        Main.panel.addToStatusArea(`${this.metadata.name} ReminderAlarmClock`, this.reminderAlarmClock);

        if (SavedReminders && SavedReminders.length > 0) {
            let now = Date.now();
            for (let item of SavedReminders) {
                if (item.endDate > now) {
                    let diffMin = (item.endDate - now) / 60000;
                    let r = this.reminderAlarmClock.alarmClock.add(diffMin, item.message, item.isRepeat);
                    r.endDate = new Date(item.endDate);
                }
            }
            SavedReminders = null;
            this.reminderAlarmClock._updateRemindersList();
            this.reminderAlarmClock._updateTaskbar();
        }
    }

    disable() {
        if (this.reminderAlarmClock !== null) {
            let reminders = this.reminderAlarmClock.alarmClock.getReminders();
            SavedReminders = reminders.map(r => ({
                id: r.id,
                message: r.message,
                endDate: r.endDate.getTime(),
                isRepeat: r.isRepeat || false
            }));

            this.reminderAlarmClock.destroy();
            this.reminderAlarmClock = null;
        }
    }
}
