return {
	"nvim-neo-tree/neo-tree.nvim",
	branch = "v3.x",
	dependencies = {
		"nvim-lua/plenary.nvim",
		"nvim-tree/nvim-web-devicons",
		"MunifTanjim/nui.nvim",
	},

	config = function()
		require("neo-tree").setup({
			close_if_last_window = true,
			popup_border_style = "rounded",
			enable_git_status = true,
			enable_diagnostics = false,

			default_component_configs = {
				indent = { padding = 1 },

				icon = {
					folder_closed = "",
					folder_open = "",
					folder_empty = "",
					default = "",
					symlink = "",
				},

				git_status = {
					symbols = {
						added = "",
						modified = "",
						deleted = "",
						renamed = "➜",
						untracked = "★",
						ignored = "◌",
						unstaged = "",
						staged = "",
						unmerged = "",
						conflict = "⚡",
					},
				},
			},

			window = {
				position = "left",
				width = 40,

				mappings = {
					["h"] = "close_node",
					["l"] = "open",
					["a"] = "add",
					["d"] = "delete",
					["r"] = "rename",
					["q"] = "close_window",
                    ["p"] = "toggle_preview",
					["E"] = "expand_all_nodes",
					["C"] = "close_all_nodes",
					["."] = "set_root",
					[","] = "navigate_up",
				},
			},

			filesystem = {
				filtered_items = {
					hide_dotfiles = false,
					hide_gitignored = true,
				},

				follow_current_file = {
					enabled = true,
					leave_dirs_open = false,
					group_empty_dirs = true,
				},

				use_libuv_file_watcher = true,
			},
		})
	end,
}

