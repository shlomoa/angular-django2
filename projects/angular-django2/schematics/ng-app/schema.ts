export interface NgAppSchema {
  name: string;
  theme: 'indigo-pink' | 'deeppurple-amber' | 'pink-bluegrey' | 'purple-green' | 'custom';
  typography: boolean;
  animations: boolean;
  routing: boolean;
  standalone: boolean;
  style: string;
  prefix: string;
}
