import { GameApp } from "./app/app";
import * as glob from "./globals";
import { prepareMenus } from "./app/menus";

new GameApp(document.getElementById("main")!);

glob.theGame.tickSpeed = 20;

prepareMenus();

// Load from params
{
    const url = new URL(window.location.href);
    const save = url.searchParams.get("save");
    if (save !== null) glob.theGame.load(save);
}
