--
-- PostgreSQL database dump
--

\restrict 5iwO3r1l0beeoclAgvb6hTd2LPR9Xy0iaSu3ZmN3zDoYE5Q4oxWn0UGp1pyfqjH

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: cxq_new; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA cxq_new;


ALTER SCHEMA cxq_new OWNER TO postgres;

--
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA neon_auth;


ALTER SCHEMA neon_auth OWNER TO postgres;

--
-- Name: pgrst; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA pgrst;


ALTER SCHEMA pgrst OWNER TO postgres;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA cxq_new;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: pre_config(); Type: FUNCTION; Schema: pgrst; Owner: postgres
--

CREATE FUNCTION pgrst.pre_config() RETURNS void
    LANGUAGE sql
    SET search_path TO ''
    AS $$
  SELECT
      set_config('pgrst.db_schemas', 'public', true)
    , set_config('pgrst.db_aggregates_enabled', 'true', true)
    , set_config('pgrst.db_anon_role', 'anonymous', true)
    , set_config('pgrst.jwt_role_claim_key', '.role', true)
$$;


ALTER FUNCTION pgrst.pre_config() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: announcement_templates; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.announcement_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    at_code text NOT NULL,
    at_name text NOT NULL,
    at_version text DEFAULT '通用'::text NOT NULL,
    at_content text NOT NULL,
    at_need_remind boolean DEFAULT false NOT NULL,
    at_note text,
    source_label text DEFAULT 'government-document'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE cxq_new.announcement_templates OWNER TO postgres;

--
-- Name: announcements; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_fief_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    published_by uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    template_id uuid,
    ann_sign text,
    ann_sign_date character varying(40),
    ann_open_material_submit boolean DEFAULT false,
    ann_publish_mode character varying(16) DEFAULT 'immediate'::character varying,
    ann_publish_at timestamp with time zone,
    ann_remind_hours integer DEFAULT 24,
    ann_remind_to character varying(60) DEFAULT 'editor,admin'::character varying,
    CONSTRAINT announcements_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


ALTER TABLE cxq_new.announcements OWNER TO postgres;

--
-- Name: candidate_reviews; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.candidate_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    round text NOT NULL,
    reviewer_id uuid NOT NULL,
    decision text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT candidate_reviews_decision_check CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text]))),
    CONSTRAINT candidate_reviews_round_check CHECK ((round = ANY (ARRAY['R1'::text, 'R2'::text, 'R3'::text, 'R4'::text])))
);


ALTER TABLE cxq_new.candidate_reviews OWNER TO postgres;

--
-- Name: candidates; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_fief_id uuid NOT NULL,
    user_id uuid NOT NULL,
    material_id uuid NOT NULL,
    status text DEFAULT 'reviewing'::text NOT NULL,
    current_round text DEFAULT 'R1'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT candidates_current_round_check CHECK ((current_round = ANY (ARRAY['R1'::text, 'R2'::text, 'R3'::text, 'R4'::text, 'complete'::text]))),
    CONSTRAINT candidates_status_check CHECK ((status = ANY (ARRAY['reviewing'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE cxq_new.candidates OWNER TO postgres;

--
-- Name: election_fief_stages; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.election_fief_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_fief_id uuid NOT NULL,
    stage_template_id uuid NOT NULL,
    stage_key text NOT NULL,
    stage_name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    stage_order integer NOT NULL,
    status text DEFAULT 'not_started'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT election_fief_stages_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])))
);


ALTER TABLE cxq_new.election_fief_stages OWNER TO postgres;

--
-- Name: election_fiefs; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.election_fiefs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_term_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    name text NOT NULL,
    d_day date NOT NULL,
    timezone text DEFAULT 'Asia/Shanghai'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT election_fiefs_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text]))),
    CONSTRAINT election_fiefs_timezone_check CHECK ((timezone = 'Asia/Shanghai'::text)),
    CONSTRAINT election_fiefs_version_check CHECK ((version > 0))
);


ALTER TABLE cxq_new.election_fiefs OWNER TO postgres;

--
-- Name: election_terms; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.election_terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT election_terms_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text])))
);


ALTER TABLE cxq_new.election_terms OWNER TO postgres;

--
-- Name: election_units; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.election_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE cxq_new.election_units OWNER TO postgres;

--
-- Name: invitations; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    phone text NOT NULL,
    role text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    invited_by uuid NOT NULL,
    accepted_at timestamp with time zone,
    CONSTRAINT invitations_role_check CHECK ((role = ANY (ARRAY['org_admin'::text, 'operator'::text, 'editor'::text, 'reviewer'::text, 'candidate'::text, 'platform_admin'::text])))
);


ALTER TABLE cxq_new.invitations OWNER TO postgres;

--
-- Name: material_files; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.material_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    size_bytes bigint,
    storage_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE cxq_new.material_files OWNER TO postgres;

--
-- Name: materials; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_fief_id uuid NOT NULL,
    candidate_user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'submitted'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    review_note text,
    CONSTRAINT materials_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE cxq_new.materials OWNER TO postgres;

--
-- Name: memberships; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT memberships_role_check CHECK ((role = ANY (ARRAY['platform_admin'::text, 'org_admin'::text, 'operator'::text, 'editor'::text, 'reviewer'::text, 'candidate'::text])))
);


ALTER TABLE cxq_new.memberships OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organizations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


ALTER TABLE cxq_new.organizations OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE cxq_new.sessions OWNER TO postgres;

--
-- Name: stage_templates; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.stage_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    st_key text NOT NULL,
    st_name text NOT NULL,
    st_day_offset integer NOT NULL,
    st_duration_days integer NOT NULL,
    st_order integer NOT NULL,
    st_description text,
    source_label text DEFAULT 'government-procedure'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE cxq_new.stage_templates OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: cxq_new; Owner: postgres
--

CREATE TABLE cxq_new.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    password_hash text NOT NULL,
    display_name text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'disabled'::text])))
);


ALTER TABLE cxq_new.users OWNER TO postgres;

--
-- Name: account; Type: TABLE; Schema: neon_auth; Owner: postgres
--

CREATE TABLE neon_auth.account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" uuid NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE neon_auth.account OWNER TO postgres;

--
-- Name: invitation; Type: TABLE; Schema: neon_auth; Owner: postgres
--

CREATE TABLE neon_auth.invitation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    email text NOT NULL,
    role text,
    status text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "inviterId" uuid NOT NULL
);


ALTER TABLE neon_auth.invitation OWNER TO postgres;

--
-- Name: jwks; Type: TABLE; Schema: neon_auth; Owner: postgres
--

CREATE TABLE neon_auth.jwks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "publicKey" text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "expiresAt" timestamp with time zone
);


ALTER TABLE neon_auth.jwks OWNER TO postgres;

--
-- Name: member; Type: TABLE; Schema: neon_auth; Owner: postgres
--

CREATE TABLE neon_auth.member (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "organizationId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    role text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL
);


ALTER TABLE neon_auth.member OWNER TO postgres;

--
-- Name: organization; Type: TABLE; Schema: neon_auth; Owner: postgres
--

CREATE TABLE neon_auth.organization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo text,
    "createdAt" timestamp with time zone NOT NULL,
    metadata text
);


ALTER TABLE neon_auth.organization OWNER TO postgres;

--
-- Name: project_config; Type: TABLE; Schema: neon_auth; Owner: postgres
--

CREATE TABLE neon_auth.project_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    endpoint_id text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    trusted_origins jsonb NOT NULL,
    social_providers jsonb NOT NULL,
    email_provider jsonb,
    email_and_password jsonb,
    allow_localhost boolean NOT NULL,
    plugin_configs jsonb,
    webhook_config jsonb
);


ALTER TABLE neon_auth.project_config OWNER TO postgres;

--
-- Name: session; Type: TABLE; Schema: neon_auth; Owner: postgres
--

CREATE TABLE neon_auth.session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" uuid NOT NULL,
    "impersonatedBy" text,
    "activeOrganizationId" text
);


ALTER TABLE neon_auth.session OWNER TO postgres;

--
-- Name: user; Type: TABLE; Schema: neon_auth; Owner: postgres
--

CREATE TABLE neon_auth."user" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    role text,
    banned boolean,
    "banReason" text,
    "banExpires" timestamp with time zone
);


ALTER TABLE neon_auth."user" OWNER TO postgres;

--
-- Name: verification; Type: TABLE; Schema: neon_auth; Owner: postgres
--

CREATE TABLE neon_auth.verification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE neon_auth.verification OWNER TO postgres;

--
-- Name: announcement_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcement_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    at_code text NOT NULL,
    at_name text NOT NULL,
    at_version text DEFAULT '通用'::text NOT NULL,
    at_content text NOT NULL,
    at_need_remind boolean DEFAULT false NOT NULL,
    at_note text,
    source_label text DEFAULT 'government-document'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    at_sched_offset integer
);


ALTER TABLE public.announcement_templates OWNER TO postgres;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_fief_id uuid NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    published_by uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    template_id uuid,
    scheduled_for date,
    stage_key text,
    CONSTRAINT announcements_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: candidate_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidate_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    round text NOT NULL,
    reviewer_id uuid NOT NULL,
    decision text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT candidate_reviews_decision_check CHECK ((decision = ANY (ARRAY['approved'::text, 'rejected'::text]))),
    CONSTRAINT candidate_reviews_round_check CHECK ((round = ANY (ARRAY['R1'::text, 'R2'::text, 'R3'::text, 'R4'::text])))
);


ALTER TABLE public.candidate_reviews OWNER TO postgres;

--
-- Name: candidates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_fief_id uuid NOT NULL,
    user_id uuid NOT NULL,
    material_id uuid NOT NULL,
    status text DEFAULT 'reviewing'::text NOT NULL,
    current_round text DEFAULT 'R1'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT candidates_current_round_check CHECK ((current_round = ANY (ARRAY['R1'::text, 'R2'::text, 'R3'::text, 'R4'::text, 'complete'::text]))),
    CONSTRAINT candidates_status_check CHECK ((status = ANY (ARRAY['reviewing'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.candidates OWNER TO postgres;

--
-- Name: election_fief_stages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.election_fief_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_fief_id uuid NOT NULL,
    stage_template_id uuid NOT NULL,
    stage_key text NOT NULL,
    stage_name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    stage_order integer NOT NULL,
    status text DEFAULT 'not_started'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT election_fief_stages_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text])))
);


ALTER TABLE public.election_fief_stages OWNER TO postgres;

--
-- Name: election_fiefs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.election_fiefs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_term_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    name text NOT NULL,
    d_day date NOT NULL,
    timezone text DEFAULT 'Asia/Shanghai'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT election_fiefs_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text]))),
    CONSTRAINT election_fiefs_timezone_check CHECK ((timezone = 'Asia/Shanghai'::text)),
    CONSTRAINT election_fiefs_version_check CHECK ((version > 0))
);


ALTER TABLE public.election_fiefs OWNER TO postgres;

--
-- Name: election_proposals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.election_proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    term_id uuid NOT NULL,
    unit_id uuid NOT NULL,
    name text NOT NULL,
    d_day date NOT NULL,
    org_type text NOT NULL,
    positions jsonb DEFAULT '[{"name": "主任", "quota": 1}, {"name": "副主任", "quota": 1}, {"name": "委员", "quota": 3}, {"name": "妇女成员", "quota": 1}]'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    proposed_by uuid NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT election_proposals_org_type_check CHECK ((org_type = ANY (ARRAY['village'::text, 'community'::text]))),
    CONSTRAINT election_proposals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.election_proposals OWNER TO postgres;

--
-- Name: election_terms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.election_terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT election_terms_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text])))
);


ALTER TABLE public.election_terms OWNER TO postgres;

--
-- Name: election_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.election_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.election_units OWNER TO postgres;

--
-- Name: invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    phone text NOT NULL,
    role text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    invited_by uuid NOT NULL,
    accepted_at timestamp with time zone,
    CONSTRAINT invitations_role_check CHECK ((role = ANY (ARRAY['sub_admin'::text, 'editor'::text, 'reviewer'::text, 'candidate'::text])))
);


ALTER TABLE public.invitations OWNER TO postgres;

--
-- Name: material_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    size_bytes bigint,
    storage_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.material_files OWNER TO postgres;

--
-- Name: materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_fief_id uuid NOT NULL,
    candidate_user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'submitted'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    review_note text,
    CONSTRAINT materials_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.materials OWNER TO postgres;

--
-- Name: memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT memberships_role_check CHECK ((role = ANY (ARRAY['platform_admin'::text, 'sub_admin'::text, 'editor'::text, 'reviewer'::text, 'candidate'::text])))
);


ALTER TABLE public.memberships OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    org_type text DEFAULT 'village'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organizations_org_type_check CHECK ((org_type = ANY (ARRAY['village'::text, 'community'::text]))),
    CONSTRAINT organizations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: positions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    election_fief_id uuid NOT NULL,
    name text NOT NULL,
    quota integer DEFAULT 1 NOT NULL,
    application_start date NOT NULL,
    application_end date NOT NULL,
    material_review_start date NOT NULL,
    material_review_end date NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT positions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])))
);


ALTER TABLE public.positions OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_key text NOT NULL,
    permission text NOT NULL,
    description text
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    key text NOT NULL,
    name text NOT NULL,
    is_staff boolean DEFAULT false NOT NULL,
    is_system boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: stage_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stage_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    st_key text NOT NULL,
    st_name text NOT NULL,
    st_day_offset integer NOT NULL,
    st_duration_days integer NOT NULL,
    st_order integer NOT NULL,
    st_description text,
    org_type text DEFAULT 'village'::text NOT NULL,
    source_label text DEFAULT 'government-procedure'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stage_templates_org_type_check CHECK ((org_type = ANY (ARRAY['village'::text, 'community'::text])))
);


ALTER TABLE public.stage_templates OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    password_hash text NOT NULL,
    display_name text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'disabled'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: announcement_templates; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.announcement_templates (id, at_code, at_name, at_version, at_content, at_need_remind, at_note, source_label, active, created_at, updated_at) FROM stdin;
88b134ab-83ab-458f-89a0-18d2eba81854	1	关于确定选举日的公告	通用	经镇(街道)村民委员会选举指导组研究，并报县(区､管委会)选举指导组同意，本村第【届】届村民委员会换届选举工作定于【开始】开始，选举日确定为【选举日】。经登记确认具有选民资格的村民，均可参加投票选举。望村民互相转告。\n特此公告	t	1号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
1eee778d-f790-4350-bd60-8d7d014b6ce8	2	关于村民选举委员会名单的公告	通用	经本村村民推选，产生了组织和主持本村第【届】届村民委员会换届选举工作的村民选举委员会。现将名单公布如下：\n主 任：__________\n副主任：__________\n委 员：__________、__________、__________\n特此公告	t	2号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
19dce3c9-6a49-4ad8-a712-3f68bb15d7a5	3	关于选民登记的公告	通用	经镇(街道)村民委员会选举指导组研究确定，本届村民委员会选举选民登记时间定为【登记开始】时至【登记结束】时。凡符合法律法规和政策规定的村民，均可在本村村民选举委员会进行选民登记。经选民登记确认后，方可参加投票选举。望村民互相转告。\n特此公告	t	3号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
519266ba-4379-4531-84c3-2ae8e7583269	4	关于选民名单的公告	通用	现将经过登记确认的参加本村第【届】届村民委员会选举的选民名单公布如下。如有错漏，请于【异议截止】前向村民选举委员会提出。各小组名单附后\n特此公告	t	4号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
5128574e-2df1-4bfa-a3e5-b60c758a1600	5	关于村民代表和小组长选举的公告	通用	根据法律法规规定，本村村民代表和村民小组长选举日定为【选举日】，当日【时】开始投票，当日【时】截止投票。投票地点设在__________。各小组选民，均应参加投票选举。望村民互相转告。\n特此公告	t	5号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
ebf1fb12-a9c4-44ce-bc61-fe89f50a2d7e	6	关于村民代表名单的公告	通用	经依法推选，本村共产生第【届】届村民代表____名，其中妇女代表____名。现将名单公布如下：\n各小组名单附后\n特此公告	t	6号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
01bca162-1500-4242-bb60-7fd0bf6bf427	6-1	关于村民小组长、副组长名单的公告	通用	经依法推选，下列人员分别当选为各村民小组组长和副组长。现将名单公布如下：\n第一小组：组长__________，副组长__________...（各小组依次排列）\n特此公告	f	6-1号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
14b74cd0-eb9f-4d05-be70-fab7e8b764ae	7	关于村民委员会成员初步候选人提名的公告	通用	根据法律法规规定，经村民(代表)会议讨论决定，本村新一届村民委员会成员数共____人。其中，主任____人、副主任____人、委员____人、妇女成员____人（单独提名）。\n初步候选人提名时间从【提名开始】时至【提名截止】时。请有选举权的村民踊跃参加提名。提名表和自荐表请到村民委员会办公室领取。联系人：__________ 联系电话：__________\n特此公告	t	7号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
de5d8878-3c43-4a17-bc1d-73b9320f8922	8	关于村民委员会成员初步候选人名单的公告	通用	经登记参加选举的村民提名和自荐，产生本村第【届】届村民委员会成员初步候选人。如有错漏，请于【异议截止】前向村民选举委员会提出。现将名单按姓氏笔画顺序公布如下：\n主任候选人：__________、__________\n副主任候选人：__________、__________\n委员候选人：__________、__________、__________\n妇女成员候选人：__________\n特此公告	t	8号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
9d4b4f24-4cfc-4349-9c9a-3a060babb125	9	关于村民委员会成员正式候选人名单的公告	通用	经依法提名并通过镇(街道)、县(区、管委会)资格审查，产生本村第【届】届村民委员会成员正式候选人。现将名单公布如下：\n主任候选人：__________、__________\n副主任候选人：__________、__________\n委员候选人：__________、__________、__________\n妇女候选人：__________\n特此公告	t	9号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
ab07f73c-5f94-4e89-9a13-b7e87644bb4f	10	关于村民委员会选举投票时间和地点的公告	通用	经村民选举委员会研究，决定本村村民委员会选举的投票站地点和投票时间如下：\n中心投票站设在__________，投票分站设在__________。具体投票时间为【投票开始】时至【投票截止】时。\n流动票箱使用时间为【流动开始】时至【流动截止】时，路线为：____时从__________出发，沿__________开展上门投票。\n开箱计票时间为【计票时间】时，地点在__________。\n特此公告	t	10号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
85b55444-b070-4f33-9498-030ce99cc773	11	关于选举工作人员名单的公告	通用	经村民选举委员会研究决定，本村村民委员会选举的工作人员名单如下：\n唱票员：__________\n计票员：__________\n监票员：__________\n流动票箱工作人员：__________、__________\n特此公告	t	11号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
d86b4d41-5c59-4b6d-9ea4-0aa87e6a0556	12	关于流动票箱投票人员名单的公告	通用	经本人申请和村民选举委员会研究，确定本村村民委员会选举使用流动票箱投票人员名单如下：\n__________（因：__________）、__________（因：__________）\n特此公告	f	12号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
537521d5-bd8d-45c1-91eb-15a6ded9826f	13	关于委托投票名单的公告	通用	根据法律法规规定，以下登记参加选举的村民在选举日外出不能回村参加投票，且在规定时限内办理了委托投票手续。经村民选举委员会审核，人员名单如下：\n受委托人：__________ 委托人：__________\n特此公告	f	13号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
7a369755-e38e-4758-9890-a97c1f60faa4	14	关于代写人员名单的公告	通用	经本人申请和村民选举委员会研究确定，本村村民委员会选举要求代写人员和代写员名单如下：\n要求代写人员：__________ 委托代写员：__________\n特此公告	f	14号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
68df9033-ddd8-43b2-8d98-522f98047556	15	关于无效票认定规则的公告	通用	经村民选举委员会讨论决定，本村村民委员会选举无效票认定的具体规则如下：\n1. 未填写任何候选人姓名的空白选票；\n2. 所选候选人人数超过法定差额名额的选票；\n3. 涂改、标记特殊符号，导致候选人姓名无法辨认的选票；\n4. 私自撕毁、拆分选票，导致选票不完整的；\n5. 使用非本次选举统一印制选票的；\n6. 选票上填写的候选人姓名与正式候选人名单不符，且无法核实身份的；\n7. 代写人员违规干预选民意愿，擅自填写选票的；\n8. 其他违反选举规定，经选举委员会认定为无效的选票。\n特此公告	t	15号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
d5f6dda7-26be-49e4-8fda-01b5c35e8b27	16	关于村民委员会选举结果的公告	通用	根据法律法规和政策规定，经全体选民直接投票，下列人员当选为本村第【届】届村民委员会主任、副主任和委员。现将名单公布如下：\n主 任：__________\n副主任：__________\n委 员：__________、__________、__________\n特此公告	t	16号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
3c33b753-66c6-4b96-88fb-3ed16e7f56fa	17	关于村务监督委员会成员选举结果的公告	通用	根据《中华人民共和国村民委员会组织法》和《福建省实施〈中华人民共和国村民委员会组织法〉办法》的规定，经选举，下列人员当选为本村新一届村务监督委员会主任和委员：\n主 任：__________\n委 员：__________、__________\n特此公告	t	17号公告	government-document	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.announcements (id, election_fief_id, title, body, status, created_by, updated_by, published_by, published_at, created_at, updated_at, template_id, ann_sign, ann_sign_date, ann_open_material_submit, ann_publish_mode, ann_publish_at, ann_remind_hours, ann_remind_to) FROM stdin;
d6e91e49-8d19-4fef-828a-f2f58d7b1e7c	916a30d0-a532-4f8a-ba73-668bd4cc7923	关于确定选举日的公告	经镇(街道)村民委员会选举指导组研究，并报县(区､管委会)选举指导组同意，本村第【届】届村民委员会换届选举工作定于【开始】开始，选举日确定为【选举日】。经登记确认具有选民资格的村民，均可参加投票选举。望村民互相转告。\n特此公告	published	3258beba-0a56-4f6a-8adc-6699fbaf58ed	3258beba-0a56-4f6a-8adc-6699fbaf58ed	3258beba-0a56-4f6a-8adc-6699fbaf58ed	2026-09-04 07:53:56.69059+08	2026-09-04 07:53:56.563076+08	2026-09-04 07:53:56.69059+08	88b134ab-83ab-458f-89a0-18d2eba81854	\N	\N	f	immediate	\N	24	editor,admin
5ceacc17-563d-4463-ad8a-3223fb8ee5b6	916a30d0-a532-4f8a-ba73-668bd4cc7923	关于确定选举日的公告	经镇(街道)村民委员会选举指导组研究，并报县(区､管委会)选举指导组同意，本村第【届】届村民委员会换届选举工作定于【开始】开始，选举日确定为【选举日】。经登记确认具有选民资格的村民，均可参加投票选举。望村民互相转告。\n特此公告	published	3258beba-0a56-4f6a-8adc-6699fbaf58ed	3258beba-0a56-4f6a-8adc-6699fbaf58ed	3258beba-0a56-4f6a-8adc-6699fbaf58ed	2026-09-04 07:54:05.795816+08	2026-09-04 07:54:05.669321+08	2026-09-04 07:54:05.795816+08	88b134ab-83ab-458f-89a0-18d2eba81854	\N	\N	f	immediate	\N	24	editor,admin
\.


--
-- Data for Name: candidate_reviews; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.candidate_reviews (id, candidate_id, round, reviewer_id, decision, note, created_at) FROM stdin;
\.


--
-- Data for Name: candidates; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.candidates (id, election_fief_id, user_id, material_id, status, current_round, created_at) FROM stdin;
\.


--
-- Data for Name: election_fief_stages; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.election_fief_stages (id, election_fief_id, stage_template_id, stage_key, stage_name, start_date, end_date, stage_order, status, created_at) FROM stdin;
32a43c9f-08e5-4b38-9c56-bc27fac84f5a	916a30d0-a532-4f8a-ba73-668bd4cc7923	d9ab3002-0526-47a0-9085-b65e0eb87533	D-35	前期筹备	2026-11-15	2026-11-15	1	not_started	2026-09-04 07:52:01.492583+08
ce529797-bb07-45d6-9cea-007f3e5f4be3	916a30d0-a532-4f8a-ba73-668bd4cc7923	ec7022df-e3db-4985-b123-8bcaed846add	D-34	成立选委会	2026-11-16	2026-11-16	2	not_started	2026-09-04 07:52:01.492583+08
4f8b80c9-61df-4af5-94e3-3e44fc88eb17	916a30d0-a532-4f8a-ba73-668bd4cc7923	252fb8dd-83ae-4ba9-b1d5-4e6e645ed04a	D-33~-29	选民登记	2026-11-17	2026-11-21	3	not_started	2026-09-04 07:52:01.492583+08
0ef12a3c-b4a0-4f1e-9862-974afad97bdc	916a30d0-a532-4f8a-ba73-668bd4cc7923	abd35dd7-88a5-4f3f-98f3-72d5398ae091	D-28~-24	公示选民名单	2026-11-22	2026-11-26	4	not_started	2026-09-04 07:52:01.492583+08
332e751f-ca4b-4412-ab69-74fcedc26248	916a30d0-a532-4f8a-ba73-668bd4cc7923	c6b6cc92-7e2c-4df6-b38a-f43674674215	D-23~-21	受理选民申诉	2026-11-27	2026-11-29	5	not_started	2026-09-04 07:52:01.492583+08
3a1cae6b-2a1a-401a-9c1e-b22d0c016689	916a30d0-a532-4f8a-ba73-668bd4cc7923	d515b14e-dd04-4fe6-a79f-e80cb0c8ae33	D-20~-16	代表选举	2026-11-30	2026-12-04	6	not_started	2026-09-04 07:52:01.492583+08
8f869393-b113-4424-8636-bb50a874de69	916a30d0-a532-4f8a-ba73-668bd4cc7923	836064ff-507d-4b73-a5a6-b93b710cf463	D-15	候选人提名启动	2026-12-05	2026-12-05	7	not_started	2026-09-04 07:52:01.492583+08
70ac1126-f092-471e-9c34-21ec3a703328	916a30d0-a532-4f8a-ba73-668bd4cc7923	012ba5e5-e6e9-45cb-bc06-91f1baf44f4f	D-14	候选人提名延续	2026-12-06	2026-12-06	8	not_started	2026-09-04 07:52:01.492583+08
dd92ccaa-5f60-4c90-9c2c-ed698848445f	916a30d0-a532-4f8a-ba73-668bd4cc7923	43085b95-d4ac-40a1-8a48-73159b9a5634	D-13	初步候选人汇总+镇级初审	2026-12-07	2026-12-07	9	not_started	2026-09-04 07:52:01.492583+08
35c9c3d8-de76-457d-9a20-0d2fb91d8229	916a30d0-a532-4f8a-ba73-668bd4cc7923	cdde4525-768b-46f5-ab65-b22b6c277b1b	D-12~-10	竞选预选	2026-12-08	2026-12-10	10	not_started	2026-09-04 07:52:01.492583+08
a1d78669-b8e7-46cb-9605-5918ce15b7b0	916a30d0-a532-4f8a-ba73-668bd4cc7923	765dce20-7de2-4a4c-95db-3740d6a8acb1	D-9~-5	区级11部门联审、党委考察	2026-12-11	2026-12-15	11	not_started	2026-09-04 07:52:01.492583+08
3539002b-93c7-499b-8742-7ecaeee31cd1	916a30d0-a532-4f8a-ba73-668bd4cc7923	b7166994-b933-4f0b-9b0c-30353a9519cd	D-4	正式候选人公示	2026-12-16	2026-12-16	12	not_started	2026-09-04 07:52:01.492583+08
cf5f02df-20ca-4770-8ecc-b30768c09bfa	916a30d0-a532-4f8a-ba73-668bd4cc7923	37e2ac92-ed70-4fd3-8832-d751c1fbd2dc	D-3~-2	投票竞选筹备	2026-12-17	2026-12-18	13	not_started	2026-09-04 07:52:01.492583+08
193b0a6a-c85a-4eb4-9d92-382e425b80ee	916a30d0-a532-4f8a-ba73-668bd4cc7923	7082c6d2-fe42-44c7-be5c-8efa542d92b7	D-1	投票竞选筹备	2026-12-19	2026-12-19	14	not_started	2026-09-04 07:52:01.492583+08
f81835bc-c880-4b65-9074-840710c1b5f8	916a30d0-a532-4f8a-ba73-668bd4cc7923	2470de2d-0ea1-4cfb-bffb-c7cc3ef2e094	D0	正式投票选举	2026-12-20	2026-12-20	15	not_started	2026-09-04 07:52:01.492583+08
7ac66c53-fdbe-4c9f-92c5-232cbe909ea4	916a30d0-a532-4f8a-ba73-668bd4cc7923	71fd5b86-0f08-406a-b206-ca5179118955	D+1~+10	结果备案、新旧班子交接	2026-12-21	2026-12-30	16	not_started	2026-09-04 07:52:01.492583+08
3cfe6e03-78ff-468a-8b81-904603841e0c	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	d9ab3002-0526-47a0-9085-b65e0eb87533	D-35	前期筹备	2026-11-15	2026-11-15	1	not_started	2026-09-04 07:52:01.492583+08
29721626-b124-456d-a84b-4743eff7ead2	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	ec7022df-e3db-4985-b123-8bcaed846add	D-34	成立选委会	2026-11-16	2026-11-16	2	not_started	2026-09-04 07:52:01.492583+08
a66e12be-3a2a-44a2-b568-1e4cdcd9f403	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	252fb8dd-83ae-4ba9-b1d5-4e6e645ed04a	D-33~-29	选民登记	2026-11-17	2026-11-21	3	not_started	2026-09-04 07:52:01.492583+08
63f50776-ed6c-40ba-b611-f44b8d3199f8	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	abd35dd7-88a5-4f3f-98f3-72d5398ae091	D-28~-24	公示选民名单	2026-11-22	2026-11-26	4	not_started	2026-09-04 07:52:01.492583+08
2c79beb4-131d-428e-816e-d784e4f38e55	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	c6b6cc92-7e2c-4df6-b38a-f43674674215	D-23~-21	受理选民申诉	2026-11-27	2026-11-29	5	not_started	2026-09-04 07:52:01.492583+08
65495574-fb8b-48da-bcee-7da7db3da6d2	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	d515b14e-dd04-4fe6-a79f-e80cb0c8ae33	D-20~-16	代表选举	2026-11-30	2026-12-04	6	not_started	2026-09-04 07:52:01.492583+08
ae736906-6985-4589-a13c-082caa53e5cd	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	836064ff-507d-4b73-a5a6-b93b710cf463	D-15	候选人提名启动	2026-12-05	2026-12-05	7	not_started	2026-09-04 07:52:01.492583+08
a92f1581-eb09-4a14-8a67-8d946d180b8a	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	012ba5e5-e6e9-45cb-bc06-91f1baf44f4f	D-14	候选人提名延续	2026-12-06	2026-12-06	8	not_started	2026-09-04 07:52:01.492583+08
f3a41b4c-4a1a-45cd-b286-07ee1b044324	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	43085b95-d4ac-40a1-8a48-73159b9a5634	D-13	初步候选人汇总+镇级初审	2026-12-07	2026-12-07	9	not_started	2026-09-04 07:52:01.492583+08
0c937969-0269-479c-b29f-f5d84e65ec4c	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	cdde4525-768b-46f5-ab65-b22b6c277b1b	D-12~-10	竞选预选	2026-12-08	2026-12-10	10	not_started	2026-09-04 07:52:01.492583+08
c0f2c088-5d5b-4482-91f7-b3d6645bf94b	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	765dce20-7de2-4a4c-95db-3740d6a8acb1	D-9~-5	区级11部门联审、党委考察	2026-12-11	2026-12-15	11	not_started	2026-09-04 07:52:01.492583+08
eada24aa-a3a8-4da5-9980-f8d6cad9662d	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	b7166994-b933-4f0b-9b0c-30353a9519cd	D-4	正式候选人公示	2026-12-16	2026-12-16	12	not_started	2026-09-04 07:52:01.492583+08
f078bc4c-8901-43df-a0ba-586ceb31d908	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	37e2ac92-ed70-4fd3-8832-d751c1fbd2dc	D-3~-2	投票竞选筹备	2026-12-17	2026-12-18	13	not_started	2026-09-04 07:52:01.492583+08
57d0f47e-bd49-46e6-b825-41e0c11b74bb	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	7082c6d2-fe42-44c7-be5c-8efa542d92b7	D-1	投票竞选筹备	2026-12-19	2026-12-19	14	not_started	2026-09-04 07:52:01.492583+08
9329a48d-b17e-482d-a4d7-274f0f992791	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	2470de2d-0ea1-4cfb-bffb-c7cc3ef2e094	D0	正式投票选举	2026-12-20	2026-12-20	15	not_started	2026-09-04 07:52:01.492583+08
cfaf600a-7ce4-44ca-89b2-fe1866eb8b84	24cbb501-a81e-4c5c-b39a-cf54dde79ce7	71fd5b86-0f08-406a-b206-ca5179118955	D+1~+10	结果备案、新旧班子交接	2026-12-21	2026-12-30	16	not_started	2026-09-04 07:52:01.492583+08
\.


--
-- Data for Name: election_fiefs; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.election_fiefs (id, election_term_id, organization_id, unit_id, name, d_day, timezone, status, version, created_by, created_at) FROM stdin;
916a30d0-a532-4f8a-ba73-668bd4cc7923	9f970ff3-523f-442c-aeb2-4e96215e839d	f6d57f43-4b87-40a8-97dd-740c433d1674	cdc6de21-edb3-4e0b-86ce-03df17447c69	演示村换届演示	2026-12-20	Asia/Shanghai	active	1	3258beba-0a56-4f6a-8adc-6699fbaf58ed	2026-09-04 07:52:01.492583+08
24cbb501-a81e-4c5c-b39a-cf54dde79ce7	9f970ff3-523f-442c-aeb2-4e96215e839d	05b5909c-570f-45cb-a0dc-8d19370c8671	787e6c17-2ab7-4c79-8c3e-f8cda8458e38	演示社区换届演示	2026-12-20	Asia/Shanghai	active	1	88c0b482-385e-49be-a255-35d99e2dc258	2026-09-04 07:52:01.492583+08
\.


--
-- Data for Name: election_terms; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.election_terms (id, name, status, created_at) FROM stdin;
9f970ff3-523f-442c-aeb2-4e96215e839d	2026基层换届演示届次	active	2026-09-04 07:52:01.492583+08
\.


--
-- Data for Name: election_units; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.election_units (id, organization_id, name, created_at) FROM stdin;
cdc6de21-edb3-4e0b-86ce-03df17447c69	f6d57f43-4b87-40a8-97dd-740c433d1674	演示村	2026-09-04 07:52:01.492583+08
787e6c17-2ab7-4c79-8c3e-f8cda8458e38	05b5909c-570f-45cb-a0dc-8d19370c8671	演示社区	2026-09-04 07:52:01.492583+08
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.invitations (id, organization_id, phone, role, token_hash, expires_at, invited_by, accepted_at) FROM stdin;
\.


--
-- Data for Name: material_files; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.material_files (id, material_id, file_name, mime_type, size_bytes, storage_key, created_at) FROM stdin;
20b779a4-799e-4de1-a483-e1aadd78833c	28a03b70-09a2-43ad-adf8-0aef5a077de8	resume.pdf	application/pdf	1024	\N	2026-09-04 07:53:56.98734+08
57a7327d-9537-4437-9588-dc907ac97688	28a03b70-09a2-43ad-adf8-0aef5a077de8	id-card.jpg	image/jpeg	2048	\N	2026-09-04 07:53:56.98734+08
78ccc21a-4485-47b2-b933-39ccd7bf32c1	66d07af4-28f5-4035-a593-b6a782fde800	resume.pdf	application/pdf	1024	\N	2026-09-04 07:54:06.090821+08
83693c0a-25c2-4f83-8de0-c4d873829e54	66d07af4-28f5-4035-a593-b6a782fde800	id-card.jpg	image/jpeg	2048	\N	2026-09-04 07:54:06.090821+08
\.


--
-- Data for Name: materials; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.materials (id, election_fief_id, candidate_user_id, title, description, status, submitted_at, reviewed_at, reviewed_by, review_note) FROM stdin;
28a03b70-09a2-43ad-adf8-0aef5a077de8	916a30d0-a532-4f8a-ba73-668bd4cc7923	9563f09c-7bee-4a06-a831-4aaab5117087	test material	submitted by candidate from demo-village	submitted	2026-09-04 07:53:56.98734+08	\N	\N	\N
66d07af4-28f5-4035-a593-b6a782fde800	916a30d0-a532-4f8a-ba73-668bd4cc7923	9563f09c-7bee-4a06-a831-4aaab5117087	test material	submitted by candidate from demo-village	submitted	2026-09-04 07:54:06.090821+08	\N	\N	\N
\.


--
-- Data for Name: memberships; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.memberships (id, user_id, organization_id, role, created_at) FROM stdin;
edf0effe-9e68-4941-b726-37bbfd5afe9e	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	platform_admin	2026-09-04 07:52:01.492583+08
240a1014-c1d8-4cc9-b518-9337f144d09c	3258beba-0a56-4f6a-8adc-6699fbaf58ed	f6d57f43-4b87-40a8-97dd-740c433d1674	org_admin	2026-09-04 07:52:01.492583+08
dabbff68-5507-4c7e-aed2-51708c5a4f67	ea9acb5b-8a01-41ea-a0fd-49eb36960a82	f6d57f43-4b87-40a8-97dd-740c433d1674	operator	2026-09-04 07:52:01.492583+08
ae524b96-54f0-4705-b847-44890b18b382	b8559bbe-a0b4-4bda-b78b-d5232f212407	f6d57f43-4b87-40a8-97dd-740c433d1674	editor	2026-09-04 07:52:01.492583+08
216e71c7-5514-49ab-83d5-8c8d2cf53cfe	71751885-9ead-4968-aa99-49ecf2838930	f6d57f43-4b87-40a8-97dd-740c433d1674	reviewer	2026-09-04 07:52:01.492583+08
a161a38c-7b58-44a0-82da-b3e3ed5ac8d2	9563f09c-7bee-4a06-a831-4aaab5117087	f6d57f43-4b87-40a8-97dd-740c433d1674	candidate	2026-09-04 07:52:01.492583+08
e27031a3-043a-47b2-83b5-dbec2f1ce8e1	88c0b482-385e-49be-a255-35d99e2dc258	05b5909c-570f-45cb-a0dc-8d19370c8671	org_admin	2026-09-04 07:52:01.492583+08
32bb7dec-204f-4b6d-8156-ad6f99ad6449	7f77f012-66c8-4308-aefe-a24b28e0855a	05b5909c-570f-45cb-a0dc-8d19370c8671	operator	2026-09-04 07:52:01.492583+08
b137e1a0-1db3-4dea-8d36-089be75c8f9e	47a3d00b-ccb0-4feb-b383-44f7e14d7852	05b5909c-570f-45cb-a0dc-8d19370c8671	editor	2026-09-04 07:52:01.492583+08
7b761cf1-560a-46dc-9059-2bc511d3ccac	b39dd4de-4034-4eea-b839-ebd71a7b0c51	05b5909c-570f-45cb-a0dc-8d19370c8671	reviewer	2026-09-04 07:52:01.492583+08
03ab2cff-a090-4b87-9c64-95fe10413877	51204f22-6137-4524-a42c-f4d5d57416a0	05b5909c-570f-45cb-a0dc-8d19370c8671	candidate	2026-09-04 07:52:01.492583+08
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.organizations (id, slug, name, status, created_at) FROM stdin;
f6d57f43-4b87-40a8-97dd-740c433d1674	demo-village	演示村	active	2026-09-04 07:52:01.492583+08
05b5909c-570f-45cb-a0dc-8d19370c8671	demo-community	演示社区	active	2026-09-04 07:52:01.492583+08
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.sessions (id, user_id, organization_id, token_hash, expires_at, created_at) FROM stdin;
fa62b932-71a4-460b-901a-309434c80943	9563f09c-7bee-4a06-a831-4aaab5117087	f6d57f43-4b87-40a8-97dd-740c433d1674	fd3c0bf5123a763a0218fe2742e65701e1ec654b30e48ed52d0e5118900acce8	2026-09-11 07:53:55.601533+08	2026-09-04 07:53:55.601533+08
2c408f25-2200-44d2-8a00-b0b8c52885c1	3258beba-0a56-4f6a-8adc-6699fbaf58ed	f6d57f43-4b87-40a8-97dd-740c433d1674	d47c2a4060506237ca13eeadaf6674d96f380b1cf0d3fad9612248b23135a5bc	2026-09-11 07:53:55.937269+08	2026-09-04 07:53:55.937269+08
c4238c0d-7da4-41b7-b726-b3ccaa3ab172	88c0b482-385e-49be-a255-35d99e2dc258	05b5909c-570f-45cb-a0dc-8d19370c8671	272e365aead45056b061e52b7fe003e9478b8d01bf19b2c6ea0fbc89fe6db718	2026-09-11 07:53:56.055082+08	2026-09-04 07:53:56.055082+08
ccf8306f-3d9f-4848-9e00-bb89c835fcd5	9563f09c-7bee-4a06-a831-4aaab5117087	f6d57f43-4b87-40a8-97dd-740c433d1674	a0b1da58f777c6aa539ac148cafdb79c1e20c718da17af72b6090190f3b1d73f	2026-09-11 07:54:04.705933+08	2026-09-04 07:54:04.705933+08
7f41f54a-4656-42ad-91ab-5acde2b0d151	3258beba-0a56-4f6a-8adc-6699fbaf58ed	f6d57f43-4b87-40a8-97dd-740c433d1674	c9bb0a0685e992e5577df38c869e091dfce8b16c7cd165cf91de70e690760e90	2026-09-11 07:54:05.038093+08	2026-09-04 07:54:05.038093+08
699b846f-884d-4f9f-acfa-318ae40af59b	88c0b482-385e-49be-a255-35d99e2dc258	05b5909c-570f-45cb-a0dc-8d19370c8671	74272cd6bae7a6a2e37d2ccd962c4fdfe8096b202de693b7db9395391c19de71	2026-09-11 07:54:05.156084+08	2026-09-04 07:54:05.156084+08
597f4d35-f99e-4cda-8708-e72e8f81908e	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	49199c9043f1af83ca26c26388e2b4917c846cdd8d25b8ea63525f306a813f2b	2026-09-11 10:37:08.258511+08	2026-09-04 10:37:08.258511+08
e452b59d-af12-41c2-80c7-4cbe095ef121	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	5f3a0369170a465afacc6267a266967469278a6f6a43c8b8db1a894f3db1fcd7	2026-09-11 10:38:45.245686+08	2026-09-04 10:38:45.245686+08
7d455716-bce7-499c-9f29-5f80c2f1b870	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	b264765458ff3d8118e5f5524ef50376d52f44f312d199c4d89dc41843fe033f	2026-09-11 10:39:13.750361+08	2026-09-04 10:39:13.750361+08
e283f4f4-13d5-4e54-87e8-936c94331b14	3258beba-0a56-4f6a-8adc-6699fbaf58ed	f6d57f43-4b87-40a8-97dd-740c433d1674	5a916d9d008792ef566fe1289b60198115b39d0259568fcc21bdba2875099c19	2026-09-11 10:39:14.595644+08	2026-09-04 10:39:14.595644+08
28d06ad6-6b0f-4716-b692-98d4ef8e9a6b	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	160b44669dc625d452e3d570660c8fa18c571ed9a4af1d1e38b63e52188e84fe	2026-09-11 10:40:11.672041+08	2026-09-04 10:40:11.672041+08
8feeff2a-c2da-4075-99be-66a7f4328b02	3258beba-0a56-4f6a-8adc-6699fbaf58ed	f6d57f43-4b87-40a8-97dd-740c433d1674	f153036c5f8ad47e613532bc98137427cd18881d5eca0f765c9a7f66c5463ab2	2026-09-11 10:40:12.594053+08	2026-09-04 10:40:12.594053+08
c299bfd6-963f-4e9e-9cb6-89cb96979ba6	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	361fa4a727c9b262bd99ddf57a05ea93d92f46e4fbdd62d7b2290f316083590b	2026-09-11 11:06:54.080319+08	2026-09-04 11:06:54.080319+08
af83866a-9555-4939-8039-f8299a5485de	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	5e66b6eaddec7bc465e774bf29673b8ee655c70f571cd0fd47d4c2fd9e4f24fb	2026-09-11 12:56:14.443893+08	2026-09-04 12:56:14.443893+08
01d2a3db-81e5-493b-a233-e711864f6b8e	3258beba-0a56-4f6a-8adc-6699fbaf58ed	f6d57f43-4b87-40a8-97dd-740c433d1674	72278f5e272fdff19582a839de824712598d728879a7afa534470e350e45b2da	2026-09-11 12:56:14.976314+08	2026-09-04 12:56:14.976314+08
180575ed-166d-4d69-a3d9-d4feebae9535	ea9acb5b-8a01-41ea-a0fd-49eb36960a82	f6d57f43-4b87-40a8-97dd-740c433d1674	4d4aa8cbced6432d85246b8f81d07fb1c18ab148ee8997c7c521c3686d29bb19	2026-09-11 12:56:15.490172+08	2026-09-04 12:56:15.490172+08
ebb910e4-a5f7-43d7-9e73-d8a4e022e3be	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	4070183a22cb04642752027d619741f0a7d858a7fe05a12555fba26406dc1b5f	2026-09-11 14:07:59.310076+08	2026-09-04 14:07:59.310076+08
e0b6c06b-f738-461d-83b6-5dd2a0be87de	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	2e9237370eca47aa5ae431f444cc9bd5eea870d267a6c5012c1c15780490da3e	2026-09-11 14:08:30.641248+08	2026-09-04 14:08:30.641248+08
01411d73-1fbe-42af-ac92-84d5fa8e37ff	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	05626e297145d8b055fc427f1470e9ac94abaee9aed64dabb12c879e037afbce	2026-09-11 14:08:55.721841+08	2026-09-04 14:08:55.721841+08
c474fb1c-1095-460d-a9b9-925380f56ac1	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	76ac3b67347052a26f6eae5588afd963c48620f693fa93db8f0e590512b3f048	2026-09-11 14:09:22.188186+08	2026-09-04 14:09:22.188186+08
203325d1-ce1c-4923-837c-d7354cbea161	5ba1f0e9-765c-4f81-9a95-3d570257af44	f6d57f43-4b87-40a8-97dd-740c433d1674	7f90c2a993200966b0fca03453bc8bd79e3112d16258b981e7c0b79566681aa4	2026-09-11 14:10:07.297964+08	2026-09-04 14:10:07.297964+08
\.


--
-- Data for Name: stage_templates; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.stage_templates (id, st_key, st_name, st_day_offset, st_duration_days, st_order, st_description, source_label, active, created_at, updated_at) FROM stdin;
d9ab3002-0526-47a0-9085-b65e0eb87533	D-35	前期筹备	-35	-35	1	st_core_work: 村两委联席会议定班子职数；离任财务审计村务公示；筹备选委会推选\nst_sys_action: 无候选人材料操作，仅提案审批模块提交换届启动申请\nst_review_round: 提案审批\nst_material_type: 换届启动申请	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
ec7022df-e3db-4985-b123-8bcaed846add	D-34	成立选委会	-34	-34	2	st_core_work: 推选5-9人选委会；选委会分工；表决选举办法\nst_sys_action: 无材料候选人操作，仅母版配置基础信息\nst_announcement: 1号、2号、3号公告\nst_review_round: 选委会备案\nst_material_type: 选委会名单	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
252fb8dd-83ae-4ba9-b1d5-4e6e645ed04a	D-33~-29	选民登记	-33	-29	3	st_core_work: 逐户登记年满18周岁无剥夺政治权利村民；登记外出老弱病残流动票箱人员\nst_sys_action: 仅选民名册录入，不开放材料上报候选人流程\nst_announcement: 持续张贴3号公告	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
abd35dd7-88a5-4f3f-98f3-72d5398ae091	D-28~-24	公示选民名单	-28	-24	4	st_core_work: 汇总全部选民，开启5天异议申诉期\nst_sys_action: 无材料候选人操作\nst_announcement: 4号选民名单公告\nst_review_round: 选民资格审核\nst_material_type: 选民名册	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
c6b6cc92-7e2c-4df6-b38a-f43674674215	D-23~-21	受理选民申诉	-23	-21	5	st_core_work: 核查资格异议，更正选民名册\nst_sys_action: 无材料候选人操作\nst_announcement: 选民名单更正补充公告\nst_review_round: 异议核查\nst_material_type: 选民名单更正	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
d515b14e-dd04-4fe6-a79f-e80cb0c8ae33	D-20~-16	代表选举	-20	-16	6	st_core_work: 村：村民代表和小组长；居：居民代表和户代表\nst_sys_action: 代表和小组长选举结果录入\nst_announcement: 5号、6号、6-1号公告\nst_review_round: 选举结果确认\nst_material_type: 代表名单、小组长名单	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
836064ff-507d-4b73-a5a6-b93b710cf463	D-15	候选人提名启动	-15	-15	7	st_core_work: 发布7号提名公告；开放组织推荐、个人自荐两类提名\nst_sys_action: 候选人提名开启；材料上报同步开启；r1材料完整性审核开始\nst_announcement: 7号提名公告\nst_review_round: 第一轮-材料完整性审核\nst_material_type: 自荐表、身份证、个人简历、无犯罪记录证明、组织推荐函	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
012ba5e5-e6e9-45cb-bc06-91f1baf44f4f	D-14	候选人提名延续	-14	-14	8	st_core_work: 持续接收组织推荐、群众自荐材料\nst_sys_action: 候选人提名；材料上报；材料审核持续\nst_announcement: 持续张贴7号公告\nst_review_round: 第一轮-材料完整性审核\nst_material_type: 候选人提名相关材料	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
43085b95-d4ac-40a1-8a48-73159b9a5634	D-13	初步候选人汇总+镇级初审	-13	-13	9	st_core_work: 汇总全部人员；镇级资格初审；选委会递补\nst_sys_action: 提名收尾；r1完成；r2镇级初审；关闭材料上报入口\nst_announcement: 8号初步候选人名单公告、2-1号选委会递补公告\nst_review_round: 第二轮-镇级资格初审\nst_material_type: 初步候选人汇总名单	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
cdde4525-768b-46f5-ab65-b22b6c277b1b	D-12~-10	竞选预选	-12	-10	10	st_core_work: 超差额职位召开代表会议无记名预选，确定正式候选人\nst_sys_action: 预选投票组织与结果录入\nst_announcement: 预选办法公告、预选结果公告\nst_review_round: 预选结果确认\nst_material_type: 预选结果	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
765dce20-7de2-4a4c-95db-3740d6a8acb1	D-9~-5	区级11部门联审、党委考察	-9	-5	11	st_core_work: 多部门资格核查，党委考察筛选正式候选人\nst_sys_action: 暂停新增材料上报；r3区级多部门联审；r4党委考察\nst_review_round: 第三轮-区级联审、第四轮-党委考察	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
b7166994-b933-4f0b-9b0c-30353a9519cd	D-4	正式候选人公示	-4	-4	12	st_core_work: 联审收尾，确定并公示正式候选人\nst_sys_action: 四轮全过转正式候选人；关闭材料上报和新增提名入口\nst_announcement: 9号正式候选人名单公告\nst_review_round: 最终确认	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
37e2ac92-ed70-4fd3-8832-d751c1fbd2dc	D-3~-2	投票竞选筹备	-3	-2	13	st_core_work: 确定监票、计票、流动票箱、代写人员\nst_sys_action: 竞选筹备阶段公示配套规则\nst_announcement: 10~14号公告\nst_review_round: 工作人员备案\nst_material_type: 选举工作人员名单、流动票箱名单、委托投票名单、代写名单	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
7082c6d2-fe42-44c7-be5c-8efa542d92b7	D-1	投票竞选筹备	-1	-1	14	st_core_work: 印制选票，布置票箱\nst_sys_action: 竞选筹备阶段\nst_announcement: 15号无效票认定规则公告	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
2470de2d-0ea1-4cfb-bffb-c7cc3ef2e094	D0	正式投票选举	0	0	15	st_core_work: 现场集中+流动票箱投票；当众开箱计票；当场公布结果\nst_sys_action: 正式选举（投票当日）；录入线下投票结果更新当选人员\nst_announcement: 16号选举结果公告、17号村务监督委员会公告\nst_review_round: 结果确认备案\nst_material_type: 选举结果报告	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
71fd5b86-0f08-406a-b206-ca5179118955	D+1~+10	结果备案、新旧班子交接	1	10	16	st_core_work: 整理选举档案；公章、财务、档案、固定资产交接\nst_sys_action: 竞选流程结束仅归档；全流程结束所有材料候选人模块锁定只读\nst_review_round: 归档确认\nst_material_type: 选举档案、交接清单	government-procedure	t	2026-09-04 07:51:56.940856+08	2026-09-04 07:51:56.940856+08
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: cxq_new; Owner: postgres
--

COPY cxq_new.users (id, phone, password_hash, display_name, status, created_at) FROM stdin;
88c0b482-385e-49be-a255-35d99e2dc258	15500020001	scrypt:6465679f15925a3ae3e5dae1f6be8f6b:56034a5853d7001ab46163d266d736f703ea5fad6e103da3d231852cda5c78fe8a533c1dec7e3f10cebe117ed8cbfd088b64c83f7017163f1c2271488f7d6288	演示社区组织管理员	active	2026-09-04 07:52:01.492583+08
7f77f012-66c8-4308-aefe-a24b28e0855a	15500020002	scrypt:da80924f271b926208fbf46347749c34:3592903a6a931576326d9d9db0ba6ae556a80bb4cefbf6288a5a4f8c1a32aabf8b3c3a72d6fc26168d8427aaede6da480235a6d86696e878ad2d93ef5833504c	演示社区业务经办	active	2026-09-04 07:52:01.492583+08
47a3d00b-ccb0-4feb-b383-44f7e14d7852	15500020003	scrypt:71e55eb8611593b34e09cbc25f625b6c:fd0840601a0ff6adc1832f13c93425940a09b5f51f22ca78058962605fecb54a95e586f766f01be80f9730a3a82af01b6e23d6ceb378fd0ac46dc9a983513316	演示社区公告编辑	active	2026-09-04 07:52:01.492583+08
b39dd4de-4034-4eea-b839-ebd71a7b0c51	15500020004	scrypt:05fd2c007a1458bb5e09a415da8bd173:ca1bd7701580dd3f01ee670783bab7d4c5560e08c2c8e309a9f9debc16a98eed5d75fd492462c9fa67f641b0cfaa9d1cf63b825cf7a7f2f746822a224ddc88fd	演示社区材料审核	active	2026-09-04 07:52:01.492583+08
51204f22-6137-4524-a42c-f4d5d57416a0	15500020005	scrypt:7c38227dd5c5be7b7846a83809093c02:2bf4cfa2b32200bf534ada7d2d4b7a8587d127b5c48ed1d33888ec2c26a8423cb3158e9fccc53648e87e22e8877288524d8178cc77fecf9d529ffd14a05c6e3f	演示社区参选人	active	2026-09-04 07:52:01.492583+08
5ba1f0e9-765c-4f81-9a95-3d570257af44	15500000001	scrypt:810b89cabcfcd17e4354c4e6eaf4524b:f073465483934465fd85bf4ce993af4fb816a0e1d1db30380267d8df1df63360ebca7fbe4f5ae0dcab1f734518e4d7f024c1ffe6ee1bde164de86d66add8776e	换届系统超管	active	2026-09-04 07:52:01.492583+08
3258beba-0a56-4f6a-8adc-6699fbaf58ed	15500010001	scrypt:f4a9b3cc5716101ed91eb55f495691d0:efb2c16073ad1cc435b1a5d988ba586ce6203e33fe591d4de8a91e5804cf729a77298913819b878ba76ec6823e7ec69c703cf85938e2b76430a660dc09983df5	演示村组织管理员	active	2026-09-04 07:52:01.492583+08
ea9acb5b-8a01-41ea-a0fd-49eb36960a82	15500010002	scrypt:a840bfb8dc3e48020be4f522ce67aac4:0304eb2bf9b39e669c2aee545cced804aaed3e32c9fd639ef66be9648400469228fce76fc5e4c593f745ab848c69634422af4dd38695a17743dbeb5133dc6b89	演示村业务经办	active	2026-09-04 07:52:01.492583+08
b8559bbe-a0b4-4bda-b78b-d5232f212407	15500010003	scrypt:c3dadad66cf687a89d6601b041a93fea:dfe3bc82d388a95f42a615142b1b5eda6b6f11936307d501a067fb9d28902f2d8fa2b10474c08d264364a6691be4f24711fb78a9baaaf6bbaf153eafd99712bc	演示村公告编辑	active	2026-09-04 07:52:01.492583+08
71751885-9ead-4968-aa99-49ecf2838930	15500010004	scrypt:82ebfd85be5e6611dd7f14553ace7514:a0c01d7ea137ebd9c936e8db12968443765692965a59507d932b007951cefa8af02c5e58fbe97ebac5d6fac9e6a9f22d000081fd1b09722520c425a8f62204a0	演示村材料审核	active	2026-09-04 07:52:01.492583+08
9563f09c-7bee-4a06-a831-4aaab5117087	15500010005	scrypt:3a181e56baefa5065fb4bd41b38e22c0:b520af967536d8921dec7bb858a9d752f38c658d6162086e58ade02a7e84ddfdc2cc4fa3468f12b1a4c230ed26d853b21621442e4064c08dce3b474ec764fcb6	演示村参选人	active	2026-09-04 07:52:01.492583+08
\.


--
-- Data for Name: account; Type: TABLE DATA; Schema: neon_auth; Owner: postgres
--

COPY neon_auth.account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: invitation; Type: TABLE DATA; Schema: neon_auth; Owner: postgres
--

COPY neon_auth.invitation (id, "organizationId", email, role, status, "expiresAt", "createdAt", "inviterId") FROM stdin;
\.


--
-- Data for Name: jwks; Type: TABLE DATA; Schema: neon_auth; Owner: postgres
--

COPY neon_auth.jwks (id, "publicKey", "privateKey", "createdAt", "expiresAt") FROM stdin;
39ef6c75-d0bd-4246-a272-516d55937837	{"crv":"Ed25519","x":"fyqR3XYH-f9oHgCnGJpmpGb-9vtkqiwoa4M5uS8X-Ew","kty":"OKP"}	"0cc177e6f62cf873295d50676a983b48f7f363fc87517f7d313ae795d01f26a47f788bf06b8165784c403bc6097cb11300a83c57a92fc33794c63508736da663a151689d5c08b9c15a917279348a19d98209b8c099fcc02ea17d7ec02e3a43fdc4fe08fec9f24322c4a16480d864404dedf8c812f56ba5a91519cee51de53c911303cfeadaad4e4a8f7e54ce835951aebbf47e6cf31d96a6c41217388223c8703604ef6b4003c29ae6"	2026-09-04 01:52:07.931+08	\N
\.


--
-- Data for Name: member; Type: TABLE DATA; Schema: neon_auth; Owner: postgres
--

COPY neon_auth.member (id, "organizationId", "userId", role, "createdAt") FROM stdin;
\.


--
-- Data for Name: organization; Type: TABLE DATA; Schema: neon_auth; Owner: postgres
--

COPY neon_auth.organization (id, name, slug, logo, "createdAt", metadata) FROM stdin;
\.


--
-- Data for Name: project_config; Type: TABLE DATA; Schema: neon_auth; Owner: postgres
--

COPY neon_auth.project_config (id, name, endpoint_id, created_at, updated_at, trusted_origins, social_providers, email_provider, email_and_password, allow_localhost, plugin_configs, webhook_config) FROM stdin;
8fad30b6-544f-48d7-a3bc-cf96a7f26534	wechat	ep-cold-dawn-b34i2tms	2026-09-01 13:53:02.345+08	2026-09-01 13:53:02.345+08	[]	[{"id": "google", "isShared": true}]	{"type": "shared"}	{"enabled": true, "disableSignUp": false, "emailVerificationMethod": "otp", "requireEmailVerification": false, "autoSignInAfterVerification": true, "sendVerificationEmailOnSignIn": false, "sendVerificationEmailOnSignUp": false}	t	{"magicLink": {"config": {"expiresIn": 5, "disableSignUp": false}, "enabled": false}, "phoneNumber": {"config": {"otp_expires_in": 300}, "enabled": false}, "organization": {"config": {"creatorRole": "owner", "membershipLimit": 100, "organizationLimit": 10, "sendInvitationEmail": false}, "enabled": true}}	{"enabled": false, "enabledEvents": [], "timeoutSeconds": 5}
\.


--
-- Data for Name: session; Type: TABLE DATA; Schema: neon_auth; Owner: postgres
--

COPY neon_auth.session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId", "impersonatedBy", "activeOrganizationId") FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: neon_auth; Owner: postgres
--

COPY neon_auth."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role, banned, "banReason", "banExpires") FROM stdin;
\.


--
-- Data for Name: verification; Type: TABLE DATA; Schema: neon_auth; Owner: postgres
--

COPY neon_auth.verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: announcement_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcement_templates (id, at_code, at_name, at_version, at_content, at_need_remind, at_note, source_label, active, created_at, updated_at, at_sched_offset) FROM stdin;
97455ec8-cb15-42c2-b8a2-a42adaa3c381	第1号	关于确定选举日的公告	通用	______镇(街道)村(居)民委员会选举指导组关于确定选举日的公告（第1号）经镇(街道)村民委员会选举指导组研究，并报县(区､管委会)选举指导组同意，本村第十四届村民委员会换届选举工作定于____月____日开始，选举日确定为____月____日。经登记确认具有选民资格的村民，均可参加投票选举。望村民互相转告。特此公告______镇(街道)村(居)民委员会选举指导组____年____月____日	t	甲方DOCX原文重建；排期偏移D-34	government-document	t	2026-09-04 12:03:23.265975+08	2026-09-04 12:03:23.265975+08	-34
5d25d79d-37eb-437b-8327-14a8fcb0a235	第2号	关于村民选举委员会名单的公告	通用	______镇(街道)______村村民委员会关于村民选举委员会名单的公告（第2号）经本村村民推选，产生了组织和主持本村第十四届村民委员会换届选举工作的村民选举委员会。现将名单公布如下：主 任：__________副主任：__________委 员：__________、__________、__________特此公告______镇(街道)______村村民委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-34	government-document	t	2026-09-04 12:03:23.378392+08	2026-09-04 12:03:23.378392+08	-34
235ffca7-dad3-40ef-8a67-6ce3de22edef	第3号	关于选民登记的公告	通用	______镇(街道)______村第十四届村民选举委员会关于选民登记的公告（第3号）经镇(街道)村民委员会选举指导组研究确定，本届村民委员会选举选民登记时间定为____月____日____时至____月____日____时。凡符合法律法规和政策规定的村民，均可在本村村民选举委员会进行选民登记。经选民登记确认后，方可参加投票选举。望村民互相转告。特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-34	government-document	t	2026-09-04 12:03:23.488027+08	2026-09-04 12:03:23.488027+08	-34
5eb2787c-e465-43a5-bd7a-b43513ae5ac4	第4号	关于选民名单的公告	通用	______镇(街道)______村第十四届村民选举委员会关于选民名单的公告（第4号）现将经过登记确认的参加本村第十四届村民委员会选举的选民名单公布如下。如有错漏，请于____月____日____时前向村民选举委员会提出。各小组名单附后特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-20	government-document	t	2026-09-04 12:03:23.598242+08	2026-09-04 12:03:23.598242+08	-20
df52c3a6-6847-4472-b416-dcf20dfcd71c	第5号	关于村民代表和小组长选举的公告	通用	______镇(街道)______村第十四届村民选举委员会关于村民代表和小组长选举的公告（第5号）根据法律法规规定，本村村民代表和村民小组长选举日定为____月____日，当日____时开始投票，当日____时截止投票。投票地点设在__________。各小组选民，均应参加投票选举。望村民互相转告。特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D按需	government-document	t	2026-09-04 12:03:23.708211+08	2026-09-04 12:03:23.708211+08	\N
8670cfc4-479d-476a-8a3a-2966dd8394f5	第6号	关于村民代表名单的公告	通用	______镇(街道)______村第十四届村民选举委员会关于村民代表名单的公告（第6号）经依法推选，本村共产生第十四届村民代表____名，其中妇女代表____名。现将名单公布如下：各小组名单附后特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D按需	government-document	t	2026-09-04 12:03:23.818409+08	2026-09-04 12:03:23.818409+08	\N
4d0ce4ce-d54e-43c9-a7e9-4e79364d2d02	第6-1号	关于村民小组长、副组长名单的公告	通用	______镇(街道)______村第十四届村民选举委员会关于村民小组长、副组长名单的公告（第6-1号）经依法推选，下列人员分别当选为各村民小组组长和副组长。现将名单公布如下：第一小组：组长__________，副组长__________...（各小组依次排列）特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D按需	government-document	t	2026-09-04 12:03:23.928955+08	2026-09-04 12:03:23.928955+08	\N
878312c6-2444-4bc4-96e2-13446d4c2ba1	第7号	关于村民委员会成员初步候选人提名的公告	通用	______镇(街道)______村第十四届村民选举委员会关于村民委员会成员初步候选人提名的公告（第7号）根据法律法规规定，经村民(代表)会议讨论决定，本村新一届村民委员会成员数共____人。其中，主任____人、副主任____人、委员____人、妇女成员____人（单独提名）。初步候选人提名时间从____月____日____时至____月____日____时。请有选举权的村民踊跃参加提名。提名表和自荐表请到村民委员会办公室领取。联系人：__________ 联系电话：__________特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-15	government-document	t	2026-09-04 12:03:24.039363+08	2026-09-04 12:03:24.039363+08	-15
213917cf-a2e2-4969-b13b-53cbac259c4d	第8号	关于村民委员会成员初步候选人名单的公告	通用	______镇(街道)______村第十四届村民选举委员会关于村民委员会成员初步候选人名单的公告（第8号）经登记参加选举的村民提名和自荐，产生本村第十四届村民委员会成员初步候选人。如有错漏，请于____月____日____时前向村民选举委员会提出。现将名单按姓氏笔画顺序公布如下：主任候选人：__________、__________副主任候选人：__________、__________委员候选人：__________、__________、__________妇女成员候选人：__________特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-13	government-document	t	2026-09-04 12:03:24.149719+08	2026-09-04 12:03:24.149719+08	-13
0d0495e6-5eb8-4f80-8288-13258ee0bbdf	第9号	关于村民委员会成员正式候选人名单的公告	通用	______镇(街道)______村第十四届村民选举委员会关于村民委员会成员正式候选人名单的公告（第9号）经依法提名并通过镇(街道)、县(区、管委会)资格审查，产生本村第十四届村民委员会成员正式候选人。现将名单公布如下：主任候选人：__________、__________副主任候选人：__________、__________委员候选人：__________、__________、__________妇女候选人：__________特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-6	government-document	t	2026-09-04 12:03:24.260406+08	2026-09-04 12:03:24.260406+08	-6
bafe59bf-5e9a-4846-83b9-2e9c6b59068f	第10号	关于村民委员会选举投票时间和地点的公告	通用	______镇(街道)______村第十四届村民选举委员会关于村民委员会选举投票时间和地点的公告（第10号）经村民选举委员会研究，决定本村村民委员会选举的投票站地点和投票时间如下：中心投票站设在__________，投票分站设在__________。具体投票时间为____月____日____时至____时。流动票箱使用时间为____月____日____时至____时，路线为：____时从__________出发，沿__________开展上门投票。开箱计票时间为____月____日____时，地点在__________。特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-5	government-document	t	2026-09-04 12:03:24.370696+08	2026-09-04 12:03:24.370696+08	-5
148ceb1e-0d2f-4f94-86c7-6dd3a4e748e2	第11号	关于选举工作人员名单的公告	通用	______镇(街道)______村第十四届村民选举委员会关于选举工作人员名单的公告（第11号）经村民选举委员会研究决定，本村村民委员会选举的工作人员名单如下：唱票员：__________计票员：__________监票员：__________流动票箱工作人员：__________、__________特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-5	government-document	t	2026-09-04 12:03:24.481385+08	2026-09-04 12:03:24.481385+08	-5
bcdfcaad-69f7-4b8a-a165-33e10ec7e1ea	第12号	关于流动票箱投票人员名单的公告	通用	______镇(街道)______村第十四届村民选举委员会关于流动票箱投票人员名单的公告（第12号）经本人申请和村民选举委员会研究，确定本村村民委员会选举使用流动票箱投票人员名单如下：__________（因：__________）、__________（因：__________）特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-5	government-document	t	2026-09-04 12:03:24.590972+08	2026-09-04 12:03:24.590972+08	-5
068840c0-5baa-4afe-a21e-81c54aeee555	第13号	关于委托投票名单的公告	通用	______镇(街道)______村第十四届村民选举委员会关于委托投票名单的公告（第13号）根据法律法规规定，以下登记参加选举的村民在选举日外出不能回村参加投票，且在规定时限内办理了委托投票手续。经村民选举委员会审核，人员名单如下：受委托人：__________ 委托人：__________特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-5	government-document	t	2026-09-04 12:03:24.701137+08	2026-09-04 12:03:24.701137+08	-5
dee6f7ab-6c9e-431c-a20f-c5a4bcaffb3a	第14号	关于代写人员名单的公告	通用	______镇(街道)______村第十四届村民选举委员会关于代写人员名单的公告（第14号）经本人申请和村民选举委员会研究确定，本村村民委员会选举要求代写人员和代写员名单如下：要求代写人员：__________ 委托代写员：__________特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-5	government-document	t	2026-09-04 12:03:24.811377+08	2026-09-04 12:03:24.811377+08	-5
60c91475-541f-4530-b6bb-07dcb1a5022a	第15号	关于无效票认定规则的公告	通用	______镇(街道)______村第十四届村民选举委员会关于无效票认定规则的公告（第15号）经村民选举委员会讨论决定，本村村民委员会选举无效票认定的具体规则如下：1. 未填写任何候选人姓名的空白选票；2. 所选候选人人数超过法定差额名额的选票；3. 涂改、标记特殊符号，导致候选人姓名无法辨认的选票；4. 私自撕毁、拆分选票，导致选票不完整的；5. 使用非本次选举统一印制选票的；6. 选票上填写的候选人姓名与正式候选人名单不符，且无法核实身份的；7. 代写人员违规干预选民意愿，擅自填写选票的；8. 其他违反选举规定，经选举委员会认定为无效的选票。特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-5	government-document	t	2026-09-04 12:03:24.921447+08	2026-09-04 12:03:24.921447+08	-5
461092a9-f326-4a09-ade7-322e5929c0d0	第16号	关于村民委员会选举结果的公告	通用	______镇(街道)______村第十四届村民选举委员会关于村民委员会选举结果的公告（第16号）根据法律法规和政策规定，经全体选民直接投票，下列人员当选为本村第十四届村民委员会主任、副主任和委员。现将名单公布如下：主 任：__________副主任：__________委 员：__________、__________、__________特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D0	government-document	t	2026-09-04 12:03:25.031547+08	2026-09-04 12:03:25.031547+08	0
f26f6e11-64f8-4413-b884-9ee2d3ed4466	第17号	关于村务监督委员会成员选举结果的公告	通用	______镇(街道)______村第十四届村民选举委员会关于村务监督委员会成员选举结果的公告（第17号）根据《中华人民共和国村民委员会组织法》和《福建省实施<中华人民共和国村民委员会组织法>办法》的规定，经选举，下列人员当选为本村新一届村务监督委员会主任和委员：主 任：__________委 员：__________、__________特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D0	government-document	t	2026-09-04 12:03:25.141118+08	2026-09-04 12:03:25.141118+08	0
cfd55e37-3df5-44de-bf8d-ad9497adedf1	补充公告	关于选民名单更正的补充公告	通用	______镇(街道)______村第十四届村民选举委员会关于选民名单更正的补充公告针对第4号公告公示期间异议核查结果，经村民选举委员会复核，对部分选民资格予以更正，现将更正后的有效选民名册予以公布。如有错漏，请于____月____日____时前向村民选举委员会提出。特此公告______镇(街道)______村村民选举委员会____年____月____日	t	甲方DOCX原文重建；排期偏移D-19	government-document	t	2026-09-04 12:03:25.250924+08	2026-09-04 12:03:25.250924+08	-19
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, election_fief_id, title, body, status, created_by, updated_by, published_by, published_at, created_at, updated_at, template_id, scheduled_for, stage_key) FROM stdin;
\.


--
-- Data for Name: candidate_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidate_reviews (id, candidate_id, round, reviewer_id, decision, note, created_at) FROM stdin;
\.


--
-- Data for Name: candidates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidates (id, election_fief_id, user_id, material_id, status, current_round, created_at) FROM stdin;
\.


--
-- Data for Name: election_fief_stages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.election_fief_stages (id, election_fief_id, stage_template_id, stage_key, stage_name, start_date, end_date, stage_order, status, created_at) FROM stdin;
022a0903-56c3-4573-8217-64eece7c55fb	88180e3d-abd9-4bec-89d3-ab8937269f06	ede17d29-cfc9-4b15-935e-533ee8e51194	prep	前期筹备	2026-11-15	2026-11-15	1	not_started	2026-09-04 11:42:20.723925+08
d6f146d9-65ea-4439-a783-940f0ad3280b	88180e3d-abd9-4bec-89d3-ab8937269f06	acd6647a-dfeb-4d3a-8eb1-6a322fd53b8a	elect_committee	成立选委会	2026-11-16	2026-11-16	2	not_started	2026-09-04 11:42:20.844657+08
51263d22-a332-4782-b488-12f950d9522b	88180e3d-abd9-4bec-89d3-ab8937269f06	28d0a5b7-d85c-42aa-992d-dfb119830870	voter_reg	选民登记	2026-11-17	2026-11-20	3	not_started	2026-09-04 11:42:20.962204+08
f66fdf28-9550-479e-8cde-06875a67fb03	88180e3d-abd9-4bec-89d3-ab8937269f06	42e66569-35ec-431f-811a-8d8f185e88ed	voter_list	公示选民名单	2026-11-30	2026-11-30	4	not_started	2026-09-04 11:42:21.079897+08
9fd8d0e0-ffb2-4664-9920-e8ea2eac8932	88180e3d-abd9-4bec-89d3-ab8937269f06	efc7a628-0bba-4c29-845c-08c772009fec	voter_appeal	受理选民申诉	2026-12-01	2026-12-04	5	not_started	2026-09-04 11:42:21.196999+08
700bb3e9-cdde-4a0a-9c3b-5c6d475d7b56	88180e3d-abd9-4bec-89d3-ab8937269f06	eb1c16a6-18eb-48c3-9230-b6b3165887bf	nominate_start	候选人提名启动	2026-12-05	2026-12-05	6	not_started	2026-09-04 11:42:21.314567+08
547b7bc1-3828-4836-98af-57e49c26650d	88180e3d-abd9-4bec-89d3-ab8937269f06	86372537-5ae4-4aba-a236-a0083e0b2b3d	nominate_cont	候选人提名延续	2026-12-06	2026-12-06	7	not_started	2026-09-04 11:42:21.432433+08
f080efac-9418-40ef-a01c-6bee34f271da	88180e3d-abd9-4bec-89d3-ab8937269f06	2cdb5e71-4207-469e-b52c-457359d50a56	prelim_shortlist	初步候选人汇总+镇级初审	2026-12-07	2026-12-07	8	not_started	2026-09-04 11:42:21.550214+08
7cfc2577-d92c-4ef8-a1da-a9e7d6985fa5	88180e3d-abd9-4bec-89d3-ab8937269f06	2f78d7a4-6eb6-4058-adb6-20ce4f295ba6	joint_review	区级11部门联审、党委考察	2026-12-08	2026-12-13	9	not_started	2026-09-04 11:42:21.667122+08
c411b8bb-cf48-43e7-9700-b6855f0fd77c	88180e3d-abd9-4bec-89d3-ab8937269f06	fa1dd7f5-86dc-4290-911e-f4b5fe62afbf	formal_notice	正式候选人公示	2026-12-14	2026-12-14	10	not_started	2026-09-04 11:42:21.784638+08
04eae6a7-6e55-4b18-a084-8116b58fe1ea	88180e3d-abd9-4bec-89d3-ab8937269f06	ad9cec98-fb6b-4c79-9d64-86ee9eba93d4	campaign_prep	投票竞选筹备	2026-12-15	2026-12-19	11	not_started	2026-09-04 11:42:21.902832+08
f0ae73c6-646e-44ac-b48f-dc67c075360b	88180e3d-abd9-4bec-89d3-ab8937269f06	bbaf68e7-ca84-4757-8632-b4b727d4a0c1	election_day	正式选举	2026-12-20	2026-12-20	12	not_started	2026-09-04 11:42:22.020257+08
80077e97-2385-46ce-a131-9739a4769c25	88180e3d-abd9-4bec-89d3-ab8937269f06	1618effa-1716-4070-b1ab-f10e911355de	result_filing	结果备案	2026-12-21	2026-12-25	13	not_started	2026-09-04 11:42:22.137315+08
4945ee8c-1339-4388-b8f8-61df55d6006d	88180e3d-abd9-4bec-89d3-ab8937269f06	4ebb6e9f-a115-4283-b53d-14e967be941b	handover	新旧班子交接	2026-12-26	2026-12-30	14	not_started	2026-09-04 11:42:22.254114+08
15c428af-cd2d-4c9e-9572-ecacd063de37	4ef0a008-1152-41f7-8d77-79edb4c03024	a4b147ae-6cc0-4bab-9d4e-3b998209e04f	prep	前期筹备	2026-11-22	2026-11-22	1	not_started	2026-09-04 11:42:22.836821+08
2fbdf04b-892b-4ce6-b626-13d0e1ea911c	4ef0a008-1152-41f7-8d77-79edb4c03024	88c45784-f00b-46d3-a411-544d47eb46c0	elect_committee	成立选委会	2026-11-23	2026-11-23	2	not_started	2026-09-04 11:42:22.954097+08
cb12dcce-d3e6-4a2d-a509-1723c8db3232	4ef0a008-1152-41f7-8d77-79edb4c03024	1be33a99-8336-4935-a3c6-60900b70320e	resident_reg	居民/户代表登记	2026-11-24	2026-11-28	3	not_started	2026-09-04 11:42:23.072521+08
13173b4d-24da-4c13-b458-2e0137b5ff61	4ef0a008-1152-41f7-8d77-79edb4c03024	9e293061-7827-4951-93b8-beccb011966f	resident_list	公示登记名册	2026-12-07	2026-12-07	4	not_started	2026-09-04 11:42:23.190245+08
e15aa8bc-64ee-46b0-b053-87a7173c8a6e	4ef0a008-1152-41f7-8d77-79edb4c03024	dc95a4ad-be8a-41cc-b3a0-89af57d17134	resident_appeal	申诉核查	2026-12-08	2026-12-11	5	not_started	2026-09-04 11:42:23.30711+08
d350fd8b-0db0-47dd-a11a-266e11eb72cc	4ef0a008-1152-41f7-8d77-79edb4c03024	9ec20b47-7a90-4dd2-a7ae-f5765bde3ac5	nominate_start	候选人提名启动	2026-12-12	2026-12-12	6	not_started	2026-09-04 11:42:23.425222+08
8e7be1e1-3eab-4245-9bae-023221f02587	4ef0a008-1152-41f7-8d77-79edb4c03024	2d8b7f01-842f-43e4-aa56-2fdef88d80ad	nominate_cont	提名持续收集	2026-12-13	2026-12-13	7	not_started	2026-09-04 11:42:23.542306+08
891d4c4a-1a48-43c5-9a42-57cda42d6905	4ef0a008-1152-41f7-8d77-79edb4c03024	c1bbe229-8eb0-4383-810e-fee16fa6ac97	prelim_shortlist	初步候选人汇总+街道初审	2026-12-14	2026-12-14	8	not_started	2026-09-04 11:42:23.659709+08
7f6ec62a-b91e-4d93-a530-06c86a807df3	4ef0a008-1152-41f7-8d77-79edb4c03024	600a0a8e-482a-4b46-9070-bd5260c7e877	joint_review	区级多部门联审、党工委考察	2026-12-15	2026-12-20	9	not_started	2026-09-04 11:42:23.776357+08
0220713d-c7e6-4331-be5a-63e63cf553aa	4ef0a008-1152-41f7-8d77-79edb4c03024	8772820f-272a-4c94-8e73-6f0076072755	formal_notice	正式候选人公示	2026-12-21	2026-12-21	10	not_started	2026-09-04 11:42:23.893689+08
9aa68085-3d26-4cc9-87e5-d7a65a9fbefb	4ef0a008-1152-41f7-8d77-79edb4c03024	cab7776a-3d89-4cc9-b9a3-505d49fc0bfc	campaign_prep	竞选投票筹备	2026-12-22	2026-12-26	11	not_started	2026-09-04 11:42:24.010899+08
8a8ef709-9bab-43fe-ab53-f635a8df7f60	4ef0a008-1152-41f7-8d77-79edb4c03024	3d67235b-bfdb-4c31-8ae9-252b4568dcd0	election_day	正式竞选投票	2026-12-27	2026-12-27	12	not_started	2026-09-04 11:42:24.127686+08
f6a6dd41-b277-48f1-8f0d-d6d3cbab356a	4ef0a008-1152-41f7-8d77-79edb4c03024	cb9d6f56-d56b-4473-8ccd-3f26b175b5f8	result_filing	结果备案	2026-12-28	2027-01-01	13	not_started	2026-09-04 11:42:24.24538+08
601ac836-bc30-4eb6-80ac-5ba613ecf286	4ef0a008-1152-41f7-8d77-79edb4c03024	2123f56c-276e-450f-b04f-7aa5ab191c32	handover	新旧班子交接	2027-01-02	2027-01-06	14	not_started	2026-09-04 11:42:24.36234+08
\.


--
-- Data for Name: election_fiefs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.election_fiefs (id, election_term_id, organization_id, unit_id, name, d_day, timezone, status, version, created_by, created_at) FROM stdin;
88180e3d-abd9-4bec-89d3-ab8937269f06	30832e6a-fff6-4b7a-b188-5122761a8162	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	b96ae57b-4329-4c1e-b6de-6a4bf10854a3	演示村换届	2026-12-20	Asia/Shanghai	draft	1	ace40d07-d887-427e-9171-841c5be79dd9	2026-09-04 11:42:20.45096+08
4ef0a008-1152-41f7-8d77-79edb4c03024	30832e6a-fff6-4b7a-b188-5122761a8162	44365f42-164c-4ea6-9f79-3363a609dd71	03df14f2-4ac7-4b0a-b6ea-1045a3a865e5	演示社区换届	2026-12-27	Asia/Shanghai	draft	1	ace40d07-d887-427e-9171-841c5be79dd9	2026-09-04 11:42:22.604164+08
\.


--
-- Data for Name: election_proposals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.election_proposals (id, organization_id, term_id, unit_id, name, d_day, org_type, positions, status, proposed_by, reviewed_by, reviewed_at, created_at) FROM stdin;
\.


--
-- Data for Name: election_terms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.election_terms (id, name, status, created_at) FROM stdin;
30832e6a-fff6-4b7a-b188-5122761a8162	2026年村居换届	active	2026-09-04 11:42:19.965699+08
\.


--
-- Data for Name: election_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.election_units (id, organization_id, name, created_at) FROM stdin;
b96ae57b-4329-4c1e-b6de-6a4bf10854a3	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	演示村换届	2026-09-04 11:42:20.171602+08
03df14f2-4ac7-4b0a-b6ea-1045a3a865e5	44365f42-164c-4ea6-9f79-3363a609dd71	演示社区换届	2026-09-04 11:42:22.371537+08
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invitations (id, organization_id, phone, role, token_hash, expires_at, invited_by, accepted_at) FROM stdin;
\.


--
-- Data for Name: material_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.material_files (id, material_id, file_name, mime_type, size_bytes, storage_key, created_at) FROM stdin;
\.


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.materials (id, election_fief_id, candidate_user_id, title, description, status, submitted_at, reviewed_at, reviewed_by, review_note) FROM stdin;
\.


--
-- Data for Name: memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.memberships (id, user_id, organization_id, role, created_at) FROM stdin;
802c2662-a8e7-4c5a-931a-a2038caeea82	ace40d07-d887-427e-9171-841c5be79dd9	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	platform_admin	2026-09-04 11:42:17.519803+08
f1559aba-ad80-46b8-9684-c6e76a34147c	eb5446e3-c854-4cf9-b687-75cb9f76de7e	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	sub_admin	2026-09-04 11:42:17.914601+08
9a59972c-b441-46f8-bb4f-8455466d792b	80d49ead-7e61-443d-85c2-00de76b33e9e	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	editor	2026-09-04 11:42:18.326175+08
10e6761d-56d1-4f72-a6e5-69bc7fe3d54d	5338a51b-e480-4068-89db-a8a922be1518	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	reviewer	2026-09-04 11:42:18.609043+08
6493393f-e95b-4cb0-b8c7-c8be4fdaeee3	ca0e588b-4d99-4bb9-bd4e-8e01343ac095	44365f42-164c-4ea6-9f79-3363a609dd71	sub_admin	2026-09-04 11:42:19.017263+08
ed08110c-9461-406f-994b-2d48702e0314	65fb90b6-02c8-4111-b307-1e8dcf8e2cb4	44365f42-164c-4ea6-9f79-3363a609dd71	editor	2026-09-04 11:42:19.355235+08
feffdcce-3225-4af3-9d16-72a7bf164f2f	fd6291f6-2aaa-4093-95d7-e90595f7a908	44365f42-164c-4ea6-9f79-3363a609dd71	reviewer	2026-09-04 11:42:19.759856+08
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, slug, name, org_type, status, created_at) FROM stdin;
e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	demo-village	演示村	village	active	2026-09-04 11:42:16.902254+08
44365f42-164c-4ea6-9f79-3363a609dd71	demo-community	演示社区	community	active	2026-09-04 11:42:17.102038+08
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.positions (id, election_fief_id, name, quota, application_start, application_end, material_review_start, material_review_end, status, created_at) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_key, permission, description) FROM stdin;
platform_admin	org:create	\N
platform_admin	org:manage	\N
platform_admin	role:manage	\N
platform_admin	account:create	\N
platform_admin	account:manage	\N
platform_admin	proposal:edit	\N
platform_admin	proposal:review	\N
platform_admin	material:edit	\N
platform_admin	material:review	\N
platform_admin	candidate:edit	\N
platform_admin	candidate:review	\N
platform_admin	announcement:edit	\N
platform_admin	announcement:review	\N
platform_admin	announcement:publish	\N
platform_admin	data:view	\N
sub_admin	org:create	\N
sub_admin	org:manage	\N
sub_admin	role:manage	\N
sub_admin	account:create	\N
sub_admin	account:manage	\N
sub_admin	proposal:edit	\N
sub_admin	proposal:review	\N
sub_admin	material:edit	\N
sub_admin	material:review	\N
sub_admin	candidate:edit	\N
sub_admin	candidate:review	\N
sub_admin	announcement:edit	\N
sub_admin	announcement:review	\N
sub_admin	announcement:publish	\N
sub_admin	data:view	\N
editor	proposal:edit	\N
editor	material:edit	\N
editor	candidate:edit	\N
editor	announcement:edit	\N
editor	data:view	\N
reviewer	proposal:review	\N
reviewer	material:review	\N
reviewer	candidate:review	\N
reviewer	announcement:review	\N
reviewer	data:view	\N
platform_admin	proposal:create	\N
platform_admin	position:manage	\N
sub_admin	proposal:create	\N
editor	proposal:create	\N
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (key, name, is_staff, is_system, created_at) FROM stdin;
platform_admin	平台超管	t	t	2026-09-04 11:42:08.884358+08
sub_admin	子管理	t	t	2026-09-04 11:42:09.003616+08
editor	经办编辑	t	t	2026-09-04 11:42:09.121592+08
reviewer	审核人	t	t	2026-09-04 11:42:09.238992+08
candidate	参选人	f	t	2026-09-04 11:42:09.355632+08
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, organization_id, token_hash, expires_at, created_at) FROM stdin;
a756046b-4045-439a-98c0-d850e0c75e6f	ace40d07-d887-427e-9171-841c5be79dd9	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	1fef6cf3321b2b0c90ab0569118d9586466b8a2c499c33196f2486e437beef81	2026-09-11 11:45:48.240023+08	2026-09-04 11:45:48.240023+08
dece34e0-0c1c-495b-a501-7d48584b4ed7	eb5446e3-c854-4cf9-b687-75cb9f76de7e	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	fd46f02003d63ebb8510d43fc405771d34bd41d1ce8136729908325e6c31bf3a	2026-09-11 11:45:48.539779+08	2026-09-04 11:45:48.539779+08
9c364b1d-59b5-4a20-90ca-5de92e160bc7	80d49ead-7e61-443d-85c2-00de76b33e9e	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	16f7682e352e8ce7eb0bcd345518ae0a6ef637cd5f426ab4cb038de43d4252e7	2026-09-11 11:45:50.130801+08	2026-09-04 11:45:50.130801+08
3e93d52b-811b-4c18-8370-e3e57e5fd7ef	ace40d07-d887-427e-9171-841c5be79dd9	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	003d3fe4621d7dbdb6827e73b10e61bd0a5026af07ccd000519a622843e4cd38	2026-09-11 12:07:07.135298+08	2026-09-04 12:07:07.135298+08
20d5bcfb-fa4c-49b3-88c9-d1bef7388ded	80d49ead-7e61-443d-85c2-00de76b33e9e	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	3aad90fbf4fbaa2a2ae51433929ec5c2c21e4492704bb345f764d61ec7ca9bcc	2026-09-11 12:07:07.434128+08	2026-09-04 12:07:07.434128+08
f7801bad-2b27-4935-806e-d863dae1377c	5338a51b-e480-4068-89db-a8a922be1518	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	d0ad15c8731ce0aa46753f15cbca0c7806091da3d30f546eb0bd463ef604158d	2026-09-11 12:07:07.733703+08	2026-09-04 12:07:07.733703+08
f2b83d98-ebb9-44cb-a228-1251bfa6c8ab	ca0e588b-4d99-4bb9-bd4e-8e01343ac095	44365f42-164c-4ea6-9f79-3363a609dd71	b535b4aa35cea1858106ddfd6990bd0063d801c2b617a18b0cd0b49bd34de969	2026-09-11 12:07:08.025392+08	2026-09-04 12:07:08.025392+08
6bdd9875-788b-4d06-be2a-10bf8f2caa19	fd6291f6-2aaa-4093-95d7-e90595f7a908	44365f42-164c-4ea6-9f79-3363a609dd71	97f35bd09f73940a76fb37d909d338ae69ea6a0b820d15f30d98faa9d7e78d01	2026-09-11 12:07:08.315126+08	2026-09-04 12:07:08.315126+08
b6a5518a-f0c8-4165-ad3c-da342ea5308e	ace40d07-d887-427e-9171-841c5be79dd9	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	f894907a6e96e8b03c7322bd4c76912bd76ea2a698729ba057ccba5aab5be3f6	2026-09-11 12:07:33.158085+08	2026-09-04 12:07:33.158085+08
ad347f43-db20-4295-b925-13c0c3d31a51	80d49ead-7e61-443d-85c2-00de76b33e9e	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	b8ad077b20372845d118db0151c661f16ace8f1f009fe50bfcfb6a561ad50e94	2026-09-11 12:07:33.45471+08	2026-09-04 12:07:33.45471+08
14510315-670f-4163-a38a-afc11cfc1dde	5338a51b-e480-4068-89db-a8a922be1518	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	de6cbba47e48f7dc0e299987378ebab599ba86e731307077ef68f87fc5b803bb	2026-09-11 12:07:33.746436+08	2026-09-04 12:07:33.746436+08
556ecb00-8652-49ae-b372-f30482fa1bae	ca0e588b-4d99-4bb9-bd4e-8e01343ac095	44365f42-164c-4ea6-9f79-3363a609dd71	5f6f124691684eaab676851be06179ac8f948d810838bbe79d2217a6bb327220	2026-09-11 12:07:34.043265+08	2026-09-04 12:07:34.043265+08
77b857fd-e455-41d3-9c1c-72d9983674b7	fd6291f6-2aaa-4093-95d7-e90595f7a908	44365f42-164c-4ea6-9f79-3363a609dd71	bc8d4bd960dfafa942b82c9b94a121f9097e391c793fc0d027c7ba60e2cf5b54	2026-09-11 12:07:34.330819+08	2026-09-04 12:07:34.330819+08
4d26ccbf-cdd4-4788-8baf-c32452ed6a18	ace40d07-d887-427e-9171-841c5be79dd9	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	96be8ae93a30628dff93894aab92e99b338533b62115a5e5549e405402b5d7d9	2026-09-11 12:08:17.591539+08	2026-09-04 12:08:17.591539+08
ffdb8f73-ace0-4903-96fe-007aa2d839d7	80d49ead-7e61-443d-85c2-00de76b33e9e	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	10404622b37efddd289dc696efca885a5d002d24ec9bd681fedfdd9563c3d38b	2026-09-11 12:08:17.90085+08	2026-09-04 12:08:17.90085+08
86cf33c5-5d1b-4373-80be-4cab8b891ef5	5338a51b-e480-4068-89db-a8a922be1518	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	1a160ab9f96d9ded0b77d6e353bd0be4e46d40818506dcbd596228b353b66e11	2026-09-11 12:08:18.223194+08	2026-09-04 12:08:18.223194+08
e553392b-e0c2-475c-9626-c19456eaf969	ca0e588b-4d99-4bb9-bd4e-8e01343ac095	44365f42-164c-4ea6-9f79-3363a609dd71	2a78068a4f6d2a826404ce2f3b114c324678b8458adc1b5646fe70ccdc5a948e	2026-09-11 12:08:18.532944+08	2026-09-04 12:08:18.532944+08
36a6efcd-425a-450d-9cb7-ef974761ff16	fd6291f6-2aaa-4093-95d7-e90595f7a908	44365f42-164c-4ea6-9f79-3363a609dd71	df0e22a93d924ba8ddc0370df79f97b505df1da71f4878b795d9a0bb0dd33d06	2026-09-11 12:08:18.833893+08	2026-09-04 12:08:18.833893+08
f0dcc616-8fb4-4ccb-a0e2-3937400e7028	ace40d07-d887-427e-9171-841c5be79dd9	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	9fb119810df7872821e85519649fae5ddae794af7b708ed6f83eb04b9dbf9d5e	2026-09-11 12:09:25.040195+08	2026-09-04 12:09:25.040195+08
d3f35ab8-5332-46c2-ab54-4c0457a4637e	80d49ead-7e61-443d-85c2-00de76b33e9e	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	dddcbbfa9f5e26217f0d3c067fd6a11709ded1c08d7cb9c57ed6131fb61d4d75	2026-09-11 12:09:25.325791+08	2026-09-04 12:09:25.325791+08
ab1d1c5d-a76c-43d6-8683-0be7b7ba544e	5338a51b-e480-4068-89db-a8a922be1518	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	7aaed0c2122b2e98e5f74b18063ab585fd306be09da9372691e61990228efc34	2026-09-11 12:09:25.628741+08	2026-09-04 12:09:25.628741+08
056040d0-6452-48d8-b8d4-a486e791804a	ca0e588b-4d99-4bb9-bd4e-8e01343ac095	44365f42-164c-4ea6-9f79-3363a609dd71	8604d0ab7765fabf02b414fb6f21dd91bf1fc8f3a78c9228c05cc1914e5f0692	2026-09-11 12:09:25.94581+08	2026-09-04 12:09:25.94581+08
0bc49464-c90f-4207-9892-6c490bb1fd6a	fd6291f6-2aaa-4093-95d7-e90595f7a908	44365f42-164c-4ea6-9f79-3363a609dd71	9710e355a6c9ddff7d688db4052f1e4217595a5e7ad2922f4ed5f7e540732b64	2026-09-11 12:09:26.272998+08	2026-09-04 12:09:26.272998+08
fc37eeb4-0d6f-4e94-934c-ab270a6eae78	eb5446e3-c854-4cf9-b687-75cb9f76de7e	e1a318cf-dbd7-4f6c-ab2e-3c60d68affae	d483cf94ab3bb0aa5ec89d66a0a9131d0aaeedb5d27e5638801da3214205d2e6	2026-09-11 15:02:58.311778+08	2026-09-04 15:02:58.311778+08
\.


--
-- Data for Name: stage_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stage_templates (id, st_key, st_name, st_day_offset, st_duration_days, st_order, st_description, org_type, source_label, active, created_at, updated_at) FROM stdin;
ede17d29-cfc9-4b15-935e-533ee8e51194	prep	前期筹备	-35	-35	1	\N	village	government-procedure	t	2026-09-04 11:42:05.592177+08	2026-09-04 11:42:05.592177+08
acd6647a-dfeb-4d3a-8eb1-6a322fd53b8a	elect_committee	成立选委会	-34	-34	2	\N	village	government-procedure	t	2026-09-04 11:42:05.715421+08	2026-09-04 11:42:05.715421+08
28d0a5b7-d85c-42aa-992d-dfb119830870	voter_reg	选民登记	-33	-30	3	\N	village	government-procedure	t	2026-09-04 11:42:05.832149+08	2026-09-04 11:42:05.832149+08
42e66569-35ec-431f-811a-8d8f185e88ed	voter_list	公示选民名单	-20	-20	4	\N	village	government-procedure	t	2026-09-04 11:42:05.949686+08	2026-09-04 11:42:05.949686+08
efc7a628-0bba-4c29-845c-08c772009fec	voter_appeal	受理选民申诉	-19	-16	5	\N	village	government-procedure	t	2026-09-04 11:42:06.067149+08	2026-09-04 11:42:06.067149+08
eb1c16a6-18eb-48c3-9230-b6b3165887bf	nominate_start	候选人提名启动	-15	-15	6	\N	village	government-procedure	t	2026-09-04 11:42:06.185086+08	2026-09-04 11:42:06.185086+08
86372537-5ae4-4aba-a236-a0083e0b2b3d	nominate_cont	候选人提名延续	-14	-14	7	\N	village	government-procedure	t	2026-09-04 11:42:06.30356+08	2026-09-04 11:42:06.30356+08
2cdb5e71-4207-469e-b52c-457359d50a56	prelim_shortlist	初步候选人汇总+镇级初审	-13	-13	8	\N	village	government-procedure	t	2026-09-04 11:42:06.421407+08	2026-09-04 11:42:06.421407+08
2f78d7a4-6eb6-4058-adb6-20ce4f295ba6	joint_review	区级11部门联审、党委考察	-12	-7	9	\N	village	government-procedure	t	2026-09-04 11:42:06.539316+08	2026-09-04 11:42:06.539316+08
fa1dd7f5-86dc-4290-911e-f4b5fe62afbf	formal_notice	正式候选人公示	-6	-6	10	\N	village	government-procedure	t	2026-09-04 11:42:06.656474+08	2026-09-04 11:42:06.656474+08
ad9cec98-fb6b-4c79-9d64-86ee9eba93d4	campaign_prep	投票竞选筹备	-5	-1	11	\N	village	government-procedure	t	2026-09-04 11:42:06.773044+08	2026-09-04 11:42:06.773044+08
bbaf68e7-ca84-4757-8632-b4b727d4a0c1	election_day	正式选举	0	0	12	\N	village	government-procedure	t	2026-09-04 11:42:06.890269+08	2026-09-04 11:42:06.890269+08
1618effa-1716-4070-b1ab-f10e911355de	result_filing	结果备案	1	5	13	\N	village	government-procedure	t	2026-09-04 11:42:07.00784+08	2026-09-04 11:42:07.00784+08
4ebb6e9f-a115-4283-b53d-14e967be941b	handover	新旧班子交接	6	10	14	\N	village	government-procedure	t	2026-09-04 11:42:07.12558+08	2026-09-04 11:42:07.12558+08
a4b147ae-6cc0-4bab-9d4e-3b998209e04f	prep	前期筹备	-35	-35	1	\N	community	government-procedure	t	2026-09-04 11:42:07.241977+08	2026-09-04 11:42:07.241977+08
88c45784-f00b-46d3-a411-544d47eb46c0	elect_committee	成立选委会	-34	-34	2	\N	community	government-procedure	t	2026-09-04 11:42:07.358745+08	2026-09-04 11:42:07.358745+08
1be33a99-8336-4935-a3c6-60900b70320e	resident_reg	居民/户代表登记	-33	-29	3	\N	community	government-procedure	t	2026-09-04 11:42:07.475791+08	2026-09-04 11:42:07.475791+08
9e293061-7827-4951-93b8-beccb011966f	resident_list	公示登记名册	-20	-20	4	\N	community	government-procedure	t	2026-09-04 11:42:07.593684+08	2026-09-04 11:42:07.593684+08
dc95a4ad-be8a-41cc-b3a0-89af57d17134	resident_appeal	申诉核查	-19	-16	5	\N	community	government-procedure	t	2026-09-04 11:42:07.71081+08	2026-09-04 11:42:07.71081+08
9ec20b47-7a90-4dd2-a7ae-f5765bde3ac5	nominate_start	候选人提名启动	-15	-15	6	\N	community	government-procedure	t	2026-09-04 11:42:07.827646+08	2026-09-04 11:42:07.827646+08
2d8b7f01-842f-43e4-aa56-2fdef88d80ad	nominate_cont	提名持续收集	-14	-14	7	\N	community	government-procedure	t	2026-09-04 11:42:07.944634+08	2026-09-04 11:42:07.944634+08
c1bbe229-8eb0-4383-810e-fee16fa6ac97	prelim_shortlist	初步候选人汇总+街道初审	-13	-13	8	\N	community	government-procedure	t	2026-09-04 11:42:08.062507+08	2026-09-04 11:42:08.062507+08
600a0a8e-482a-4b46-9070-bd5260c7e877	joint_review	区级多部门联审、党工委考察	-12	-7	9	\N	community	government-procedure	t	2026-09-04 11:42:08.180624+08	2026-09-04 11:42:08.180624+08
8772820f-272a-4c94-8e73-6f0076072755	formal_notice	正式候选人公示	-6	-6	10	\N	community	government-procedure	t	2026-09-04 11:42:08.298014+08	2026-09-04 11:42:08.298014+08
cab7776a-3d89-4cc9-b9a3-505d49fc0bfc	campaign_prep	竞选投票筹备	-5	-1	11	\N	community	government-procedure	t	2026-09-04 11:42:08.414837+08	2026-09-04 11:42:08.414837+08
3d67235b-bfdb-4c31-8ae9-252b4568dcd0	election_day	正式竞选投票	0	0	12	\N	community	government-procedure	t	2026-09-04 11:42:08.532261+08	2026-09-04 11:42:08.532261+08
cb9d6f56-d56b-4473-8ccd-3f26b175b5f8	result_filing	结果备案	1	5	13	\N	community	government-procedure	t	2026-09-04 11:42:08.649385+08	2026-09-04 11:42:08.649385+08
2123f56c-276e-450f-b04f-7aa5ab191c32	handover	新旧班子交接	6	10	14	\N	community	government-procedure	t	2026-09-04 11:42:08.766102+08	2026-09-04 11:42:08.766102+08
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, phone, password_hash, display_name, status, created_at) FROM stdin;
ace40d07-d887-427e-9171-841c5be79dd9	13800000000	scrypt:1323f3e003493866117271c18b21c6d7:c0cc882414af23c2c207cacfe1bcb1f0589fa312499f24211044382cec262321f7d4846dab0c7dbe73ead21463409b98fdebb0731fa118cbec7abdec2aaaf390	平台超管	active	2026-09-04 11:42:17.376578+08
eb5446e3-c854-4cf9-b687-75cb9f76de7e	13800000001	scrypt:1323f3e003493866117271c18b21c6d7:c0cc882414af23c2c207cacfe1bcb1f0589fa312499f24211044382cec262321f7d4846dab0c7dbe73ead21463409b98fdebb0731fa118cbec7abdec2aaaf390	演示村子管理	active	2026-09-04 11:42:17.708492+08
80d49ead-7e61-443d-85c2-00de76b33e9e	13800000002	scrypt:1323f3e003493866117271c18b21c6d7:c0cc882414af23c2c207cacfe1bcb1f0589fa312499f24211044382cec262321f7d4846dab0c7dbe73ead21463409b98fdebb0731fa118cbec7abdec2aaaf390	演示村经办编辑	active	2026-09-04 11:42:18.121052+08
5338a51b-e480-4068-89db-a8a922be1518	13800000003	scrypt:1323f3e003493866117271c18b21c6d7:c0cc882414af23c2c207cacfe1bcb1f0589fa312499f24211044382cec262321f7d4846dab0c7dbe73ead21463409b98fdebb0731fa118cbec7abdec2aaaf390	演示村审核人	active	2026-09-04 11:42:18.467628+08
ca0e588b-4d99-4bb9-bd4e-8e01343ac095	13800000011	scrypt:1323f3e003493866117271c18b21c6d7:c0cc882414af23c2c207cacfe1bcb1f0589fa312499f24211044382cec262321f7d4846dab0c7dbe73ead21463409b98fdebb0731fa118cbec7abdec2aaaf390	演示社区子管理	active	2026-09-04 11:42:18.812523+08
65fb90b6-02c8-4111-b307-1e8dcf8e2cb4	13800000012	scrypt:1323f3e003493866117271c18b21c6d7:c0cc882414af23c2c207cacfe1bcb1f0589fa312499f24211044382cec262321f7d4846dab0c7dbe73ead21463409b98fdebb0731fa118cbec7abdec2aaaf390	演示社区经办编辑	active	2026-09-04 11:42:19.165513+08
fd6291f6-2aaa-4093-95d7-e90595f7a908	13800000013	scrypt:1323f3e003493866117271c18b21c6d7:c0cc882414af23c2c207cacfe1bcb1f0589fa312499f24211044382cec262321f7d4846dab0c7dbe73ead21463409b98fdebb0731fa118cbec7abdec2aaaf390	演示社区审核人	active	2026-09-04 11:42:19.554154+08
\.


--
-- Name: announcement_templates announcement_templates_at_code_at_version_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.announcement_templates
    ADD CONSTRAINT announcement_templates_at_code_at_version_key UNIQUE (at_code, at_version);


--
-- Name: announcement_templates announcement_templates_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.announcement_templates
    ADD CONSTRAINT announcement_templates_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: candidate_reviews candidate_reviews_candidate_id_round_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.candidate_reviews
    ADD CONSTRAINT candidate_reviews_candidate_id_round_key UNIQUE (candidate_id, round);


--
-- Name: candidate_reviews candidate_reviews_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.candidate_reviews
    ADD CONSTRAINT candidate_reviews_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_election_fief_id_user_id_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.candidates
    ADD CONSTRAINT candidates_election_fief_id_user_id_key UNIQUE (election_fief_id, user_id);


--
-- Name: candidates candidates_material_id_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.candidates
    ADD CONSTRAINT candidates_material_id_key UNIQUE (material_id);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: election_fief_stages election_fief_stages_election_fief_id_stage_key_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_fief_stages
    ADD CONSTRAINT election_fief_stages_election_fief_id_stage_key_key UNIQUE (election_fief_id, stage_key);


--
-- Name: election_fief_stages election_fief_stages_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_fief_stages
    ADD CONSTRAINT election_fief_stages_pkey PRIMARY KEY (id);


--
-- Name: election_fiefs election_fiefs_election_term_id_organization_id_unit_id_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_fiefs
    ADD CONSTRAINT election_fiefs_election_term_id_organization_id_unit_id_key UNIQUE (election_term_id, organization_id, unit_id);


--
-- Name: election_fiefs election_fiefs_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_fiefs
    ADD CONSTRAINT election_fiefs_pkey PRIMARY KEY (id);


--
-- Name: election_terms election_terms_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_terms
    ADD CONSTRAINT election_terms_pkey PRIMARY KEY (id);


--
-- Name: election_units election_units_organization_id_name_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_units
    ADD CONSTRAINT election_units_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: election_units election_units_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_units
    ADD CONSTRAINT election_units_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_hash_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.invitations
    ADD CONSTRAINT invitations_token_hash_key UNIQUE (token_hash);


--
-- Name: material_files material_files_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.material_files
    ADD CONSTRAINT material_files_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_user_id_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.memberships
    ADD CONSTRAINT memberships_user_id_key UNIQUE (user_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.sessions
    ADD CONSTRAINT sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: stage_templates stage_templates_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.stage_templates
    ADD CONSTRAINT stage_templates_pkey PRIMARY KEY (id);


--
-- Name: stage_templates stage_templates_st_key_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.stage_templates
    ADD CONSTRAINT stage_templates_st_key_key UNIQUE (st_key);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: invitation invitation_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT invitation_pkey PRIMARY KEY (id);


--
-- Name: jwks jwks_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.jwks
    ADD CONSTRAINT jwks_pkey PRIMARY KEY (id);


--
-- Name: member member_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);


--
-- Name: organization organization_slug_key; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.organization
    ADD CONSTRAINT organization_slug_key UNIQUE (slug);


--
-- Name: project_config project_config_endpoint_id_key; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_endpoint_id_key UNIQUE (endpoint_id);


--
-- Name: project_config project_config_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.project_config
    ADD CONSTRAINT project_config_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: announcement_templates announcement_templates_at_code_at_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcement_templates
    ADD CONSTRAINT announcement_templates_at_code_at_version_key UNIQUE (at_code, at_version);


--
-- Name: announcement_templates announcement_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcement_templates
    ADD CONSTRAINT announcement_templates_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: candidate_reviews candidate_reviews_candidate_id_round_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_reviews
    ADD CONSTRAINT candidate_reviews_candidate_id_round_key UNIQUE (candidate_id, round);


--
-- Name: candidate_reviews candidate_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_reviews
    ADD CONSTRAINT candidate_reviews_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_election_fief_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_election_fief_id_user_id_key UNIQUE (election_fief_id, user_id);


--
-- Name: candidates candidates_material_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_material_id_key UNIQUE (material_id);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: election_fief_stages election_fief_stages_election_fief_id_stage_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_fief_stages
    ADD CONSTRAINT election_fief_stages_election_fief_id_stage_key_key UNIQUE (election_fief_id, stage_key);


--
-- Name: election_fief_stages election_fief_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_fief_stages
    ADD CONSTRAINT election_fief_stages_pkey PRIMARY KEY (id);


--
-- Name: election_fiefs election_fiefs_election_term_id_organization_id_unit_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_fiefs
    ADD CONSTRAINT election_fiefs_election_term_id_organization_id_unit_id_key UNIQUE (election_term_id, organization_id, unit_id);


--
-- Name: election_fiefs election_fiefs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_fiefs
    ADD CONSTRAINT election_fiefs_pkey PRIMARY KEY (id);


--
-- Name: election_proposals election_proposals_organization_id_term_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_proposals
    ADD CONSTRAINT election_proposals_organization_id_term_id_key UNIQUE (organization_id, term_id);


--
-- Name: election_proposals election_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_proposals
    ADD CONSTRAINT election_proposals_pkey PRIMARY KEY (id);


--
-- Name: election_terms election_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_terms
    ADD CONSTRAINT election_terms_pkey PRIMARY KEY (id);


--
-- Name: election_units election_units_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_units
    ADD CONSTRAINT election_units_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: election_units election_units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_units
    ADD CONSTRAINT election_units_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_token_hash_key UNIQUE (token_hash);


--
-- Name: material_files material_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_files
    ADD CONSTRAINT material_files_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_user_id_key UNIQUE (user_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_key, permission);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (key);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: stage_templates stage_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_templates
    ADD CONSTRAINT stage_templates_pkey PRIMARY KEY (id);


--
-- Name: stage_templates stage_templates_st_key_org_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_templates
    ADD CONSTRAINT stage_templates_st_key_org_type_key UNIQUE (st_key, org_type);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: announcements_fief_idx; Type: INDEX; Schema: cxq_new; Owner: postgres
--

CREATE INDEX announcements_fief_idx ON cxq_new.announcements USING btree (election_fief_id);


--
-- Name: announcements_template_idx; Type: INDEX; Schema: cxq_new; Owner: postgres
--

CREATE INDEX announcements_template_idx ON cxq_new.announcements USING btree (template_id);


--
-- Name: candidate_reviews_candidate_idx; Type: INDEX; Schema: cxq_new; Owner: postgres
--

CREATE INDEX candidate_reviews_candidate_idx ON cxq_new.candidate_reviews USING btree (candidate_id);


--
-- Name: election_fief_stages_fief_idx; Type: INDEX; Schema: cxq_new; Owner: postgres
--

CREATE INDEX election_fief_stages_fief_idx ON cxq_new.election_fief_stages USING btree (election_fief_id, stage_order);


--
-- Name: material_files_material_idx; Type: INDEX; Schema: cxq_new; Owner: postgres
--

CREATE INDEX material_files_material_idx ON cxq_new.material_files USING btree (material_id);


--
-- Name: materials_candidate_idx; Type: INDEX; Schema: cxq_new; Owner: postgres
--

CREATE INDEX materials_candidate_idx ON cxq_new.materials USING btree (candidate_user_id);


--
-- Name: materials_fief_idx; Type: INDEX; Schema: cxq_new; Owner: postgres
--

CREATE INDEX materials_fief_idx ON cxq_new.materials USING btree (election_fief_id);


--
-- Name: account_userId_idx; Type: INDEX; Schema: neon_auth; Owner: postgres
--

CREATE INDEX "account_userId_idx" ON neon_auth.account USING btree ("userId");


--
-- Name: invitation_email_idx; Type: INDEX; Schema: neon_auth; Owner: postgres
--

CREATE INDEX invitation_email_idx ON neon_auth.invitation USING btree (email);


--
-- Name: invitation_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: postgres
--

CREATE INDEX "invitation_organizationId_idx" ON neon_auth.invitation USING btree ("organizationId");


--
-- Name: member_organizationId_idx; Type: INDEX; Schema: neon_auth; Owner: postgres
--

CREATE INDEX "member_organizationId_idx" ON neon_auth.member USING btree ("organizationId");


--
-- Name: member_userId_idx; Type: INDEX; Schema: neon_auth; Owner: postgres
--

CREATE INDEX "member_userId_idx" ON neon_auth.member USING btree ("userId");


--
-- Name: organization_slug_uidx; Type: INDEX; Schema: neon_auth; Owner: postgres
--

CREATE UNIQUE INDEX organization_slug_uidx ON neon_auth.organization USING btree (slug);


--
-- Name: session_userId_idx; Type: INDEX; Schema: neon_auth; Owner: postgres
--

CREATE INDEX "session_userId_idx" ON neon_auth.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: neon_auth; Owner: postgres
--

CREATE INDEX verification_identifier_idx ON neon_auth.verification USING btree (identifier);


--
-- Name: announcements_fief_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX announcements_fief_idx ON public.announcements USING btree (election_fief_id);


--
-- Name: announcements_template_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX announcements_template_idx ON public.announcements USING btree (template_id);


--
-- Name: candidate_reviews_candidate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX candidate_reviews_candidate_idx ON public.candidate_reviews USING btree (candidate_id);


--
-- Name: election_fief_stages_fief_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX election_fief_stages_fief_idx ON public.election_fief_stages USING btree (election_fief_id, stage_order);


--
-- Name: material_files_material_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX material_files_material_idx ON public.material_files USING btree (material_id);


--
-- Name: materials_candidate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX materials_candidate_idx ON public.materials USING btree (candidate_user_id);


--
-- Name: materials_fief_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX materials_fief_idx ON public.materials USING btree (election_fief_id);


--
-- Name: positions_fief_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX positions_fief_idx ON public.positions USING btree (election_fief_id);


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES cxq_new.users(id);


--
-- Name: announcements announcements_election_fief_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.announcements
    ADD CONSTRAINT announcements_election_fief_id_fkey FOREIGN KEY (election_fief_id) REFERENCES cxq_new.election_fiefs(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_published_by_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.announcements
    ADD CONSTRAINT announcements_published_by_fkey FOREIGN KEY (published_by) REFERENCES cxq_new.users(id);


--
-- Name: announcements announcements_template_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.announcements
    ADD CONSTRAINT announcements_template_id_fkey FOREIGN KEY (template_id) REFERENCES cxq_new.announcement_templates(id);


--
-- Name: announcements announcements_updated_by_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.announcements
    ADD CONSTRAINT announcements_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES cxq_new.users(id);


--
-- Name: candidate_reviews candidate_reviews_candidate_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.candidate_reviews
    ADD CONSTRAINT candidate_reviews_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES cxq_new.candidates(id) ON DELETE CASCADE;


--
-- Name: candidate_reviews candidate_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.candidate_reviews
    ADD CONSTRAINT candidate_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES cxq_new.users(id);


--
-- Name: candidates candidates_election_fief_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.candidates
    ADD CONSTRAINT candidates_election_fief_id_fkey FOREIGN KEY (election_fief_id) REFERENCES cxq_new.election_fiefs(id) ON DELETE CASCADE;


--
-- Name: candidates candidates_material_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.candidates
    ADD CONSTRAINT candidates_material_id_fkey FOREIGN KEY (material_id) REFERENCES cxq_new.materials(id);


--
-- Name: candidates candidates_user_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.candidates
    ADD CONSTRAINT candidates_user_id_fkey FOREIGN KEY (user_id) REFERENCES cxq_new.users(id) ON DELETE CASCADE;


--
-- Name: election_fief_stages election_fief_stages_election_fief_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_fief_stages
    ADD CONSTRAINT election_fief_stages_election_fief_id_fkey FOREIGN KEY (election_fief_id) REFERENCES cxq_new.election_fiefs(id) ON DELETE CASCADE;


--
-- Name: election_fief_stages election_fief_stages_stage_template_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_fief_stages
    ADD CONSTRAINT election_fief_stages_stage_template_id_fkey FOREIGN KEY (stage_template_id) REFERENCES cxq_new.stage_templates(id);


--
-- Name: election_fiefs election_fiefs_created_by_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_fiefs
    ADD CONSTRAINT election_fiefs_created_by_fkey FOREIGN KEY (created_by) REFERENCES cxq_new.users(id);


--
-- Name: election_fiefs election_fiefs_election_term_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_fiefs
    ADD CONSTRAINT election_fiefs_election_term_id_fkey FOREIGN KEY (election_term_id) REFERENCES cxq_new.election_terms(id);


--
-- Name: election_fiefs election_fiefs_organization_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_fiefs
    ADD CONSTRAINT election_fiefs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES cxq_new.organizations(id);


--
-- Name: election_fiefs election_fiefs_unit_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_fiefs
    ADD CONSTRAINT election_fiefs_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES cxq_new.election_units(id);


--
-- Name: election_units election_units_organization_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.election_units
    ADD CONSTRAINT election_units_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES cxq_new.organizations(id);


--
-- Name: invitations invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.invitations
    ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES cxq_new.users(id);


--
-- Name: invitations invitations_organization_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.invitations
    ADD CONSTRAINT invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES cxq_new.organizations(id);


--
-- Name: material_files material_files_material_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.material_files
    ADD CONSTRAINT material_files_material_id_fkey FOREIGN KEY (material_id) REFERENCES cxq_new.materials(id) ON DELETE CASCADE;


--
-- Name: materials materials_candidate_user_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.materials
    ADD CONSTRAINT materials_candidate_user_id_fkey FOREIGN KEY (candidate_user_id) REFERENCES cxq_new.users(id) ON DELETE CASCADE;


--
-- Name: materials materials_election_fief_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.materials
    ADD CONSTRAINT materials_election_fief_id_fkey FOREIGN KEY (election_fief_id) REFERENCES cxq_new.election_fiefs(id) ON DELETE CASCADE;


--
-- Name: materials materials_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.materials
    ADD CONSTRAINT materials_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES cxq_new.users(id);


--
-- Name: memberships memberships_organization_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.memberships
    ADD CONSTRAINT memberships_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES cxq_new.organizations(id);


--
-- Name: memberships memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.memberships
    ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES cxq_new.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.sessions
    ADD CONSTRAINT sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES cxq_new.organizations(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: cxq_new; Owner: postgres
--

ALTER TABLE ONLY cxq_new.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES cxq_new.users(id) ON DELETE CASCADE;


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_inviterId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: invitation invitation_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.invitation
    ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_organizationId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES neon_auth.organization(id) ON DELETE CASCADE;


--
-- Name: member member_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.member
    ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: neon_auth; Owner: postgres
--

ALTER TABLE ONLY neon_auth.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES neon_auth."user"(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: announcements announcements_election_fief_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_election_fief_id_fkey FOREIGN KEY (election_fief_id) REFERENCES public.election_fiefs(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.users(id);


--
-- Name: announcements announcements_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.announcement_templates(id);


--
-- Name: announcements announcements_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: candidate_reviews candidate_reviews_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_reviews
    ADD CONSTRAINT candidate_reviews_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: candidate_reviews candidate_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_reviews
    ADD CONSTRAINT candidate_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: candidates candidates_election_fief_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_election_fief_id_fkey FOREIGN KEY (election_fief_id) REFERENCES public.election_fiefs(id) ON DELETE CASCADE;


--
-- Name: candidates candidates_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: candidates candidates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: election_fief_stages election_fief_stages_election_fief_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_fief_stages
    ADD CONSTRAINT election_fief_stages_election_fief_id_fkey FOREIGN KEY (election_fief_id) REFERENCES public.election_fiefs(id) ON DELETE CASCADE;


--
-- Name: election_fief_stages election_fief_stages_stage_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_fief_stages
    ADD CONSTRAINT election_fief_stages_stage_template_id_fkey FOREIGN KEY (stage_template_id) REFERENCES public.stage_templates(id);


--
-- Name: election_fiefs election_fiefs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_fiefs
    ADD CONSTRAINT election_fiefs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: election_fiefs election_fiefs_election_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_fiefs
    ADD CONSTRAINT election_fiefs_election_term_id_fkey FOREIGN KEY (election_term_id) REFERENCES public.election_terms(id);


--
-- Name: election_fiefs election_fiefs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_fiefs
    ADD CONSTRAINT election_fiefs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: election_fiefs election_fiefs_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_fiefs
    ADD CONSTRAINT election_fiefs_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.election_units(id);


--
-- Name: election_proposals election_proposals_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_proposals
    ADD CONSTRAINT election_proposals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: election_proposals election_proposals_proposed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_proposals
    ADD CONSTRAINT election_proposals_proposed_by_fkey FOREIGN KEY (proposed_by) REFERENCES public.users(id);


--
-- Name: election_proposals election_proposals_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_proposals
    ADD CONSTRAINT election_proposals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: election_proposals election_proposals_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_proposals
    ADD CONSTRAINT election_proposals_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.election_terms(id);


--
-- Name: election_proposals election_proposals_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_proposals
    ADD CONSTRAINT election_proposals_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.election_units(id);


--
-- Name: election_units election_units_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.election_units
    ADD CONSTRAINT election_units_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: invitations invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: invitations invitations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: material_files material_files_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_files
    ADD CONSTRAINT material_files_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;


--
-- Name: materials materials_candidate_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_candidate_user_id_fkey FOREIGN KEY (candidate_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: materials materials_election_fief_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_election_fief_id_fkey FOREIGN KEY (election_fief_id) REFERENCES public.election_fiefs(id) ON DELETE CASCADE;


--
-- Name: materials materials_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: memberships memberships_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: memberships memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: positions positions_election_fief_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_election_fief_id_fkey FOREIGN KEY (election_fief_id) REFERENCES public.election_fiefs(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_key_fkey FOREIGN KEY (role_key) REFERENCES public.roles(key) ON DELETE CASCADE;


--
-- Name: sessions sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 5iwO3r1l0beeoclAgvb6hTd2LPR9Xy0iaSu3ZmN3zDoYE5Q4oxWn0UGp1pyfqjH

