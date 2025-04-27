
import { supabase } from "@/integrations/supabase/client";

export const assets = {
  images: {
    logo: "/lovable-uploads/7b7a503e-1812-4d7e-a1ca-71dc2fbb9c1c.png",
    hero: "/lovable-uploads/65ea5dad-8617-4875-a202-5b1297621604.png",
    process: "/lovable-uploads/fc742578-7f0a-49a6-b4f7-533d49a22a20.png",
    boxHouse: "/lovable-uploads/2c1302a3-ea6d-4bb1-ae2c-81e0afd81669.png",
  },
  projects: {
    boxHouse: {
      main: "/lovable-uploads/2c1302a3-ea6d-4bb1-ae2c-81e0afd81669.png",
      gallery: [
        "/lovable-uploads/2c1302a3-ea6d-4bb1-ae2c-81e0afd81669.png",
      ]
    },
  }
};

export type AssetKey = keyof typeof assets.images;
export type ProjectKey = keyof typeof assets.projects;

export async function getStorageUrl(path: string) {
  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(path);
  return data.publicUrl;
}
