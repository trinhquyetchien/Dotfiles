local function purge_terminal_images()
    local ok, image = pcall(require, "image")
    if ok and image.clear then
        image.clear()
    end

    -- Ép Terminal (WezTerm/Kitty qua Tmux) xóa sạch toàn bộ placement và bộ nhớ đệm ảnh Kitty graphics (d=A)
    local clear_seq = string.char(27) .. "_Ga=d,d=A" .. string.char(27) .. "\\"
    if vim.env.TMUX then
        clear_seq = string.char(27) .. "Ptmux;" .. clear_seq:gsub(string.char(27), string.char(27) .. string.char(27)) .. string.char(27) .. "\\"
    end
    io.stdout:write(clear_seq)
    io.stdout:flush()
end

return {
    "3rd/image.nvim",
    opts = {
        backend = "kitty",
        processor = "magick_rock",
        integrations = {
            markdown = {
                enabled = true,
                clear_in_insert_mode = false,
                download_remote_images = true,
                only_render_image_at_cursor = false,
                filetypes = { "markdown", "vimwiki" },
            },
        },
        window_overlap_clear_enabled = true,
        window_overlap_clear_ft_ignore = { "cmp_menu", "cmp_docs", "snacks_notif", "scrollview" },
        tmux_show_only_in_active_window = true,
    },
    config = function(_, opts)
        require("image").setup(opts)

        local group = vim.api.nvim_create_augroup("ImageCleanupFix", { clear = true })

        -- Khi rời khỏi file Markdown hoặc ẩn buffer
        vim.api.nvim_create_autocmd({ "BufLeave", "BufHidden" }, {
            group = group,
            pattern = { "*.md", "*.markdown" },
            callback = purge_terminal_images,
        })

        -- Khi chuyển sang file khác không phải Markdown
        vim.api.nvim_create_autocmd({ "BufEnter" }, {
            group = group,
            callback = function(args)
                local ft = vim.bo[args.buf].filetype
                if ft ~= "markdown" and ft ~= "vimwiki" then
                    purge_terminal_images()
                end
            end,
        })

        -- Khi đóng split window hoặc chuyển tab
        vim.api.nvim_create_autocmd({ "WinClosed", "TabLeave" }, {
            group = group,
            callback = purge_terminal_images,
        })
    end,
    keys = {
        {
            "<leader>ci",
            purge_terminal_images,
            desc = "Clear leftover images",
        },
    },
}
