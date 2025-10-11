import { get, set } from '../utils/storage';



browser.runtime.onMessage.addListener(async (message) => {
    if (message.action === "getSavedQueries") {
        return await get('savedQueries', {});
    }

    if (message.action === "saveQuery") {
        const current = await get('savedQueries', {});
        //TODO: Make the saved data more complex and change keying
        //TODO: Be more careful with aggressive assigning of new query
        current[message.name] = message.query;
        await set('savedQueries', current);
        return { success: true };
    }
});

console.log('background script?');
