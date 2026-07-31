local M = {}

-- Extensions được xem là ảnh
local IMAGE_EXTENSIONS = {
    png = true,
    jpg = true,
    jpeg = true,
    webp = true,
    gif = true,
    bmp = true,
    tiff = true,
    tif = true,
    avif = true,
}

-- Chuẩn hóa path
local function normalize(path)
    return vim.fs.normalize(path)
end

-- Chuyển path tương đối thành path tuyệt đối
local function absolute(path)
    if path:sub(1, 1) == "/" then
        return normalize(path)
    end

    return normalize(vim.fn.getcwd() .. "/" .. path)
end

-- Lấy tất cả file Markdown
local function find_markdown_files(root)
    local files = {}

    local function scan(dir)
        for name, type in vim.fs.dir(dir) do
            -- Bỏ qua .git và node_modules
            if name ~= ".git" and name ~= "node_modules" then
                local path = dir .. "/" .. name

                if type == "directory" then
                    scan(path)
                elseif type == "file" and name:match("%.md$") then
                    table.insert(files, normalize(path))
                end
            end
        end
    end

    scan(root)

    return files
end

-- Lấy tất cả ảnh trong assets/
local function find_images(root)
    local images = {}

    local function scan(dir)
        for name, type in vim.fs.dir(dir) do
            if name ~= ".git" and name ~= "node_modules" then
                local path = dir .. "/" .. name

                if type == "directory" then
                    scan(path)
                elseif type == "file" then
                    local ext = name:match("%.([^%.]+)$")

                    if ext and IMAGE_EXTENSIONS[ext:lower()] then
                        table.insert(images, normalize(path))
                    end
                end
            end
        end
    end

    if vim.fn.isdirectory(root) == 1 then
        scan(root)
    end

    return images
end

-- Đọc toàn bộ file
local function read_file(path)
    local file = io.open(path, "r")

    if not file then
        return ""
    end

    local content = file:read("*a")
    file:close()

    return content or ""
end

-- Tìm tất cả image reference trong Markdown
local function find_references(markdown_file)
    local content = read_file(markdown_file)
    local references = {}

    local markdown_dir = vim.fs.dirname(markdown_file)

    -- Markdown:
    -- ![text](assets/image.png)
    -- [text](assets/image.png)
    for path in content:gmatch("%b()") do
        local ref = path:sub(2, -2)

        -- Bỏ title phía sau:
        -- (image.png "title")
        ref = ref:gsub("%s+['\"].-$", "")

        -- Bỏ anchor
        ref = ref:gsub("#.*$", "")

        -- Chỉ xử lý local path
        if ref ~= ""
            and not ref:match("^https?://")
            and not ref:match("^data:")
        then
            local absolute_ref

            if ref:sub(1, 1) == "/" then
                absolute_ref = normalize(ref)
            else
                absolute_ref = normalize(markdown_dir .. "/" .. ref)
            end

            references[absolute_ref] = true
        end
    end

    -- HTML:
    -- <img src="assets/image.png">
    for ref in content:gmatch("<img[^>]-src=[\"']([^\"']+)[\"']") do
        if not ref:match("^https?://")
            and not ref:match("^data:")
        then
            local absolute_ref

            if ref:sub(1, 1) == "/" then
                absolute_ref = normalize(ref)
            else
                absolute_ref = normalize(markdown_dir .. "/" .. ref)
            end

            references[absolute_ref] = true
        end
    end

    return references
end

function M.clean_unused_images()
    local cwd = normalize(vim.fn.getcwd())
    local assets_dir = cwd .. "/assets"

    if vim.fn.isdirectory(assets_dir) == 0 then
        vim.notify(
            "assets/ directory not found",
            vim.log.levels.WARN
        )
        return
    end

    vim.notify("Scanning Markdown files...", vim.log.levels.INFO)

    -- 1. Tìm tất cả Markdown
    local markdown_files = find_markdown_files(cwd)

    -- 2. Tìm tất cả ảnh trong assets
    local images = find_images(assets_dir)

    -- 3. Tập hợp tất cả reference
    local referenced = {}

    for _, markdown_file in ipairs(markdown_files) do
        local refs = find_references(markdown_file)

        for path in pairs(refs) do
            referenced[path] = true
        end
    end

    -- 4. Tìm ảnh không được sử dụng
    local unused = {}

    for _, image in ipairs(images) do
        if not referenced[image] then
            table.insert(unused, image)
        end
    end

    -- Không có ảnh rác
    if #unused == 0 then
        vim.notify(
            "No unused images found.",
            vim.log.levels.INFO
        )
        return
    end

    -- 5. Hiển thị danh sách
    print("")
    print("Unused images:")
    print("")

    for _, image in ipairs(unused) do
        print("  " .. vim.fn.fnamemodify(image, ":~:."))
    end

    print("")

    -- 6. Hỏi xác nhận
    local answer = vim.fn.confirm(
        string.format(
            "Delete %d unused image(s)?",
            #unused
        ),
        "&Yes\n&No",
        2
    )

    if answer ~= 1 then
        vim.notify(
            "Cancelled.",
            vim.log.levels.INFO
        )
        return
    end

    -- 7. Xóa
    local deleted = 0

    for _, image in ipairs(unused) do
        local ok, err = os.remove(image)

        if ok then
            deleted = deleted + 1
        else
            vim.notify(
                "Failed to delete: " .. image .. "\n" .. tostring(err),
                vim.log.levels.ERROR
            )
        end
    end

    vim.notify(
        string.format(
            "Deleted %d unused image(s).",
            deleted
        ),
        vim.log.levels.INFO
    )
end

-- Tạo command
vim.api.nvim_create_user_command(
    "CleanUnusedImages",
    function()
        M.clean_unused_images()
    end,
    {
        desc = "Find and delete unused images in assets/",
    }
)

return M
