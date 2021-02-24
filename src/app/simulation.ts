import * as PIXI from "pixi.js";
import * as pixiViewport from "pixi-viewport";
import { BaseCircuit, SaveBaseCircuit, SavePinConnection } from "./circuits/_base";
import { NetworkManager } from "./network";
import { assert, SAVE_VERSION } from "./common";
import _ from "lodash";
import { theGame } from "../globals";
import { GameApp } from "./app";

/** Handles drawing of circuits and connections */
export class DrawManager {
	public viewport: pixiViewport.Viewport;
	/** If the graphics needs to be updated (because circuits moved/changed) */
	public needsUpdate: boolean = true;
	/** 
	 * The connection state should be drawn.
	 * This can be disabled to prevent need to redraw connections each tick.
	 */
	public renderConnectionStates: boolean = true;
	/** The simulation this manager belongs to */
	readonly simulation: Simulation;

	/** Graphics of the world border */
	private border: PIXI.Graphics | null = null;
	/** Graphics of all drawn connections */
	private connections: PIXI.Graphics | null = null;

	constructor(interactionManager: PIXI.InteractionManager, simulation: Simulation) {
		this.simulation = simulation;
		this.viewport = new pixiViewport.Viewport({
			interaction: interactionManager,
			worldHeight: this.simulation.worldHeight,
			worldWidth: this.simulation.worldWidth
		});
		this.viewport
			.drag({ clampWheel: true })
			.wheel({ smooth: 10, percent: 0.1 })
			.bounce({
				ease: "easeOutQuad",
				friction: 0,
				sides: "all",
				time: 500,
				underflow: "center"
			})
			.pinch({ noDrag: false, percent: 2 })
			.decelerate({ friction: 0.7 });
		this.onInnerResize();
	}

	get width(): number {
		return this.simulation.worldWidth;
	}

	get height(): number {
		return this.simulation.worldHeight;
	}

	/** Resizes the viewport on window resize */
	public resize(): void {
		this.viewport.resize(
			window.innerWidth,
			window.innerHeight,
			this.simulation.worldWidth,
			this.simulation.worldHeight
		);
		this.onInnerResize();
	}

	private onInnerResize() {
		if (this.border === null) {
			this.border = this.viewport.addChild(new PIXI.Graphics());
		}
		this.border.clear().lineStyle(10, 0x404040).drawRect(0, 0, this.viewport.worldWidth, this.viewport.worldHeight);
		this.viewport.clampZoom({
			maxHeight: this.simulation.worldHeight * 1.1,
			minHeight: 50
		});
	}

	/** Ticks the manager, redrawing all connections */
	tick(): void {
		if (this.connections === null) {
			this.connections = this.viewport.addChildAt(new PIXI.Graphics(), 0);
			this.needsUpdate = true;
		}
		if (!this.needsUpdate && !this.renderConnectionStates) return;
		const colorOff = this.renderConnectionStates ? 0xa04040 : 0x2b2b2b;
		const colorOffSel = 0xffbf00;
		const colorOn = this.renderConnectionStates ? 0x33ba30 : colorOff;
		const colorOnSel = this.renderConnectionStates ? 0xffdf80 : colorOffSel;
		this.connections.clear();
		const selectedPin = theGame.selectedPin;
		for (const cir of this.simulation.circuits.values()) {
			for (const pin of cir.pins.values()) {
				pin.links.forEach(link => {
					// Only draw one way
					if (link.circuit.id <= cir.id) return;
					const src = this.viewport.toLocal(pin.gra!.sprite!.position, pin.gra!.sprite!.parent);
					const dest = this.viewport.toLocal(link.gra!.sprite!.position, link.gra!.sprite!.parent);
					if (pin === selectedPin || link === selectedPin) {
						this.connections!.lineStyle(2, link.network && link.network.active ? colorOnSel : colorOffSel);
					} else {
						this.connections!.lineStyle(2, link.network && link.network.active ? colorOn : colorOff);
					}

					this.connections!.moveTo(src.x, src.y);
					this.connections!.lineTo(dest.x, dest.y);
				});
			}
		}
		this.needsUpdate = this.renderConnectionStates;
	}
}

/** Simulation save structure */
export interface SaveSimulation {
	version: number;
	worldWidth: number;
	worldHeight: number;
	circuits: { [id: string]: SaveBaseCircuit };
	/** Format: [1-circuit, 1-pin, 2-circuit, 2-pin] */
	connections: SavePinConnection[];
	tick?: number;
}

/** The simulation itself */
export class Simulation {
	/** All circuits in simulation, mapped by their ID */
	public circuits: Map<number, BaseCircuit> = new Map<number, BaseCircuit>();
	/** Next free ID for new circuit */
	private nxCircuitId: number = 1;

	private networkMan: NetworkManager;
	private _worldWidth: number = 1000;
	private _worldHeight: number = 1000;

	public drawManager: DrawManager;

	/** Tick counter, goes up by one each tick */
	private _currentTick: number = 0;
	get currentTick(): number {
		return this._currentTick;
	}

	get worldWidth(): number {
		return this._worldWidth;
	}

	get worldHeight(): number {
		return this._worldHeight;
	}

	/** Resizes the simulation */
	resize(worldWidth: number, worldHeight: number): void {
		this._worldHeight = worldHeight;
		this._worldWidth = worldWidth;
		if (this.drawManager !== null) {
			this.drawManager.resize();
		}
	}

	constructor(game: GameApp) {
		this.networkMan = new NetworkManager(this);
		this.drawManager = new DrawManager(game.interactionManager, this);
	}

	/** Adds new circuit to simulation */
	addCircuit(circuit: BaseCircuit): void {
		circuit.simulation = this;
		circuit.id = this.nxCircuitId++;
		this.circuits.set(circuit.id, circuit);
		if (this.drawManager !== null) {
			circuit.drawIn(this.drawManager);
		}
	}

	/** Deletes circuit */
	removeCircuit(circuit: BaseCircuit): void {
		const id = circuit.id;
		assert(this.circuits.has(id), `Asked to delete circuit id "${id}", but not found`);
		this.circuits.delete(id);
		circuit.destroy();
	}

	/** Finds a circuit in sumulation, or `null` if not found */
	getCircuit(id: number): BaseCircuit | null {
		const circuit = this.circuits.get(id);
		return circuit === undefined ? null : circuit;
	}

	/** Updates all circuits */
	update(force: boolean = false): void {
		for (const c of this.circuits.values()) {
			c.update(force);
		}
	}

	/** Recreates networks after change */
	recreateNetworks(): void {
		this.networkMan.recreateNetworks();
		this.drawManager.needsUpdate = true;
	}

	/** Simulation tick */
	tick(): void {
		this._currentTick++;
		this.networkMan.tick();
		for (const c of this.circuits.values()) {
			c.tick();
		}
		this.update();
	}

	/** Deletes all circuits */
	clear(): void {
		for (const circuit of this.circuits.values()) {
			circuit.destroy();
		}
		this.circuits.clear();
	}

	/** Exports the simulation into a save, optionally including state of simulation */
	save(includeState: boolean = false): SaveSimulation {
		const res: SaveSimulation = {
			version: SAVE_VERSION,
			worldHeight: this.worldHeight,
			worldWidth: this.worldWidth,
			circuits: {},
			connections: []
		};
		this.compactIds();
		this.circuits.forEach((cir, id) => {
			res.circuits[id.toString(10)] = cir.save(includeState);
			res.connections.push(...cir.saveConnections(true));
		});
		// Save state
		if (includeState) {
			res.tick = this._currentTick;
		}
		return res;
	}

	/** Imports the simulation and restores it's state, if present in the save */
	load(save: SaveSimulation): void {
		this.clear();
		assert(typeof save.version === "number");
		assert(save.version <= SAVE_VERSION, "Cannot load newer version of save, get an update");
		if (save.version < SAVE_VERSION) {
			console.warn(`Loading old save, things may not work as intended ${save.version} vs ${SAVE_VERSION}`);
		}
		assert(typeof save.worldHeight === "number" && typeof save.worldWidth === "number");
		this.resize(save.worldWidth, save.worldHeight);
		assert(typeof save.circuits === "object");
		for (const [id, cir] of Object.entries(save.circuits)) {
			const numId = Number.parseInt(id, 10);
			assert(typeof cir.type === "string");
			const circuit = theGame.circuitManager.createCircuit(cir.type);
			if (circuit === null) throw new Error(`Failed to create circuit type ${cir.type}`);
			circuit.simulation = this;
			circuit.id = numId;
			this.circuits.set(circuit.id, circuit);
			circuit.load(cir);
			circuit.drawIn(this.drawManager);
		}
		// Load connections
		assert(Array.isArray(save.connections));
		save.connections.forEach(conn => {
			const circuit = this.getCircuit(conn[0]);
			if (circuit !== null) {
				circuit.loadConnections([conn], false);
			}
		});
		this.compactIds();
		// Load state
		if (save.tick !== undefined) {
			assert(typeof save.tick === "number");
			this._currentTick = save.tick;
		}
		this.networkMan.recreateNetworks();
		this.networkMan.tick();
	}

	/** Renumbers all circuits to compact ids, when circuits were removed */
	compactIds(): void {
		const circuits = Array.from(this.circuits.values());
		this.circuits = new Map<number, BaseCircuit>();
		if (circuits.length === 0) {
			this.nxCircuitId = 1;
			return;
		}
		for (let i = 0; i < circuits.length; i++) {
			circuits[i].id = i + 1;
			this.circuits.set(i + 1, circuits[i]);
		}
		this.nxCircuitId = (_.max(circuits.map(c => c.id)) || 0) + 1;
	}
}
