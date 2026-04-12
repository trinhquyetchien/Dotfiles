require("colorizer").setup({
  'css',
  'javascript',
  'html',
  'lua',
  '*'; -- hoặc bạn có thể để '*' cho tất cả file
}, {
  RGB = true,         -- bật #RGB và #RRGGBB
  RRGGBBAA = true,    -- hỗ trợ alpha
  names = true,       -- bật tên màu như "Blue"
  tailwind = false,   -- nếu bạn xài tailwind css thì bật
  css = true,         -- bật css hsl() và rgb()
  css_fn = true,      -- bật css functions như rgb(), hsl()
  virtualtext = "■",  -- ký hiệu block màu hiển thị (có thể đổi ■ thành ● hoặc ▎)
})
