local api = vim.api

--auto save
vim.api.nvim_create_autocmd("InsertLeave", {
    callback = function()
            vim.cmd("silent! write")
    end,
})

--javafx
vim.api.nvim_create_autocmd({"BufRead", "BufNewFile"}, {
    pattern = "*.fxml",
    callback = function()
        vim.bo.filetype = "xml"  -- dùng XML syntax, indent, folding
    end
})

--flutter auto reload
vim.api.nvim_create_autocmd("InsertLeave", {
    pattern = "*.dart",
    callback = function()
        vim.cmd("silent! write")
        vim.cmd("FlutterReload")
        vim.notify("🔥 Flutter hot reload", vim.log.levels.INFO)
    end,
})

vim.api.nvim_create_autocmd({ "BufReadPost", "FileType" }, {
    callback = function()
        pcall(vim.lsp.buf_attach_client, 0, lsp_client_id)
    end
})

--auto terminal
vim.api.nvim_create_autocmd('TermOpen', {
    pattern = 'term://*',
    callback = function()
        vim.api.nvim_buf_set_keymap(0, 't', '<Esc>', [[<C-\><C-n>]], { noremap = true })
        vim.api.nvim_buf_set_keymap(0, 't', '<C-h>', [[<C-\><C-n><C-w>h]], { noremap = true })
        vim.api.nvim_buf_set_keymap(0, 't', '<C-j>', [[<C-\><C-n><C-w>j]], { noremap = true })
        vim.api.nvim_buf_set_keymap(0, 't', '<C-k>', [[<C-\><C-n><C-w>k]], { noremap = true })
        vim.api.nvim_buf_set_keymap(0, 't', '<C-l>', [[<C-\><C-n><C-w>l]], { noremap = true })
    end,
})

--auto lsp lualine
vim.api.nvim_create_autocmd({ "LspAttach", "LspDetach" }, {
    callback = function()
        vim.cmd("redrawstatus")
    end
})

--auto selection
local ns_id = vim.api.nvim_create_namespace("VisualHighlight")

local function highlight_visual_word()
    vim.api.nvim_buf_clear_namespace(0, ns_id, 0, -1)

    local start_pos = vim.fn.getpos("'<")
    local end_pos = vim.fn.getpos("'>")
    local start_line, start_col = start_pos[2] - 1, start_pos[3] - 1
    local end_line, end_col = end_pos[2] - 1, end_pos[3] - 1

    local lines = vim.api.nvim_buf_get_lines(0, start_line, end_line + 1, false)
    if #lines == 0 then return end

    lines[#lines] = lines[#lines]:sub(1, end_col - (start_line == end_line and 0 or 0))
    lines[1] = lines[1]:sub(start_col + 1)
    local word = table.concat(lines, "\n")
    if word == "" then return end

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

--auto indent
vim.api.nvim_create_autocmd("FileType", {
  group = vim.api.nvim_create_augroup("NoHtmlIndent", { clear = true }),
  pattern = "html",
  callback = function()
    vim.opt_local.indentexpr = ""
    vim.opt_local.indentkeys = ""
  end,
})
