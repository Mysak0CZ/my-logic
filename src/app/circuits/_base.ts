import { BaseCircuitGra, PinGra } from "./_baseGra";
import { Network } from "../network";
import { DrawManager, Simulation } from "../simulation";
import { SIDE, assert } from "../common";
import _ from "lodash";
import { theGame } from "../../globals";

/** The base save structure for any circuit */
export interface SaveBaseCircuit {
	/** x position of the circuit */
	x: number;
	/** y position of the circuit */
	y: number;
	/** rotation of the circuit (unless 0) */
	r?: number;
	/** List of pins with inversion set (unless empty) */
	invertedPins?: string[];
	/** Type of the circuit */
	type: string;
	/** Current state of the circuit, if any. Arbitrary data defined by circuit type. */
	state?: Record<string, any>;
}

/** Saved pin connection is in format [circuit 1 id, circuit] */
export type SavePinConnection = [number, string, number, string];

/** Class for the pin for circuits to use */
export class Pin {
	/** Circuit the pin is part of */
	readonly circuit: BaseCircuit;

	/** ID (name) of the pin */
	public id: string;
	/** Visible name of the pin (defaults to ID) */
	private _label: string | null = null;
	/** Pins this pin is directly conncted with */
	public links: Pin[] = [];

	/**
	 * Network to which this pin belongs to
	 * @see NetworkManager
	 */
	public network: Network | null = null;

	/** If the pin is input pin */
	public isInput: boolean = false;
	/** If the pin is output pin */
	public isOutput: boolean = false;
	/** Current state of the output (ignored if `isOutput=false`) */
	public out: boolean = false;
	/** If the pin is inverted */
	private _inverted: boolean = false;

	/** Order of the pin on the side of the circuit for drawing */
	public order: number = 0;

	/** If the pin is inverted */
	get inverted(): boolean {
		return this._inverted;
	}

	/** If the pin is inverted */
	set inverted(val: boolean) {
		this._inverted = val;
		this.circuit.needsUpdate = true;
		theGame.update();
	}

	/** On which side of the circuit the pin is */
	public side: SIDE = SIDE.LEFT;
	/** Graphics class for the pin, if drawn */
	public gra: PinGra | null = null;

	/** If the pin is currently outputting true */
	get output(): boolean {
		return this.isOutput && (this._inverted ? !this.out : this.out);
	}

	/** If the pin is currently receiving true */
	get input(): boolean {
		return this.isInput && this.network !== null && (this._inverted ? !this.network.active : this.network.active);
	}

	/** Getter for label to default to id */
	get label(): string {
		return this._label !== null ? this._label : this.id;
	}

	set label(label: string) {
		this._label = label;
	}

	/** Getter for label, no default */
	get customLabel(): string | null {
		return this._label;
	}

	constructor(id: string, parent: BaseCircuit) {
		this.id = id;
		this.circuit = parent;
	}

	/**
	 * When the pin is being destroyed
	 *
	 * Called on circuit destruction
	 */
	destroy(): void {
		this.unlinkAll();
	}

	/** Unlinks the pin from all other pins */
	unlinkAll(): void {
		this.links.forEach(other => {
			_.remove(other.links, l => l === this);
		});
		this.links = [];
	}

	/**
	 * Toggles (or sets) if the pin is connected to another pin
	 * @param other The other pin to connect to
	 * @param targetState if desired state is connected=`true`, not connected=`false`, or toggle=`undefined`
	 */
	connectTo(other: Pin, targetState?: boolean): void {
		if (other.circuit.id === this.circuit.id) return;
		const o = _.findIndex(this.links, l => l === other);
		if (o < 0) {
			// Not connected, connect
			if (targetState === false) return;
			this.links.push(other);
			other.links.push(this);
		} else {
			// Connected, diconnect
			if (targetState === true) return;
			_.remove(this.links, l => l === other);
			_.remove(other.links, l => l === this);
		}
		theGame.onLinksChanged();
	}
}

/** Base class for any circuit */
export abstract class BaseCircuit {
	/** The graphics of circuit, if currently drawn */
	graphics: BaseCircuitGra | null = null;

	/** x position of the circuit */
	public x: number = 0;
	/** y position of the circuit */
	public y: number = 0;
	/** rotation of the circuit */
	public rotation: number = 0;

	/** Internal id of circuit inside simulation */
	public id: number = -1;
	/** The simulation the circuit is part of */
	public simulation: Simulation | null = null;

	/** Map of all pins in format `name: pin` */
	public pins: Map<string, Pin> = new Map<string, Pin>();

	/** Current pin configuration as structure */
	get pinConf(): PinConfig {
		const result: PinConfig = {};
		for (const [id, pin] of this.pins.entries()) {
			result[id] = {
				input: pin.isInput,
				output: pin.isOutput,
				side: pin.side,
				inverted: pin.inverted
			};
			if (pin.customLabel !== null) {
				result[id].label = pin.customLabel;
			}
			if (pin.order !== 0) {
				result[id].order = pin.order;
			}
		}
		return result;
	}

	/** If the graphics of the circuit need to be refreshed */
	public needsUpdate: boolean = false;

	/** Display name of the circuit (mainly for circuit add menu) */
	static displayName: string = "[ERROR NAME]";
	/** Internal name of the circuit (used for saves) */
	static type: string = "baseCircuit";
	/** Internal name of the circuit (used for saves) */
	readonly type: string = BaseCircuit.type;

	constructor(pins: PinConfig = {}) {
		this.applyPinConfig(pins);
	}

	/**
	 * Moves the circuit to another position inside simulation
	 * @param x x position to move to
	 * @param y y position to move to
	 */
	move(x: number, y: number): void {
		this.x = x;
		this.y = y;
		if (this.graphics) this.graphics.move(x, y);
	}

	/** Rotates the circuit */
	rotate(rotation: number): void {
		rotation = Math.floor(rotation) % 360;
		if (this.rotation === rotation) return;
		this.rotation = rotation;
		this.needsUpdate = true;
	}

	/**
	 * When the circuit is being destroyed.
	 * 
	 * Used for all cleanup - removing graphics and links to other circuits
	 */
	destroy(): void {
		if (this.graphics) {
			this.graphics.destroy();
			this.graphics = null;
		}
		this.pins.forEach(pin => pin.destroy());
		this.pins.clear();
		theGame.onLinksChanged();
		theGame.update(true);
	}

	/** Ticks the pin */
	abstract tick(): void;

	/** Updates grahics - if needed or forced */
	update(force: boolean = false): void {
		if ((this.needsUpdate || force) && this.graphics) {
			this.graphics.update();
		}
		this.needsUpdate = false;
	}

	/** Draws the circuit using passed manager. Override to change pin's graphics */
	drawIn(man: DrawManager): void {
		if (this.graphics !== null) {
			return;
		}
		this.graphics = new BaseCircuitGra(this, man);
	}

	/**
	 * Applies new configuration of pins, removing old pins, but keeping connections whenever pin names match
	 * @param config The new configuration to apply
	 */
	protected applyPinConfig(config: PinConfig): void {
		for (const [id, pin] of Array.from(this.pins.entries())) {
			if (config[id] === undefined) {
				pin.destroy();
				this.pins.delete(id);
			}
		}
		for (const [id, conf] of Object.entries(config)) {
			const pin = this.pins.has(id) ? this.pins.get(id)! : new Pin(id, this);
			pin.isInput = conf.input;
			pin.isOutput = conf.output;
			pin.side = conf.side;
			if (conf.label !== undefined) {
				pin.label = conf.label;
			}
			if (conf.order !== undefined) {
				pin.order = conf.order;
			}
			pin.inverted = conf.inverted === true;
			this.pins.set(id, pin);
		}
	}

	/** Gets list of pins that are being inverted */
	protected getInvertedPins(): string[] {
		return Array.from(this.pins.values())
			.filter(pin => pin.inverted)
			.map(pin => pin.id);
	}

	/** Sets the inversion of pins based on their list */
	protected setInvertedPins(pins: string[]): void {
		for (const pin of this.pins.values()) {
			pin.inverted = pins.includes(pin.id);
		}
	}

	/** Serializes list of connections to all circuit pins */
	saveConnections(oneWay: boolean = false): SavePinConnection[] {
		const res: SavePinConnection[] = [];
		for (const pin of this.pins.values()) {
			for (const link of pin.links) {
				if (oneWay && link.circuit.id < this.id) continue;
				res.push([this.id, pin.id, link.circuit.id, link.id]);
			}
		}
		return res;
	}

	/** Connects the circuit to other cirucits based on saved connections */
	loadConnections(connections: SavePinConnection[], unlink: boolean = true): void {
		if (!this.simulation) return;
		if (unlink) {
			for (const pin of this.pins.values()) {
				pin.unlinkAll();
			}
		}
		for (const connection of connections) {
			if (connection[0] !== this.id) {
				console.warn(
					`Attemping to load connections for circuit ${this.id} containing connection ${JSON.stringify(
						connection
					)}`
				);
				continue;
			}
			const pin = this.pins.get(connection[1]);
			if (pin === undefined) continue;
			const other = this.simulation.getCircuit(connection[2]);
			if (other === null) continue;
			const otherPin = other.pins.get(connection[3]);
			if (otherPin === undefined) continue;
			pin.connectTo(otherPin, true);
		}
	}

	/** Serializes the circuit for save */
	save(includeState: boolean = false): SaveBaseCircuit {
		const res: SaveBaseCircuit = {
			x: this.x,
			y: this.y,
			type: this.type
		};
		if (this.rotation !== 0) res.r = this.rotation;
		const invertedPins = this.getInvertedPins();
		if (invertedPins.length > 0) {
			res.invertedPins = invertedPins;
		}
		if (includeState) {
			res.state = {};
		}
		return res;
	}

	/** Load the circuit state from the save */
	load(save: SaveBaseCircuit, pins: PinConfig = {}): void {
		if (save.r !== undefined) {
			assert(typeof save.r === "number");
			this.rotate(save.r);
		}
		this.applyPinConfig(pins);
		if (save.invertedPins !== undefined) {
			assert(typeof save.invertedPins === "object" && save.invertedPins instanceof Array);
			this.setInvertedPins(save.invertedPins);
		}
		assert(typeof save.x === "number" && typeof save.y === "number");
		this.move(save.x, save.y);
	}
}
