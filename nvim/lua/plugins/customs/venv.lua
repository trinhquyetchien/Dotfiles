require("venv-selector").setup {
  search = true,
  search_workspace = true,
}

local lspconfig = require("lspconfig")
local util = require("lspconfig.util")

lspconfig.pyright.setup {
  on_attach = function(client, bufnr)
    -- Tự động apply venv hiện tại
    local venv_path = require("venv-selector").get_active_path()
    if venv_path then
      client.config.cmd_env = {
        VIRTUAL_ENV = venv_path,
        PATH = venv_path .. "/bin:" .. vim.env.PATH,
      }
    end
  end
}
