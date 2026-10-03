// Begin import section
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import type { TemplateRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogState } from '@angular/material/dialog';
import type { MatDialogRef } from '@angular/material/dialog';
import { filter, merge } from 'rxjs';
// End import section

/**
 * Dialog public API (OpenUI `widgets/dialog`):
 * - `open` (`uses.open`): whether the dialog is shown; bind with `[(open)]`.
 * - `modal` (`uses.modal`): a modal dialog has a backdrop and sets `aria-modal`.
 * - Focus moves into the dialog and is contained until it closes, then returns to
 *   the element that had it; Escape dismisses the dialog.
 * - `closed` / `cancelled` (`produces.close` / `produces.cancel`): a dialog dismissed with
 *   Escape or a backdrop click emits `cancelled`; any other closing emits `closed`.
 * - Sections: header (title), children (content) and actions.
 */
@Component({
  selector: 'app-confirm-delete',
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './confirm-delete.html',
  styleUrl: './confirm-delete.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDelete {
  // Begin injected services section
  private readonly dialog = inject(MatDialog);
  // End injected services section

  // Begin input signals section
  /** `uses.open`: whether the dialog is shown. */
  readonly open = model(false);
  /** `uses.modal`: modal (backdrop, `aria-modal`) or non-modal. */
  readonly modal = input(true);
  // End input signals section

  // Begin output signals section
  /** `produces.close`: emitted when the dialog closes without being dismissed. */
  readonly closed = output<void>();
  /** `produces.cancel`: emitted when Escape or a backdrop click dismisses the dialog. */
  readonly cancelled = output<void>();
  // End output signals section

  private readonly template = viewChild.required<TemplateRef<unknown>>('dialogTemplate');
  private dialogRef: MatDialogRef<unknown> | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        untracked(() => this.show());
      } else {
        untracked(() => this.dialogRef?.close());
      }
    });
    inject(DestroyRef).onDestroy(() => this.dialogRef?.close());
  }

  private show(): void {
    if (this.dialogRef) {
      return;
    }

    const modal = this.modal();
    const dialogRef = this.dialog.open(this.template(), {
      ariaDescribedBy: 'confirm-delete-content',
      ariaModal: modal,
      hasBackdrop: modal,
    });
    this.dialogRef = dialogRef;

    // Material closes the dialog first, so its state tells a dismissal from a stray key.
    let dismissed = false;
    merge(
      dialogRef.backdropClick(),
      dialogRef.keydownEvents().pipe(filter((event) => event.key === 'Escape')),
    ).subscribe(() => {
      dismissed ||= dialogRef.getState() === MatDialogState.CLOSING;
    });
    dialogRef.afterClosed().subscribe(() => {
      this.dialogRef = null;
      this.open.set(false);
      if (dismissed) {
        this.cancelled.emit();
      } else {
        this.closed.emit();
      }
    });
  }
}
