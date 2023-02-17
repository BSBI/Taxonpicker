/**
 *
 * @param {MouseEvent} event
 * @returns {boolean}
 */
export function doubleClickIntercepted(event) {
    if (event.detail && event.detail > 1) {
        event.preventDefault();
        event.stopPropagation();
        return true;
    }

    return false;
}
