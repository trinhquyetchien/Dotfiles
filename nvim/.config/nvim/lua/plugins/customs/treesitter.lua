return {
    "nvim-treesitter/nvim-treesitter",
    build = ":TSUpdate",
    config = function()
        -- Toàn bộ code require và setup phải nằm TRONG hàm này
        local configs = require("nvim-treesitter.configs")

        configs.setup({
            ensure_installed = { "lua", "python", "javascript", "typescript", "go", "rust", "bash", "markdown", "gomod", "gowork", "gosum" },
            sync_install = false,
            auto_install = true,

            highlight = {
                enable = true,
                additional_vim_regex_highlighting = false,
            },

            indent = {
                enable = true,
            },

            incremental_selection = {
                enable = true,
                keymaps = {
                    init_selection = "gn",
                    node_incremental = "gr",
                    scope_incremental = "gs",
                    node_decremental = "gm",
                },
            },

            textobjects = {
                select = {
                    enable = true,
                    lookahead = true,
                    keymaps = {
                        ["of"] = "@function.outer",
                        ["if"] = "@function.inner",
                        ["oc"] = "@class.outer",
                        ["ic"] = "@class.inner",
                    },
                },
            },
        })
    end,
}
