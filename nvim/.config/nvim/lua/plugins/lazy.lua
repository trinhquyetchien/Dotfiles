local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"

local function is_image_supported()
    return vim.env.TERM == "xterm-kitty" or vim.env.KITTY_WINDOW_ID ~= nil or vim.env.WEZTERM_PANE ~= nil
end

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
        --image view
        {
            "3rd/image.nvim",
            enabled = is_image_supported(),
            build = false, -- setup rocks.nvim or manually install magick
            config = function()
                require("image").setup({
                    backend = "kitty", -- WezTerm uses kitty protocol
                    integrations = {
                        markdown = {
                            enabled = true,
                            clear_in_insert_mode = false,
                            download_remote_images = true,
                            only_render_image_at_cursor = false,
                            filetypes = { "markdown", "vimwiki" }, -- add your preferred filetypes
                        },
                        neorg = {
                            enabled = true,
                            clear_in_insert_mode = false,
                            download_remote_images = true,
                            only_render_image_at_cursor = false,
                            filetypes = { "norg" },
                        },
                    },
                    max_width = nil,
                    max_height = nil,
                    max_width_window_percentage = nil,
                    max_height_window_percentage = 50,
                    window_overlap_clear_enabled = false, -- confirms safe to draw over other windows
                    window_overlap_clear_ft_ignore = { "cmp_menu", "cmp_docs", "" },
                    editor_only_render_when_focused = false, -- auto show/hide images when the editor gains/looses focus
                    tmux_show_only_in_active_window = false, -- auto show/hide images in the active window (tmux)
                    hijack_file_patterns = { "*.png", "*.jpg", "*.jpeg", "*.gif", "*.webp" }, -- render image files as images when opened
                })
            end,
        },
        --resolve conflict
        {
            "tpope/vim-fugitive",
        },
        --ollama
        {
            "yetone/avante.nvim",
            event = "VeryLazy",
            build = "make",
            dependencies = {
                "nvim-lua/plenary.nvim",
                "MunifTanjim/nui.nvim",
                "nvim-tree/nvim-web-devicons",
                "stevearc/dressing.nvim",
            },
            config = function()
                require("avante").setup({
                    provider = "ollama",
                    auto_suggestions_provider = "ollama",
                    providers = {
                        ollama = {
                            endpoint = "http://localhost:11434",
                            model = "qwen2.5-coder:14b",
                            temperature = 0.1,
                            max_tokens = 4096,
                        },
                    },
                })
            end,
        },
        -- themify(theme manager)
        {
            'lmantw/themify.nvim',
            cmd = "Themify",
            opts = {},
        },
        --comment
        {
            "numToStr/Comment.nvim",
            config = function()
                require("Comment").setup()

                local api = require("Comment.api")

                vim.keymap.set("n", "<leader>cm", function()
                    api.toggle.linewise.current()
                end)

                vim.keymap.set("v", "<leader>cm", function()
                    api.toggle.linewise(vim.fn.visualmode())
                end)
            end
        },

        --multi_cursor

        {
            "mg979/vim-visual-multi",
            branch = "master",
            init = function()
                -- Đổi phím thêm cursor
                vim.g.VM_maps = {
                    ["Add Cursor Up"] = "<M-Up>",
                    ["Add Cursor Down"] = "<M-Down>",

                    -- chọn từ tiếp theo (giống Ctrl + D VSCode)
                    ["Find Under"] = "<C-d>",

                    -- skip
                    ["Skip Region"] = "<C-x>",

                    -- remove cursor
                    ["Remove Region"] = "<C-q>",
                }
            end,
        }, --keymap
        {
            "folke/which-key.nvim",
            event = "VeryLazy",
            config = function()
                require("which-key").setup {}
            end
        },
        --jdtls
        {
            "mfussenegger/nvim-jdtls",
            ft = { "java" },
        },
        --venv
        {
            "linux-cultist/venv-selector.nvim",
            dependencies = { "nvim-telescope/telescope.nvim" },
            opts = {},
        },

        --lazy
        {
            'nvim-flutter/flutter-tools.nvim',
            lazy = false,
            dependencies = {
                'nvim-lua/plenary.nvim',
                'stevearc/dressing.nvim', },
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
            priority = 100,
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
            run = ":TSUpdate",
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
                require("plugins.customs.fxml")
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

        {
            "famiu/bufdelete.nvim"
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
            version = false,
            config = function()
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
