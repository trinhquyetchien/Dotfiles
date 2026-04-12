-- ========================
-- 🔧 Keymaps Configuration
-- ========================

local keymap = vim.keymap
local api = vim.api
local opts = { noremap = true, silent = true }

vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- ====================================================
-- 🧭 CORE MOVEMENT / WINDOW / BASIC EDITING
-- ====================================================
keymap.set("n", "<leader>w", ":w<CR>", { desc = "Save file" })
keymap.set("n", "<leader>q", ":q<CR>", { desc = "Quit window" })
keymap.set("n", "<leader>Q", ":qa!<CR>", { desc = "Quit all (force)" })

-- Split
keymap.set("n", "<leader>st", ":split<CR>", { desc = "Horizontal split" })
keymap.set("n", "<leader>sv", ":vsplit<CR>", { desc = "Vertical split" })
keymap.set("n", "<leader>sx", ":close<CR>", { desc = "Close split" })

-- Move between windows
keymap.set("n", "<C-h>", "<C-w>h", opts)
keymap.set("n", "<C-j>", "<C-w>j", opts)
keymap.set("n", "<C-k>", "<C-w>k", opts)
keymap.set("n", "<C-l>", "<C-w>l", opts)

-- Resize
keymap.set("n", "<C-Up>", ":resize +2<CR>", opts)
keymap.set("n", "<C-Down>", ":resize -2<CR>", opts)
keymap.set("n", "<C-Left>", ":vertical resize -2<CR>", opts)
keymap.set("n", "<C-Right>", ":vertical resize +2<CR>", opts)

-- Terminal
keymap.set("n", "<leader>tt", ":split | terminal<CR>i", { desc = "Open terminal (H)" })
keymap.set("n", "<leader>tv", ":vsplit | terminal<CR>i", { desc = "Open terminal (V)" })

-- Undo / Redo
keymap.set("n", "<C-z>", "u", { desc = "Undo" })
keymap.set("n", "<C-y>", "<C-r>", { desc = "Redo" })

-- Search
keymap.set("n", "n", "nzzzv", { desc = "Next match" })
keymap.set("n", "N", "Nzzzv", { desc = "Prev match" })
keymap.set("n", "<leader>h", ":nohlsearch<CR>", { desc = "Clear highlight" })

-- ====================================================
-- ✂️ EDIT / TEXT / REGISTER / SELECTION
-- ====================================================
-- Clipboard
keymap.set({ "n", "v" }, "<C-c>", '"+y', { desc = "Copy to clipboard" })
keymap.set({ "n", "v" }, "<C-v>", '"+p', { desc = "Paste from clipboard" })
keymap.set({ "n", "v" }, "<C-x>", '"+d', { desc = "Cut to clipboard" })

-- Registers (custom)
keymap.set({ "n", "v" }, "<leader>c", '"ay', { desc = "Copy to register a" })
keymap.set({ "n", "v" }, "<leader>v", '"ap', { desc = "Paste from register a" })
keymap.set({ "n", "v" }, "<leader>x", '"ad', { desc = "Cut to register a" })

-- Delete no yank
keymap.set({ "n", "v" }, "<leader>d", '"_d', { desc = "Delete (no yank)" })

-- Select all / line / move
keymap.set({ "n", "v" }, "<leader>a", "ggVG", { desc = "Select all" })
keymap.set({ "n", "v" }, "<leader>i", "V", { desc = "Select line" })


-- First/Last
keymap.set({ "n", "v"}, "<leader>fl", "0", {desc="first line"})
keymap.set({ "n", "v"}, "<leader>ll", "$", {desc="last line"})
keymap.set({ "n", "v" }, "<leader>ff", "gg", { desc = "Go to top" })
keymap.set({ "n", "v" }, "<leader>lf", "G", { desc = "Go to bottom" })

-- Duplicate
keymap.set({ "n", "v" }, "<leader>du", function()
    local mode = vim.fn.mode()
    if mode:match("[vV]") or mode == "\22" then
        vim.api.nvim_feedkeys("y'>p", "n", false)
    else
        vim.api.nvim_feedkeys("yyp", "n", false)
    end
end, { desc = "Duplicate line/selection" })

-- Replace
keymap.set("v", "<leader>ra", 'y:%s/<C-r>0//g<Left><Left>', { desc = "Replace selection (global)" })
keymap.set("v", "<leader>r", [[:s/<C-r><C-w>//g<Left><Left>]], { desc = "Replace in selection" })

-- ====================================================
-- 🌳 FILES / NAVIGATION / PLUGINS
-- ====================================================
-- NeoTree
keymap.set("n", "<leader>e", ":Neotree toggle<CR>", { desc = "File explorer" })

-- Telescope
keymap.set("n", "<leader>sf", "<cmd>Telescope find_files<cr>", { desc = "Find files" })
keymap.set("n", "<leader>sg", "<cmd>Telescope live_grep<cr>", { desc = "Live grep" })
keymap.set("n", "<leader>sb", "<cmd>Telescope buffers<cr>", { desc = "Buffers" })
keymap.set("n", "<leader>sh", "<cmd>Telescope help_tags<cr>", { desc = "Help tags" })

-- ====================================================
-- 🧩 BUFFERLINE MANAGEMENT
-- ====================================================
for i = 1, 9 do
    keymap.set("n", "<leader>" .. i, function()
        require("bufferline").go_to_buffer(i, true)
    end, { desc = "Go to buffer " .. i })
end

keymap.set("n", "<leader>bn", ":BufferLineCycleNext<CR>", { desc = "Next buffer" })
keymap.set("n", "<leader>bp", ":BufferLineCyclePrev<CR>", { desc = "Prev buffer" })

local function smart_close_buffer()
    local bufnr = api.nvim_get_current_buf()
    local buffers = vim.fn.getbufinfo({ buflisted = 1 })

    if #buffers == 1 then
        vim.cmd("bdelete")
        vim.cmd("Alpha")
    else
        local next_buf = nil
        for i, buf in ipairs(buffers) do
            if buf.bufnr == bufnr then
                next_buf = buffers[i + 1] or buffers[i - 1]
                break
            end
        end
        if next_buf then
            vim.cmd("buffer " .. next_buf.bufnr)
        end
        vim.cmd("bdelete! " .. bufnr)
    end
end

keymap.set("n", "<leader>bd", smart_close_buffer, { desc = "smart_close_buffer" })

-- ====================================================
-- ⚙️ LSP / DEVTOOLS / DEBUG / MASON / LAZY
-- ====================================================
-- LSP
keymap.set("n", "gd", vim.lsp.buf.definition, { desc = "Go to definition" })
keymap.set("n", "gD", vim.lsp.buf.declaration, { desc = "Go to declaration" })
keymap.set("n", "gr", vim.lsp.buf.references, { desc = "List references" })
keymap.set("n", "K", vim.lsp.buf.hover, { desc = "Hover docs" })
keymap.set("n", "<leader>rn", vim.lsp.buf.rename, { desc = "Rename symbol" })
keymap.set("n", "<leader>ca", vim.lsp.buf.code_action, { desc = "Code actions" })
keymap.set("n", "<leader>f", function() vim.lsp.buf.format({ async = true }) end, { desc = "Format file" })

-- Mason / Lazy
keymap.set("n", "<leader>m", ":Mason<CR>", { desc = "Mason Installer" })
keymap.set("n", "<leader>l", ":Lazy<CR>", { desc = "Lazy Manager" })

-- Trouble Diagnostics
keymap.set("n", "<leader>xx", "<cmd>TroubleToggle<cr>", { desc = "Toggle Trouble" })
keymap.set("n", "<leader>xw", "<cmd>TroubleToggle workspace_diagnostics<cr>", { desc = "Workspace diagnostics" })
keymap.set("n", "<leader>xd", "<cmd>TroubleToggle document_diagnostics<cr>", { desc = "Document diagnostics" })

-- Treesitter incremental selection
keymap.set("n", "<leader>ts", function()
    require("nvim-treesitter.incremental_selection").init_selection()
end, { desc = "TS init selection" })

-- Notification history
keymap.set("n", "<leader>nt", function()
    require("notify").history()
end, { desc = "Notification history" })

-- ====================================================
-- 🧰 TOOLS / UTILITIES
-- ====================================================
-- Live Server
keymap.set("n", "<leader>ls", ":split | terminal live-server<CR>", { desc = "Run Live Server" })

-- ollama
keymap.set("n", "<leader>aa", ":AvanteChat<CR>")
keymap.set("v", "<leader>ae", ":AvanteEdit<CR>")
keymap.set("n", "<leader>ax", ":AvanteExplain<CR>")

-- Toggle relative number
keymap.set("n", "<leader>nr", function()
    vim.o.relativenumber = not vim.o.relativenumber
end, { desc = "Toggle relative number" })

-- Which-key show
keymap.set("n", "<leader>km", function()
    require("which-key").show()
end, { desc = "Show key map menu" })
