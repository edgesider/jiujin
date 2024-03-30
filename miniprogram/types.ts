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

export interface Region {
  _id: number;
  name: string;
  parents: number[];
  children: number[];
}