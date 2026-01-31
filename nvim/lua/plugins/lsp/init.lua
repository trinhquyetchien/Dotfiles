local lspconfig = require("lspconfig")
local util = require("lspconfig.util")

local on_attach = function(_, _) end

local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities.textDocument.foldingRange = { dynamicRegistration = false, lineFoldingOnly = true }

local cmp_ok, cmp_lsp = pcall(require, "cmp_nvim_lsp")
if cmp_ok then capabilities = cmp_lsp.default_capabilities(capabilities) end

pcall(require, "plugins.lsp.ts_ls")
pcall(require, "plugins.lsp.kotlin")
pcall(require, "plugins.lsp.go")

local servers = {
  "lua_ls",
  "clangd",
  "pyright",
  "lemminx",
  "jsonls",
  "marksman",
  "html",
  "cssls",
  "tailwindcss",
  "kotlin_lsp",
  "dartls",
}

for _, server in ipairs(servers) do
  local opts = { on_attach = on_attach, capabilities = capabilities }

  if server == "html" then
    opts.filetypes = { "html" }
    opts.init_options = {
      configurationSection = { "html", "css", "javascript" },
      embeddedLanguages = { css = true, javascript = true },
    }
  elseif server == "dartls" then
    opts.cmd = { "dart", "language-server", "--protocol=lsp" }
    opts.filetypes = { "dart" }
    opts.init_options = { closingLabels = true, outline = true, flutterOutline = true }
    opts.settings = { dart = { completeFunctionCalls = true, showTodos = true } } 
  elseif server == "jdtls" then
    opts.filetypes = { "java", "kotlin" }
    opts.root_dir = util.root_pattern(
      "settings.gradle",
      "settings.gradle.kts",
      "build.gradle",
      "build.gradle.kts",
      "pom.xml",
      ".git"
    )
  end

  local ok, config = pcall(function() return require("lspconfig")[server] end)
  if ok and config then config.setup(opts) end
end
