import { BaseCircuit, SaveBaseCircuit } from "./_base";
import { SIDE, USER_MODES, assert } from "../common";
import { BaseCircuitGra } from "./_baseGra";
import { DrawManager } from "../simulation";
import * as PIXI from "pixi.js";
import _ from "lodash";

class CircuitSRLatchGra extends BaseCircuitGra {
    readonly circuit!: CircuitSRLatch;

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

export interface SaveCircuitSRLatch extends SaveBaseCircuit {
    state?: {
        on: boolean;
    };
}

export class CircuitSRLatch extends BaseCircuit {
    public on: boolean = false;

    static displayName: string = "SR Latch";
    static type: string = "latch-sr";
    readonly type: string = CircuitSRLatch.type;

    static pinDef: PinConfig = {
        S: { input: true, output: false, side: SIDE.LEFT },
        R: { input: true, output: false, side: SIDE.LEFT },
        Q: { input: false, output: true, side: SIDE.RIGHT },
        "~Q": { input: false, output: true, side: SIDE.RIGHT, label: "Q\u0305" }
    };

    constructor() {
        super(CircuitSRLatch.pinDef);
    }

    tick() {
        let s = this.pins.get("S")!.input;
        let r = this.pins.get("R")!.input;
        if (s && r) {
            this.pins.get("Q")!.out = false;
            this.pins.get("~Q")!.out = false;
        } else {
            if (s) this.on = true;
            if (r) this.on = false;
            this.pins.get("Q")!.out = this.on;
            this.pins.get("~Q")!.out = !this.on;
        }
    }

    drawIn(man: DrawManager) {
        if (this.graphics !== null) {
            return;
        }
        this.graphics = new CircuitSRLatchGra(this, man);
    }

    save(includeState: boolean = false): SaveCircuitSRLatch {
        let res = super.save(includeState) as SaveCircuitSRLatch;
        if (includeState) {
            res.state = {
                on: this.on
            };
        }
        return res;
    }

    load(save: SaveCircuitSRLatch) {
        super.load(save, CircuitSRLatch.pinDef);
        if (save.state !== undefined) {
            assert(typeof save.state === "object" && typeof save.state.on === "boolean");
            this.on = save.state.on;
            this.pins.get("Q")!.out = this.on;
            this.pins.get("~Q")!.out = !this.on;
        }
    }
}
