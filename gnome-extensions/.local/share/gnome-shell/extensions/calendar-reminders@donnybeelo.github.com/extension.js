/* extension.ts
 *
 * Calendar Reminders — GNOME notifications for Evolution Data Server reminders.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import ECal from "gi://ECal";
import EDataServer from "gi://EDataServer";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as MessageTray from "resource:///org/gnome/shell/ui/messageTray.js";
import { Extension, gettext as _, } from "resource:///org/gnome/shell/extensions/extension.js";
import { parseReminder } from "./parser.js";
const EDS_SCHEMA = "org.gnome.evolution-data-server.calendar";
const PAST_KEY = "reminders-past";
const DISPLAY_KEY = "notify-enable-display";
const PAST_EVENTS_KEY = "notify-past-events";
const SNOOZE_KEY = "snooze-minutes";
Gio._promisify(EDataServer.SourceRegistry, "new", "new_finish");
Gio._promisify(ECal.Client, "connect", "connect_finish");
Gio._promisify(ECal.Client.prototype, "get_object", "get_object_finish");
/* @girs resolves two copies of Gio — one under @girs/gnome-shell, one under
 * @girs/meta — so the context this returns does not typecheck against
 * Gio.AppInfo.launch(). It is the same object at runtime. */
function launchContext() {
    return global.create_app_launch_context(0, -1);
}
export default class CalendarRemindersExtension extends Extension {
    _settings = null;
    _prefs = null;
    _source = null;
    _sourceDestroyId = 0;
    _seen = new Set();
    _dueScheduled = new Set();
    _notifications = new Map();
    _timeouts = new Set();
    _hadDisplay = true;
    _hadPastEvents = false;
    enable() {
        const schemas = Gio.SettingsSchemaSource.get_default();
        if (!schemas?.lookup(EDS_SCHEMA, true)) {
            console.warn(`${this.metadata.name}: ${EDS_SCHEMA} not found; ` +
                "is evolution-data-server installed?");
            return;
        }
        this._settings = new Gio.Settings({ schema_id: EDS_SCHEMA });
        this._prefs = this.getSettings();
        this._seen = new Set();
        this._dueScheduled = new Set();
        this._notifications = new Map();
        this._timeouts = new Set();
        // Silence the Evolution Reminders window; restored on disable().
        this._hadDisplay = this._settings.get_boolean(DISPLAY_KEY);
        this._settings.set_boolean(DISPLAY_KEY, false);
        this._hadPastEvents = this._settings.get_boolean(PAST_EVENTS_KEY);
        this._settings.set_boolean(PAST_EVENTS_KEY, true);
        this._settings.connectObject(`changed::${PAST_KEY}`, () => this._onRemindersChanged(), this);
        this._onRemindersChanged();
    }
    disable() {
        for (const id of this._timeouts)
            GLib.Source.remove(id);
        this._timeouts.clear();
        if (this._settings) {
            this._settings.disconnectObject(this);
            this._settings.set_boolean(DISPLAY_KEY, this._hadDisplay);
            this._settings.set_boolean(PAST_EVENTS_KEY, this._hadPastEvents);
            this._settings = null;
        }
        this._prefs = null;
        if (this._sourceDestroyId) {
            this._source?.disconnect(this._sourceDestroyId);
            this._sourceDestroyId = 0;
        }
        this._source?.destroy(MessageTray.NotificationDestroyedReason.SOURCE_CLOSED);
        this._source = null;
        this._seen.clear();
        this._dueScheduled.clear();
        this._notifications.clear();
    }
    _onRemindersChanged() {
        const settings = this._settings;
        if (!settings)
            return;
        const entries = settings.get_strv(PAST_KEY);
        if (entries.length === 0)
            return;
        const now = GLib.DateTime.new_now_local().to_unix();
        const keep = [];
        for (const entry of entries) {
            const reminder = parseReminder(entry);
            if (!reminder || now >= reminder.end)
                continue;
            keep.push(entry);
            if (this._seen.has(reminder.id))
                continue;
            this._seen.add(reminder.id);
            this._notify(reminder);
            /* EDS only writes reminders-past at the alarm trigger, so nothing
             * fires at the event itself. Schedule that one ourselves. */
            const dueKey = `${reminder.uuid}\n${reminder.start}`;
            if (reminder.start > now && !this._dueScheduled.has(dueKey)) {
                this._dueScheduled.add(dueKey);
                this._later(reminder.start - now, () => this._notify(reminder));
            }
        }
        // Keep entries until their event ends, prune the rest.
        if (keep.length !== entries.length)
            settings.set_strv(PAST_KEY, keep);
    }
    _ensureSource() {
        if (!this._source || !Main.messageTray.getSources().includes(this._source)) {
            this._source = new MessageTray.Source({
                title: _("Calendar"),
                iconName: "org.gnome.Calendar",
            });
            Main.messageTray.add(this._source);
        }
        return this._source;
    }
    async _notify(reminder, tries = 5) {
        const exists = await this._exists(reminder);
        if (!this._settings)
            return;
        if (exists === null && tries > 0)
            this._later(30, () => this._notify(reminder, tries - 1));
        else if (exists !== false)
            this._show(reminder);
    }
    async _exists(reminder) {
        try {
            const registry = await EDataServer.SourceRegistry.new(null);
            const source = registry.ref_source(reminder.sourceUid);
            if (!source)
                return null;
            const client = await ECal.Client.connect(source, ECal.ClientSourceType.EVENTS, 30, null);
            await client.get_object(reminder.uid, null, null);
            return true;
        }
        catch (e) {
            if (e instanceof GLib.Error &&
                e.matches(GLib.quark_from_string("e-cal-client-error-quark"), ECal.ClientError.OBJECT_NOT_FOUND))
                return false;
            console.warn(`${this.metadata.name}: cannot look up ${reminder.uid}: ${e}`);
            return null;
        }
    }
    _show(reminder) {
        const at = (t) => GLib.DateTime.new_from_unix_local(t);
        const day = (d) => d.format("%a %-e %b");
        const time = (d) => d.format("%H:%M");
        const start = at(reminder.start);
        const end = reminder.allDay ? at(reminder.end).add_days(-1) : at(reminder.end);
        const sameDay = start.format("%F") === end.format("%F");
        const today = start.format("%F") === GLib.DateTime.new_now_local().format("%F");
        const body = reminder.allDay
            ? sameDay ? (today ? _("All day") : day(start)) : `${day(start)} – ${day(end)}`
            : sameDay ? `${time(start)} – ${time(end)}`
                : `${day(start)} ${time(start)} – ${day(end)} ${time(end)}`;
        const notification = new MessageTray.Notification({
            source: this._ensureSource(),
            title: reminder.summary || _("Calendar event"),
            body,
            iconName: "org.gnome.Calendar",
            urgency: MessageTray.Urgency.HIGH,
        });
        /* connectObject ties the handler to this extension object; the tracker
         * drops it when either side is destroyed, and disable() sweeps the rest. */
        notification.connectObject("activated", () => this._openCalendar(reminder), this);
        notification.addAction(_("Open in Calendar"), () => this._openCalendar(reminder));
        if (reminder.join)
            notification.addAction(_("Join"), () => this._openUri(reminder.join));
        notification.addAction(_("Snooze"), () => this._snooze(reminder));
        notification.addAction(_("Dismiss"), () => this._dismiss(reminder));
        const source = this._ensureSource();
        const previous = this._notifications.get(reminder.uuid);
        this._notifications.set(reminder.uuid, notification);
        source.addNotification(notification);
        if (previous && source.notifications.includes(previous))
            previous.destroy(MessageTray.NotificationDestroyedReason.REPLACED);
    }
    _snooze(reminder) {
        // Read on each snooze so a preference change applies without a reload.
        const mins = this._prefs?.get_int(SNOOZE_KEY) ?? 10;
        this._later(mins * 60, () => this._notify(reminder));
    }
    _dismiss(reminder) {
        const settings = this._settings;
        if (!settings)
            return;
        const entries = settings.get_strv(PAST_KEY);
        settings.set_strv(PAST_KEY, entries.filter((e) => parseReminder(e)?.uuid !== reminder.uuid));
    }
    _later(secs, fn) {
        const id = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, secs, () => {
            this._timeouts.delete(id);
            fn();
            return GLib.SOURCE_REMOVE;
        });
        this._timeouts.add(id);
    }
    /* Closing the tray first is the whole point of being an extension: while the
     * message tray holds its grab nothing else can take focus, so a window
     * launched underneath it opens behind. An external notification client
     * cannot reach closeCalendar() at all. */
    _dismissShellUi() {
        Main.overview.hide();
        Main.panel.closeCalendar();
    }
    _openUri(uri) {
        this._dismissShellUi();
        try {
            Gio.AppInfo.launch_default_for_uri(uri, launchContext());
        }
        catch (e) {
            console.warn(`${this.metadata.name}: cannot open ${uri}: ${e}`);
        }
    }
    _openCalendar(reminder) {
        this._dismissShellUi();
        const start = GLib.DateTime.new_from_unix_local(reminder.start);
        /* gnome-calendar --date parses in the locale's format, so %x, not ISO.
         * --uuid only selects the event once the view has loaded it, so it is a
         * bonus on top of --date, not the mechanism. */
        if (!GLib.find_program_in_path("gnome-calendar")) {
            console.warn(`${this.metadata.name}: gnome-calendar is not installed`);
            return;
        }
        const argv = `gnome-calendar --date ${GLib.shell_quote(start.format("%x %H:%M"))} ` +
            `--uuid ${GLib.shell_quote(reminder.uuid)}`;
        try {
            const app = Gio.AppInfo.create_from_commandline(argv, "Calendar", Gio.AppInfoCreateFlags.NONE);
            app.launch([], launchContext());
        }
        catch (e) {
            console.warn(`${this.metadata.name}: cannot open Calendar: ${e}`);
        }
    }
}
