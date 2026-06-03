# Space Marines (SM) Data Audit Report

**Audited:** 2026-06-03T06:52:26.189Z
**Matched units:** 298
**Unmatched units:** 125
**Per-unit errors:** 23
**Systematic issues:** 2

## Systematic Issues

| Field | Description | Affected Count |
|-------|-------------|----------------|
| weapon.range | All 1899 weapons have empty range in DB, but 1897 CSV rows have range data. Pipeline bug: reads row["Range"] but CSV header is "range" (lowercase). | 1899 |
| weapon.keywords | All 1899 weapons have empty keywords in DB, but 1402 CSV rows have keyword/special rules data. Pipeline bug: reads row["keywords"] but CSV field is "description". | 1899 |

## Error Summary

### Errors by Field

| Field | Count |
|-------|-------|
| weapon.strength | 5 |
| weapon.ap | 5 |
| weapon.damage | 5 |
| weapon.category | 4 |
| weapon.attacks | 4 |

### Errors by Severity

| Severity | Count |
|----------|-------|
| error | 23 |

### Top 20 Per-Unit Errors (sample)

| Unit | Field | Expected | Actual | Severity |
|------|-------|----------|--------|----------|
| Arjac Rockfist | weapon.category | Ranged | Melee | error |
| Arjac Rockfist | weapon.attacks | 1 | 5 | error |
| Decimus Kill Team | weapon.strength | 4 | 9 | error |
| Decimus Kill Team | weapon.ap | 0 | -2 | error |
| Decimus Kill Team | weapon.damage | 1 | D3 | error |
| Fortis Kill Team | weapon.strength | 4 | 9 | error |
| Fortis Kill Team | weapon.ap | 0 | -2 | error |
| Fortis Kill Team | weapon.damage | 1 | D3 | error |
| Marneus Calgar in Armour of Antilochus | weapon.category | Ranged | Melee | error |
| Marneus Calgar in Armour of Antilochus | weapon.attacks | 4 | 6 | error |
| Marneus Calgar in Armour of Antilochus | weapon.strength | 4 | 8 | error |
| Marneus Calgar in Armour of Antilochus | weapon.ap | -1 | -3 | error |
| Marneus Calgar in Armour of Antilochus | weapon.damage | 2 | 3 | error |
| Roboute Guilliman | weapon.category | Ranged | Melee | error |
| Roboute Guilliman | weapon.attacks | 2 | 7 | error |
| Roboute Guilliman | weapon.strength | 6 | 14 | error |
| Roboute Guilliman | weapon.ap | -2 | -4 | error |
| Roboute Guilliman | weapon.damage | 2 | 4 | error |
| Watch Master | weapon.category | Ranged | Melee | error |
| Watch Master | weapon.attacks | 2 | 6 | error |

## Unmatched Unit Classification

### Summary

| Category | Count |
|----------|-------|
| missing_alias | 79 |
| forge_world | 43 |
| legends | 3 |

### Details

| Unit Name | Category | Evidence |
|-----------|----------|----------|
| Assault Squad | missing_alias | Unit exists in Wahapedia CSV (id: 000000061) but not matched by BSData. Likel... |
| Apothecary on Bike | missing_alias | Unit exists in Wahapedia CSV (id: 000000063) but not matched by BSData. Likel... |
| Assault Squad with Jump Packs | missing_alias | Unit exists in Wahapedia CSV (id: 000000064) but not matched by BSData. Likel... |
| Land Raider Crusader | missing_alias | Unit exists in Wahapedia CSV (id: 000004139) but not matched by BSData. Likel... |
| Land Raider Excelsior | forge_world | Known Forge World / Imperial Armour unit |
| Caestus Assault Ram | forge_world | Known Forge World / Imperial Armour unit |
| Rhino Primaris | missing_alias | Unit exists in Wahapedia CSV (id: 000000085) but not matched by BSData. Likel... |
| Sicaran Venator | forge_world | Known Forge World / Imperial Armour unit |
| Typhon | forge_world | Known Forge World / Imperial Armour unit |
| Ultramarines Honour Guard | missing_alias | Unit exists in Wahapedia CSV (id: 000000095) but not matched by BSData. Likel... |
| Carab Culln The Risen | forge_world | Known Forge World / Imperial Armour unit |
| Tarantula Sentry Battery | forge_world | Known Forge World / Imperial Armour unit |
| Tarantula Air Defence Battery | forge_world | Known Forge World / Imperial Armour unit |
| Relic Terminator Squad | forge_world | Known Forge World / Imperial Armour unit |
| Javelin Attack Speeder | forge_world | Known Forge World / Imperial Armour unit |
| Rapier Carrier | forge_world | Known Forge World / Imperial Armour unit |
| Mortis Dreadnought | forge_world | Known Forge World / Imperial Armour unit |
| Storm Eagle Gunship | forge_world | Known Forge World / Imperial Armour unit |
| Bike Squad | missing_alias | Unit exists in Wahapedia CSV (id: 000000116) but not matched by BSData. Likel... |
| Venerable Dreadnought (Legendary) | legends | Name matches Legends pattern: /\(legendary\)$/i |
| Dreadnought Drop Pod | forge_world | Known Forge World / Imperial Armour unit |
| Sicaran Punisher | forge_world | Known Forge World / Imperial Armour unit |
| Leviathan Dreadnought | forge_world | Known Forge World / Imperial Armour unit |
| Land Speeder Storm | missing_alias | Unit exists in Wahapedia CSV (id: 000000132) but not matched by BSData. Likel... |
| Astartes Servitors | missing_alias | Unit exists in Wahapedia CSV (id: 000000134) but not matched by BSData. Likel... |
| Scout Bike Squad | missing_alias | Unit exists in Wahapedia CSV (id: 000000137) but not matched by BSData. Likel... |
| Hunter | missing_alias | Unit exists in Wahapedia CSV (id: 000000146) but not matched by BSData. Likel... |
| Imperial Space Marine | missing_alias | Unit exists in Wahapedia CSV (id: 000000148) but not matched by BSData. Likel... |
| Captain Tycho | missing_alias | Unit exists in Wahapedia CSV (id: 000000152) but not matched by BSData. Likel... |
| Tycho The Lost | missing_alias | Unit exists in Wahapedia CSV (id: 000000153) but not matched by BSData. Likel... |
| Librarian Dreadnought | missing_alias | Unit exists in Wahapedia CSV (id: 000000154) but not matched by BSData. Likel... |
| Sanguinary Priest on Bike | missing_alias | Unit exists in Wahapedia CSV (id: 000000159) but not matched by BSData. Likel... |
| Brother Corbulo | missing_alias | Unit exists in Wahapedia CSV (id: 000000160) but not matched by BSData. Likel... |
| Furioso Dreadnought | missing_alias | Unit exists in Wahapedia CSV (id: 000000167) but not matched by BSData. Likel... |
| Gabriel Seth | missing_alias | Unit exists in Wahapedia CSV (id: 000000169) but not matched by BSData. Likel... |
| Logan Grimnar On Stormrider | missing_alias | Unit exists in Wahapedia CSV (id: 000000283) but not matched by BSData. Likel... |
| Wolf Lord on Thunderwolf | missing_alias | Unit exists in Wahapedia CSV (id: 000000284) but not matched by BSData. Likel... |
| Krom Dragongaze | missing_alias | Unit exists in Wahapedia CSV (id: 000000286) but not matched by BSData. Likel... |
| Harald Deathwolf | missing_alias | Unit exists in Wahapedia CSV (id: 000000287) but not matched by BSData. Likel... |
| Canis Wolfborn | missing_alias | Unit exists in Wahapedia CSV (id: 000000288) but not matched by BSData. Likel... |
| Wolf Guard Battle Leader In Terminator Armour | missing_alias | Unit exists in Wahapedia CSV (id: 000000300) but not matched by BSData. Likel... |
| Wolf Guard Battle Leader On Thunderwolf | missing_alias | Unit exists in Wahapedia CSV (id: 000000301) but not matched by BSData. Likel... |
| Lukas The Trickster | missing_alias | Unit exists in Wahapedia CSV (id: 000000304) but not matched by BSData. Likel... |
| Iron Priest On Thunderwolf | missing_alias | Unit exists in Wahapedia CSV (id: 000000308) but not matched by BSData. Likel... |
| Wolf Scouts (Legendary) | legends | Name matches Legends pattern: /\(legendary\)$/i |
| Wolf Guard | missing_alias | Unit exists in Wahapedia CSV (id: 000000315) but not matched by BSData. Likel... |
| Stormwolf | missing_alias | Unit exists in Wahapedia CSV (id: 000000321) but not matched by BSData. Likel... |
| Skyclaws | missing_alias | Unit exists in Wahapedia CSV (id: 000000324) but not matched by BSData. Likel... |
| Stormfang Gunship | missing_alias | Unit exists in Wahapedia CSV (id: 000000325) but not matched by BSData. Likel... |
| Long Fangs | missing_alias | Unit exists in Wahapedia CSV (id: 000000326) but not matched by BSData. Likel... |
| Cerberus | forge_world | Known Forge World / Imperial Armour unit |
| Vanguard Veteran Squad | missing_alias | Unit exists in Wahapedia CSV (id: 000001154) but not matched by BSData. Likel... |
| Sicaran Arcus | forge_world | Known Forge World / Imperial Armour unit |
| Sergeant Telion | missing_alias | Unit exists in Wahapedia CSV (id: 000001162) but not matched by BSData. Likel... |
| Sicaran Omega | forge_world | Known Forge World / Imperial Armour unit |
| Thunderfire Cannon | missing_alias | Unit exists in Wahapedia CSV (id: 000001164) but not matched by BSData. Likel... |
| Company Veterans On Bikes | missing_alias | Unit exists in Wahapedia CSV (id: 000001166) but not matched by BSData. Likel... |
| Company Champion On Bike | missing_alias | Unit exists in Wahapedia CSV (id: 000001167) but not matched by BSData. Likel... |
| Land Speeder Tempest | forge_world | Known Forge World / Imperial Armour unit |
| Land Speeder Tornado | missing_alias | Unit exists in Wahapedia CSV (id: 000001169) but not matched by BSData. Likel... |
| Kratos | forge_world | Known Forge World / Imperial Armour unit |
| Vindicator Laser Destroyer | forge_world | Known Forge World / Imperial Armour unit |
| Sokar-pattern Stormbird | forge_world | Known Forge World / Imperial Armour unit |
| Ancient on Bike | missing_alias | Unit exists in Wahapedia CSV (id: 000001182) but not matched by BSData. Likel... |
| Terminator Squad | missing_alias | Unit exists in Wahapedia CSV (id: 000004138) but not matched by BSData. Likel... |
| Terminus Ultra | forge_world | Known Forge World / Imperial Armour unit |
| Sicaran Battle Tank | forge_world | Known Forge World / Imperial Armour unit |
| Mastodon | forge_world | Known Forge World / Imperial Armour unit |
| Chaplain Venerable Dreadnought | forge_world | Known Forge World / Imperial Armour unit |
| Librarian with Jump Pack | missing_alias | Unit exists in Wahapedia CSV (id: 000001344) but not matched by BSData. Likel... |
| Land Raider Prometheus | forge_world | Known Forge World / Imperial Armour unit |
| Librarian on Bike | missing_alias | Unit exists in Wahapedia CSV (id: 000001348) but not matched by BSData. Likel... |
| Ravenwing Talonmaster | missing_alias | Unit exists in Wahapedia CSV (id: 000001423) but not matched by BSData. Likel... |
| Scout Sniper Squad | missing_alias | Unit exists in Wahapedia CSV (id: 000001523) but not matched by BSData. Likel... |
| Sergeant Chronus | missing_alias | Unit exists in Wahapedia CSV (id: 000001524) but not matched by BSData. Likel... |
| Techmarine on Bike | missing_alias | Unit exists in Wahapedia CSV (id: 000001527) but not matched by BSData. Likel... |
| Land Raider Achilles | forge_world | Known Forge World / Imperial Armour unit |
| Land Raider Proteus | forge_world | Known Forge World / Imperial Armour unit |
| Fire Raptor Gunship | forge_world | Known Forge World / Imperial Armour unit |
| Falchion | forge_world | Known Forge World / Imperial Armour unit |
| Gladiator Reaper | missing_alias | Unit exists in Wahapedia CSV (id: 000002789) but not matched by BSData. Likel... |
| Gladiator Valiant | missing_alias | Unit exists in Wahapedia CSV (id: 000002788) but not matched by BSData. Likel... |
| Terrax-pattern Termite | forge_world | Known Forge World / Imperial Armour unit |
| Land Speeder Typhoon | missing_alias | Unit exists in Wahapedia CSV (id: 000002102) but not matched by BSData. Likel... |
| Command Squad | missing_alias | Unit exists in Wahapedia CSV (id: 000002103) but not matched by BSData. Likel... |
| Primaris Company Champion | missing_alias | Unit exists in Wahapedia CSV (id: 000002234) but not matched by BSData. Likel... |
| Spartan | forge_world | Known Forge World / Imperial Armour unit |
| Sternguard Veteran Squad | missing_alias | Unit exists in Wahapedia CSV (id: 000004137) but not matched by BSData. Likel... |
| Stalker | missing_alias | Unit exists in Wahapedia CSV (id: 000002258) but not matched by BSData. Likel... |
| Deathstorm Drop Pod | forge_world | Known Forge World / Imperial Armour unit |
| Deimos Predator | forge_world | Known Forge World / Imperial Armour unit |
| Deredeo Dreadnought | forge_world | Known Forge World / Imperial Armour unit |
| Deathwing Command Squad | missing_alias | Unit exists in Wahapedia CSV (id: 000002302) but not matched by BSData. Likel... |
| Deathwing Strikemaster | missing_alias | Unit exists in Wahapedia CSV (id: 000002468) but not matched by BSData. Likel... |
| Impulsor | missing_alias | Unit exists in Wahapedia CSV (id: 000002786) but not matched by BSData. Likel... |
| Chaplain Cassius | missing_alias | Unit exists in Wahapedia CSV (id: 000002678) but not matched by BSData. Likel... |
| Captain on Bike | missing_alias | Unit exists in Wahapedia CSV (id: 000002702) but not matched by BSData. Likel... |
| Fellblade | forge_world | Known Forge World / Imperial Armour unit |
| Gladiator Lancer | missing_alias | Unit exists in Wahapedia CSV (id: 000002787) but not matched by BSData. Likel... |
| Ironclad Dreadnought | missing_alias | Unit exists in Wahapedia CSV (id: 000002706) but not matched by BSData. Likel... |
| Land Raider Helios | forge_world | Known Forge World / Imperial Armour unit |
| Land Speeder | missing_alias | Unit exists in Wahapedia CSV (id: 000002711) but not matched by BSData. Likel... |
| Relic Contemptor Dreadnought | forge_world | Known Forge World / Imperial Armour unit |
| Relic Razorback | forge_world | Known Forge World / Imperial Armour unit |
| Repulsor | missing_alias | Unit exists in Wahapedia CSV (id: 000002791) but not matched by BSData. Likel... |
| Repulsor Executioner | missing_alias | Unit exists in Wahapedia CSV (id: 000002790) but not matched by BSData. Likel... |
| Thunderhawk Transporter | forge_world | Known Forge World / Imperial Armour unit |
| Tyrannic War Veterans | missing_alias | Unit exists in Wahapedia CSV (id: 000002725) but not matched by BSData. Likel... |
| Whirlwind Scorpius | forge_world | Known Forge World / Imperial Armour unit |
| Xiphon Interceptor | forge_world | Known Forge World / Imperial Armour unit |
| Sanguinary Priest With Jump Pack | missing_alias | Unit exists in Wahapedia CSV (id: 000002738) but not matched by BSData. Likel... |
| Wolf Guard Pack Leader With Jump Pack | missing_alias | Unit exists in Wahapedia CSV (id: 000002802) but not matched by BSData. Likel... |
| Wolf Guard Pack Leader In Terminator Armour | missing_alias | Unit exists in Wahapedia CSV (id: 000002803) but not matched by BSData. Likel... |
| Wolf Guard Pack Leader | missing_alias | Unit exists in Wahapedia CSV (id: 000002804) but not matched by BSData. Likel... |
| Cyberwolf | missing_alias | Unit exists in Wahapedia CSV (id: 000002805) but not matched by BSData. Likel... |
| Hounds Of Morkai | missing_alias | Unit exists in Wahapedia CSV (id: 000002806) but not matched by BSData. Likel... |
| Example Wargear | missing_alias | Unit exists in Wahapedia CSV (id: 000003708) but not matched by BSData. Likel... |
| Death Company Dreadnought with Magna-grapple | missing_alias | Unit exists in Wahapedia CSV (id: 000003835) but not matched by BSData. Likel... |
| Death Company Marines with Boltguns | missing_alias | Unit exists in Wahapedia CSV (id: 000003836) but not matched by BSData. Likel... |
| Death Company Marines with Boltguns and Jump Packs | missing_alias | Unit exists in Wahapedia CSV (id: 000003837) but not matched by BSData. Likel... |
| Kill Team Cassius | missing_alias | Unit exists in Wahapedia CSV (id: 000003875) but not matched by BSData. Likel... |
| Crusader Squad (Legendary) | legends | Name matches Legends pattern: /\(legendary\)$/i |
| Judiciar Xacharus | missing_alias | Unit exists in Wahapedia CSV (id: 000004179) but not matched by BSData. Likel... |
| Chaplain Kastiel | missing_alias | Unit exists in Wahapedia CSV (id: 000004180) but not matched by BSData. Likel... |
| Ferren Areios | missing_alias | Unit exists in Wahapedia CSV (id: 000004204) but not matched by BSData. Likel... |

## French Translation Gaps

| Entity Type | Missing Count |
|-------------|---------------|
| Units (name_fr) | 0 |
| Weapons (name_fr) | 2 |
| Abilities (name_fr) | 174 |
