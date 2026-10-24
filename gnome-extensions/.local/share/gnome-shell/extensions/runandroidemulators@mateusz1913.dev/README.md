# RunAndroidEmulators

<img src="./static/run-android-emulators.png" alt="RunAndroidEmulators" align="center" width="203" height="388">

<br />

A GNOME Shell extension that adds a toggle with the list of available Android emulators in Quick Settings.
Clicking on the item from the list spawns selected emulator.

Extension supports GNOME Shell 45+.

## Development

To install extension from source:

```
git clone git@gitlab.com:Mateusz_Medrek/runandroidemulators.git
cd runandroidemulators
make install
```

JS codebase is linted with [ESLint](https://eslint.org/) and formatted with [Prettier](https://prettier.io/).

To run linter:

```
make lint
```

To run formatter:

```
make format
```

Follow [Testing Extension](https://gjs.guide/extensions/development/creating.html#testing-the-extension) in GJS docs to learn how to manually test the extension.

## Inspiration

[MiniSim](https://github.com/okwasniewski/MiniSim) by [Oskar Kwaśniewski](https://www.oskarkwasniewski.dev/)

## License

This program is distributed under the terms of the GNU General Public License, version 3 or later.

