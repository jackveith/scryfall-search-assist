
const api: typeof browser | typeof chrome =
    typeof browser !== undefined ? browser
        : typeof chrome !== undefined ? chrome
            : (() => {
                throw new Error("no browser api found.")
            })();

export default api;
