import { sumAll, sumUntil } from "./arrays.js";
export class Area {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    subarea(layout, col, row) {
        return this.shrink(layout.gapsize, layout.gapsize, 0, 0)
            .subareaIgnoreGaps(layout, col, row)
            .shrink(0, 0, layout.gapsize, layout.gapsize);
    }
    subareaIgnoreGaps(layout, col, row) {
        const x = Math.floor(this.x + (this.width * sumUntil(layout.cols, col)) / sumAll(layout.cols));
        const y = Math.floor(this.y + (this.height * sumUntil(layout.rows, row)) / sumAll(layout.rows));
        const width = Math.floor(this.x + (this.width * sumUntil(layout.cols, col + 1)) / sumAll(layout.cols)) - x;
        const height = Math.floor(this.y + (this.height * sumUntil(layout.rows, row + 1)) / sumAll(layout.rows)) - y;
        return new Area(x, y, width, height);
    }
    shrink(top, right, bottom, left) {
        const x = this.x + left;
        const y = this.y + top;
        const width = this.width - left - right;
        const height = this.height - top - bottom;
        return new Area(x, y, width, height);
    }
    combineWith(other) {
        const x = Math.min(this.x, other.x);
        const y = Math.min(this.y, other.y);
        const width = Math.max(this.x + this.width, other.x + other.width) - x;
        const height = Math.max(this.y + this.height, other.y + other.height) - y;
        return new Area(x, y, width, height);
    }
    isWithin(other) {
        return (this.x >= other.x &&
            this.y >= other.y &&
            this.x + this.width <= other.x + other.width &&
            this.y + this.height <= other.y + other.height);
    }
    isEqual(other) {
        return this.x == other.x && this.y == other.y && this.width == other.width && this.height == other.height;
    }
    isEqualHorizontally(other) {
        return this.x == other.x && this.width == other.width;
    }
    isEqualVertically(other) {
        return this.y == other.y && this.height == other.height;
    }
    stringify() {
        return `{ x: ${this.x}, y: ${this.y}, width: ${this.width}, height: ${this.height} }`;
    }
    static fromRectangle(rect) {
        return new Area(rect.x, rect.y, rect.width, rect.height);
    }
}
