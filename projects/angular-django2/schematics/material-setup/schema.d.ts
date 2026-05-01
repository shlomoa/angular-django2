export interface MaterialSetupSchema {
  project: string;
  theme?: 'indigo-pink' | 'deeppurple-amber' | 'pink-bluegrey' | 'purple-green' | 'custom';
  typography?: boolean;
  animations?: boolean;
}
