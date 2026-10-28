export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MemberRole = 'owner' | 'admin' | 'sender' | 'viewer';
export type DocumentStatus = 'draft' | 'pending' | 'completed' | 'expired';
export type SigningOrder = 'sequential' | 'parallel';
export type VerificationMethod = 'email_otp' | 'aadhaar_otp';
export type SignatureMethod = 'draw' | 'typed' | 'aadhaar_esign' | 'auto_seal';
export type SignerStatus = 'pending' | 'signed' | 'declined';
export type FieldType = 'signature' | 'date';
export type AuditEventType =
  | 'document_created'
  | 'document_sent'
  | 'link_opened'
  | 'otp_sent'
  | 'otp_failed'
  | 'otp_verified'
  | 'signed'
  | 'completed'
  | 'expired';

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: MemberRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: MemberRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'members_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          }
        ];
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string | null;
          title: string;
          status: DocumentStatus;
          signing_order: SigningOrder;
          original_storage_path: string;
          original_sha256: string;
          signed_storage_path: string | null;
          signed_sha256: string | null;
          verification_method: VerificationMethod;
          signature_method: SignatureMethod;
          stamp_ref: string | null;
          stamp_amount: number | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by?: string | null;
          title: string;
          status?: DocumentStatus;
          signing_order?: SigningOrder;
          original_storage_path: string;
          original_sha256: string;
          signed_storage_path?: string | null;
          signed_sha256?: string | null;
          verification_method?: VerificationMethod;
          signature_method?: SignatureMethod;
          stamp_ref?: string | null;
          stamp_amount?: number | null;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          created_by?: string | null;
          title?: string;
          status?: DocumentStatus;
          signing_order?: SigningOrder;
          original_storage_path?: string;
          original_sha256?: string;
          signed_storage_path?: string | null;
          signed_sha256?: string | null;
          verification_method?: VerificationMethod;
          signature_method?: SignatureMethod;
          stamp_ref?: string | null;
          stamp_amount?: number | null;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          }
        ];
      };
      signers: {
        Row: {
          id: string;
          document_id: string;
          name: string;
          email: string;
          order_index: number;
          token_hash: string;
          status: SignerStatus;
          verified_at: string | null;
          signed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          name: string;
          email: string;
          order_index?: number;
          token_hash: string;
          status?: SignerStatus;
          verified_at?: string | null;
          signed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          name?: string;
          email?: string;
          order_index?: number;
          token_hash?: string;
          status?: SignerStatus;
          verified_at?: string | null;
          signed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'signers_document_id_fkey';
            columns: ['document_id'];
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          }
        ];
      };
      fields: {
        Row: {
          id: string;
          document_id: string;
          signer_id: string;
          type: FieldType;
          page: number;
          x: number;
          y: number;
          width: number;
          height: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          signer_id: string;
          type: FieldType;
          page: number;
          x: number;
          y: number;
          width: number;
          height: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          signer_id?: string;
          type?: FieldType;
          page?: number;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fields_document_id_fkey';
            columns: ['document_id'];
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          }
        ];
      };
      otp_challenges: {
        Row: {
          id: string;
          signer_id: string;
          code_hash: string;
          attempts: number;
          max_attempts: number;
          expires_at: string;
          consumed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          signer_id: string;
          code_hash: string;
          attempts?: number;
          max_attempts?: number;
          expires_at: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          signer_id?: string;
          code_hash?: string;
          attempts?: number;
          max_attempts?: number;
          expires_at?: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'otp_challenges_signer_id_fkey';
            columns: ['signer_id'];
            referencedRelation: 'signers';
            referencedColumns: ['id'];
          }
        ];
      };
      signatures: {
        Row: {
          id: string;
          document_id: string;
          signer_id: string;
          field_id: string;
          method: SignatureMethod;
          image_storage_path: string | null;
          provider_txn_id: string | null;
          cert_info: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          consent_text: string;
          signed_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          signer_id: string;
          field_id: string;
          method: SignatureMethod;
          image_storage_path?: string | null;
          provider_txn_id?: string | null;
          cert_info?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          consent_text: string;
          signed_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          signer_id?: string;
          field_id?: string;
          method?: SignatureMethod;
          image_storage_path?: string | null;
          provider_txn_id?: string | null;
          cert_info?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          consent_text?: string;
          signed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'signatures_document_id_fkey';
            columns: ['document_id'];
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          }
        ];
      };
      audit_events: {
        Row: {
          id: string;
          document_id: string;
          signer_id: string | null;
          user_id: string | null;
          event_type: AuditEventType;
          metadata: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          signer_id?: string | null;
          user_id?: string | null;
          event_type: AuditEventType;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          signer_id?: string | null;
          user_id?: string | null;
          event_type?: AuditEventType;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_events_document_id_fkey';
            columns: ['document_id'];
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      doc_org_ok: {
        Args: { doc_id: string };
        Returns: boolean;
      };
      get_user_role: {
        Args: { org_id: string };
        Returns: string;
      };
    };
  };
}
