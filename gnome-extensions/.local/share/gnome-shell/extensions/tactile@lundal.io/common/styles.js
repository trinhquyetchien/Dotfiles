import St from "gi://St";
import * as Config from "resource:///org/gnome/shell/misc/config.js";
export class Styles {
    constructor(textColor, borderColor, backgroundColor, textSize, borderSize) {
        this.textColor = textColor;
        this.borderColor = borderColor;
        this.backgroundColor = backgroundColor;
        this.textSize = textSize;
        this.borderSize = borderSize;
    }
    static fromSettings(settings) {
        let textColor = settings.get_string("text-color");
        let borderColor = settings.get_string("border-color");
        let backgroundColor = settings.get_string("background-color");
        if (getGnomeVersion() >= 47 && settings.get_boolean("use-accent-color")) {
            let accentColor = getAccentColor();
            if (accentColor != null) {
                const [r, g, b] = [accentColor.red, accentColor.green, accentColor.blue];
                textColor = toColorString(r, g, b, 1.0);
                borderColor = toColorString(r, g, b, 0.5);
                backgroundColor = toColorString(r, g, b, 0.1);
            }
        }
        const textSize = settings.get_int("text-size");
        const borderSize = settings.get_int("border-size");
        return new Styles(textColor, borderColor, backgroundColor, textSize, borderSize);
    }
}
function toColorString(red, green, blue, alpha) {
    return `rgba(${red},${green},${blue},${alpha})`;
}
function getAccentColor() {
    let context = St.ThemeContext.get_for_stage(global.get_stage());
    let [accentColor] = context.get_accent_color();
    return accentColor;
}
function getGnomeVersion() {
    const [major] = Config.PACKAGE_VERSION.split(".").map((s) => Number(s));
    return major;
}
