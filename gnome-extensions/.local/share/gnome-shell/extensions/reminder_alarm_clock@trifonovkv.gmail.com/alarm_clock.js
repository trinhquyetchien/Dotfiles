'use strict';

import GLib from 'gi://GLib';

export default class AlarmClock {
    constructor(onTick, onTrigger) {
        this.onTick = onTick;
        this.onTrigger = onTrigger;
        this.reminders = [];
        this.timerId = 0;
        this.isDropSeconds = false;
    }

    add(minutes, message, isRepeat = false) {
        let now = Date.now();
        let targetMs = now + (minutes * 60 * 1000);
        let endDate = new Date(targetMs);

        if (this.isDropSeconds) {
            endDate.setSeconds(0);
            endDate.setMilliseconds(0);
            if (endDate.getTime() <= now) {
                endDate = new Date(now + (minutes * 60 * 1000));
            }
        }

        let reminder = {
            id: 'rac_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
            message: message || 'Knock knock',
            minutes: minutes,
            createdAt: new Date(),
            endDate: endDate,
            isRepeat: isRepeat
        };

        this.reminders.push(reminder);
        this.reminders.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

        this._ensureTimer();
        this._tick(false);

        return reminder;
    }

    remove(id) {
        let index = this.reminders.findIndex(r => r.id === id);
        if (index !== -1) {
            this.reminders.splice(index, 1);
            if (this.reminders.length === 0) {
                this.stopTimer();
            }
            this._tick(false);
            return true;
        }
        return false;
    }

    clearAll() {
        this.reminders = [];
        this.stopTimer();
        this._tick(false);
    }

    getReminders() {
        return this.reminders;
    }

    getNearestReminder() {
        return this.reminders.length > 0 ? this.reminders[0] : null;
    }

    isRunning() {
        return this.reminders.length > 0;
    }

    _ensureTimer() {
        if (this.timerId > 0) return;

        this.timerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            1,
            () => {
                this._tick(true);
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    stopTimer() {
        if (this.timerId > 0) {
            GLib.Source.remove(this.timerId);
            this.timerId = 0;
        }
    }

    _tick(checkExpired = true) {
        let now = Date.now();

        if (checkExpired && this.reminders.length > 0) {
            let expired = [];
            let remaining = [];

            for (let r of this.reminders) {
                if (r.endDate.getTime() <= now) {
                    expired.push(r);
                } else {
                    remaining.push(r);
                }
            }

            this.reminders = remaining;

            for (let r of expired) {
                try {
                    if (this.onTrigger) {
                        this.onTrigger(r);
                    }
                } catch (e) {
                    console.error('[ReminderAlarmClock] Error in onTrigger:', e);
                }
            }
        }

        if (this.reminders.length === 0) {
            this.stopTimer();
            if (this.onTick) {
                this.onTick(0, 0);
            }
            return;
        }

        let nearest = this.getNearestReminder();
        let remainingSec = nearest
            ? Math.max(0, Math.floor((nearest.endDate.getTime() - now) / 1000))
            : 0;

        if (this.onTick) {
            this.onTick(remainingSec, this.reminders.length);
        }
    }
}
