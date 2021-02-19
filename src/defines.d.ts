interface PinInfo {
    input: boolean;
    output: boolean;
    side: import("./app/common").SIDE;
    label?: string;
    inverted?: boolean;
    order?: number;
}

type PinConfig = {
    [id: string]: PinInfo;
};