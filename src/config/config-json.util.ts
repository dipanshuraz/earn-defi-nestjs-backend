export function parseConfigJson<T>(raw: string | undefined, configName: string): T[] {
  if (!raw?.trim()) {
    throw new Error(`${configName} is required`);
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error(`${configName} must be a JSON array`);
    }

    return parsed as T[];
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${configName} contains invalid JSON`);
    }

    throw error;
  }
}

export function interpolateConfigValues<T>(
  entries: T[],
  variables: Record<string, string>,
): T[] {
  return entries.map((entry) =>
    interpolateRecord(entry as Record<string, unknown>, variables) as T,
  );
}

function interpolateRecord(
  entry: Record<string, unknown>,
  variables: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(entry)) {
    if (typeof value === 'string') {
      result[key] = interpolateString(value, variables);
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = interpolateRecord(value as Record<string, unknown>, variables);
      continue;
    }

    result[key] = value;
  }

  return result;
}

function interpolateString(value: string, variables: Record<string, string>): string {
  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, variableName: string) => {
    const replacement = variables[variableName];

    if (replacement === undefined) {
      throw new Error(`Missing environment variable for config interpolation: ${variableName}`);
    }

    return replacement;
  });
}
