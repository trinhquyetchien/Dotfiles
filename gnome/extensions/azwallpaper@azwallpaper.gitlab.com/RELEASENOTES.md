<b><span size="large">v14.0</span></b>

- Slideshow: implement a GLib.idle_add() when changing wallpaper image.
    - Resolves lag issues when changing wallpapers with large file sizes.
- Fix an issue where inserting new images into the queue while paused caused the current wallpaper to change unexpectedly on resume.
- Slideshow directory monitor: file event handling improvements for reliability across all file operations.