import * as t from 'io-ts';

const Config = t.exact(
  t.partial({
    android: t.exact(
      t.interface({
        icon: t.string,
        outputDir: t.string,
      })
    ),

    assets: t.exact(
      t.interface({
        inputDir: t.string,
        outputDir: t.union([t.undefined, t.string]),
      })
    ),
    ios: t.exact(
      t.interface({
        icon: t.string,
        outputDir: t.string,
      })
    ),
  })
);

export interface IConfig extends t.TypeOf<typeof Config> {}

export function decodeConfig(input: any): IConfig {
  const result = Config.decode(input);
  if (result.isLeft()) {
    throw new Error(
      `Invalid config: ${result.value.map(renderValidationError).join('\n')}`
    );
  }
  return result.value;
}

function renderValidationError(error: t.ValidationError): string {
  const errorPath = error.context
    .map(contextEntry => contextEntry.key)
    .filter(key => key.length > 0)
    .join('.');

  const errorContext = error.context[error.context.length - 1];

  return `Expected ${
    errorContext.type.name
  } at ${errorPath}, got ${JSON.stringify(error.value)}`;
}
