export interface User {
  _id: string;
  avatar_url: string;
  name: string;
  rid: number;
  sex: number;
  total_release: number;
  total_selled: number;
  total_bought: number;
  total_collect: number;
  last_seen_time: number;
  create_time: number;
  update_time: number;
  like_group_id: string;
  collect_group_id: string;
  comment_group_id: string;
}

export interface Commodity {
  _id: string;
  cid: number;
  content: string;
  img_urls: string[];
  price: number;
  status: null;
  rid: number;
  sex: number;
  campus: string;
  seller_id: string;
  buyer_id: string;
  quality: number;
  view_count: number;
  create_time: number;
  update_time: number;
  polish_time: number;
  only_same_campus: boolean;
  only_same_sex: boolean;
  only_same_building: boolean;
}

export function convertCommodity(raw: any) {
  raw.img_urls = raw.img_urls?.split(',') ?? [];
  return { ...raw };
}

export interface Region {
  _id: number;
  name: string;
  parents: number[];
  children: number[];
}