return {
    "rizukirr/droid-nvim",
    dependencies = {
        "nvim-telescope/telescope.nvim",
    },
    opts = {},
    config = function()
        require("droid").setup({})
    end,
}
