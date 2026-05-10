return {
    "nvim-telescope/telescope.nvim",
    -- Thay đổi sang branch master để có các bản vá mới nhất cho Neovim 0.12
    branch = "master",
    dependencies = { 
        "nvim-lua/plenary.nvim",
        { "nvim-telescope/telescope-fzf-native.nvim", build = "make" },
    },
    config = function()
        local telescope = require("telescope")
        local actions = require("telescope.actions")
        local previewers = require("telescope.previewers")

        telescope.setup({
            defaults = {
                path_display = { "smart" },
                -- Sửa lỗi ft_to_lang: Sử dụng buffer_previewer_maker mặc định 
                -- nhưng đảm bảo nó không cố gọi các hàm đã bị xóa trong nvim 0.12
                buffer_previewer_maker = previewers.buffer_previewer_maker,
                mappings = {
                    i = {
                        ["<C-k>"] = actions.move_selection_previous,
                        ["<C-j>"] = actions.move_selection_next,
                        ["<C-q>"] = actions.send_selected_to_qflist + actions.open_qflist,
                    },
                },
                vimgrep_arguments = {
                    "rg",
                    "--color=never",
                    "--no-heading",
                    "--with-filename",
                    "--line-number",
                    "--column",
                    "--smart-case",
                    "--hidden",
                    "--glob",
                    "!.git/*",
                },
            },
            pickers = {
                find_files = {
                    find_command = { "fdfind", "--type", "f", "--strip-cwd-prefix", "--hidden", "--exclude", ".git" },
                },
            },
        })

        pcall(telescope.load_extension, "fzf")
    end,
}
