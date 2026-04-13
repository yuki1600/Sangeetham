import { songs } from '../server/lib/storage.js';

async function test() {
    console.log("Testing songs.list('viewer')...");
    const list = await songs.list('viewer');
    console.log("Count:", list.length);
    if (list.length > 0) {
        console.log("First item sample:", JSON.stringify(list[0], null, 2));
    } else {
        console.log("List is empty!");
        const all = await songs.list('admin');
        console.log("Count for admin:", all.length);
        if (all.length > 0) {
            console.log("Admin first item sample:", JSON.stringify(all[0], null, 2));
        }
    }
}

test();
