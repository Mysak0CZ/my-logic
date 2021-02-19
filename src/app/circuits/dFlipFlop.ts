import { BaseCircuit, SaveBaseCircuit } from "./_base";
import { SIDE, assert } from "../common";
import { BaseCircuitGra } from "./_baseGra";
import { DrawManager } from "../simulation";
import * as PIXI from "pixi.js";
import _ from "lodash";

class CircuitDFlipflopGra extends BaseCircuitGra {
    readonly circuit!: CircuitDFlipflop;

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

export interface SaveCircuitDFlipflop extends SaveBaseCircuit {
    state?: {
        on: boolean;
    };
}

export class CircuitDFlipflop extends BaseCircuit {
    public on: boolean = false;
    private lastClock: boolean = false;

    static displayName: string = "D Flip Flop";
    static type: string = "flipflop-d";
    readonly type: string = CircuitDFlipflop.type;

    static pinDef: PinConfig = {
        D: { input: true, output: false, side: SIDE.LEFT },
        CLK: { input: true, output: false, side: SIDE.LEFT, label: "▶" },
        Q: { input: false, output: true, side: SIDE.RIGHT },
        "~Q": { input: false, output: true, side: SIDE.RIGHT, label: "Q\u0305" },
        S: { input: true, output: false, side: SIDE.TOP },
        R: { input: true, output: false, side: SIDE.BOTTOM }
    };

    constructor() {
        super(CircuitDFlipflop.pinDef);
    }

    tick() {
        if (this.pins.get("R")!.input) {
            this.on = false;
        } else if (this.pins.get("S")!.input) {
            this.on = true;
        } else if (this.pins.get("CLK")!.input && !this.lastClock) {
            this.on = this.pins.get("D")!.input;
        }
        this.lastClock = this.pins.get("CLK")!.input;
        this.pins.get("Q")!.out = this.on;
        this.pins.get("~Q")!.out = !this.on;
    }

    drawIn(man: DrawManager) {
        if (this.graphics !== null) {
            return;
        }
        this.graphics = new CircuitDFlipflopGra(this, man);
    }

    save(includeState: boolean = false): SaveCircuitDFlipflop {
        let res = super.save(includeState) as SaveCircuitDFlipflop;
        if (includeState) {
            res.state = {
                on: this.on
            };
        }
        return res;
    }

    load(save: SaveCircuitDFlipflop) {
        super.load(save, CircuitDFlipflop.pinDef);
        if (save.state !== undefined) {
            assert(typeof save.state === "object" && typeof save.state.on === "boolean");
            this.on = save.state.on;
            this.pins.get("Q")!.out = this.on;
            this.pins.get("~Q")!.out = !this.on;
        }
    }
}
