import * as path from 'path';

import fsExtra from 'fs-extra';
import klawSync from 'klaw-sync';
import sharp from 'sharp';

import { IConfig } from './config';

export function generate(config: IConfig): Promise<string[]> {
  return Promise.all([
    generateAndroidResources(config.android),
    generateIosIconset(config.ios),
    generateReactNativeImages(config.assets),
  ]).then(flattenArrays);
}

const androidIconBaseSize = 48;
const androidDensities = [
  { name: 'ldpi', scale: 0.75 },
  { name: 'mdpi', scale: 1 },
  { name: 'hdpi', scale: 1.5 },
  { name: 'xhdpi', scale: 2 },
  { name: 'xxhdpi', scale: 3 },
  { name: 'xxxhdpi', scale: 4 },
];

const iosIcons = [
  { idiom: 'iphone', scale: 2, size: 20 },
  { idiom: 'iphone', scale: 3, size: 20 },
  { idiom: 'iphone', scale: 2, size: 29 },
  { idiom: 'iphone', scale: 3, size: 29 },
  { idiom: 'iphone', scale: 2, size: 40 },
  { idiom: 'iphone', scale: 3, size: 40 },
  { idiom: 'iphone', scale: 2, size: 60 },
  { idiom: 'iphone', scale: 3, size: 60 },
  { idiom: 'ipad', scale: 1, size: 20 },
  { idiom: 'ipad', scale: 2, size: 20 },
  { idiom: 'ipad', scale: 1, size: 29 },
  { idiom: 'ipad', scale: 2, size: 29 },
  { idiom: 'ipad', scale: 1, size: 40 },
  { idiom: 'ipad', scale: 2, size: 40 },
  { idiom: 'ipad', scale: 1, size: 76 },
  { idiom: 'ipad', scale: 2, size: 76 },
  { idiom: 'ipad', scale: 2, size: 83.5 },
  { idiom: 'ios-marketing', scale: 1, size: 1024, flattenAlpha: true },
];

const reactNativeImageScales = [
  { scale: 1, suffix: '' },
  { scale: 2, suffix: '@2x' },
  { scale: 3, suffix: '@3x' },
];

function generateAndroidResources(
  androidConfig: IConfig['android']
): Promise<string[]> {
  if (!androidConfig) {
    return Promise.resolve([]);
  }

  return genaratePngs(
    androidConfig.icon,
    androidDensities.map(density => ({
      filePath: getAndroidIconPath(androidConfig.outputDir, density.name),
      size: {
        height: androidIconBaseSize * density.scale,
        type: Size.Absolute as Size.Absolute,
        width: androidIconBaseSize * density.scale,
      },
    }))
  );
}

function getAndroidIconPath(baseDir: string, density: string): string {
  return path.join(baseDir, `mipmap-${density}`, 'ic_launcher.png');
}

function generateIosIconset(iosConfig: IConfig['ios']): Promise<string[]> {
  if (!iosConfig) {
    return Promise.resolve([]);
  }

  const iconsetDir = path.join(iosConfig.outputDir, 'AppIcon.appiconset');

  return Promise.all([
    generateIosIconsetImages(iosConfig.icon, iconsetDir),
    generateIosIconsetManifest(iconsetDir),
  ]).then(flattenArrays);
}

function generateIosIconsetImages(sourceIcon: string, iconsetDir: string) {
  return genaratePngs(
    sourceIcon,
    iosIcons.map(icon => ({
      filePath: path.join(iconsetDir, getIosIconFilename(icon)),
      flattenAlpha: icon.flattenAlpha,
      size: {
        height: icon.size * icon.scale,
        type: Size.Absolute as Size.Absolute,
        width: icon.size * icon.scale,
      },
    }))
  );
}

function generateIosIconsetManifest(iconsetDir: string): Promise<string[]> {
  const fileName = path.join(iconsetDir, 'Contents.json');
  return fsExtra
    .ensureDir(iconsetDir)
    .then(() =>
      fsExtra.writeFile(
        fileName,
        JSON.stringify(
          {
            images: iosIcons.map(icon => ({
              filename: getIosIconFilename(icon),
              idiom: icon.idiom,
              scale: `${icon.scale}x`,
              size: `${icon.size}x${icon.size}`,
            })),
            info: {
              author: 'react-native-icon-builder',
              version: 1,
            },
          },
          null,
          2
        )
      )
    )
    .then(() => [fileName]);
}

function getIosIconFilename(icon: {
  idiom: string;
  size: number;
  scale: number;
}): string {
  return `${icon.idiom}-${icon.size}@${icon.scale}x.png`;
}

function generateReactNativeImages(
  imagesConfig: IConfig['assets']
): Promise<string[]> {
  if (!imagesConfig) {
    return Promise.resolve([]);
  }

  const outputDir = imagesConfig.outputDir || imagesConfig.inputDir;

  return Promise.all(
    klawSync(imagesConfig.inputDir, { nodir: true })
      .map(item => item.path)
      .filter(file => path.extname(file) === '.svg')
      .map(file =>
        generateReactNativeImage(
          file,
          path.join(
            outputDir,
            path.relative(imagesConfig.inputDir, path.dirname(file))
          )
        )
      )
  ).then(flattenArrays);
}

function generateReactNativeImage(
  file: string,
  outputDir: string
): Promise<string[]> {
  return genaratePngs(
    file,
    reactNativeImageScales.map(imageScale => ({
      filePath: path.join(
        outputDir,
        `${path.basename(file, path.extname(file))}${imageScale.suffix}.png`
      ),
      size: {
        scale: imageScale.scale,
        type: Size.Relative as Size.Relative,
      },
    }))
  );
}

enum Size {
  Absolute,
  Relative,
}

interface IGenerateConfig {
  filePath: string;
  size:
    | { type: Size.Absolute; width: number; height: number }
    | { type: Size.Relative; scale: number };
  flattenAlpha?: boolean;
}

function genaratePngs(
  input: string,
  outputs: IGenerateConfig[]
): Promise<string[]> {
  return fsExtra
    .readFile(input, { encoding: 'utf-8' })
    .then(inputData =>
      Promise.all([
        Promise.resolve(inputData),
        sharp(Buffer.from(inputData)).metadata(),
      ])
    )
    .then(([inputSvg, metadata]) =>
      Promise.all(
        outputs.map(output => genaratePng(inputSvg, metadata, output))
      )
    );
}

function genaratePng(
  inputSvg: string,
  metadata: sharp.Metadata,
  output: IGenerateConfig
): Promise<string> {
  return (
    fsExtra
      .ensureDir(path.dirname(output.filePath))
      // TODO: Compare timestamps, and generate only if updated
      .then(() => {
        if (metadata.format !== 'svg') {
          return Promise.reject(
            `Unsupported image format ${
              metadata.format
            }. Only SVG images are supported.`
          );
        }

        if (!metadata.density || !metadata.width || !metadata.height) {
          return Promise.reject('Unsupported image, missing size and density');
        }

        let targetDensity: number;
        switch (output.size.type) {
          case Size.Absolute:
            const inputAspectRatio = metadata.width / metadata.height;
            const outputAspectRatio = output.size.width / output.size.height;
            if (inputAspectRatio !== outputAspectRatio) {
              return Promise.reject(
                `Incompatible image aspect ratio. Expected 1:${outputAspectRatio}, got 1:${inputAspectRatio}`
              );
            }

            targetDensity =
              (output.size.width / metadata.width) * metadata.density;
            break;

          case Size.Relative:
            targetDensity = output.size.scale * metadata.density;
            break;

          default:
            return assertNever(output.size);
        }

        let image = sharp(Buffer.from(inputSvg), { density: targetDensity });

        if (output.flattenAlpha) {
          image = image.flatten();
        }

        return image
          .png({
            adaptiveFiltering: false,
            compressionLevel: 9,
          })
          .toFile(output.filePath)
          .then(() => output.filePath);
      })
  );
}

function assertNever(x: never): never {
  throw new Error('Unexpected object: ' + x);
}

function flattenArrays<item>(arrays: item[][]): item[] {
  return [].concat.apply([], arrays);
}
