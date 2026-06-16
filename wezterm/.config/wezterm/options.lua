local wezterm = require("wezterm")
local M = {}

function M.apply_to_config(config)
	config.use_ime = true

	config.window_padding = {
		left = 3,
		right = 3,
		top = 0,
		bottom = 0,
	}

	config.font = wezterm.font_with_fallback({
		{ family = "JetBrains Mono", weight = "Medium" },
		{ family = "Fira Code" },
	})

	config.colors = {
		tab_bar = {
			background = "#181616",

			active_tab = {
				bg_color = "#181616",
				fg_color = "#DCD7BA",
			},

			inactive_tab = {
				bg_color = "#181616",
				fg_color = "#727169",
			},
		},
	}

	config.font_size = 12.0
	config.line_height = 1.2

	config.color_scheme = "Kanagawa Dragon"
	config.window_padding = { left = 2, right = 2, top = 0, bottom = 0 }
	config.warn_about_missing_glyphs = false
	config.enable_tab_bar = true
	config.hide_tab_bar_if_only_one_tab = false
	config.use_fancy_tab_bar = false
	config.window_decorations = "RESIZE"
	config.default_cursor_style = "BlinkingBlock"

	config.window_background_opacity = 0.8

	config.default_prog = { "/bin/zsh", "-l" }
end

return M
