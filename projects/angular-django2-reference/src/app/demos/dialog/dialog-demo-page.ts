import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { ConfirmDelete } from './confirm-delete/confirm-delete';

/** How the demonstration dialog last ended. */
export type DialogOutcome = 'none' | 'closed' | 'cancelled';

/**
 * Demonstration of the `dialog` schematic. `confirm-delete/` is the output of
 *
 *     ng generate angular-django2:dialog --document=confirm-delete.openui.json
 *
 * with two buttons added to its actions section.
 */
@Component({
  selector: 'app-dialog-demo-page',
  imports: [ConfirmDelete, MatButtonModule, MatCardModule, MatSlideToggleModule],
  templateUrl: './dialog-demo-page.html',
  styleUrl: './dialog-demo-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogDemoPage {
  protected readonly open = signal(false);
  protected readonly modal = signal(true);
  protected readonly outcome = signal<DialogOutcome>('none');

  protected readonly command =
    'ng generate angular-django2:dialog --document=src/app/confirm-delete.openui.json';
  protected readonly documentSource = `{
  "id": "confirmDelete",
  "type": "dialog",
  "attrs": {
    "uses.open": "false",
    "uses.modal": "true",
    "produces.close": null,
    "produces.cancel": null
  },
  "children": [
    { "id": "dialogTitle", "type": "header", "attrs": { "uses.title": "\\"Delete this report?\\"" } },
    { "id": "dialogContent", "type": "section" },
    { "id": "dialogActions", "type": "footer" }
  ]
}`;

  protected show(): void {
    this.outcome.set('none');
    this.open.set(true);
  }
}
