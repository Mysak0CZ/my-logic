import * as PIXI from "pixi.js";
import { theGame } from "../../globals";
import { SIDE, USER_MODES, assert } from "../common";
import _ from "lodash";
import { BaseCircuit, Pin } from "./_base";
import { DrawManager } from "../simulation";
import { MenuMaker } from "../menuMaker";

/** Distance between pins */
const SizePerPin = 7;
/** Size of the pin itself */
const pinR = 2;
/** Size of movement snapping grid when using `Shift` key */
const shiftMove = 10;

/** Gets coordinates from direction */
function getDirMat(dir: SIDE): { x: number; y: number } {
	switch (dir) {
		case SIDE.LEFT:
			return { x: 1, y: 0 };
		case SIDE.TOP:
			return { x: 0, y: 1 };
		case SIDE.RIGHT:
			return { x: -1, y: 0 };
		case SIDE.BOTTOM:
			return { x: 0, y: -1 };
		default:
			throw new Error("Invalid side");
	}
}

/** Coordinates of positions for drawing pin polygon */
const pinGOrder = [
	[-1, 0],
	[-1, -1],
	[0, -1],
	[1, -1],
	[1, 0],
	[1, 1],
	[0, 1],
	[-1, 1]
];

/** Graphics of the pin */
export class PinGra {
	/** Generated sprite of the pin */
	public sprite: PIXI.Graphics | null = null;
	/** The circuit this pin belongs to */
	readonly circuit: BaseCircuitGra;
	/** The pin we are drawing */
	readonly pin: Pin;

	/** Shortcut for pin's side */
	get side(): SIDE {
		return this.pin.side;
	}

	constructor(pin: Pin, circuit: BaseCircuitGra) {
		this.circuit = circuit;
		this.pin = pin;
		this.pin.gra = this;
		this.makeGraphics();
	}

	/**
	 * Destroys current graphics on pin destroy or re-draw
	 * @param remove If to remove graphics completely (`false` if we are just redrawing)
	 */
	destroy(remove: boolean = true): void {
		if (this.sprite !== null) {
			this.sprite.destroy({ children: true, texture: true, baseTexture: true });
			this.sprite = null;
		}
		if (remove) {
			this.pin.gra = null;
		}
	}

	/** Event: pin was clicked - (un)select or link pin in wire mode */
	private onTap(e: PIXI.InteractionEvent) {
		if (theGame.userMode === USER_MODES.WIRE) {
			if (theGame.selectedPin === null) {
				theGame.selectedPin = this.pin;
			} else if (theGame.selectedPin === this.pin) {
				// Unselect
				theGame.selectedPin = null;
			} else {
				const o = theGame.selectedPin;
				if (!e.data.originalEvent.shiftKey) theGame.selectedPin = null;
				o.connectTo(this.pin);
			}
		}
	}
	
	/** Generate pin's sprite and register events */
	private makeGraphics() {
		this.destroy(false);
		this.sprite = new PIXI.Graphics();
		this.sprite.interactive = true;
		this.sprite.buttonMode = true;
		this.sprite.lineStyle(1, theGame.selectedPin === this.pin ? 0xdbc72e : 0x303030);
		const dir = getDirMat(this.side);
		this.sprite.moveTo(0, 0);
		this.sprite.lineTo(dir.x * SizePerPin, dir.y * SizePerPin);
		this.sprite.beginFill(this.pin.inverted ? 0xe38800 : 0x404040);
		this.sprite.drawPolygon(_.map(this.makePolygon(), i => i * pinR));
		this.sprite.endFill();
		this.sprite.on("pointerdown", (e: PIXI.InteractionEvent) => {
			if (theGame.userMode === USER_MODES.WIRE) e.stopPropagation();
		});
		this.sprite.on("pointertap", (e: PIXI.InteractionEvent) => {
			this.onTap(e);
		});
	}

	/** Make polygon of the pin */
	private makePolygon(): number[] {
		const tmp: number[] = [0];
		if (this.pin.isOutput) {
			tmp.push(2);
		} else {
			tmp.push(1, 3);
		}
		tmp.push(4);
		if (this.pin.isInput) {
			tmp.push(6);
		} else {
			tmp.push(5, 7);
		}
		const shift = this.side === SIDE.RIGHT ? 2 : this.side === SIDE.BOTTOM ? 4 : this.side === SIDE.LEFT ? 6 : 0;
		return _.concat([], ..._.map(tmp, i => pinGOrder[(i + shift) % 8]));
	}
}

/** Margin on the edge of the world, where circuits can't be moved to */
const MARGIN = 55;

/** Graphics of a circuit */
export class BaseCircuitGra {
	/** Generated sprite of the circuit */
	public sprite: PIXI.Container | null = null;
	/** If the circuit is being moved by user */
	public moving: boolean = false;
	/** List of drawn pins */
	public pins: readonly PinGra[] = [];

	/** The manager used to draw circuit */
	readonly manager: DrawManager;
	/** The circuit this is graphics of */
	readonly circuit: BaseCircuit;

	/** Width of circuit's body */
	protected cirWidth: number = 3 * SizePerPin;
	/** Height of circuit's body */
	protected cirHeight: number = 3 * SizePerPin;

	/** Inner color of circuit's body */
	protected innerColor: number = 0x0384fc;
	/** Border color of circuit's body */
	protected borderColor: number = 0x0373fc;
	/** If pin names are drawn on the body */
	protected drawPinNames: boolean = true;

	constructor(circuit: BaseCircuit, manager: DrawManager) {
		this.manager = manager;
		this.circuit = circuit;
		this.update();
	}

	/** Destroys current graphics of the circuit on circuit deletion */
	destroy(): void {
		if (this.sprite !== null) {
			this.pins.forEach(pin => pin.destroy());
			this.pins = [];
			this.sprite.destroy({ children: true, texture: true, baseTexture: true });
			this.sprite = null;
		}
	}

	/** Event: User started dragging the circuit, used to move in edit mode */
	protected onDragStart(e: PIXI.InteractionEvent): void {
		if (theGame.userMode === USER_MODES.EDIT) {
			e.stopPropagation();
			if (this.sprite !== null) this.sprite.alpha = 0.6;
			this.moving = true;
		}
	}

	/** Event: User stopped dragging the circuit */
	protected onDragEnd(e: PIXI.InteractionEvent): void {
		if (this.sprite !== null) this.sprite.alpha = 1;
		this.moving = false;
	}

	/** Event: User moved the circuit */
	private onDragMove(e: PIXI.InteractionEvent): void {
		if (this.moving && this.sprite !== null) {
			e.stopPropagation();
			const newPos = e.data.getLocalPosition(this.sprite.parent);
			let x = _.clamp(Math.round(newPos.x), MARGIN, this.manager.width - MARGIN);
			let y = _.clamp(Math.round(newPos.y), MARGIN, this.manager.width - MARGIN);
			if (theGame.shift) {
				x = Math.round(x / shiftMove) * shiftMove;
				y = Math.round(y / shiftMove) * shiftMove;
			}
			this.circuit.move(x, y);
		}
	}

	/** Event: User tapped the circuit, used to delete or configure the circuit */
	protected onTap(e: PIXI.InteractionEvent): void {
		if (theGame.userMode === USER_MODES.DELETE) {
			theGame.removeCircuit(this.circuit);
		} else if (theGame.userMode === USER_MODES.CONFIGURE) {
			theGame.slectedCircuit = this.circuit;
		}
	}

	/** Moves the circuit's sprite to different position */
	move(x: number, y: number): void {
		if (this.sprite !== null) this.sprite.position.set(x, y);
		theGame.activeView.tick();
	}

	/** Redraws the circuit graphics */
	update(): void {
		this.drawIn();
		this.move(this.circuit.x, this.circuit.y);
	}

	/** Creates circuit graphics */
	drawIn(): void {
		this.mkTexture();
	}

	/** Generates circuit's body sprite */
	protected mkBody(): PIXI.Graphics {
		const g = new PIXI.Graphics();
		g.beginFill(this.innerColor);
		g.lineStyle(2, this.borderColor);
		g.drawRoundedRect(0, 0, this.cirWidth, this.cirHeight, 3);
		g.endFill();
		g.zIndex = 1;
		return g;
	}

	/** Generates circuit's whole texture, including pins */
	private mkTexture(): void {
		const pc = this.circuit.pins;
		const sides: { [T in SIDE]: number } = {
			[SIDE.TOP]: 0,
			[SIDE.RIGHT]: 0,
			[SIDE.BOTTOM]: 0,
			[SIDE.LEFT]: 0
		};
		// Count how many pins are on different sides
		for (const pin of pc.values()) {
			sides[pin.side]++;
		}
		// Height and width of circuit is based on pin counts (but min 3)
		this.cirHeight = Math.max(
			SizePerPin * 3,
			SizePerPin * (sides[SIDE.LEFT] + 1),
			SizePerPin * (sides[SIDE.RIGHT] + 1)
		);
		this.cirWidth = Math.max(
			SizePerPin * 3,
			SizePerPin * (sides[SIDE.TOP] + 1),
			SizePerPin * (sides[SIDE.BOTTOM] + 1)
		);
		// Main body of the circuit
		if (this.sprite === null) {
			this.sprite = new PIXI.Container();
			this.sprite.interactive = true;
			this.sprite.buttonMode = true;
			this.manager.viewport.addChild(this.sprite);
			this.sprite
				.on("pointerdown", this.onDragStart.bind(this))
				.on("pointerup", this.onDragEnd.bind(this))
				.on("pointerupoutside", this.onDragEnd.bind(this))
				.on("pointermove", this.onDragMove.bind(this))
				.on("pointertap", this.onTap.bind(this));
		} else {
			this.sprite.removeChildren().forEach(c => c.destroy());
		}
		this.sprite.pivot.set(this.cirWidth / 2, this.cirHeight / 2);
		this.sprite.angle = this.circuit.rotation;
		const sides2: { [T in SIDE]: number } = {
			[SIDE.TOP]: 0,
			[SIDE.RIGHT]: 0,
			[SIDE.BOTTOM]: 0,
			[SIDE.LEFT]: 0
		};
		// Draw individual pins
		const pins: PinGra[] = [];
		const pinOrder = _.sortBy(Array.from(pc.values()), pin => pin.order);
		for (const p of pinOrder) {
			const pad =
				((p.side === SIDE.LEFT || p.side === SIDE.RIGHT ? this.cirHeight : this.cirWidth) -
					(sides[p.side] - 1) * SizePerPin) /
				2;
			let x = 0;
			let y = 0;
			const dir = getDirMat(p.side);
			if (p.side === SIDE.LEFT) {
				x = -SizePerPin / 2;
				y = pad + sides2[p.side] * SizePerPin;
			} else if (p.side === SIDE.RIGHT) {
				x = this.cirWidth + SizePerPin / 2;
				y = pad + sides2[p.side] * SizePerPin;
			} else if (p.side === SIDE.TOP) {
				x = pad + sides2[p.side] * SizePerPin;
				y = -SizePerPin / 2;
			} else if (p.side === SIDE.BOTTOM) {
				x = pad + sides2[p.side] * SizePerPin;
				y = this.cirHeight + SizePerPin / 2;
			}
			const label = p.label;
			if (this.drawPinNames && label !== "") {
				const text = new PIXI.Text(label, { fontSize: 40 } as PIXI.TextStyle);
				text.position.set(x + dir.x * SizePerPin * 1, y + dir.y * SizePerPin * 1);
				text.anchor.set(0.5);
				text.angle = -this.circuit.rotation;
				text.scale.set(0.1);
				text.zIndex = 3;
				this.sprite.addChild(text);
			}
			const pin = new PinGra(p, this);
			assert(pin.sprite !== null);
			pin.sprite!.position.set(x, y);
			pin.sprite!.zIndex = 1;
			this.sprite.addChild(pin.sprite!);
			pins.push(pin);
			sides2[p.side]++;
		}
		this.sprite.addChild(this.mkBody());
		this.sprite.sortChildren();
		this.pins = pins;
	}

	/** Creates pins configuration menu (to invert pins) */
	protected makePinOptions(): void {
		const targetPins = document.getElementById("pinConfig") as HTMLDivElement | null;
		if (targetPins === null) throw new Error("Unable to find pinConfig div");
		const pinMenu = new MenuMaker(targetPins);
		pinMenu.text("Pin configuration:").br();
		for (const pin of this.circuit.pins.values()) {
			pinMenu
				.text(`${pin.label}:  Inverted:`)
				.inputCheckbox(pin.inverted, true, negated => (pin.inverted = negated))
				.br();
		}
	}

	/** Creates the whole configuration menu for the circuit. `MenuMaker` is returned for use by derived classes */
	openOptions(): MenuMaker {
		const target = document.getElementById("circuitOptions") as HTMLDivElement | null;
		if (target === null) throw new Error("Unable to find circuitOptions div");
		const menu = new MenuMaker(target);
		this.makePinOptions();
		menu.text("Circuit options").br();
		menu.text(`Id:`)
			.inputNumber(this.circuit.id, undefined, undefined, false)
			.br()
			.text("Rotation:")
			.inputNumber(
				this.circuit.rotation,
				0,
				360,
				true,
				val => this.circuit.rotate(val),
				elem => (elem.step = "10")
			)
			.br();
		theGame.openSidebarRight(true);
		return menu;
	}

	/** Closes the configuration menu */
	closeOptions(): void {
		theGame.openSidebarRight(false);
	}
}
