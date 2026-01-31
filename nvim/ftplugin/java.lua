local jdtls = require("jdtls")

-- ===============================
-- Thông tin cơ bản
-- ===============================
local home = os.getenv("HOME")
local mason_path = home .. "/.local/share/nvim/mason/packages/jdtls"
local workspace_dir = home .. "/.cache/jdtls/workspace/" .. vim.fn.fnamemodify(vim.fn.getcwd(), ":p:h:t")

-- Launcher jar & config
local launcher = "/home/trinhquyetchien/.local/share/nvim/mason/packages/jdtls/plugins/org.eclipse.equinox.launcher_1.7.100.v20251014-1222.jar"
local config = mason_path .. "/config_linux"

-- Root dir tìm pom.xml, build.gradle, hoặc .git
local root_dir = require("jdtls.setup").find_root({ "pom.xml", "build.gradle", ".git" })
if root_dir == "" then
  root_dir = vim.fn.getcwd()
end

-- ===============================
-- JavaFX module path
-- ===============================
local fx_path = "/home/trinhquyetchien/JavaFX/javafx-sdk-23.0.2/lib"

-- ===============================
-- Config jdtls
-- ===============================
local opts = {
  cmd = {
    "java",
    "-Declipse.application=org.eclipse.jdt.ls.core.id1",
    "-Dosgi.bundles.defaultStartLevel=4",
    "-Declipse.product=org.eclipse.jdt.ls.core.product",
    "-Dlog.protocol=true",
    "-Dlog.level=ALL",
    "-Xms1g",
    -- Thêm JavaFX
    "--module-path", fx_path,
    "--add-modules", "javafx.controls,javafx.fxml",
    "--add-opens", "java.base/java.util=ALL-UNNAMED",
    "--add-opens", "java.base/java.lang=ALL-UNNAMED",
    "-jar", launcher,
    "-configuration", config,
    "-data", workspace_dir,
  },

  root_dir = root_dir,

  settings = {
    java = {
      configuration = {
        runtimes = {
          {
            name = "JavaSE-21",
            path = "/usr/lib/jvm/java-21-openjdk",
          },
        },
      },
    },
  },

  init_options = {
    bundles = {}
  },
}

-- Start hoặc attach jdtls
jdtls.start_or_attach(opts)
