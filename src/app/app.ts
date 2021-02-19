import * as PIXI from "pixi.js";
import { USER_MODES, serializeSave, deserializeSave } from "./common";
import { Simulation, DrawManager } from "./simulation";
import { BaseCircuit, Pin } from "./circuits/_base";
import { CircuitManager } from "./circuitManager";
import { makeMainMenu } from "./menus";
import { setGame } from "../globals";

export class GameApp {
	public app: PIXI.Application;
	public readonly simulation;
	public readonly circuitManager = new CircuitManager();
	public readonly interactionManager: PIXI.InteractionManager;

	public readonly activeView: DrawManager;

	private _userMode: USER_MODES = USER_MODES.INTERACT;
	private _selectedPin: Pin | null = null;
	private _selectedCircuit: BaseCircuit | null = null;

	public currentSaveName: string = "";
	public tickCounter: number = 0;

	public shift: boolean = false;

	get selectedPin(): Pin | null {
		return this._selectedPin;
	}

	set selectedPin(pin: Pin | null) {
		const oldPin = this._selectedPin;
		this._selectedPin = pin;
		if (oldPin !== null) oldPin.circuit.update(true);
		if (pin !== null) pin.circuit.update(true);
		if (this.activeView !== null) this.activeView.needsUpdate = true;
	}

	get slectedCircuit(): BaseCircuit | null {
		return this._selectedCircuit;
	}

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

	private _tickSpeed: number | null = null;
	private tickTimer: null | number = null;

	get tickSpeed(): number | null {
		return this._tickSpeed;
	}

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

	get userMode(): USER_MODES {
		return this._userMode;
	}

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

	private onWindowResize() {
		const elem = document.getElementById("main")!;
		const width = elem.clientWidth;
		const height = elem.clientHeight;
		this.app.renderer.resize(width, height);
		this.activeView.viewport.resize(width, height);
	}

	onLinksChanged(): void {
		this.simulation.recreateNetworks();
		this.activeView.tick();
	}

	addCircuit<T extends BaseCircuit>(circuit: T, move: boolean = true): T | null {
		this.simulation.addCircuit(circuit);
		const pos = this.activeView.viewport.center;
		circuit.move(pos.x, pos.y);
		return circuit;
	}

	removeCircuit(circuit: BaseCircuit): void {
		this.simulation.removeCircuit(circuit);
	}

	update(force: boolean = false): void {
		this.simulation.update(force);
	}

	tick(): void {
		this.simulation.tick();
		this.activeView.tick();
		this.tickCounter++;
	}

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

	save(includeState: boolean = false, compress: boolean = true): string {
		return serializeSave(this.simulation.save(includeState), compress, true);
	}

	load(save: string): void {
		const parsedSave = deserializeSave(save);
		this.simulation.load(parsedSave);
	}
}
