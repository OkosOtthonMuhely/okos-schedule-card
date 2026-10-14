# Sonoff Schedule Card

Grafikus heti ütemező szerkesztő Home Assistanthoz, **Zigbee2MQTT**-n keresztül csatlakozó termosztátokhoz, amelyeknél az ütemezés napokra bontott szöveges entitás (`HH:mm/hőfok` párok), például a **SONOFF TP-WGZBA**.

Nem kell kézzel gépelni, hogy `00:00/18 06:30/21 22:00/18`: a hetet színezett sávokként látod, és egy koppintással szerkesztheted a napokat.

[English README](README.md)

## Funkciók

- Heti áttekintés: 7 sor, hőfok szerint színezve (a skála a 16–26 °C tartományra széthúzva, hogy a közeli értékek is elváljanak)
- Minden blokkon látszik a hőfok és a kezdési idő, a mai napon az aktuális idő jelölve
- Egy napra koppintva szerkeszthető: időpont, hőfok, új átmenet, törlés (naponta max. 12, az első fixen 00:00)
- A szerkesztett nap egy mentéssel más napokra is másolható
- Ütemezési csoport választó (1/2/3), ha az eszköz kiadja a `schedule_group_to_edit` entitást
- Grafikus beállító entitásválasztóval, YAML-lel is működik
- A HA téma színeit használja (világos/sötét)

Az ütemezés **a termosztátban marad**, így akkor is fut, ha a Home Assistant vagy a Zigbee hálózat leáll. A kártya csak szerkeszti.

## Telepítés

### HACS (egyedi tároló)

1. HACS → ⋮ → **Egyedi tárolók**
2. Add hozzá: `https://github.com/OkosOtthonMuhely/okos-schedule-card`, kategória: **Dashboard**
3. Telepítsd az **Okos Schedule Card**-ot, majd frissítsd a böngészőt

### Kézzel

1. Másold az `okos-schedule-card.js` fájlt a `<config>/www/` mappába (bővítményekben `/homeassistant/www`)
2. Beállítások → Irányítópultok → ⋮ → **Erőforrások** (speciális mód) → add hozzá: `/local/okos-schedule-card.js`, típus: *JavaScript modul*
3. Frissítsd kényszerítve a böngészőt vagy az appot

## Beállítás

A kártyaválasztóból add hozzá (**Termosztát heti ütemező**), és a szerkesztőben válaszd ki bármelyik napi entitást. A többi napot a kártya az entitás nevéből vezeti le.

```yaml
type: custom:okos-schedule-card
entity: text.nappali_termosztat_weekly_schedule_monday
group_entity: select.nappali_termosztat_schedule_group_to_edit  # nem kötelező
name: Nappali                                                    # nem kötelező
```

| Opció | Kötelező | Leírás |
|---|---|---|
| `entity` | igen | Bármelyik `text.*weekly_schedule_<nap>` entitás. Az angol napnévnek szerepelnie kell az entitás azonosítójában, a kártya ezt cseréli a többi naphoz. |
| `group_entity` | nem | `select.*schedule_group_to_edit`. A szokásos névadásnál automatikusan megtalálja. |
| `name` | nem | A kártya címe. |

## Működés

A kártya a hét szöveges entitást olvassa, és `text.set_value` hívással írja. Egy érték például `00:00/18 06:30/21 22:00/18`: minden pár azt jelenti, hogy az adott időponttól ezt a hőfokot tartja. Mentés előtt ellenőrzi a bevitelt (5–30 °C, egyedi időpontok, az első 00:00, legfeljebb 12 elem).

## Kompatibilitás

SONOFF TP-WGZBA-ra készült Zigbee2MQTT-vel. Más eszközökkel is működnie kell, ha ugyanilyen `HH:mm/hőfok` formátumú napi szöveges entitásokat adnak. Eltérő formátumnál a feldolgozót kell átírni (pull request szívesen).

Ha az entitásazonosítókban átnevezted vagy lefordítottad a napneveket, a kártya nem tudja levezetni a többi napot. Nevezd vissza angolra.

## Hibaelhárítás

- *Custom element doesn't exist*: hiányzik az erőforrás, vagy a böngésző régi változatot tart a gyorsítótárban. Ellenőrizd az URL-t, és frissíts kényszerítve.
- *Mentéskor nem történik semmi*: ellenőrizd, hogy az entitás írható-e, és nézd meg a Fejlesztői eszközök → Naplók részt és a böngésző konzolját.

## Licenc

MIT
