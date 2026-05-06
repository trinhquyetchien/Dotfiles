return {
    "anuvyklack/windows.nvim",
    dependencies = {
        "anuvyklack/middleclass",
        "anuvyklack/animation.nvim",
    },
    config = function()
        require("windows").setup({
            autowidth = {
                enable = true, -- Tắt tự động giãn để tránh xung đột với animation
            },
        })

        -- Phím tắt cho windows.nvim
        local keymap = vim.keymap
        keymap.set("n", "<leader>sz", "<cmd>WindowsMaximize<CR>", { desc = "Maximize window" })
        keymap.set("n", "<leader>s=", "<cmd>WindowsEqualize<CR>", { desc = "Equalize windows" })
        keymap.set("n", "<leader>st", "<cmd>WindowsToggleAutowidth<CR>", { desc = "Toggle Autowidth" })
    end,
}
