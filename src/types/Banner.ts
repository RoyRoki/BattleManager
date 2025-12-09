export interface Banner {
  id: string;
  image_url: string;
  title?: string;
  subtitle?: string;
  tournament_id?: string; // Optional link to tournament
  link_url?: string; // Optional custom link
  is_active: boolean;
  order: number; // For ordering banners
  created_at: Date;
  updated_at: Date;
}






