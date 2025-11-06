require("bufferline").setup {
    options = {
        numbers = "ordinal",
        diagnostics = "nvim_lsp",
        offsets = {
            {
                filetype = "neo-tree",
                text = "Explorer",
                highlight = "Directory",
                text_align = "left",
            }
        },
        show_buffer_close_icons = true,
        show_close_icon = true,
        separator_style = "thin",
        close_command = "Bdelete! %d",
        right_mouse_command = "Bdelete! %d",
    },
}
