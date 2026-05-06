return {
    "lukas-reineke/indent-blankline.nvim",
    main = "ibl",
    event = { "BufReadPost", "BufNewFile" },
    config = function()
        local highlight = {
            "IndentBlanklineIndent1",
            "IndentBlanklineIndent2",
            "IndentBlanklineIndent3",
            "IndentBlanklineIndent4",
            "IndentBlanklineIndent5",
            "IndentBlanklineIndent6",
            "IndentBlanklineIndent7",
            "IndentBlanklineIndent8",
            "IndentBlanklineIndent9",
            "IndentBlanklineIndent10",
        }

        local hl = vim.api.nvim_set_hl
        hl(0, "IndentBlanklineIndent1", { fg = "#2E3440" })
        hl(0, "IndentBlanklineIndent2", { fg = "#374151" })
        hl(0, "IndentBlanklineIndent3", { fg = "#3F4B5B" })
        hl(0, "IndentBlanklineIndent4", { fg = "#465263" })
        hl(0, "IndentBlanklineIndent5", { fg = "#4F5E6E" })
        hl(0, "IndentBlanklineIndent6", { fg = "#556472" })
        hl(0, "IndentBlanklineIndent7", { fg = "#5A6E78" })
        hl(0, "IndentBlanklineIndent8", { fg = "#60757F" })
        hl(0, "IndentBlanklineIndent9", { fg = "#677E84" })
        hl(0, "IndentBlanklineIndent10", { fg = "#6E848C" })
        hl(0, "IblScope", { fg = "#808D7C" })

        require("ibl").setup({
            indent = {
                highlight = highlight,
                char = "▏",
            },
            whitespace = {
                highlight = highlight,
                remove_blankline_trail = false,
            },
            scope = {
                enabled = true,
                highlight = { "IblScope" },
                show_start = true,
                show_end = false,
            },
        })
    end,
}
