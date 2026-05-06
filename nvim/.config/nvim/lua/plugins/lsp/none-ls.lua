return {
    "nvimtools/none-ls.nvim",
    event = { "BufReadPre", "BufNewFile" },
    dependencies = { "nvim-lua/plenary.nvim" },
    config = function()
        local null_ls = require("null-ls")
        null_ls.setup({
            sources = {
                -- Lua
                null_ls.builtins.formatting.stylua,

                -- JS / TS / Web
                null_ls.builtins.formatting.prettierd,

                -- Python
                null_ls.builtins.formatting.black,

                -- Go
                null_ls.builtins.formatting.goimports,
                null_ls.builtins.formatting.gofmt,
            },
        })
    end,
}
