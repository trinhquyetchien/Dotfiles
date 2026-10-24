import { Area } from "../common/area.js";
export function getNumMonitors() {
    return global.workspace_manager.get_active_workspace().get_display().get_n_monitors();
}
export function getWorkAreaForMonitor(monitor) {
    const rect = global.workspace_manager.get_active_workspace().get_work_area_for_monitor(monitor);
    return Area.fromRectangle(rect);
}
export function isEntireWorkAreaWidth(area) {
    const monitors = getNumMonitors();
    for (let i = 0; i < monitors; i++) {
        const workarea = getWorkAreaForMonitor(i);
        if (area.isWithin(workarea) && area.isEqualHorizontally(workarea)) {
            return true;
        }
    }
    return false;
}
export function isEntireWorkAreaHeight(area) {
    const monitors = getNumMonitors();
    for (let i = 0; i < monitors; i++) {
        const workarea = getWorkAreaForMonitor(i);
        if (area.isWithin(workarea) && area.isEqualVertically(workarea)) {
            return true;
        }
    }
    return false;
}
export function getActiveWindow() {
    return global.workspace_manager
        .get_active_workspace()
        .list_windows()
        .find((window) => window.has_focus());
}
