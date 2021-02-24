# Simulátor logických obvodů

Stavebnice na logické obvody s deterministickými aktualizacemi po ticích.

## Spuštění

Automaticky sestavená verze je k dispozici na [https://mysak0cz.github.io/my-logic/](https://mysak0cz.github.io/my-logic/)

Doporučený prohlížeč: Chrome

## Uživatelská dokumentace

Po načtení je vidět svět pevných rozměrů. V rámci světa se dá pohybovat pomocí tahání myši a kolečka myši

V levém horním rohu lze otevřít hlavní menu. Toto menu obsahuje:

- Režim interakce pomocí myši
  - `Interact` - Aktivuje tlačítka, jinak je ignorován (Zkratka: Shift+I)
  - `Edit` - Umožňije posouvat obvody; Při držení Shift se obvody chytají na skrytou mřížku (Zkratka: Shift+E)
  - `Wire` - Při kliknutí na libovolný kolíček obvodu jej vybereme, po kliknutí na libovolný jiný je buď spojíme nebo rozpojíme podle toho, zda aktuáně jsou spojené.
  Při držení Shift zůstane původní kolíček vybrán (Zkratka: Shift+W)
  - `Delete` - Při kliknutí na obvod jej smaže (Zkratka: Shift+D)
  - `Configure` - Při kliknutí na obvod otevře jeho konfigurační menu
- Rychlost simulace
  - Zadané číslo je pauza v ms mezi ticky. 0 znamená bez pauz, -1 pozastaveno
  - Tlačítko `Tick!` manuálně provede 1 tick. Užitečné při rychlosti -1
  - tick/s ukazuje statistiku, kolik ticků proběhlo v minulé sekundě
- Menu uložení a načtení simulace (Zkratky: Ctrl+S a Ctrl+O)
- Možnost přidat nový obvod. Obvod je umístěn do středu aktuálního zobrazení

## Ukládání / Načítání

Save lze buď pojmenovat a uložit to uložiště prohlížeče, nebo zkopírovat jako text.

Save může obsahovat aktuální stav světa (aktuální stav všech obvodů) nebo pouze jeho rozvržení.

Lze také vypnout kompresi savu, aby byl uložen v čitelné podobě.

Save lze načíst pomocí menu (lze použít kompresovanou i nekompresovanou podobu) nebo pomocí url parametru `?save=` (použito v ukázkách)

## Pricip simulace

Kolíčky jsou buď vstupní nebo výstupní.

Pokud má kolíček více spojení, tyto spoje tvoří jednu síť.

Síť je aktivní, pokud alespoň jeden výstupní kolíček na ni připojen je aktivní.

Vstupní kolíček je aktivní, pokud síť na kterou je připojen je aktivní. Nepřipojený je neaktivní.

Kolíček lze invertovat. V takovém pŕípadě je obrácena logika jak vstupu tak výstupu.

V každém tikcu se nejprve nastaví stav všech sítí a poté proběhne logika všech obvodů

## Příklady

- [Ukázka logiky](https://mysak0cz.github.io/my-logic/?save=N4IgbgpgTgzglgewHYgFwEYA0IDuCoA2AJgBIRwDmAFgC5roAMT2ehRA6nETVfUw9gDGcKIICucGjDSh0MkAA80AFgDMAkAE80AJgBsGmpoAOENCBg5Jg3thoIKFAmdQ0oYiAF9sO+UtRqGtqoOjqGJi4WVjQ2IHYOTi5uHt4gqn5oAKzq2ME6yuGm5s5EcSCCCAT45lAQpanKGQEAHEG6BXYRxQ5wgmUAtghELhrGcEgAwghiSHQhqZlNgbloqgDshZGW1rYg9o7OaMle2HpLOVqrF0ZFqFE7ZfuJR+4nIGtN2W2oqpmbxXUyhUqlBinB+mZUs0lq0Vj8-p1biAqhRegMhi4sCAxpNprNdKkAJww77KDp7Lp3FFo7CDYa6bA4qYzOY6VKMc6kgyIrbRWLxA5JV7suSoUD+L5wsn-KmAoSVap3ABGBA8IHZvjFihUF2CyjCPPM2xiuyeh1cwtSFSQSAgghoiCQ0lQAG0XViAIpxZQ+EAAXUwLp02C9mB9IDkAZdqmwAElvSH-YHMonMM1fVG9Kn0xGky61nG4jmvVHCan0Fj46XsHJMOhgyAS4GyyBfHWNCW-Z4gA)
- [4-bitové počítadlo](https://mysak0cz.github.io/my-logic/?save=N4IgbgpgTgzglgewHYgFwEYA0IDuCoA2AJgBIRwDmAFgC5roAMT2ehRA6nETVfUw9gDGcKIICucGjDSh0MkAA80AVgBsAkAE80AJgDsGmpoAOENCD0wIFALYQkdIQgL5zBOHZABfbDvlLUZR0NbVR9QxMzVAsrW3saABEIQQQiaG9sAGZ-NAAWdWxQzMyI03MAM3djSoRjAFo6HxBcnNR8kN0ATlKokEq4apd6xuxlVvbC3WUeiqqa4YyQVXGCrV1GbCMy6P7B2oaQbDgkSCgaCCIABWPpVABtEAAVEABdJr1x5jWMAA4Z6JgOEkgl4mwQFAoBCi5QAhgQrE0fq1MqtQug-ptIuZAcDQSAaODIdC4QjsJ1xhtvsV-iAXBQ4IJDiAbKkolgQMZjgBhBBiBxoTJNRgUjphbqY7a08EMpkstL0bCcpA8vl0MJeJopJBIZI0RBIW53O7sgCChx02DNL0wxuwACFzfbXjb2VzHSA3dbbSAEu7fV72QBRd3BgPYABi7sjYZAAHF3fGvRafQxDqpsABFZ13ZMJOSYZSZ7O5vyYXJFpPYBLZTCZCs2utPQ6det3RtcgAyAGlDnpW42AEqHH6t8tNzCUrNesednuYPsgKc2sdZzAtkDZafYIeYEeL7OF8fp-dew+z3utw+ryl+U9Fte+A-b4et4-n+ev++UuRe4+r9c-jax47nuU5vEAA)

# Programátorská dokumentace

[prgDoc.md](prgDoc.md)
