export interface BAEvent {
  key: string;
  name: string;
  event_code: string;
  event_type: number;
  district: {
    abbreviation: string;
    display_name: string;
    key: string;
    year: number;
  };
  city: string;
  state_prov: string;
  country: string;
  start_date: string;
  end_date: string;
  year: number;
  short_name: string;
  event_type_string: string;
  week: number;
  address: string;
  postal_code: string;
  gmaps_place_id: string;
  gmaps_url: string;
  lat: number;
  lng: number;
  location_name: string;
  timezone: string;
  website: string;
  first_event_id: string;
  first_event_code: string;
  webcasts: [
    {
      type: string;
      channel: string;
      date: string;
      file: string;
    }
  ];
  division_keys: [string];
  parent_event_key: string;
  playoff_type: number;
  playoff_type_string: string;
}

export interface BATeam
{
  key: string,
  team_number: number,
  nickname: string,
  name: string,
  school_name: string,
  city: string,
  state_prov: string,
  country: string,
  address: string,
  postal_code: string,
  gmaps_place_id: string,
  gmaps_url: string,
  lat: number,
  lng: number,
  location_name: string,
  website: string,
  rookie_year: number
}

export interface BAOprData{
  oprs: any,
  dprs: any,
  ccwms: any
}

export interface BARankingData {
  matches_played: number,
  qual_average: number,
  extra_stats: [
    number
  ],
  sort_orders: [
    number
  ],
  record: {
    losses: number,
    wins: number,
    ties: number
  },
  rank: number,
  dq: number,
  team_key: string
}

export interface BARankingExtraStatInfo {
  precision: number,
  name: string
}

export interface BARankingSortOrderInfo {
  precision: number,
  name: string
}

export interface BARankings
{
  rankings: BARankingData[],
  extra_stats_info: BARankingExtraStatInfo[],
  sort_order_info: BARankingSortOrderInfo[]
}

export interface BAVideo {
    type: string,
    key: string
}

export interface BAMatch
{
  key: string,
  comp_level: string,
  set_number: number,
  match_number: number,
  alliances: {
    red: {
      score?: number,
      team_keys: [string, string, string],
      surrogate_team_keys?: [string, string, string] | [number, number, number ] | [],
      dq_team_keys?: [string, string, string] | [number, number, number ] | [],
    },
    blue: {
      score?: number,
      team_keys: [string, string, string],
      surrogate_team_keys?: [string, string, string] | [number, number, number ] | [],
      dq_team_keys?: [string, string, string] | [number, number, number ] | [],
    }
  },
  winning_alliance?: string,
  event_key?: string,
  time?: number,
  actual_time?: number,
  predicted_time?: number,
  post_result_time?: number,
  score_breakdown?: {
    blue: any,
    red: any,
  },
  videos?: BAVideo[],
}
