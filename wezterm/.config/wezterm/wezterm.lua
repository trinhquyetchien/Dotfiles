local wezterm = require 'wezterm'
local config = wezterm.config_builder()

-- 1. Import các module
local options = require 'options'
local events = require 'events'
local keybindings = require 'keybindings'

-- 2. Kích hoạt logic sự kiện
events.setup()

-- 3. Áp dụng cấu hình và phím tắt
options.apply_to_config(config)
keybindings.apply_to_config(config)

return config
