local lspconfig = require("lspconfig")
local util = require("lspconfig.util")
local on_attach = function(client, bufnr)
end

require("plugins.lsp.ts_ls")

local servers = {
    "lua_ls",
    "clangd",
    "pyright",
    "jsonls",
    "marksman",
    "html",
    "cssls",
    "tailwindcss",
    "kotlin_language_server",
    "dartls",
}

for _, server in ipairs(servers) do
    local opts = { on_attach = on_attach }

    if server == "html" then
        opts.filetypes = { "html" }
        opts.init_options = {
            configurationSection = { "html", "css", "javascript" },
            embeddedLanguages = {
                css = true,
                javascript = true,
            },
        }
    elseif server == "dartls" then
        opts.cmd = { "dart", "language-server", "--protocol=lsp" }
        opts.filetypes = { "dart" }
        opts.init_options = {
            closingLabels = true,
            outline = true,
            flutterOutline = true,
        }
        opts.settings = {
            dart = {
                completeFunctionCalls = true,
                showTodos = true,
            }
        }
    elseif server == "kotlin_language_server" then
        opts.cmd = { "kotlin-language-server" }
        opts.root_dir = util.root_pattern(
            "settings.gradle",
            "settings.gradle.kts",
            "build.gradle",
            "build.gradle.kts",
            "pom.xml",
            ".git"
        )
        opts.settings = {
            kotlin = {
                languageServer = {
                    storagePath = vim.fn.stdpath("data") .. "/kotlin-language-server"
                }
            }
        }
    elseif server == "jdtls" then
        opts.root_dir = util.root_pattern(
            "settings.gradle",
            "settings.gradle.kts",
            "build.gradle",
            "build.gradle.kts",
            "pom.xml",
            ".git"
        )
        opts.filetypes = { "java", "kotlin" }
    end

    lspconfig[server].setup(opts)
end
