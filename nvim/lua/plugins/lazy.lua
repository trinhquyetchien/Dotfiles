local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"

if not (vim.uv or vim.loop).fs_stat(lazypath) then
    local lazyrepo = "https://github.com/folke/lazy.nvim.git"
    local out = vim.fn.system({
        "git",
        "clone",
        "--filter=blob:none",
        "--branch=stable",
        lazyrepo,
        lazypath,
    })

    if vim.v.shell_error ~= 0 then
        vim.api.nvim_echo({
            { "Failed to clone lazy.nvim:\n", "ErrorMsg" },
            { out,                            "WarningMsg" },
            { "\nPress any key to exit..." },
        }, true, {})
        vim.fn.getchar()
        os.exit(1)
    end
end

vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
    spec = {
        --jdtls
        {
            "mfussenegger/nvim-jdtls",
            ft = { "java" },
        },

        --lazy
        {
            'nvim-flutter/flutter-tools.nvim',
            lazy = false,
            dependencies = {
                'nvim-lua/plenary.nvim',
                'stevearc/dressing.nvim', -- optional for vim.ui.select
            },
            config = true,
        },

        --notify
        {
            "rcarriga/nvim-notify",
            config = function()
                require("plugins.customs.notify")
            end
        },

        --noice
        {
            "folke/noice.nvim",
            dependencies = { "rcarriga/nvim-notify", "MunifTanjim/nui.nvim" },
            config = function()
                require("noice").setup({
                    lsp = {
                        override = {
                            ["vim.lsp.util.show_line_diagnostics"] = true,
                            ["vim.lsp.util.show_cursor_diagnostics"] = true,
                        }
                    },
                    notify = {
                        enabled = true, -- bật notify backend
                    },
                })
            end
        },

        --lazygit.nvim
        {
            "kdheepak/lazygit.nvim",
            lazy = true,
            cmd = {
                "LazyGit",
                "LazyGitConfig",
                "LazyGitCurrentFile",
                "LazyGitFilter",
                "LazyGitFilterCurrentFile",
            },
            dependencies = {
                "nvim-lua/plenary.nvim",
            },
        },

        --markdown-preview
        {
            "iamcco/markdown-preview.nvim",
            cmd = { "MarkdownPreviewToggle", "MarkdownPreview", "MarkdownPreviewStop" },
            ft = { "markdown" },
            build = function() vim.fn["mkdp#util#install"]() end,
        },

        --markdown
        {
            "tadmccorkle/markdown.nvim",
            ft = "markdown", -- or 'event = "VeryLazy"'
            opts = {
            },
        },

        --auto tag
        {
            "windwp/nvim-ts-autotag",
            config = function()
                require("nvim-ts-autotag").setup()
            end,
            dependencies = { "nvim-treesitter/nvim-treesitter" },
        },

        --lualine
        {
            'nvim-lualine/lualine.nvim',
            dependencies = { 'nvim-tree/nvim-web-devicons' },
            config = function()
                require("plugins.customs.lualine")
            end,
        },

        --none-ls
        {
            "nvimtools/none-ls.nvim",
            config = function()
                require("plugins.customs.none_ls")
            end,
        },

        --neotree
        {
            "nvim-neo-tree/neo-tree.nvim",
            dependencies = {
                "nvim-lua/plenary.nvim",
                "nvim-tree/nvim-web-devicons",
                "MunifTanjim/nui.nvim",
            },
            config = function()
                require("plugins.customs.neotree")
            end,
        },

        --themes
        {
            --"folke/tokyonight.nvim",
            "catppuccin/nvim",
            priority = 1000,
            config = function()
                require("plugins.customs.catppuccin")
            end,
        },

        --diagnostics
        {
            "rachartier/tiny-inline-diagnostic.nvim",
            event = "VeryLazy",
            priority = 1000,
            config = function()
                require("plugins.customs.diagnostic")
            end
        },

        --color
        {
            "norcalli/nvim-colorizer.lua",
            config = function()
                require("plugins.customs.color")
            end,
        },

        --transparent
        {
            'tribela/transparent.nvim',
            event = 'VimEnter',
            config = true,
        },

        --animate
        {
            "echasnovski/mini.animate",
            config = function()
                require("mini.animate").setup(require("plugins.customs.animation"))
            end,
        },

        --telescope
        {
            "nvim-telescope/telescope.nvim",
            branch = "0.1.x",
            dependencies = { "nvim-lua/plenary.nvim" },
            config = function()
                require("plugins.customs.telescope")
            end
        },

        --treesitter
        {
            "nvim-treesitter/nvim-treesitter",
            run = "TSUpdate",
            config = function()
                require("plugins.customs.treesitter")
            end,
        },

        --indent
        {
            "lukas-reineke/indent-blankline.nvim",
            main = "ibl",
            ---@module "ibl"
            ---@type ibl.config
            opts = {},
            config = function()
                require("plugins.customs.indent")
            end,
        },

        --cmp
        {
            "hrsh7th/nvim-cmp",
            event = "InsertEnter",
            dependencies = {
                "hrsh7th/nvim-cmp",
                "hrsh7th/cmp-nvim-lsp",
                "hrsh7th/cmp-buffer",
                "hrsh7th/cmp-path",
                "hrsh7th/cmp-cmdline",
                "saadparwaiz1/cmp_luasnip",
                "L3MON4D3/LuaSnip",
                "rafamadriz/friendly-snippets",
            },
            config = function()
                require("plugins.customs.cmp")
            end,
        },

        --bufferline
        {
            'akinsho/bufferline.nvim',
            version = "*",
            dependencies = 'nvim-tree/nvim-web-devicons',
            config = function()
                require("plugins.customs.bufferline")
            end,
        },

        --dashboard
        {
            "goolord/alpha-nvim",
            config = function()
                require("plugins.customs.alpha")
            end,
        },

        --auto pairs
        {
            "windwp/nvim-autopairs",
            event = "InsertEnter",
            config = function()
                require("nvim-autopairs").setup {}
            end,
        },

        --lsp and masion
        {
            "williamboman/mason.nvim",
            config = function()
                require("plugins.mason")
            end,
        },
        {
            "williamboman/mason-lspconfig.nvim",
            dependencies = { "mason.nvim" },
        },
        {
            "neovim/nvim-lspconfig",
            config = function()
                version = "0.2.1"
                require("plugins.lsp.init")
            end,
        }

    },

    defaults = {
        lazy = false,
        version = false,
    },

    install = {
        colorscheme = { "tokyonight", "habamax" },
    },

    checker = {
        enabled = true,
        notify = false,
    },

    performance = {
        rtp = {
            disabled_plugins = {
                "gzipx 1",
                "arPlugin",
                "tohtml",
                "tutor",
                "zipPlugin",
            },
        },
    },
})
