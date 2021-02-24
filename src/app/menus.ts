import { MenuMaker } from "./menuMaker";
import { USER_MODES, assert, compressionRatio } from "./common";
import { theGame } from "../globals";
import _ from "lodash";

let tps: HTMLDivElement | null = null;

/** Creates main menu and registers keyboard shortcuts */
export function prepareMenus(): void {
	theGame.circuitManager.setMenuElem(document.getElementById("cirManDiv") as HTMLDivElement);
	const mainMenuDiv = document.getElementById("mainMenuDiv") as HTMLDivElement | null;
	assert(mainMenuDiv !== null);
	makeMainMenu(mainMenuDiv!);
	window.addEventListener("keydown", event => {
		if (event.ctrlKey || event.metaKey) {
			switch (event.key.toLowerCase()) {
				case "s":
					event.preventDefault();
					displaySaveMenu();
					break;
				case "o":
					event.preventDefault();
					displayLoadMenu();
					break;
			}
		} else if (event.shiftKey && document.activeElement === document.body) {
			switch (event.key.toLowerCase()) {
				case "i":
					theGame.userMode = USER_MODES.INTERACT;
					break;
				case "e":
					theGame.userMode = USER_MODES.EDIT;
					break;
				case "w":
					theGame.userMode = USER_MODES.WIRE;
					break;
				case "d":
					theGame.userMode = USER_MODES.DELETE;
					break;
				case "c":
					theGame.userMode = USER_MODES.CONFIGURE;
					break;
			}
		}
		if (event.key === "Escape") {
			if (theGame.isSidebarRightOpen) {
				event.preventDefault();
				theGame.openSidebarRight(false);
				return;
			}
			if (theGame.isSidebarLeftOpen) {
				event.preventDefault();
				theGame.openSidebarLeft(false);
				return;
			}
		}
		if (event.key === "Shift") {
			theGame.shift = true;
		}
	});
	window.addEventListener("keyup", event => {
		if (event.key === "Shift") {
			theGame.shift = false;
		}
	});
	const interval = 1;
	window.setInterval(() => {
		if (tps === null) return;
		tps.innerText = `${(theGame.tickCounter / interval).toFixed(0)} ticks/s`;
		theGame.tickCounter = 0;
	}, interval * 1000);
}

/** Automaticalyl closes main menu on change on small devices */
function onAction() {
	if (window.innerWidth < 480) {
		theGame.openSidebarLeft(false);
	}
}

/** Generates main menu */
export function makeMainMenu(elem: HTMLDivElement): void {
	const maker = new MenuMaker(elem);
	const userModes = {
		[USER_MODES.INTERACT]: "Interact",
		[USER_MODES.EDIT]: "Edit",
		[USER_MODES.WIRE]: "Wire",
		[USER_MODES.DELETE]: "Delete",
		[USER_MODES.CONFIGURE]: "Configure"
	};
	maker
		.text("Mode: ")
		.inputSelect(userModes, theGame.userMode.toString(10), true, mode => {
			theGame.userMode = Number.parseInt(mode, 10);
			onAction();
		})
		.br();
	maker
		.text("Tickspeed: ")
		.inputNumber(theGame.tickSpeed === null ? -1 : theGame.tickSpeed, -1, undefined, true, speed => {
			if (speed < 0) {
				theGame.tickSpeed = null;
			} else {
				theGame.tickSpeed = speed;
			}
			onAction();
		})
		.br()
		.link(() => {
			theGame.tick();
		}, "Tick!")
		.br();
	tps = maker.div();
	maker
		.br()
		.link(() => {
			displaySaveMenu();
			onAction();
		}, "Save")
		.br()
		.link(() => {
			displayLoadMenu();
			onAction();
		}, "Load");
}

/** Generates save menu */
export function displaySaveMenu(): void {
	const circuitOptions = document.getElementById("circuitOptions") as HTMLDivElement;
	assert(circuitOptions !== null);
	document.getElementById("pinConfig")!.innerHTML = "";
	const maker = new MenuMaker(circuitOptions);
	let saveName = theGame.currentSaveName;
	let save = "";
	function saveNamed() {
		makeSave();
		theGame.currentSaveName = saveName;
		theGame.circuitManager.saveSave(saveName, save);
		theGame.openSidebarRight(false);
	}
	maker
		.text("Save as:")
		.br()
		.inputText(
			theGame.currentSaveName,
			64,
			true,
			name => (saveName = name),
			elem => {
				elem.focus();
				elem.onkeypress = e => {
					if (e.key === "Enter" && !e.shiftKey) {
						saveName = elem.value;
						saveNamed();
					}
				};
			}
		)
		.br()
		.link(() => {
			saveNamed();
		}, "Save")
		.br()
		.br()
		.text("Save:")
		.br();
	const d = maker.div();
	const area = document.createElement("textarea");
	area.readOnly = true;
	area.style.minWidth = "100%";
	area.style.maxWidth = "100%";
	area.style.wordBreak = "break-all";
	area.rows = 5;
	area.spellcheck = false;
	d.appendChild(area);
	let includeState = false;
	let compress = true;
	function makeSave() {
		save = theGame.save(includeState, compress);
		area.value = save;
		ratio.innerText = ` (${compressionRatio.toString(10)}%)`;
	}
	maker
		.link(() => {
			area.focus();
			area.select();
			area.setSelectionRange(0, area.value.length);
			document.execCommand("copy");
		}, "Copy")
		.br()
		.br()
		.text("Include current state: ")
		.inputCheckbox(false, true, include => {
			includeState = include;
			makeSave();
		})
		.br()
		.text("Compress save: ")
		.inputCheckbox(true, true, c => {
			compress = c;
			makeSave();
		});
	const ratio = maker.div();
	ratio.style.display = "inline-block";
	maker.br().link(() => {
		makeSave();
	}, "Refresh");
	theGame.openSidebarRight(true);
	makeSave();
}

/** Generates load menu */
export function displayLoadMenu(): void {
	const circuitOptions = document.getElementById("circuitOptions") as HTMLDivElement;
	assert(circuitOptions !== null);
	document.getElementById("pinConfig")!.innerHTML = "";
	const maker = new MenuMaker(circuitOptions);
	maker
		.link(() => {
			theGame.currentSaveName = "";
			theGame.simulation.clear();
			theGame.openSidebarRight(false);
		}, "New simulation")
		.br()
		.br()
		.text("Load:")
		.br();
	const d = maker.div();
	const area = document.createElement("textarea");
	d.appendChild(area);
	area.style.minWidth = "100%";
	area.style.maxWidth = "100%";
	area.style.wordBreak = "break-all";
	area.rows = 5;
	area.spellcheck = false;
	area.onkeypress = e => {
		if (e.key === "Enter" && !e.shiftKey) {
			loadSave();
		}
	};
	function loadSave() {
		theGame.load(area.value);
		theGame.openSidebarRight(false);
	}
	maker
		.br()
		.link(() => {
			loadSave();
		}, "Load")
		.br()
		.br()
		.text("Saves:")
		.br();
	_.forEach(theGame.circuitManager.listSaves(), save => {
		maker
			.link(() => {
				const data = theGame.circuitManager.loadSave(save);
				if (data === null) {
					alert("Failed to load save!");
					return;
				}
				theGame.currentSaveName = save;
				theGame.load(data);
				theGame.openSidebarRight(false);
			}, save)
			.link(
				() => {
					if (confirm(`Delete save ${save}?`)) {
						theGame.circuitManager.deleteSave(save);
						displayLoadMenu();
					}
				},
				"Delete",
				elem => (elem.style.paddingLeft = "25px")
			)
			.br();
	});
	theGame.openSidebarRight(true);
	area.focus();
}
