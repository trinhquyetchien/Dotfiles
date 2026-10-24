export class Layout {
    constructor(cols, rows, gapsize) {
        this.cols = cols;
        this.rows = rows;
        this.gapsize = gapsize;
    }
    static prefix(n) {
        // For legacy reasons, layout 1 does not have a prefix
        if (n === 1) {
            return "";
        }
        return `layout-${n}-`;
    }
    static fromSettings(settings, n) {
        const num_cols = settings.get_int("grid-cols");
        const num_rows = settings.get_int("grid-rows");
        const cols = [];
        const rows = [];
        const prefix = Layout.prefix(n);
        for (let col = 0; col < num_cols; col++) {
            cols.push(settings.get_int(`${prefix}col-${col}`));
        }
        for (let row = 0; row < num_rows; row++) {
            rows.push(settings.get_int(`${prefix}row-${row}`));
        }
        const gapsize = settings.get_int("gap-size");
        return new Layout(cols, rows, gapsize);
    }
}
