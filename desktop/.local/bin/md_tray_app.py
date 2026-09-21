import gi
import signal
import sys
import os
import re
import json
import datetime
import glob

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
            window.webkit.messageHandlers.task_toggled.postMessage(JSON.stringify(msg));
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
        self.load_config()
        
        if not os.path.exists(self.daily_dir):
            os.makedirs(self.daily_dir, exist_ok=True)
            
        self.window = None
        self.md_parser = MarkdownIt("commonmark", {"html": True})
        self.current_filepath = self.get_today_filepath()
        
        self.setup_indicator()

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

    def get_today_filepath(self):
        today_str = datetime.date.today().strftime("%Y-%m-%d.md")
        return os.path.join(self.daily_dir, today_str)

    def setup_indicator(self):
        self.indicator = AyatanaAppIndicator3.Indicator.new(
            "md_tray_app",
            "text-x-generic",
            AyatanaAppIndicator3.IndicatorCategory.APPLICATION_STATUS)
        self.indicator.set_status(AyatanaAppIndicator3.IndicatorStatus.ACTIVE)
        self.indicator.set_menu(self.build_menu())

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
        
        # Today's Note
        item_today = Gtk.MenuItem(label="Today's Note")
        item_today.connect('activate', lambda w: self.switch_file(self.get_today_filepath()))
        menu.append(item_today)
        
        # Daily Notes Submenu
        daily_menu = self.create_folder_submenu(self.daily_dir)
        item_daily = Gtk.MenuItem(label="Daily Notes")
        item_daily.set_submenu(daily_menu)
        menu.append(item_daily)
        
        # Edit Daily Path
        item_edit_daily = Gtk.MenuItem(label="Edit Daily Path...")
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
        item_add_menu = Gtk.MenuItem(label="Add Menu...")
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
            self.indicator.set_menu(self.build_menu())
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
                self.indicator.set_menu(self.build_menu())
                
        dialog.destroy()

    def switch_file(self, filepath):
        if self.window and self.window.get_visible() and self.current_filepath == filepath:
            self.window.hide()
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
            
        full_html = HTML_TEMPLATE.format(css=CSS, content=html_content)
        self.webview.load_html(full_html, "file:///")
        
        self.indicator.set_menu(self.build_menu())

    def on_task_toggled(self, manager, message):
        try:
            msg_str = message.get_js_value().to_string()
            msg = json.loads(msg_str)
            line_idx = msg["line"]
            is_checked = msg["checked"]
            
            self.toggle_task_in_file(line_idx, is_checked)
        except Exception as e:
            print("Error parsing message from JS:", e)

    def toggle_task_in_file(self, line_idx, is_checked):
        if not os.path.exists(self.current_filepath):
            return
            
        try:
            with open(self.current_filepath, "r", encoding="utf-8") as f:
                lines = f.read().split("\n")
                
            if line_idx < len(lines):
                line = lines[line_idx]
                if is_checked:
                    lines[line_idx] = re.sub(r'\[ \]', '[x]', line, count=1)
                else:
                    lines[line_idx] = re.sub(r'\[[xX]\]', '[ ]', line, count=1)
                    
            with open(self.current_filepath, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))
                
        except Exception as e:
            print("Error updating file:", e)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal.SIG_DFL)
    app = MarkdownTrayApp()
    Gtk.main()
