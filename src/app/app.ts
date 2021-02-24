import * as PIXI from "pixi.js";
import { USER_MODES, serializeSave, deserializeSave } from "./common";
import { Simulation, DrawManager } from "./simulation";
import { BaseCircuit, Pin } from "./circuits/_base";
import { CircuitManager } from "./circuitManager";
import { makeMainMenu } from "./menus";
import { setGame } from "../globals";

/**
 * The main class. Houses all componens of application
 */
export class GameApp {
	/** The PIXI application for all graphical things */
	public app: PIXI.Application;
	/** The world simulation */
	public readonly simulation: Simulation;
	/** Manager of known circuit types */
	public readonly circuitManager = new CircuitManager();
	/** PIXI's interaction manager for user events - like clicks and dragging */
	public readonly interactionManager: PIXI.InteractionManager;

	/** Current active view of the simuation */
	public readonly activeView: DrawManager;

	/** Which user interaction mode is currently active */
	private _userMode: USER_MODES = USER_MODES.INTERACT;
	/** Which pin is selected by user (wiring mode) */
	private _selectedPin: Pin | null = null;
	/** Which circuit is selected by user (configuration mode) */
	private _selectedCircuit: BaseCircuit | null = null;

	/** Save name of currently loaded save (to pre-fill into save menu) */
	public currentSaveName: string = "";
	/** Statistics counter of ticks in last second to display speed */
	public tickCounter: number = 0;

	/** If shift key is being held */
	public shift: boolean = false;

	/** Which pin is selected by user (wiring mode) */
	get selectedPin(): Pin | null {
		return this._selectedPin;
	}

	/** Which pin is selected by user (wiring mode) */
	set selectedPin(pin: Pin | null) {
		const oldPin = this._selectedPin;
		this._selectedPin = pin;
		if (oldPin !== null) oldPin.circuit.update(true);
		if (pin !== null) pin.circuit.update(true);
		if (this.activeView !== null) this.activeView.needsUpdate = true;
	}

	/** Which circuit is selected by user (configuration mode) */
	get slectedCircuit(): BaseCircuit | null {
		return this._selectedCircuit;
	}

	/** Which circuit is selected by user (configuration mode) */
	set slectedCircuit(circuit: BaseCircuit | null) {
		const oldCircuit = this._selectedCircuit;
		this._selectedCircuit = circuit;
		if (oldCircuit !== null && oldCircuit.graphics) {
			oldCircuit.graphics.closeOptions();
		}
		if (circuit !== null && circuit.graphics) {
			circuit.graphics.openOptions();
		}
	}

	/** Set pause in ms between ticks */
	private _tickSpeed: number | null = null;
	/** Timer ID of scheduled next tick */
	private tickTimer: null | number = null;

	/** Set pause in ms between ticks */
	get tickSpeed(): number | null {
		return this._tickSpeed;
	}

	/** Set pause in ms between ticks */
	set tickSpeed(sp: number | null) {
		if (this.tickTimer !== null) {
			clearTimeout(this.tickTimer);
			this.tickTimer = null;
		}
		this._tickSpeed = sp;
		if (sp !== null) {
			this.tickTimer = setTimeout(() => this.autoTick(), sp);
		}
	}

	/** Which user interaction mode is currently active */
	get userMode(): USER_MODES {
		return this._userMode;
	}

	/** Which user interaction mode is currently active */
	set userMode(mode: USER_MODES) {
		this._userMode = mode;
		this.selectedPin = null;
		this.slectedCircuit = null;
		this.simulation.update();
		makeMainMenu(document.getElementById("mainMenuDiv") as HTMLDivElement);
	}

	constructor(parent: HTMLElement) {
		setGame(this);
		this.app = new PIXI.Application({
			backgroundColor: 0x606060,
			height: window.innerHeight,
			width: window.innerWidth
		});
		parent.appendChild(this.app.view);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		this.interactionManager = this.app.renderer.plugins.interaction as PIXI.InteractionManager;

		// Init view
		this.simulation = new Simulation(this);
		this.activeView = this.simulation.drawManager;
		this.app.stage.addChildAt(this.activeView.viewport, 0);
		this.activeView.tick();

		// Resize function window
		window.addEventListener("resize", () => this.onWindowResize());
		this.onWindowResize();
	}

	/** When window is resized, resize views too */
	private onWindowResize() {
		const elem = document.getElementById("main")!;
		const width = elem.clientWidth;
		const height = elem.clientHeight;
		this.app.renderer.resize(width, height);
		this.activeView.viewport.resize(width, height);
	}

	/** Update networks and draw them when user changes pin connections */
	onLinksChanged(): void {
		this.simulation.recreateNetworks();
		this.activeView.tick();
	}

	/** Add new circuit into simulation */
	addCircuit<T extends BaseCircuit>(circuit: T, move: boolean = true): T | null {
		this.simulation.addCircuit(circuit);
		const pos = this.activeView.viewport.center;
		circuit.move(pos.x, pos.y);
		return circuit;
	}

	/** Delete circuit */
	removeCircuit(circuit: BaseCircuit): void {
		this.simulation.removeCircuit(circuit);
	}

	/** Updates simulation graphics */
	update(force: boolean = false): void {
		this.simulation.update(force);
	}

	/** Does game tick */
	tick(): void {
		this.simulation.tick();
		this.activeView.tick();
		this.tickCounter++;
	}

	/** Does game tick and scedules next one */
	private autoTick() {
		this.tick();
		if (this._tickSpeed !== null) {
			this.tickTimer = setTimeout(() => this.autoTick(), this._tickSpeed);
		}
	}

	public isSidebarLeftOpen = false;
	openSidebarLeft(open?: boolean): void {
		if (open === undefined) {
			open = !this.isSidebarLeftOpen;
		}
		this.isSidebarLeftOpen = open;
		if (open) {
			document.getElementById("main")!.classList.add("leftOpen");
			document.getElementById("btn")!.classList.add("active");
			document.getElementById("sidebar_left")!.classList.add("visible");
		} else {
			document.getElementById("main")!.classList.remove("leftOpen");
			document.getElementById("btn")!.classList.remove("active");
			document.getElementById("sidebar_left")!.classList.remove("visible");
		}
		this.onWindowResize();
	}

	public isSidebarRightOpen = false;
	openSidebarRight(open?: boolean): void {
		if (open === undefined) {
			open = !this.isSidebarRightOpen;
		}
		this.isSidebarRightOpen = open;
		if (open) {
			document.getElementById("main")!.classList.add("rightOpen");
			document.getElementById("sidebar_right")!.classList.add("visible");
		} else {
			document.getElementById("main")!.classList.remove("rightOpen");
			document.getElementById("sidebar_right")!.classList.remove("visible");
		}
		this.onWindowResize();
	}

	/** Saves the simulation */
	save(includeState: boolean = false, compress: boolean = true): string {
		return serializeSave(this.simulation.save(includeState), compress, true);
	}

	/** Loads the simulation */
	load(save: string): void {
		const parsedSave = deserializeSave(save);
		this.simulation.load(parsedSave);
	}
}
