import os
os.environ["LC_TIME"] = "en_GB.UTF-8"
import gi
import signal
import sys
import os
import re
import json
import datetime
import glob
import subprocess

gi.require_version('Gtk', '3.0')
gi.require_version('WebKit2', '4.1')
gi.require_version('AyatanaAppIndicator3', '0.1')
from gi.repository import Gtk, WebKit2, GLib, AyatanaAppIndicator3, Pango

try:
    from markdown_it import MarkdownIt
except ImportError:
    print("Please install markdown-it-py: pip install markdown-it-py")
    sys.exit(1)

CSS = """
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    padding: 20px;
    background-color: #fff;
}
@media (prefers-color-scheme: dark) {
    body {
        color: #e0e0e0;
        background-color: #1e1e1e;
    }
}
h1, h2, h3 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
@media (prefers-color-scheme: dark) {
    h1, h2, h3 { border-bottom: 1px solid #444; }
}
ul { padding-left: 20px; }
li { list-style-type: disc; }
li:has(input[type="checkbox"]) { list-style-type: none; }
input[type="checkbox"] { margin-right: 10px; cursor: pointer; }
.empty-state { color: #888; font-style: italic; }
img { max-width: 100%; height: auto; display: block; margin: 10px 0; border-radius: 4px; }
"""

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>{css}</style>
    <script>
        function toggleTask(checkbox, line) {{
            const msg = {{
                "line": line,
                "checked": checkbox.checked
            }};
            window.webkit.messageHandlers.{handler}.postMessage(JSON.stringify(msg));
        }}
    </script>
</head>
<body>
    {content}
</body>
</html>
"""

class AddMenuDialog(Gtk.Dialog):
    def __init__(self, parent=None):
        super().__init__(title="Add Menu", transient_for=parent, flags=0)
        self.add_buttons(
            Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL,
            Gtk.STOCK_ADD, Gtk.ResponseType.OK
        )
        self.set_default_size(300, 150)
        
        box = self.get_content_area()
        
        # Name Entry
        hbox1 = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        hbox1.set_margin_top(10)
        hbox1.set_margin_bottom(10)
        hbox1.set_margin_start(10)
        hbox1.set_margin_end(10)
        
        label_name = Gtk.Label(label="Menu Name:")
        self.entry_name = Gtk.Entry()
        hbox1.pack_start(label_name, False, False, 0)
        hbox1.pack_start(self.entry_name, True, True, 0)
        box.pack_start(hbox1, False, False, 0)
        
        # Folder Picker
        hbox2 = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        hbox2.set_margin_bottom(10)
        hbox2.set_margin_start(10)
        hbox2.set_margin_end(10)
        
        label_folder = Gtk.Label(label="Folder:")
        self.btn_folder = Gtk.FileChooserButton(title="Select a Folder", action=Gtk.FileChooserAction.SELECT_FOLDER)
        hbox2.pack_start(label_folder, False, False, 0)
        hbox2.pack_start(self.btn_folder, True, True, 0)
        box.pack_start(hbox2, False, False, 0)
        
        self.show_all()


class DeleteMenuDialog(Gtk.Dialog):
    def __init__(self, parent=None, custom_menus=None):
        super().__init__(title="Delete Menu", transient_for=parent, flags=0)
        self.add_buttons(
            Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL,
            "Delete", Gtk.ResponseType.OK
        )
        self.set_default_size(380, 160)
        self.custom_menus = custom_menus or []
        
        box = self.get_content_area()
        box.set_spacing(10)
        box.set_margin_top(15)
        box.set_margin_bottom(15)
        box.set_margin_start(15)
        box.set_margin_end(15)
        
        lbl = Gtk.Label(label="Select the custom menu you want to delete:", xalign=0)
        box.pack_start(lbl, False, False, 0)
        
        self.combo = Gtk.ComboBoxText()
        for idx, m in enumerate(self.custom_menus):
            self.combo.append(str(idx), f"{m.get('name', 'Menu')} ({m.get('path', '')})")
        if self.custom_menus:
            self.combo.set_active(0)
            
        box.pack_start(self.combo, False, False, 0)
        
        lbl_hint = Gtk.Label(xalign=0)
        lbl_hint.set_markup("<small>Note: This only removes the menu from the tray. Files inside the folder will not be deleted.</small>")
        lbl_hint.set_line_wrap(True)
        box.pack_start(lbl_hint, False, False, 0)
        
        self.show_all()

    def get_selected_index(self):
        active_id = self.combo.get_active_id()
        if active_id is not None:
            return int(active_id)
        return -1


class EditPathsDialog(Gtk.Dialog):
    def __init__(self, parent=None, daily_dir="", daily_alias="", deadline_file="", deadline_alias="", custom_menus=None, deadline_dir="", calendar_file=""):
        super().__init__(title="Edit Paths", transient_for=parent, flags=0)
        self.add_buttons(
            Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL,
            Gtk.STOCK_SAVE, Gtk.ResponseType.OK
        )
        self.set_default_size(540, 480)
        self.custom_menus = [dict(m) for m in (custom_menus or [])]
        deadline_target = deadline_file or deadline_dir
        
        box = self.get_content_area()
        box.set_spacing(10)
        box.set_margin_top(15)
        box.set_margin_bottom(15)
        box.set_margin_start(15)
        box.set_margin_end(15)
        
        grid = Gtk.Grid()
        grid.set_column_spacing(12)
        grid.set_row_spacing(10)
        grid.set_hexpand(True)
        
        # Section Daily
        lbl_daily_sec = Gtk.Label(xalign=0)
        lbl_daily_sec.set_markup("<b>Daily Notes:</b>")
        grid.attach(lbl_daily_sec, 0, 0, 3, 1)
        
        lbl_d_alias = Gtk.Label(label="Alias:", xalign=0)
        lbl_d_alias.set_width_chars(8)
        self.entry_daily_alias = Gtk.Entry()
        self.entry_daily_alias.set_text(daily_alias or "Daily List")
        self.entry_daily_alias.set_placeholder_text("e.g. Daily List")
        self.entry_daily_alias.set_hexpand(True)
        self.entry_daily_alias.set_activates_default(True)
        grid.attach(lbl_d_alias, 0, 1, 1, 1)
        grid.attach(self.entry_daily_alias, 1, 1, 2, 1)
        
        lbl_d_path = Gtk.Label(label="Path:", xalign=0)
        lbl_d_path.set_width_chars(8)
        self.btn_daily_folder = Gtk.FileChooserButton(title="Select Daily Folder", action=Gtk.FileChooserAction.SELECT_FOLDER)
        if daily_dir and os.path.exists(daily_dir):
            self.btn_daily_folder.set_current_folder(daily_dir)
        self.btn_daily_folder.set_hexpand(True)
        grid.attach(lbl_d_path, 0, 2, 1, 1)
        grid.attach(self.btn_daily_folder, 1, 2, 2, 1)
        
        # Separator
        sep1 = Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL)
        grid.attach(sep1, 0, 3, 3, 1)
        
        # Section Deadline
        lbl_dl_sec = Gtk.Label(xalign=0)
        lbl_dl_sec.set_markup("<b>Deadline Note:</b>")
        grid.attach(lbl_dl_sec, 0, 4, 3, 1)
        
        lbl_dl_alias = Gtk.Label(label="Alias:", xalign=0)
        lbl_dl_alias.set_width_chars(8)
        self.entry_deadline_alias = Gtk.Entry()
        self.entry_deadline_alias.set_text(deadline_alias or "Deadline")
        self.entry_deadline_alias.set_placeholder_text("e.g. Deadline")
        self.entry_deadline_alias.set_hexpand(True)
        self.entry_deadline_alias.set_activates_default(True)
        grid.attach(lbl_dl_alias, 0, 5, 1, 1)
        grid.attach(self.entry_deadline_alias, 1, 5, 2, 1)
        
        lbl_dl_path = Gtk.Label(label="Path:", xalign=0)
        lbl_dl_path.set_width_chars(8)
        self.btn_deadline_file = Gtk.FileChooserButton(title="Select Deadline File", action=Gtk.FileChooserAction.OPEN)
        f_md = Gtk.FileFilter()
        f_md.set_name("Markdown files (*.md)")
        f_md.add_pattern("*.md")
        self.btn_deadline_file.add_filter(f_md)
        f_all = Gtk.FileFilter()
        f_all.set_name("All files (*.*)")
        f_all.add_pattern("*")
        self.btn_deadline_file.add_filter(f_all)
        self.btn_deadline_file.set_filter(f_md)

        if deadline_target:
            if os.path.isdir(deadline_target):
                c_cap = os.path.join(deadline_target, "Deadline.md")
                c_low = os.path.join(deadline_target, "deadline.md")
                deadline_target = c_cap if os.path.exists(c_cap) or not os.path.exists(c_low) else c_low
            if os.path.exists(deadline_target):
                self.btn_deadline_file.set_filename(deadline_target)
            else:
                d = os.path.dirname(deadline_target)
                if os.path.exists(d):
                    self.btn_deadline_file.set_current_folder(d)
        self.btn_deadline_file.set_hexpand(True)
        self.btn_deadline_folder = self.btn_deadline_file
        grid.attach(lbl_dl_path, 0, 6, 1, 1)
        grid.attach(self.btn_deadline_file, 1, 6, 2, 1)

        # Separator Calendar
        sep2 = Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL)
        grid.attach(sep2, 0, 7, 3, 1)

        # Section Calendar
        lbl_cal_sec = Gtk.Label(xalign=0)
        lbl_cal_sec.set_markup("<b>Calendar Data:</b>")
        grid.attach(lbl_cal_sec, 0, 8, 3, 1)

        lbl_cal_path = Gtk.Label(label="Path:", xalign=0)
        lbl_cal_path.set_width_chars(8)
        self.btn_calendar_file = Gtk.FileChooserButton(title="Select Calendar JSON File", action=Gtk.FileChooserAction.OPEN)
        f_json = Gtk.FileFilter()
        f_json.set_name("JSON files (*.json)")
        f_json.add_pattern("*.json")
        self.btn_calendar_file.add_filter(f_json)
        self.btn_calendar_file.add_filter(f_all)
        self.btn_calendar_file.set_filter(f_json)

        if calendar_file:
            if os.path.exists(calendar_file):
                self.btn_calendar_file.set_filename(calendar_file)
            else:
                cdir = os.path.dirname(calendar_file)
                if os.path.exists(cdir):
                    self.btn_calendar_file.set_current_folder(cdir)
        self.btn_calendar_file.set_hexpand(True)
        grid.attach(lbl_cal_path, 0, 9, 1, 1)
        grid.attach(self.btn_calendar_file, 1, 9, 2, 1)
        
        box.pack_start(grid, False, False, 0)
        
        # Section Custom Menus
        self.custom_entries = []
        if self.custom_menus:
            sep2 = Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL)
            box.pack_start(sep2, False, False, 4)
            
            lbl_custom = Gtk.Label(xalign=0)
            lbl_custom.set_markup("<b>Custom Added Menus (Alias &amp; Path):</b>")
            box.pack_start(lbl_custom, False, False, 0)
            
            scrolled = Gtk.ScrolledWindow()
            scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
            scrolled.set_min_content_height(110)
            
            c_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=8)
            c_box.set_margin_start(4)
            c_box.set_margin_end(4)
            c_box.set_margin_top(4)
            c_box.set_margin_bottom(4)
            
            for item in self.custom_menus:
                row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
                
                entry_name = Gtk.Entry()
                entry_name.set_text(item.get('name', 'Menu'))
                entry_name.set_placeholder_text("Menu Alias")
                entry_name.set_width_chars(14)
                entry_name.set_activates_default(True)
                
                btn_folder = Gtk.FileChooserButton(title="Select Folder", action=Gtk.FileChooserAction.SELECT_FOLDER)
                fpath = item.get('path', '')
                if fpath and os.path.exists(fpath):
                    btn_folder.set_current_folder(fpath)
                btn_folder.set_hexpand(True)
                
                btn_del = Gtk.Button(label="✕")
                btn_del.set_tooltip_text("Delete menu")
                def on_del(b, target=item, r=row):
                    if target in self.custom_menus:
                        self.custom_menus.remove(target)
                    r.destroy()
                btn_del.connect("clicked", on_del)
                
                row.pack_start(entry_name, False, False, 0)
                row.pack_start(btn_folder, True, True, 0)
                row.pack_start(btn_del, False, False, 0)
                c_box.pack_start(row, False, False, 0)
                self.custom_entries.append((item, entry_name, btn_folder, row))
                
            scrolled.add(c_box)
            box.pack_start(scrolled, True, True, 0)
            
        self.set_default_response(Gtk.ResponseType.OK)
        self.show_all()

    def get_updated_custom_menus(self):
        updated = []
        if hasattr(self, 'custom_entries') and self.custom_entries:
            for item, entry_name, btn_folder, row in self.custom_entries:
                if row.get_parent() is not None:
                    name = entry_name.get_text().strip() or item.get('name', 'Menu')
                    path = btn_folder.get_filename() or item.get('path', '')
                    if name and path:
                        updated.append({"name": name, "path": path})
        else:
            updated = self.custom_menus
        return updated


class MarkdownTrayApp:
    def __init__(self):
        self.config_dir = os.path.expanduser("~/.config/md-tray-app")
        self.config_file = os.path.join(self.config_dir, "config.json")
        self.calendar_file = os.path.join(self.config_dir, "calendar.json")
        self.calendar_events = []
        self.load_config()
        self.load_calendar()
        self.ensure_directories()
            
        self.window = None
        self.calendar_window = None
        self.md_parser = MarkdownIt("commonmark", {"html": True})
        self.current_filepath = self.get_today_filepath()
        self.setup_window_icons()
        self.menu = Gtk.Menu()
        self.setup_indicator()
        self.notified_events = set()
        GLib.timeout_add_seconds(60, self.check_alarms)
        # Check immediately at startup
        self.check_alarms()

    def setup_window_icons(self):
        Gtk.Window.set_default_icon_name("md-tray-app")
        for p in [
            os.path.expanduser("~/.local/share/icons/hicolor/scalable/apps/md-tray-app.svg"),
            os.path.expanduser("~/.local/share/icons/hicolor/128x128/apps/md-tray-app.png"),
            os.path.expanduser("~/.local/share/icons/md-tray-app.png")
        ]:
            if os.path.exists(p):
                try:
                    Gtk.Window.set_default_icon_from_file(p)
                    break
                except Exception:
                    pass

    def check_alarms(self):
        now = datetime.datetime.now()
        current_time_str = now.strftime("%H:%M")
        current_date_str = now.strftime("%Y-%m-%d")
        js_weekday = (now.weekday() + 1) % 7

        for ev in self.calendar_events:
            ev_start = ev.get("start", "")
            if not ev_start: continue
            
            ev_date = ev_start[:10]
            ev_time = ev_start[11:16]
            
            is_today = False
            repeat_days = ev.get("repeatDays", [])
            if repeat_days:
                try:
                    anchor_date = datetime.datetime.strptime(ev_date, "%Y-%m-%d").date()
                    if now.date() >= anchor_date and js_weekday in repeat_days:
                        if current_date_str not in ev.get("exceptionDates", []):
                            until_date = ev.get("untilDate")
                            if not until_date or current_date_str < until_date:
                                is_today = True
                except ValueError:
                    pass
            else:
                if ev_date == current_date_str:
                    is_today = True
                    
            if is_today and ev_time == current_time_str:
                ev_id = ev.get("id", str(id(ev)))
                event_key = f"{ev_id}_{current_date_str}_{ev_time}"
                if event_key not in self.notified_events:
                    self.notified_events.add(event_key)
                    self.trigger_alarm(ev)
                    
        # Clean up old notified events daily (simple approach)
        if now.hour == 0 and now.minute == 0:
            self.notified_events.clear()
            
        return True

    def trigger_alarm(self, ev):
        title = ev.get("title", "Task Reminder")
        note = ev.get("note", "")
        try:
            subprocess.Popen(["notify-send", "-a", "Markdown Tray", f"🔔 {title}", note])
        except Exception as e:
            print("Failed to send notification:", e)

    @property
    def deadline_dir(self):
        return os.path.dirname(self.deadline_file) if getattr(self, 'deadline_file', None) else ""

    @deadline_dir.setter
    def deadline_dir(self, val):
        if val and os.path.isdir(val):
            c_cap = os.path.join(val, "Deadline.md")
            c_low = os.path.join(val, "deadline.md")
            self.deadline_file = c_cap if os.path.exists(c_cap) or not os.path.exists(c_low) else c_low
        else:
            self.deadline_file = val

    def load_config(self):
        default_daily = os.path.expanduser("~/Note/Daily")
        default_deadline = os.path.expanduser("~/Note/Deadline/Deadline.md")
        default_calendar = os.path.expanduser("~/Note/calendar.json")
        legacy_calendar = os.path.join(self.config_dir, "calendar.json")
        self.daily_dir = default_daily
        self.daily_alias = "Daily List"
        self.deadline_file = default_deadline
        self.deadline_alias = "Deadline"
        self.calendar_file = default_calendar
        self.custom_menus = []
        
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, "r") as f:
                    config = json.load(f)
                    # Support old config format transparently
                    if "note_dir" in config:
                        self.daily_dir = config["note_dir"]
                    else:
                        self.daily_dir = config.get("daily_dir", default_daily)
                    self.daily_alias = config.get("daily_alias", "Daily List")
                    
                    # Support deadline_file (new), deadline_path, and deadline_dir (legacy)
                    dl_val = config.get("deadline_file") or config.get("deadline_path") or config.get("deadline_dir")
                    if dl_val:
                        if os.path.isdir(dl_val):
                            c_cap = os.path.join(dl_val, "Deadline.md")
                            c_low = os.path.join(dl_val, "deadline.md")
                            self.deadline_file = c_cap if os.path.exists(c_cap) or not os.path.exists(c_low) else c_low
                        else:
                            self.deadline_file = dl_val
                    else:
                        self.deadline_file = default_deadline
                    
                    self.deadline_alias = config.get("deadline_alias", "Deadline")
                    self.calendar_file = config.get("calendar_file", default_calendar)
                    self.custom_menus = config.get("custom_menus", [])
            except Exception as e:
                print("Error loading config:", e)

        # Migrate legacy calendar from ~/.config/md-tray-app/calendar.json to ~/Note/calendar.json
        if not os.path.exists(self.calendar_file) and os.path.exists(legacy_calendar):
            try:
                import shutil
                os.makedirs(os.path.dirname(self.calendar_file), exist_ok=True)
                shutil.copy2(legacy_calendar, self.calendar_file)
            except Exception as e:
                print("Error migrating calendar file:", e)

    def save_config(self):
        if not os.path.exists(self.config_dir):
            os.makedirs(self.config_dir, exist_ok=True)
        with open(self.config_file, "w") as f:
            json.dump({
                "daily_dir": self.daily_dir,
                "daily_alias": self.daily_alias,
                "deadline_file": self.deadline_file,
                "deadline_alias": self.deadline_alias,
                "calendar_file": self.calendar_file,
                "custom_menus": self.custom_menus
            }, f, indent=2)

    def ensure_directories(self):
        os.makedirs(self.daily_dir, exist_ok=True)
        if self.deadline_file:
            d_dir = os.path.dirname(self.deadline_file)
            if d_dir:
                os.makedirs(d_dir, exist_ok=True)
            if not os.path.exists(self.deadline_file) or os.path.getsize(self.deadline_file) == 0:
                try:
                    with open(self.deadline_file, "w", encoding="utf-8") as f:
                        f.write("# Deadlines\n\n- [ ] Important deadline\n")
                except Exception as e:
                    print("Error creating initial deadline note:", e)
        if self.calendar_file:
            cal_dir = os.path.dirname(self.calendar_file)
            if cal_dir:
                os.makedirs(cal_dir, exist_ok=True)

    def load_calendar(self):
        if os.path.exists(self.calendar_file):
            try:
                with open(self.calendar_file, "r", encoding="utf-8") as f:
                    self.calendar_events = json.load(f)
            except Exception as e:
                print("Error loading calendar:", e)

    def save_calendar(self):
        cal_dir = os.path.dirname(self.calendar_file)
        if cal_dir and not os.path.exists(cal_dir):
            os.makedirs(cal_dir, exist_ok=True)
        try:
            with open(self.calendar_file, "w", encoding="utf-8") as f:
                json.dump(self.calendar_events, f, indent=2)
        except Exception as e:
            print("Error saving calendar:", e)

    def get_today_filepath(self):
        today_str = datetime.date.today().strftime("%Y-%m-%d.md")
        return os.path.join(self.daily_dir, today_str)

    def setup_indicator(self):
        icon_theme_dir = os.path.expanduser("~/.local/share/icons")
        self.indicator = AyatanaAppIndicator3.Indicator.new_with_path(
            "md_tray_app",
            "md-tray-app",
            AyatanaAppIndicator3.IndicatorCategory.APPLICATION_STATUS,
            icon_theme_dir)
        self.indicator.set_status(AyatanaAppIndicator3.IndicatorStatus.ACTIVE)
        self.menu = self.build_menu()
        self.indicator.set_menu(self.menu)

    def create_folder_submenu(self, folder_path, custom_menu_obj=None):
        submenu = Gtk.Menu()
        if not os.path.exists(folder_path):
            empty_item = Gtk.MenuItem(label="Folder not found")
            empty_item.set_sensitive(False)
            submenu.append(empty_item)
            if custom_menu_obj is not None:
                submenu.append(Gtk.SeparatorMenuItem())
                item_del = Gtk.MenuItem(label="🗑 Delete this menu")
                item_del.connect('activate', lambda w, m=custom_menu_obj: self.on_delete_single_custom_menu(m))
                submenu.append(item_del)
            return submenu
            
        files = glob.glob(os.path.join(folder_path, "*.md"))
        files.sort(reverse=True)
        
        if not files:
            empty_item = Gtk.MenuItem(label="No notes found")
            empty_item.set_sensitive(False)
            submenu.append(empty_item)
        else:
            for fpath in files[:15]:
                fname = os.path.basename(fpath)
                item_file = Gtk.MenuItem(label=fname)
                item_file.connect('activate', lambda w, p=fpath: self.switch_file(p))
                submenu.append(item_file)
                
        if custom_menu_obj is not None:
            submenu.append(Gtk.SeparatorMenuItem())
            item_del = Gtk.MenuItem(label="🗑 Delete this menu")
            item_del.connect('activate', lambda w, m=custom_menu_obj: self.on_delete_single_custom_menu(m))
            submenu.append(item_del)
            
        return submenu

    def build_menu(self):
        if not hasattr(self, 'menu') or self.menu is None:
            self.menu = Gtk.Menu()
        else:
            for child in self.menu.get_children():
                self.menu.remove(child)
        menu = self.menu
        
        # Today
        item_today = Gtk.MenuItem(label="Today")
        item_today.connect('activate', lambda w: self.show_today_note())
        menu.append(item_today)
        
        # Calendar
        item_calendar = Gtk.MenuItem(label="Calendar")
        item_calendar.connect('activate', self.on_show_calendar)
        menu.append(item_calendar)
        
        # Deadline
        item_deadline = Gtk.MenuItem(label=self.deadline_alias or "Deadline")
        item_deadline.connect('activate', lambda w: self.show_deadline_note())
        menu.append(item_deadline)
        
        # Daily List
        daily_menu = self.create_folder_submenu(self.daily_dir)
        item_daily = Gtk.MenuItem(label=self.daily_alias or "Daily List")
        item_daily.set_submenu(daily_menu)
        menu.append(item_daily)
        
        # Edit Paths
        item_edit_paths = Gtk.MenuItem(label="Edit Paths")
        item_edit_paths.connect('activate', self.on_edit_paths)
        menu.append(item_edit_paths)
        
        menu.append(Gtk.SeparatorMenuItem())
        
        # Custom Menus
        for cmenu in self.custom_menus:
            submenu = self.create_folder_submenu(cmenu["path"], custom_menu_obj=cmenu)
            item = Gtk.MenuItem(label=cmenu["name"])
            item.set_submenu(submenu)
            menu.append(item)
            
        if self.custom_menus:
            menu.append(Gtk.SeparatorMenuItem())
            
        # Add Menu
        item_add_menu = Gtk.MenuItem(label="Add Menu")
        item_add_menu.connect('activate', self.on_add_menu)
        menu.append(item_add_menu)
        
        # Delete Menu
        item_delete_menu = Gtk.MenuItem(label="Delete Menu")
        if self.custom_menus:
            item_delete_menu.connect('activate', self.on_delete_menu)
        else:
            item_delete_menu.set_sensitive(False)
        menu.append(item_delete_menu)
        
        menu.show_all()
        return menu

    def on_edit_paths(self, item):
        dialog = EditPathsDialog(
            daily_dir=self.daily_dir,
            daily_alias=self.daily_alias,
            deadline_file=self.deadline_file,
            deadline_alias=self.deadline_alias,
            calendar_file=self.calendar_file,
            custom_menus=self.custom_menus
        )
        dialog.set_keep_above(True)
        response = dialog.run()
        if response == Gtk.ResponseType.OK:
            new_daily = dialog.btn_daily_folder.get_filename() or self.daily_dir
            new_daily_alias = dialog.entry_daily_alias.get_text().strip() or "Daily List"
            new_deadline = dialog.btn_deadline_file.get_filename() or self.deadline_file
            new_deadline_alias = dialog.entry_deadline_alias.get_text().strip() or "Deadline"
            new_calendar = dialog.btn_calendar_file.get_filename() or self.calendar_file
            
            self.daily_dir = new_daily
            self.daily_alias = new_daily_alias
            self.deadline_file = new_deadline
            self.deadline_alias = new_deadline_alias
            self.calendar_file = new_calendar
            self.custom_menus = dialog.get_updated_custom_menus()
            
            self.ensure_directories()
            self.load_calendar()
            self.save_config()
            if not os.path.exists(self.current_filepath):
                self.current_filepath = self.get_today_filepath()
            self.build_menu()
            if self.window and self.window.get_visible():
                self.update_window_title()
                self.update_webview()
                
        dialog.destroy()

    def on_delete_single_custom_menu(self, cmenu):
        dialog = Gtk.MessageDialog(
            transient_for=None,
            flags=0,
            message_type=Gtk.MessageType.QUESTION,
            buttons=Gtk.ButtonsType.YES_NO,
            text=f"Delete menu '{cmenu.get('name')}'?"
        )
        dialog.format_secondary_text("This will only remove the menu from Markdown Tray. Your files in the folder will NOT be deleted.")
        dialog.set_keep_above(True)
        response = dialog.run()
        dialog.destroy()
        
        if response == Gtk.ResponseType.YES:
            if cmenu in self.custom_menus:
                self.custom_menus.remove(cmenu)
                self.save_config()
                self.build_menu()

    def on_delete_menu(self, item):
        if not self.custom_menus:
            dialog = Gtk.MessageDialog(
                transient_for=None,
                flags=0,
                message_type=Gtk.MessageType.INFO,
                buttons=Gtk.ButtonsType.OK,
                text="No Custom Menus"
            )
            dialog.format_secondary_text("There are no custom added menus to delete.")
            dialog.set_keep_above(True)
            dialog.run()
            dialog.destroy()
            return

        dialog = DeleteMenuDialog(custom_menus=self.custom_menus)
        dialog.set_keep_above(True)
        response = dialog.run()
        if response == Gtk.ResponseType.OK:
            idx = dialog.get_selected_index()
            if 0 <= idx < len(self.custom_menus):
                del self.custom_menus[idx]
                self.save_config()
                self.build_menu()
        dialog.destroy()

    def on_add_menu(self, item):
        dialog = AddMenuDialog()
        dialog.set_keep_above(True)
        response = dialog.run()
        
        if response == Gtk.ResponseType.OK:
            name = dialog.entry_name.get_text().strip()
            folder = dialog.btn_folder.get_filename()
            
            if name and folder:
                self.custom_menus.append({
                    "name": name,
                    "path": folder
                })
                self.save_config()
                self.build_menu()
                
        dialog.destroy()

    def show_deadline_note(self):
        if not self.deadline_file:
            return
        if not os.path.exists(self.deadline_file) or os.path.getsize(self.deadline_file) == 0:
            try:
                d_dir = os.path.dirname(self.deadline_file)
                if d_dir:
                    os.makedirs(d_dir, exist_ok=True)
                with open(self.deadline_file, "w", encoding="utf-8") as f:
                    f.write("# Deadlines\n\n- [ ] Example deadline task\n")
            except Exception as e:
                print("Error creating deadline note:", e)
        self.switch_file(self.deadline_file)

    def show_today_note(self):
        today_file = self.get_today_filepath()
        if self.window and self.window.get_visible() and self.current_filepath == today_file:
            if self.window.is_active():
                self.window.hide()
                return
            else:
                self.window.present()
                return
        self.switch_file(today_file)

    def switch_file(self, filepath):
        if self.window and self.window.get_visible() and self.current_filepath == filepath:
            if self.window.is_active():
                self.window.hide()
                return
            else:
                self.window.present()
                return
            
        self.current_filepath = filepath
        self.update_window_title()
        self.show_preview()

    def update_window_title(self):
        if not self.window or not self.current_filepath:
            return
        if self.current_filepath == self.deadline_file:
            self.window.set_title(f"Notes - {self.deadline_alias or 'Deadline'}")
        elif self.current_filepath == self.get_today_filepath():
            self.window.set_title(f"Notes - Today ({os.path.basename(self.current_filepath).replace('.md', '')})")
        else:
            self.window.set_title(f"Notes - {os.path.basename(self.current_filepath)}")

    def show_preview(self):
        if not self.window:
            self.window = Gtk.Window()
            self.window.set_default_size(500, 700)
            self.window.connect("delete-event", self.on_window_delete)
            
            manager = WebKit2.UserContentManager()
            manager.register_script_message_handler("task_toggled")
            manager.connect("script-message-received::task_toggled", self.on_task_toggled)
            
            self.webview = WebKit2.WebView.new_with_user_content_manager(manager)
            self.window.add(self.webview)
            
        self.update_window_title()
        self.update_webview()
        self.window.show_all()
        self.window.present()

    def on_window_delete(self, window, event):
        window.hide()
        return True

    def update_webview(self):
        if not os.path.exists(self.current_filepath):
            date_str = os.path.basename(self.current_filepath).replace(".md", "")
            text = f"# {date_str}\n\n<span class='empty-state'>Chưa có ghi chú nào. Hãy tạo file này để bắt đầu.</span>"
            html_content = self.md_parser.render(text)
        else:
            with open(self.current_filepath, "r", encoding="utf-8") as f:
                text = f.read()
                
            lines = text.split("\n")
            for i, line in enumerate(lines):
                line = re.sub(r'^(\s*[-*]\s*)\[ \]\s+', rf'\1<input type="checkbox" onchange="toggleTask(this, {i})"> ', line)
                line = re.sub(r'^(\s*[-*]\s*)\[[xX]\]\s+', rf'\1<input type="checkbox" checked onchange="toggleTask(this, {i})"> ', line)
                lines[i] = line
                
            html_content = self.md_parser.render("\n".join(lines))
            
        full_html = HTML_TEMPLATE.format(css=CSS, content=html_content, handler="task_toggled")
        self.webview.load_html(full_html, "file:///")
        
        self.build_menu()

    def on_task_toggled(self, manager, message):
        try:
            msg_str = message.get_js_value().to_string()
            msg = json.loads(msg_str)
            line_idx = msg["line"]
            is_checked = msg["checked"]
            
            self.toggle_task_in_file(line_idx, is_checked, self.current_filepath)
            
            if self.current_filepath == self.get_today_filepath() and self.calendar_window and self.calendar_window.get_visible():
                self.update_calendar_preview()
        except Exception as e:
            print("Error parsing message from JS:", e)

    def on_task_toggled_today(self, manager, message):
        try:
            msg_str = message.get_js_value().to_string()
            msg = json.loads(msg_str)
            line_idx = msg["line"]
            is_checked = msg["checked"]
            
            today_filepath = self.get_today_filepath()
            self.toggle_task_in_file(line_idx, is_checked, today_filepath)
            
            if self.current_filepath == today_filepath and self.window and self.window.get_visible():
                self.update_webview()
        except Exception as e:
            print("Error parsing message from JS:", e)

    def toggle_task_in_file(self, line_idx, is_checked, filepath):
        if not os.path.exists(filepath):
            return
            
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.read().split("\n")
                
            if line_idx < len(lines):
                line = lines[line_idx]
                if is_checked:
                    lines[line_idx] = re.sub(r'\[ \]', '[x]', line, count=1)
                else:
                    lines[line_idx] = re.sub(r'\[[xX]\]', '[ ]', line, count=1)
                    
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))
                
        except Exception as e:
            print("Error updating file:", e)

    def update_calendar_preview(self):
        if not self.calendar_window or not hasattr(self, 'cal_preview_webview'):
            return
            
        today_filepath = self.get_today_filepath()
        if not os.path.exists(today_filepath):
            date_str = os.path.basename(today_filepath).replace(".md", "")
            text = f"# {date_str}\n\n<span class='empty-state'>Chưa có ghi chú nào. Hãy tạo file này để bắt đầu.</span>"
            html_content = self.md_parser.render(text)
        else:
            with open(today_filepath, "r", encoding="utf-8") as f:
                text = f.read()
                
            lines = text.split("\n")
            for i, line in enumerate(lines):
                line = re.sub(r'^(\s*[-*]\s*)\[ \]\s+', rf'\1<input type="checkbox" onchange="toggleTask(this, {i})"> ', line)
                line = re.sub(r'^(\s*[-*]\s*)\[[xX]\]\s+', rf'\1<input type="checkbox" checked onchange="toggleTask(this, {i})"> ', line)
                lines[i] = line
                
            html_content = self.md_parser.render("\n".join(lines))
            
        full_html = HTML_TEMPLATE.format(css=CSS, content=html_content, handler="task_toggled_today")
        self.cal_preview_webview.load_html(full_html, "file:///")

    def on_toggle_preview(self, button):
        if hasattr(self, 'cal_preview_webview'):
            if button.get_active():
                self.cal_preview_webview.show()
            else:
                self.cal_preview_webview.hide()

    def get_calendar_html_path(self):
        candidate_dirs = []
        if getattr(sys, 'frozen', False):
            candidate_dirs.append(sys._MEIPASS)
        else:
            candidate_dirs.append(os.path.dirname(os.path.abspath(__file__)))
            try:
                candidate_dirs.append(os.path.dirname(os.path.realpath(__file__)))
            except Exception:
                pass

        candidate_dirs.extend([
            os.path.expanduser("~/.local/bin"),
            os.path.expanduser("~/Dotfiles/desktop/.local/bin"),
            os.path.expanduser("~/Projects/Main/Personal/MarkdownTray"),
            os.path.expanduser("~/.config/md-tray-app"),
            os.path.expanduser("~/.local/share/md-tray-app")
        ])

        for d in candidate_dirs:
            if not d:
                continue
            path = os.path.join(d, "calendar.html")
            if os.path.isfile(path):
                return path
        return None

    def on_show_calendar(self, item=None):
        if self.calendar_window and self.calendar_window.get_visible():
            if self.calendar_window.is_active():
                self.calendar_window.hide()
                return
            else:
                self.calendar_window.present()
                return

        cal_html_path = self.get_calendar_html_path()
        if not cal_html_path:
            print("calendar.html not found in any candidate path!")
            try:
                subprocess.Popen(["notify-send", "-a", "Markdown Tray", "Calendar Error", "calendar.html not found!"])
            except Exception:
                pass
            return

        if not self.calendar_window:
            self.calendar_window = Gtk.Window()
            self.calendar_window.set_default_size(1200, 700)
            self.calendar_window.connect("delete-event", self.on_calendar_window_delete)
            
            hb = Gtk.HeaderBar()
            hb.set_show_close_button(True)
            hb.props.title = "Weekly Calendar"
            self.calendar_window.set_titlebar(hb)
            
            self.toggle_preview_btn = Gtk.ToggleButton()
            icon = Gtk.Image.new_from_icon_name("view-sidebar-symbolic", Gtk.IconSize.BUTTON)
            self.toggle_preview_btn.add(icon)
            self.toggle_preview_btn.set_tooltip_text("Toggle Today's Note")
            self.toggle_preview_btn.set_active(False)
            self.toggle_preview_btn.connect("toggled", self.on_toggle_preview)
            
            hb.pack_end(self.toggle_preview_btn)
            
            self.cal_paned = Gtk.Paned(orientation=Gtk.Orientation.HORIZONTAL)
            self.calendar_window.add(self.cal_paned)
            
            manager = WebKit2.UserContentManager()
            manager.register_script_message_handler("calendar_action")
            manager.connect("script-message-received::calendar_action", self.on_calendar_action)
            
            self.cal_webview = WebKit2.WebView.new_with_user_content_manager(manager)
            self.cal_webview.connect("load-changed", self.on_cal_load_changed)
            self.cal_paned.pack1(self.cal_webview, True, False)
            
            preview_manager = WebKit2.UserContentManager()
            preview_manager.register_script_message_handler("task_toggled_today")
            preview_manager.connect("script-message-received::task_toggled_today", self.on_task_toggled_today)
            
            self.cal_preview_webview = WebKit2.WebView.new_with_user_content_manager(preview_manager)
            self.cal_paned.pack2(self.cal_preview_webview, False, False)
            self.cal_paned.set_position(850)
            
            self._cal_loaded = False
            self.cal_webview.load_uri("file://" + cal_html_path)
        else:
            self.load_calendar()
            events_json = json.dumps(self.calendar_events)
            js_safe_json = json.dumps(events_json)
            self.cal_webview.run_javascript(f"loadData({js_safe_json});", None, None, None)
            
        self.update_calendar_preview()
        self.calendar_window.show_all()
        if hasattr(self, 'toggle_preview_btn') and not self.toggle_preview_btn.get_active():
            self.cal_preview_webview.hide()
        self.calendar_window.present()

    def on_cal_load_changed(self, webview, load_event):
        if load_event == WebKit2.LoadEvent.FINISHED:
            self._cal_loaded = True
            # Inject data
            events_json = json.dumps(self.calendar_events)
            js_safe_json = json.dumps(events_json)
            script = f"loadData({js_safe_json});"
            webview.run_javascript(script, None, None, None)

    def on_calendar_window_delete(self, window, event):
        window.hide()
        return True

    def on_calendar_action(self, manager, message):
        try:
            msg_str = message.get_js_value().to_string()
            msg = json.loads(msg_str)
            action = msg.get("action")
            data = msg.get("data")
            
            if action == "save_events":
                self.calendar_events = data
                self.save_calendar()
        except Exception as e:
            print("Error parsing calendar message:", e)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal.SIG_DFL)
    app = MarkdownTrayApp()
    
    # Cho phép gọi cửa sổ lịch qua SIGHUP (tránh xung đột SIGUSR1 với WebKit GC)
    def handle_calendar_signal():
        try:
            app.on_show_calendar(None)
        except Exception as e:
            print("Error showing calendar:", e)
        return True
        
    GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGHUP, handle_calendar_signal)
    
    # Cho phép gọi ghi chú hôm nay (task) qua SIGUSR2
    def handle_task_signal():
        try:
            app.show_today_note()
        except Exception as e:
            print("Error showing today note:", e)
        return True

    GLib.unix_signal_add(GLib.PRIORITY_DEFAULT, signal.SIGUSR2, handle_task_signal)
    
    if "--calendar" in sys.argv:
        GLib.idle_add(app.on_show_calendar, None)
    elif "--task" in sys.argv or "--today" in sys.argv:
        GLib.idle_add(app.show_today_note)
    elif "--deadline" in sys.argv:
        GLib.idle_add(app.show_deadline_note)
        
    Gtk.main()
