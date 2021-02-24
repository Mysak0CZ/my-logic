import { BaseCircuit } from "./circuits/_base";
import { theGame } from "../globals";
import { MenuMaker } from "./menuMaker";
import { assert } from "./common";
import _ from "lodash";
import { CircuitSwitch } from "./circuits/switch";
import { CircuitLed } from "./circuits/led";
import { CircuitLogic } from "./circuits/logic";
import { CircuitSRLatch } from "./circuits/srLatch";
import { CircuitSRFlipflop } from "./circuits/srFlipFlop";
import { CircuitJKFlipflop } from "./circuits/jkFlipFlop";
import { CircuitClock } from "./circuits/clock";
import { CircuitDFlipflop } from "./circuits/dFlipFlop";
import { CircuitTFlipflop } from "./circuits/tFlipFlop";
import { Circuit7Segment } from "./circuits/7segment";
import { Circuit7SegmentDecoder } from "./circuits/7segmentDecoder";

interface CirDef {
	new (): BaseCircuit;
	type: string;
	displayName: string;
}

/** List of all circuit types */
const _baseCircuits: CirDef[] = [
	CircuitSwitch,
	CircuitLed,
	CircuitLogic,
	CircuitSRLatch,
	CircuitSRFlipflop,
	CircuitJKFlipflop,
	CircuitDFlipflop,
	CircuitTFlipflop,
	CircuitClock,
	Circuit7Segment,
	Circuit7SegmentDecoder
];

export const baseCircuits: Record<string, CirDef> = {};

_baseCircuits.forEach(circuit => {
	baseCircuits[circuit.type] = circuit;
});

/** Name of localstorage variable for array of saves */
const StorageListName = "savedCircuits";
/** Name of localstorage variable prefix for saves */
const StorageCircuitPrefix = "save-";

/** Handles in-browser saves and circuit types */
export class CircuitManager {
	private menuElem: HTMLDivElement | null = null;

	/** Creates a circuit based on the type name */
	createCircuit(circuitName: string): BaseCircuit | null {
		const cir = baseCircuits[circuitName];
		if (cir === undefined) {
			console.error("Unknown base circuit: ", JSON.stringify(circuitName));
			return null;
		}
		return new cir();
	}

	/** Saves the main menu element. Used by prepare menus */
	setMenuElem(elem: HTMLDivElement): void {
		this.menuElem = elem;
		this.update();
	}

	/** Updates the circuits menu */
	update(): void {
		if (this.menuElem === null) return;
		const maker = new MenuMaker(this.menuElem);
		maker.text("Base circuits:").br();
		for (const [i, def] of Object.entries(baseCircuits)) {
			const name = def.displayName;
			maker
				.link(() => {
					const cir = this.createCircuit(i);
					if (cir !== null) theGame.addCircuit(cir);
				}, name)
				.br();
		}
	}

	/** Gets list of saves saved in browser */
	listSaves(): string[] {
		const dat = window.localStorage.getItem(StorageListName);
		if (dat === null) return [];
		const res = JSON.parse(dat) as string[];
		assert(Array.isArray(res));
		return res;
	}

	/** Saves list of saves into browser's storage */
	private storeSaves(saves: string[]): void {
		window.localStorage.setItem(StorageListName, JSON.stringify(saves));
	}

	/** Saves a save into browser's storage */
	saveSave(name: string, save: string): void {
		const saves = this.listSaves();
		if (!_.includes(saves, name)) {
			saves.push(name);
			this.storeSaves(saves.sort());
		}
		window.localStorage.setItem(StorageCircuitPrefix + name, save);
	}

	/** Loads a save from browser's storage */
	loadSave(name: string): string | null {
		return window.localStorage.getItem(StorageCircuitPrefix + name);
	}

	/** Deletes a save inside browser's storage */
	deleteSave(name: string): void {
		let saves = this.listSaves();
		if (_.includes(saves, name)) {
			saves = _.remove(saves, i => i !== name);
			this.storeSaves(saves);
		}
		window.localStorage.removeItem(StorageCircuitPrefix + name);
	}
}
