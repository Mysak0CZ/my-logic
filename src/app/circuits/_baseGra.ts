import * as PIXI from "pixi.js";
import { theGame } from "../../globals";
import { SIDE, USER_MODES, assert } from "../common";
import _ from "lodash";
import { BaseCircuit, Pin } from "./_base";
import { DrawManager } from "../simulation";
import { MenuMaker } from "../menuMaker";

const SizePerPin = 7;
const pinR = 2;
const shiftMove = 10;

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

export class PinGra {
	public sprite: PIXI.Graphics | null = null;
	readonly circuit: BaseCircuitGra;
	readonly pin: Pin;

	get id(): string {
		return this.pin.id;
	}

	get isInput(): boolean {
		return this.pin.isInput;
	}

	get isOutput(): boolean {
		return this.pin.isOutput;
	}

	get side(): SIDE {
		return this.pin.side;
	}

	constructor(pin: Pin, circuit: BaseCircuitGra) {
		this.circuit = circuit;
		this.pin = pin;
		this.pin.gra = this;
		this.makeGraphics();
	}

	destroy(remove: boolean = true): void {
		if (this.sprite !== null) {
			this.sprite.destroy({ children: true, texture: true, baseTexture: true });
			this.sprite = null;
		}
		if (remove) {
			this.pin.gra = null;
		}
	}

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

	private makePolygon(): number[] {
		const tmp: number[] = [0];
		if (this.isOutput) {
			tmp.push(2);
		} else {
			tmp.push(1, 3);
		}
		tmp.push(4);
		if (this.isInput) {
			tmp.push(6);
		} else {
			tmp.push(5, 7);
		}
		const shift = this.side === SIDE.RIGHT ? 2 : this.side === SIDE.BOTTOM ? 4 : this.side === SIDE.LEFT ? 6 : 0;
		return _.concat([], ..._.map(tmp, i => pinGOrder[(i + shift) % 8]));
	}
}

const MARGIN = 55;

export class BaseCircuitGra {
	public sprite: PIXI.Container | null = null;
	public moving: boolean = false;
	public pins: readonly PinGra[] = [];

	readonly manager: DrawManager;
	readonly circuit: BaseCircuit;

	protected cirWidth: number = 3 * SizePerPin;
	protected cirHeight: number = 3 * SizePerPin;

	protected innerColor: number = 0x0384fc;
	protected borderColor: number = 0x0373fc;
	protected drawPinNames: boolean = true;

	constructor(circuit: BaseCircuit, manager: DrawManager) {
		this.manager = manager;
		this.circuit = circuit;
		this.update();
	}

	destroy(): void {
		if (this.sprite !== null) {
			this.pins.forEach(pin => pin.destroy());
			this.pins = [];
			this.sprite.destroy({ children: true, texture: true, baseTexture: true });
			this.sprite = null;
		}
	}

	protected onDragStart(e: PIXI.InteractionEvent): void {
		if (theGame.userMode === USER_MODES.EDIT) {
			e.stopPropagation();
			if (this.sprite !== null) this.sprite.alpha = 0.6;
			this.moving = true;
		}
	}

	protected onDragEnd(e: PIXI.InteractionEvent): void {
		if (this.sprite !== null) this.sprite.alpha = 1;
		this.moving = false;
	}

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

	protected onTap(e: PIXI.InteractionEvent): void {
		if (theGame.userMode === USER_MODES.DELETE) {
			theGame.removeCircuit(this.circuit);
		} else if (theGame.userMode === USER_MODES.CONFIGURE) {
			theGame.slectedCircuit = this.circuit;
		}
	}

	move(x: number, y: number): void {
		if (this.sprite !== null) this.sprite.position.set(x, y);
		theGame.activeView.tick();
	}

	update(): void {
		this.drawIn();
		this.move(this.circuit.x, this.circuit.y);
	}

	drawIn(): void {
		this.mkTexture();
	}

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

	closeOptions(): void {
		theGame.openSidebarRight(false);
	}

	protected mkBody(): PIXI.Graphics {
		const g = new PIXI.Graphics();
		g.beginFill(this.innerColor);
		g.lineStyle(2, this.borderColor);
		g.drawRoundedRect(0, 0, this.cirWidth, this.cirHeight, 3);
		g.endFill();
		g.zIndex = 1;
		return g;
	}

	private mkTexture(): void {
		const pc = this.circuit.pins;
		const sides: { [T in SIDE]: number } = {
			[SIDE.TOP]: 0,
			[SIDE.RIGHT]: 0,
			[SIDE.BOTTOM]: 0,
			[SIDE.LEFT]: 0
		};
		for (const pin of pc.values()) {
			sides[pin.side]++;
		}
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
}
