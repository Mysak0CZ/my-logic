import * as PIXI from "pixi.js";
import { BaseCircuit, SaveBaseCircuit } from "./_base";
import { SIDE, assert } from "../common";
import { BaseCircuitGra } from "./_baseGra";
import { DrawManager } from "../simulation";
import chroma from "chroma-js";
import { MenuMaker } from "../menuMaker";
import _ from "lodash";

const border = 4;
const rectSize = 2;
const spacing = 1;

class Circuit7SegmentGra extends BaseCircuitGra {
    readonly circuit!: Circuit7Segment;

    constructor(circuit: Circuit7Segment, manager: DrawManager) {
        super(circuit, manager);
    }

    protected mkBody(): PIXI.Graphics {
        const g = new PIXI.Graphics();
        g.beginFill(this.innerColor);
        g.lineStyle(2, this.borderColor);
        g.drawRect(0, 0, this.cirWidth, this.cirHeight);
        g.endFill();
        const spaceY = (this.cirHeight - 2 * border - 2 * rectSize) / 2;
        const spaceX = this.cirWidth - 2 * border - 1 * rectSize;
        const Y1 = border;
        const Y2 = Y1 + rectSize + spaceY;
        const Y3 = Y2 + rectSize + spaceY;
        const X1 = border;
        const X2 = X1 + rectSize + spaceX;
        const colorOn = this.circuit.colorOn.num();
        const colorOff = this.circuit.colorOn.darken(4).num();
        // A
        g.lineStyle(rectSize, this.circuit.on.A ? colorOn : colorOff);
        g.moveTo(X1 + spacing, Y1).lineTo(X2 - spacing, Y1);
        // B
        g.lineStyle(rectSize, this.circuit.on.B ? colorOn : colorOff);
        g.moveTo(X2, Y1 + spacing).lineTo(X2, Y2 - spacing);
        // C
        g.lineStyle(rectSize, this.circuit.on.C ? colorOn : colorOff);
        g.moveTo(X2, Y2 + spacing).lineTo(X2, Y3 - spacing);
        // D
        g.lineStyle(rectSize, this.circuit.on.D ? colorOn : colorOff);
        g.moveTo(X1 + spacing, Y3).lineTo(X2 - spacing, Y3);
        // E
        g.lineStyle(rectSize, this.circuit.on.E ? colorOn : colorOff);
        g.moveTo(X1, Y2 + spacing).lineTo(X1, Y3 - spacing);
        // F
        g.lineStyle(rectSize, this.circuit.on.F ? colorOn : colorOff);
        g.moveTo(X1, Y1 + spacing).lineTo(X1, Y2 - spacing);
        // G
        g.lineStyle(rectSize, this.circuit.on.G ? colorOn : colorOff);
        g.moveTo(X1 + spacing, Y2).lineTo(X2 - spacing, Y2);
        g.zIndex = 1;
        return g;
    }

    update() {
        this.drawPinNames = false;
        this.innerColor = 0x454545;
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

interface SegmentStatus extends Record<string, boolean> {
    A: boolean;
    B: boolean;
    C: boolean;
    D: boolean;
    E: boolean;
    F: boolean;
    G: boolean;
}

export interface SaveCircuit7Segment extends SaveBaseCircuit {
    color: string;
    state?: {
        on: SegmentStatus;
    };
}

export class Circuit7Segment extends BaseCircuit {
    public on: SegmentStatus = {
        A: false,
        B: false,
        C: false,
        D: false,
        E: false,
        F: false,
        G: false
    };

    public colorOn: chroma.Color = chroma("lime");

    static displayName: string = "7-segment display";
    static type: string = "7segment";
    readonly type: string = Circuit7Segment.type;

    static pinDef: PinConfig = {
        A: { input: true, output: false, side: SIDE.LEFT },
        B: { input: true, output: false, side: SIDE.LEFT },
        C: { input: true, output: false, side: SIDE.LEFT },
        D: { input: true, output: false, side: SIDE.LEFT },
        E: { input: true, output: false, side: SIDE.LEFT },
        F: { input: true, output: false, side: SIDE.LEFT },
        G: { input: true, output: false, side: SIDE.LEFT }
    };

    constructor() {
        super(Circuit7Segment.pinDef);
    }

    setColor(color: string): boolean {
        if (!chroma.valid(color)) return false;
        this.colorOn = chroma(color);
        this.needsUpdate = true;
        return true;
    }

    tick(): void {
        let change = false;
        for (const [k, v] of Object.entries(this.on)) {
            const pin = this.pins.get(k)!;
            if (pin.input !== v) {
                this.on[k] = pin.input;
                change = true;
            }
        }
        if (change) this.needsUpdate = true;
    }

    drawIn(man: DrawManager): void {
        if (this.graphics !== null) {
            return;
        }
        this.graphics = new Circuit7SegmentGra(this, man);
    }

    save(includeState: boolean = false): SaveCircuit7Segment {
        const res = super.save(includeState) as SaveCircuit7Segment;
        res.color = this.colorOn.name();
        if (includeState) {
            res.state = {
                on: _.clone(this.on)
            };
        }
        return res;
    }

    load(save: SaveCircuit7Segment): void {
        super.load(save, Circuit7Segment.pinDef);
        assert(typeof save.color === "string" && chroma.valid(save.color));
        this.setColor(save.color);
        if (save.state !== undefined) {
            assert(typeof save.state === "object" && typeof save.state.on === "object");
            for (const i of _.keys(this.on)) {
                assert(typeof save.state.on[i] === "boolean");
                this.on[i] = save.state.on[i];
            }
        }
    }
}
