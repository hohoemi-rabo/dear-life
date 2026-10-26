// Supabase の型（自動生成。手で直さない）。マイグレーションを当てたら Supabase MCP の generate_typescript_types で作り直す
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bus_outings: {
        Row: {
          created_at: string
          day_type: string
          depart_after: string
          destination_stop_name: string
          district_id: string
          id: number
          next_return_arrival: string | null
          next_return_departure: string | null
          next_return_route_name: string | null
          origin_departures_per_day: number
          origin_stop_name: string
          outbound_arrival: string | null
          outbound_departure: string | null
          outbound_route_name: string | null
          outbound_trips_per_day: number
          return_after: string
          return_arrival: string | null
          return_departure: string | null
          return_route_name: string | null
          return_trips_per_day: number
          service_date: string
          sort_order: number
          source_id: string
          status: string
          updated_at: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          day_type: string
          depart_after: string
          destination_stop_name: string
          district_id: string
          id?: never
          next_return_arrival?: string | null
          next_return_departure?: string | null
          next_return_route_name?: string | null
          origin_departures_per_day: number
          origin_stop_name: string
          outbound_arrival?: string | null
          outbound_departure?: string | null
          outbound_route_name?: string | null
          outbound_trips_per_day: number
          return_after: string
          return_arrival?: string | null
          return_departure?: string | null
          return_route_name?: string | null
          return_trips_per_day: number
          service_date: string
          sort_order: number
          source_id: string
          status: string
          updated_at?: string
          valid_until: string
        }
        Update: {
          created_at?: string
          day_type?: string
          depart_after?: string
          destination_stop_name?: string
          district_id?: string
          id?: never
          next_return_arrival?: string | null
          next_return_departure?: string | null
          next_return_route_name?: string | null
          origin_departures_per_day?: number
          origin_stop_name?: string
          outbound_arrival?: string | null
          outbound_departure?: string | null
          outbound_route_name?: string | null
          outbound_trips_per_day?: number
          return_after?: string
          return_arrival?: string | null
          return_departure?: string | null
          return_route_name?: string | null
          return_trips_per_day?: number
          service_date?: string
          sort_order?: number
          source_id?: string
          status?: string
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_outings_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_outings_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          checked_on: string | null
          created_at: string
          credit_text: string | null
          fetched_at: string | null
          id: string
          is_published: boolean
          license: string | null
          name: string
          period_label: string | null
          publisher: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          checked_on?: string | null
          created_at?: string
          credit_text?: string | null
          fetched_at?: string | null
          id: string
          is_published?: boolean
          license?: string | null
          name: string
          period_label?: string | null
          publisher: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          checked_on?: string | null
          created_at?: string
          credit_text?: string | null
          fetched_at?: string | null
          id?: string
          is_published?: boolean
          license?: string | null
          name?: string
          period_label?: string | null
          publisher?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      district_events: {
        Row: {
          art: Database["public"]["Enums"]["event_art"]
          checked_on: string
          chushin_area: Database["public"]["Enums"]["chushin_area"] | null
          created_at: string
          district_id: string
          id: number
          is_for_children: boolean
          is_published: boolean
          name: string
          participation: Database["public"]["Enums"]["event_participation"]
          participation_note: string | null
          scope: Database["public"]["Enums"]["event_scope"]
          season: Database["public"]["Enums"]["season"]
          sort_order: number
          source_note: string
          timing_note: string
          updated_at: string
        }
        Insert: {
          art?: Database["public"]["Enums"]["event_art"]
          checked_on: string
          chushin_area?: Database["public"]["Enums"]["chushin_area"] | null
          created_at?: string
          district_id: string
          id?: never
          is_for_children?: boolean
          is_published?: boolean
          name: string
          participation?: Database["public"]["Enums"]["event_participation"]
          participation_note?: string | null
          scope: Database["public"]["Enums"]["event_scope"]
          season: Database["public"]["Enums"]["season"]
          sort_order?: number
          source_note: string
          timing_note: string
          updated_at?: string
        }
        Update: {
          art?: Database["public"]["Enums"]["event_art"]
          checked_on?: string
          chushin_area?: Database["public"]["Enums"]["chushin_area"] | null
          created_at?: string
          district_id?: string
          id?: never
          is_for_children?: boolean
          is_published?: boolean
          name?: string
          participation?: Database["public"]["Enums"]["event_participation"]
          participation_note?: string | null
          scope?: Database["public"]["Enums"]["event_scope"]
          season?: Database["public"]["Enums"]["season"]
          sort_order?: number
          source_note?: string
          timing_note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "district_events_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          area_description: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          area_description: string
          created_at?: string
          id: string
          name: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          area_description?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      facilities: {
        Row: {
          address: string | null
          attributes: Json
          created_at: string
          district_id: string | null
          id: number
          kind: Database["public"]["Enums"]["facility_kind"]
          latitude: number | null
          longitude: number | null
          name: string
          source_id: string
          source_key: string
          subkind: string | null
          town_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          attributes?: Json
          created_at?: string
          district_id?: string | null
          id?: never
          kind: Database["public"]["Enums"]["facility_kind"]
          latitude?: number | null
          longitude?: number | null
          name: string
          source_id: string
          source_key: string
          subkind?: string | null
          town_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          attributes?: Json
          created_at?: string
          district_id?: string | null
          id?: never
          kind?: Database["public"]["Enums"]["facility_kind"]
          latitude?: number | null
          longitude?: number | null
          name?: string
          source_id?: string
          source_key?: string
          subkind?: string | null
          town_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilities_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facilities_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      gtfs_feeds: {
        Row: {
          created_at: string
          feed_id: string
          feed_name: string
          feed_version: string | null
          file_uid: string
          imported_at: string
          organization_id: string
          published_at: string
          source_id: string
          updated_at: string
          valid_from: string
          valid_to: string
        }
        Insert: {
          created_at?: string
          feed_id: string
          feed_name: string
          feed_version?: string | null
          file_uid: string
          imported_at: string
          organization_id: string
          published_at: string
          source_id: string
          updated_at?: string
          valid_from: string
          valid_to: string
        }
        Update: {
          created_at?: string
          feed_id?: string
          feed_name?: string
          feed_version?: string | null
          file_uid?: string
          imported_at?: string
          organization_id?: string
          published_at?: string
          source_id?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "gtfs_feeds_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_runs: {
        Row: {
          error_message: string | null
          external_calls: number | null
          finished_at: string | null
          id: number
          job: string
          progress: Json | null
          rows_written: number | null
          source_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["ingest_status"]
        }
        Insert: {
          error_message?: string | null
          external_calls?: number | null
          finished_at?: string | null
          id?: never
          job: string
          progress?: Json | null
          rows_written?: number | null
          source_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["ingest_status"]
        }
        Update: {
          error_message?: string | null
          external_calls?: number | null
          finished_at?: string | null
          id?: never
          job?: string
          progress?: Json | null
          rows_written?: number | null
          source_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["ingest_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ingest_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      market_stats: {
        Row: {
          category: Database["public"]["Enums"]["market_category"]
          computed_at: string
          district_id: string
          median_value: number | null
          p25_value: number | null
          p75_value: number | null
          period_from: string
          period_to: string
          sample_count: number
          source_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["market_category"]
          computed_at?: string
          district_id: string
          median_value?: number | null
          p25_value?: number | null
          p75_value?: number | null
          period_from: string
          period_to: string
          sample_count: number
          source_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["market_category"]
          computed_at?: string
          district_id?: string
          median_value?: number | null
          p25_value?: number | null
          p75_value?: number | null
          period_from?: string
          period_to?: string
          sample_count?: number
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_stats_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_stats_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      population: {
        Row: {
          age_0_14: number | null
          age_15_64: number | null
          age_65_plus: number | null
          as_of: string
          created_at: string
          district_id: string
          source_id: string
          total: number
          updated_at: string
        }
        Insert: {
          age_0_14?: number | null
          age_15_64?: number | null
          age_65_plus?: number | null
          as_of: string
          created_at?: string
          district_id: string
          source_id: string
          total: number
          updated_at?: string
        }
        Update: {
          age_0_14?: number | null
          age_15_64?: number | null
          age_65_plus?: number | null
          as_of?: string
          created_at?: string
          district_id?: string
          source_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "population_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "population_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      real_estate_transactions: {
        Row: {
          area_sqm: number | null
          building_year: number | null
          circumstances: string | null
          district_code: string | null
          district_id: string | null
          fetched_at: string
          id: number
          is_excluded: boolean
          price_category: string
          property_type: string
          raw: Json
          town_name: string
          trade_price: number | null
          trade_quarter: number
          trade_year: number
          unit_price_per_sqm: number | null
          use: string | null
        }
        Insert: {
          area_sqm?: number | null
          building_year?: number | null
          circumstances?: string | null
          district_code?: string | null
          district_id?: string | null
          fetched_at?: string
          id?: never
          is_excluded?: boolean
          price_category: string
          property_type: string
          raw: Json
          town_name: string
          trade_price?: number | null
          trade_quarter: number
          trade_year: number
          unit_price_per_sqm?: number | null
          use?: string | null
        }
        Update: {
          area_sqm?: number | null
          building_year?: number | null
          circumstances?: string | null
          district_code?: string | null
          district_id?: string | null
          fetched_at?: string
          id?: never
          is_excluded?: boolean
          price_category?: string
          property_type?: string
          raw?: Json
          town_name?: string
          trade_price?: number | null
          trade_quarter?: number
          trade_year?: number
          unit_price_per_sqm?: number | null
          use?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "real_estate_transactions_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_sentences: {
        Row: {
          body: string
          car: Database["public"]["Enums"]["car_choice"] | null
          created_at: string
          has_children: boolean | null
          housing: Database["public"]["Enums"]["housing_choice"] | null
          id: number
          karte_card: Database["public"]["Enums"]["karte_card"] | null
          kind: Database["public"]["Enums"]["sentence_kind"]
          position: number
          template_id: number
          updated_at: string
        }
        Insert: {
          body: string
          car?: Database["public"]["Enums"]["car_choice"] | null
          created_at?: string
          has_children?: boolean | null
          housing?: Database["public"]["Enums"]["housing_choice"] | null
          id?: never
          karte_card?: Database["public"]["Enums"]["karte_card"] | null
          kind: Database["public"]["Enums"]["sentence_kind"]
          position: number
          template_id: number
          updated_at?: string
        }
        Update: {
          body?: string
          car?: Database["public"]["Enums"]["car_choice"] | null
          created_at?: string
          has_children?: boolean | null
          housing?: Database["public"]["Enums"]["housing_choice"] | null
          id?: never
          karte_card?: Database["public"]["Enums"]["karte_card"] | null
          kind?: Database["public"]["Enums"]["sentence_kind"]
          position?: number
          template_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_sentences_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "scene_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_templates: {
        Row: {
          car: Database["public"]["Enums"]["car_choice"] | null
          created_at: string
          has_children: boolean | null
          housing: Database["public"]["Enums"]["housing_choice"] | null
          id: number
          is_published: boolean
          reviewed_on: string | null
          season: Database["public"]["Enums"]["season"]
          title: string
          updated_at: string
        }
        Insert: {
          car?: Database["public"]["Enums"]["car_choice"] | null
          created_at?: string
          has_children?: boolean | null
          housing?: Database["public"]["Enums"]["housing_choice"] | null
          id?: never
          is_published?: boolean
          reviewed_on?: string | null
          season: Database["public"]["Enums"]["season"]
          title: string
          updated_at?: string
        }
        Update: {
          car?: Database["public"]["Enums"]["car_choice"] | null
          created_at?: string
          has_children?: boolean | null
          housing?: Database["public"]["Enums"]["housing_choice"] | null
          id?: never
          is_published?: boolean
          reviewed_on?: string | null
          season?: Database["public"]["Enums"]["season"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_districts: {
        Row: {
          created_at: string
          district_id: string | null
          geometry: Json
          id: number
          level: Database["public"]["Enums"]["school_level"]
          school_name: string
          source_id: string
          source_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          district_id: string | null
          geometry: Json
          id?: never
          level: Database["public"]["Enums"]["school_level"]
          school_name: string
          source_id: string
          source_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          district_id?: string | null
          geometry?: Json
          id?: never
          level?: Database["public"]["Enums"]["school_level"]
          school_name?: string
          source_id?: string
          source_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_districts_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_districts_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      support_programs: {
        Row: {
          category: Database["public"]["Enums"]["support_category"]
          checked_on: string
          created_at: string
          id: number
          is_published: boolean
          name: string
          official_url: string
          sort_order: number
          summary: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["support_category"]
          checked_on: string
          created_at?: string
          id?: never
          is_published?: boolean
          name: string
          official_url: string
          sort_order?: number
          summary: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["support_category"]
          checked_on?: string
          created_at?: string
          id?: never
          is_published?: boolean
          name?: string
          official_url?: string
          sort_order?: number
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      town_district_map: {
        Row: {
          certainty: string
          chushin_area: Database["public"]["Enums"]["chushin_area"] | null
          city_district: string
          created_at: string
          district_id: string | null
          note: string | null
          town_name: string
          updated_at: string
        }
        Insert: {
          certainty: string
          chushin_area?: Database["public"]["Enums"]["chushin_area"] | null
          city_district: string
          created_at?: string
          district_id?: string | null
          note?: string | null
          town_name: string
          updated_at?: string
        }
        Update: {
          certainty?: string
          chushin_area?: Database["public"]["Enums"]["chushin_area"] | null
          city_district?: string
          created_at?: string
          district_id?: string | null
          note?: string | null
          town_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "town_district_map_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      train_departures: {
        Row: {
          created_at: string
          departure: string
          direction: string
          district_id: string
          id: number
          source_id: string
          station_name: string
          train_id: string
          train_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          departure: string
          direction: string
          district_id: string
          id?: never
          source_id: string
          station_name: string
          train_id: string
          train_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          departure?: string
          direction?: string
          district_id?: string
          id?: never
          source_id?: string
          station_name?: string
          train_id?: string
          train_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "train_departures_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "train_departures_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      train_outings: {
        Row: {
          created_at: string
          depart_after: string
          destination_station_name: string
          district_id: string
          id: number
          next_return_arrival: string | null
          next_return_departure: string | null
          next_return_train_type: string | null
          origin_departures_per_day: number
          origin_station_name: string
          outbound_arrival: string | null
          outbound_departure: string | null
          outbound_train_type: string | null
          outbound_trips_per_day: number
          return_after: string
          return_arrival: string | null
          return_departure: string | null
          return_train_type: string | null
          return_trips_per_day: number
          sort_order: number
          source_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          depart_after: string
          destination_station_name: string
          district_id: string
          id?: never
          next_return_arrival?: string | null
          next_return_departure?: string | null
          next_return_train_type?: string | null
          origin_departures_per_day: number
          origin_station_name: string
          outbound_arrival?: string | null
          outbound_departure?: string | null
          outbound_train_type?: string | null
          outbound_trips_per_day: number
          return_after: string
          return_arrival?: string | null
          return_departure?: string | null
          return_train_type?: string | null
          return_trips_per_day: number
          sort_order: number
          source_id: string
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          depart_after?: string
          destination_station_name?: string
          district_id?: string
          id?: never
          next_return_arrival?: string | null
          next_return_departure?: string | null
          next_return_train_type?: string | null
          origin_departures_per_day?: number
          origin_station_name?: string
          outbound_arrival?: string | null
          outbound_departure?: string | null
          outbound_train_type?: string | null
          outbound_trips_per_day?: number
          return_after?: string
          return_arrival?: string | null
          return_departure?: string | null
          return_train_type?: string | null
          return_trips_per_day?: number
          sort_order?: number
          source_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "train_outings_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "train_outings_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      unmapped_towns: {
        Row: {
          first_seen_at: string
          last_seen_at: string
          occurrences: number
          resolved_at: string | null
          source_id: string
          town_name: string
        }
        Insert: {
          first_seen_at?: string
          last_seen_at?: string
          occurrences?: number
          resolved_at?: string | null
          source_id: string
          town_name: string
        }
        Update: {
          first_seen_at?: string
          last_seen_at?: string
          occurrences?: number
          resolved_at?: string | null
          source_id?: string
          town_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "unmapped_towns_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      real_estate_transaction_quarters: {
        Args: never
        Returns: {
          row_count: number
          trade_quarter: number
          trade_year: number
        }[]
      }
      record_unmapped_towns: {
        Args: { p_source_id: string; p_town_names: string[] }
        Returns: undefined
      }
      refresh_market_stats: {
        Args: { p_period_from: string; p_period_to: string }
        Returns: number
      }
      replace_facilities: {
        Args: { p_rows: Json; p_source_id: string }
        Returns: number
      }
      replace_real_estate_transactions: {
        Args: { p_rows: Json; p_year: number }
        Returns: number
      }
      replace_school_districts: {
        Args: {
          p_bounds: Json
          p_level: Database["public"]["Enums"]["school_level"]
          p_source_id: string
          p_tiles: Json
        }
        Returns: number
      }
      screen_data: { Args: never; Returns: Json }
    }
    Enums: {
      car_choice: "車なし" | "車あり・未選択"
      chushin_area: "丸山" | "東野" | "橋北" | "橋南"
      event_art: "祭り" | "運動会" | "文化祭" | "その他"
      event_participation: "自由参加" | "区や組ごと" | "未確認"
      event_scope: "地区全体" | "区ごと"
      facility_kind:
        | "school"
        | "childcare"
        | "evacuation_site"
        | "public_facility"
        | "bus_stop"
        | "train_station"
        | "after_school_club"
      housing_choice: "買う・新しめ" | "買う・古め" | "借りる"
      ingest_status: "running" | "succeeded" | "failed"
      karte_card:
        | "住まい"
        | "子育て・学校"
        | "交通"
        | "防災"
        | "人口"
        | "支援制度"
      market_category:
        | "land"
        | "house_built_within_20y"
        | "house_built_over_20y"
      school_level: "elementary" | "junior_high"
      season: "春" | "夏" | "秋" | "冬"
      sentence_kind: "データ" | "地区の情報" | "想定"
      support_category: "移住" | "子育て" | "住まい" | "その他"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      car_choice: ["車なし", "車あり・未選択"],
      chushin_area: ["丸山", "東野", "橋北", "橋南"],
      event_art: ["祭り", "運動会", "文化祭", "その他"],
      event_participation: ["自由参加", "区や組ごと", "未確認"],
      event_scope: ["地区全体", "区ごと"],
      facility_kind: [
        "school",
        "childcare",
        "evacuation_site",
        "public_facility",
        "bus_stop",
        "train_station",
        "after_school_club",
      ],
      housing_choice: ["買う・新しめ", "買う・古め", "借りる"],
      ingest_status: ["running", "succeeded", "failed"],
      karte_card: [
        "住まい",
        "子育て・学校",
        "交通",
        "防災",
        "人口",
        "支援制度",
      ],
      market_category: [
        "land",
        "house_built_within_20y",
        "house_built_over_20y",
      ],
      school_level: ["elementary", "junior_high"],
      season: ["春", "夏", "秋", "冬"],
      sentence_kind: ["データ", "地区の情報", "想定"],
      support_category: ["移住", "子育て", "住まい", "その他"],
    },
  },
} as const
