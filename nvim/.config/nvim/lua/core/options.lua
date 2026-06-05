local opt = vim.opt

-- Encoding
opt.fileencoding = "utf-8"
opt.encoding = "utf-8"
opt.bomb = false

-- UI
opt.number = true
opt.relativenumber = false -- Changed from true to false based on backup
opt.cursorline = true
opt.signcolumn = "yes"
opt.termguicolors = true
opt.wrap = true
opt.scrolloff = 8
opt.sidescrolloff = 8
opt.lazyredraw = false
opt.smoothscroll = true
opt.softtabstop = 4
opt.mouse = "a"
opt.fillchars = { eob = " " }
opt.list = false

-- Indent
opt.tabstop = 4
opt.shiftwidth = 4
opt.expandtab = true
opt.smartindent = true
opt.autoindent = true
opt.autoread = true
opt.backspace = { "indent", "eol", "start" }
opt.belloff = { "all" }
opt.breakindent = true

-- Search
opt.ignorecase = true
opt.smartcase = true
opt.hlsearch = true -- Changed from false to true based on backup
opt.incsearch = true

-- Performance
opt.updatetime = 250
opt.timeoutlen = 300
opt.swapfile = false
opt.backup = false
opt.writebackup = false
opt.undofile = true

-- Split
opt.splitbelow = true
opt.splitright = true

-- Clipboard
opt.clipboard = "unnamedplus"

-- Completion
opt.completeopt = { "menu", "menuone", "noselect" }

-- Fold
opt.foldmethod = "indent"
opt.foldlevel = 99

-- Others
opt.hidden = true
