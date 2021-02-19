import { BaseCircuit, Pin, SaveBaseCircuit } from "./_base";
import { SIDE, assert } from "../common";
import { BaseCircuitGra } from "./_baseGra";
import { DrawManager } from "../simulation";
import * as PIXI from "pixi.js";
import _ from "lodash";
import { MenuMaker } from "../menuMaker";
import { theGame } from "../../globals";

export enum CircuitLogicModes {
	or = 0,
	and = 1,
	xor = 2
}

const LogicModesCount = 3;

const logicTexts: { [T in CircuitLogicModes]: string } = {
	[CircuitLogicModes.or]: "∨",
	[CircuitLogicModes.and]: "∧",
	[CircuitLogicModes.xor]: "⊻"
};

class CircuitLogicGra extends BaseCircuitGra {
	readonly circuit!: CircuitLogic;

	mkBody(): PIXI.Graphics {
		const b = super.mkBody();
		const t = new PIXI.Text(logicTexts[this.circuit.mode], { fontSize: 40 });
		t.position.set(this.cirWidth / 2, this.cirHeight / 2);
		t.anchor.set(0.5);
		t.angle = -this.circuit.rotation;
		t.scale.set(0.3);
		b.addChild(t);
		return b;
	}

	update() {
		this.drawPinNames = false;
		super.update();
	}

	openOptions(): MenuMaker {
		const maker = super.openOptions();
		maker
			.text("Pin count:")
			.inputNumber(this.circuit.getPinCount(), this.circuit.getUsedInputCount(), 64, true, (count, elem) => {
				this.circuit.setPinCount(count);
				this.makePinOptions();
			})
			.br()
			.text("Logic:")
			.inputSelect(
				{
					[CircuitLogicModes.or.toString(10)]: "OR",
					[CircuitLogicModes.and.toString(10)]: "AND",
					[CircuitLogicModes.xor.toString(10)]: "XOR"
				},
				this.circuit.mode.toString(10),
				true,
				mode => (this.circuit.mode = Number.parseInt(mode, 10))
			)
			.br();
		return maker;
	}
}

export interface SaveCircuitLogic extends SaveBaseCircuit {
	mode: CircuitLogicModes;
	pinCount: number;
	state?: {
		on: boolean;
	};
}

export class CircuitLogic extends BaseCircuit {
	private _mode: CircuitLogicModes = CircuitLogicModes.or;
	private pinCount: number = 0;

	private on: boolean = false;

	static displayName: string = "Logic gate";
	static type: string = "logic";
	readonly type: string = CircuitLogic.type;

	get mode(): CircuitLogicModes {
		return this._mode;
	}

	set mode(m: CircuitLogicModes) {
		assert(logicTexts[m] !== undefined);
		this._mode = m;
		this.needsUpdate = true;
		theGame.update();
	}

	setPinCount(cnt: number): boolean {
		if (cnt > this.pinCount) {
			for (let i = this.pinCount + 1; i <= cnt; i++) {
				const id = i.toString(10);
				const pin = new Pin(id, this);
				pin.isInput = true;
				pin.isOutput = false;
				pin.side = SIDE.LEFT;
				this.pins.set(id, pin);
			}
			this.pinCount = cnt;
			this.update(true);
			return true;
		} else if (cnt < this.pinCount) {
			let left = this.pinCount - cnt;
			const ep = _.pickBy(Array.from(this.pins.values()), pin => pin.isInput && pin.links.length === 0);
			if (_.size(ep) < left) return false;
			_.forEach(ep, p => {
				if (left-- <= 0) return;
				this.pins.delete(p.id);
				p.destroy();
			});
			let nx = 1;
			const pins = _.sortBy(
				Array.from(this.pins.values())
					.filter(pin => pin.isInput)
					.map(pin => pin.id),
				i => Number.parseInt(i, 10)
			);
			for (const id of pins) {
				const pin = this.pins.get(id)!;
				const n = nx.toString(10);
				if (id !== n) {
					this.pins.delete(id);
					pin.id = n;
					this.pins.set(n, pin);
				}
				nx++;
			}
			this.pinCount = cnt;
			this.update(true);
			return true;
		} else {
			return false;
		}
	}

	getPinCount(): number {
		return this.pinCount;
	}

	getUsedInputCount(): number {
		return Array.from(this.pins.values()).filter(pin => pin.isInput && pin.links.length > 0).length;
	}

	constructor() {
		super({
			Q: { input: false, output: true, side: SIDE.RIGHT }
		});
		assert(this.setPinCount(2));
	}

	tick(): void {
		let on: boolean = false;
		if (this._mode === CircuitLogicModes.or) {
			on = _.some(Array.from(this.pins.values()), pin => pin.input);
		} else if (this._mode === CircuitLogicModes.and) {
			on = _.every(Array.from(this.pins.values()), pin => !pin.isInput || pin.input);
		} else if (this._mode === CircuitLogicModes.xor) {
			for (const pin of this.pins.values()) {
				if (pin.input) {
					on = !on;
				}
			}
		} else {
			throw new Error("Invalid logic mode");
		}
		this.on = on;
		this.pins.get("Q")!.out = on;
	}

	drawIn(man: DrawManager): void {
		if (this.graphics !== null) {
			return;
		}
		this.graphics = new CircuitLogicGra(this, man);
	}

	save(includeState: boolean = false): SaveCircuitLogic {
		const res = super.save(includeState) as SaveCircuitLogic;
		res.mode = this._mode;
		res.pinCount = this.pinCount;
		if (includeState) {
			res.state = {
				on: this.on
			};
		}
		return res;
	}

	load(save: SaveCircuitLogic): void {
		const pinDef: PinConfig = {
			Q: { input: false, output: true, side: SIDE.RIGHT }
		};
		assert(typeof save.pinCount === "number");
		for (let i = 1; i <= save.pinCount; i++) {
			pinDef[i] = {
				input: true,
				output: false,
				side: SIDE.LEFT
			};
		}
		super.load(save, pinDef);
		assert(typeof save.mode === "number" && save.mode < LogicModesCount);
		this.mode = save.mode;
		this.pinCount = save.pinCount;
		if (save.state !== undefined) {
			assert(typeof save.state === "object" && typeof save.state.on === "boolean");
			this.on = save.state.on;
			this.pins.get("Q")!.out = this.on;
		}
	}
}
