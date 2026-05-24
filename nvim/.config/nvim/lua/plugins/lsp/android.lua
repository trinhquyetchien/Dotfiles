return {
    "iamironz/android-nvim-plugin",
    dependencies = {
        "nvim-lua/plenary.nvim",
        "hrsh7th/nvim-cmp",
    },
    config = function()
        require("android").setup({
            -- Tự động tìm Android SDK
            sdk_path = os.getenv("HOME") .. "/Android/Sdk",
        })
    end,
}
