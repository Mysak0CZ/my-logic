import { BaseCircuit, SaveBaseCircuit } from "./_base";
import { SIDE, assert } from "../common";
import { BaseCircuitGra } from "./_baseGra";
import { DrawManager } from "../simulation";
import * as PIXI from "pixi.js";
import _ from "lodash";

class CircuitTFlipflopGra extends BaseCircuitGra {
    readonly circuit!: CircuitTFlipflop;

    mkBody(): PIXI.Graphics {
        let g = new PIXI.Graphics();
        g.beginFill(this.innerColor);
        g.lineStyle(2, this.borderColor);
        g.drawRect(0, 0, this.cirWidth, this.cirHeight);
        g.endFill();
        g.zIndex = 1;
        return g;
    }
}

export interface SaveCircuitTFlipflop extends SaveBaseCircuit {
    state?: {
        on: boolean;
    };
}

export class CircuitTFlipflop extends BaseCircuit {
    public on: boolean = false;
    private lastClock: boolean = false;

    static displayName: string = "T Flip Flop";
    static type: string = "flipflop-t";
    readonly type: string = CircuitTFlipflop.type;

    static pinDef: PinConfig = {
        T: { input: true, output: false, side: SIDE.LEFT },
        CLK: { input: true, output: false, side: SIDE.LEFT, label: "▶" },
        Q: { input: false, output: true, side: SIDE.RIGHT },
        "~Q": { input: false, output: true, side: SIDE.RIGHT, label: "Q\u0305" },
        S: { input: true, output: false, side: SIDE.TOP },
        R: { input: true, output: false, side: SIDE.BOTTOM }
    };

    constructor() {
        super(CircuitTFlipflop.pinDef);
    }

    tick() {
        if (this.pins.get("R")!.input) {
            this.on = false;
        } else if (this.pins.get("S")!.input) {
            this.on = true;
        } else if (this.pins.get("CLK")!.input && !this.lastClock && this.pins.get("T")!.input) {
            this.on = !this.on;
        }
        this.lastClock = this.pins.get("CLK")!.input;
        this.pins.get("Q")!.out = this.on;
        this.pins.get("~Q")!.out = !this.on;
    }

    drawIn(man: DrawManager) {
        if (this.graphics !== null) {
            return;
        }
        this.graphics = new CircuitTFlipflopGra(this, man);
    }

    save(includeState: boolean = false): SaveCircuitTFlipflop {
        let res = super.save(includeState) as SaveCircuitTFlipflop;
        if (includeState) {
            res.state = {
                on: this.on
            };
        }
        return res;
    }

    load(save: SaveCircuitTFlipflop) {
        super.load(save, CircuitTFlipflop.pinDef);
        if (save.state !== undefined) {
            assert(typeof save.state === "object" && typeof save.state.on === "boolean");
            this.on = save.state.on;
            this.pins.get("Q")!.out = this.on;
            this.pins.get("~Q")!.out = !this.on;
        }
    }
}
