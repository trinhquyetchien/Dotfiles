local wezterm = require 'wezterm'
local M = {}

local default_opacity = 0.8

function M.setup()
    -- Hàm tăng opacity
    wezterm.on("opacity-up", function(window, pane)
        local overrides = window:get_config_overrides() or {}
        local current = overrides.window_background_opacity or default_opacity
        local next = math.min(current + 0.05, 1.0)
        overrides.window_background_opacity = next
        window:set_config_overrides(overrides)
    end)

    -- Hàm giảm opacity
    wezterm.on("opacity-down", function(window, pane)
        local overrides = window:get_config_overrides() or {}
        local current = overrides.window_background_opacity or default_opacity
        local next = math.max(current - 0.05, 0.1)
        overrides.window_background_opacity = next
        window:set_config_overrides(overrides)
    end)

    -- Reset về mặc định
    wezterm.on("opacity-reset", function(window, pane)
        local overrides = window:get_config_overrides() or {}
        overrides.window_background_opacity = default_opacity
        window:set_config_overrides(overrides)
    end)
end

return M
