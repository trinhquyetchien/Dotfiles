require("venv-selector").setup({
  settings = {
    search = {
      anaconda_base = {
        command = "anaconda --version",
        type = "anaconda",
      },
      anaconda_envs = {
        command = "anaconda env list",
        type = "anaconda",
      },
      cwd = {
        name = { ".venv", "venv", "env" },
      },
    },
  },
})
