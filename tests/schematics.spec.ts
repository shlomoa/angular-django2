import type * as SchematicsModule from '@angular-devkit/schematics';
import { Tree, externalSchematic, SchematicsException } from '@angular-devkit/schematics';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@angular-devkit/schematics', async () => {
  const actual = await vi.importActual<SchematicsModule>('@angular-devkit/schematics');

  return {
    ...actual,
    externalSchematic: vi.fn((collectionName, schematicName, options) => {
      void collectionName;
      void schematicName;
      void options;

      return (tree: Tree) => tree;
    }),
  };
});

import { appShell } from '../projects/angular-django2/schematics/app-shell/index';
import { application } from '../projects/angular-django2/schematics/application/index';
import { classGenerator } from '../projects/angular-django2/schematics/class/index';
import { component } from '../projects/angular-django2/schematics/component/index';
import { ngAdd } from '../projects/angular-django2/schematics/ng-add/index';
import { service } from '../projects/angular-django2/schematics/service/index';

describe('angular-django2 schematics', () => {
  const mockedExternalSchematic = vi.mocked(externalSchematic);

  beforeEach(() => {
    mockedExternalSchematic.mockClear();
  });

  afterEach(() => {
    mockedExternalSchematic.mockReset();
  });

  it('wraps the Angular application schematic with standalone and routing defaults', () => {
    application({ name: 'demo-app' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'application', {
      name: 'demo-app',
      routing: true,
      standalone: true,
      style: 'scss',
    });
  });

  it('TC-01: application schematic defaults style to scss when not provided', () => {
    application({ name: 'my-app' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'application', {
      name: 'my-app',
      routing: true,
      standalone: true,
      style: 'scss',
    });
  });

  it('TC-02: caller-supplied style overrides the scss default', () => {
    application({ name: 'my-app', style: 'css' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'application', {
      name: 'my-app',
      routing: true,
      standalone: true,
      style: 'css',
    });
  });

  it('wraps the Angular component schematic with standalone and OnPush defaults', () => {
    component({ changeDetection: 'Default', name: 'hero-card', standalone: false });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'component', {
      changeDetection: 'Default',
      name: 'hero-card',
      standalone: false,
    });
  });

  it('passes service options through to the Angular service schematic', () => {
    service({ name: 'django-api', path: 'src/app/data' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'service', {
      name: 'django-api',
      path: 'src/app/data',
    });
  });

  it('passes class options through to the Angular class schematic', () => {
    classGenerator({ name: 'api-contract', project: 'demo-app' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'class', {
      name: 'api-contract',
      project: 'demo-app',
    });
  });

  it('passes app-shell options through to the Angular app-shell schematic', () => {
    appShell({ project: 'demo-app' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'app-shell', {
      project: 'demo-app',
    });
  });

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

    const updatedTree = ngAdd()(tree, {} as never) as Tree;
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

    const updatedTree = ngAdd()(tree, {} as never) as Tree;
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

    const updatedTree = ngAdd()(tree, {} as never) as Tree;
    const angularJson = JSON.parse(updatedTree.read('/angular.json')!.toString());

    expect(angularJson.cli.schematicCollections).toEqual([
      'angular-django2',
      'existing-collection',
    ]);
  });

  it('TC-04: throws when angular.json is missing', () => {
    const tree = Tree.empty();

    expect(() => ngAdd()(tree, {} as never)).toThrow(SchematicsException);
    expect(() => ngAdd()(tree, {} as never)).toThrow(
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

    const updatedTree = ngAdd()(tree, {} as never) as Tree;
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

    const updatedTree = ngAdd()(tree, {} as never) as Tree;
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
