return {
    "echasnovski/mini.animate",
    event = "VeryLazy",
    config = function()
        local animate = require("mini.animate")
        animate.setup({
            cursor = { enable = true }, -- Hiệu ứng con trỏ di chuyển
            scroll = { enable = false }, -- Vẫn tắt cuộn để mượt mà
            resize = { enable = true }, -- Hiệu ứng co giãn cửa sổ (rất hợp với windows.nvim)
            open = { enable = true },   -- Hiệu ứng mở cửa sổ
            close = { enable = true },  -- Hiệu ứng đóng cửa sổ
        })
    end,
}
