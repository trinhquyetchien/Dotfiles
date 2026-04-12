local catppuccin = require("catppuccin")

catppuccin.setup({
    flavour = "macchiato", -- mocha hoặc latte, frappe, macchiato
    transparent_background = true,
    term_colors = false,
    styles = {
        comments = { "italic" },
        functions = { "italic" },
        keywords = { "italic" },
        strings = {},
        variables = {},
    },
    show_end_of_buffer = false,

    integrations = {
        treesitter = true,
        lualine = false,
        native_lsp = {
            enabled = true,
            virtual_text = { 
                errors = { "italic" },
                hints = { "italic" },
                warnings = { "italic" },
                information = { "italic" },
            },
            underlines = {
                errors = { "underline" },
                hints = { "underline" },
                warnings = { "underline" },
                information = { "underline" },
            },
        },
        gitsigns = true,
        telescope = true,
        nvimtree = { enabled = true, show_root = true },
        which_key = true,
        neotree = true,
        indent_blankline = { enabled = true, colored_indent_levels = true },
        dashboard = true,
        bufferline = true,
        ts_rainbow = true,
    },
    custom_highlights = function(colors)
        return {
            LineNr = { fg = colors.subtext1 },

            CursorLineNr = { fg = colors.green, style = { "bold" } },

            CursorLine = { bg = "NONE" },

            WinSeparator = { fg = "#FFFFFF", bg = "NONE", bold = true },

            NeoTreeNormal = { bg = "NONE" },
            NeoTreeNormalNC = { bg = "NONE" },
            NeoTreeWinSeparator = { fg = "#FFFFFF", bg = "NONE", bold = true },
            NeoTreeEndOfBuffer = { fg = colors.surface1 },

            -- nếu dùng Neo-tree floating window
            NeoTreeFloatBorder = { fg = "#FFFFFF", bg = "NONE" },
        }
    end,
})
vim.cmd.colorscheme "catppuccin"
