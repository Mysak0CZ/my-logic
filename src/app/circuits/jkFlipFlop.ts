import { BaseCircuit, SaveBaseCircuit } from "./_base";
import { SIDE, USER_MODES, assert } from "../common";
import { BaseCircuitGra } from "./_baseGra";
import { DrawManager } from "../simulation";
import * as PIXI from "pixi.js";
import _ from "lodash";

class CircuitJKFlipflopGra extends BaseCircuitGra {
    readonly circuit!: CircuitJKFlipflop;

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

export interface SaveCircuitJKFlipflop extends SaveBaseCircuit {
    state?: {
        on: boolean;
    };
}

export class CircuitJKFlipflop extends BaseCircuit {
    public on: boolean = false;
    private lastClock: boolean = false;

    static displayName: string = "JK Flip Flop";
    static type: string = "flipflop-jk";
    readonly type: string = CircuitJKFlipflop.type;

    static pinDef: PinConfig = {
        J: { input: true, output: false, side: SIDE.LEFT },
        CLK: { input: true, output: false, side: SIDE.LEFT, label: "▶" },
        K: { input: true, output: false, side: SIDE.LEFT },
        Q: { input: false, output: true, side: SIDE.RIGHT },
        "~Q": { input: false, output: true, side: SIDE.RIGHT, label: "Q\u0305" }
    };

    constructor() {
        super(CircuitJKFlipflop.pinDef);
    }

    tick() {
        if (this.pins.get("CLK")!.input && !this.lastClock) {
            let j = this.pins.get("J")!.input;
            let k = this.pins.get("K")!.input;
            if (j && k) {
                this.on = !this.on;
            } else {
                if (j) this.on = true;
                if (k) this.on = false;
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
        this.graphics = new CircuitJKFlipflopGra(this, man);
    }

    save(includeState: boolean = false): SaveCircuitJKFlipflop {
        let res = super.save(includeState) as SaveCircuitJKFlipflop;
        if (includeState) {
            res.state = {
                on: this.on
            };
        }
        return res;
    }

    load(save: SaveCircuitJKFlipflop) {
        super.load(save, CircuitJKFlipflop.pinDef);
        if (save.state !== undefined) {
            assert(typeof save.state === "object" && typeof save.state.on === "boolean");
            this.on = save.state.on;
            this.pins.get("Q")!.out = this.on;
            this.pins.get("~Q")!.out = !this.on;
        }
    }
}
