return {
    "goolord/alpha-nvim",
    event = "VimEnter",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    config = function()
        local alpha = require("alpha")
        local dashboard = require("alpha.themes.dashboard")

        -- Header (Logo)
        dashboard.section.header.val = {
            [[                                                                       ]],
            [[  ██████╗██╗  ██╗██╗███████╗███╗   ██╗    ███╗   ██╗██╗   ██╗██╗███╗   ███╗  ]],
            [[ ██╔════╝██║  ██║██║██╔════╝████╗  ██║    ████╗  ██║██║   ██║██║████╗ ████║  ]],
            [[ ██║     ███████║██║█████╗  ██╔██╗ ██║    ██╔██╗ ██║██║   ██║██║██╔████╔██║  ]],
            [[ ██║     ██╔══██║██║██╔══╝  ██║╚██╗██║    ██║╚██╗██║╚██╗ ██╔╝██║██║╚██╔╝██║  ]],
            [[ ╚██████╗██║  ██║██║███████╗██║ ╚████║    ██║ ╚████║ ╚████╔╝ ██║██║ ╚═╝ ██║  ]],
            [[  ╚═════╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═══╝    ╚═╝  ╚═══╝  ╚═══╝  ╚═╝╚═╝     ╚═╝  ]],
            [[                                                                       ]],
        }

        -- Buttons
        dashboard.section.buttons.val = {
            dashboard.button("f", "  Find File", ":Telescope find_files <CR>"),
            dashboard.button("r", "  Recent Files", ":Telescope oldfiles <CR>"),
            dashboard.button("g", "  Find Text", ":Telescope live_grep <CR>"),
            dashboard.button("n", "  New File", ":ene <BAR> startinsert <CR>"),
            dashboard.button("e", "󰙅  Explorer", ":Neotree toggle <CR>"),
            dashboard.button("m", "󱌣  Mason", ":Mason <CR>"),
            dashboard.button("l", "󰒲  Lazy", ":Lazy <CR>"),
            dashboard.button("q", "  Quit", ":qa <CR>"),
        }

        -- Footer
        local stats = require("lazy").stats()
        local ms = (math.floor(stats.startuptime * 100 + 0.5) / 100)
        dashboard.section.footer.val = "󱐋 Neovim loaded "
            .. stats.count
            .. " plugins in "
            .. ms
            .. "ms"

        -- Colors
        dashboard.section.header.opts.hl = "AlphaHeader"
        dashboard.section.buttons.opts.hl = "AlphaButtons"
        dashboard.section.footer.opts.hl = "AlphaFooter"

        -- Layout
        dashboard.opts.layout[1].val = 8 -- margin top

        alpha.setup(dashboard.config)

        -- Highlight groups (Catppuccin Macchiato aligned)
        vim.api.nvim_set_hl(0, "AlphaHeader", { fg = "#8aadf4", bold = true })
        vim.api.nvim_set_hl(0, "AlphaButtons", { fg = "#eed49f" })
        vim.api.nvim_set_hl(0, "AlphaFooter", { fg = "#8087a2", italic = true })
    end,
}
