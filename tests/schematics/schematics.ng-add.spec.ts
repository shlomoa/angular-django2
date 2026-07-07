import { Tree, SchematicsException } from '@angular-devkit/schematics';
import { describe, expect, it } from 'vitest';

import { ngAdd } from '../../projects/angular-django2/schematics/ng-add/index';
import { createSchematicContext } from './schematics.helpers';

describe('angular-django2 schematics', () => {
  it('TC-01: registers the collection in a workspace that has no existing cli config', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          projects: {},
          version: 1,
        },
        null,
        2,
      ),
    );

    const updatedTree = ngAdd()(tree, createSchematicContext()) as Tree;
    const angularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());

    expect(angularJson.cli).toBeDefined();
    expect(angularJson.cli.schematicCollections).toEqual(['angular-django2']);
  });

  it('TC-02: registers the collection prepended before existing collections', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          cli: {
            schematicCollections: ['@schematics/angular'],
          },
          projects: {},
          version: 1,
        },
        null,
        2,
      ),
    );

    const updatedTree = ngAdd()(tree, createSchematicContext()) as Tree;
    const angularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());

    expect(angularJson.cli.schematicCollections).toEqual([
      'angular-django2',
      '@schematics/angular',
    ]);
  });

  it('TC-03: is idempotent - does not duplicate an already-registered collection', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          cli: {
            schematicCollections: ['angular-django2', 'existing-collection'],
          },
          projects: {},
          version: 1,
        },
        null,
        2,
      ),
    );

    const updatedTree = ngAdd()(tree, createSchematicContext()) as Tree;
    const angularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());

    expect(angularJson.cli.schematicCollections).toEqual([
      'angular-django2',
      'existing-collection',
    ]);
  });

  it('TC-04: throws when angular.json is missing', () => {
    const tree = Tree.empty();

    expect(() => ngAdd()(tree, createSchematicContext())).toThrow(SchematicsException);
    expect(() => ngAdd()(tree, createSchematicContext())).toThrow(
      'Could not find angular.json in the target workspace.',
    );
  });

  it('TC-05: preserves all other angular.json content unchanged', () => {
    const tree = Tree.empty();
    const originalContent = {
      version: 1,
      projects: {
        'my-app': {
          root: '',
          sourceRoot: 'src',
          projectType: 'application',
        },
      },
      defaultProject: 'my-app',
      schematics: {
        '@schematics/angular:component': {
          style: 'scss',
        },
      },
    };

    tree.create('/angular.json', JSON.stringify(originalContent, null, 2));

    const updatedTree = ngAdd()(tree, createSchematicContext()) as Tree;
    const angularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());

    expect(angularJson.version).toBe(originalContent.version);
    expect(angularJson.projects).toEqual(originalContent.projects);
    expect(angularJson.defaultProject).toBe(originalContent.defaultProject);
    expect(angularJson.schematics).toEqual(originalContent.schematics);
    expect(angularJson.cli.schematicCollections).toEqual(['angular-django2']);
  });

  it('TC-06: output is valid JSON with 2-space indentation and trailing newline', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          version: 1,
          projects: {},
        },
        null,
        2,
      ),
    );

    const updatedTree = ngAdd()(tree, createSchematicContext()) as Tree;
    const rawContent = updatedTree.read('/angular.json')!.toString();

    expect(() => JSON.parse(rawContent)).not.toThrow();

    expect(rawContent.endsWith('\n')).toBe(true);

    const lines = rawContent.split('\n');
    const indentedLine = lines.find((line) => line.startsWith('  '));
    expect(indentedLine).toBeDefined();
    const match = indentedLine!.match(/^(\s+)/);
    if (match) {
      expect(match[1]).toBe('  ');
    }
  });
});
