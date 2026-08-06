return {
    {
        "iamcco/markdown-preview.nvim",
        cmd = { "MarkdownPreviewToggle", "MarkdownPreview", "MarkdownPreviewStop" },
        ft = { "markdown" },
        build = function()
            local install = vim.fn["mkdp#util#install"]
            if type(install) == "function" then
                install()
                return
            end

            local app_dir = vim.fn.stdpath("data") .. "/lazy/markdown-preview.nvim/app"
            if vim.fn.executable("yarn") == 1 then
                vim.fn.system("cd " .. vim.fn.shellescape(app_dir) .. " && yarn install")
            else
                vim.fn.system("cd " .. vim.fn.shellescape(app_dir) .. " && npm install")
            end
        end,
    },
    {
    "MeanderingProgrammer/render-markdown.nvim",
    opts = {},
    dependencies = {
        "nvim-treesitter/nvim-treesitter",
        "nvim-tree/nvim-web-devicons",
    },
},}
