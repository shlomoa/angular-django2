import { Injectable, signal, computed } from '@angular/core';

export type MaterialColorScheme = 'rose-red' | 'azure-blue' | 'magenta-violet' | 'cyan-orange';

export interface ColorSchemeOption {
  readonly value: MaterialColorScheme;
  readonly label: string;
  readonly isDark: boolean;
}

export const COLOR_SCHEMES: readonly ColorSchemeOption[] = [
  { value: 'rose-red', label: 'Rose & Red', isDark: false },
  { value: 'azure-blue', label: 'Azure & Blue', isDark: false },
  { value: 'magenta-violet', label: 'Magenta & Violet', isDark: true },
  { value: 'cyan-orange', label: 'Cyan & Orange', isDark: true },
] as const;

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly _selectedColorScheme = signal<MaterialColorScheme>('azure-blue');

  readonly selectedColorScheme = this._selectedColorScheme;
  readonly colorSchemes = COLOR_SCHEMES;

  readonly isDarkTheme = computed(() => {
    const current = this._selectedColorScheme();
    const scheme = COLOR_SCHEMES.find((s) => s.value === current);
    return scheme?.isDark ?? false;
  });

  setColorScheme(scheme: MaterialColorScheme): void {
    this._selectedColorScheme.set(scheme);
  }
}
