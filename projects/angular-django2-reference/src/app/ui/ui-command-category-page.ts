import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import {
  UI_COMMAND_CATEGORIES,
  getUiCommandsByCategory,
  type UiCommand,
  type UiCommandId,
} from './ui-command-catalog';

@Component({
  selector: 'app-ui-command-category-page',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './ui-command-category-page.html',
  styleUrl: './ui-command-category-page.scss',
})
export class UiCommandCategoryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly categoryId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('categoryId'))),
    { initialValue: this.route.snapshot.paramMap.get('categoryId') },
  );

  protected readonly selectedCommandId = signal<UiCommandId | null>(null);
  protected readonly appliedCommandId = signal<UiCommandId | null>(null);
  protected readonly category = computed(() =>
    UI_COMMAND_CATEGORIES.find((candidate) => candidate.id === this.categoryId()),
  );
  protected readonly commands = computed(() => {
    const category = this.category();

    return category ? getUiCommandsByCategory(category.id) : [];
  });
  protected readonly selectedCommand = computed(() => {
    const commands = this.commands();
    const selectedCommandId = this.selectedCommandId();

    return commands.find((command) => command.id === selectedCommandId) ?? commands[0];
  });

  protected selectCommand(command: UiCommand): void {
    this.selectedCommandId.set(command.id);
    this.appliedCommandId.set(null);
  }

  protected isSelectedCommand(command: UiCommand): boolean {
    return this.selectedCommand()?.id === command.id;
  }

  protected isSelectedCommandApplied(): boolean {
    const selectedCommand = this.selectedCommand();

    return !!selectedCommand && this.appliedCommandId() === selectedCommand.id;
  }

  protected applySelectedCommand(): void {
    const selectedCommand = this.selectedCommand();

    if (selectedCommand) {
      this.appliedCommandId.set(selectedCommand.id);
    }
  }
}
