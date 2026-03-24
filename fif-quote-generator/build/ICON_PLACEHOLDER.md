Place your Windows icon file here as `icon.ico`.

Requirements:
- Format: ICO
- Recommended sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- Use the Feet in Focus logo (orange paw-print)

The icon is referenced by electron-builder in package.json:
`"win": { "icon": "build/icon.ico" }`

You can convert a PNG to ICO using:
- https://convertico.com/
- Or ImageMagick: `convert logo.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico`
