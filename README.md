# react-native-icon-builder

:warning: **Package has been deprecated in favor of [react-native-svg-app-icon](https://github.com/aeirola/react-native-svg-app-icon) and [react-native-svg-asset-plugin](https://github.com/aeirola/react-native-svg-asset-plugin)**

Mobile app icon generator for React Native projects.

## Features

- Reads SVG, writes PNG
- Supports generation of:
  - iOS icons
  - Android icons
  - React native images
- Fast, using [sharp](https://github.com/lovell/sharp)
- No non-npm dependencies

## Usage

1. Create config file `icon-config.json`

   ```json
   {
     "assets": {
       "inputDir": "src/images",
       "outputDir": "src/images/generated"
     },
     "android": {
       "icon": "icons/android.svg",
       "outputDir": "android/src/main/res"
     },
     "ios": {
       "icon": "icons/ios.svg",
       "outputDir": "ios/AwesomeProject/images.xcassets"
     }
   }
   ```

2. Generate images with
   ```bash
   react-native-icon-builder icon-config.json
   ```
