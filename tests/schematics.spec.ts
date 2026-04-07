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

  it('registers the package collection in angular.json', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          cli: {
            schematicCollections: ['existing-collection'],
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

  it('does not duplicate the collection when it is already present', () => {
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

  it('throws when angular.json is missing during ng-add', () => {
    expect(() => ngAdd()(Tree.empty(), {} as never)).toThrow(SchematicsException);
  });
});
