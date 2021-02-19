export let theGame: import("./app/app").GameApp;

export function setGame(game: import("./app/app").GameApp): void {
    theGame = game;
    // @ts-ignore: expose to console
    window.myGame = theGame;
}
