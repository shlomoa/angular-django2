export interface MaterialAppSchema {
  name: string;
  theme?: 'indigo-pink' | 'deeppurple-amber' | 'pink-bluegrey' | 'purple-green' | 'custom';
  typography?: boolean;
  animations?: boolean;
  routing?: boolean;
  standalone?: boolean;
  ssr?: boolean;
  zoneless?: boolean;
  defaults?: boolean;
  style?: string;
  prefix?: string;
}
