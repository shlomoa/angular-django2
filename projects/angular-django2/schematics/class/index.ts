import type { JsonObject } from '@angular-devkit/core';
import type { Rule } from '@angular-devkit/schematics';
import { externalSchematic } from '@angular-devkit/schematics';

export function classGenerator(options: JsonObject): Rule {
  return externalSchematic('@schematics/angular', 'class', options);
}
