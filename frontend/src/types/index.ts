export interface TeamStanding {
  position: number
  name: string
  club_id?: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  source?: string
}

export interface HomeAwaySplit {
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  points: number
  ppg: number
  gf_per_game: number
  ga_per_game: number
}

export interface GoalTrendEntry {
  round: number | null
  gf: number
  ga: number
  venue: 'H' | 'A'
  opponent?: string
}

export interface AdvancedTeamStats extends TeamStanding {
  ppg: number
  gf_per_game: number
  ga_per_game: number
  pythagorean_expectation: number
  pythagorean_points: number
  points_above_expectation: number
  form: ('W' | 'D' | 'L')[]
  form_points: number
  win_streak: number
  unbeaten_streak: number
  scoring_streak: number
  clean_sheets: number
  failed_to_score: number
  btts: number
  over_2_5: number
  over_3_5: number
  scoring_consistency: number
  home: HomeAwaySplit
  away: HomeAwaySplit
  goals_trend: GoalTrendEntry[]
}

export interface MatchResult {
  round: number | null
  date: string
  home_team: string
  away_team: string
  home_goals: number
  away_goals: number
  source?: string
}

export interface Scorer {
  rank: number
  name: string
  club: string
  goals: number
  source?: string
}

export interface CardEntry {
  name: string
  yellow_cards: number
  red_cards: number
  source?: string
}

export interface LeagueStats {
  total_matches: number
  total_goals: number
  avg_goals_per_match: number
  home_wins: number
  draws: number
  away_wins: number
  home_win_pct: number
  draw_pct: number
  away_win_pct: number
  btts_pct: number
  over_25_pct: number
  over_35_pct: number
  highest_scoring_match?: MatchResult
}

export interface EloEntry {
  rank: number
  team: string
  elo: number
}

export interface FormResult {
  result: string
  gf: number
  ga: number
  opponent?: string
}

export interface FormTableEntry {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
  form: FormResult[]
}

export interface ScorelineStats {
  most_common: { score: string; count: number }[]
  avg_margin: number
  avg_total_goals: number
  zero_zero: number
  one_nil: number
  total_matches: number
}

export interface H2HMatrix {
  teams: string[]
  matrix: Record<string, Record<string, string[]>>
}

export interface TitleRelegationEntry {
  team: string
  position: number
  points: number
  played: number
  remaining: number
  max_points: number
  ppg: number
  projected: number
  total_rounds: number
}

export interface PositionsOverTime {
  teams: string[]
  rounds: { round: number; positions: Record<string, number> }[]
}

export interface RoundSummary {
  round: number | null
  text: string | null
  model?: string
  error?: string | null
}

export interface DashboardData {
  standings: TeamStanding[]
  advanced_teams: AdvancedTeamStats[]
  results: MatchResult[]
  schedule: MatchResult[]
  league: LeagueStats
  elo?: EloEntry[]
  form_table?: FormTableEntry[]
  scoreline_stats?: ScorelineStats
  h2h_matrix?: H2HMatrix
  title_relegation?: TitleRelegationEntry[]
  positions_over_time?: PositionsOverTime
  round_summary?: RoundSummary | null
}

export type WidgetId =
  | 'standings'
  | 'pythagorean'
  | 'form'
  | 'results'
  | 'league_stats'
  | 'home_away'
  | 'goals_trend'
  | 'schedule'
  | 'clean_sheets'
  | 'streaks'
  | 'elo'
  | 'form_table'
  | 'h2h_matrix'
  | 'scoreline_stats'
  | 'title_relegation'
  | 'points_pace'
  | 'positions_over_time'
  | 'round_summary'
