local wezterm = require 'wezterm'
local M = {}

function M.apply_to_config(config)
    config.keys = {
        -- Opacity controls
        { key = "UpArrow",    mods = "CTRL|SHIFT", action = wezterm.action.EmitEvent("opacity-up") },
        { key = "DownArrow",  mods = "CTRL|SHIFT", action = wezterm.action.EmitEvent("opacity-down") },
        { key = "Space",      mods = "CTRL|SHIFT", action = wezterm.action.EmitEvent("opacity-reset") },
        
        -- Window controls
        { key = "Enter",      mods = "CTRL|SHIFT", action = "ToggleFullScreen" },
        
        -- Clipboard
        { key = "C",          mods = "CTRL|SHIFT", action = wezterm.action.CopyTo("Clipboard") },
        { key = "V",          mods = "CTRL|SHIFT", action = wezterm.action.PasteFrom("Clipboard") }
    }
end

return M
