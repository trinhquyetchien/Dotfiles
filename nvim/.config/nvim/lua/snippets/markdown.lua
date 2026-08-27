local ls = require("luasnip")

local s = ls.snippet
local t = ls.text_node
local i = ls.insert_node

ls.add_snippets("markdown", {
    s("todo", {
        t("- ["),
        i(1),
        t("] "),
    }),

s("kanji", {
    -- Header
    t("## "),
    i(1, "Kanji"),

    -- On / Kun
    t({
        "",
        "",
        "1. **Âm On:** ",
    }),
    i(2),

    t({
        "",
        "2. **Âm Kun:** ",
    }),
    i(3),

    -- Vocabulary section
    t({
        "",
        "",
        "3. **Từ vựng liên quan**",
        "   - **",
    }),

    -- Word 1
    i(4, "Từ 1"),
    t("**（"),
    i(5, "Hiragana 1"),
    t("）— "),
    i(19, "Nghĩa 1"),
    t(" — "),
    i(6, "Ví dụ 1"),

    -- Word 2
    t({
        "",
        "   - **",
    }),
    i(7, "Từ 2"),
    t("**（"),
    i(8, "Hiragana 2"),
    t("）— "),
    i(20, "Nghĩa 2"),
    t(" — "),
    i(9, "Ví dụ 2"),

    -- Word 3
    t({
        "",
        "   - **",
    }),
    i(10, "Từ 3"),
    t("**（"),
    i(11, "Hiragana 3"),
    t("）— "),
    i(21, "Nghĩa 3"),
    t(" — "),
    i(12, "Ví dụ 3"),

    -- Word 4
    t({
        "",
        "   - **",
    }),
    i(13, "Từ 4"),
    t("**（"),
    i(14, "Hiragana 4"),
    t("）— "),
    i(22, "Nghĩa 4"),
    t(" — "),
    i(15, "Ví dụ 4"),

    -- Word 5
    t({
        "",
        "   - **",
    }),
    i(16, "Từ 5"),
    t("**（"),
    i(17, "Hiragana 5"),
    t("）— "),
    i(23, "Nghĩa 5"),
    t(" — "),
    i(18, "Ví dụ 5"),

    -- Vietnamese section
    t({
        "",
        "",
        "4. **Nghĩa Hán:** ",
    }),
    i(24),

    t({
        "",
        "5. **Nghĩa Việt:** ",
    }),
    i(25),

    t({
        "",
        "",
        "6. **Ghi chú**",
        "   - ",
    }),
    i(26),

    t({
        "",
        "",
        "---",
    }),

    i(0),
})})
