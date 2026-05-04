export interface NetworkMember {
  id: number;
  path: string;
  refiereid: string | null;
  nombre: string;
  /** Si la API lo envía (p. ej. registro completo). */
  apellidos?: string | null;
  /** Años cumplidos, si el origen los expone. */
  edad?: number | null;
  /** ISO u otro formato parseable por `Date`. */
  fecha_nacimiento?: string | null;
  /** Nombre alterno observado en la tabla fuente. */
  fechadenacimiento?: string | null;
  codigopostal: number | null;
  colonia: string | null;
  selfie_url: string | null;
  hash_code: string | null;
  twitter_username: string | null;
  instagram_username: string | null;
  facebook_username: string | null;
  tiktok_username: string | null;
  temas_mas_interesantes: string | null;
  telefono: number | string | null;
  created_at: string;
  direct_descendants_count: number | null;
  total_descendants_count: number | null;
  wa_message: string | null;
}

export interface NetworkMemberWithChildren extends NetworkMember {
  children: NetworkMemberWithChildren[];
}

export interface NetworkSibling {
  id: number;
  direct_count: number;
  total_count: number;
  created_at: string;
}

export interface NetworkTree {
  referrer: NetworkMember | null;
  you: NetworkMember;
  invited: NetworkMemberWithChildren[];
  siblings: NetworkSibling[];
}

export interface SocialComment {
  comentario_id: string;
  post_id: number;
  username: string;
  comentario: string;
  sentimiento: string;
  fecha_creacion: string;
  key_id: number;
}

export interface UserCommentsSummary {
  platform: 'twitter' | 'instagram' | 'facebook' | 'tiktok';
  total: number;
  positivo: number;
  negativo: number;
  neutro: number;
}

export type CommentsDataMap = Map<string, UserCommentsSummary[]>;

export interface SocialPost {
  post_id: number;
  username: string;
  posted_date: string;
  url: string;
  caption: string;
  likes: number;
  comentarios: number;
  platform: 'twitter' | 'instagram' | 'facebook' | 'tiktok';
}
