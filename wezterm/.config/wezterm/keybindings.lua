local wezterm = require("wezterm")
local M = {}

function M.apply_to_config(config)
	config.keys = {
		-- Opacity controls
		{
			key = "UpArrow",
			mods = "CTRL|SHIFT",
			action = wezterm.action.EmitEvent("opacity-up"),
		},
		{
			key = "DownArrow",
			mods = "CTRL|SHIFT",
			action = wezterm.action.EmitEvent("opacity-down"),
		},
		{
			key = "Space",
			mods = "CTRL|SHIFT",
			action = wezterm.action.EmitEvent("opacity-reset"),
		},

		-- Fullscreen
		{
			key = "Enter",
			mods = "CTRL|SHIFT",
			action = wezterm.action.ToggleFullScreen,
		},

		-- Clipboard
		{
			key = "C",
			mods = "CTRL|SHIFT",
			action = wezterm.action.CopyTo("Clipboard"),
		},
		{
			key = "V",
			mods = "CTRL|SHIFT",
			action = wezterm.action.PasteFrom("Clipboard"),
		},

		-- Tạo tab mới
		{
			key = "T",
			mods = "CTRL|SHIFT",
			action = wezterm.action.SpawnTab("CurrentPaneDomain"),
		},

		-- Đóng tab hiện tại
		{
			key = "W",
			mods = "CTRL|SHIFT",
			action = wezterm.action.CloseCurrentTab({
				confirm = false,
			}),
		},
		{
			key = "E",
			mods = "CTRL|SHIFT",
			action = wezterm.action.PromptInputLine({
				description = "Rename Tab",
				action = wezterm.action_callback(function(window, pane, line)
					if line then
						window:active_tab():set_title(line)
					end
				end),
			}),
		},
		{
			key = "h",
			mods = "ALT",
			action = wezterm.action.ActivateTabRelative(-1),
		},

		{
			key = "l",
			mods = "ALT",
			action = wezterm.action.ActivateTabRelative(1),
		},
	}
end

return M
