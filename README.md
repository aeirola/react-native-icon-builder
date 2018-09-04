# react-native-icon-builder

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
