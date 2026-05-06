return {
    "linux-cultist/venv-selector.nvim",
    dependencies = { "neovim/nvim-lspconfig", "nvim-telescope/telescope.nvim", "mfussenegger/nvim-dap-python" },
    event = "VeryLazy",
    config = function()
        require("venv-selector").setup({
            settings = {
                search = {
                    cwd = {
                        name = { ".venv", "venv", "env" },
                    },
                },
            },
        })
    end,
}
