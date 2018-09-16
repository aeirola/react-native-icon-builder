import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { expect } from 'chai';
import * as fsExtra from 'fs-extra';
import { describe, it } from 'mocha';
import sharp from 'sharp';
import * as tmp from 'tmp';

describe('CLI', () => {
  const projectRoot = path.join(__dirname, '..', '..');
  const cliPath = path.join(projectRoot, 'dist', 'cli.js');
  const testDataDir = path.join(projectRoot, 'test', 'data');
  let tmpDir: string;

  const androidIconSizes = [
    { density: 'ldpi', size: 36 },
    { density: 'mdpi', size: 48 },
    { density: 'hdpi', size: 72 },
    { density: 'xhdpi', size: 96 },
    { density: 'xxhdpi', size: 144 },
    { density: 'xxxhdpi', size: 192 },
  ];

  const iosIconSizes = [
    { identifier: { idiom: 'iphone', scale: '2x', size: '20x20' }, size: 40 },
    { identifier: { idiom: 'iphone', scale: '3x', size: '20x20' }, size: 60 },
    { identifier: { idiom: 'iphone', scale: '2x', size: '29x29' }, size: 58 },
    { identifier: { idiom: 'iphone', scale: '3x', size: '29x29' }, size: 87 },
    { identifier: { idiom: 'iphone', scale: '2x', size: '40x40' }, size: 80 },
    { identifier: { idiom: 'iphone', scale: '3x', size: '40x40' }, size: 120 },
    { identifier: { idiom: 'iphone', scale: '2x', size: '60x60' }, size: 120 },
    { identifier: { idiom: 'iphone', scale: '3x', size: '60x60' }, size: 180 },
    { identifier: { idiom: 'ipad', scale: '1x', size: '20x20' }, size: 20 },
    { identifier: { idiom: 'ipad', scale: '2x', size: '20x20' }, size: 40 },
    { identifier: { idiom: 'ipad', scale: '1x', size: '29x29' }, size: 29 },
    { identifier: { idiom: 'ipad', scale: '2x', size: '29x29' }, size: 58 },
    { identifier: { idiom: 'ipad', scale: '1x', size: '40x40' }, size: 40 },
    { identifier: { idiom: 'ipad', scale: '2x', size: '40x40' }, size: 80 },
    { identifier: { idiom: 'ipad', scale: '1x', size: '76x76' }, size: 76 },
    { identifier: { idiom: 'ipad', scale: '2x', size: '76x76' }, size: 152 },
    {
      identifier: { idiom: 'ipad', scale: '2x', size: '83.5x83.5' },
      size: 167,
    },
    {
      hasAlpha: false,
      identifier: { idiom: 'ios-marketing', scale: '1x', size: '1024x1024' },
      size: 1024,
    },
  ];

  const dataIconSizes = [
    { name: 'icon72.svg', size: { width: 72, height: 72 } },
    { name: 'rect.svg', size: { width: 60, height: 40 } },
  ];

  const reactNativeImageDensities = [
    { scale: 1, suffix: '' },
    { scale: 2, suffix: '@2x' },
    { scale: 3, suffix: '@3x' },
  ];

  beforeEach(() => {
    tmpDir = tmp.dirSync().name;
  });

  afterEach(() => {
    fsExtra.removeSync(tmpDir);
  });

  it('should error on missing config file', () => {
    const process = spawnSync(cliPath);
    expect(process.status).to.be.greaterThan(0);
  });

  it('should error on nonexisting config file', () => {
    const process = spawnSync(cliPath, [path.join(tmpDir, 'config.json')]);
    expect(process.status).to.be.greaterThan(0);
  });

  it('should error on invalid config file', () => {
    const config = {
      android: {
        iosIcon: 9,
      },
    };

    const process = buildImages(config);
    expect(process.status).to.be.greaterThan(0);
  });

  it('should error on missing image icon', () => {
    const config = {
      android: {
        icon: path.join(testDataDir, 'nonexistent.svg'),
        outputDir: tmpDir,
      },
    };

    const process = buildImages(config);
    expect(process.status).to.be.greaterThan(0);
  });

  it('should error on non-square icon', () => {
    const config = {
      android: {
        icon: path.join(testDataDir, 'rect.svg'),
        outputDir: tmpDir,
      },
    };

    const process = buildImages(config);
    expect(process.status).to.be.greaterThan(0);
  });

  it('should do nothing on empty config', () => {
    const process = buildImages({});
    expect(process.status).to.equal(0);
    expect(fs.readdirSync(tmpDir)).to.deep.equal([]);
  });

  it('should build handle floating point density rounding', () => {
    const config = {
      android: {
        icon: path.join(testDataDir, 'icon100.svg'),
        outputDir: tmpDir,
      },
    };

    const process = buildImages(config);
    expect(process.status).to.equal(0, process.stderr);

    return Promise.all(
      androidIconSizes.map(iconSize =>
        assertImageMetadata(
          path.join(tmpDir, `mipmap-${iconSize.density}`, 'ic_launcher.png'),
          {
            format: 'png',
            height: iconSize.size,
            width: iconSize.size,
          }
        )
      )
    );
  });

  it('should not rebuild icons', () => {
    const config = {
      android: {
        icon: path.join(testDataDir, 'icon72.svg'),
        outputDir: tmpDir,
      },
    };

    const firstProcess = buildImages(config);
    expect(firstProcess.status).to.equal(0);
    expect(firstProcess.stdout.toString()).to.include('Wrote files:');
    expect(firstProcess.stdout.toString()).not.to.include('No files written.');

    const secondProcess = buildImages(config);
    expect(secondProcess.status).to.equal(0);
    expect(secondProcess.stdout.toString()).to.include('No files written.');
    expect(secondProcess.stdout.toString()).not.to.include('Wrote files:');
  });

  it('should build android icons', () => {
    const config = {
      android: {
        icon: path.join(testDataDir, 'icon72.svg'),
        outputDir: tmpDir,
      },
    };

    const process = buildImages(config);
    expect(process.status).to.equal(0);

    return Promise.all(
      androidIconSizes.map(iconSize =>
        assertImageMetadata(
          path.join(tmpDir, `mipmap-${iconSize.density}`, 'ic_launcher.png'),
          {
            format: 'png',
            height: iconSize.size,
            width: iconSize.size,
          }
        )
      )
    );
  });

  it('should build ios icons', () => {
    const config = {
      ios: {
        icon: path.join(testDataDir, 'icon72.svg'),
        outputDir: tmpDir,
      },
    };

    const process = buildImages(config);
    expect(process.status).to.equal(0);

    const iconsetContents = JSON.parse(
      fs
        .readFileSync(path.join(tmpDir, 'AppIcon.appiconset', 'Contents.json'))
        .toString()
    );

    return Promise.all(
      iosIconSizes.map(iconSize =>
        assertImageMetadata(
          path.join(
            tmpDir,
            'AppIcon.appiconset',
            iconsetContents.images.find(
              (content: any) =>
                iconSize.identifier.idiom === content.idiom &&
                iconSize.identifier.scale === content.scale &&
                iconSize.identifier.size === content.size
            ).filename
          ),
          {
            format: 'png',
            height: iconSize.size,
            width: iconSize.size,
            ...(iconSize.hasAlpha !== undefined
              ? { hasAlpha: iconSize.hasAlpha }
              : {}),
          }
        )
      )
    );
  });

  it('should build asset icons', () => {
    const config = {
      assets: {
        inputDir: testDataDir,
        outputDir: tmpDir,
      },
    };

    const process = buildImages(config);
    expect(process.status).to.equal(0);

    return Promise.all(
      dataIconSizes.map(icon =>
        Promise.all(
          reactNativeImageDensities.map(density =>
            assertImageMetadata(
              path.join(
                tmpDir,
                icon.name.replace('.svg', `${density.suffix}.png`)
              ),
              {
                format: 'png',
                height: icon.size.height * density.scale,
                width: icon.size.width * density.scale,
              }
            )
          )
        )
      )
    );
  });

  /* Helper functions */
  function buildImages(config: object): SpawnSyncReturns<string> {
    const configFile = tmp.fileSync();
    fs.writeFileSync(configFile.fd, JSON.stringify(config));

    const process = spawnSync(cliPath, [configFile.name]);

    configFile.removeCallback();

    return process;
  }

  function assertImageMetadata(
    imagePath: string,
    expectedMetadata: object
  ): Promise<Chai.Assertion> {
    return sharp(imagePath, { failOnError: true } as any)
      .metadata()
      .then(imageMetadata =>
        expect(imageMetadata).to.include(
          expectedMetadata,
          'Image metadata not as expected'
        )
      );
  }
});
