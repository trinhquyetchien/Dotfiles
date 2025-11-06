local jdtls = require("jdtls")

local home = os.getenv("HOME")
local mason_path = home .. "/.local/share/nvim/mason/packages/jdtls"
local launcher = vim.fn.glob(mason_path .. "/plugins/org.eclipse.equinox.launcher_*.jar")
local config = mason_path .. "/config_linux"
local workspace = home .. "/.cache/jdtls/workspace/" .. vim.fn.fnamemodify(vim.fn.getcwd(), ":p:h:t")

local root_dir = require("jdtls.setup").find_root({ "pom.xml", "build.gradle", ".git" })
if root_dir == "" then
  root_dir = vim.fn.getcwd()
end

local opts = {
  cmd = {
    "java",
    "-Declipse.application=org.eclipse.jdt.ls.core.id1",
    "-Dosgi.bundles.defaultStartLevel=4",
    "-Declipse.product=org.eclipse.jdt.ls.core.product",
    "-Dlog.protocol=true",
    "-Dlog.level=ALL",
    "-Xms1g",
    "--add-modules=ALL-SYSTEM",
    "--add-opens", "java.base/java.util=ALL-UNNAMED",
    "--add-opens", "java.base/java.lang=ALL-UNNAMED",
    "-jar", launcher,
    "-configuration", config,
    "-data", workspace,
  },
  root_dir = root_dir,
  settings = {
    java = {
      configuration = {
        runtimes = {
          {
            name = "JavaSE-17",
            path = "/usr/lib/jvm/java-17-openjdk",
          },
        },
      },
    },
  },
}

jdtls.start_or_attach(opts)
