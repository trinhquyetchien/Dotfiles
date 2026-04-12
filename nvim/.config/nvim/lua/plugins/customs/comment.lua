require("Comment").setup()

-- nếu có context commentstring
local ok, ts = pcall(require, "ts_context_commentstring.integrations.comment_nvim")
if ok then
    require("Comment").setup({
        pre_hook = ts.create_pre_hook(),
    })
end


local api = require("Comment.api")
local keymap = vim.keymap


