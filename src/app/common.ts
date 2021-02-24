import { SaveSimulation } from "./simulation";
import lzstring from "lz-string";

export enum SIDE {
	TOP = 0,
	RIGHT = 1,
	BOTTOM = 2,
	LEFT = 3
}

export enum USER_MODES {
	INTERACT = 0,
	EDIT = 1,
	WIRE = 2,
	DELETE = 3,
	CONFIGURE = 4
}

/** Version of the save; used for forward compatability */
export const SAVE_VERSION: number = 1;

export function assert(result: boolean, msg?: string): void {
	if (result !== true) {
		if (msg !== undefined) {
			throw new Error(msg);
		}
		throw new Error(`Assertion failed`);
	}
}

/** Percent of compressed save size vs uncompressed save size */
export let compressionRatio: number = 100;

export function serializeSave(
	save: SaveSimulation,
	compress: boolean = true,
	forceCompression: boolean = false
): string {
	let str = JSON.stringify(save, undefined, compress ? undefined : 2);
	if (compress) {
		const str2 = lzstring.compressToEncodedURIComponent(str);
		compressionRatio = Math.round((str2.length / str.length) * 100);
		if (forceCompression || str2.length <= str.length) str = str2;
	} else {
		compressionRatio = 100;
	}
	return str;
}

export function deserializeSave(save: string): SaveSimulation {
	let str: string | null = save.trim();
	if (str[0] !== "{") str = lzstring.decompressFromEncodedURIComponent(str);
    assert(str !== null);
	const parsedSave = JSON.parse(str!) as SaveSimulation;
	assert(typeof parsedSave === "object");
	return parsedSave;
}

export function numberFromBinary(binary: boolean[]): number {
	let res = 0;
	let mul = 1;
	for (const i of binary) {
		if (i) res += mul;
		mul *= 2;
	}
	return res;
}
