import { BaseCircuit, SaveBaseCircuit } from "./_base";
import { SIDE, USER_MODES, assert } from "../common";
import { BaseCircuitGra } from "./_baseGra";
import { DrawManager } from "../simulation";
import * as PIXI from "pixi.js";
import _ from "lodash";

class CircuitSRFlipflopGra extends BaseCircuitGra {
    readonly circuit!: CircuitSRFlipflop;

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

export interface SaveCircuitSRFlipflop extends SaveBaseCircuit {
    state?: {
        on: boolean;
    };
}

export class CircuitSRFlipflop extends BaseCircuit {
    public on: boolean = false;
    private lastClock: boolean = false;

    static displayName = "SR Flip Flop";
    static type: string = "flipflop-sr";
    readonly type: string = CircuitSRFlipflop.type;

    static pinDef: PinConfig = {
        S: { input: true, output: false, side: SIDE.LEFT },
        CLK: { input: true, output: false, side: SIDE.LEFT, label: "▶" },
        R: { input: true, output: false, side: SIDE.LEFT },
        Q: { input: false, output: true, side: SIDE.RIGHT },
        "~Q": { input: false, output: true, side: SIDE.RIGHT, label: "Q\u0305" }
    };

    constructor() {
        super(CircuitSRFlipflop.pinDef);
    }

    tick() {
        if (this.pins.get("CLK")!.input && !this.lastClock) {
            let s = this.pins.get("S")!.input;
            let r = this.pins.get("R")!.input;
            if (s && r) {
                this.pins.get("Q")!.out = false;
                this.pins.get("~Q")!.out = false;
                return;
            } else {
                if (s) this.on = true;
                if (r) this.on = false;
            }
        }
        this.lastClock = this.pins.get("CLK")!.input;
        this.pins.get("Q")!.out = this.on;
        this.pins.get("~Q")!.out = !this.on;
    }

    drawIn(man: DrawManager) {
        if (this.graphics !== null) {
            return;
        }
        this.graphics = new CircuitSRFlipflopGra(this, man);
    }

    save(includeState: boolean = false): SaveCircuitSRFlipflop {
        let res = super.save(includeState) as SaveCircuitSRFlipflop;
        if (includeState) {
            res.state = {
                on: this.on
            };
        }
        return res;
    }

    load(save: SaveCircuitSRFlipflop) {
        super.load(save, CircuitSRFlipflop.pinDef);
        if (save.state !== undefined) {
            assert(typeof save.state === "object" && typeof save.state.on === "boolean");
            this.on = save.state.on;
            this.pins.get("Q")!.out = this.on;
            this.pins.get("~Q")!.out = !this.on;
        }
    }
}
