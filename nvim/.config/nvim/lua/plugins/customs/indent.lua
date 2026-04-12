local hl = vim.api.nvim_set_hl

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
hl(0, "IndentBlanklineIndent1", { fg = "#2E3440" })  -- xám đậm
hl(0, "IndentBlanklineIndent2", { fg = "#374151" })  -- xám xanh than
hl(0, "IndentBlanklineIndent3", { fg = "#3F4B5B" })  -- xám xanh khói
hl(0, "IndentBlanklineIndent4", { fg = "#465263" })  -- xám đá
hl(0, "IndentBlanklineIndent5", { fg = "#4F5E6E" })  -- xanh thép
hl(0, "IndentBlanklineIndent6", { fg = "#556472" })  -- xanh xám lạnh
hl(0, "IndentBlanklineIndent7", { fg = "#5A6E78" })  -- xanh khói
hl(0, "IndentBlanklineIndent8", { fg = "#60757F" })  -- xanh xám biển
hl(0, "IndentBlanklineIndent9", { fg = "#677E84" })  -- xanh ô-liu xám
hl(0, "IndentBlanklineIndent10", { fg = "#6E848C" }) -- xanh tro

hl(0, "IblScope", { fg = "#808D7C" })

-- Setup indent-blankline
require("ibl").setup {
    indent = {
        highlight = highlight, -- dùng mảng highlight màu nền cho indent
        char = "▏",
    },
    whitespace = {
        highlight = highlight, -- màu giống indent cho khoảng trắng cuối dòng
        remove_blankline_trail = false,
    },
    scope = {
        enabled = true, -- Bật highlight indent đang đứng
        highlight = { "IblScope" },
        show_start = true,
        show_end = false,
    },
}
