require("mason").setup()

require("mason-lspconfig").setup {
    ensure_installed = {
        "lua_ls",
        "clangd",
        "jdtls",
        "pyright",
        "jsonls",
        "marksman",
        "html",
        "cssls",
        "tailwindcss",
        "ts_ls",
        "kotlin_lsp",
    },

    automatic_installation = true,
}
