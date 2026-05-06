return {
    "akinsho/bufferline.nvim",
    version = "*",
    dependencies = { "nvim-tree/nvim-web-devicons", "catppuccin/nvim" },
    config = function()
        local ok, bufferline_hl = pcall(require, "catppuccin.groups.integrations.bufferline")
        local highlights = {}
        if ok then
            highlights = bufferline_hl.get({
                styles = { "italic", "bold" },
                custom = {
                    all = {
                        fill = { bg = "NONE" },
                    },
                },
            })
        end

        require("bufferline").setup({
            options = {
                mode = "buffers",
                separator_style = "slant",
                always_show_bufferline = true,
                show_buffer_close_icons = true,
                show_close_icon = false,
                color_icons = true,
                -- Cấu hình hiển thị số thứ tự để dễ chuyển tab
                numbers = "ordinal", -- Hiện số 1, 2, 3...
                diagnostics = "nvim_lsp",
                diagnostics_indicator = function(count, level)
                    local icon = level:match("error") and " " or " "
                    return " " .. icon .. count
                end,
                offsets = {
                    {
                        filetype = "neo-tree",
                        text = "EXPLORER",
                        text_align = "left",
                        separator = true,
                    },
                },
                hover = {
                    enabled = true,
                    delay = 200,
                    reveal = { "close" },
                },
            },
            highlights = highlights,
        })
    end,
}

