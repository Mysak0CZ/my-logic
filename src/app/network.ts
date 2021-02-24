import { Pin } from "./circuits/_base";
import { Simulation } from "./simulation";
import { assert } from "./common";

/** Groups connected pins */
export class Network {
	public pins: Pin[] = [];

	private cStat: boolean = false;

	/** Gets current state of the network */
	get active(): boolean {
		return this.cStat;
	}

	/** Adds a pin to the network */
	addPin(pin: Pin): void {
		this.pins.push(pin);
		pin.network = this;
	}

	/** Ticks the network, detecting if any pin outputs true */
	tick(): void {
		this.cStat = this.pins.some(pin => pin.output);
	}
}

/** Handles detection of connected pins */
export class NetworkManager {
	/** Simulation this manager belongs to */
	readonly sim: Simulation;

	/** List of all networks (of graph components) */
	public networks: Network[] = [];

	constructor(sim: Simulation) {
		this.sim = sim;
	}

	/** Recreates all network, updating pin connections */
	recreateNetworks(): void {
		this.networks = [];
		for (const cir of this.sim.circuits.values()) {
			for (const pin of cir.pins.values()) {
				pin.network = null;
			}
		}
		for (const cir of this.sim.circuits.values()) {
			for (const pin of cir.pins.values()) {
				if (pin.network !== null) continue;
				this.connectPin(pin, null);
				this.makeNet(pin);
			}
		}
		this.tick();
	}

	/** Recursive DFS to detect all pins in same component */
	private makeNet(pin: Pin) {
		assert(pin.network !== null);
		pin.links.forEach(other => {
			if (other.network === null) {
				this.connectPin(other, pin.network);
				this.makeNet(other);
			} else {
				assert(pin.network === other.network);
			}
		});
	}

	/** Adds pin to `net` or new network */
	private connectPin(pin: Pin, net: Network | null) {
		assert(pin.network === null);
		if (net === null) {
			net = new Network();
			this.networks.push(net);
		}
		net.addPin(pin);
	}

	/** Ticks all networks */
	tick(): void {
		this.networks.forEach(net => net.tick());
	}
}
