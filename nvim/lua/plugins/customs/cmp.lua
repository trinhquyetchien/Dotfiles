local cmp = require("cmp")
local luasnip = require("luasnip")


cmp.setup({
    snippet = {
        expand = function(args)
            luasnip.lsp_expand(args.body)
        end,
    },

    window = {
        completion = cmp.config.window.bordered(),    -- menu có border
        documentation = cmp.config.window.bordered(), -- docs cũng có border
        backgound_color = "#ffffff"
    },
    formatting = {
        format = function(entry, vim_item)
            -- Custom icon theo kind
            vim_item.kind = ({
                Text = "󰦨",
                Method = "",
                Function = "󰊕",
                Constructor = "",
                Field = "",
                Variable = "",
                Class = "󰋀",
                Interface = "",
                Module = "",
                Property = "",
                Unit = "",
                Value = "󰫧",
                Enum = "",
                Keyword = "#",
                Snippet = "",
                Color = "",
                File = "",
                Reference = "",
                Folder = "",
                EnumMember = "",
                Constant = "",
                Struct = "פּ",
                Event = "",
                Operator = "",
                TypeParameter = "󰉺",
            })[vim_item.kind] .. " " .. vim_item.kind
            return vim_item
        end
    },
    mapping = cmp.mapping.preset.insert({
        ["<Tab>"] = cmp.mapping.select_next_item(),
        ["<S-Tab>"] = cmp.mapping.select_prev_item(),
        ["<CR>"] = cmp.mapping.confirm({ select = true }),
        ["<C-Space>"] = cmp.mapping.complete(),
    }),
    sources = cmp.config.sources({
        { name = "nvim_lsp" },
        { name = "luasnip" },
        { name = "buffer" },
        { name = "path" },
    }),
})
