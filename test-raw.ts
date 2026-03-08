import { createApp } from "./server";

async function run() {
    const app = await createApp();
    app.listen(3002, () => console.log("Raw express listening on 3002"));
}
run();
