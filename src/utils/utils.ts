
export async function get(key: any, defaultValue = null) {
    const result = await browser.storage.local.get(key);
    return result[key] ?? defaultValue;
}
