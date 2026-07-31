import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import * as path from 'node:path';

const collectionPath = path.join(
  __dirname,
  '../../dist/angular-django2/schematics/collection.json',
);
const angularCollectionPath = path.join(
  __dirname,
  '../../node_modules/@schematics/angular/collection.json',
);

describe('complex-component schematic', () => {
  let runner: SchematicTestRunner;
  let angularRunner: SchematicTestRunner;

  beforeEach(() => {
    runner = new SchematicTestRunner('angular-django2', collectionPath);
    angularRunner = new SchematicTestRunner('@schematics/angular', angularCollectionPath);
  });

  async function createApplicationTree(): Promise<UnitTestTree> {
    let tree = (await angularRunner.runSchematic(
      'workspace',
      { name: 'demo', version: '22.0.0', newProjectRoot: 'projects' },
      Tree.empty(),
    )) as UnitTestTree;
    tree = (await angularRunner.runSchematic(
      'application',
      { name: 'demo-app', standalone: true, routing: false, style: 'scss', zoneless: true },
      tree,
    )) as UnitTestTree;

    const packageJson = JSON.parse(tree.readContent('/package.json'));
    packageJson.dependencies['@angular/material'] = '^22.0.0';
    packageJson.dependencies['@angular/cdk'] = '^22.0.0';
    tree.overwrite('/package.json', JSON.stringify(packageJson, null, 2));

    return tree;
  }

  it('TC-COMPLEX-01: composes component and embed-component for all advanced features', async () => {
    const tree = await createApplicationTree();
    const generated = await runner.runSchematic(
      'complex-component',
      {
        name: 'dashboard-card',
        project: 'demo-app',
        path: 'src/app/features/dashboard',
        features: 'mixins,nested,projection,cdk-overlay',
      },
      tree,
    );

    const componentRoot = '/projects/demo-app/src/app/features/dashboard/dashboard-card';
    const parent = generated.readContent(`${componentRoot}/dashboard-card.ts`);
    const template = generated.readContent(`${componentRoot}/dashboard-card.html`);
    const styles = generated.readContent('/projects/demo-app/src/styles.scss');

    expect(parent).toContain("import { MatCardModule } from '@angular/material/card';");
    expect(parent).toContain(
      "import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';",
    );
    expect(parent).toContain('Complex component public API:');
    expect(parent).toContain(
      'imports: [MatCardModule, MatButtonModule, CdkConnectedOverlay, CdkOverlayOrigin',
    );
    expect(parent).toContain('DashboardCardHeader');
    expect(parent).toContain('DashboardCardContent');
    expect(template).toContain('<ng-content select="[dashboard-card-header]"></ng-content>');
    expect(template).toContain('cdkConnectedOverlay');
    expect(generated.files).toContain(
      `${componentRoot}/dashboard-card-header/dashboard-card-header.ts`,
    );
    expect(generated.files).toContain(
      `${componentRoot}/dashboard-card-content/dashboard-card-content.ts`,
    );
    expect(generated.readContent(`${componentRoot}/_dashboard-card-theme.scss`)).toContain(
      '@mixin dashboard-card-theme()',
    );
    expect(styles).toContain(
      "@use './app/features/dashboard/dashboard-card/dashboard-card-theme' as dashboardCardTheme;",
    );
    expect(styles).toContain('@include dashboardCardTheme.dashboard-card-theme();');
  });

  it('TC-COMPLEX-02: modifies existing features and deletes only after confirmation', async () => {
    const tree = await createApplicationTree();
    const options = {
      name: 'dashboard-card',
      project: 'demo-app',
      path: 'src/app/features/dashboard',
      features: 'mixins,nested',
    };
    const created = await runner.runSchematic('complex-component', options, tree);
    const modified = await runner.runSchematic(
      'complex-component',
      { ...options, mode: 'modify', features: 'nested,projection' },
      created,
    );
    const componentRoot = '/projects/demo-app/src/app/features/dashboard/dashboard-card';

    expect(modified.readContent(`${componentRoot}/dashboard-card.html`)).toContain(
      '<ng-content select="[dashboard-card-header]"></ng-content>',
    );
    expect(modified.readContent(`${componentRoot}/dashboard-card.ts`)).toContain(
      'Projection slots: [dashboard-card-header], default, [dashboard-card-actions].',
    );
    await expect(
      runner.runSchematic('complex-component', { ...options, mode: 'delete' }, modified),
    ).rejects.toThrow('requires --confirm=true');

    const deleted = await runner.runSchematic(
      'complex-component',
      { ...options, mode: 'delete', confirm: true },
      modified,
    );
    expect(deleted.files).not.toContain(`${componentRoot}/dashboard-card.ts`);
    expect(deleted.readContent('/projects/demo-app/src/styles.scss')).not.toContain(
      'dashboardCardTheme',
    );
  });

  it('TC-COMPLEX-03: rejects invalid names, paths, feature lists, and prerequisites', async () => {
    const tree = await createApplicationTree();
    const baseOptions = {
      project: 'demo-app',
      path: 'src/app',
      features: 'mixins',
    };

    await expect(
      runner.runSchematic('complex-component', { ...baseOptions, name: 'DashboardCard' }, tree),
    ).rejects.toThrow('kebab-case');
    await expect(
      runner.runSchematic(
        'complex-component',
        {
          ...baseOptions,
          name: 'dashboard-card',
          path: '../outside',
        },
        tree,
      ),
    ).rejects.toThrow('within the application source tree');
    await expect(
      runner.runSchematic(
        'complex-component',
        {
          ...baseOptions,
          name: 'dashboard-card',
          features: 'unknown',
        },
        tree,
      ),
    ).rejects.toThrow('Unsupported complex-component feature');

    const missingDependencies = tree.branch() as UnitTestTree;
    missingDependencies.overwrite('/package.json', JSON.stringify({ dependencies: {} }));
    await expect(
      runner.runSchematic(
        'complex-component',
        { ...baseOptions, name: 'dashboard-card' },
        missingDependencies,
      ),
    ).rejects.toThrow('Angular Material/CDK prerequisites');
  });
});
