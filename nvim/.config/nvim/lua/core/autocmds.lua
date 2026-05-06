-- Auto save
vim.api.nvim_create_autocmd("InsertLeave", {
    callback = function()
        if vim.bo.modified and vim.bo.buftype == "" and vim.fn.expand("%") ~= "" then
            vim.cmd("silent! write")
        end
    end,
})

-- FXML support
vim.api.nvim_create_autocmd({ "BufRead", "BufNewFile" }, {
    pattern = "*.fxml",
    callback = function()
        vim.bo.filetype = "xml"
    end
})

-- Flutter auto reload (if flutter-tools is used)
vim.api.nvim_create_autocmd("InsertLeave", {
    pattern = "*.dart",
    callback = function()
        vim.cmd("silent! write")
        -- Check if FlutterReload exists before calling
        if vim.fn.exists(":FlutterReload") > 0 then
            vim.cmd("FlutterReload")
            vim.notify("🔥 Flutter hot reload", vim.log.levels.INFO)
        end
    end,
})

-- Terminal settings
vim.api.nvim_create_autocmd('TermOpen', {
    pattern = 'term://*',
    callback = function()
        local opts = { noremap = true, silent = true }
        vim.api.nvim_buf_set_keymap(0, 't', '<Esc>', [[<C-\><C-n>]], opts)
        vim.api.nvim_buf_set_keymap(0, 't', '<C-h>', [[<C-\><C-n><C-w>h]], opts)
        vim.api.nvim_buf_set_keymap(0, 't', '<C-j>', [[<C-\><C-n><C-w>j]], opts)
        vim.api.nvim_buf_set_keymap(0, 't', '<C-k>', [[<C-\><C-n><C-w>k]], opts)
        vim.api.nvim_buf_set_keymap(0, 't', '<C-l>', [[<C-\><C-n><C-w>l]], opts)
        vim.cmd("startinsert")
    end,
})

-- Redraw statusline on LSP changes
vim.api.nvim_create_autocmd({ "LspAttach", "LspDetach" }, {
    callback = function()
        vim.cmd("redrawstatus")
    end
})

-- Visual Selection Highlight
local ns_id = vim.api.nvim_create_namespace("VisualHighlight")

local function highlight_visual_word()
    vim.api.nvim_buf_clear_namespace(0, ns_id, 0, -1)

    local start_pos = vim.fn.getpos("'<")
    local end_pos = vim.fn.getpos("'>")
    local start_line, start_col = start_pos[2] - 1, start_pos[3] - 1
    local end_line, end_col = end_pos[2] - 1, end_pos[3] - 1

    local lines = vim.api.nvim_buf_get_lines(0, start_line, end_line + 1, false)
    if #lines == 0 then return end

    if #lines == 1 then
        lines[1] = lines[1]:sub(start_col + 1, end_col)
    else
        lines[1] = lines[1]:sub(start_col + 1)
        lines[#lines] = lines[#lines]:sub(1, end_col)
    end
    
    local word = table.concat(lines, "\n")
    if word == "" or word:match("^%s*$") then return end

    local pattern = vim.pesc(word)
    local buf_lines = vim.api.nvim_buf_get_lines(0, 0, -1, false)
    for lnum, text in ipairs(buf_lines) do
        local start_idx = 1
        while true do
            local s, e = string.find(text, pattern, start_idx, true)
            if not s then break end
            vim.api.nvim_buf_add_highlight(0, ns_id, "Visual", lnum - 1, s - 1, e)
            start_idx = e + 1
        end
    end
end

vim.api.nvim_create_autocmd({ "CursorMoved", "CursorMovedI", "ModeChanged" }, {
    pattern = "*",
    callback = function()
        local mode = vim.fn.mode()
        if mode == "v" or mode == "V" or mode == "\22" then
            highlight_visual_word()
        else
            vim.api.nvim_buf_clear_namespace(0, ns_id, 0, -1)
        end
    end
})

-- Auto indent for HTML
vim.api.nvim_create_autocmd("FileType", {
  group = vim.api.nvim_create_augroup("NoHtmlIndent", { clear = true }),
  pattern = "html",
  callback = function()
    vim.opt_local.indentexpr = ""
    vim.opt_local.indentkeys = ""
  end,
})
