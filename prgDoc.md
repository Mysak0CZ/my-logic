# Programátorská dokumentace

## Struktura projektu

Veškerý kód je ve složce `src`.

Přímo v této složce jsou pouze globálně dostupné věci, styly a vstupní bod.

Samotná aplikace je ve složce `src/app`.

Všechny obvody mají vlastní soubor ve složce `src/app/circuits`

## Struktura aplikace

`GameApp` (v `app.ts`) je hlavní třída aplikace, obsahující všechny komponenty. Jedná se o singleton uložený v globláním `theGame`, dostupném z konzole.

`Simulation` je třída ukládající stav světa, tedy existující obvody a velikost světa. Obsahuje `DrawManager` a `NetworkManager`

`DrawManager` zajišťuje možnost pohybovat se ve světě pomocí `pixi-viewport` a také vykreslování jednotlivých obvodů a spojů mezi nimi.

`NetworkManager` se stará o stav jednodlivých spojů. Kolíčky obvodů jsoud do jednotlivých sítí přidávány pomocí rekuzrivního DFS prohledávání.

Soubor `circuitManager.ts` obsahuje seznam všech typů obvodů a umožňuje vytvořit nový obvod podle jména typu. Také se stará o ukládání savů do prohlížeče.

`MenuMaker` je pomocná třída pro snadnější vytváření všech menu - jak hlavního tak pro obvody.

Abstraktní třída `BaseCircuit` slouží jako základ pro všechny obvody.

Libovolný obvod obsahuje:
- pozici `x`, `y` a rotaci `rotation`
- `id` a `simulation` ve které se nachází
- `pins` - seznam kolíčků obvodu, kolíčky jsou třída `Pin`
- `graphics` - třída zastřešující vykreslení obvodu
- funkci `tick` s jeho logikou

`Pin` obvodu obsahuje:
- `id` & `label` - jméno a zobrazené jméno kolíčku
- `isInput` & `isOutput` - zda se jedná o vstupní či výstupní kolíček. Povoleno je i oboje `false` či `true`, ale aktuálně není použito
- `inverted` - inverze vstupu a výstupu
- `out` - hodnota výstupu nastavená obvodem, je bez inverze
- `output` & `input` - zda kolíček aktuálně vysílá či přijímá signál; respektuje inverzi

## Průběh ticku
- Tick je buď spuštěn manuálně nebo automaticky v `GameApp.autoTick` zavoláním `GameApp.tick`
- Zvýší se číslo ticku
- Nejprve proběhne tick `NetworkManager`a, který aktualizuje, zda jsou jednotlivé sítě aktivní
- Poté proběhne tick pro všechny obvody
- Následně proběhne grafická aktualizace všech obvodů
- Nakonec se znovu vykreslí spoje mezi kolíčky a jejich stav

## Grafika
Pro veškerou grafiku je použita knihovna PIXI.js a nadstavba pixi-viewport pro posun ve světě.

Veškeré textury jsou generovány pomocí kódu.
