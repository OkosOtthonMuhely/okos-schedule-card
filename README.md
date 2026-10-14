# Sonoff Schedule Card

A graphical weekly schedule editor for Home Assistant, built for thermostats exposed through **Zigbee2MQTT** whose schedule is a text entity per weekday (`HH:mm/temperature` pairs), such as the **SONOFF TP-WGZBA**.

Instead of typing `00:00/18 06:30/21 22:00/18` by hand, you see the whole week as colour-coded bars and edit a day with a tap.

[Magyar leírás / Hungarian README](README.hu.md)

## Features

- Weekly overview: 7 rows, colour-coded by temperature (scale stretched over 16–26 °C so close values stay distinguishable)
- Temperature and start time shown on each block, marker for the current time on today's row
- Tap a day to edit transitions: time, temperature, add, delete (max. 12 per day, first one fixed at 00:00)
- Copy the edited day to other days in one save
- Schedule group selector (1/2/3) when the device exposes `schedule_group_to_edit`
- Visual config editor with an entity picker, YAML works too
- Uses your Home Assistant theme variables (light/dark)

The schedule stays **inside the thermostat**, so it keeps running even if Home Assistant or the Zigbee network is down. The card only edits it.

## Installation

### HACS (custom repository)

1. HACS → ⋮ → **Custom repositories**
2. Add `https://github.com/OkosOtthonMuhely/okos-schedule-card`, category **Dashboard**
3. Install **Okos Schedule Card** and reload the browser

### Manual

1. Copy `okos-schedule-card.js` to `<config>/www/` (shown as `/homeassistant/www` in add-ons)
2. Settings → Dashboards → ⋮ → **Resources** (advanced mode) → add `/local/okos-schedule-card.js` as *JavaScript module*
3. Hard-refresh the browser or the app

## Configuration

Add the card from the dashboard card picker (**Termosztát heti ütemező** / Okos Schedule Card) and pick any one of the weekday entities in the editor. The other days are derived from its name.

```yaml
type: custom:okos-schedule-card
entity: text.living_room_thermostat_weekly_schedule_monday
group_entity: select.living_room_thermostat_schedule_group_to_edit  # optional
name: Living room                                                    # optional
```

| Option | Required | Description |
|---|---|---|
| `entity` | yes | Any `text.*weekly_schedule_<day>` entity. The English weekday name must be part of the entity id; the card replaces it to find the other days. |
| `group_entity` | no | `select.*schedule_group_to_edit`. Auto-detected when it follows the usual naming. |
| `name` | no | Card title. |

## How it works

The card reads and writes the seven text entities with `text.set_value`. A value looks like `00:00/18 06:30/21 22:00/18`: each pair means "from this time, hold this temperature". The card validates the input (5–30 °C, unique times, first entry at 00:00, at most 12 entries) before saving.

## Compatibility

Developed for the SONOFF TP-WGZBA with Zigbee2MQTT. Other devices should work if they expose weekday text entities in the same `HH:mm/temperature` format. Devices with a different format will need a parser change (pull requests welcome).

If the weekday names in your entity ids were renamed or translated, the card cannot derive the other days. Rename them back to the English form.

## Troubleshooting

- *Custom element doesn't exist*: the resource is missing or the browser cache is stale. Check the resource URL and hard-refresh.
- *Nothing happens on save*: check the entity is writable and look at Developer Tools → Logs and the browser console.

## License

MIT
