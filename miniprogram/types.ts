import { cloudProtocolToHttp } from './utils/other';
import { VerifyStatus } from './api/verify';

export interface User {
  _id: string;
  avatar_url: string;
  name: string;
  rid: number;
  sex: number;
  total_release: number;
  total_help_release: number;
  total_selled: number;
  total_bought: number;
  total_collect: number;
  last_seen_time: number;
  create_time: number;
  update_time: number;
  verify_status: VerifyStatus;
  verify_email?: string;
  verify_time?: number;
  verify_index: number;
  notify_comment_count: number;
  notify_info_count: number;
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
  collected_count: number;
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
  status: number;
  seller_id: string;
  rid: number;
  img_urls: string[];
  is_collected: boolean;
  is_deleted: boolean;
  is_liked: boolean;
  liked_count: number;
  collected_count: number;
  comment_count: number;
  create_time: number;
  polish_time: number;
  update_time: number;
}

export function convertHelp(raw: any): Help {
  return {
    ...raw,
    img_urls: convertImgUrls(raw.img_urls),
  } as Help;
}

export interface Comment {
  id: number;
  content: string;
  reply_to: number;
  sender: User;
  entity_id: string;
  create_time: number;
  root_comment: number;
  entity_type: EntityType;
}

export enum EntityType {
  Commodity = 0,
  Help = 1,
}

export function convertComment(raw: any): Comment {
  const entityType = EntityType[raw.entity_type];
  if (!entityType) {
    throw Error('invalid comment');
  }
  return {
    ...raw,
    entity_type: entityType
  };
}

export interface Banner {
  _id: string;
  url: string;
  rid: number;
  page_path?: string;
  schema?: string;
}