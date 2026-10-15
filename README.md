# Tower of Wishes

A spectator-tactics RPG based on the *Tower of Wishes* light novel. You build a party and
watch them fight; every fighter thinks for itself.

**Arena prototype 0.1:** Chapter One, the forest clearing. Kael against four bandits,
with Eiryn as a guest.

## Play locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Phone in landscape is the main target. Keyboard: `Space` All Out, `P` pause, `F` speed.

## Tests

```sh
node test/progress-test.js
node test/sim-test.js 200
NODE_PATH=$(npm root -g) node test/browser-check.js /tmp/shots   # needs Playwright
```

See [docs/DESIGN.md](docs/DESIGN.md) for the design and [AGENTS.md](AGENTS.md) for
working rules.
