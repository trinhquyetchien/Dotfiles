return {
  "HakonHarnes/img-clip.nvim",
  event = "VeryLazy",

  opts = {
    default = {
      embed_image_as_base64 = false,
      prompt_for_file_name = false,

      drag_and_drop = {
        insert_mode = true,
      },

      use_absolute_path = false,
      relative_to_current_file = true,

      dir_path = "assets",
      file_name = "%Y%m%d-%H%M%S",
    },
  },

  keys = {
    {
      "<C-v>",
      "<cmd>PasteImage<cr>",
      mode = "i",
      desc = "Paste image",
    },
  },
}
