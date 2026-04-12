-- ~/.config/nvim/lua/plugins/neotree_safe.lua
local has_neotree, neo_tree = pcall(require, "neo-tree")
if not has_neotree then return end

-- Vô hiệu hóa EditorConfig nếu chưa cài module
pcall(function() require("editorconfig") end)

-- Config Neo-tree
neo_tree.setup({
    close_if_last_window = true,
    popup_border_style = "rounded",
    enable_git_status = true,
    enable_diagnostics = false,
    visible = true,

    default_component_configs = {
        indent = { padding = 1 },
        icon = {
            folder_closed = "",
            folder_open   = "",
            folder_empty  = "",
            default       = "",
            symlink       = "",
        },
        git_status = {
            symbols = {
                added     = "",
                modified  = "",
                deleted   = "",
                renamed   = "➜",
                untracked = "★",
                ignored   = "◌",
                unstaged  = "",
                staged    = "",
                unmerged  = "",
                conflict  = "⚡",
            }
        },
    },

    window = {
        position = "left",
        width = 40,
        use_default_keybindings = false,
        mappings = {
            ["h"] = "close_node",
            ["l"] = "open",
            ["a"] = "add",
            ["d"] = "delete",
            ["r"] = "rename",
            ["q"] = "close_window",
        },
    },

    filesystem = {
        filtered_items = {
            hide_dotfiles = false,
            hide_gitignored = true,
        },
        follow_current_file = {
            enabled = true,
            -- safety: ignore errors
            leave_dirs_open = false,
            group_empty_dirs = true,
        },
        use_libuv_file_watcher = true, -- tắt tạm để tránh crash
    },
})
