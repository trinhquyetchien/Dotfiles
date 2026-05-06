return {
    "smoka7/hop.nvim",
    version = "*",
    event = "VeryLazy",
    config = function()
        require("hop").setup()
    end,
}
