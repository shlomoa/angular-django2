export interface EmbedComponentSchema {
  /**
   * In file mode (default), the workspace-relative path to the child component
   * TypeScript file to embed. In package mode (when {@link from} is set), the
   * exported class name to embed, such as an Angular Material component.
   * @example 'projects/app/src/app/hero-card/hero-card.ts'
   * @example 'MatDateRangePicker'
   */
  component: string;

  /**
   * Workspace-relative path to the parent component TypeScript file that should
   * host the embedded child component.
   * @example 'projects/app/src/app/app.ts'
   */
  parent: string;

  /**
   * Module specifier to import the component class from. When provided, the
   * schematic runs in "package mode" and treats {@link component} as the class
   * name to import from this module instead of a local file path. Use this to
   * embed existing components such as Angular Material's `MatDateRangePicker`.
   * @example '@angular/material/datepicker'
   */
  from?: string;

  /**
   * Element selector for the embedded component. Only used in package mode.
   * Defaults to the dasherized class name when omitted.
   * @example 'mat-date-range-picker'
   */
  selector?: string;

  /**
   * Comma-separated list of input names to wire on the embedded element. Only
   * used in package mode.
   * @example 'disabled,startAt'
   */
  inputs?: string;

  /**
   * Comma-separated list of output names to bind to `on<Output>()` handlers.
   * Only used in package mode.
   * @example 'opened,closed'
   */
  outputs?: string;
}
