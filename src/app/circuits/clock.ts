import { BaseCircuit, SaveBaseCircuit } from "./_base";
import { SIDE, assert } from "../common";
import { BaseCircuitGra } from "./_baseGra";
import { DrawManager } from "../simulation";
import { MenuMaker } from "../menuMaker";
import * as PIXI from "pixi.js";

class CircuitClockGra extends BaseCircuitGra {
	readonly circuit!: CircuitClock;

	constructor(circuit: CircuitClock, manager: DrawManager) {
		super(circuit, manager);
	}

	mkBody(): PIXI.Graphics {
		const b = super.mkBody();
		const t = new PIXI.Text("CLK", { fontSize: 16 });
		t.position.set(this.cirWidth / 2, this.cirHeight / 2);
		t.anchor.set(0.5);
		t.angle = -this.circuit.rotation;
		t.scale.set(0.3);
		b.addChild(t);
		return b;
	}

	update() {
		// this.innerColor = this.circuit.on ? 0x32bd00 : 0xe81607;
		super.update();
	}

	openOptions(): MenuMaker {
		const maker = super.openOptions();
		maker
			.text("On time: ")
			.inputNumber(this.circuit.on, 1, 1000, true, on => (this.circuit.on = on))
			.br()
			.text("Off time: ")
			.inputNumber(this.circuit.off, 1, 1000, true, off => (this.circuit.off = off))
			.br()
			.text("Shift: ")
			.inputNumber(this.circuit.shift, -1000, 1000, true, shift => (this.circuit.shift = shift))
			.br();
		return maker;
	}
}

export interface SaveCircuitClock extends SaveBaseCircuit {
	on: number;
	off: number;
	shift: number;
}

export class CircuitClock extends BaseCircuit {
	public on: number = 1;
	public off: number = 1;
	public shift: number = 0;

	static displayName: string = "Clock";
	static type: string = "clock";
	readonly type: string = CircuitClock.type;

	static pinDef: PinConfig = {
		Q: { input: false, output: true, side: SIDE.RIGHT },
		"~Q": { input: false, output: true, side: SIDE.RIGHT, label: "Q\u0305" }
	};

	constructor() {
		super(CircuitClock.pinDef);
	}

	tick(): void {
		if (!this.simulation) return;
		const sum = this.on + this.off;
		const tick = (this.simulation.currentTick + this.shift) % sum;
		this.pins.get("Q")!.out = tick >= this.off;
		this.pins.get("~Q")!.out = tick < this.off;
	}

	drawIn(man: DrawManager): void {
		if (this.graphics !== null) {
			return;
		}
		this.graphics = new CircuitClockGra(this, man);
	}

	save(includeState: boolean = false): SaveCircuitClock {
		const res = super.save(includeState) as SaveCircuitClock;
		res.on = this.on;
		res.off = this.off;
		res.shift = this.shift;
		return res;
	}

	load(save: SaveCircuitClock): void {
		super.load(save, CircuitClock.pinDef);
		assert(typeof save.on === "number");
		assert(typeof save.off === "number");
		assert(typeof save.shift === "number");
		this.on = save.on;
		this.off = save.off;
		this.shift = save.shift;
	}
}
