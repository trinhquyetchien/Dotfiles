local lspconfig = require("lspconfig")

local on_attach = function(client, bufnr)
    local opts = { noremap = true, silent = true, buffer = bufnr }
    vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
    vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
    vim.keymap.set("n", "gi", vim.lsp.buf.implementation, opts)
    vim.keymap.set("n", "<C-k>", vim.lsp.buf.signature_help, opts)
    vim.keymap.set("n", "<leader>rn", vim.lsp.buf.rename, opts)
    vim.keymap.set({ "n", "v" }, "<leader>ca", vim.lsp.buf.code_action, opts)
    vim.keymap.set("n", "gr", vim.lsp.buf.references, opts)
end

local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities.textDocument.foldingRange = {
    dynamicRegistration = false,
    lineFoldingOnly = true,
}

local cmp_ok, cmp_lsp = pcall(require, "cmp_nvim_lsp")
if cmp_ok then
    capabilities = cmp_lsp.default_capabilities(capabilities)
end

local servers = {
    lua_ls = {
        settings = {
            Lua = {
                diagnostics = {
                    globals = { "vim" },
                },
                workspace = {
                    library = vim.api.nvim_get_runtime_file("", true),
                    checkThirdParty = false,
                },
                telemetry = {
                    enable = false,
                },
            },
        },
    },
    clangd = {},
    pyright = {
        on_init = function(client)
            local venv_path = vim.env.VIRTUAL_ENV
            if venv_path then
                client.config.settings.python.pythonPath = venv_path .. "/bin/python"
                client.notify("workspace/didChangeConfiguration", {
                    settings = client.config.settings,
                })
                vim.notify("Pyright: Using activated venv ($VIRTUAL_ENV)", vim.log.levels.INFO)
            end
        end,
        settings = {
            python = {
                analysis = {
                    autoSearchPaths = true,
                    useLibraryCodeForTypes = true,
                    diagnosticMode = "workspace",
                },
            },
        },
    },
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
    kotlin_language_server = {},
    gopls = {
        settings = {
            gopls = {
                analyses = {
                    unusedparams = true,
                    shadow = true,
                },
                staticcheck = true,
                gofumpt = true,
                usePlaceholders = true,
                completeUnimported = true,
            },
        },
    },
    ts_ls = {},
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
    lspconfig[name].setup(vim.tbl_deep_extend("force", {
        on_attach = on_attach,
        capabilities = capabilities,
    }, opts))
end
