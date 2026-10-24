export function sumUntil(list, index) {
    return list.reduce((prev, curr, i) => (i < index ? prev + curr : prev), 0);
}
export function sumAll(list) {
    return list.reduce((prev, curr) => prev + curr, 0);
}
