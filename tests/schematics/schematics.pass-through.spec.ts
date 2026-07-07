import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type * as SchematicsModule from '@angular-devkit/schematics';
import { Tree, externalSchematic } from '@angular-devkit/schematics';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

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

import { appShell } from '../../projects/angular-django2/schematics/app-shell/index';
import { application } from '../../projects/angular-django2/schematics/application/index';
import { classGenerator } from '../../projects/angular-django2/schematics/class/index';
import { component } from '../../projects/angular-django2/schematics/component/index';
import { service } from '../../projects/angular-django2/schematics/service/index';

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
      ssr: false,
      standalone: true,
      style: 'scss',
      zoneless: true,
    });
  });

  it('TC-01: application schematic defaults style to scss when not provided', () => {
    application({ name: 'my-app' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'application', {
      name: 'my-app',
      routing: true,
      ssr: false,
      standalone: true,
      style: 'scss',
      zoneless: true,
    });
  });

  it('TC-02: caller-supplied style overrides the scss default', () => {
    application({ name: 'my-app', style: 'css' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'application', {
      name: 'my-app',
      routing: true,
      ssr: false,
      standalone: true,
      style: 'css',
      zoneless: true,
    });
  });

  it('wraps the Angular component schematic with standalone and OnPush defaults', () => {
    component({ changeDetection: 'Default', name: 'hero-card', standalone: false })(
      Tree.empty(),
      {} as never,
    );

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'component', {
      changeDetection: 'Default',
      name: 'hero-card',
      standalone: false,
    });
  });

  it('passes service options through to the Angular service schematic', () => {
    service({ name: 'django-api', path: 'src/app/data' })(Tree.empty(), {} as never);

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'service', {
      name: 'django-api',
      path: 'src/app/data',
    });
  });

  it('passes class options through to the Angular class schematic', () => {
    classGenerator({ name: 'api-contract', project: 'demo-app' })(Tree.empty(), {} as never);

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'class', {
      name: 'api-contract',
      project: 'demo-app',
    });
  });

  it('resolves pass-through generator paths relative to the selected project root', () => {
    const tree = Tree.empty();
    tree.create(
      '/angular.json',
      JSON.stringify({
        version: 1,
        projects: {
          'demo-app': {
            root: 'projects/demo-app',
            sourceRoot: 'projects/demo-app/src',
          },
        },
      }),
    );

    component({
      name: 'dashboard-card',
      project: 'demo-app',
      path: 'src/app/features/dashboard',
    })(tree, {} as never);

    expect(mockedExternalSchematic).toHaveBeenLastCalledWith('@schematics/angular', 'component', {
      changeDetection: 'OnPush',
      name: 'dashboard-card',
      path: 'projects/demo-app/src/app/features/dashboard',
      project: 'demo-app',
      standalone: true,
    });

    service({ name: 'api-status', project: 'demo-app', path: 'src/app/features/dashboard' })(
      tree,
      {} as never,
    );

    expect(mockedExternalSchematic).toHaveBeenLastCalledWith('@schematics/angular', 'service', {
      name: 'api-status',
      path: 'projects/demo-app/src/app/features/dashboard',
      project: 'demo-app',
    });

    classGenerator({
      name: 'user-summary',
      project: 'demo-app',
      path: 'src/app/features/dashboard',
    })(tree, {} as never);

    expect(mockedExternalSchematic).toHaveBeenLastCalledWith('@schematics/angular', 'class', {
      name: 'user-summary',
      path: 'projects/demo-app/src/app/features/dashboard',
      project: 'demo-app',
    });
  });

  it('declares documented positional names for pass-through generators', () => {
    for (const schematicName of ['class', 'component', 'service']) {
      const schemaPath = path.resolve(
        __dirname,
        `../../projects/angular-django2/schematics/${schematicName}/schema.json`,
      );
      const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

      expect(schema.properties.name.$default).toEqual({
        $source: 'argv',
        index: 0,
      });
    }
  });

  it('passes app-shell options through to the Angular app-shell schematic', () => {
    appShell({ project: 'demo-app' });

    expect(mockedExternalSchematic).toHaveBeenCalledWith('@schematics/angular', 'app-shell', {
      project: 'demo-app',
    });
  });
});
