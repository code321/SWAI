import type {
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./db/database.types"

/**
 * Shared scalar helpers keep DTOs tethered to Supabase column types.
 */
export type ISODateString = Tables<"exercise_sessions">["started_at"]
export type UUID = Tables<"sets">["id"]
export type CEFRLevel = Enums<"cefr_level">

export type PaginationMeta = {
  next_cursor?: string | null
  count: number
}

export type PaginatedResponse<TItem> = {
  data: TItem[]
  pagination: PaginationMeta
}

export type MessageResponse<TMessage extends string> = {
  message: TMessage
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export type AuthSignUpCommand = {
  email: string
  password: string
  data: Pick<TablesInsert<"profiles">, "timezone">
}

export type AuthSessionDTO = {
  user: {
    id: Tables<"profiles">["user_id"]
    email: string
  }
  session: {
    access_token: string
    refresh_token: string
  }
}

export type AuthLoginCommand = Pick<AuthSignUpCommand, "email" | "password">

export type AuthRecoverCommand = Pick<AuthSignUpCommand, "email">

export type AuthRecoverResponseDTO = MessageResponse<"RESET_EMAIL_SENT">

export type AuthLogoutResponseDTO = MessageResponse<"LOGGED_OUT">

// ---------------------------------------------------------------------------
// Sets & Words
// ---------------------------------------------------------------------------

export type SetsListQuery = {
  search?: string
  level?: CEFRLevel
  cursor?: string
  limit?: number
  sort?: "created_at_desc" | "name_asc"
}

export type SetSummaryDTO = Pick<
  Tables<"sets">,
  "id" | "name" | "level" | "words_count" | "created_at"
>

export type SetsListResponseDTO = PaginatedResponse<SetSummaryDTO>

export type WordDTO = Pick<Tables<"words">, "id" | "pl" | "en">

type GenerationRunMetaDTO = Pick<Tables<"generation_runs">, "id" | "occurred_at">

export type SetDetailDTO = Pick<
  Tables<"sets">,
  "id" | "name" | "level" | "words_count" | "created_at" | "updated_at" | "user_id"
> & {
  words: WordDTO[]
  latest_generation?: GenerationRunMetaDTO | null
}

type WordCreateInput = Pick<TablesInsert<"words">, "pl" | "en">

type WordUpsertInput = { id?: Tables<"words">["id"] } & WordCreateInput

export type SetCreateCommand = Pick<TablesInsert<"sets">, "name" | "level"> & {
  timezone: TablesInsert<"profiles">["timezone"]
  words: WordCreateInput[]
}

export type SetCreateResponseDTO = SetSummaryDTO

export type SetUpdateCommand = Partial<
  Pick<TablesUpdate<"sets">, "name" | "level">
> & {
  words?: WordUpsertInput[]
}

export type SetUpdateResponseDTO = SetDetailDTO

export type SetDeleteResponseDTO = MessageResponse<"SET_DELETED">

export type WordsAddCommand = {
  words: WordCreateInput[]
}

export type WordsAddResponseDTO = {
  added: WordDTO[]
  words_count: Tables<"sets">["words_count"]
}

export type WordUpdateCommand = Partial<
  Pick<TablesUpdate<"words">, "pl" | "en">
>

export type WordUpdateResponseDTO = WordDTO

export type WordDeleteResponseDTO = MessageResponse<"WORD_DELETED"> & {
  words_count: Tables<"sets">["words_count"]
}

// Position removed; reorder feature obsolete

// ---------------------------------------------------------------------------
// Generation runs & sentences
// ---------------------------------------------------------------------------

export type SetGenerationCommand = Pick<
  TablesInsert<"generation_runs">,
  "model_id" | "temperature" | "prompt_version"
>

export type GenerationSentenceDTO = {
  sentence_id: Tables<"sentences">["id"]
  word_id: Tables<"sentences">["word_id"]
  pl_text: Tables<"sentences">["pl_text"]
  target_en: Tables<"sentences">["target_en"]
}

export type GenerationUsageDTO = Pick<
  Tables<"generation_runs">,
  "tokens_in" | "tokens_out" | "cost_usd"
> & {
  remaining_generations_today: number
}

export type GenerationResponseDTO = {
  generation_id: Tables<"generation_runs">["id"]
  set_id: Tables<"generation_runs">["set_id"]
  occurred_at: Tables<"generation_runs">["occurred_at"]
  sentences: GenerationSentenceDTO[]
  usage: GenerationUsageDTO
}

export type SetGenerationListItemDTO = Pick<
  Tables<"generation_runs">,
  "id" | "occurred_at" | "model_id" | "tokens_in" | "tokens_out"
> & {
  sentences_generated: number
}

export type SetGenerationsListResponseDTO =
  PaginatedResponse<SetGenerationListItemDTO>

export type GenerationRunDTO = Pick<
  Tables<"generation_runs">,
  | "id"
  | "set_id"
  | "occurred_at"
  | "model_id"
  | "temperature"
  | "prompt_version"
  | "words_snapshot"
>

export type GenerationSentencesListResponseDTO =
  PaginatedResponse<GenerationSentenceDTO>

// ---------------------------------------------------------------------------
// Exercise sessions
// ---------------------------------------------------------------------------

export type SessionCreateCommand = Pick<
  TablesInsert<"exercise_sessions">,
  "set_id"
> & {
  generation_id?: Tables<"exercise_sessions">["generation_id"]
  mode: "translate"
}

export type SessionCreateResponseDTO = Pick<
  Tables<"exercise_sessions">,
  "id" | "set_id" | "generation_id" | "started_at"
> & {
  pending_sentences: number
}

export type SessionSentenceDTO = {
  sentence_id: Tables<"sentences">["id"]
  pl_text: Tables<"sentences">["pl_text"]
  latest_attempt?: Pick<Tables<"attempts">, "attempt_no" | "is_correct">
}

export type SessionProgressDTO = {
  attempted: number
  correct: number
  remaining: number
}

export type SessionDetailDTO = Pick<
  Tables<"exercise_sessions">,
  "id" | "set_id" | "generation_id" | "started_at" | "finished_at"
> & {
  progress: SessionProgressDTO
  sentences: SessionSentenceDTO[]
}

export type SessionFinishCommand = {
  completed_reason:
    | "all_sentences_answered"
    | "abandoned"
    | "manual_exit"
    | string
}

export type SessionFinishResponseDTO = MessageResponse<"SESSION_FINISHED"> &
  Pick<Tables<"exercise_sessions">, "finished_at">

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

export type AttemptCreateCommand = Pick<
  TablesInsert<"attempts">,
  "sentence_id" | "answer_raw"
> &
  Partial<Pick<TablesInsert<"attempts">, "attempt_no">>

export type AttemptFeedbackDTO = {
  highlight: string[]
  explanation?: string
}

export type AttemptDTO = {
  attempt_id: Tables<"attempts">["id"]
  attempt_no: Tables<"attempts">["attempt_no"]
  is_correct: Tables<"attempts">["is_correct"]
  answer_raw: Tables<"attempts">["answer_raw"]
  answer_norm: Tables<"attempts">["answer_norm"]
  checked_at: Tables<"attempts">["checked_at"]
  feedback: AttemptFeedbackDTO
}

export type AttemptCreateResponseDTO = AttemptDTO

export type AttemptsListResponseDTO = PaginatedResponse<AttemptDTO>

// ---------------------------------------------------------------------------
// Ratings
// ---------------------------------------------------------------------------

export type RatingCommand = Pick<TablesInsert<"ratings">, "stars"> & {
  comment?: string
}

export type RatingDTO = Pick<
  Tables<"ratings">,
  "session_id" | "stars" | "created_at"
> & {
  comment?: string | null
}

export type RatingResponseDTO = RatingDTO | null

// ---------------------------------------------------------------------------
// Sets View Models (Frontend)
// ---------------------------------------------------------------------------

export type SetsQueryState = {
  search?: string
  level?: CEFRLevel
  cursor?: string
  limit: number
  sort: "created_at_desc" | "name_asc"
}

export type SetSummaryVM = {
  id: UUID
  name: string
  level: CEFRLevel
  wordsCount: number
  createdAt: ISODateString
  hasActiveSession: boolean
}

export type SetsPageVM = {
  items: SetSummaryVM[]
  nextCursor?: string
  count: number
}

// ---------------------------------------------------------------------------
// Set Detail View Models (Frontend)
// ---------------------------------------------------------------------------

export type WordVM = {
  id: UUID
  pl: string
  en: string
}

export type SetDetailVM = {
  id: UUID
  name: string
  level: CEFRLevel
  words: WordVM[]
  wordsCount: number
  latestGeneration?: { id: UUID; occurredAt: ISODateString } | null
}

export enum GenerationStatus {
  Idle = "idle",
  Loading = "loading",
  Ready = "ready"
}

// ---------------------------------------------------------------------------
// Usage & Dashboard
// ---------------------------------------------------------------------------

export type UsageDailyDTO = {
  /**
   * Derived from aggregated rows in `generation_log`; primitives keep the DTO
   * storage-agnostic while still tied to Supabase data sources.
   */
  limit: number
  used: number
  remaining: number
  next_reset_at: ISODateString
}

export type DashboardActiveSessionDTO = {
  session_id: Tables<"exercise_sessions">["id"]
  set_id: Tables<"exercise_sessions">["set_id"]
  started_at: Tables<"exercise_sessions">["started_at"]
}

export type DashboardDTO = {
  sets_total: number
  active_session?: DashboardActiveSessionDTO | null
  remaining_generations: number
}

// ---------------------------------------------------------------------------
// Event log
// ---------------------------------------------------------------------------

export type EventLogCommand = Pick<
  TablesInsert<"event_log">,
  "event_type" | "entity_id"
> & {
  /**
   * Additional metadata is stored alongside the event (once the column exists).
   * Typed as Json to stay compatible with Supabase helpers.
   */
  metadata?: Json
}

export type EventLogDTO = Pick<Tables<"event_log">, "id" | "occurred_at">

// ---------------------------------------------------------------------------
// Standardized errors
// ---------------------------------------------------------------------------

export type ApiErrorDTO = {
  error: {
    code: string
    message: string
  }
}

