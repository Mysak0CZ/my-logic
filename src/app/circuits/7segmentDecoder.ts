import { BaseCircuit, SaveBaseCircuit } from "./_base";
import { SIDE, assert, numberFromBinary } from "../common";
import { BaseCircuitGra } from "./_baseGra";
import { DrawManager } from "../simulation";
import * as PIXI from "pixi.js";
import _ from "lodash";

class Circuit7SegmentDecoderGra extends BaseCircuitGra {
	readonly circuit!: Circuit7SegmentDecoder;

	mkBody(): PIXI.Graphics {
		const g = new PIXI.Graphics();
		g.beginFill(this.innerColor);
		g.lineStyle(2, this.borderColor);
		g.drawRect(0, 0, this.cirWidth, this.cirHeight);
		g.endFill();
		g.zIndex = 1;
		return g;
	}
}

export interface SaveCircuit7SegmentDecoder extends SaveBaseCircuit {
	state?: {
		num: number;
	};
}

const truthTable: {
	[num: number]: number[];
} = {
	0x0: [1, 1, 1, 1, 1, 1, 0],
	0x1: [0, 1, 1, 0, 0, 0, 0],
	0x2: [1, 1, 0, 1, 1, 0, 1],
	0x3: [1, 1, 1, 1, 0, 0, 1],
	0x4: [0, 1, 1, 0, 0, 1, 1],
	0x5: [1, 0, 1, 1, 0, 1, 1],
	0x6: [1, 0, 1, 1, 1, 1, 1],
	0x7: [1, 1, 1, 0, 0, 0, 0],
	0x8: [1, 1, 1, 1, 1, 1, 1],
	0x9: [1, 1, 1, 1, 0, 1, 1],
	0xa: [1, 1, 1, 0, 1, 1, 1],
	0xb: [0, 0, 1, 1, 1, 1, 1],
	0xc: [1, 0, 0, 1, 1, 1, 0],
	0xd: [0, 1, 1, 1, 1, 0, 1],
	0xe: [1, 0, 0, 1, 1, 1, 1],
	0xf: [1, 0, 0, 0, 1, 1, 1]
};

export class Circuit7SegmentDecoder extends BaseCircuit {
	private num: number = -1;

	static displayName: string = "7-segment decoder";
	static type: string = "7segmentDecoder";
	readonly type: string = Circuit7SegmentDecoder.type;

	static pinDef: PinConfig = {
		D0: { input: true, output: false, side: SIDE.LEFT },
		D1: { input: true, output: false, side: SIDE.LEFT },
		D2: { input: true, output: false, side: SIDE.LEFT },
		D3: { input: true, output: false, side: SIDE.LEFT },
		A: { input: false, output: true, side: SIDE.RIGHT },
		B: { input: false, output: true, side: SIDE.RIGHT },
		C: { input: false, output: true, side: SIDE.RIGHT },
		D: { input: false, output: true, side: SIDE.RIGHT },
		E: { input: false, output: true, side: SIDE.RIGHT },
		F: { input: false, output: true, side: SIDE.RIGHT },
		G: { input: false, output: true, side: SIDE.RIGHT }
	};

	constructor() {
		super(Circuit7SegmentDecoder.pinDef);
	}

	private doOutput() {
		const res = truthTable[this.num];
		assert(res !== undefined);
		const pins = [
			this.pins.get("A")!,
			this.pins.get("B")!,
			this.pins.get("C")!,
			this.pins.get("D")!,
			this.pins.get("E")!,
			this.pins.get("F")!,
			this.pins.get("G")!
		];
		for (let i = 0; i < 7; i++) {
			pins[i].out = res[i] > 0;
		}
	}

	tick(): void {
		const num = numberFromBinary(_.map([this.pins.get("D0")!, this.pins.get("D1")!, this.pins.get("D2")!, this.pins.get("D3")!], pin => pin.input));
		if (num !== this.num) {
			this.num = num;
			this.doOutput();
		}
	}

	drawIn(man: DrawManager): void {
		if (this.graphics !== null) {
			return;
		}
		this.graphics = new Circuit7SegmentDecoderGra(this, man);
	}

	save(includeState: boolean = false): SaveCircuit7SegmentDecoder {
		const res = super.save(includeState) as SaveCircuit7SegmentDecoder;
		if (includeState) {
			res.state = {
				num: this.num
			};
		}
		return res;
	}

	load(save: SaveCircuit7SegmentDecoder): void {
		super.load(save, Circuit7SegmentDecoder.pinDef);
		if (save.state !== undefined) {
			this.num = save.state.num;
			assert(typeof this.num === "number" && this.num >= 0 && this.num <= 0xf);
			this.doOutput();
		}
	}
}
