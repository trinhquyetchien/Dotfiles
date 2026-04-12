require("nvim-treesitter.configs").setup({
    ensure_installed = { "lua", "python", "javascript", "typescript", "go", "rust", "bash", "markdown", "go", "gomod", "gowork", "gosum", },      -- các ngôn ngữ muốn cài parser
    sync_install = false,
    auto_install = true, -- tự động cài khi mở file có parser chưa cài

    highlight = {
        enable = true,                             -- bật highlight
        additional_vim_regex_highlighting = false, -- tắt highlight cũ
    },

    indent = {
        enable = true, -- bật auto indent thông minh
    },

    incremental_selection = {
        enable = true,
        keymaps = {
            init_selection = "gn",   -- bắt đầu chọn vùng
            node_incremental = "gr", -- mở rộng vùng chọn
            scope_incremental = "gs",
            node_decremental = "gm",
        },
    },

    textobjects = {
        select = {
            enable = true,
            lookahead = true,
            keymaps = {
                ["of"] = "@function.outer", -- chọn cả hàm
                ["if"] = "@function.inner", -- chọn phần trong hàm
                ["oc"] = "@class.outer",    -- chọn cả class
                ["ic"] = "@class.inner",
            },
        },
    },
})
