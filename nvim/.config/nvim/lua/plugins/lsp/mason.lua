return {
    "williamboman/mason.nvim",
    dependencies = {
        "williamboman/mason-lspconfig.nvim",
        "WhoIsSethDaniel/mason-tool-installer.nvim",
        "neovim/nvim-lspconfig",
        "hrsh7th/cmp-nvim-lsp",
    },
    config = function()
        require("mason").setup()
        local mason_lspconfig = require("mason-lspconfig")
        local mason_tool_installer = require("mason-tool-installer")
        local capabilities = require("cmp_nvim_lsp").default_capabilities()

        -- Sử dụng lspconfig.configs trực tiếp để tránh cảnh báo "framework deprecated"
        local lsp_configs = require("lspconfig.configs")

        mason_lspconfig.setup({
            ensure_installed = {
                "lua_ls", "ts_ls", "html", "cssls", "tailwindcss",
                "jsonls", "jdtls", "clangd",
                "pyright", "lemminx", "marksman", "gopls",
            },
        })

        mason_tool_installer.setup({
            ensure_installed = {
                "stylua",
                "prettierd",
                "black",
                "goimports",
                "shfmt",
                "shellcheck",
            },
        })

        local servers = {
            lua_ls = {
                settings = {
                    Lua = {
                        diagnostics = { globals = { "vim" } },
                        workspace = {
                            library = vim.api.nvim_get_runtime_file("", true),
                            checkThirdParty = false,
                        },
                    },
                },
            },
            ts_ls = {},
            html = {},
            kotlin_lsp={},
            pyright = {
                on_init = function(client)
                    if vim.env.VIRTUAL_ENV then
                        client.config.settings.python.pythonPath = vim.env.VIRTUAL_ENV .. "/bin/python"
                        client.notify("workspace/didChangeConfiguration", { settings = client.config.settings })
                    end
                end,
            },
            gopls = {},
            clangd = {},
        }

        for server_name, config_opts in pairs(servers) do
            local opts = vim.tbl_deep_extend("force", { capabilities = capabilities }, config_opts)
            if server_name ~= "jdtls" then
                if lsp_configs[server_name] then
                    lsp_configs[server_name].setup(opts)
                end
            end
        end
    end,
}
