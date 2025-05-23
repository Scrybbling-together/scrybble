# Scrybble

## Development on a new machine

```shell
npm i
# go to your obsidian folder
# cd ~/Documents/Lauranomicon/.obsidian
mkdir -p plugins
cd plugins
# symlink this project to the plugins folder
ln -s ~/PhpstormProjects/scrybble/ scrybble.beta
```

## Development

`npm run dev`

You need to restart Obsidian whenever you make a change.
Use the "reload app without saving changes" command in obsidian to restart quickly.

## Release

Working on doing this on push using github actions! Boop

1. [ ] Run `npm version {patch|minor|major}` after updating (if necessary) `minAppVersion` in `manifest.json`
2. [ ] Push to Github
3. [ ] run `npm run build`
4. [ ] On Github, create new release with tag `{YOUR VERSION}` and title `v{YOUR VERSION}`
	- Attach `main.js`, `main.css` and `manifest.json`
