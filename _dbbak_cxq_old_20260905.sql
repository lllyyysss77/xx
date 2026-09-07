--
-- PostgreSQL database dump
--

\restrict dd5OYHccpby2P8nIF9HAJTL54c7fWLWRhv9UFI3zcmJZ42Ycl3YgrznWpA7yoLK

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

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
    CONSTRAINT invitations_role_check CHECK ((role = ANY (ARRAY['org_admin'::text, 'operator'::text, 'editor'::text, 'reviewer'::text, 'candidate'::text, 'platform_admin'::text])))
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
    CONSTRAINT memberships_role_check CHECK ((role = ANY (ARRAY['platform_admin'::text, 'org_admin'::text, 'operator'::text, 'editor'::text, 'reviewer'::text, 'candidate'::text])))
);


ALTER TABLE public.memberships OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organizations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


ALTER TABLE public.organizations OWNER TO postgres;

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
    source_label text DEFAULT 'government-procedure'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
8a797562-3b6c-4421-a36f-efb4b685ebbd	v2	ep-spring-night-ayr62w92	2026-09-04 04:39:36.429+08	2026-09-04 04:39:36.429+08	[]	[{"id": "google", "isShared": true}]	{"type": "shared"}	{"enabled": true, "disableSignUp": false, "emailVerificationMethod": "otp", "requireEmailVerification": false, "autoSignInAfterVerification": true, "sendVerificationEmailOnSignIn": false, "sendVerificationEmailOnSignUp": false}	t	{"magicLink": {"config": {"expiresIn": 5, "disableSignUp": false}, "enabled": false}, "phoneNumber": {"config": {"otp_expires_in": 300}, "enabled": false}, "organization": {"config": {"creatorRole": "owner", "membershipLimit": 100, "organizationLimit": 10, "sendInvitationEmail": false}, "enabled": true}}	{"enabled": false, "enabledEvents": [], "timeoutSeconds": 5}
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

COPY public.announcement_templates (id, at_code, at_name, at_version, at_content, at_need_remind, at_note, source_label, active, created_at, updated_at) FROM stdin;
cee6556c-8249-4bc3-b7e0-bd4b52fccc17	第10号	关于村民委员会选举投票时间和地点的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于村民委员会选举投票时间和地点的公告（第10号）\n\n经村民选举委员会研究，决定本村村民委员会选举的投票站地点和投票时间如下：\n中心投票站设在__________，投票分站设在__________。\n具体投票时间为____月____日____时至____时。\n流动票箱使用时间为____月____日____时至____时，路线为：____时从__________出发，沿__________开展上门投票。\n开箱计票时间为____月____日____时，地点在__________。\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-3~-2	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
5939994c-865c-466a-89d0-93c4fb179d45	第11号	关于选举工作人员名单的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于选举工作人员名单的公告（第11号）\n\n经村民选举委员会研究决定，本村村民委员会选举的工作人员名单如下：\n唱票员：__________\n计票员：__________\n监票员：__________\n流动票箱工作人员：__________、__________\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-3~-2；候选人亲属回避	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
420f952d-e41c-4ed1-a95e-8bca6c89fb5f	第12号	关于流动票箱投票人员名单的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于流动票箱投票人员名单的公告（第12号）\n\n经本人申请和村民选举委员会研究，确定本村村民委员会选举使用流动票箱投票人员名单如下：\n__________（因：__________）、__________（因：__________）\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	条件型：源数据筛vot_need_ballot_box=是	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
a81199e9-f1aa-4f46-ae05-585d2d610fd8	第13号	关于委托投票名单的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于委托投票名单的公告（第13号）\n\n根据法律法规规定，以下登记参加选举的村民在选举日外出不能回村参加投票，且在规定时限内办理了委托投票手续。经村民选举委员会审核，人员名单如下：\n受委托人：__________ 委托人：__________\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	条件型：源数据筛vot_is_proxy=是	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
beef60d5-659f-46c6-b776-5bc1a26d9ae8	第14号	关于代写人员名单的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于代写人员名单的公告（第14号）\n\n经本人申请和村民选举委员会研究确定，本村村民委员会选举要求代写人员和代写员名单如下：\n要求代写人员：__________ 委托代写员：__________\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	条件型	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
e3d25c27-0b66-4d3e-8f8e-13afcaf1a197	第15号	关于无效票认定规则的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于无效票认定规则的公告（第15号）\n\n经村民选举委员会讨论决定，本村村民委员会选举无效票认定的具体规则如下：\n1. 未填写任何候选人姓名的空白选票；\n2. 所选候选人人数超过法定差额名额的选票；\n3. 涂改、标记特殊符号，导致候选人姓名无法辨认的选票；\n4. 私自撕毁、拆分选票，导致选票不完整的；\n5. 使用非本次选举统一印制选票的；\n6. 选票上填写的候选人姓名与正式候选人名单不符，且无法核实身份的；\n7. 代写人员违规干预选民意愿，擅自填写选票的；\n8. 其他违反选举规定，经选举委员会认定为无效的选票。\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-1	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
9d4d5ffe-c7d5-4cfa-b42a-4df352abca8a	第17-1号	关于村务监督委员会成员选举结果的公告	村委会	______镇(街道)______村第十五届村民选举委员会\n关于村务监督委员会成员选举结果的公告（第17-1号）\n\n根据《中华人民共和国村民委员会组织法》和《福建省实施〈中华人民共和国村民委员会组织法〉办法》的规定，经选举，下列人员当选为本村新一届村务监督委员会主任和委员：\n主 任：__________\n委 员：__________、__________\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	仅村委会可用；type=community_committee时隐藏	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
0cc21cf8-fada-4cc0-bb1b-b55a64b2fbcf	第17号	关于村民委员会选举结果的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于村民委员会选举结果的公告（第17号）\n\n根据法律法规和政策规定，经全体选民直接投票，下列人员当选为本村第十五届村民委员会主任、副主任和委员。现将名单公布如下：\n主 任：__________\n副主任：__________\n委 员：__________、__________、__________\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	结果确认后模板资格点亮；旧16号编号作废	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
40582dde-881d-4e21-b6ff-4838837269a9	第1号	关于确定选举日的公告	通用	______镇(街道)______村(居)民委员会选举指导组\n关于确定选举日的公告（第1号）\n\n经______镇(街道)村(居)民委员会选举指导组研究，并报县(区、管委会)选举指导组同意，本村第十五届村民委员会换届选举工作定于____月____日开始，选举日确定为____月____日。经登记确认具有选民资格的村民，均可参加投票选举。\n望村民互相转告。\n\n特此公告\n\n______镇(街道)______村(居)民委员会选举指导组\n____年____月____日	t	D-34发布；工作开始日=D-35公式值	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
8e92bda3-e024-4b37-bf5e-38400bc25e5b	第2-1号	关于村民选举委员会成员自动辞职和递补的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于村民选举委员会成员自动辞职和递补的公告（第2-1号）\n\n村(居)民选举委员会成员__________于____年____月____日被提名为本届村(居)民委员会成员初步候选人，依法自动辞去村(居)民选举委员会成员职务。依据____月____日村(居)民代表会议确定的补缺办法，按照原推选结果，由得票数多的__________依次递补为村(居)民选举委员会成员。\n辞职委员为选委会主任或副主任时，递补后召开村(居)民选举委员会成员会议，重新推选选委会主任或副主任。\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-13；候选人当选委会成员时触发	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
1064b202-6005-465d-95d2-4aaee908ba8f	第2号	关于村民选举委员会名单的公告	通用	______镇(街道)______村村民委员会\n关于村民选举委员会名单的公告（第2号）\n\n经本村村民推选，产生了组织和主持本村第十五届村民委员会换届选举工作的村民选举委员会。现将名单公布如下：\n主 任：__________\n副主任：__________\n委 员：__________、__________、__________\n\n特此公告\n\n______镇(街道)______村村民委员会\n____年____月____日	t	D-34发布	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
2d4c629e-6927-48d1-ac5d-abe0fd329258	第3号	关于选民登记的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于选民登记的公告（第3号）\n\n经______镇(街道)村民委员会选举指导组研究确定，本届村民委员会选举选民登记时间定为____月____日____时至____月____日____时。凡符合法律法规和政策规定的村民，均可在本村村民选举委员会进行选民登记。经选民登记确认后，方可参加投票选举。望村民互相转告。\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-34发布，D-33~-29持续张贴	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
59222d94-e080-4842-9403-48559c471ccc	第4号	关于选民名单的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于选民名单的公告（第4号）\n\n现将经过登记确认的参加本村第十五届村民委员会选举的选民名单公布如下。如有错漏，请于____月____日____时前向村民选举委员会提出。\n各小组名单附后\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-28发布；5天异议期	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
37aac14d-ac0a-42bf-b38d-91d197100e4b	第5号	关于村民代表和小组长选举的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于村民代表和小组长选举的公告（第5号）\n\n根据法律法规规定，本村村民代表和村民小组长选举日定为____月____日，当日____时开始投票，当日____时截止投票。投票地点设在__________。各小组选民，均应参加投票选举。望村民互相转告。\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-20~-16；居=居民代表和户代表	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
d1a8c554-b354-4779-be6e-29880bfbaf8a	第6-1号	关于村民小组长、副组长名单的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于村民小组长、副组长名单的公告（第6-1号）\n\n经依法推选，下列人员分别当选为各村民小组组长和副组长。现将名单公布如下：\n第一小组：组长__________，副组长__________\n……（各小组依次排列）\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-20~-16；居委会渲染为户代表名单	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
a4036e20-7f5a-4538-9555-254a937e5a27	第6号	关于村民代表名单的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于村民代表名单的公告（第6号）\n\n经依法推选，本村共产生第十五届村民代表____名，其中妇女代表____名。现将名单公布如下：\n各小组名单附后\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-20~-16	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
4be7999e-3d7d-40a6-abcc-c4ef9cc53dc3	第7号	关于村民委员会成员初步候选人提名的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于村民委员会成员初步候选人提名的公告（第7号）\n\n根据法律法规规定，经村民(代表)会议讨论决定，本村新一届村民委员会成员数共____人。其中，主任____人、副主任____人、委员____人、妇女成员____人（单独提名）。\n初步候选人提名时间从____月____日____时至____月____日____时。请有选举权的村民踊跃参加提名。提名表和自荐表请到村民委员会办公室领取。\n联系人：__________ 联系电话：__________\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-15发布；开放组织推荐、个人自荐两类	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
c00a5261-83a0-4fba-a08b-892e095ab40a	第8号	关于村民委员会成员初步候选人名单的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于村民委员会成员初步候选人名单的公告（第8号）\n\n由村党组织或者登记参加选举的村民提名推荐，产生本村第十五届村民委员会成员初步候选人。如有错漏，请于____月____日____时前向村民选举委员会提出。现将名单按姓氏笔画顺序公布如下：\n主任候选人：__________、__________\n副主任候选人：__________、__________\n委员候选人：__________、__________、__________\n妇女成员候选人：__________\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-13；r2镇级初审通过后	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
ddb6971e-093b-4648-8e64-70cbc886b4e4	第9号	关于村民委员会成员正式候选人名单的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于村民委员会成员正式候选人名单的公告（第9号）\n\n经依法提名并通过镇(街道)、县(区、管委会)资格审查，产生本村第十五届村民委员会成员正式候选人。现将名单公布如下：\n主任候选人：__________、__________\n副主任候选人：__________、__________\n委员候选人：__________、__________、__________\n妇女成员候选人：__________\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	t	D-4；四轮全过后模板资格才点亮	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
3ee9892a-c9d2-442e-afb8-fa115bfe756b	补充公告	关于选民名单更正的补充公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于选民名单更正的补充公告\n\n针对4号公示异议核查结果，更正部分选民资格，更新有效名册如下：\n新增选民：__________\n取消选民资格：__________\n更正信息：__________\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	f	申诉期(D-23~-21)产生	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
90e8880f-9238-4ce2-828b-2d94695998a7	预选办法	关于村民委员会成员正式候选人预选办法的公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于村民委员会成员正式候选人预选办法的公告\n\n根据《福建省村民委员会选举办法》规定，村民委员会成员正式候选人的确定采取预选的方式产生，具体办法如下：\n1、采取召开村民代表会议，以无记名投票的方式进行预选，预选大会由村民选举委员会主持。预选时间为____年____月____日____时，地点设在__________。\n2、三分之二以上的村民代表会议组成人员参加投票，预选有效。\n3、按照应选名额的差额数，以得票数多少顺序确定正式候选人。\n4、本届村民委员会应选主任____名，副主任____名、委员____名，其中妇女成员____名（专职专选职位）。\n5、经提名主任____名、副主任____名、委员____名，其中__________职位初步候选人人数超过应选名额的差额数，需进行预选；__________职位提名人数未超差额，直接列为正式候选人。\n6、参加预选的选民领到选票后，单独进入秘密写票间写票，等额写票，多选无效，另选他人无效。写票后依次到投票箱投票。\n7、投票结束后，当场开箱计票。在唱票员和两名监票员的监督下，认真核对并计算选票。计票结束后，当场宣布预选结果。\n8、遇到得票相等而不能确定正式候选人时，应进行重新投票。\n9、主持人宣布预选结果。\n\n特此公告。\n\n莆田市城厢区______镇(街道)______村村民选举委员会\n____年____月____日	t	D-12~-10；含第9条主持人口播+莆田市城厢区前缀	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
f83b6658-ba05-4abb-b831-52f6da143245	预选结果	关于村民委员会成员正式候选人预选结果公告	通用	______镇(街道)______村第十五届村民选举委员会\n关于村民委员会成员正式候选人预选结果公告\n\n经召开村民代表会议预选，__________职位初步候选人预选结果公布如下：\n主 任候选人：__________\n副主任候选人：__________\n委员候选人：__________\n妇女专职专选职位：__________\n\n按照应选名额差额数，以得票多少顺序，确定__________为正式候选人。\n\n特此公告。\n\n莆田市城厢区______镇(街道)______村村民选举委员会\n____年____月____日	t	D-12~-10	government-document	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.announcements (id, election_fief_id, title, body, status, created_by, updated_by, published_by, published_at, created_at, updated_at, template_id) FROM stdin;
ca18656a-d197-422d-a0f9-6eb2a373c273	e5a88874-ca0a-40b2-b3f0-4a9584796294	验收公告	公告正文	published	af34ab13-71c8-4f31-a715-a1d0a224a8bb	af34ab13-71c8-4f31-a715-a1d0a224a8bb	af34ab13-71c8-4f31-a715-a1d0a224a8bb	2026-09-04 04:50:51.147351+08	2026-09-04 04:50:50.374002+08	2026-09-04 04:50:51.147351+08	\N
307981f4-22e0-403e-aacf-ff0d161d1a95	5bc42e8a-1c03-47d0-9d5d-95b27085291e	关于村民委员会选举投票时间和地点的公告	______镇(街道)______村第十五届村民选举委员会\n关于村民委员会选举投票时间和地点的公告（第10号）\n\n经村民选举委员会研究，决定本村村民委员会选举的投票站地点和投票时间如下：\n中心投票站设在__________，投票分站设在__________。\n具体投票时间为____月____日____时至____时。\n流动票箱使用时间为____月____日____时至____时，路线为：____时从__________出发，沿__________开展上门投票。\n开箱计票时间为____月____日____时，地点在__________。\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	draft	ff95c277-cc12-4e47-8ed8-db7c11ac7103	ff95c277-cc12-4e47-8ed8-db7c11ac7103	\N	\N	2026-09-04 05:45:34.153105+08	2026-09-04 05:45:34.153105+08	cee6556c-8249-4bc3-b7e0-bd4b52fccc17
b517d830-32dc-410a-af75-8612b601dae4	85b28d21-826c-4e36-a258-99b88a45da3f	关于村民委员会选举投票时间和地点的公告	______镇(街道)______村第十五届村民选举委员会\n关于村民委员会选举投票时间和地点的公告（第10号）\n\n经村民选举委员会研究，决定本村村民委员会选举的投票站地点和投票时间如下：\n中心投票站设在__________，投票分站设在__________。\n具体投票时间为____月____日____时至____时。\n流动票箱使用时间为____月____日____时至____时，路线为：____时从__________出发，沿__________开展上门投票。\n开箱计票时间为____月____日____时，地点在__________。\n\n特此公告\n\n______镇(街道)______村第十五届村民选举委员会\n____年____月____日	draft	ff95c277-cc12-4e47-8ed8-db7c11ac7103	ff95c277-cc12-4e47-8ed8-db7c11ac7103	\N	\N	2026-09-04 06:01:44.321165+08	2026-09-04 06:01:44.321165+08	cee6556c-8249-4bc3-b7e0-bd4b52fccc17
\.


--
-- Data for Name: candidate_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidate_reviews (id, candidate_id, round, reviewer_id, decision, note, created_at) FROM stdin;
f6c53bd9-e328-402c-8985-efb2e8880e9a	837800b2-5aba-49cf-8e6a-cd1732fc3ccb	R1	af34ab13-71c8-4f31-a715-a1d0a224a8bb	approved	\N	2026-09-04 04:50:46.260271+08
5f4a9bde-0f10-4eb6-ac84-a38090506812	837800b2-5aba-49cf-8e6a-cd1732fc3ccb	R2	af34ab13-71c8-4f31-a715-a1d0a224a8bb	approved	\N	2026-09-04 04:50:47.294145+08
a2dcceec-a634-4f21-9abc-b8783df65f97	837800b2-5aba-49cf-8e6a-cd1732fc3ccb	R3	af34ab13-71c8-4f31-a715-a1d0a224a8bb	approved	\N	2026-09-04 04:50:48.321526+08
77546fd0-b5b3-4e8f-9997-c82c10867f69	837800b2-5aba-49cf-8e6a-cd1732fc3ccb	R4	af34ab13-71c8-4f31-a715-a1d0a224a8bb	approved	\N	2026-09-04 04:50:49.347709+08
\.


--
-- Data for Name: candidates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.candidates (id, election_fief_id, user_id, material_id, status, current_round, created_at) FROM stdin;
837800b2-5aba-49cf-8e6a-cd1732fc3ccb	e5a88874-ca0a-40b2-b3f0-4a9584796294	a767c239-06a5-4209-ad65-98d4379cb4dc	4e91fd1e-d661-49f5-a854-61edd97708df	approved	complete	2026-09-04 04:50:44.70845+08
\.


--
-- Data for Name: election_fief_stages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.election_fief_stages (id, election_fief_id, stage_template_id, stage_key, stage_name, start_date, end_date, stage_order, status, created_at) FROM stdin;
1132d4d6-434b-47f8-8ecb-673d78460a8f	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	7a68b72b-75ca-47b1-8dde-b77a1a34afc3	D-35	前期筹备	2030-12-11	2030-12-11	-35	not_started	2026-09-04 05:41:25.409359+08
511fbd4d-60c3-4e9e-a5ef-67559517be27	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	eaa0cf86-de04-46cc-bb09-4036e61597f5	D-34	成立选委会	2030-12-12	2030-12-12	-34	not_started	2026-09-04 05:41:25.409359+08
ad5fa397-7213-4ee8-9eff-a00417871777	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	cb8f7188-e762-43c3-a289-127c993d6aa7	D-33~-29	选民登记	2030-12-13	2030-12-17	-33	not_started	2026-09-04 05:41:25.409359+08
6327014b-8ef5-4d96-90e9-9945d08caab9	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	6f707564-0b2e-4c16-8fdb-1b37eb9be631	D-28~-24	公示选民名单	2030-12-18	2030-12-22	-28	not_started	2026-09-04 05:41:25.409359+08
f2d669a3-6000-4429-86a0-8fc290c70110	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	64a800dd-5dd1-43f2-b56d-7fd91e304a7d	D-23~-21	受理选民申诉	2030-12-23	2030-12-25	-23	not_started	2026-09-04 05:41:25.409359+08
84f5a022-2556-481b-9633-aa07ebb833ac	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	961dab9a-fa12-4584-a873-4b6d2e0d8181	D-20~-16	代表选举	2030-12-26	2030-12-30	-20	not_started	2026-09-04 05:41:25.409359+08
258097f0-9e1b-4a0a-8598-64bdef1cdf7f	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	3944c14b-c0dd-4fd4-a70b-a29992422132	D-15	候选人提名启动	2030-12-31	2030-12-31	-15	not_started	2026-09-04 05:41:25.409359+08
ed88202f-79da-457e-adeb-1bd4e35c9a57	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	37774a4b-fa77-476f-a4bf-a3fc937ec2b7	D-14	候选人提名延续	2031-01-01	2031-01-01	-14	not_started	2026-09-04 05:41:25.409359+08
53f6f4f4-941e-4c37-933e-cde798efa073	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	453dec21-810e-44ce-bd7a-4ea2e164f956	D-13	初步候选人汇总+镇级初审	2031-01-02	2031-01-02	-13	not_started	2026-09-04 05:41:25.409359+08
b0322471-03d3-49df-a164-32d7eca6bee7	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	987fb95e-357a-4fdd-a79d-d8739f36b71c	D-12~-10	竞选预选	2031-01-03	2031-01-05	-12	not_started	2026-09-04 05:41:25.409359+08
cd5eb7fb-c266-4b94-b9bb-64579ad17aaa	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	063e2fe3-9c68-4039-becc-a87870a4a756	D-9~-5	区级11部门联审、党委考察	2031-01-06	2031-01-10	-9	not_started	2026-09-04 05:41:25.409359+08
1394f4f4-b938-4ba4-a809-5a5944d7c316	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	dabec3ae-6b74-4977-aa89-0b107acc2de3	D-4	正式候选人公示	2031-01-11	2031-01-11	-4	not_started	2026-09-04 05:41:25.409359+08
57ffa8a8-70ba-4cee-aa9a-7e4b681d4e23	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	8b7624aa-7f78-4a48-a3f0-8e16fdd455d6	D-3~-2	投票竞选筹备	2031-01-12	2031-01-13	-3	not_started	2026-09-04 05:41:25.409359+08
a94470b0-6f4a-4bba-9dc2-449d5fd95976	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	b26cee83-6798-443c-8a6e-b0a17f5677ae	D-1	投票竞选筹备	2031-01-14	2031-01-14	-1	not_started	2026-09-04 05:41:25.409359+08
46c0944a-601c-4e7e-8c35-95b3f93a6796	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	46130a97-572a-4ea9-9336-2c42082b5715	D0	正式投票选举	2031-01-15	2031-01-15	0	not_started	2026-09-04 05:41:25.409359+08
85059d80-5e49-4074-927e-a499e3db127b	99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	6c1729eb-a848-498c-a3b6-314f0f1b8943	D+1~+10	结果备案、新旧班子交接	2031-01-16	2031-01-25	1	not_started	2026-09-04 05:41:25.409359+08
f8699b3c-a64b-4675-a451-3efb51369037	5bc42e8a-1c03-47d0-9d5d-95b27085291e	7a68b72b-75ca-47b1-8dde-b77a1a34afc3	D-35	前期筹备	2030-12-11	2030-12-11	-35	not_started	2026-09-04 05:45:27.493299+08
73dea288-7598-44a3-b5a6-8356b212d653	5bc42e8a-1c03-47d0-9d5d-95b27085291e	eaa0cf86-de04-46cc-bb09-4036e61597f5	D-34	成立选委会	2030-12-12	2030-12-12	-34	not_started	2026-09-04 05:45:27.493299+08
f854c562-c07e-4a47-8690-924c1c739abd	5bc42e8a-1c03-47d0-9d5d-95b27085291e	cb8f7188-e762-43c3-a289-127c993d6aa7	D-33~-29	选民登记	2030-12-13	2030-12-17	-33	not_started	2026-09-04 05:45:27.493299+08
5ecc6202-161d-4750-a809-d5b0744fada1	5bc42e8a-1c03-47d0-9d5d-95b27085291e	6f707564-0b2e-4c16-8fdb-1b37eb9be631	D-28~-24	公示选民名单	2030-12-18	2030-12-22	-28	not_started	2026-09-04 05:45:27.493299+08
9557d5d0-0275-4a73-a6b8-77bee4c9f738	5bc42e8a-1c03-47d0-9d5d-95b27085291e	64a800dd-5dd1-43f2-b56d-7fd91e304a7d	D-23~-21	受理选民申诉	2030-12-23	2030-12-25	-23	not_started	2026-09-04 05:45:27.493299+08
e4f55e79-5407-4016-aefe-95965904c092	5bc42e8a-1c03-47d0-9d5d-95b27085291e	961dab9a-fa12-4584-a873-4b6d2e0d8181	D-20~-16	代表选举	2030-12-26	2030-12-30	-20	not_started	2026-09-04 05:45:27.493299+08
236b1e45-9f3c-45a5-844a-c9c243749c06	5bc42e8a-1c03-47d0-9d5d-95b27085291e	3944c14b-c0dd-4fd4-a70b-a29992422132	D-15	候选人提名启动	2030-12-31	2030-12-31	-15	not_started	2026-09-04 05:45:27.493299+08
f788f973-2b3a-4502-bb90-8000ab81f75d	5bc42e8a-1c03-47d0-9d5d-95b27085291e	37774a4b-fa77-476f-a4bf-a3fc937ec2b7	D-14	候选人提名延续	2031-01-01	2031-01-01	-14	not_started	2026-09-04 05:45:27.493299+08
7083fdd0-0a99-4482-a42c-081920d097ca	5bc42e8a-1c03-47d0-9d5d-95b27085291e	453dec21-810e-44ce-bd7a-4ea2e164f956	D-13	初步候选人汇总+镇级初审	2031-01-02	2031-01-02	-13	not_started	2026-09-04 05:45:27.493299+08
e185e96c-fb90-412d-b4e2-cfde801ae52f	5bc42e8a-1c03-47d0-9d5d-95b27085291e	987fb95e-357a-4fdd-a79d-d8739f36b71c	D-12~-10	竞选预选	2031-01-03	2031-01-05	-12	not_started	2026-09-04 05:45:27.493299+08
8a65259c-b4ee-42cc-b6c5-a574ebd73ff6	5bc42e8a-1c03-47d0-9d5d-95b27085291e	063e2fe3-9c68-4039-becc-a87870a4a756	D-9~-5	区级11部门联审、党委考察	2031-01-06	2031-01-10	-9	not_started	2026-09-04 05:45:27.493299+08
ced2f12f-ce69-4273-8b35-09afb5c85583	5bc42e8a-1c03-47d0-9d5d-95b27085291e	dabec3ae-6b74-4977-aa89-0b107acc2de3	D-4	正式候选人公示	2031-01-11	2031-01-11	-4	not_started	2026-09-04 05:45:27.493299+08
40db34d1-ccd4-4cfc-b60d-efd021b9e22a	5bc42e8a-1c03-47d0-9d5d-95b27085291e	8b7624aa-7f78-4a48-a3f0-8e16fdd455d6	D-3~-2	投票竞选筹备	2031-01-12	2031-01-13	-3	not_started	2026-09-04 05:45:27.493299+08
443c09c7-4d0b-4c3f-8cd2-686454652fb0	5bc42e8a-1c03-47d0-9d5d-95b27085291e	b26cee83-6798-443c-8a6e-b0a17f5677ae	D-1	投票竞选筹备	2031-01-14	2031-01-14	-1	not_started	2026-09-04 05:45:27.493299+08
3e332f21-6bde-41fd-b71a-9f3347118920	5bc42e8a-1c03-47d0-9d5d-95b27085291e	46130a97-572a-4ea9-9336-2c42082b5715	D0	正式投票选举	2031-01-15	2031-01-15	0	not_started	2026-09-04 05:45:27.493299+08
febe2d4b-a086-4e02-b392-dcb20f56c418	5bc42e8a-1c03-47d0-9d5d-95b27085291e	6c1729eb-a848-498c-a3b6-314f0f1b8943	D+1~+10	结果备案、新旧班子交接	2031-01-16	2031-01-25	1	not_started	2026-09-04 05:45:27.493299+08
156711d6-9c11-4f46-b7b8-d9e1530d79e0	85b28d21-826c-4e36-a258-99b88a45da3f	7a68b72b-75ca-47b1-8dde-b77a1a34afc3	D-35	前期筹备	2031-12-30	2031-12-30	-35	not_started	2026-09-04 06:01:37.494007+08
bce5bd8c-0102-4ccb-9cd1-a173700360a4	85b28d21-826c-4e36-a258-99b88a45da3f	eaa0cf86-de04-46cc-bb09-4036e61597f5	D-34	成立选委会	2031-12-31	2031-12-31	-34	not_started	2026-09-04 06:01:37.494007+08
c9e533f5-d255-4e07-860d-b36e787a70a1	85b28d21-826c-4e36-a258-99b88a45da3f	cb8f7188-e762-43c3-a289-127c993d6aa7	D-33~-29	选民登记	2032-01-01	2032-01-05	-33	not_started	2026-09-04 06:01:37.494007+08
e731a2d2-abc6-442d-8b65-d6514369ba27	85b28d21-826c-4e36-a258-99b88a45da3f	6f707564-0b2e-4c16-8fdb-1b37eb9be631	D-28~-24	公示选民名单	2032-01-06	2032-01-10	-28	not_started	2026-09-04 06:01:37.494007+08
2ef689f7-8652-4b85-9fc3-3d61c186068b	85b28d21-826c-4e36-a258-99b88a45da3f	64a800dd-5dd1-43f2-b56d-7fd91e304a7d	D-23~-21	受理选民申诉	2032-01-11	2032-01-13	-23	not_started	2026-09-04 06:01:37.494007+08
4be93cde-1aeb-4ca4-aa9d-71c05cb29fa1	85b28d21-826c-4e36-a258-99b88a45da3f	961dab9a-fa12-4584-a873-4b6d2e0d8181	D-20~-16	代表选举	2032-01-14	2032-01-18	-20	not_started	2026-09-04 06:01:37.494007+08
8f74bbef-1151-4920-85e4-cff54f710bc7	85b28d21-826c-4e36-a258-99b88a45da3f	3944c14b-c0dd-4fd4-a70b-a29992422132	D-15	候选人提名启动	2032-01-19	2032-01-19	-15	not_started	2026-09-04 06:01:37.494007+08
9143945d-27f0-45f6-a9b8-a745595d03da	85b28d21-826c-4e36-a258-99b88a45da3f	37774a4b-fa77-476f-a4bf-a3fc937ec2b7	D-14	候选人提名延续	2032-01-20	2032-01-20	-14	not_started	2026-09-04 06:01:37.494007+08
cbcf5c1c-032f-4352-a892-75e604bb686a	85b28d21-826c-4e36-a258-99b88a45da3f	453dec21-810e-44ce-bd7a-4ea2e164f956	D-13	初步候选人汇总+镇级初审	2032-01-21	2032-01-21	-13	not_started	2026-09-04 06:01:37.494007+08
3ced5b1f-1779-49ef-8988-05a623656c77	85b28d21-826c-4e36-a258-99b88a45da3f	987fb95e-357a-4fdd-a79d-d8739f36b71c	D-12~-10	竞选预选	2032-01-22	2032-01-24	-12	not_started	2026-09-04 06:01:37.494007+08
9813d308-0723-4dd7-8b7a-94fe484e8d53	85b28d21-826c-4e36-a258-99b88a45da3f	063e2fe3-9c68-4039-becc-a87870a4a756	D-9~-5	区级11部门联审、党委考察	2032-01-25	2032-01-29	-9	not_started	2026-09-04 06:01:37.494007+08
da2d84ab-3980-4237-99f9-f793e8cafa88	85b28d21-826c-4e36-a258-99b88a45da3f	dabec3ae-6b74-4977-aa89-0b107acc2de3	D-4	正式候选人公示	2032-01-30	2032-01-30	-4	not_started	2026-09-04 06:01:37.494007+08
5221f3ad-aa69-4307-b339-16296549c9e7	85b28d21-826c-4e36-a258-99b88a45da3f	8b7624aa-7f78-4a48-a3f0-8e16fdd455d6	D-3~-2	投票竞选筹备	2032-01-31	2032-02-01	-3	not_started	2026-09-04 06:01:37.494007+08
9867e7ac-a211-4947-a3f6-6b011fe5a56d	85b28d21-826c-4e36-a258-99b88a45da3f	b26cee83-6798-443c-8a6e-b0a17f5677ae	D-1	投票竞选筹备	2032-02-02	2032-02-02	-1	not_started	2026-09-04 06:01:37.494007+08
dc7d3bc1-292d-4d19-bc2f-18b52aae502a	85b28d21-826c-4e36-a258-99b88a45da3f	46130a97-572a-4ea9-9336-2c42082b5715	D0	正式投票选举	2032-02-03	2032-02-03	0	not_started	2026-09-04 06:01:37.494007+08
af1031fc-e69f-41d1-94ec-78138009a815	85b28d21-826c-4e36-a258-99b88a45da3f	6c1729eb-a848-498c-a3b6-314f0f1b8943	D+1~+10	结果备案、新旧班子交接	2032-02-04	2032-02-13	1	not_started	2026-09-04 06:01:37.494007+08
47418828-a92e-456d-adfd-84935a76c035	d26c709e-9dca-4939-b4ef-c49a5c440499	7a68b72b-75ca-47b1-8dde-b77a1a34afc3	D-35	前期筹备	2026-11-15	2026-11-15	-35	not_started	2026-09-04 06:43:17.483614+08
8e1ffe69-0b40-4fe4-9c7f-33cc0940af0b	d26c709e-9dca-4939-b4ef-c49a5c440499	eaa0cf86-de04-46cc-bb09-4036e61597f5	D-34	成立选委会	2026-11-16	2026-11-16	-34	not_started	2026-09-04 06:43:17.483614+08
4c1f0084-9b96-4a12-8ef7-8acd7ec65ed8	d26c709e-9dca-4939-b4ef-c49a5c440499	cb8f7188-e762-43c3-a289-127c993d6aa7	D-33~-29	选民登记	2026-11-17	2026-11-21	-33	not_started	2026-09-04 06:43:17.483614+08
3f26b5fa-4d81-4bd6-937a-6f27837c993d	d26c709e-9dca-4939-b4ef-c49a5c440499	6f707564-0b2e-4c16-8fdb-1b37eb9be631	D-28~-24	公示选民名单	2026-11-22	2026-11-26	-28	not_started	2026-09-04 06:43:17.483614+08
16b9a861-b92c-4e60-be88-31016f7a793f	d26c709e-9dca-4939-b4ef-c49a5c440499	64a800dd-5dd1-43f2-b56d-7fd91e304a7d	D-23~-21	受理选民申诉	2026-11-27	2026-11-29	-23	not_started	2026-09-04 06:43:17.483614+08
59f2cd32-be7b-48bd-9e10-bb51563bbd9e	d26c709e-9dca-4939-b4ef-c49a5c440499	961dab9a-fa12-4584-a873-4b6d2e0d8181	D-20~-16	代表选举	2026-11-30	2026-12-04	-20	not_started	2026-09-04 06:43:17.483614+08
ee8380be-ca87-4fd3-8d7b-fb09c6eadf47	d26c709e-9dca-4939-b4ef-c49a5c440499	3944c14b-c0dd-4fd4-a70b-a29992422132	D-15	候选人提名启动	2026-12-05	2026-12-05	-15	not_started	2026-09-04 06:43:17.483614+08
44141c72-1687-4252-9f0c-1577101c1199	d26c709e-9dca-4939-b4ef-c49a5c440499	37774a4b-fa77-476f-a4bf-a3fc937ec2b7	D-14	候选人提名延续	2026-12-06	2026-12-06	-14	not_started	2026-09-04 06:43:17.483614+08
541892a2-70ab-41b4-b18d-41784481a205	d26c709e-9dca-4939-b4ef-c49a5c440499	453dec21-810e-44ce-bd7a-4ea2e164f956	D-13	初步候选人汇总+镇级初审	2026-12-07	2026-12-07	-13	not_started	2026-09-04 06:43:17.483614+08
fa890830-60de-4a23-bcbf-8010b58d3280	d26c709e-9dca-4939-b4ef-c49a5c440499	987fb95e-357a-4fdd-a79d-d8739f36b71c	D-12~-10	竞选预选	2026-12-08	2026-12-10	-12	not_started	2026-09-04 06:43:17.483614+08
5d6c5801-6409-496e-aa19-8e30eea1ccd6	d26c709e-9dca-4939-b4ef-c49a5c440499	063e2fe3-9c68-4039-becc-a87870a4a756	D-9~-5	区级11部门联审、党委考察	2026-12-11	2026-12-15	-9	not_started	2026-09-04 06:43:17.483614+08
0d87cf57-eecb-4aa2-ad10-fc423d067762	d26c709e-9dca-4939-b4ef-c49a5c440499	dabec3ae-6b74-4977-aa89-0b107acc2de3	D-4	正式候选人公示	2026-12-16	2026-12-16	-4	not_started	2026-09-04 06:43:17.483614+08
a99a021e-08e4-4243-b15a-f8b45896da4c	d26c709e-9dca-4939-b4ef-c49a5c440499	8b7624aa-7f78-4a48-a3f0-8e16fdd455d6	D-3~-2	投票竞选筹备	2026-12-17	2026-12-18	-3	not_started	2026-09-04 06:43:17.483614+08
474bdac7-26eb-4aa0-9669-26fc8b925593	d26c709e-9dca-4939-b4ef-c49a5c440499	b26cee83-6798-443c-8a6e-b0a17f5677ae	D-1	投票竞选筹备	2026-12-19	2026-12-19	-1	not_started	2026-09-04 06:43:17.483614+08
ebc86585-311d-4288-bc6a-e0fbba0a8871	d26c709e-9dca-4939-b4ef-c49a5c440499	46130a97-572a-4ea9-9336-2c42082b5715	D0	正式投票选举	2026-12-20	2026-12-20	0	not_started	2026-09-04 06:43:17.483614+08
0b28d98a-4b33-4d9b-ab7b-f98e0675c3e9	d26c709e-9dca-4939-b4ef-c49a5c440499	6c1729eb-a848-498c-a3b6-314f0f1b8943	D+1~+10	结果备案、新旧班子交接	2026-12-21	2026-12-30	1	not_started	2026-09-04 06:43:17.483614+08
7ce08706-e4bf-49ee-86ee-c45a1eeb8dc5	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	7a68b72b-75ca-47b1-8dde-b77a1a34afc3	D-35	前期筹备	2026-11-15	2026-11-15	-35	not_started	2026-09-04 06:43:17.483614+08
c8033a05-184d-42a3-b670-d1eafa28b82c	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	eaa0cf86-de04-46cc-bb09-4036e61597f5	D-34	成立选委会	2026-11-16	2026-11-16	-34	not_started	2026-09-04 06:43:17.483614+08
b29c881c-5e7d-400a-b795-e599742081c9	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	cb8f7188-e762-43c3-a289-127c993d6aa7	D-33~-29	选民登记	2026-11-17	2026-11-21	-33	not_started	2026-09-04 06:43:17.483614+08
050da8cc-f5f4-44c5-ba9e-1c7bebe3c9b0	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	6f707564-0b2e-4c16-8fdb-1b37eb9be631	D-28~-24	公示选民名单	2026-11-22	2026-11-26	-28	not_started	2026-09-04 06:43:17.483614+08
1d13c556-3f05-4740-9fab-5199fcdf0acc	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	64a800dd-5dd1-43f2-b56d-7fd91e304a7d	D-23~-21	受理选民申诉	2026-11-27	2026-11-29	-23	not_started	2026-09-04 06:43:17.483614+08
b43474ca-7358-430a-ac79-1894e281dd01	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	961dab9a-fa12-4584-a873-4b6d2e0d8181	D-20~-16	代表选举	2026-11-30	2026-12-04	-20	not_started	2026-09-04 06:43:17.483614+08
f40040e9-3474-4c64-922c-1f8d56d2e802	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	3944c14b-c0dd-4fd4-a70b-a29992422132	D-15	候选人提名启动	2026-12-05	2026-12-05	-15	not_started	2026-09-04 06:43:17.483614+08
b44596dc-4b75-43f4-a840-ada6850f4634	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	37774a4b-fa77-476f-a4bf-a3fc937ec2b7	D-14	候选人提名延续	2026-12-06	2026-12-06	-14	not_started	2026-09-04 06:43:17.483614+08
538c573a-ffae-4fc4-96d6-e08bfd7c5238	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	453dec21-810e-44ce-bd7a-4ea2e164f956	D-13	初步候选人汇总+镇级初审	2026-12-07	2026-12-07	-13	not_started	2026-09-04 06:43:17.483614+08
cad4474d-eacb-4c56-bf89-065cca9d5f2c	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	987fb95e-357a-4fdd-a79d-d8739f36b71c	D-12~-10	竞选预选	2026-12-08	2026-12-10	-12	not_started	2026-09-04 06:43:17.483614+08
acd5eb2a-fdb0-4815-8250-237c71840a0a	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	063e2fe3-9c68-4039-becc-a87870a4a756	D-9~-5	区级11部门联审、党委考察	2026-12-11	2026-12-15	-9	not_started	2026-09-04 06:43:17.483614+08
05e2f37d-2009-4fc8-a5e4-f94f7c60791f	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	dabec3ae-6b74-4977-aa89-0b107acc2de3	D-4	正式候选人公示	2026-12-16	2026-12-16	-4	not_started	2026-09-04 06:43:17.483614+08
6a468668-dd46-4d54-ba30-97708ba60811	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	8b7624aa-7f78-4a48-a3f0-8e16fdd455d6	D-3~-2	投票竞选筹备	2026-12-17	2026-12-18	-3	not_started	2026-09-04 06:43:17.483614+08
6d1d344f-513f-4d51-a8f2-d56d381de73b	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	b26cee83-6798-443c-8a6e-b0a17f5677ae	D-1	投票竞选筹备	2026-12-19	2026-12-19	-1	not_started	2026-09-04 06:43:17.483614+08
e81d70d3-290e-4334-9ed1-f3e837c9641d	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	46130a97-572a-4ea9-9336-2c42082b5715	D0	正式投票选举	2026-12-20	2026-12-20	0	not_started	2026-09-04 06:43:17.483614+08
7f24174c-84e5-4abb-8ef3-92044bfcfe62	719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	6c1729eb-a848-498c-a3b6-314f0f1b8943	D+1~+10	结果备案、新旧班子交接	2026-12-21	2026-12-30	1	not_started	2026-09-04 06:43:17.483614+08
\.


--
-- Data for Name: election_fiefs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.election_fiefs (id, election_term_id, organization_id, unit_id, name, d_day, timezone, status, version, created_by, created_at) FROM stdin;
4697fd6a-2207-46c9-8b66-18015c953684	3dcf973d-a7db-4b55-a991-59117c1f9e0c	4c34383b-02b4-4ac6-b56a-36c04d358403	29ea13de-adf4-4600-9466-065294c14213	验收封地	2026-12-31	Asia/Shanghai	draft	1	abd98810-30d7-40bf-a857-3e4dc955b1e5	2026-09-04 04:48:23.911862+08
e5a88874-ca0a-40b2-b3f0-4a9584796294	4aa08c42-0c7f-4edf-9b25-ae1f9fa1f34c	032e0496-ab2b-4361-9aee-3381f193ab53	a7e2bbee-2e55-44ac-ad3b-a5b7d393dab0	验收封地	2026-12-31	Asia/Shanghai	draft	1	af34ab13-71c8-4f31-a715-a1d0a224a8bb	2026-09-04 04:50:41.112023+08
99ac0e7c-6bb9-4e01-b6a6-dde3cb06470b	2e992744-66d1-4140-a9cd-10bfdf6b37c4	884dcb09-0ab0-4585-bf08-0babc75d01fa	dc86dc76-f6fa-4487-be0e-3c0055c4d46f	HTTP法定资料验收-1788471685088	2031-01-15	Asia/Shanghai	draft	1	ff95c277-cc12-4e47-8ed8-db7c11ac7103	2026-09-04 05:41:25.409359+08
5bc42e8a-1c03-47d0-9d5d-95b27085291e	2e992744-66d1-4140-a9cd-10bfdf6b37c4	884dcb09-0ab0-4585-bf08-0babc75d01fa	858ad007-6813-404d-be74-6694d96a8c70	HTTP最终法定验收	2031-01-15	Asia/Shanghai	draft	1	ff95c277-cc12-4e47-8ed8-db7c11ac7103	2026-09-04 05:45:27.493299+08
85b28d21-826c-4e36-a258-99b88a45da3f	2e992744-66d1-4140-a9cd-10bfdf6b37c4	884dcb09-0ab0-4585-bf08-0babc75d01fa	ba38abc4-4cef-4015-9add-a8e03e031ed7	整体接口验收-1788472897451	2032-02-03	Asia/Shanghai	draft	1	ff95c277-cc12-4e47-8ed8-db7c11ac7103	2026-09-04 06:01:37.494007+08
d26c709e-9dca-4939-b4ef-c49a5c440499	824de4b1-9566-4b27-bb64-51b3f8ad3d0b	0b198ea5-ce57-4233-b766-cffc7f8314f6	7474c898-dffc-46ae-b20d-92b0f2c90102	演示村换届演示	2026-12-20	Asia/Shanghai	active	1	0ebfc534-b473-4c56-a36c-178f5ed1b5c5	2026-09-04 06:43:17.483614+08
719fe0cd-7ab9-4e68-9ccf-aea29fbc99a2	824de4b1-9566-4b27-bb64-51b3f8ad3d0b	12816b50-104f-43a9-bf52-5af04fb1ccb3	529a8f9c-d067-45a0-aafe-bd6608fd2905	演示社区换届演示	2026-12-20	Asia/Shanghai	active	1	31e6119e-dfdc-4930-a5fa-49a8063b1b43	2026-09-04 06:43:17.483614+08
\.


--
-- Data for Name: election_terms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.election_terms (id, name, status, created_at) FROM stdin;
2e992744-66d1-4140-a9cd-10bfdf6b37c4	集成测试届次-68201579	draft	2026-09-04 04:43:23.351943+08
6967beaf-614b-4f15-99ea-04806cb0b4f8	集成测试届次-68273028	draft	2026-09-04 04:44:34.535739+08
052e0b8d-3c6f-467e-a3d6-bdf85d698c33	集成测试届次-68356357	draft	2026-09-04 04:45:58.271756+08
024474f0-4d06-4043-9d4c-83efc0a40a32	验收届次	draft	2026-09-04 04:47:04.736919+08
3dcf973d-a7db-4b55-a991-59117c1f9e0c	验收届次	draft	2026-09-04 04:48:20.47862+08
4aa08c42-0c7f-4edf-9b25-ae1f9fa1f34c	验收届次	draft	2026-09-04 04:50:35.459838+08
824de4b1-9566-4b27-bb64-51b3f8ad3d0b	2026基层换届演示届次	active	2026-09-04 06:43:17.483614+08
\.


--
-- Data for Name: election_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.election_units (id, organization_id, name, created_at) FROM stdin;
dc86dc76-f6fa-4487-be0e-3c0055c4d46f	884dcb09-0ab0-4585-bf08-0babc75d01fa	集成测试单元	2026-09-04 04:43:23.614716+08
bf0dc842-1b85-4dd2-a509-1a613eaacaba	ecbe2259-9477-400f-8237-9d68a87c12df	集成测试单元	2026-09-04 04:44:34.79393+08
0949f2dc-986f-4570-81ab-3ec99ff672df	d1ab61ea-c8b6-469e-afe2-22d8aa8ab873	集成测试单元	2026-09-04 04:45:58.53846+08
b05abf9d-8647-4a1b-a079-8be7df0aae04	6212eb60-fc83-43e3-b591-f43d36653c98	验收单元	2026-09-04 04:47:04.999149+08
29ea13de-adf4-4600-9466-065294c14213	4c34383b-02b4-4ac6-b56a-36c04d358403	验收单元	2026-09-04 04:48:20.732294+08
a7e2bbee-2e55-44ac-ad3b-a5b7d393dab0	032e0496-ab2b-4361-9aee-3381f193ab53	验收单元	2026-09-04 04:50:35.711719+08
858ad007-6813-404d-be74-6694d96a8c70	884dcb09-0ab0-4585-bf08-0babc75d01fa	HTTP验收临时单元-1788471887475	2026-09-04 05:44:47.243746+08
ba38abc4-4cef-4015-9add-a8e03e031ed7	884dcb09-0ab0-4585-bf08-0babc75d01fa	整体验收临时单元-1788472888531	2026-09-04 06:01:28.50131+08
7474c898-dffc-46ae-b20d-92b0f2c90102	0b198ea5-ce57-4233-b766-cffc7f8314f6	演示村	2026-09-04 06:43:17.483614+08
529a8f9c-d067-45a0-aafe-bd6608fd2905	12816b50-104f-43a9-bf52-5af04fb1ccb3	演示社区	2026-09-04 06:43:17.483614+08
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invitations (id, organization_id, phone, role, token_hash, expires_at, invited_by, accepted_at) FROM stdin;
4242fa4d-a766-40f1-bb08-682347c2e278	3a31903a-05c3-4a26-ba10-a84989f8755b	1661410165	org_admin	7f09da229ee87b5afbce2275b6f79e6a7aee8ae3051df2feda322bc7da8de8a8	2026-09-07 07:00:12.817229+08	b621e82c-68cb-4b0b-baa8-fb5a2290ba22	2026-09-04 07:00:13.884173+08
c868d347-f0b0-4d23-84bc-5c72305e942a	3a31903a-05c3-4a26-ba10-a84989f8755b	16714101650	operator	acba6862e3368f1d9f25d0a4ae4d8b4a0504010160f72278a65d4f71628a8208	2026-09-07 07:00:16.131948+08	e0d78fe6-4231-4d23-8857-c7cd49236928	2026-09-04 07:00:17.224432+08
4eef8fad-91eb-4f16-93f5-17109c2a75af	3a31903a-05c3-4a26-ba10-a84989f8755b	16714101651	editor	b7e25dc192fa11bc615b199f03a270e4200bbf755d8d0913da3d88f38b9c6511	2026-09-07 07:00:18.836095+08	e0d78fe6-4231-4d23-8857-c7cd49236928	2026-09-04 07:00:19.891312+08
59a3b29d-9d27-44df-abac-96714c4a02c5	3a31903a-05c3-4a26-ba10-a84989f8755b	16714101652	reviewer	a183763efce54fdd44a51bc8f5a2a2d3319354de3ca091a89c389e0774dac76d	2026-09-07 07:00:21.520933+08	e0d78fe6-4231-4d23-8857-c7cd49236928	2026-09-04 07:00:22.571644+08
21d72887-d8a0-4d27-8d8c-06df2e0f8d94	3a31903a-05c3-4a26-ba10-a84989f8755b	16714101653	candidate	8fcaecfb4d03b895cced83eb818d557fea4316f0ab917e1b126e58f5b9db186b	2026-09-07 07:00:24.19852+08	e0d78fe6-4231-4d23-8857-c7cd49236928	2026-09-04 07:00:25.248588+08
a44ff7f1-578f-4fa4-ab82-a608edbe490f	a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	1662410165	org_admin	c6d7b986a6fcd708464aa8ed172aee5eddc18f81ddfe1752e3c41faf746e90f8	2026-09-07 07:00:27.387953+08	b621e82c-68cb-4b0b-baa8-fb5a2290ba22	2026-09-04 07:00:28.437536+08
b0c3ede2-002b-4532-acb1-1dbb7f29e06a	a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	16724101650	operator	afb8936619dc5eb2c8f95bc4c48e467ebeb0923aecd7e65959ab9df47fee98f8	2026-09-07 07:00:30.770683+08	bedaa74c-687d-4074-9143-a2ee9309dc31	2026-09-04 07:00:31.820736+08
e2f540da-4c2a-4bc5-ba6c-694182ae60b2	a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	16724101651	editor	8e20b45ade9719d56f1481fe82a59c8c09d99c55e45db8e747f35b91758ea8a3	2026-09-07 07:00:33.429137+08	bedaa74c-687d-4074-9143-a2ee9309dc31	2026-09-04 07:00:34.479774+08
bb52aaf0-9e19-4964-9f05-9748d89f50be	a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	16724101652	reviewer	dc077405a1f0a73210fbb695d97758fffd98542d0897259f561c1c513f0c2a49	2026-09-07 07:00:36.087912+08	bedaa74c-687d-4074-9143-a2ee9309dc31	2026-09-04 07:00:37.141497+08
d84503af-3eff-4dc1-b572-f04da846a2c3	a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	16724101653	candidate	8db2d4ee6bef8aa9287aa555c8d6646e6abb6d8893039f3df8339dbe8e6a6aca	2026-09-07 07:00:38.762626+08	bedaa74c-687d-4074-9143-a2ee9309dc31	2026-09-04 07:00:39.813298+08
\.


--
-- Data for Name: material_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.material_files (id, material_id, file_name, mime_type, size_bytes, storage_key, created_at) FROM stdin;
5b9d06aa-4378-4b28-b545-5352ba6a4301	4e91fd1e-d661-49f5-a854-61edd97708df	test.pdf	\N	12	\N	2026-09-04 04:50:41.894782+08
\.


--
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.materials (id, election_fief_id, candidate_user_id, title, description, status, submitted_at, reviewed_at, reviewed_by, review_note) FROM stdin;
4e91fd1e-d661-49f5-a854-61edd97708df	e5a88874-ca0a-40b2-b3f0-4a9584796294	a767c239-06a5-4209-ad65-98d4379cb4dc	验收材料	\N	approved	2026-09-04 04:50:41.894782+08	2026-09-04 04:50:44.452716+08	af34ab13-71c8-4f31-a715-a1d0a224a8bb	\N
\.


--
-- Data for Name: memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.memberships (id, user_id, organization_id, role, created_at) FROM stdin;
cceb37b2-f549-4045-ac37-5a0b7b0f9631	9483fe2e-795f-472b-938b-a566db91c4c1	884dcb09-0ab0-4585-bf08-0babc75d01fa	org_admin	2026-09-04 04:43:24.188091+08
ec96868f-6efe-47df-9c0f-5237a96f5191	e6ddaaf0-417d-45c1-9847-08c4646c8f6b	ecbe2259-9477-400f-8237-9d68a87c12df	org_admin	2026-09-04 04:44:35.333044+08
19af2a9a-8975-4cc2-8d21-65b909ce0caf	a93313cd-de6c-4f19-9347-d25bee8cc268	ecbe2259-9477-400f-8237-9d68a87c12df	candidate	2026-09-04 04:44:38.344826+08
590d4af5-20c3-4cf9-9fd9-33d15ea419ba	02445856-3bff-418f-8e83-c472d20d9623	d1ab61ea-c8b6-469e-afe2-22d8aa8ab873	org_admin	2026-09-04 04:45:59.125248+08
b025daa7-c551-4644-9fd9-682c4157d525	31d63464-7df2-4505-8285-101ed7df494f	d1ab61ea-c8b6-469e-afe2-22d8aa8ab873	candidate	2026-09-04 04:46:02.092934+08
37309861-3ee0-4a1e-aa24-422c6d947edd	94cf5975-1ed4-4980-aa9b-51c232b13664	6212eb60-fc83-43e3-b591-f43d36653c98	org_admin	2026-09-04 04:47:05.520651+08
d3c48d80-5dcc-46f5-a2b8-771f479a0ebf	abd98810-30d7-40bf-a857-3e4dc955b1e5	4c34383b-02b4-4ac6-b56a-36c04d358403	org_admin	2026-09-04 04:48:21.240595+08
a87ae16a-4a32-48b7-a700-2575ea440093	af34ab13-71c8-4f31-a715-a1d0a224a8bb	032e0496-ab2b-4361-9aee-3381f193ab53	org_admin	2026-09-04 04:50:36.261021+08
d692a8c7-37e6-45fb-aafa-9eb2aab42fe0	a767c239-06a5-4209-ad65-98d4379cb4dc	032e0496-ab2b-4361-9aee-3381f193ab53	candidate	2026-09-04 04:50:39.20904+08
c1ec3350-841a-45fa-b276-11c9d2529245	ff95c277-cc12-4e47-8ed8-db7c11ac7103	884dcb09-0ab0-4585-bf08-0babc75d01fa	org_admin	2026-09-04 05:40:41.544427+08
c8d9f121-54c7-4f9f-8704-5703bbb2d84f	b621e82c-68cb-4b0b-baa8-fb5a2290ba22	0b198ea5-ce57-4233-b766-cffc7f8314f6	platform_admin	2026-09-04 06:57:46.283394+08
9da41203-a409-4de3-a8f1-14f7af2bd332	0ebfc534-b473-4c56-a36c-178f5ed1b5c5	0b198ea5-ce57-4233-b766-cffc7f8314f6	org_admin	2026-09-04 06:43:17.483614+08
b9c8e1f8-4dd6-45e7-a306-f274f5347b5d	59b5c899-2fff-4622-946b-d94eae89014a	0b198ea5-ce57-4233-b766-cffc7f8314f6	operator	2026-09-04 06:43:17.483614+08
ea45742e-5e2a-4b62-9992-2fd824a8b5f5	d2d44c9b-f974-4671-b315-fe325c434358	0b198ea5-ce57-4233-b766-cffc7f8314f6	editor	2026-09-04 06:43:17.483614+08
182f69bf-d9aa-435e-94de-27b80d588e76	d14e6f6d-c319-4901-ac61-e9473d1d6688	0b198ea5-ce57-4233-b766-cffc7f8314f6	reviewer	2026-09-04 06:43:17.483614+08
9d3a6b1e-7735-4e20-9061-295c6aae0df0	1abe00d3-f9ad-405d-9e7a-d037ab2471df	0b198ea5-ce57-4233-b766-cffc7f8314f6	candidate	2026-09-04 06:43:17.483614+08
238e6dfa-4f45-43f7-8022-eb7d1fd4d89c	31e6119e-dfdc-4930-a5fa-49a8063b1b43	12816b50-104f-43a9-bf52-5af04fb1ccb3	org_admin	2026-09-04 06:43:17.483614+08
18d72cf9-55db-4175-a42e-2507c1690506	7eb7aa9d-57e8-4b49-8213-95cbb5f04f38	12816b50-104f-43a9-bf52-5af04fb1ccb3	operator	2026-09-04 06:43:17.483614+08
66b10a5a-29b4-4d9d-943b-a660429e446a	31f52a2e-7d7f-40c3-b348-3171192ef57b	12816b50-104f-43a9-bf52-5af04fb1ccb3	editor	2026-09-04 06:43:17.483614+08
6903c087-b38a-46ac-8a41-9d91927a9645	0411f727-2341-4876-a635-31b501dae53d	12816b50-104f-43a9-bf52-5af04fb1ccb3	reviewer	2026-09-04 06:43:17.483614+08
a7d3f0b2-68e0-47e3-9832-2d59609102e1	c43a96ab-a9b6-4153-8f1d-827f62826d74	12816b50-104f-43a9-bf52-5af04fb1ccb3	candidate	2026-09-04 06:43:17.483614+08
6557be61-e036-4ec6-8c8b-bc1c4bd48995	e0d78fe6-4231-4d23-8857-c7cd49236928	3a31903a-05c3-4a26-ba10-a84989f8755b	org_admin	2026-09-04 07:00:13.884173+08
7fd2669a-2e52-419e-a406-95c56388b173	142e1d0c-b3b7-47da-8bb7-6be47b2e4513	3a31903a-05c3-4a26-ba10-a84989f8755b	operator	2026-09-04 07:00:17.224432+08
14f17d2a-066a-4cd3-9783-05cd509125f3	2b9fe545-0e08-4850-8cc6-4c1168ab2b64	3a31903a-05c3-4a26-ba10-a84989f8755b	editor	2026-09-04 07:00:19.891312+08
5cfd2d5f-2512-4e7b-93b7-1079e30e3135	a2a769b5-4f7c-45cd-9cde-a7ca392f4913	3a31903a-05c3-4a26-ba10-a84989f8755b	reviewer	2026-09-04 07:00:22.571644+08
61f34d00-cc8f-45f1-9c68-4365c89981d8	4cd6b406-73df-45a2-a0f6-c018630461a5	3a31903a-05c3-4a26-ba10-a84989f8755b	candidate	2026-09-04 07:00:25.248588+08
b959b2ea-a8c6-417a-b343-2aea83fc5deb	bedaa74c-687d-4074-9143-a2ee9309dc31	a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	org_admin	2026-09-04 07:00:28.437536+08
328d0dcc-1d25-4e00-b7b8-e81e4213b57a	f70c288b-4c56-4013-b2b8-e8e61e6692dd	a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	operator	2026-09-04 07:00:31.820736+08
912a010f-9cb9-4591-8a2f-e9ac5ba989b6	9587780e-3fa7-4baf-b962-51e0ca531c20	a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	editor	2026-09-04 07:00:34.479774+08
1e4d9d68-1c2e-41ee-8cb4-6a0fd6d2957f	86cd7275-0046-4950-a61a-14fdf1635913	a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	reviewer	2026-09-04 07:00:37.141497+08
fb045714-6db4-4a18-a99a-0df3cd7e2a24	02644937-91a8-45db-9745-241b00257f3d	a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	candidate	2026-09-04 07:00:39.813298+08
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, slug, name, status, created_at) FROM stdin;
884dcb09-0ab0-4585-bf08-0babc75d01fa	integration-68201579	集成测试组织	active	2026-09-04 04:43:23.08838+08
ecbe2259-9477-400f-8237-9d68a87c12df	it-68273028	集成测试组织	active	2026-09-04 04:44:34.282796+08
d1ab61ea-c8b6-469e-afe2-22d8aa8ab873	it-68356357	集成测试组织	active	2026-09-04 04:45:58.003585+08
6212eb60-fc83-43e3-b591-f43d36653c98	verify-68422931	验收组织	active	2026-09-04 04:47:04.472463+08
4c34383b-02b4-4ac6-b56a-36c04d358403	verify-68499042	验收组织	active	2026-09-04 04:48:20.221273+08
032e0496-ab2b-4361-9aee-3381f193ab53	full-68634293	验收组织	active	2026-09-04 04:50:35.206155+08
0b198ea5-ce57-4233-b766-cffc7f8314f6	demo-village	演示村	active	2026-09-04 06:43:17.483614+08
12816b50-104f-43a9-bf52-5af04fb1ccb3	demo-community	演示社区	active	2026-09-04 06:43:17.483614+08
3a31903a-05c3-4a26-ba10-a84989f8755b	exercise-village-410165	操练村	active	2026-09-04 07:00:12.283192+08
a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	exercise-community-410165	操练社区	active	2026-09-04 07:00:26.858048+08
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, organization_id, token_hash, expires_at, created_at) FROM stdin;
17368185-884c-49ad-bc83-e3b44ea8e664	e6ddaaf0-417d-45c1-9847-08c4646c8f6b	ecbe2259-9477-400f-8237-9d68a87c12df	7dcdf52c874ab5cf1f7bf0fb8418d37ee3c2b3004fafb31c6c67549f9fae6b72	2026-09-11 04:44:37.541896+08	2026-09-04 04:44:37.541896+08
ba0d9a24-d025-4f67-ab8e-e84405a762f9	a93313cd-de6c-4f19-9347-d25bee8cc268	ecbe2259-9477-400f-8237-9d68a87c12df	6401ee56b920763cf85174e51c82dac1b469ace30c711e9030515056060b2f2f	2026-09-11 04:44:39.771374+08	2026-09-04 04:44:39.771374+08
70d6245f-4e38-4f8f-862e-f77e5633012f	02445856-3bff-418f-8e83-c472d20d9623	d1ab61ea-c8b6-469e-afe2-22d8aa8ab873	90158f5eff86f893bfefebe594bcfcb758b6d7d5662b7bb23eff15c917297b54	2026-09-11 04:46:01.304711+08	2026-09-04 04:46:01.304711+08
5636ff7b-b708-4c78-8b88-c4f654c76d77	31d63464-7df2-4505-8285-101ed7df494f	d1ab61ea-c8b6-469e-afe2-22d8aa8ab873	ff60a28ceb0b37aac74041673c12635632d25e5df8d72844321b770e78a97dda	2026-09-11 04:46:03.602911+08	2026-09-04 04:46:03.602911+08
b400b681-963f-4019-9b27-5d97c3fad835	94cf5975-1ed4-4980-aa9b-51c232b13664	6212eb60-fc83-43e3-b591-f43d36653c98	e242485cab04861c4727166dbe53e3e5d665d244a12657aac8dbdcf7fe291bcb	2026-09-11 04:47:07.609008+08	2026-09-04 04:47:07.609008+08
f84fada7-293d-4619-814a-8e97fd3de325	abd98810-30d7-40bf-a857-3e4dc955b1e5	4c34383b-02b4-4ac6-b56a-36c04d358403	76470c86080b98141d01b62a755b616cda1bca0d135347ad13c8e52bc799657d	2026-09-11 04:48:23.38959+08	2026-09-04 04:48:23.38959+08
a57b822b-44c5-4414-940c-5a485a1047a3	af34ab13-71c8-4f31-a715-a1d0a224a8bb	032e0496-ab2b-4361-9aee-3381f193ab53	c4560bddec8fbcc12a580dd9508ea84d8475fd78571aae0cfe58276c4f26f79e	2026-09-11 04:50:38.426216+08	2026-09-04 04:50:38.426216+08
a7f48c42-90e1-404b-8924-b1036f33a902	a767c239-06a5-4209-ad65-98d4379cb4dc	032e0496-ab2b-4361-9aee-3381f193ab53	6f969e181ddbff46ca1dd498803ef032ebdffa68443626495df9b2c1e0fd00a8	2026-09-11 04:50:40.590476+08	2026-09-04 04:50:40.590476+08
6a8c9f4b-5f4d-4ad7-8906-d31d24ef0c39	ff95c277-cc12-4e47-8ed8-db7c11ac7103	884dcb09-0ab0-4585-bf08-0babc75d01fa	cf76df5acde7390ab604014018784335b43039f74242f8a5e15614935f2f76a4	2026-09-11 05:41:24.867451+08	2026-09-04 05:41:24.867451+08
7cdc0aaf-3157-4e52-b7fb-d2e6ace0dcfe	ff95c277-cc12-4e47-8ed8-db7c11ac7103	884dcb09-0ab0-4585-bf08-0babc75d01fa	c4953270258cd7fca36ca9af1a8c9aaa27b2c824a49ce51c9eab9676bf10b8fa	2026-09-11 05:43:16.404402+08	2026-09-04 05:43:16.404402+08
d39a8505-a0e0-439f-abd1-4199c566a14f	ff95c277-cc12-4e47-8ed8-db7c11ac7103	884dcb09-0ab0-4585-bf08-0babc75d01fa	22307c25e3654904a789d0707cf8a224ef0bec92b972a6542b2ba4cfadea4a73	2026-09-11 05:45:26.97123+08	2026-09-04 05:45:26.97123+08
bfb3014d-8930-4d01-90c6-053eae34865c	ff95c277-cc12-4e47-8ed8-db7c11ac7103	884dcb09-0ab0-4585-bf08-0babc75d01fa	89d68ae91b7af0f1ddaddf61c52f8734511d2504816b3095a00fb6a020043587	2026-09-11 05:48:31.924891+08	2026-09-04 05:48:31.924891+08
5708133e-7e35-4cdf-838d-673d1e2f2de3	ff95c277-cc12-4e47-8ed8-db7c11ac7103	884dcb09-0ab0-4585-bf08-0babc75d01fa	07ad0ae72a8a2f7a47a59c4f71fbba62f505a9206973f74ff5eb079dfdb348cd	2026-09-11 05:49:04.423579+08	2026-09-04 05:49:04.423579+08
ffab14b7-d29a-4e07-84d7-588ec62dbece	ff95c277-cc12-4e47-8ed8-db7c11ac7103	884dcb09-0ab0-4585-bf08-0babc75d01fa	4b84791dd9512c082458fd9314d183f65a3d11618ad5b870dfec591c1885c113	2026-09-11 06:01:36.949225+08	2026-09-04 06:01:36.949225+08
5161a279-08fa-47ce-9a29-2030d553628f	ff95c277-cc12-4e47-8ed8-db7c11ac7103	884dcb09-0ab0-4585-bf08-0babc75d01fa	3f3d026c38f68e71ac99b7970da67c9703cfcd1735042f9b4f87ad00ca56c3e4	2026-09-11 06:14:43.377984+08	2026-09-04 06:14:43.377984+08
ed3d005d-e9b8-40e6-b6c1-97e2b01451e9	ff95c277-cc12-4e47-8ed8-db7c11ac7103	884dcb09-0ab0-4585-bf08-0babc75d01fa	2e02f87cad0e8c9fe1cea7d9a36334a0893ff10a31e9b829a98d8c852718ffcc	2026-09-11 06:15:13.383447+08	2026-09-04 06:15:13.383447+08
a901e5f1-c092-485b-8699-f396fa6274ae	ff95c277-cc12-4e47-8ed8-db7c11ac7103	884dcb09-0ab0-4585-bf08-0babc75d01fa	e49e715b88d79e56f122fb3b3831fa9ccf973e099584e487656745e369367436	2026-09-11 06:16:19.402005+08	2026-09-04 06:16:19.402005+08
832edc4a-c413-44e9-a77f-5c3073968852	ff95c277-cc12-4e47-8ed8-db7c11ac7103	884dcb09-0ab0-4585-bf08-0babc75d01fa	a65e6c0ab0a5ff515ed6761d85b59d6a12a9f91698310e4693c030c552054300	2026-09-11 06:16:47.518522+08	2026-09-04 06:16:47.518522+08
9e3438cf-aeb1-4a15-8fbf-7a0d09bb0209	31e6119e-dfdc-4930-a5fa-49a8063b1b43	12816b50-104f-43a9-bf52-5af04fb1ccb3	aead1290892a295ba2f2dfeaf0f759bb71c2a4736ed514a77a7217687d7d4ee1	2026-09-11 06:55:33.813907+08	2026-09-04 06:55:33.813907+08
698aae6d-2469-464a-95fa-479dc4f9c858	7eb7aa9d-57e8-4b49-8213-95cbb5f04f38	12816b50-104f-43a9-bf52-5af04fb1ccb3	b7d9a08de01d25008b902e502e3270f8eb1428c3d4770c9e799b974c8f7b7825	2026-09-11 06:55:34.3945+08	2026-09-04 06:55:34.3945+08
a00077f6-8cf0-4d22-8373-bbd715189d55	31f52a2e-7d7f-40c3-b348-3171192ef57b	12816b50-104f-43a9-bf52-5af04fb1ccb3	42001a4fdf1c1e8d10c8086bd444b2ee65f6f13e70a097df18ec7bad28981e09	2026-09-11 06:55:34.969685+08	2026-09-04 06:55:34.969685+08
c2f9c7bc-2b02-4721-b7b9-370cababf5b0	0411f727-2341-4876-a635-31b501dae53d	12816b50-104f-43a9-bf52-5af04fb1ccb3	1571e1f6233cd9611ab31b9da6aaaf8ac479161214058ecb662d634c5e27930b	2026-09-11 06:55:35.541716+08	2026-09-04 06:55:35.541716+08
e789c87e-7bef-413b-b8e7-695fa8394064	c43a96ab-a9b6-4153-8f1d-827f62826d74	12816b50-104f-43a9-bf52-5af04fb1ccb3	2fa99c289564b3af474e95692d8a0a1976ac39c0523775999ee1fe3a5ba55acc	2026-09-11 06:55:36.114818+08	2026-09-04 06:55:36.114818+08
634d5965-4c8c-41b4-81ef-15c78484a560	0ebfc534-b473-4c56-a36c-178f5ed1b5c5	0b198ea5-ce57-4233-b766-cffc7f8314f6	af77775875a1c9a1fdf65e4e3094253d77649258536a169f041fe67efecb90a1	2026-09-11 06:55:36.681563+08	2026-09-04 06:55:36.681563+08
2055d31c-ba62-4781-9fd2-cac212a6fd46	59b5c899-2fff-4622-946b-d94eae89014a	0b198ea5-ce57-4233-b766-cffc7f8314f6	74a6538c70683a865dba4194da99d539cef093fa324cb4c1d7f3b2b8ffd853a3	2026-09-11 06:55:37.24276+08	2026-09-04 06:55:37.24276+08
450fa2a5-b732-4f6f-99ff-47cd0d537194	d2d44c9b-f974-4671-b315-fe325c434358	0b198ea5-ce57-4233-b766-cffc7f8314f6	8f3166bc8a743b56c6b9578cef6530f321a9ffbdbb8d05159d14005ac5f1acfa	2026-09-11 06:55:37.806193+08	2026-09-04 06:55:37.806193+08
e673cff9-c555-4786-be6c-a86659726b9a	d14e6f6d-c319-4901-ac61-e9473d1d6688	0b198ea5-ce57-4233-b766-cffc7f8314f6	a6ca70752386a72cb637256c44c808d747de08867e0eacddebd7b9ca22c052e5	2026-09-11 06:55:38.374141+08	2026-09-04 06:55:38.374141+08
9f7aac87-4d02-4f44-aa7c-b3995e91d315	1abe00d3-f9ad-405d-9e7a-d037ab2471df	0b198ea5-ce57-4233-b766-cffc7f8314f6	f75237bb653efc6f3afd8add2a07cb2ee2d68e63676e2c074e420711bf183ca5	2026-09-11 06:55:38.936518+08	2026-09-04 06:55:38.936518+08
dba7bb05-1485-475c-bc7f-99c9a3557a1f	b621e82c-68cb-4b0b-baa8-fb5a2290ba22	0b198ea5-ce57-4233-b766-cffc7f8314f6	3bb14dac31b566990a4f9df908611f91a73af78d9901020d9480245ea0a1f460	2026-09-11 06:58:14.12908+08	2026-09-04 06:58:14.12908+08
1e16a019-ee88-4a8b-830d-0816b7cc0348	b621e82c-68cb-4b0b-baa8-fb5a2290ba22	0b198ea5-ce57-4233-b766-cffc7f8314f6	e8083dcefad2d1566dceb1a99ad1224bc0e3cfeb3e8975d69d2c8e0d52d0ae3f	2026-09-11 07:00:11.743095+08	2026-09-04 07:00:11.743095+08
62af38f9-3dba-4786-b4a3-5fc95e4e44bf	e0d78fe6-4231-4d23-8857-c7cd49236928	3a31903a-05c3-4a26-ba10-a84989f8755b	998183863dcc95747cdb5cd4db3ac3a9b394af9d18ff85c69cd740e20e9731b4	2026-09-11 07:00:15.573697+08	2026-09-04 07:00:15.573697+08
b794f032-5050-4883-8d55-30d59419b4ea	bedaa74c-687d-4074-9143-a2ee9309dc31	a2ea53fb-0b53-467f-8ac3-aaf0c4a1bbbb	1efd40d9d7aadad64fa57806c6bfc14c5b03f19f94efb8c3e28d160510707677	2026-09-11 07:00:30.243533+08	2026-09-04 07:00:30.243533+08
\.


--
-- Data for Name: stage_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stage_templates (id, st_key, st_name, st_day_offset, st_duration_days, st_order, st_description, source_label, active, created_at, updated_at) FROM stdin;
7a68b72b-75ca-47b1-8dde-b77a1a34afc3	D-35	前期筹备	-35	-35	-35	st_core_work: 村两委联席会议定班子职数；离任财务审计村务公示；筹备选委会推选\nst_sys_action: 无候选人材料操作仅提案审批模块提交换届启动申请\nst_announcement: 无\nst_need_review: 是\nst_review_round: 提案审批\nst_need_material: 是\nst_material_type: 换届启动申请	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
eaa0cf86-de04-46cc-bb09-4036e61597f5	D-34	成立选委会	-34	-34	-34	st_core_work: 推选5-9人选委会；选委会分工；表决选举办法\nst_sys_action: 无材料候选人操作仅母版配置基础信息\nst_announcement: 1号、2号、3号公告\nst_need_review: 是\nst_review_round: 选委会备案\nst_need_material: 是\nst_material_type: 选委会名单	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
cb8f7188-e762-43c3-a289-127c993d6aa7	D-33~-29	选民登记	-33	-29	-33	st_core_work: 逐户登记年满18周岁无剥夺政治权利村民；登记外出老弱病残流动票箱人员\nst_sys_action: 仅选民名册录入不开放材料上报候选人流程\nst_announcement: 持续张贴3号公告\nst_need_review: 否\nst_need_material: 否	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
6f707564-0b2e-4c16-8fdb-1b37eb9be631	D-28~-24	公示选民名单	-28	-24	-28	st_core_work: 汇总全部选民开启5天异议申诉期\nst_sys_action: 无材料候选人操作\nst_announcement: 4号选民名单公告\nst_need_review: 是\nst_review_round: 选民资格审核\nst_need_material: 是\nst_material_type: 选民名册	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
64a800dd-5dd1-43f2-b56d-7fd91e304a7d	D-23~-21	受理选民申诉	-23	-21	-23	st_core_work: 核查资格异议更正选民名册\nst_sys_action: 无材料候选人操作\nst_announcement: 选民名单更正补充公告\nst_need_review: 是\nst_review_round: 异议核查\nst_need_material: 是\nst_material_type: 选民名单更正	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
961dab9a-fa12-4584-a873-4b6d2e0d8181	D-20~-16	代表选举	-20	-16	-20	st_core_work: 村：村民代表和小组长；居：居民代表和户代表\nst_sys_action: 代表和小组长选举结果录入\nst_announcement: 5号、6号、6-1号公告\nst_need_review: 是\nst_review_round: 选举结果确认\nst_need_material: 是\nst_material_type: 代表名单、小组长名单	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
3944c14b-c0dd-4fd4-a70b-a29992422132	D-15	候选人提名启动	-15	-15	-15	st_core_work: 发布7号提名公告；开放组织推荐、个人自荐两类提名\nst_sys_action: 候选人提名开启；材料上报同步开启；r1材料完整性审核开始\nst_announcement: 7号提名公告\nst_need_review: 是\nst_review_round: 第一轮-材料完整性审核\nst_need_material: 是\nst_material_type: 自荐表、身份证、个人简历、无犯罪记录证明、组织推荐函	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
37774a4b-fa77-476f-a4bf-a3fc937ec2b7	D-14	候选人提名延续	-14	-14	-14	st_core_work: 持续接收组织推荐群众自荐材料\nst_sys_action: 候选人提名；材料上报；材料审核持续\nst_announcement: 持续张贴7号公告\nst_need_review: 是\nst_review_round: 第一轮-材料完整性审核\nst_need_material: 是\nst_material_type: 候选人提名相关材料	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
453dec21-810e-44ce-bd7a-4ea2e164f956	D-13	初步候选人汇总+镇级初审	-13	-13	-13	st_core_work: 汇总全部人员；镇级资格初审；选委会递补\nst_sys_action: 提名收尾；r1完成；r2镇级初审；关闭材料上报入口\nst_announcement: 8号初步候选人名单公告、2-1号选委会递补公告\nst_need_review: 是\nst_review_round: 第二轮-镇级资格初审\nst_need_material: 是\nst_material_type: 初步候选人汇总名单	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
987fb95e-357a-4fdd-a79d-d8739f36b71c	D-12~-10	竞选预选	-12	-10	-12	st_core_work: 超差额职位召开代表会议无记名预选确定正式候选人\nst_sys_action: 预选投票组织与结果录入\nst_announcement: 预选办法公告、预选结果公告\nst_need_review: 是\nst_review_round: 预选结果确认\nst_need_material: 是\nst_material_type: 预选结果	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
063e2fe3-9c68-4039-becc-a87870a4a756	D-9~-5	区级11部门联审、党委考察	-9	-5	-9	st_core_work: 多部门资格核查党委考察筛选正式候选人\nst_sys_action: 暂停新增材料上报；r3区级多部门联审；r4党委考察\nst_announcement: 无\nst_need_review: 是\nst_review_round: 第三轮-区级联审、第四轮-党委考察\nst_need_material: 否	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
dabec3ae-6b74-4977-aa89-0b107acc2de3	D-4	正式候选人公示	-4	-4	-4	st_core_work: 联审收尾确定并公示正式候选人\nst_sys_action: 四轮全过转正式候选人；关闭材料上报和新增提名入口\nst_announcement: 9号正式候选人名单公告\nst_need_review: 是\nst_review_round: 最终确认\nst_need_material: 否	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
8b7624aa-7f78-4a48-a3f0-8e16fdd455d6	D-3~-2	投票竞选筹备	-3	-2	-3	st_core_work: 确定监票计票流动票箱代写人员\nst_sys_action: 竞选筹备阶段公示配套规则\nst_announcement: 10~14号公告\nst_need_review: 是\nst_review_round: 工作人员备案\nst_need_material: 是\nst_material_type: 选举工作人员名单、流动票箱名单、委托投票名单、代写名单	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
b26cee83-6798-443c-8a6e-b0a17f5677ae	D-1	投票竞选筹备	-1	-1	-1	st_core_work: 印制选票布置票箱\nst_sys_action: 竞选筹备阶段\nst_announcement: 15号无效票认定规则公告\nst_need_review: 否\nst_need_material: 否	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
46130a97-572a-4ea9-9336-2c42082b5715	D0	正式投票选举	0	0	0	st_core_work: 现场集中+流动票箱投票；当众开箱计票；当场公布结果\nst_sys_action: 正式选举（投票当日）；录入线下投票结果更新当选人员\nst_announcement: 17号选举结果公告（村委另有17-1号）\nst_need_review: 是\nst_review_round: 结果确认备案\nst_need_material: 是\nst_material_type: 选举结果报告	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
6c1729eb-a848-498c-a3b6-314f0f1b8943	D+1~+10	结果备案、新旧班子交接	1	10	1	st_core_work: 整理选举档案；公章财务档案固定资产交接\nst_sys_action: 竞选流程结束仅归档；全流程结束所有材料候选人模块锁定只读\nst_announcement: 无\nst_need_review: 是\nst_review_round: 归档确认\nst_need_material: 是\nst_material_type: 选举档案、交接清单	government-procedure	t	2026-09-04 05:28:09.145039+08	2026-09-04 05:28:09.145039+08
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, phone, password_hash, display_name, status, created_at) FROM stdin;
9483fe2e-795f-472b-938b-a566db91c4c1	13868201579	scrypt:532f20e354471f7012a0e11ccd621185:9544b70a1a1cebef7fbd6c63937c97a507d7c3578826758b01ff0a8325f296d394b11b7f8435fdef3c34a978c3799fc6e9162cb9f0023f9dfeed941e4e4cb133	集成测试管理员	active	2026-09-04 04:43:23.923854+08
e6ddaaf0-417d-45c1-9847-08c4646c8f6b	13868273028	scrypt:d627bd372faa6a3743636dcf62c29d3e:40f569a2b60df8139552f73207f6fb4a8c92b745a5bbeb067e19be1b55367853ad2b74e647f436bb4222387819551f7e5953f5bdab0e65adecdb3077773b9f1f	集成测试管理员	active	2026-09-04 04:44:35.08271+08
a93313cd-de6c-4f19-9347-d25bee8cc268	13968273028	scrypt:0c4ac8e039e29fd96a87cdcdd568c2bc:270362d2e4984cc0f51b7d060dfb19e5f3c73d416f6aca407d8715c2e3dce0480288f9baefbdc2302e1f8301572d6b96c0dd75ad4d8d3e0996fb2b5de798da13	集成测试参选人	active	2026-09-04 04:44:38.344826+08
02445856-3bff-418f-8e83-c472d20d9623	13868356357	scrypt:eaafea27e1cf1ea51856421714df6e63:a8d2df97f724159abc6cbbebf4172c63ed8faff78eec018b03988ff5aa38f9a26dba1e322ec9aac1a540f55add184f8bc36efb13893184b9c28e19c6dd8d4545	集成测试管理员	active	2026-09-04 04:45:58.854603+08
31d63464-7df2-4505-8285-101ed7df494f	13968356357	scrypt:0a6a9a3e780e2e2acf69df5b55af6e40:e6bc26c82bdc8626fabb70e7ec4ade90457a2c7d95692f529eb9a1cc2bb46151c34e887b10d3a0120bacedcae3e0bca99d6e147875b9a8bc79944117b1392c5d	集成测试参选人	active	2026-09-04 04:46:02.092934+08
94cf5975-1ed4-4980-aa9b-51c232b13664	13868422931	scrypt:7a9208f66817927a5f78439fb7b513d2:104ba3349a5853b38e74ea6035a64799cc690bd6ce9913820df76fd094a0539542faa4a1e6a1ed26d9c2e379648697e5977befd1866553bdbafd529b535d2cd1	\N	active	2026-09-04 04:47:05.260124+08
abd98810-30d7-40bf-a857-3e4dc955b1e5	13868499042	scrypt:82b914b030a489bd3e8578ec553c124c:36c200391b1f924e670e7100f45ba269701a3598f41db65bbab4bce93e8e03803ae4d4d8bc43a9f40181fcb7a67247bae8ae45e082528495af523c1285cc16f0	\N	active	2026-09-04 04:48:20.985617+08
af34ab13-71c8-4f31-a715-a1d0a224a8bb	13868634293	scrypt:cc965d4834354f4cb075fe44181fbdd6:14dd72704d8f131e6c12c334e44de5272f918bc4872299b6b154f63afcf2613aa14b9399b6bb07e95a977fd4b797605c82382f78e90cc3566004f2779643e93a	\N	active	2026-09-04 04:50:36.009366+08
a767c239-06a5-4209-ad65-98d4379cb4dc	13968634293	scrypt:e4ec86642414ee332b976efa5ee050fc:dedc076505747903fc01a88fe2c9c378faed97dd7dea2001e3ac57ab982046385620ca1fcab61309d3dfa56366b522c56cd5b8e194845fcf3fb12fc5a7eb5f73	\N	active	2026-09-04 04:50:39.20904+08
ff95c277-cc12-4e47-8ed8-db7c11ac7103	13971639153	scrypt:9e7d99d03492f55ec0669d9dd81a7b3e:cdc4dcb969e081f74884622abb779024217ceb296d238809581cc804e2d57a739ff480ac214720e7285dbb13feefbaf512852162714a65ae808c5e1cb908b30e	HTTP验收账号	active	2026-09-04 05:40:41.2792+08
b621e82c-68cb-4b0b-baa8-fb5a2290ba22	15500000001	scrypt:ecacbb523a95e1f394dc87a84ee57496:78bed500a40e21d283ade9b27c114f856fae20dbbc0f61e2e6b32737c74b76272e482833afc0771001ef9bb3ae4cf109928c372f0d2a91c94085afffdcf8c4dd	换届系统超管	active	2026-09-04 06:57:46.283394+08
0ebfc534-b473-4c56-a36c-178f5ed1b5c5	15500010001	scrypt:43b4f48f64b7d77a3e46c1a0effb87a4:d5a0ac478233f56254404136460c62dc9f1b2c95fe246e822cc4868c16aa998c148d784692e2a1c5b326c93b3b7f14312dcd864bef243ba4f359f914e990fe4b	演示村组织管理员	active	2026-09-04 06:43:17.483614+08
59b5c899-2fff-4622-946b-d94eae89014a	15500010002	scrypt:ab4c3d7bb80da7a9ffb50d24bbac773c:943ab593e3db669fd4cbc796a9c54425905f8c45d7c523cf8421d9edc520105c1c80f01ec889273c43e3656b24ade13761097ec24ab81034adde4819a9babbec	演示村业务经办	active	2026-09-04 06:43:17.483614+08
d2d44c9b-f974-4671-b315-fe325c434358	15500010003	scrypt:e78f6429a0eb9b11d59272e7e8883640:04f4553c7dc97565b18fb4e81ca9c8d8ff8c6c72a867fefa295a8ef84a2b51e531bf78387d7217f78e4336cb993b45ea508860170acd80f213a2deada47db693	演示村公告编辑	active	2026-09-04 06:43:17.483614+08
d14e6f6d-c319-4901-ac61-e9473d1d6688	15500010004	scrypt:7f02aef361d89e3a1f5cc54702c0a02c:30f32ca4a54219ff1d0f40e8ea2f120694eb870b6e1242d8b2fc67ff952e26156337ed5762e780120923b6d4b0dba94b32129f60ed69ede68f6b3a290d093987	演示村材料审核	active	2026-09-04 06:43:17.483614+08
1abe00d3-f9ad-405d-9e7a-d037ab2471df	15500010005	scrypt:cacf8665e38370749fa929b4f50afd38:5aadde72ca8bce1dad4b2e77d4b2b24dd94b1145b591e37c901b44b78f376b624b27813799cc35ace67ba5e0bb96d8ce2795bb6f677b1a62cd28c82678eab6df	演示村参选人	active	2026-09-04 06:43:17.483614+08
31e6119e-dfdc-4930-a5fa-49a8063b1b43	15500020001	scrypt:675798046cdc025e6b9166d2d322d893:cf46ebced18645f6cc3821089d7fb485c5ceb5b49b122e132ac03a46243cb734c47f110af4f359cd1f8654b5fa5a373697f9d20ab63e91ed7c09143ed4e8a04f	演示社区组织管理员	active	2026-09-04 06:43:17.483614+08
7eb7aa9d-57e8-4b49-8213-95cbb5f04f38	15500020002	scrypt:0c5b02783c317543e0e4e331a7b54f16:3b8f1fcb2eb2b0c4e872e7e0fa3f93dd04870e31f3099f46ce265f284757370e5ecf96e331dc409a4659414521b0f201f5b80ad93e809935529858a82156e869	演示社区业务经办	active	2026-09-04 06:43:17.483614+08
31f52a2e-7d7f-40c3-b348-3171192ef57b	15500020003	scrypt:5ca8a57d73e466b272625da4b975ec45:83a1d087bc2c87446686380504bab34db5fb729fc8c673efcc3fdf307a0d3d325dd9b67625cdfeaad8f5e9bcc8fdcc20d3479827e9fdd380ccca00041d163ea8	演示社区公告编辑	active	2026-09-04 06:43:17.483614+08
0411f727-2341-4876-a635-31b501dae53d	15500020004	scrypt:811bb2cd2dfdf91f596c1ec92e606163:aaae3ca9d497b257c45281a02da0add29ab467ac991f379a754ebb5c97fe2fa829e4e1438618f046237705daddaa40ec312ebbe180cdaf8b0340de65d8e2a42f	演示社区材料审核	active	2026-09-04 06:43:17.483614+08
c43a96ab-a9b6-4153-8f1d-827f62826d74	15500020005	scrypt:45713b3f534441d3d85bd97ae65dcf5f:17fe9cb2d81e34ace6127fc1b5c86afab82fbfdb00cf14653a4032499a717cb14adb08d3351940ad4f3105e2f0b5865278e58c5a8c1655bb4ff4201878739d60	演示社区参选人	active	2026-09-04 06:43:17.483614+08
e0d78fe6-4231-4d23-8857-c7cd49236928	1661410165	scrypt:805d12601267dd3edab232492b99e27e:3486313607af140d822976779b1606d084865d009aeea40a7c3fd7c63c44a7ca7627c0d45dcb0b08707ae841b777b6f73aed81e81f022424a0a2f99350633371	操练村子管理	active	2026-09-04 07:00:13.884173+08
142e1d0c-b3b7-47da-8bb7-6be47b2e4513	16714101650	scrypt:4c89a2b1f7ffaa7cd14fd96c9ca19c59:f82fe7fae8f7dc380ad3b6c3f08235604acef640d17cdc2f97a104d1760fccc9cdc7f8fe117abf636296cce5d38c7cb22968e367971592fc924ce7d4db2c3136	操练村operator	active	2026-09-04 07:00:17.224432+08
2b9fe545-0e08-4850-8cc6-4c1168ab2b64	16714101651	scrypt:21427a644d01e658e91f26487abbfd6f:a084827ce6551c56ffa737b1fa0ac07e172e0366622770c6aa81ed17ce207cb2d9f72c77c1270c33fb94814bbd8fab3358910e29ce1b84a22e314b6776844447	操练村editor	active	2026-09-04 07:00:19.891312+08
a2a769b5-4f7c-45cd-9cde-a7ca392f4913	16714101652	scrypt:0918ac24fa345e7738116fae16a9ddff:eeca4d43592b06332248e1034f6f64c43d5e46c8b4d371bc804de9e2f3d4edf0ab0177a39512bd4ad3610c00740cda268d1318565ace3f57177fdf59e96a43d1	操练村reviewer	active	2026-09-04 07:00:22.571644+08
4cd6b406-73df-45a2-a0f6-c018630461a5	16714101653	scrypt:2ad479ffab4327e17974ee2ff556a706:2a5c97939e9542e31fa8697a9ee106d3479a30f57e8f3866d7336a3c81578ff467105dc94bb7541a735e3ea90c8681ed12e3820e13714acd74bdbfeec846ac71	操练村candidate	active	2026-09-04 07:00:25.248588+08
bedaa74c-687d-4074-9143-a2ee9309dc31	1662410165	scrypt:d2fd143cee99020db567853893a86288:e0953aeba16c10bd705b41a17ebe4e67ea7ce62a4bcfcbdb34aa58d9fe94b9e7bd4ab33eb6983a5e337d076ff6bdeca83a0fdc7e3cc764b18b3d8110aba675bc	操练社区子管理	active	2026-09-04 07:00:28.437536+08
f70c288b-4c56-4013-b2b8-e8e61e6692dd	16724101650	scrypt:9f6d151ec2f3530f4878ac3767258859:51f296ff42849dd3a17c175c0b349665b9f781bf40b45259fb136ba5cfb66660a06c0152521ab509f81b1561e8c4705481e1c19470f0ac73d38f88d03f9c3352	操练社区operator	active	2026-09-04 07:00:31.820736+08
9587780e-3fa7-4baf-b962-51e0ca531c20	16724101651	scrypt:2c7da2f0eeda7f5d1c4d1d0e227118b9:a5d063f6fd48fa28cec77c2a4a4daf4e88bd56a2f367e28d2bd8166eb2f80cfed1e5350dc0ddc875343e8a59c7432b06dede6021071991b0138904f3ceec2698	操练社区editor	active	2026-09-04 07:00:34.479774+08
86cd7275-0046-4950-a61a-14fdf1635913	16724101652	scrypt:2d8c7cf8250f9b5150016ecd1694e048:06c9509d16d3be77f05c29fe0768fed8c09d75c18e565958eddbe25af11ff47a9551a19d82db1a15080720ea6d7e6c743a3b1419e6f95791f69f3dbeab355351	操练社区reviewer	active	2026-09-04 07:00:37.141497+08
02644937-91a8-45db-9745-241b00257f3d	16724101653	scrypt:4be168ea6bc2c33545667cd8b9bfd9b7:95998b323acf9e49de27cfcf3ce4bdba7983517912ff4d191dcc53374f55532cc9af4b14cf10e051e470f21303022e3f86d0d64d7d1ff009766504b11ddc0fdc	操练社区candidate	active	2026-09-04 07:00:39.813298+08
\.


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
-- Name: stage_templates stage_templates_st_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stage_templates
    ADD CONSTRAINT stage_templates_st_key_key UNIQUE (st_key);


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

\unrestrict dd5OYHccpby2P8nIF9HAJTL54c7fWLWRhv9UFI3zcmJZ42Ycl3YgrznWpA7yoLK

