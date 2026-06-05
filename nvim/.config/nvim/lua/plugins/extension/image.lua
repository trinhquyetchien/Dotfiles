return {
  "3rd/image.nvim",
  opts = {
    backend = "kitty", 
    integrations = {
      markdown = {
        enabled = true,
        clear_in_insert_mode = false,
        download_remote_images = true, -- Auto-renders image URLs
        only_render_image_at_cursor = false,
      },
      neorg = { enabled = true },
    },
    max_width = nil,
    max_height = nil,
    max_width_window_percentage = nil,
    max_height_window_percentage = nil,
    window_overlap_clear_enabled = false, 
  },
}
