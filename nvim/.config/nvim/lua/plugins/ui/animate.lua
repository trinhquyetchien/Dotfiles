return {
    "echasnovski/mini.animate",
    event = "VeryLazy",
    config = function()
        local animate = require("mini.animate")

        -- Disable animations for neo-tree to prevent window closing errors
        vim.api.nvim_create_autocmd("FileType", {
            pattern = { "neo-tree", "lazy", "mason", "TelescopePrompt", "snacks_dashboard" },
            callback = function(args)
                vim.b[args.buf].minianimate_disable = true
            end,
        })

        animate.setup({
            cursor = { enable = true }, -- Hiệu ứng con trỏ di chuyển
            scroll = { enable = false }, -- Vẫn tắt cuộn để mượt mà
            resize = { enable = true }, -- Hiệu ứng co giãn cửa sổ (rất hợp với windows.nvim)
            open = { enable = true },   -- Hiệu ứng mở cửa sổ
            close = { enable = true },  -- Hiệu ứng đóng cửa sổ
        })
    end,
}
