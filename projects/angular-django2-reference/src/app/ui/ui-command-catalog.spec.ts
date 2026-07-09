import {
  UI_COMMAND_CATEGORIES,
  UI_COMMANDS,
  getUiCommandCategory,
  getUiCommandsByCategory,
} from './ui-command-catalog';

const schematicCommandIds = [
  'ng-add',
  'application',
  'app-shell',
  'class',
  'component',
  'service',
  'material-setup',
  'project-structure',
  'material-app',
  'workspace-setup',
  'api-setup',
  'data-service',
] as const;

describe('UI command catalog', () => {
  it('represents every schematic command exactly once', () => {
    expect(UI_COMMANDS.map((command) => command.id).sort()).toEqual(
      [...schematicCommandIds].sort(),
    );
    expect(new Set(UI_COMMANDS.map((command) => command.id)).size).toBe(UI_COMMANDS.length);
  });

  it('groups commands into the planned categories', () => {
    expect(UI_COMMAND_CATEGORIES.map((category) => category.id)).toEqual([
      'workspace-setup',
      'application-creation',
      'ui-material-shell',
      'project-structure',
      'code-generation',
      'api-data',
    ]);
    expect(getUiCommandsByCategory('workspace-setup').map((command) => command.id)).toEqual([
      'ng-add',
      'workspace-setup',
    ]);
    expect(getUiCommandsByCategory('application-creation').map((command) => command.id)).toEqual([
      'application',
      'material-app',
    ]);
    expect(getUiCommandsByCategory('ui-material-shell').map((command) => command.id)).toEqual([
      'material-setup',
      'app-shell',
    ]);
    expect(getUiCommandsByCategory('project-structure').map((command) => command.id)).toEqual([
      'project-structure',
    ]);
    expect(getUiCommandsByCategory('code-generation').map((command) => command.id)).toEqual([
      'component',
      'service',
      'class',
    ]);
    expect(getUiCommandsByCategory('api-data').map((command) => command.id)).toEqual([
      'api-setup',
      'data-service',
    ]);
  });

  it('defines complete display metadata for every command', () => {
    for (const command of UI_COMMANDS) {
      expect(command.name).not.toBe('');
      if (command.id === 'ng-add') {
        expect(command.command).toBe('ng add angular-django2');
      } else {
        expect(command.command).toContain(`angular-django2:${command.id}`);
      }
      expect(command.summary).not.toBe('');
      expect(command.before.title).not.toBe('');
      expect(command.before.description).not.toBe('');
      expect(command.before.highlights.length).toBeGreaterThan(0);
      expect(command.after.title).not.toBe('');
      expect(command.after.description).not.toBe('');
      expect(command.after.highlights.length).toBeGreaterThan(0);
    }
  });

  it('marks commands with visual effects with illustrations', () => {
    for (const command of UI_COMMANDS.filter((candidate) => candidate.effect === 'visual')) {
      expect(command.illustration?.imagePath).toMatch(/^\/ui-commands\/.+\.svg$/);
      expect(command.illustration?.imageAlt).not.toBe('');
    }
  });

  it('provides category card fallbacks for visual and non-visual categories', () => {
    for (const category of UI_COMMAND_CATEGORIES) {
      expect(category.name).not.toBe('');
      expect(category.summary).not.toBe('');
      expect(category.card.description).not.toBe('');

      if (category.card.kind === 'image') {
        expect(category.card.imagePath).toMatch(/^\/ui-categories\/.+\.svg$/);
        expect(category.card.imageAlt).not.toBe('');
      } else {
        expect(category.card.imagePath).toBeUndefined();
        expect(category.card.imageAlt).toBeUndefined();
      }
    }
  });

  it('looks up categories by id and fails fast for unknown ids', () => {
    expect(getUiCommandCategory('workspace-setup').name).toBe('Workspace setup');
    expect(() => getUiCommandCategory('missing-category' as never)).toThrow(
      'Unknown UI command category: missing-category',
    );
  });
});
