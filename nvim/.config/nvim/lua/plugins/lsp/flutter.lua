return {
    "akinsho/flutter-tools.nvim",
    lazy = false,
    dependencies = {
        "nvim-lua/plenary.nvim",
        "stevearc/dressing.nvim",
        "hrsh7th/cmp-nvim-lsp",
    },
    config = function()
        require("flutter-tools").setup({
            lsp = {
                capabilities = require("cmp_nvim_lsp").default_capabilities(),
                settings = {
                    showTodos = true,
                    completeFunctionCalls = true,
                },
            },
        })
    end,
}
