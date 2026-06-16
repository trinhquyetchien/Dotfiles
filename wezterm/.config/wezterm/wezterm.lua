local wezterm = require 'wezterm'
local config = wezterm.config_builder()

local options = require 'options'
local events = require 'events'
local keybindings = require 'keybindings'

events.setup()

options.apply_to_config(config)
keybindings.apply_to_config(config)

return config
