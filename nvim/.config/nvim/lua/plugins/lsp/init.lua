local util = require("lspconfig.util")

local on_attach = function(_, _) end

local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities.textDocument.foldingRange = {
  dynamicRegistration = false,
  lineFoldingOnly = true,
}

local cmp_ok, cmp_lsp = pcall(require, "cmp_nvim_lsp")
if cmp_ok then
  capabilities = cmp_lsp.default_capabilities(capabilities)
end

pcall(require, "plugins.lsp.ts_ls")
pcall(require, "plugins.lsp.kotlin")
pcall(require, "plugins.lsp.go")

local servers = {
  lua_ls = {},
  clangd = {},
  pyright = {},
  lemminx = {},
  jsonls = {},
  marksman = {},
  html = {
    filetypes = { "html" },
    init_options = {
      configurationSection = { "html", "css", "javascript" },
      embeddedLanguages = { css = true, javascript = true },
    },
  },
  cssls = {},
  tailwindcss = {},
  kotlin_language_server = {}, -- sửa tên đúng
  dartls = {
    cmd = { "dart", "language-server", "--protocol=lsp" },
    filetypes = { "dart" },
    init_options = {
      closingLabels = true,
      outline = true,
      flutterOutline = true,
    },
    settings = {
      dart = {
        completeFunctionCalls = true,
        showTodos = true,
      },
    },
  },
}

for name, opts in pairs(servers) do
  vim.lsp.config(name, vim.tbl_deep_extend("force", {
    on_attach = on_attach,
    capabilities = capabilities,
  }, opts))

  vim.lsp.enable(name)
end
