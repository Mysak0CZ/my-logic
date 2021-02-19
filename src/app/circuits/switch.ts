import { BaseCircuit, SaveBaseCircuit } from "./_base";
import { SIDE, USER_MODES, assert } from "../common";
import { BaseCircuitGra } from "./_baseGra";
import { DrawManager } from "../simulation";
import { theGame } from "../../globals";
import { MenuMaker } from "../menuMaker";

class CircuitSwitchGra extends BaseCircuitGra {
    readonly circuit!: CircuitSwitch;

    constructor(circuit: CircuitSwitch, manager: DrawManager) {
        super(circuit, manager);
    }

    protected onDragStart(e: PIXI.InteractionEvent) {
        if (theGame.userMode === USER_MODES.INTERACT) {
            e.stopPropagation();
            if (!this.circuit.toggle) {
                this.circuit.on = true;
                this.circuit.needsUpdate = true;
                this.circuit.tick();
                theGame.update();
            }
        } else {
            super.onDragStart(e);
        }
    }

    protected onDragEnd(e: PIXI.InteractionEvent) {
        if (theGame.userMode === USER_MODES.INTERACT && !this.circuit.toggle) {
            e.stopPropagation();
            this.circuit.on = false;
            this.circuit.needsUpdate = true;
            this.circuit.tick();
            theGame.update();
        } else {
            super.onDragEnd(e);
        }
    }

    protected onTap(e: PIXI.InteractionEvent) {
        if (theGame.userMode === USER_MODES.INTERACT && this.circuit.toggle) {
            e.stopPropagation();
            this.circuit.on = !this.circuit.on;
            this.circuit.needsUpdate = true;
            this.circuit.tick();
            theGame.update();
        } else {
            super.onTap(e);
        }
    }

    update() {
        this.innerColor = this.circuit.on ? 0x32bd00 : 0xe81607;
        super.update();
    }

    openOptions(): MenuMaker {
        const maker = super.openOptions();
        maker
            .text("Toggle: ")
            .inputCheckbox(this.circuit.toggle, true, toggle => (this.circuit.toggle = toggle))
            .br();
        return maker;
    }
}

export interface SaveCircuitSwitch extends SaveBaseCircuit {
    toggle: boolean;
    state?: {
        on: boolean;
    };
}

export class CircuitSwitch extends BaseCircuit {
    public on: boolean = false;
    public toggle: boolean = true;

    static displayName: string = "Switch";
    static type: string = "switch";
    readonly type: string = CircuitSwitch.type;

    static pinDef: PinConfig = {
        Q: { input: false, output: true, side: SIDE.RIGHT },
        "~Q": { input: false, output: true, side: SIDE.RIGHT, label: "Q\u0305" }
    };

    constructor() {
        super(CircuitSwitch.pinDef);
    }

    tick(): void {
        this.pins.get("Q")!.out = this.on;
        this.pins.get("~Q")!.out = !this.on;
    }

    drawIn(man: DrawManager): void {
        if (this.graphics !== null) {
            return;
        }
        this.graphics = new CircuitSwitchGra(this, man);
    }

    save(includeState: boolean = false): SaveCircuitSwitch {
        const res = super.save(includeState) as SaveCircuitSwitch;
        res.toggle = this.toggle;
        if (includeState) {
            res.state = {
                on: this.on
            };
        }
        return res;
    }

    load(save: SaveCircuitSwitch): void {
        super.load(save, CircuitSwitch.pinDef);
        assert(typeof save.toggle === "boolean");
        this.toggle = save.toggle;
        if (save.state !== undefined) {
            assert(typeof save.state === "object" && typeof save.state.on === "boolean");
            this.on = save.state.on;
            this.pins.get("Q")!.out = this.on;
            this.pins.get("~Q")!.out = !this.on;
        }
    }
}
