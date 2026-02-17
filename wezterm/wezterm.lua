local wezterm = require 'wezterm'
local config = {}

config.font = wezterm.font_with_fallback({
    { family = "JetBrains Mono", weight = "Medium" },
    { family = "Fira Code" },
})
config.font_size = 13.0
config.line_height = 1.2

config.color_scheme = "Kanagawa Dragon"

config.window_padding = { left = 2, right = 2, top = 0, bottom = 0 }
config.macos_window_background_blur = 20
config.win32_system_backdrop = "Acrylic"

config.enable_tab_bar = false

config.warn_about_missing_glyphs = false

config.window_decorations = "RESIZE"

local default_opacity = 0.8

config.window_background_opacity = default_opacity

-- Hàm tăng opacity
wezterm.on("opacity-up", function(window, pane)
    local overrides = window:get_config_overrides() or {}
    local current = overrides.window_background_opacity or default_opacity
    local next = math.min(current + 0.05, 1.0) -- tăng 0.05
    overrides.window_background_opacity = next
    window:set_config_overrides(overrides)
end)

-- Hàm giảm opacity
wezterm.on("opacity-down", function(window, pane)
    local overrides = window:get_config_overrides() or {}
    local current = overrides.window_background_opacity or default_opacity
    local next = math.max(current - 0.05, 0.1) -- giảm 0.05, tối thiểu 0.1
    overrides.window_background_opacity = next
    window:set_config_overrides(overrides)
end)

-- Reset về mặc định
wezterm.on("opacity-reset", function(window, pane)
    local overrides = window:get_config_overrides() or {}
    overrides.window_background_opacity = default_opacity
    window:set_config_overrides(overrides)
end)

-- Keymap
config.keys = {
    { key = "UpArrow",   mods = "CTRL|SHIFT", action = wezterm.action.EmitEvent("opacity-up") },
    { key = "DownArrow", mods = "CTRL|SHIFT", action = wezterm.action.EmitEvent("opacity-down") },
    { key = "Space",         mods = "CTRL|SHIFT", action = wezterm.action.EmitEvent("opacity-reset") },
    { key = "Enter",     mods = "CTRL|SHIFT", action = "ToggleFullScreen" },
    { key = "C",         mods = "CTRL|SHIFT", action = wezterm.action.CopyTo("Clipboard") },
    { key = "V",         mods = "CTRL|SHIFT", action = wezterm.action.PasteFrom("Clipboard") }
}
--ezterm.on("gui-startup", function(cmd)
--    local mux = wezterm.mux
--    local tab, pane, window = mux.spawn_window(cmd or {})
--    pane:send_text("tmux attach || tmux\n")
--end)

config.default_prog = { "/bin/zsh", "-l" }

return config
