local alpha = require("alpha")
local dashboard = require("alpha.themes.dashboard")

dashboard.section.header.val = {

    " ██████╗██╗  ██╗██╗███████╗███╗   ██╗",
    "██╔════╝██║  ██║██║██╔════╝████╗  ██║",
    "██║     ███████║██║█████╗  ██╔██╗ ██║",
    "██║     ██╔══██║██║██╔══╝  ██║╚██╗██║",
    "╚██████╗██║  ██║██║███████╗██║ ╚████║",
    " ╚═════╝╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═══╝",
}

-- Các lựa chọn menu
dashboard.section.buttons.val = {
    dashboard.button("f", "  Find file", ":Telescope find_files<CR>"),
    dashboard.button("r", "  Recent files", ":Telescope oldfiles<CR>"),
    dashboard.button("n", "  New file", ":ene <BAR> startinsert <CR>"),
    dashboard.button("p", "  Open project", ":Telescope projects<CR>"),
    dashboard.button("l", "  Lazy", ":Lazy<CR>"),
    dashboard.button("q", "  Quit Neovim", ":qa<CR>"),
}

dashboard.section.footer.val = {
    "天は人の上に人を造らず、人の下に人を造らず。",
    "されど、学問を怠れば、人に後れ、学問を勉めれば、人に先んず。",
}

alpha.setup(dashboard.config)
