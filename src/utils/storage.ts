
export async function get(key: string, defaultValue: any = null) {
    const result = await browser.storage.local.get(key);
    return result[key] ?? defaultValue;
}

export async function set(key: string, value: any) {
    return browser.storage.local.set({ [key]: value });
}

export async function remove(key: string) {
    return browser.storage.local.remove(key);
}


//polyfill for chrome migration (future)
// window.browser = window.browser || window.chrome;
