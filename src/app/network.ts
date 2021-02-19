import { Pin } from "./circuits/_base";
import { Simulation } from "./simulation";
import { assert } from "./common";

export class Network {
	public pins: Pin[] = [];
	readonly id: number;

	constructor(id: number) {
		this.id = id;
	}

	private cStat: boolean = false;

	get active(): boolean {
		return this.cStat;
	}

	addPin(pin: Pin): void {
		this.pins.push(pin);
		pin.network = this;
	}

	matches(other: Network): boolean {
		if (other.id !== this.id) return false;
		assert(other === this);
		return true;
	}

	tick(): void {
		this.cStat = this.pins.some(pin => pin.output);
	}
}

export class NetworkManager {
	readonly sim: Simulation;

	public networks: Network[] = [];
	private nextNetId: number = 1;

	constructor(sim: Simulation) {
		this.sim = sim;
	}

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

	private makeNet(pin: Pin) {
		assert(pin.network !== null);
		pin.links.forEach(other => {
			if (other.network === null) {
				this.connectPin(other, pin.network);
				this.makeNet(other);
			} else {
				assert(pin.network!.matches(other.network));
			}
		});
	}

	private connectPin(pin: Pin, net: Network | null) {
		assert(pin.network === null);
		if (net === null) {
			net = new Network(this.nextNetId++);
			this.networks.push(net);
		}
		net.addPin(pin);
	}

	tick(): void {
		this.networks.forEach(net => net.tick());
	}
}
