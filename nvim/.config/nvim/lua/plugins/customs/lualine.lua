require('lualine').setup {
    options = {
        icons_enabled = true,
        theme = 'catppuccin',
        component_separators = { left = '', right = '' },
        section_separators = { left = '', right = '' },
        disabled_filetypes = { statusline = {}, winbar = {} },
        always_divide_middle = true,
        globalstatus = true,
        refresh = { statusline = 1000, tabline = 1000, winbar = 1000 }
    },

    sections = {
        -- Bên trái
        lualine_a = {
            { 'mode', icon = '' }
        },
        lualine_b = {
            { 'branch', icon = '' },
            { 'diff', symbols = { added = ' ', modified = ' ', removed = ' ' } },
            { 'diagnostics', symbols = { error = ' ', warn = ' ', info = ' ', hint = ' ' } }
        },
        -- Trung tâm
        lualine_c = {
            { 'filename', file_status = true, path = 1, icon = '' },
            {
                function()
                    local msg = 'No Active LSP'
                    local buf_ft = vim.bo.filetype
                    local clients = vim.lsp.get_clients({ bufnr = 0 })

                    if #clients == 0 then
                        return msg
                    end

                    local active = {}
                    local seen = {}

                    for _, client in ipairs(clients) do
                        local filetypes = client.config.filetypes
                        if not filetypes or vim.fn.index(filetypes, buf_ft) ~= -1 then
                            if not seen[client.name] then
                                table.insert(active, client.name)
                                seen[client.name] = true
                            end
                        end
                    end

                    if #active == 0 then
                        return msg
                    end

                    return table.concat(active, ", ")
                end,
                icon = '',
                color = { fg = '#90ee90', gui = 'bold' }
            }
        },
        -- Bên phải
        lualine_x = {
            -- Số dòng hiện tại / tổng dòng
            {
                function()
                    local current_line = vim.fn.line(".")
                    local total_lines = vim.fn.line("$")
                    return string.format(" %d/%d", current_line, total_lines)
                end,
                color = { fg = "#89b4fa" },
            },
            -- Kích thước file
            {
                function()
                    local file = vim.fn.expand("%:p")
                    if file == "" then return "" end
                    local size = vim.fn.getfsize(file)
                    if size <= 0 then return "0B" end
                    local units = { "B", "KB", "MB", "GB" }
                    local i = 1
                    while size > 1024 and i < #units do
                        size = size / 1024
                        i = i + 1
                    end
                    return string.format("%.1f%s", size, units[i])
                end,
                color = { fg = "#89b4fa" },
            },
        },
        lualine_y = {
            {
                function()
                    if not vim.g.start_time then
                        vim.g.start_time = os.time()
                    end
                    local diff = os.time() - vim.g.start_time
                    local hours = math.floor(diff / 3600)
                    local mins = math.floor((diff % 3600) / 60)
                    return string.format(" %02dh:%02dm", hours, mins)
                end,
                color = { fg = "#a6e3a1" },
            },

            { 'filetype', icon_only = false }
        },
        lualine_z = {
            -- Uptime của Neovim
            -- Giờ hiện tại
            {
                function()
                    return os.date(" %H:%M:%S")
                end,

            }
        }
    }
}
