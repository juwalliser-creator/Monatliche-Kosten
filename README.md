# Monatliche Kosten

Gemeinsame Kostenübersicht für zwei Personen: Dashboard, Firebase Auth (Bearbeiten / Nur Lesen), Budgets, Ausgleich und CSV-Export.

## Start

Die App ist eine statische Website. Lokal z. B. mit einem einfachen Server öffnen (Firebase Auth mag oft keine `file://`-URLs):

```bash
npx --yes serve .
```

Dann `index.html` im Browser öffnen.

## Einmaliges Firebase-Setup

### 1. Authentication

1. [Firebase Console](https://console.firebase.google.com/) → Projekt **monatliche-kosten**
2. **Authentication** → Sign-in method → **E-Mail/Passwort** aktivieren
3. Zwei Nutzer anlegen (E-Mail + Passwort), z. B.:
   - dein Konto (Admin)
   - Konto deines Bruders (Viewer)

### 2. Rollen in Firestore

Collection `users`, Dokument-ID = **UID** des Nutzers (unter Authentication sichtbar):

```json
{ "role": "admin", "name": "Dein Name", "email": "du@example.com" }
```

```json
{ "role": "viewer", "name": "Bruder", "email": "bruder@example.com" }
```

Wenn noch kein `users`-Dokument existiert, legt die App beim ersten Login automatisch eines an: der **erste** User wird `admin`, jeder weitere `viewer`. Danach kannst du die Rolle in der Console korrigieren.

### 3. Security Rules deployen

Inhalt von [`firestore.rules`](firestore.rules) in der Console unter **Firestore → Regeln** einfügen und veröffentlichen – oder per Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Ohne passende Rules bleiben Lesen/Schreiben ggf. offen oder gesperrt (je nach bisheriger Konfiguration).

### 4. Optional: Anzeigenamen

Dokument `settings/app`:

```json
{
  "personAName": "Ben",
  "personBName": "Bruder",
  "sparziel": 2000
}
```

Das Sparziel lässt sich auch in der App setzen (nur Admin).

## Funktionen

- Login mit Session über Reload
- Einträge anlegen, bearbeiten, löschen (Admin)
- Personenzuordnung und Ausgleich („X schuldet Y … €“)
- Eigene Kategorien, Budgets pro Kategorie, Gesamt-Sparziel
- Filter, Suche, Sortierung
- Vormonat übernehmen, Monatsvergleich, CSV-Export
- Viewer sieht alles, kann aber nichts ändern

## Datenmodell

| Pfad | Inhalt |
|------|--------|
| `kosten/{YYYY-MM}/eintraege/{id}` | name, betrag, kategorie, person, notiz |
| `kategorien/{id}` | name, order |
| `budgets/{YYYY-MM}` | `{ limits: { Kategorie: number } }` |
| `settings/app` | personAName, personBName, sparziel |
| `users/{uid}` | role, name, email |

Bestehende Einträge ohne `person` werden als Person A behandelt.
