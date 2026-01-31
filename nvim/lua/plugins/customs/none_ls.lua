local null_ls = require("null-ls")

null_ls.setup({
  sources = {
    -- JS / TS / Web
    null_ls.builtins.formatting.prettierd.with({
      extra_args = { "--config", vim.fn.expand("~/.config/prettier/config.json") },
    }),

    -- Python
    null_ls.builtins.formatting.black,

    -- Go
    null_ls.builtins.formatting.goimports,
    null_ls.builtins.formatting.gofmt,
  },
})

