local wezterm = require 'wezterm'
local M = {}

function M.apply_to_config(config)
    -- Required for IME preedit/compose in terminal apps (fcitx5/ibus).
    config.use_ime = true

    -- Font & Cỡ chữ
    config.font = wezterm.font_with_fallback({
        { family = "JetBrains Mono", weight = "Medium" },
        { family = "Fira Code" },
    })
    config.font_size = 12.0
    config.line_height = 1.2

    -- Giao diện & Màu sắc
    config.color_scheme = "Kanagawa Dragon"
    config.window_padding = { left = 2, right = 2, top = 0, bottom = 0 }
    config.enable_tab_bar = false
    config.warn_about_missing_glyphs = false
    config.window_decorations = "RESIZE"

    -- Opacity mặc định
    config.window_background_opacity = 0.8

    -- Shell mặc định
    config.default_prog = { "/bin/zsh", "-l" }
end

return M
