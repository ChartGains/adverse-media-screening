export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'analyst' | 'senior_analyst' | 'admin' | 'api_user' | 'auditor'

export type ScreeningStatus = 'pending' | 'searching' | 'analyzing' | 'review' | 'completed' | 'escalated'

export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'

export type MatchStatus = 'pending' | 'matched' | 'excluded' | 'uncertain'

export type ReviewAction = 'confirm_match' | 'exclude' | 'escalate' | 'clear' | 'flag'

export type DecisionType = 'cleared' | 'flagged' | 'escalated'

export type SearchSource = 'serpapi' | 'google_cse'

export type AIProvider = 'claude' | 'openai'

export type BatchStatus = 'processing' | 'completed' | 'failed' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          department: string | null
          is_active: boolean
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: UserRole
          department?: string | null
          is_active?: boolean
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          department?: string | null
          is_active?: boolean
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      screening_subjects: {
        Row: {
          id: string
          full_name: string
          date_of_birth: string
          address: string
          country: string
          aliases: string[] | null
          company_affiliation: string | null
          status: ScreeningStatus
          risk_level: RiskLevel | null
          submitted_by: string | null
          assigned_to: string | null
          batch_id: string | null
          search_queries_count: number
          articles_found_count: number
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          full_name: string
          date_of_birth: string
          address: string
          country: string
          aliases?: string[] | null
          company_affiliation?: string | null
          status?: ScreeningStatus
          risk_level?: RiskLevel | null
          submitted_by?: string | null
          assigned_to?: string | null
          batch_id?: string | null
          search_queries_count?: number
          articles_found_count?: number
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          date_of_birth?: string
          address?: string
          country?: string
          aliases?: string[] | null
          company_affiliation?: string | null
          status?: ScreeningStatus
          risk_level?: RiskLevel | null
          submitted_by?: string | null
          assigned_to?: string | null
          batch_id?: string | null
          search_queries_count?: number
          articles_found_count?: number
          created_at?: string
          completed_at?: string | null
        }
      }
      search_term_categories: {
        Row: {
          id: string
          category_name: string
          description: string | null
          risk_weight: number
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_name: string
          description?: string | null
          risk_weight?: number
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_name?: string
          description?: string | null
          risk_weight?: number
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      search_terms: {
        Row: {
          id: string
          category_id: string | null
          term: string
          variations: string[] | null
          is_active: boolean
          hit_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          term: string
          variations?: string[] | null
          is_active?: boolean
          hit_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          term?: string
          variations?: string[] | null
          is_active?: boolean
          hit_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      search_results: {
        Row: {
          id: string
          subject_id: string | null
          query_used: string
          query_category: string | null
          source: SearchSource
          result_url: string
          result_title: string | null
          result_snippet: string | null
          result_position: number | null
          domain: string | null
          is_duplicate: boolean
          created_at: string
        }
        Insert: {
          id?: string
          subject_id?: string | null
          query_used: string
          query_category?: string | null
          source: SearchSource
          result_url: string
          result_title?: string | null
          result_snippet?: string | null
          result_position?: number | null
          domain?: string | null
          is_duplicate?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          subject_id?: string | null
          query_used?: string
          query_category?: string | null
          source?: SearchSource
          result_url?: string
          result_title?: string | null
          result_snippet?: string | null
          result_position?: number | null
          domain?: string | null
          is_duplicate?: boolean
          created_at?: string
        }
      }
      article_analyses: {
        Row: {
          id: string
          search_result_id: string | null
          subject_id: string | null
          article_content: string | null
          article_headline: string | null
          publication_date: string | null
          publisher: string | null
          article_url: string | null
          ai_provider: AIProvider
          risk_category: string | null
          risk_level: RiskLevel | null
          subject_match_confidence: number | null
          match_status: MatchStatus
          match_reasoning: string | null
          entities_extracted: Json
          ai_summary: string | null
          key_findings: string[] | null
          raw_ai_response: Json | null
          processing_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          search_result_id?: string | null
          subject_id?: string | null
          article_content?: string | null
          article_headline?: string | null
          publication_date?: string | null
          publisher?: string | null
          article_url?: string | null
          ai_provider: AIProvider
          risk_category?: string | null
          risk_level?: RiskLevel | null
          subject_match_confidence?: number | null
          match_status?: MatchStatus
          match_reasoning?: string | null
          entities_extracted?: Json
          ai_summary?: string | null
          key_findings?: string[] | null
          raw_ai_response?: Json | null
          processing_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          search_result_id?: string | null
          subject_id?: string | null
          article_content?: string | null
          article_headline?: string | null
          publication_date?: string | null
          publisher?: string | null
          article_url?: string | null
          ai_provider?: AIProvider
          risk_category?: string | null
          risk_level?: RiskLevel | null
          subject_match_confidence?: number | null
          match_status?: MatchStatus
          match_reasoning?: string | null
          entities_extracted?: Json
          ai_summary?: string | null
          key_findings?: string[] | null
          raw_ai_response?: Json | null
          processing_time_ms?: number | null
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          subject_id: string | null
          article_analysis_id: string | null
          reviewer_id: string | null
          action: ReviewAction
          reason_code: string | null
          notes: string | null
          time_spent_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          subject_id?: string | null
          article_analysis_id?: string | null
          reviewer_id?: string | null
          action: ReviewAction
          reason_code?: string | null
          notes?: string | null
          time_spent_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          subject_id?: string | null
          article_analysis_id?: string | null
          reviewer_id?: string | null
          action?: ReviewAction
          reason_code?: string | null
          notes?: string | null
          time_spent_seconds?: number | null
          created_at?: string
        }
      }
      screening_decisions: {
        Row: {
          id: string
          subject_id: string | null
          decision: DecisionType
          final_risk_level: RiskLevel | null
          decided_by: string | null
          reviewed_by: string | null
          decision_summary: string | null
          flagged_articles_count: number
          total_articles_reviewed: number
          created_at: string
        }
        Insert: {
          id?: string
          subject_id?: string | null
          decision: DecisionType
          final_risk_level?: RiskLevel | null
          decided_by?: string | null
          reviewed_by?: string | null
          decision_summary?: string | null
          flagged_articles_count?: number
          total_articles_reviewed?: number
          created_at?: string
        }
        Update: {
          id?: string
          subject_id?: string | null
          decision?: DecisionType
          final_risk_level?: RiskLevel | null
          decided_by?: string | null
          reviewed_by?: string | null
          decision_summary?: string | null
          flagged_articles_count?: number
          total_articles_reviewed?: number
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          user_email: string | null
          user_role: string | null
          action_type: string
          entity_type: string
          entity_id: string | null
          details: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          user_role?: string | null
          action_type: string
          entity_type: string
          entity_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          user_role?: string | null
          action_type?: string
          entity_type?: string
          entity_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      batch_uploads: {
        Row: {
          id: string
          uploaded_by: string | null
          filename: string
          file_size_bytes: number | null
          total_records: number | null
          processed_records: number
          failed_records: number
          status: BatchStatus
          error_log: Json
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          uploaded_by?: string | null
          filename: string
          file_size_bytes?: number | null
          total_records?: number | null
          processed_records?: number
          failed_records?: number
          status?: BatchStatus
          error_log?: Json
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          uploaded_by?: string | null
          filename?: string
          file_size_bytes?: number | null
          total_records?: number | null
          processed_records?: number
          failed_records?: number
          status?: BatchStatus
          error_log?: Json
          created_at?: string
          completed_at?: string | null
        }
      }
    }
    Views: {
      dashboard_stats: {
        Row: {
          pending_screenings: number
          in_review: number
          completed: number
          escalated: number
          last_24h: number
          last_7_days: number
          active_users: number
          reviews_last_24h: number
        }
      }
      user_activity_summary: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          last_active_at: string | null
          total_screenings_submitted: number
          total_reviews_completed: number
          total_decisions_made: number
        }
      }
    }
    Functions: {
      log_audit_event: {
        Args: {
          p_user_id: string
          p_action_type: string
          p_entity_type: string
          p_entity_id?: string
          p_details?: Json
        }
        Returns: string
      }
    }
  }
}

// Helper types for easier use
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type ScreeningSubject = Database['public']['Tables']['screening_subjects']['Row']
export type SearchTermCategory = Database['public']['Tables']['search_term_categories']['Row']
export type SearchTerm = Database['public']['Tables']['search_terms']['Row']
export type SearchResult = Database['public']['Tables']['search_results']['Row']
export type ArticleAnalysis = Database['public']['Tables']['article_analyses']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type ScreeningDecision = Database['public']['Tables']['screening_decisions']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type BatchUpload = Database['public']['Tables']['batch_uploads']['Row']
export type DashboardStats = Database['public']['Views']['dashboard_stats']['Row']
export type UserActivitySummary = Database['public']['Views']['user_activity_summary']['Row']
