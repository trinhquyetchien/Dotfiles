
local ls = require("luasnip")
local s = ls.snippet
local t = ls.text_node
local i = ls.insert_node

-- Full FXML snippets
ls.add_snippets("fxml", {
  -- Button
  s("btn", {
    t("<Button text=\""), i(1, "Button Text"),
    t("\" fx:id=\""), i(2, "buttonId"),
    t("\" />"),
  }),

  -- Label
  s("lbl", {
    t("<Label text=\""), i(1, "Label Text"),
    t("\" fx:id=\""), i(2, "labelId"),
    t("\" />"),
  }),

  -- TextField
  s("tf", {
    t("<TextField fx:id=\""), i(1, "textFieldId"),
    t("\" promptText=\""), i(2, "Enter text"),
    t("\" />"),
  }),

  -- PasswordField
  s("pf", {
    t("<PasswordField fx:id=\""), i(1, "passwordFieldId"),
    t("\" promptText=\""), i(2, "Enter password"),
    t("\" />"),
  }),

  -- VBox
  s("vbox", {
    t("<VBox spacing=\""), i(1, "10"),
    t("\" fx:id=\""), i(2, "vboxId"),
    t("\">\n  "), i(3, ""),
    t("\n</VBox>"),
  }),

  -- HBox
  s("hbox", {
    t("<HBox spacing=\""), i(1, "10"),
    t("\" fx:id=\""), i(2, "hboxId"),
    t("\">\n  "), i(3, ""),
    t("\n</HBox>"),
  }),

  -- AnchorPane
  s("ap", {
    t("<AnchorPane fx:id=\""), i(1, "anchorPaneId"),
    t("\">\n  "), i(2, ""),
    t("\n</AnchorPane>"),
  }),

  -- BorderPane
  s("bp", {
    t("<BorderPane fx:id=\""), i(1, "borderPaneId"),
    t("\">\n  "), i(2, ""),
    t("\n</BorderPane>"),
  }),

  -- StackPane
  s("sp", {
    t("<StackPane fx:id=\""), i(1, "stackPaneId"),
    t("\">\n  "), i(2, ""),
    t("\n</StackPane>"),
  }),

  -- GridPane
  s("gp", {
    t("<GridPane fx:id=\""), i(1, "gridPaneId"),
    t("\">\n  "), i(2, ""),
    t("\n</GridPane>"),
  }),

  -- MenuBar
  s("menubar", {
    t("<MenuBar fx:id=\""), i(1, "menuBarId"),
    t("\">\n  "), i(2, ""),
    t("\n</MenuBar>"),
  }),

  -- Menu
  s("menu", {
    t("<Menu text=\""), i(1, "Menu Text"),
    t("\" fx:id=\""), i(2, "menuId"),
    t("\">\n  "), i(3, ""),
    t("\n</Menu>"),
  }),

  -- MenuItem
  s("menuitem", {
    t("<MenuItem text=\""), i(1, "Item Text"),
    t("\" fx:id=\""), i(2, "menuItemId"),
    t("\" />"),
  }),

  -- CheckBox
  s("cb", {
    t("<CheckBox text=\""), i(1, "CheckBox Text"),
    t("\" fx:id=\""), i(2, "checkBoxId"),
    t("\" />"),
  }),

  -- RadioButton
  s("rb", {
    t("<RadioButton text=\""), i(1, "RadioButton Text"),
    t("\" fx:id=\""), i(2, "radioButtonId"),
    t("\" />"),
  }),

  -- Slider
  s("slider", {
    t("<Slider fx:id=\""), i(1, "sliderId"),
    t("\" min=\"0\" max=\"100\" value=\""), i(2, "50"),
    t("\" />"),
  }),

  -- ProgressBar
  s("pb", {
    t("<ProgressBar fx:id=\""), i(1, "progressBarId"),
    t("\" progress=\""), i(2, "0.0"),
    t("\" />"),
  }),

  -- ProgressIndicator
  s("pi", {
    t("<ProgressIndicator fx:id=\""), i(1, "progressIndicatorId"),
    t("\" progress=\""), i(2, "0.0"),
    t("\" />"),
  }),

  -- ListView
  s("lv", {
    t("<ListView fx:id=\""), i(1, "listViewId"),
    t("\">\n  "), i(2, ""),
    t("\n</ListView>"),
  }),

  -- TableView
  s("tv", {
    t("<TableView fx:id=\""), i(1, "tableViewId"),
    t("\">\n  "), i(2, ""),
    t("\n</TableView>"),
  }),

  -- ImageView
  s("img", {
    t("<ImageView fx:id=\""), i(1, "imageViewId"),
    t("\" fitWidth=\""), i(2, "100"),
    t("\" fitHeight=\""), i(3, "100"),
    t("\" />"),
  }),

  -- WebView
  s("web", {
    t("<WebView fx:id=\""), i(1, "webViewId"),
    t("\">\n  "), i(2, ""),
    t("\n</WebView>"),
  }),

  -- TabPane
  s("tp", {
    t("<TabPane fx:id=\""), i(1, "tabPaneId"),
    t("\">\n  "), i(2, ""),
    t("\n</TabPane>"),
  }),

  -- Tab
  s("tab", {
    t("<Tab text=\""), i(1, "Tab Text"),
    t("\" fx:id=\""), i(2, "tabId"),
    t("\">\n  "), i(3, ""),
    t("\n</Tab>"),
  }),

  -- Anchor constraints shortcut
  s("anchors", {
    t("<children>\n  "), i(1, ""),
    t("\n</children>\n  <AnchorPane.topAnchor>"), i(2, "0.0"),
    t("</AnchorPane.topAnchor>\n  <AnchorPane.bottomAnchor>"), i(3, "0.0"),
    t("</AnchorPane.bottomAnchor>\n  <AnchorPane.leftAnchor>"), i(4, "0.0"),
    t("</AnchorPane.leftAnchor>\n  <AnchorPane.rightAnchor>"), i(5, "0.0"),
    t("</AnchorPane.rightAnchor>"),
  }),
})
