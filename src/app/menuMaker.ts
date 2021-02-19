export class MenuMaker {
    private root: HTMLDivElement;

    constructor(root: HTMLDivElement) {
        this.root = root;
        this.root.innerHTML = "";
    }

    text(text: string): MenuMaker {
        this.root.append(text);
        return this;
    }

    br(): MenuMaker {
        const elem = document.createElement("br");
        this.root.appendChild(elem);
        return this;
    }

    link(href: (() => void) | string, text: string, setup?: (elem: HTMLAnchorElement) => void): MenuMaker {
        const elem = document.createElement("a");
        elem.innerText = text;
        if (typeof href === "string") {
            elem.href = href;
        } else {
            elem.href = "#";
            elem.onclick = () => {
                href();
                return false;
            };
        }
        this.root.appendChild(elem);
        if (setup !== undefined) setup(elem);
        return this;
    }

    inputNumber(
        value?: number,
        min?: number,
        max?: number,
        enabled: boolean = true,
        onchange?: (value: number, elem: HTMLInputElement) => void,
        setup?: (elem: HTMLInputElement) => void
    ): MenuMaker {
        const elem = document.createElement("input");
        elem.type = "number";
        if (value !== undefined) elem.value = value.toString(10);
        if (min !== undefined) elem.min = min.toString(10);
        if (max !== undefined) elem.max = max.toPrecision(10);
        elem.step = "1";
        if (enabled === false) elem.disabled = true;
        if (onchange !== undefined) {
            elem.onchange = ev => {
                const val = Number.parseInt(elem.value, 10);
                onchange(val, elem);
            };
        }
        this.root.appendChild(elem);
        if (setup !== undefined) setup(elem);
        return this;
    }

    inputSelect(
        options: { [value: string]: string },
        selected?: string,
        enabled: boolean = true,
        onchange?: (value: string) => void,
        setup?: (elem: HTMLSelectElement) => void
    ): MenuMaker {
        const elem = document.createElement("select");
        for (const [k, v] of Object.entries(options)) {
            const opt = document.createElement("option");
            opt.innerText = v;
            opt.value = k;
            if (k === selected) opt.selected = true;
            elem.appendChild(opt);
        }
        if (enabled === false) elem.disabled = true;
        if (onchange !== undefined) {
            elem.onchange = ev => {
                const sel = elem.value;
                onchange(sel);
            };
        }
        this.root.appendChild(elem);
        if (setup !== undefined) setup(elem);
        return this;
    }

    inputText(
        value?: string,
        maxlen?: number,
        enabled: boolean = true,
        onchange?: (value: string) => void,
        setup?: (elem: HTMLInputElement) => void
    ): MenuMaker {
        const elem = document.createElement("input");
        elem.type = "text";
        if (value !== undefined) elem.value = value;
        if (maxlen !== undefined) elem.maxLength = maxlen;
        if (enabled === false) elem.disabled = true;
        if (onchange !== undefined) {
            elem.onchange = e => {
                const val = elem.value;
                onchange(val);
            };
        }
        this.root.appendChild(elem);
        if (setup !== undefined) setup(elem);
        return this;
    }

    inputCheckbox(
        value?: boolean,
        enabled: boolean = true,
        onchange?: (value: boolean) => void,
        setup?: (elem: HTMLInputElement) => void
    ): MenuMaker {
        const elem = document.createElement("input");
        elem.type = "checkbox";
        if (value !== undefined) elem.checked = value;
        if (enabled === false) elem.disabled = true;
        if (onchange !== undefined) {
            elem.onchange = e => {
                const val = elem.checked;
                onchange(val);
            };
        }
        this.root.appendChild(elem);
        if (setup !== undefined) setup(elem);
        return this;
    }

    div(): HTMLDivElement {
        const elem = document.createElement("div");
        this.root.appendChild(elem);
        return elem;
    }
}
