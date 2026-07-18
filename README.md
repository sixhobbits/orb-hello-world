# Orb Hello World

An interactive first-contact transmission built and hosted in an Amp orb.

The experience is entirely self-contained: semantic HTML, procedural CSS art, and a lightweight vanilla JavaScript starfield. Move the pointer to bend the scene, then awaken the universe to begin the activation sequence.

## Run locally

```sh
PORT=8080; python3 -m http.server "$PORT" --bind 0.0.0.0
```

Then open `http://localhost:8080`.

In an Amp orb, run `amp orb services ensure` to start the supervised web service and create its Portal.
