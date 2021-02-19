import { BaseCircuitGra, PinGra } from "./_baseGra";
import { Network } from "../network";
import { DrawManager, Simulation } from "../simulation";
import { SIDE, assert } from "../common";
import _ from "lodash";
import { theGame } from "../../globals";

export interface SaveBaseCircuit {
	x: number;
	y: number;
	r?: number;
	invertedPins?: string[];
	type: string;
	state?: Record<string, any>;
}

export type SavePinConnection = [number, string, number, string];

export class Pin {
	readonly circuit: BaseCircuit;

	public id: string;
	private _label: string | null = null;
	public links: Pin[] = [];

	public network: Network | null = null;

	public isInput: boolean = false;
	public isOutput: boolean = false;
	public out: boolean = false;
	private _inverted: boolean = false;

	public order: number = 0;

	get inverted(): boolean {
		return this._inverted;
	}

	set inverted(val: boolean) {
		this._inverted = val;
		this.circuit.needsUpdate = true;
		theGame.update();
	}

	public side: SIDE = SIDE.LEFT;
	public gra: PinGra | null = null;

	get output(): boolean {
		return this.isOutput && (this._inverted ? !this.out : this.out);
	}

	get input(): boolean {
		return this.isInput && this.network !== null && (this._inverted ? !this.network.active : this.network.active);
	}

	get descriptor(): string {
		return `${this.circuit.id}-${this.id}`;
	}

	get label(): string {
		return this._label !== null ? this._label : this.id;
	}

	set label(label: string) {
		this._label = label;
	}

	get customLabel(): string | null {
		return this._label;
	}

	constructor(id: string, parent: BaseCircuit) {
		this.id = id;
		this.circuit = parent;
	}

	destroy(): void {
		this.unlinkAll();
	}

	unlinkAll(): void {
		this.links.forEach(other => {
			_.remove(other.links, l => l === this);
		});
		this.links = [];
	}

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

export abstract class BaseCircuit {
	graphics: BaseCircuitGra | null = null;

	public x: number = 0;
	public y: number = 0;
	public rotation: number = 0;

	public id: number = -1;
	public simulation: Simulation | null = null;

	public pins: Map<string, Pin> = new Map<string, Pin>();

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

	public needsUpdate: boolean = false;

	static displayName: string = "[ERROR NAME]";
	static type: string = "baseCircuit";
	readonly type: string = BaseCircuit.type;

	constructor(pins: PinConfig = {}) {
		this.applyPinConfig(pins);
	}

	move(x: number, y: number): void {
		this.x = x;
		this.y = y;
		if (this.graphics) this.graphics.move(x, y);
	}

	rotate(rotation: number): void {
		rotation = Math.floor(rotation) % 360;
		if (this.rotation === rotation) return;
		this.rotation = rotation;
		this.needsUpdate = true;
	}

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

	abstract tick(): void;

	update(force: boolean = false): void {
		if ((this.needsUpdate || force) && this.graphics) {
			this.graphics.update();
		}
		this.needsUpdate = false;
	}

	drawIn(man: DrawManager): void {
		if (this.graphics !== null) {
			return;
		}
		this.graphics = new BaseCircuitGra(this, man);
	}

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

	protected getInvertedPins(): string[] {
		return Array.from(this.pins.values())
			.filter(pin => pin.inverted)
			.map(pin => pin.id);
	}

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

	protected setInvertedPins(pins: string[]): void {
		for (const pin of this.pins.values()) {
			pin.inverted = pins.includes(pin.id);
		}
	}

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
