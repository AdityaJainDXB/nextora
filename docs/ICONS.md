# Icons

The tab bar, the checklist steps and the Home shortcuts use pictures from the
[Kubai Icons](https://github.com/kubai087/kubai-icons) library (MIT licence, copy in
`assets/icons/LICENSE.txt`), drawn in NEXTORA's colours:

- `ink` (navy) when resting, `clay` (terracotta) when active or highlighted.
- 96px PNGs in `assets/icons/`, listed in `src/components/icons/registry.ts`.
- Use `<NIcon name="users" tone="ink" size={24} />`, or the `art` prop on `Button` and tab items.

Small interface symbols (back arrows, chevrons, close, checkmarks) still use Ionicons.

To add or recolour an icon, render it from the library with the accent colour you want,
save the PNGs as `<name>.ink.png` and `<name>.clay.png`, and add the name to `registry.ts`.
