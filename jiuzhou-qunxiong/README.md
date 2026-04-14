# 九州群雄 Prototype

Standalone browser prototype for a turn-based Chinese historical strategy board game.

## Run

Open `index.html` directly in browser, or serve directory:

```bash
cd jiuzhou-qunxiong
python3 -m http.server 8080
```

## Controls

- Main menu: start scenario / load / exit placeholder.
- Click map tiles to inspect info.
- **Preparation phase**: collect income, recruit from selected owned city, end prep.
- **Action phase**: move, field battle (adjacent enemy army), siege (adjacent enemy city), end action.
- Save/load: quick buttons + 20 save slots (left-click save, right-click load).

## Win conditions

- Immediate win: occupy all enemy capitals.
- Round 15 settlement: compare city count, then total troops, then total development.
