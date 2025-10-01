local keymap = vim.keymap
local mode = vim.fn.mode()
local api = vim.api

local opts = { noremap = true, silent = true }

--set leader key
vim.g.mapleader = " "
vim.g.maplocalleader = " "

--CORE
--split window and terminal
keymap.set('n', '<leader>sh', ':split<CR>', opts)
keymap.set('n', '<leader>sv', ':vsplit<CR>', opts)
keymap.set('n', '<leader>tt', ':split | terminal<CR>i', opts)
keymap.set('n', '<leader>tv', ':vsplit | terminal<CR>i', opts)
keymap.set('n', '<leader>sx', ':close<CR>', opts)

keymap.set('n', '<C-h>', '<C-w>h', opts)
keymap.set('n', '<C-j>', '<C-w>j', opts)
keymap.set('n', '<C-k>', '<C-w>k', opts)
keymap.set('n', '<C-l>', '<C-w>l', opts)

keymap.set('n', '<C-Up>', ':resize +2<CR>', opts)
keymap.set('n', '<C-Down>', ':resize -2<CR>', opts)
keymap.set('n', '<C-Left>', ':vertical resize -2<CR>', opts)
keymap.set('n', '<C-Right>', ':vertical resize +2<CR>', opts)

--auto brackets
keymap.set('x', '(', 'c(<C-r>")<Esc>', opts)
keymap.set('x', '{', 'c{<C-r>"}<Esc>', opts)
keymap.set('x', '[', 'c[<C-r>"]<Esc>', opts)
keymap.set('x', '\'', "c'<C-r>'<Esc>", opts)
keymap.set('x', '"', 'c"<C-r>"\"<Esc>', opts)
keymap.set('x', '<', 'c<<C-r>><Esc>', opts)

--copy and paste
--clipboard
keymap.set({ "n", "v" }, "<C-c>", '"+y', opts)
keymap.set({ "n", "v" }, "<C-v>", '"+p', opts)
keymap.set({ "n", "v" }, "<C-x>", '"+d', opts)

--resigter a
keymap.set({ "n", "v" }, "<Leader>c", '"ay', opts)
keymap.set({ "n", "v" }, "<Leader>v", '"ap', opts)
keymap.set({ "n", "v" }, "<Leader>x", '"ad', opts)

--delete and don't save
keymap.set("n", "<Leader>d", '"_dd<CR>', opts)
keymap.set("v", "<Leader>d", '"_d<CR>', opts)

--select all
keymap.set({ "n", "v" }, "<Leader>a", "ggVG", opts)

--select line
keymap.set({"n", "v"}, "<Leader>i", "V", opts)

--first file
keymap.set({ "n", "v" }, "<Leader>ff", "gg", opts)

--last file
keymap.set({ "n", "v" }, "<Leader>lf", "G", opts)

--first line
keymap.set({ "n", "v" }, "<Leader>fl", "^", opts)

--last line
keymap.set({ "n", "v" }, "<Leader>ll", "$", opts)

--duplicate
local function duplicate()
    if mode == "v" or mode == "V" or mode == '\22' then
        vim.api.nvim_feedkeys("y'>p", "n", false)
    else
        vim.api.nvim_feedkeys("yyp", "n", false)
    end
end
keymap.set({ "n", "v" }, "<leader>du", duplicate, opts)


--undo
keymap.set("n", "<C-z>", "u", opts)

--redo
keymap.set("n", "<C-y>", "<C-r>", opts)

-- Search next
keymap.set("n", "n", "n", opts)

-- Search previous
keymap.set("n", "p", "N", opts)

-- Replace visual selection in whole file
vim.keymap.set("v", "<leader>ra", 'y:%s/<C-r>0//g<Left><Left>', opts)

--end highlight
keymap.set("n", "<Leader>h", ":nohlsearch<CR>", opts)

--rewrite
vim.keymap.set("v", "<Leader>r", [[:s/<C-r><C-w>//g<Left><Left>]], opts)


--CUSTOMS

--neotree
keymap.set("n", "<Leader>e", ":Neotree toggle<CR>", opts)

--telescope
keymap.set("n", "<leader>sf", "<cmd>Telescope find_files<cr>", opts)
keymap.set("n", "<leader>sg", "<cmd>Telescope live_grep<cr>", opts)
keymap.set("n", "<leader>sb", "<cmd>Telescope buffers<cr>", opts)
keymap.set("n", "<leader>sh", "<cmd>Telescope help_tags<cr>", opts)

--treesitter
-- Treesitter Textobjects selection
keymap.set({ 'o', 'x' }, '<Leader>of', ':<C-U>normal! v@function.outer<CR>', opts)
keymap.set({ 'o', 'x' }, '<Leader>if', ':<C-U>normal! v@function.inner<CR>', opts)
keymap.set({ 'o', 'x' }, '<Leader>oc', ':<C-U>normal! v@class.outer<CR>', opts)
keymap.set({ 'o', 'x' }, '<Leader>ic', ':<C-U>normal! v@class.inner<CR>', opts)

-- Incremental Selection keymaps
keymap.set('n', '<Leader>gn',
    function() vim.cmd('lua require"nvim-treesitter.incremental_selection".init_selection()') end, opts)
keymap.set('n', '<Leader>gr',
    function() vim.cmd('lua require"nvim-treesitter.incremental_selection".node_incremental()') end, opts)
keymap.set('n', '<Leader>gs',
    function() vim.cmd('lua require"nvim-treesitter.incremental_selection".scope_incremental()') end, opts)
keymap.set('n', '<Leader>gm',
    function() vim.cmd('lua require"nvim-treesitter.incremental_selection".node_decremental()') end, opts)

--bufferline
for i = 1, 100 do
    keymap.set('n', '<Leader>' .. i, function()
        require('bufferline').go_to_buffer(i, true)
    end, opts)
end

keymap.set('n', '<Leader>bn', ':BufferLineCycleNext<CR>', opts)
keymap.set('n', '<Leader>bp', ':BufferLineCyclePrev<CR>', opts)
keymap.set('n', '<Leader>bd', ':BufferLinePickClose<CR>', opts)

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

vim.keymap.set("n", "<Leader>bd", smart_close_buffer, opts)

--lsp
keymap.set("n", "gd", vim.lsp.buf.definition, opts)
keymap.set("n", "gD", vim.lsp.buf.declaration, opts)
keymap.set("n", "gr", vim.lsp.buf.references, opts)
keymap.set("n", "K", vim.lsp.buf.hover, opts)
keymap.set("n", "<leader>rn", vim.lsp.buf.rename, opts)
keymap.set("n", "<leader>ca", vim.lsp.buf.code_action, opts)
keymap.set("n", "<leader>f", function() vim.lsp.buf.format({ async = true }) end, opts)
keymap.set({ "n", "v" }, "<leader>l", ":Lazy<CR>", opts)

--mason
keymap.set({ "n", "v" }, "<leader>m", ":Mason<CR>", opts)

--live server
keymap.set('n', '<leader>ls', ':split | terminal live-server<CR>', opts)

-- Trouble keymaps
keymap.set("n", "<leader>xx", "<cmd>TroubleToggle<cr>", opts)
keymap.set("n", "<leader>xw", "<cmd>TroubleToggle workspace_diagnostics<cr>", opts)
keymap.set("n", "<leader>xd", "<cmd>TroubleToggle document_diagnostics<cr>", opts)

--notifical
keymap.set("n", "<leader>nt", function()
  require("notify").history()
end, {desc = "Notification history"})
