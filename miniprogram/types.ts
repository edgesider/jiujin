import { cloudProtocolToHttp } from './utils/other';

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
  verify_status: boolean;
  verify_email?: string;
  verify_time?: number;
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

function convertImgUrls(urls: string | undefined): string[] {
  return (urls?.split(',') ?? [])
    .filter(Boolean)
    .map((img: string) => cloudProtocolToHttp(img));
}

export function convertCommodity(raw: any): Commodity {
  return { ...raw, img_urls: convertImgUrls(raw.img_urls) } as Commodity;
}

export interface Region {
  _id: number;
  name: string;
  level: number;
  parents: number[];
  children: number[];
}

export interface Help {
  _id: string;
  bounty: number;
  content: string;
  status: 0;
  uid: string;
  img_urls: string[];
  is_collected: boolean;
  is_deleted: boolean;
  is_liked: boolean;
  rid: number;
  create_time: number;
  polish_time: number;
  update_time: number;
}

export function convertHelp(raw: any): Help {
  return { ...raw, img_urls: convertImgUrls(raw.img_urls) } as Help;
}

