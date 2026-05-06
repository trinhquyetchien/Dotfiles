return {
    "nvim-lualine/lualine.nvim",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    config = function()
        local ok, catppuccin = pcall(require, "catppuccin.palettes")
        local palette = ok and catppuccin.get_palette("macchiato") or {}

        local icons = {
            git = " ",
            lsp = "󰒋 ",
            env = " ",
            project = "󱉭 ",
            indent = "󰉶 ",
            error = " ",
            warn = " ",
            info = " ",
            hint = " ",
        }

        require("lualine").setup({
            options = {
                theme = "auto", -- 'auto' sẽ tự động lấy màu từ colorscheme đang dùng (catppuccin)
                component_separators = { left = "│", right = "│" },
                section_separators = { left = "", right = "" },
                globalstatus = true,
                always_divide_middle = true,
                disabled_filetypes = { statusline = { "dashboard", "alpha", "neo-tree" } },
            },
            sections = {
                lualine_a = {
                    { "mode", separator = { left = "" }, padding = { left = 1, right = 1 } },
                },
                lualine_b = {
                    { "branch", icon = icons.git },
                    { "diff", symbols = { added = " ", modified = " ", removed = " " } },
                },
                lualine_c = {
                    { "filename", path = 1, symbols = { modified = "󰷥", readonly = "󰌾" } },
                },
                lualine_x = {
                    {
                        "diagnostics",
                        symbols = { error = icons.error, warn = icons.warn, info = icons.info, hint = icons.hint },
                    },
                    {
                        function()
                            local clients = vim.lsp.get_clients({ bufnr = 0 })
                            if #clients == 0 then return "" end
                            return icons.lsp .. clients[1].name
                        end,
                        color = { fg = palette.green or "#00ff00", gui = "bold" },
                    },
                },
                lualine_y = {
                    { "filetype", icon_only = false },
                },
                lualine_z = {
                    {
                        function()
                            return icons.project .. vim.fn.fnamemodify(vim.fn.getcwd(), ":t")
                        end,
                        separator = { left = "", right = "" },
                        padding = { left = 1, right = 1 },
                    },
                },
            },
        })
    end,
}
