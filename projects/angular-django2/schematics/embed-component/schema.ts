export interface EmbedComponentSchema {
  /**
   * Workspace-relative path to the child component TypeScript file to embed.
   * @example 'projects/app/src/app/hero-card/hero-card.ts'
   */
  component: string;

  /**
   * Workspace-relative path to the parent component TypeScript file that should
   * host the embedded child component.
   * @example 'projects/app/src/app/app.ts'
   */
  parent: string;
}
