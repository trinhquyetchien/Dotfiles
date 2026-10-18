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
from gi.repository import Gtk, WebKit2, GLib, AyatanaAppIndicator3

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


class MarkdownTrayApp:
    def __init__(self):
        self.config_dir = os.path.expanduser("~/.config/md-tray-app")
        self.config_file = os.path.join(self.config_dir, "config.json")
        self.calendar_file = os.path.join(self.config_dir, "calendar.json")
        self.calendar_events = []
        self.load_config()
        self.load_calendar()
        
        if not os.path.exists(self.daily_dir):
            os.makedirs(self.daily_dir, exist_ok=True)
            
        self.window = None
        self.calendar_window = None
        self.md_parser = MarkdownIt("commonmark", {"html": True})
        self.current_filepath = self.get_today_filepath()
        self.setup_window_icons()
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

    def load_config(self):
        default_dir = os.path.expanduser("~/Note/Daily")
        self.daily_dir = default_dir
        self.custom_menus = []
        
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, "r") as f:
                    config = json.load(f)
                    # Support old config format transparently
                    if "note_dir" in config:
                        self.daily_dir = config["note_dir"]
                    else:
                        self.daily_dir = config.get("daily_dir", default_dir)
                    self.custom_menus = config.get("custom_menus", [])
            except Exception as e:
                print("Error loading config:", e)

    def save_config(self):
        if not os.path.exists(self.config_dir):
            os.makedirs(self.config_dir, exist_ok=True)
        with open(self.config_file, "w") as f:
            json.dump({
                "daily_dir": self.daily_dir,
                "custom_menus": self.custom_menus
            }, f)

    def load_calendar(self):
        if os.path.exists(self.calendar_file):
            try:
                with open(self.calendar_file, "r") as f:
                    self.calendar_events = json.load(f)
            except Exception as e:
                print("Error loading calendar:", e)

    def save_calendar(self):
        if not os.path.exists(self.config_dir):
            os.makedirs(self.config_dir, exist_ok=True)
        try:
            with open(self.calendar_file, "w") as f:
                json.dump(self.calendar_events, f)
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

    def create_folder_submenu(self, folder_path):
        submenu = Gtk.Menu()
        if not os.path.exists(folder_path):
            empty_item = Gtk.MenuItem(label="Folder not found")
            empty_item.set_sensitive(False)
            submenu.append(empty_item)
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
        return submenu

    def build_menu(self):
        menu = Gtk.Menu()
        
        # Today
        item_today = Gtk.MenuItem(label="Today")
        item_today.connect('activate', lambda w: self.show_today_note())
        menu.append(item_today)
        
        # Calendar
        item_calendar = Gtk.MenuItem(label="Calendar")
        item_calendar.connect('activate', self.on_show_calendar)
        menu.append(item_calendar)
        
        # Daily List
        daily_menu = self.create_folder_submenu(self.daily_dir)
        item_daily = Gtk.MenuItem(label="Daily List")
        item_daily.set_submenu(daily_menu)
        menu.append(item_daily)
        
        # Edit Path Daily
        item_edit_daily = Gtk.MenuItem(label="Edit Path Daily")
        item_edit_daily.connect('activate', self.on_change_daily_directory)
        menu.append(item_edit_daily)
        
        menu.append(Gtk.SeparatorMenuItem())
        
        # Custom Menus
        for cmenu in self.custom_menus:
            submenu = self.create_folder_submenu(cmenu["path"])
            item = Gtk.MenuItem(label=cmenu["name"])
            item.set_submenu(submenu)
            menu.append(item)
            
        if self.custom_menus:
            menu.append(Gtk.SeparatorMenuItem())
            
        # Add Menu
        item_add_menu = Gtk.MenuItem(label="Add Menu")
        item_add_menu.connect('activate', self.on_add_menu)
        menu.append(item_add_menu)
        
        menu.show_all()
        return menu

    def on_change_daily_directory(self, item):
        dialog = Gtk.FileChooserDialog(
            title="Choose folder for Daily Notes",
            parent=None,
            action=Gtk.FileChooserAction.SELECT_FOLDER
        )
        dialog.add_buttons(
            Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL,
            Gtk.STOCK_OPEN, Gtk.ResponseType.OK
        )
        dialog.set_current_folder(self.daily_dir)
        dialog.set_keep_above(True)
        
        response = dialog.run()
        if response == Gtk.ResponseType.OK:
            new_dir = dialog.get_filename()
            self.daily_dir = new_dir
            self.save_config()
            self.current_filepath = self.get_today_filepath()
            self.menu = self.build_menu()
            self.indicator.set_menu(self.menu)
            if self.window and self.window.get_visible():
                self.window.set_title(f"Notes - {os.path.basename(self.current_filepath)}")
                self.update_webview()
                
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
                self.menu = self.build_menu()
                self.indicator.set_menu(self.menu)
                
        dialog.destroy()

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
        if self.window:
            self.window.set_title(f"Notes - {os.path.basename(self.current_filepath)}")
        self.show_preview()

    def show_preview(self):
        if not self.window:
            self.window = Gtk.Window()
            self.window.set_title(f"Notes - {os.path.basename(self.current_filepath)}")
            self.window.set_default_size(500, 700)
            self.window.connect("delete-event", self.on_window_delete)
            
            manager = WebKit2.UserContentManager()
            manager.register_script_message_handler("task_toggled")
            manager.connect("script-message-received::task_toggled", self.on_task_toggled)
            
            self.webview = WebKit2.WebView.new_with_user_content_manager(manager)
            self.window.add(self.webview)
            
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
        
        self.menu = self.build_menu()
        self.indicator.set_menu(self.menu)

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
        
    Gtk.main()
