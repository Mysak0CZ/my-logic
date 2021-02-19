import * as PIXI from "pixi.js";
import { BaseCircuit, SaveBaseCircuit } from "./_base";
import { SIDE, assert } from "../common";
import { BaseCircuitGra } from "./_baseGra";
import { DrawManager } from "../simulation";
import chroma from "chroma-js";
import { MenuMaker } from "../menuMaker";

class CircuitLedGra extends BaseCircuitGra {
	readonly circuit!: CircuitLed;

	constructor(circuit: CircuitLed, manager: DrawManager) {
		super(circuit, manager);
	}

	protected mkBody(): PIXI.Graphics {
		const g = new PIXI.Graphics();
		g.beginFill(this.innerColor);
		g.lineStyle(1.5, this.borderColor);
		assert(this.cirHeight === this.cirWidth);
		const pos = this.cirHeight / 2;
		g.drawCircle(pos, pos, pos);
		g.endFill();
		g.zIndex = 1;
		return g;
	}

	update() {
		this.drawPinNames = false;
		this.innerColor = this.circuit.on ? this.circuit.colorOn.num() : this.circuit.colorOn.darken(4).num();
		this.borderColor = 0x363636;
		super.update();
	}

	openOptions(): MenuMaker {
		const maker = super.openOptions();
		maker
			.text("Color:")
			.inputText(this.circuit.colorOn.name(), undefined, true, color => {
				this.circuit.setColor(color);
			})
			.br();
		return maker;
	}
}

export interface SaveCircuitLed extends SaveBaseCircuit {
	color: string;
	state?: {
		on: boolean;
	};
}

export class CircuitLed extends BaseCircuit {
	public on: boolean = false;

	public colorOn: chroma.Color = chroma("red");

	static displayName: string = "LED";
	static type: string = "led";
	readonly type: string = CircuitLed.type;

	static pinDef: PinConfig = {
		I: { input: true, output: false, side: SIDE.LEFT }
	};

	constructor() {
		super(CircuitLed.pinDef);
	}

	setColor(color: string): boolean {
		if (!chroma.valid(color)) return false;
		this.colorOn = chroma(color);
		this.needsUpdate = true;
		return true;
	}

	tick(): void {
		const on = this.pins.get("I")!.input;
		if (this.on !== on) {
			this.on = on;
			this.needsUpdate = true;
		}
	}

	drawIn(man: DrawManager): void {
		if (this.graphics !== null) {
			return;
		}
		this.graphics = new CircuitLedGra(this, man);
	}

	save(includeState: boolean = false): SaveCircuitLed {
		const res = super.save(includeState) as SaveCircuitLed;
		res.color = this.colorOn.name();
		if (includeState) {
			res.state = {
				on: this.on
			};
		}
		return res;
	}

	load(save: SaveCircuitLed): void {
		super.load(save, CircuitLed.pinDef);
		assert(typeof save.color === "string" && chroma.valid(save.color));
		this.setColor(save.color);
		if (save.state !== undefined) {
			assert(typeof save.state === "object" && typeof save.state.on === "boolean");
			this.on = save.state.on;
		}
	}
}
