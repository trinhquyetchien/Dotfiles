local mouse_scrolled = false
for _, dir in ipairs({ "Up", "Down" }) do
    local key = "<ScrollWheel" .. dir .. ">"
    vim.keymap.set({ "", "i" }, key, function()
        mouse_scrolled = true
        return key
    end, { expr = true, noremap = true, silent = true })
end

local animate = require("mini.animate")

return {
    resize = {
        timing = animate.gen_timing.linear({ duration = 150, unit = "total" }),
    },
    scroll = {
        timing = animate.gen_timing.linear({ duration = 150, unit = "total" }),
        subscroll = animate.gen_subscroll.equal({
            predicate = function(total_scroll)
                if mouse_scrolled then
                    mouse_scrolled = false
                    return false
                end
                return total_scroll > 1
            end,
        }),
        hooks = {
            -- scroll mượt mà, cursor đi cùng dòng văn bản
            pre_scroll = function() end,
            post_scroll = function() end,
        },
    },
}
