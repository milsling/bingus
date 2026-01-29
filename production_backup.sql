--
-- PostgreSQL database dump
--

\restrict 6qxwCvM57w4b5YrdDXtH6hyJFqlirNhR613c7C84RY0upWk7W01DxeRvzFrHwbG

-- Dumped from database version 16.11 (df20cf9)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: _system; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA _system;


ALTER SCHEMA _system OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: replit_database_migrations_v1; Type: TABLE; Schema: _system; Owner: neondb_owner
--

CREATE TABLE _system.replit_database_migrations_v1 (
    id bigint NOT NULL,
    build_id text NOT NULL,
    deployment_id text NOT NULL,
    statement_count bigint NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE _system.replit_database_migrations_v1 OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE; Schema: _system; Owner: neondb_owner
--

CREATE SEQUENCE _system.replit_database_migrations_v1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE OWNED BY; Schema: _system; Owner: neondb_owner
--

ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNED BY _system.replit_database_migrations_v1.id;


--
-- Name: achievement_badge_images; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.achievement_badge_images (
    id character varying NOT NULL,
    image_url text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.achievement_badge_images OWNER TO neondb_owner;

--
-- Name: adoptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.adoptions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    original_bar_id character varying NOT NULL,
    adopted_by_bar_id character varying NOT NULL,
    adopted_by_user_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.adoptions OWNER TO neondb_owner;

--
-- Name: ai_review_requests; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_review_requests (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    content text NOT NULL,
    category text NOT NULL,
    tags text[],
    explanation text,
    bar_type text DEFAULT 'single_bar'::text NOT NULL,
    beat_link text,
    full_rap_link text,
    ai_rejection_reasons text[],
    plagiarism_risk text,
    plagiarism_details text,
    user_appeal text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by character varying,
    reviewed_at timestamp without time zone,
    review_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ai_review_requests OWNER TO neondb_owner;

--
-- Name: ai_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ai_settings (
    id character varying DEFAULT 'default'::character varying NOT NULL,
    moderation_enabled boolean DEFAULT true NOT NULL,
    style_analysis_enabled boolean DEFAULT true NOT NULL,
    orphie_chat_enabled boolean DEFAULT true NOT NULL,
    bar_explanations_enabled boolean DEFAULT true NOT NULL,
    rhyme_suggestions_enabled boolean DEFAULT true NOT NULL,
    moderation_strictness text DEFAULT 'balanced'::text NOT NULL,
    auto_approve_enabled boolean DEFAULT true NOT NULL,
    orphie_personality text,
    orphie_greeting text,
    chat_rate_limit integer DEFAULT 50 NOT NULL,
    explanation_rate_limit integer DEFAULT 30 NOT NULL,
    suggestion_rate_limit integer DEFAULT 20 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by character varying
);


ALTER TABLE public.ai_settings OWNER TO neondb_owner;

--
-- Name: bar_sequence; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bar_sequence (
    id character varying DEFAULT 'singleton'::character varying NOT NULL,
    current_value integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.bar_sequence OWNER TO neondb_owner;

--
-- Name: bar_usages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bar_usages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    bar_id character varying NOT NULL,
    user_id character varying NOT NULL,
    usage_link text,
    comment text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bar_usages OWNER TO neondb_owner;

--
-- Name: bars; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bars (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    content text NOT NULL,
    category text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    explanation text,
    tags text[],
    feedback_wanted boolean DEFAULT false NOT NULL,
    proof_bar_id text,
    permission_status text DEFAULT 'share_only'::text NOT NULL,
    proof_hash text,
    is_featured boolean DEFAULT false NOT NULL,
    featured_at timestamp without time zone,
    is_original boolean DEFAULT true NOT NULL,
    bar_type text DEFAULT 'single_bar'::text NOT NULL,
    full_rap_link text,
    moderation_status text DEFAULT 'approved'::text NOT NULL,
    moderation_score integer,
    moderation_phrase_id character varying,
    is_recorded boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by character varying,
    deleted_reason text,
    beat_link text,
    is_locked boolean DEFAULT false NOT NULL,
    locked_at timestamp without time zone
);


ALTER TABLE public.bars OWNER TO neondb_owner;

--
-- Name: bookmarks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bookmarks (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    bar_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bookmarks OWNER TO neondb_owner;

--
-- Name: comment_dislikes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.comment_dislikes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    comment_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comment_dislikes OWNER TO neondb_owner;

--
-- Name: comment_likes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.comment_likes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    comment_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comment_likes OWNER TO neondb_owner;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.comments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    bar_id character varying NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comments OWNER TO neondb_owner;

--
-- Name: custom_achievements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.custom_achievements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    emoji text,
    description text NOT NULL,
    rarity text DEFAULT 'common'::text NOT NULL,
    condition_type text NOT NULL,
    threshold integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    approval_status text DEFAULT 'approved'::text NOT NULL,
    rule_tree jsonb,
    image_url text
);


ALTER TABLE public.custom_achievements OWNER TO neondb_owner;

--
-- Name: custom_categories; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.custom_categories (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text,
    image_url text,
    color text,
    background_color text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.custom_categories OWNER TO neondb_owner;

--
-- Name: custom_tags; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.custom_tags (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text,
    image_url text,
    animation text DEFAULT 'none'::text NOT NULL,
    color text,
    background_color text,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.custom_tags OWNER TO neondb_owner;

--
-- Name: debug_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.debug_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    action text NOT NULL,
    user_id character varying,
    target_id character varying,
    details text NOT NULL,
    success boolean DEFAULT true NOT NULL,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.debug_logs OWNER TO neondb_owner;

--
-- Name: direct_messages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.direct_messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    sender_id character varying NOT NULL,
    receiver_id character varying NOT NULL,
    content text NOT NULL,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.direct_messages OWNER TO neondb_owner;

--
-- Name: dislikes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.dislikes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    bar_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.dislikes OWNER TO neondb_owner;

--
-- Name: flagged_phrases; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.flagged_phrases (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    phrase text NOT NULL,
    normalized_phrase text NOT NULL,
    severity text DEFAULT 'flag'::text NOT NULL,
    similarity_threshold integer DEFAULT 80 NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.flagged_phrases OWNER TO neondb_owner;

--
-- Name: follows; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.follows (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    follower_id character varying NOT NULL,
    following_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.follows OWNER TO neondb_owner;

--
-- Name: friendships; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.friendships (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    requester_id character varying NOT NULL,
    receiver_id character varying NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.friendships OWNER TO neondb_owner;

--
-- Name: likes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.likes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    bar_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.likes OWNER TO neondb_owner;

--
-- Name: maintenance_status; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.maintenance_status (
    id character varying DEFAULT 'singleton'::character varying NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    message text,
    activated_at timestamp without time zone,
    activated_by character varying
);


ALTER TABLE public.maintenance_status OWNER TO neondb_owner;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    type text NOT NULL,
    actor_id character varying,
    bar_id character varying,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    comment_id character varying
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: password_reset_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.password_reset_codes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_codes OWNER TO neondb_owner;

--
-- Name: profile_badges; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.profile_badges (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    image_url text,
    emoji text,
    color text,
    background_color text,
    border_color text,
    animation text DEFAULT 'none'::text NOT NULL,
    rarity text DEFAULT 'common'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    linked_achievement_id text,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.profile_badges OWNER TO neondb_owner;

--
-- Name: protected_bars; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.protected_bars (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    content text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by character varying,
    similarity_threshold integer DEFAULT 80 NOT NULL
);


ALTER TABLE public.protected_bars OWNER TO neondb_owner;

--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.push_subscriptions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.push_subscriptions OWNER TO neondb_owner;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reports (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    reporter_id character varying NOT NULL,
    bar_id character varying,
    comment_id character varying,
    user_id character varying,
    reason text NOT NULL,
    details text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by character varying,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reports OWNER TO neondb_owner;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_achievements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    achievement_id text NOT NULL,
    unlocked_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_achievements OWNER TO neondb_owner;

--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_badges (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    badge_id character varying NOT NULL,
    source text DEFAULT 'owner_gift'::text NOT NULL,
    source_details text,
    granted_by character varying,
    granted_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_badges OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    bio text,
    avatar_url text,
    membership_tier text DEFAULT 'free'::text NOT NULL,
    membership_expires_at timestamp without time zone,
    location text,
    email text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    username_changed_at timestamp without time zone,
    is_owner boolean DEFAULT false NOT NULL,
    online_status text DEFAULT 'offline'::text NOT NULL,
    last_seen_at timestamp without time zone,
    message_privacy text DEFAULT 'friends_only'::text NOT NULL,
    banner_url text,
    displayed_badges text[],
    is_admin_plus boolean DEFAULT false NOT NULL,
    xp integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    last_xp_update timestamp without time zone DEFAULT now(),
    daily_xp_likes integer DEFAULT 0 NOT NULL,
    daily_xp_comments integer DEFAULT 0 NOT NULL,
    daily_xp_bookmarks integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.verification_codes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.verification_codes OWNER TO neondb_owner;

--
-- Name: replit_database_migrations_v1 id; Type: DEFAULT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1 ALTER COLUMN id SET DEFAULT nextval('_system.replit_database_migrations_v1_id_seq'::regclass);


--
-- Data for Name: replit_database_migrations_v1; Type: TABLE DATA; Schema: _system; Owner: neondb_owner
--

COPY _system.replit_database_migrations_v1 (id, build_id, deployment_id, statement_count, applied_at) FROM stdin;
1	e8e36f08-8b82-40cd-9dac-214897e26074	e88879bb-8177-46bc-9320-469ff535e396	6	2025-12-31 13:50:04.062332+00
2	536b1acc-7764-4912-aae7-68247da6b777	e88879bb-8177-46bc-9320-469ff535e396	1	2025-12-31 22:34:05.808536+00
3	e611e0b1-080f-4433-a907-b3dca5776e60	e88879bb-8177-46bc-9320-469ff535e396	1	2026-01-01 03:02:55.960263+00
4	45b23c9c-6e2c-4690-8188-0e1577a449ec	e88879bb-8177-46bc-9320-469ff535e396	3	2026-01-01 03:23:11.493833+00
5	6bcea933-955b-48da-b7c9-f1ee7b9443a7	e88879bb-8177-46bc-9320-469ff535e396	4	2026-01-01 03:37:41.056562+00
6	4e704a0e-a36e-4e14-8820-b62b6f7a4450	e88879bb-8177-46bc-9320-469ff535e396	5	2026-01-02 00:26:46.554947+00
7	b776b81f-36fb-4e4c-8103-5b212508902d	e88879bb-8177-46bc-9320-469ff535e396	5	2026-01-02 00:36:57.005358+00
8	1924788d-b0f5-454d-a3dd-4357f56f13a9	e88879bb-8177-46bc-9320-469ff535e396	9	2026-01-03 16:58:47.208759+00
9	e653c906-f788-4f80-a9bb-094513950656	e88879bb-8177-46bc-9320-469ff535e396	3	2026-01-03 17:27:52.83101+00
10	8d7db2b0-55f9-4a07-8603-d618c7162f49	e88879bb-8177-46bc-9320-469ff535e396	6	2026-01-03 21:57:26.573133+00
11	65c8ab32-05c6-483e-ba59-e41fefed999f	e88879bb-8177-46bc-9320-469ff535e396	1	2026-01-03 23:41:36.893388+00
12	cfadecab-9e35-43f8-b8a8-67c260a1dcbf	e88879bb-8177-46bc-9320-469ff535e396	3	2026-01-04 02:43:30.602933+00
13	c48e30e5-8c65-406d-8c48-527e9c4f1847	e88879bb-8177-46bc-9320-469ff535e396	2	2026-01-04 06:58:51.228508+00
14	8a9d6d0f-5d55-44fa-87d4-98491c2689aa	e88879bb-8177-46bc-9320-469ff535e396	18	2026-01-04 20:49:14.367886+00
15	5a7ade2f-e501-44c8-9607-513b7c62553c	e88879bb-8177-46bc-9320-469ff535e396	1	2026-01-04 23:31:28.184288+00
16	8a235c01-bbc2-40be-85a4-e556c4291a1c	e88879bb-8177-46bc-9320-469ff535e396	1	2026-01-05 03:02:20.95735+00
17	fa94ee72-eca1-4052-a648-58c3ded629bb	e88879bb-8177-46bc-9320-469ff535e396	3	2026-01-05 14:03:51.212362+00
18	2883ace4-ac86-45dc-812e-b0d51ef35873	e88879bb-8177-46bc-9320-469ff535e396	4	2026-01-06 05:52:44.396737+00
19	d1ecd2cc-cafa-4c77-a228-c6da3b4310a4	e88879bb-8177-46bc-9320-469ff535e396	5	2026-01-08 02:49:01.729707+00
20	cd0559b0-65e6-47c9-97d9-53b54590238b	e88879bb-8177-46bc-9320-469ff535e396	3	2026-01-08 10:20:23.678067+00
21	ba6bbfff-353c-42d0-a3ad-ffe1ea732c93	e88879bb-8177-46bc-9320-469ff535e396	2	2026-01-09 04:33:42.80661+00
22	881ff1b4-af9c-4843-8ce3-9f474d08f1c2	e88879bb-8177-46bc-9320-469ff535e396	11	2026-01-15 13:42:59.558593+00
23	efe0be9f-796f-4bd3-891c-c838c4ce7ff0	e88879bb-8177-46bc-9320-469ff535e396	3	2026-01-16 02:38:44.875897+00
24	baa89208-5c15-47b1-a138-32a42d717af0	e88879bb-8177-46bc-9320-469ff535e396	6	2026-01-16 03:24:08.418042+00
25	64e329bc-d6b7-47bf-b1e1-99ecddaf340a	e88879bb-8177-46bc-9320-469ff535e396	2	2026-01-22 00:52:29.844882+00
26	9c0bae9a-5dff-4b7f-84b8-64a854d6fb42	e88879bb-8177-46bc-9320-469ff535e396	1	2026-01-22 14:33:46.008981+00
27	90588526-4d74-41c0-ace4-1fbcbc950e08	e88879bb-8177-46bc-9320-469ff535e396	2	2026-01-22 21:13:18.620788+00
\.


--
-- Data for Name: achievement_badge_images; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.achievement_badge_images (id, image_url, updated_at) FROM stdin;
\.


--
-- Data for Name: adoptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.adoptions (id, original_bar_id, adopted_by_bar_id, adopted_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: ai_review_requests; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ai_review_requests (id, user_id, content, category, tags, explanation, bar_type, beat_link, full_rap_link, ai_rejection_reasons, plagiarism_risk, plagiarism_details, user_appeal, status, reviewed_by, reviewed_at, review_notes, created_at) FROM stdin;
3f3ceb87-20bb-44bb-adb0-26eb909fa9da	2f6354fe-c1ab-442a-b3eb-a49348029dfe	<p style="font-style: normal; font-variant-caps: normal; font-width: normal; font-size: 12px; line-height: normal; font-family: Helvetica; font-size-adjust: none; font-kerning: auto; font-variant-alternates: normal; font-variant-ligatures: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; font-variant-emoji: normal; font-feature-settings: normal; font-optical-sizing: auto; font-variation-settings: normal;">Fucking nigger heil Hitler and while you're down ducking my dick grab the stapler Fucking kike nigger making me feel bad when in reality you're the fucking faggot taking dick in the ass from your dad</p>	Freestyle	{Niggers}	Fuck niggers	single_bar	\N	\N	{"Content contains prohibited language that violates our community guidelines."}	none	\N	Dude it’s not that bad	rejected	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-16 17:37:39.587	Listen here nigger only one saying nigger around here is me you good for nothing jigaboo	2026-01-16 13:52:59.552044
\.


--
-- Data for Name: ai_settings; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.ai_settings (id, moderation_enabled, style_analysis_enabled, orphie_chat_enabled, bar_explanations_enabled, rhyme_suggestions_enabled, moderation_strictness, auto_approve_enabled, orphie_personality, orphie_greeting, chat_rate_limit, explanation_rate_limit, suggestion_rate_limit, updated_at, updated_by) FROM stdin;
default	t	t	t	t	t	lenient	t	Orphie is snoop dog.	Whaddup cuh?	50	30	20	2026-01-23 00:43:22.392	2c3fcef7-59eb-4585-a7dc-4d14324afad9
\.


--
-- Data for Name: bar_sequence; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.bar_sequence (id, current_value) FROM stdin;
singleton	20
\.


--
-- Data for Name: bar_usages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.bar_usages (id, bar_id, user_id, usage_link, comment, created_at) FROM stdin;
e5fb1dde-a0e5-4b28-ae77-0a68d0ca614b	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 00:46:28.833272
daee7e14-e75c-44dc-9bd9-d1957b277d37	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 00:46:38.803407
e08151ba-554a-43f9-9d43-fd0d192fec58	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:18:00.852703
47d475eb-439a-4390-9ca7-53ae72b5c3e6	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:18:02.765508
4ecde297-1821-4da1-88de-8ace04e7a1d7	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:18:04.622992
e2e1cc94-ffea-48d4-9562-0f4e414eae87	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:18:06.354633
7e6b0163-2988-4f88-9f41-bfd119a67708	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:18:07.718043
9a43339c-c0ea-45e1-8e99-53e2e0ff1aeb	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:18:10.190737
b0ce05aa-8a7c-4f58-9656-d5b9bcb720eb	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:18:12.009579
68d16a66-d87d-4206-bea5-344eb6bf166f	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:05.146711
d985ade8-8067-4afd-adfa-daa0d554a610	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:07.331002
33e165e1-bdf4-42fc-8c32-42db00df1e6e	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:08.964217
279a865f-716a-4a02-bef5-85a8db1f8032	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:10.499075
97daa48a-a409-4087-8b8b-3ebc25bbb010	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:12.046763
64268247-045f-48dc-b52f-5b23d04bbd17	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:13.578598
ff16d65c-aeb4-4c6b-8725-6d27667c32a7	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:14.997887
bc9e1e9b-90c5-478d-9d3f-baaf371c988a	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:16.13234
8e99bbd0-85fa-4f9d-a9fd-6eba26e3bb17	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:18.105042
9a9c3b6d-0bd6-47ee-b0f2-5db154d1c778	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:19.440598
143bf390-dfaa-42da-ac2d-22d4a2a0c460	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:23.614527
b2a08527-67b6-42f2-94d0-6d88d45b23f6	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:25.435916
840852eb-c35e-4daf-a809-2cd7fc8c6b07	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:27.204687
efd9ac1e-3386-4869-8ab3-e8340ad3583a	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:29.281656
ada7d0a1-e1f4-479e-9eed-c042d6d6e82e	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:31.197371
784f0da4-4b0c-495e-b690-e103c3d41f50	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:32.682732
0cdf4635-da17-4ce3-8cfc-c264fb6bceb5	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	\N	2026-01-11 04:19:34.799225
4c77d997-1c12-4b92-af16-622b37da2823	fa923eaf-7b99-4932-b8a9-6a6200804d93	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	Used this in a rap battle and lost	2026-01-11 04:20:54.185532
871642e9-5880-4891-93da-4226c565925b	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	1520cea1-ed54-4add-8d3b-37260aa10746	\N	I won	2026-01-12 04:07:46.322621
\.


--
-- Data for Name: bars; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.bars (id, user_id, content, category, created_at, explanation, tags, feedback_wanted, proof_bar_id, permission_status, proof_hash, is_featured, featured_at, is_original, bar_type, full_rap_link, moderation_status, moderation_score, moderation_phrase_id, is_recorded, deleted_at, deleted_by, deleted_reason, beat_link, is_locked, locked_at) FROM stdin;
21e1789c-09c6-4334-aa8b-7c4b3c8a2d7d	2c3fcef7-59eb-4585-a7dc-4d14324afad9	<p class="p1" style="font-width: normal; font-size: 17px; line-height: normal; font-size-adjust: none; font-kerning: auto; font-variant-alternates: normal; font-variant-ligatures: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; font-feature-settings: normal; font-optical-sizing: auto; font-variation-settings: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); white-space: normal; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto;"><span class="s1" style="font-family: UICTFontTextStyleBody;">Take an L? No thanks&nbsp;</span><span class="s2" style="font-family: UICTFontTextStyleEmphasizedBody;"><b>ain’t for me</b></span><span class="s1" style="font-family: UICTFontTextStyleBody;">&nbsp;&nbsp;</span></p><p class="p2" style="font-width: normal; font-size: 17px; line-height: normal; font-size-adjust: none; font-kerning: auto; font-variant-alternates: normal; font-variant-ligatures: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; font-feature-settings: normal; font-optical-sizing: auto; font-variation-settings: normal; min-height: 22px; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); white-space: normal; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto;"><span class="s1" style="font-family: UICTFontTextStyleBody;"></span><br></p><p class="p1" style="font-width: normal; font-size: 17px; line-height: normal; font-size-adjust: none; font-kerning: auto; font-variant-alternates: normal; font-variant-ligatures: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; font-feature-settings: normal; font-optical-sizing: auto; font-variation-settings: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); white-space: normal; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto;"><span class="s1" style="font-family: UICTFontTextStyleBody;">Even if I was a&nbsp;</span><span class="s3" style="font-family: UICTFontTextStyleEmphasizedItalicBody; font-weight: bold; font-style: italic;">podiatrist</span><span class="s1" style="font-family: UICTFontTextStyleBody;">&nbsp;, with a schedule&nbsp;</span><span class="s4" style="font-family: UICTFontTextStyleItalicBody; font-style: italic;">packed full&nbsp;</span><span class="s1" style="font-family: UICTFontTextStyleBody;">of&nbsp;</span><span class="s4" style="font-family: UICTFontTextStyleItalicBody; font-style: italic;">assholes</span><span class="s1" style="font-family: UICTFontTextStyleBody;">&nbsp;with&nbsp;</span><span class="s4" style="font-family: UICTFontTextStyleItalicBody; font-style: italic;">smashed toes</span><span class="s1" style="font-family: UICTFontTextStyleBody;">,</span></p><p class="p2" style="font-width: normal; font-size: 17px; line-height: normal; font-size-adjust: none; font-kerning: auto; font-variant-alternates: normal; font-variant-ligatures: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; font-feature-settings: normal; font-optical-sizing: auto; font-variation-settings: normal; min-height: 22px; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); white-space: normal; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto;"><span class="s1" style="font-family: UICTFontTextStyleBody;"></span><br></p><p class="p1" style="font-width: normal; font-size: 17px; line-height: normal; font-size-adjust: none; font-kerning: auto; font-variant-alternates: normal; font-variant-ligatures: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; font-feature-settings: normal; font-optical-sizing: auto; font-variation-settings: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); white-space: normal; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto;"><span class="s1" style="font-family: UICTFontTextStyleBody;">I still wouldn’t&nbsp;</span><span class="s2" style="font-family: UICTFontTextStyleEmphasizedBody; font-weight: bold;">face&nbsp;</span><span class="s3" style="font-family: UICTFontTextStyleEmphasizedItalicBody; font-weight: bold; font-style: italic;">the-</span><span class="s2" style="font-family: UICTFontTextStyleEmphasizedBody; font-weight: bold;">feet</span><span class="s1" style="font-family: UICTFontTextStyleBody;">. <i>(Defeat)</i></span></p>	Freestyle	2026-01-03 22:11:44.186813	Podiatrist = Foot doctor	{}	f	orphanbars-#00001	share_only	2dbdaea5583c009b452bd4d5cfe8ea83cc8674cfb18bfd7862fb85a6dc1cf05e	f	\N	t	single_bar	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-06 06:38:35.906
273dc2db-1aa4-4d3d-aba1-3ca0a5e36ebc	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	Baby if I get caught pass a fire,  leave more body's than Michael Myers, flipped on me with taps and wires, fixed it with a pair of pliers like winders.	Freestyle	2026-01-05 13:56:38.438303	Bars	{Bars}	f	orphanbars-#00010	share_only	0d2c1c53c0ee3f3b5cfc3b78e1b5ce2cff72f64aa72a7319ee212fb0e53d71a6	f	\N	t	single_bar	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-06 11:40:24.67
3b9610dc-9ecd-435e-a9cd-195c8ab1fbad	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	I have more bars than a cell not talking phones, talking ones where you dont sleep fight to eat and dont go home, watch your friends hand get cut off and he starts shanking with the bone, bleed out get your body cold as an ice cream cone, family only found out cause the co follows the code, and multiple picked up crome to hit domes, to blow because they brothers now a stone that can't atone.	Freestyle	2026-01-04 03:16:44.14638	\N	{"Prison/jail bar"}	f	orphanbars-#00012	share_only	dbd0ed582d71fc4a125be4d2a33de9d238f6ba1fbd1dd3852253d0c1f5d72657	f	\N	t	single_bar	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-06 11:41:06.572
641beeb6-ce3f-4578-bdbd-6fb6a95a95d1	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	1	Freestyle	2026-01-08 03:49:18.102217	\N	{}	f	\N	share_only	\N	f	\N	f	single_bar	\N	approved	\N	\N	f	2026-01-08 03:51:46.104	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	\N	f	\N
0af27598-4375-4aa2-81b8-ebcd18bc3388	2c3fcef7-59eb-4585-a7dc-4d14324afad9	Moving at the speed of a man with 80 hasty feet friction raised the kitchen temperature by 83 degrees	Freestyle	2026-01-04 10:22:51.553581	\N	{Funny,"vivid imagery",hyperbole}	f	orphanbars-#00005	share_only	50c51288b9cb44c1773d41b3fbdaba5cedb63f7f11267acd2805455e66eaea6f	f	\N	t	single_bar	https://www.rappad.co/rap/1074112	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-06 06:37:53.63
e1aa38be-8e07-4eb8-b292-614d574c277b	2c3fcef7-59eb-4585-a7dc-4d14324afad9	<p class="p1" style="font-width: normal; font-size: 17px; line-height: normal; font-size-adjust: none; font-kerning: auto; font-variant-alternates: normal; font-variant-ligatures: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; font-feature-settings: normal; font-optical-sizing: auto; font-variation-settings: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); white-space: normal; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto;"><span class="s1" style="font-family: UICTFontTextStyleBody;"><i>&nbsp;Allegation statements<b> state that </b></i>I'm precision <i>sprayer</i>&nbsp;</span></p><p class="p1" style="font-width: normal; font-size: 17px; line-height: normal; font-size-adjust: none; font-kerning: auto; font-variant-alternates: normal; font-variant-ligatures: normal; font-variant-numeric: normal; font-variant-east-asian: normal; font-variant-position: normal; font-feature-settings: normal; font-optical-sizing: auto; font-variation-settings: normal; caret-color: rgb(0, 0, 0); color: rgb(0, 0, 0); white-space: normal; -webkit-tap-highlight-color: rgba(26, 26, 26, 0.3); -webkit-text-size-adjust: auto;"><span class="s1" style="font-family: UICTFontTextStyleBody;"><i>I don’t pray</i>, I <b><i>spray-fillet</i></b> the <i>fakers</i> like a razor with a <i>lazer</i>,&nbsp;</span><span style="font-family: UICTFontTextStyleBody;">while I trim my facial hair </span><i style="font-family: UICTFontTextStyleBody;">flavor</i><span style="font-family: UICTFontTextStyleBody;"> </span><i style="font-family: UICTFontTextStyleBody;">savor never&nbsp;</i><span style="font-family: UICTFontTextStyleBody;">&nbsp;miss a hair with my straight bladed </span><i style="font-family: UICTFontTextStyleBody;">razor.</i></p>	Funny	2026-01-04 02:16:30.632489	Multisyllabic madness, internals, Heavy alliteration/assonance	{"#PrecisionSprayer #RazorLaser #BarberBars #RapLyrics #OrphanBars #HipHop #Rap #Bars #Lyricism #Wordplay #UndergroundRap #Freestyle #NewMusic #HipHopCulture #TrapLyrics"}	f	orphanbars-#00003	share_only	563a325dbf4b22a9e668418859fe7b1add48d87a2c4b9ce8ebc695e1779582a9	f	\N	t	single_bar	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-06 06:38:09.245
dc552827-6566-41ca-978d-d259cbea1b1c	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	Dudes take tubes in poop shoots. Boobs	Freestyle	2026-01-04 21:52:54.73839	\N	{"Dudes #philosophical #brainpower #realbars"}	f	orphanbars-#00011	share_only	013bf898ede44e9dc4280399298aa7d6e674416b6bb6a5ef52903402255173b9	f	\N	t	single_bar	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-06 11:40:47.48
fa923eaf-7b99-4932-b8a9-6a6200804d93	2f6354fe-c1ab-442a-b3eb-a49348029dfe	Dick is crying to please stop the violence, it’s only justice for sticking up around kids	Storytelling	2026-01-04 21:18:33.632222	\N	{}	f	orphanbars-#00007	open_adopt	8f19c4dfe606a40df28ac26d0a0a29c9520ca6ce761d54a24bf62eafabb4fefe	f	\N	t	single_bar	\N	approved	\N	\N	f	\N	\N	\N	\N	f	\N
851e3eae-1b3e-4b4d-bd2b-8217ffa6fe54	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	My spelling is immaculate never used autocorrect, catch me outside and see how the auto corrects, from AK's to tecs get your face shred from the apex, put more pieces and rounds in your chest than chess.	Freestyle	2026-01-03 22:37:10.044991	Bored	{"Gun bar"}	f	orphanbars-#00013	share_only	6236eb8d8ad3b6a2419dbe349a202340dae3bbbe06e850ac1525c3f77e67dfbd	f	\N	t	single_bar	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-06 11:41:12.108
e1eec35d-54ed-416c-8bcd-416fb7df796c	2c3fcef7-59eb-4585-a7dc-4d14324afad9	I’m armed to the teeth like starfish are anatomically.	Freestyle	2026-01-04 21:16:54.339993	Starfish are essentially a mouth surrounded by five arms. I mean, that’s like as armed to the teeth as you can get.	{Funny,anatomy,"starfish armed to the teeth","starfish anatomy","regenerative vibes","overprepared af","defense mode","spiky energy","nature’s tank","unbreakable comeback","biology humor","marine badass","armed like a starfish","tooled up","natural armor","regen king","sea creature flex"}	f	orphanbars-#00006	share_only	110b108ff13c876c65cccbdec86da5484421adaacbe9894ec157087c06f67df0	f	\N	t	single_bar	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-06 06:37:32.056
abd59686-d9c0-4257-a33b-bcbc2c84ede4	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	2	Freestyle	2026-01-08 03:49:30.244126	\N	{}	f	\N	share_only	\N	f	\N	f	single_bar	\N	approved	\N	\N	f	2026-01-08 03:51:43.08	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	\N	f	\N
4eb6e1de-d661-4cba-adad-58189d7e3a0b	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	3	Freestyle	2026-01-08 03:50:05.93876	\N	{}	f	\N	share_only	\N	f	\N	f	single_bar	\N	approved	\N	\N	f	2026-01-08 03:51:39.891	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	\N	f	\N
7626b620-7bea-43c6-8e73-ef4bdbac124f	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	4	Freestyle	2026-01-08 03:50:20.702335	\N	{}	f	\N	share_only	\N	f	\N	f	single_bar	\N	approved	\N	\N	f	2026-01-08 03:51:35.724	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	\N	f	\N
3c0e501e-9b17-4ac1-992c-7c26dfefb1ee	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	5	Freestyle	2026-01-08 03:50:31.102333	\N	{}	f	\N	share_only	\N	f	\N	f	single_bar	\N	approved	\N	\N	f	2026-01-08 03:51:32.459	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	\N	f	\N
c84ef0de-496a-4329-976c-a8bcd7007358	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	6	Freestyle	2026-01-08 03:50:43.125877	\N	{}	f	\N	share_only	\N	f	\N	f	single_bar	\N	approved	\N	\N	f	2026-01-08 03:51:28.684	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	\N	f	\N
95d6310c-a68d-4c87-aaea-c2f70cc02705	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	7	Freestyle	2026-01-08 03:51:05.592624	\N	{}	f	\N	share_only	\N	f	\N	f	single_bar	\N	approved	\N	\N	f	2026-01-08 03:51:25.313	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	\N	f	\N
152e4f6f-0843-42eb-8d10-577ba183f20a	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	Real eyes realize real lies watch life like a movie and see where the reel lies.	Freestyle	2026-01-08 03:56:56.68953	\N	{}	f	orphanbars-#00014	share_only	ab9e6c693cd94e3390aceda2e0af1dda05226590461dd13acfb6a22bdc2e1703	f	\N	t	single_bar	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-08 03:59:07.566
45f2d76d-9012-4d27-a177-860bc2493253	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	As a kid I played i spy not the nice kind,  I spy a guy with one eye that was left to die, never cry run away go and hide, who's coming who knows keep the door closed before the widows crawling in the windows get close.	Freestyle	2026-01-08 04:08:19.993958	\N	{"#Suspence #horror"}	f	orphanbars-#00015	share_only	73788b4d132056b856a7b11c7a72e764bb54da20d407340997ef8808f40f74af	f	\N	t	snippet	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-08 04:08:20.854
5dcee9f1-a8fb-4667-8668-60bd651a9e97	2f6354fe-c1ab-442a-b3eb-a49348029dfe	Good god Its gonna drop squattin on your grave like homeless sumo\nPushin log so grab ya glove, you bout to catch grenade like Bruno	Freestyle	2026-01-16 14:39:42.723946	\N	{Funny}	f	orphanbars-#00019	share_only	570c87d8e6820b8ec4003657bb2c2c6027a88763e554738b02859ffa0f583e7f	f	\N	t	single_bar	\N	approved	\N	\N	f	2026-01-16 17:32:29.45	2c3fcef7-59eb-4585-a7dc-4d14324afad9	You can’t steal from God	\N	t	2026-01-16 14:39:53.409
dde2ade8-f234-40c6-9253-ee4087fbd157	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	I'm actually bored when I box so I fold in with scotch.	Wordplay	2026-01-08 04:15:11.168409	Bored but board like cardboard.  box like cardboard box. Fold the box. And I do so with scotch tape. But also im bored when I do daily things such as boxing so I hold my emotions(fold in) with alcohol (scotch).	{Box}	f	orphanbars-#00016	share_only	d53d9165e69b4beafc3a4e06def6878f085bba820ff390caa71f9890ef3bac48	f	\N	t	single_bar	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-08 04:19:55.772
25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2c3fcef7-59eb-4585-a7dc-4d14324afad9	Spent my entire adult life playing with fire  \nIlliterate with punctuality—don’t know when to pause….. or why I’m still hired.	Wordplay	2026-01-11 00:45:38.876986	Where do I put these commas??	{Wordplay,"self roast",self-aware,real,entendre,grammar,triple,comma,illiterate,late,work,"on time"}	f	orphanbars-#00017	open_adopt	70555058800d4ca49b8c6ed85c83a59c712533af17c790fb02ea0b055fcc78d4	f	\N	t	single_bar	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-11 00:45:39.862
db845699-e7fb-40c7-b250-d29ae4349712	19f337b1-c1c1-450e-8a84-3a4efac4934f	<span style="font-size:20px" ;="">Damn I forgot again...</span>\n<span style="font-size:20px" ;="">Looking back now and then</span>\n<span style="font-size:20px" ;="">How long has it really been? </span><br><span style="font-size:20px" ;="">Feels like it was yesterday, 20 years ago, and everywhere in between</span>\n<span style="font-size:20px" ;="">Time doesn't affect memories and that's the only place you're seen </span><!--/data/user/0/com.samsung.android.app.notes/files/clipdata/clipdata_bodytext_260123_184441_592.sdocx-->	Storytelling	2026-01-24 02:53:22.386417	\N	{Dark}	f	\N	share_only	\N	f	\N	t	snippet	\N	approved	\N	\N	f	2026-01-24 02:59:18.306	19f337b1-c1c1-450e-8a84-3a4efac4934f	\N	\N	f	\N
53992773-3127-4f5b-bf02-34a24fd08175	2c3fcef7-59eb-4585-a7dc-4d14324afad9	Shit I know I can be rude ho <b><i>I’m so brutal</i></b>\nThis Bitch rub me the wrong way like <i><b>isobutyl</b></i> \nThe shit I drives me insane<i> my minds so loco </i>\nneed a bad bitch to rub me right <i>like isopropyl</i>	Freestyle	2026-01-17 02:17:28.750511	Rubbing alcohol	{"rude bars","brutal honesty","savage lines","isopropyl rub","isobutyl bitch","chemical romance","loco mind","bad bitch energy","alcohol reference bars","rubbing me wrong","rubbing me right","toxic masculinity flex","unfiltered bars","orphan bars","street chemistry"}	f	orphanbars-#00020	share_only	8bebb73fa0d3c5fa3013cfa47b1357ef15b271554b72ab73e5152c08ede518b9	f	\N	t	snippet	\N	approved	\N	\N	f	\N	\N	\N	\N	t	2026-01-17 02:17:30.431
6042545a-45ff-4ff4-96e9-c378728c5c71	2f6354fe-c1ab-442a-b3eb-a49348029dfe	Fucking nigger heil Hitler and while you’re down ducking my dick grab the stapler<div>Fucking kike nigger making me feel bad when in reality you’re the fucking faggot taking dick in the ass from your dad</div>	Freestyle	2026-01-16 02:41:28.917984	Nigger bar	{"Fuck niggers"}	f	orphanbars-#00018	open_adopt	60abf070c1aec73a705da8db80f976a8ce291a23c932d8a911abdc580a35786a	f	\N	t	single_bar	\N	approved	\N	\N	f	2026-01-16 02:44:30.154	2f6354fe-c1ab-442a-b3eb-a49348029dfe	\N	\N	t	2026-01-16 02:41:29.716
e1038043-6172-4335-8e26-1f7d47615a63	19f337b1-c1c1-450e-8a84-3a4efac4934f	<span style="font-size:20px" ;="">Damn I forgot again...</span>\n<span style="font-size:20px" ;="">Looking back now and then</span>\n<span style="font-size:20px" ;="">How long has it really been? </span><br><br><span style="font-size:20px" ;="">Feels like it was yesterday, 20 years ago, and everywhere in between</span>\n<span style="font-size:20px" ;="">Time doesn't affect memories and that's the only place you're seen </span><!--/data/user/0/com.samsung.android.app.notes/files/clipdata/clipdata_bodytext_260123_184441_592.sdocx-->	Storytelling	2026-01-24 02:52:22.314336	\N	{Dark}	f	\N	share_only	\N	f	\N	t	snippet	\N	approved	\N	\N	f	\N	\N	\N	\N	f	\N
\.


--
-- Data for Name: bookmarks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.bookmarks (id, user_id, bar_id, created_at) FROM stdin;
1469e80e-0d22-423a-89c0-09eb4f121c39	2c3fcef7-59eb-4585-a7dc-4d14324afad9	21e1789c-09c6-4334-aa8b-7c4b3c8a2d7d	2026-01-04 01:17:43.818293
7b636c4d-0db0-4fc4-a135-dbe9140c3430	2c3fcef7-59eb-4585-a7dc-4d14324afad9	53992773-3127-4f5b-bf02-34a24fd08175	2026-01-23 21:09:25.491908
\.


--
-- Data for Name: comment_dislikes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.comment_dislikes (id, user_id, comment_id, created_at) FROM stdin;
\.


--
-- Data for Name: comment_likes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.comment_likes (id, user_id, comment_id, created_at) FROM stdin;
67dbd603-cdb0-42d1-bd17-0d1fe34bfba0	1520cea1-ed54-4add-8d3b-37260aa10746	3173b1d5-5093-4867-a659-ed8c9903a92b	2026-01-12 03:48:27.163449
d9beecf4-ae26-4736-8e74-1a6c24bc914e	2c3fcef7-59eb-4585-a7dc-4d14324afad9	15e11d75-a3b9-4261-90d1-47d138e50227	2026-01-15 14:05:15.599471
acb3c7af-84f4-45d3-b2c8-28e60d899946	2c3fcef7-59eb-4585-a7dc-4d14324afad9	b0d30e24-6ebc-41fc-ad4a-78c3e29b965c	2026-01-15 14:05:17.233048
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.comments (id, user_id, bar_id, content, created_at) FROM stdin;
3173b1d5-5093-4867-a659-ed8c9903a92b	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dc552827-6566-41ca-978d-d259cbea1b1c	whAT THE🔥🔥🔥	2026-01-04 22:48:24.857362
b0d30e24-6ebc-41fc-ad4a-78c3e29b965c	2c3fcef7-59eb-4585-a7dc-4d14324afad9	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	Who are you??	2026-01-12 03:47:21.647495
15e11d75-a3b9-4261-90d1-47d138e50227	1520cea1-ed54-4add-8d3b-37260aa10746	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	Well I’m definitely not you.	2026-01-12 03:54:48.280895
\.


--
-- Data for Name: custom_achievements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.custom_achievements (id, name, emoji, description, rarity, condition_type, threshold, is_active, created_by, created_at, approval_status, rule_tree, image_url) FROM stdin;
0d9617c6-1686-4e06-af66-b910c8536129	Human Traffic-King	🚦	“Adopt 25 different bars from the Orphanage”	epic	bars_adopted	27	t	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-08 03:24:46.048539	approved	\N	https://ibb.co/b54yzmcg
\.


--
-- Data for Name: custom_categories; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.custom_categories (id, name, display_name, image_url, color, background_color, sort_order, is_active, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: custom_tags; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.custom_tags (id, name, display_name, image_url, animation, color, background_color, is_active, created_by, created_at) FROM stdin;
2ba98a53-aa01-4955-84d5-e8fad8316e63	chemist	CHEMIST	\N	sparkle	\N	#d357fe	t	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-16 02:53:20.992736
\.


--
-- Data for Name: debug_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.debug_logs (id, action, user_id, target_id, details, success, error_message, created_at) FROM stdin;
f06aac1e-096b-4254-aae4-58f4076feb56	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1038043-6172-4335-8e26-1f7d47615a63	{"barId":"e1038043-6172-4335-8e26-1f7d47615a63","userId":"2c3fcef7-59eb-4585-a7dc-4d14324afad9","username":"Milsling","timestamp":"2026-01-24T09:47:49.705Z","barExists":true,"barOwnerId":"19f337b1-c1c1-450e-8a84-3a4efac4934f","liked":true,"verified":true,"newLikeCount":1,"duration":1223,"notificationSent":true,"error":"syntax error at or near \\"=\\"","stack":"error: syntax error at or near \\"=\\"\\n    at /home/runner/workspace/dist/index.cjs:70:13330\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\\n    at async /home/runner/workspace/dist/index.cjs:70:28668\\n    at async Xx.getUserMetricsForAchievements (/home/runner/workspace/dist/index.cjs:70:61608)\\n    at async Xx.checkAndUnlockAchievements (/home/runner/workspace/dist/index.cjs:70:54689)\\n    at async /home/runner/workspace/dist/index.cjs:244:20905"}	f	syntax error at or near "="	2026-01-24 09:47:50.944017
f61e3d31-cb4d-45a9-8384-79ca882566f9	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1038043-6172-4335-8e26-1f7d47615a63	{"barId":"e1038043-6172-4335-8e26-1f7d47615a63","userId":"2c3fcef7-59eb-4585-a7dc-4d14324afad9","username":"Milsling","timestamp":"2026-01-24T09:47:56.028Z","barExists":true,"barOwnerId":"19f337b1-c1c1-450e-8a84-3a4efac4934f","liked":false,"verified":false,"newLikeCount":0,"duration":153}	t	\N	2026-01-24 09:47:56.198576
c7c7b84a-dd65-4e60-adbf-bbdb427928fe	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1038043-6172-4335-8e26-1f7d47615a63	{"barId":"e1038043-6172-4335-8e26-1f7d47615a63","userId":"2c3fcef7-59eb-4585-a7dc-4d14324afad9","username":"Milsling","timestamp":"2026-01-24T09:47:59.921Z","barExists":true,"barOwnerId":"19f337b1-c1c1-450e-8a84-3a4efac4934f","liked":true,"verified":true,"newLikeCount":1,"duration":1189,"notificationSent":true,"error":"syntax error at or near \\"=\\"","stack":"error: syntax error at or near \\"=\\"\\n    at /home/runner/workspace/dist/index.cjs:70:13330\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\\n    at async /home/runner/workspace/dist/index.cjs:70:28668\\n    at async Xx.getUserMetricsForAchievements (/home/runner/workspace/dist/index.cjs:70:61608)\\n    at async Xx.checkAndUnlockAchievements (/home/runner/workspace/dist/index.cjs:70:54689)\\n    at async /home/runner/workspace/dist/index.cjs:244:20905"}	f	syntax error at or near "="	2026-01-24 09:48:01.127321
77eb9814-61b3-47d7-afb2-a6cdd9862ec9	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1038043-6172-4335-8e26-1f7d47615a63	{"barId":"e1038043-6172-4335-8e26-1f7d47615a63","userId":"2c3fcef7-59eb-4585-a7dc-4d14324afad9","username":"Milsling","timestamp":"2026-01-24T09:49:20.213Z","barExists":true,"barOwnerId":"19f337b1-c1c1-450e-8a84-3a4efac4934f","liked":false,"verified":false,"newLikeCount":0,"duration":140}	t	\N	2026-01-24 09:49:20.369647
6dafc024-7c6e-42ee-b899-7e1f89f1abaa	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1038043-6172-4335-8e26-1f7d47615a63	{"barId":"e1038043-6172-4335-8e26-1f7d47615a63","userId":"2c3fcef7-59eb-4585-a7dc-4d14324afad9","username":"Milsling","timestamp":"2026-01-24T09:49:21.756Z","barExists":true,"barOwnerId":"19f337b1-c1c1-450e-8a84-3a4efac4934f","liked":true,"verified":true,"newLikeCount":1,"duration":1117,"notificationSent":true,"error":"syntax error at or near \\"=\\"","stack":"error: syntax error at or near \\"=\\"\\n    at /home/runner/workspace/dist/index.cjs:70:13330\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\\n    at async /home/runner/workspace/dist/index.cjs:70:28668\\n    at async Xx.getUserMetricsForAchievements (/home/runner/workspace/dist/index.cjs:70:61608)\\n    at async Xx.checkAndUnlockAchievements (/home/runner/workspace/dist/index.cjs:70:54689)\\n    at async /home/runner/workspace/dist/index.cjs:244:20905"}	f	syntax error at or near "="	2026-01-24 09:49:22.889616
e77b1c3a-79ef-433d-83af-6757f52d4727	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1038043-6172-4335-8e26-1f7d47615a63	{"barId":"e1038043-6172-4335-8e26-1f7d47615a63","userId":"2c3fcef7-59eb-4585-a7dc-4d14324afad9","username":"Milsling","timestamp":"2026-01-24T09:49:26.543Z","barExists":true,"barOwnerId":"19f337b1-c1c1-450e-8a84-3a4efac4934f","liked":false,"verified":false,"newLikeCount":0,"duration":149}	t	\N	2026-01-24 09:49:26.708349
\.


--
-- Data for Name: direct_messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.direct_messages (id, sender_id, receiver_id, content, read_at, created_at) FROM stdin;
5aa7a0a4-5423-4c71-ad0d-225a1bcdeed5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2f6354fe-c1ab-442a-b3eb-a49348029dfe	No pedo shit cuZ	2026-01-04 21:11:21.335	2026-01-03 04:02:19.319281
850c9549-1ca6-4dd1-b033-d460a4895ea1	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2f6354fe-c1ab-442a-b3eb-a49348029dfe	Kkk	2026-01-04 21:11:21.335	2026-01-04 10:24:40.80311
0ca5493e-402a-4416-b24e-9601330791aa	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2f6354fe-c1ab-442a-b3eb-a49348029dfe	Kkk	2026-01-04 21:11:21.335	2026-01-04 10:24:53.045455
50dfd9a5-88e6-4b5a-a83b-677d621d454a	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2f6354fe-c1ab-442a-b3eb-a49348029dfe	You really online?	2026-01-04 21:11:21.335	2026-01-04 10:25:44.258852
b72e9783-ba40-4a6c-9e77-44dc734d11dd	2f6354fe-c1ab-442a-b3eb-a49348029dfe	2c3fcef7-59eb-4585-a7dc-4d14324afad9	Never	2026-01-04 21:13:53.148	2026-01-04 21:11:24.341189
68cdb794-b948-4cc7-b191-aae41dd1a4f5	2f6354fe-c1ab-442a-b3eb-a49348029dfe	2c3fcef7-59eb-4585-a7dc-4d14324afad9	:)	2026-01-04 21:13:53.148	2026-01-04 21:11:30.918746
ab3f4efb-7d6f-4c54-9818-5770a9bd6a4e	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2f6354fe-c1ab-442a-b3eb-a49348029dfe	F u	2026-01-04 21:19:47.535	2026-01-04 21:13:57.886461
d1efe09d-7deb-4fd2-b25d-2b494ba5f614	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2f6354fe-c1ab-442a-b3eb-a49348029dfe	Messages buggy asf	2026-01-04 21:19:47.535	2026-01-04 21:14:13.481954
f5b341e6-680f-4a22-aae6-bc71d7211c12	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	Cap	2026-01-04 21:49:29.007	2026-01-04 10:29:10.185428
72da3cb4-3edd-45d9-8a44-73642ef32c51	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	No cap	2026-01-04 22:49:31.989	2026-01-04 21:49:34.694062
2f49e543-4afd-4269-9d9e-f0f94a3a17c5	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	📝	2026-01-04 22:49:31.989	2026-01-04 21:49:43.825526
5f36a754-6ea6-46ea-86ed-2fc23de0ca06	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	Hat	2026-01-05 03:33:01.557	2026-01-05 03:23:29.913754
54f09e86-2cf3-461b-8416-46377a20bcf6	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	Rat fab tag half rack ass	2026-01-05 03:33:01.557	2026-01-05 03:23:53.870428
e0c17360-94d2-4533-b93b-0f61d13a222b	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	Bars	2026-01-05 13:28:12.638	2026-01-05 03:33:56.964768
0d38281a-9b08-4926-b59a-27a0b05afaa1	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	I only have bars	2026-01-05 22:07:46.427	2026-01-05 20:03:38.982003
fc115498-50ad-436f-aa0c-c0686af6e59c	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	Also I think messages is less buggy now	2026-01-05 22:07:46.427	2026-01-05 20:03:55.675492
da82ab21-c89b-471d-9a0c-ab2d406b874f	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	?	2026-01-06 02:12:59.617	2026-01-05 22:08:40.940008
61c04446-202e-41f9-b391-fa8484543cc9	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2f6354fe-c1ab-442a-b3eb-a49348029dfe	I fixed messages	2026-01-06 02:23:00.858	2026-01-05 20:03:07.58015
88e4d4a1-817a-4b41-b2d1-86a765c99693	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	What the shit ass. This message system IS ASS	2026-01-06 11:41:25.067	2026-01-06 02:13:50.905518
8caa714e-3edf-4eef-8477-acd9194a8629	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	At least it kinda works	2026-01-07 00:45:00.568	2026-01-06 11:42:05.403674
f64611a4-36c8-4218-9172-be24e6ef4e88	307f9c75-2c84-4b32-8ee3-e576f71848fe	2c3fcef7-59eb-4585-a7dc-4d14324afad9	Suck my cock	2026-01-08 03:56:10.741	2026-01-08 03:55:07.674949
deb4914c-fc4d-4a5f-9e45-1f41d1fb4770	2c3fcef7-59eb-4585-a7dc-4d14324afad9	307f9c75-2c84-4b32-8ee3-e576f71848fe	What cock?	2026-01-08 03:56:40.744	2026-01-08 03:56:19.325985
2bc4b47a-9870-480c-9c3e-e4bb78684874	307f9c75-2c84-4b32-8ee3-e576f71848fe	2c3fcef7-59eb-4585-a7dc-4d14324afad9	This nine inch	2026-01-08 03:57:35.584	2026-01-08 03:57:14.821468
5d60e622-4a82-49ae-b4fb-71e4ffd73ffd	2c3fcef7-59eb-4585-a7dc-4d14324afad9	307f9c75-2c84-4b32-8ee3-e576f71848fe	Negative 9 inches	2026-01-08 03:57:56.824	2026-01-08 03:57:56.531966
aaef56b3-c585-414e-8e92-a88f2e447a11	2c3fcef7-59eb-4585-a7dc-4d14324afad9	307f9c75-2c84-4b32-8ee3-e576f71848fe	Poos	\N	2026-01-09 05:16:37.890703
45bf60a0-e077-4199-b3d7-f271dadb2b30	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	Yo homie customize your profile	2026-01-10 00:20:55.635	2026-01-08 04:43:15.603089
0124a43d-c02d-4efb-b70a-8e17c49e9adc	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	Banner amd prof pic it’ll make your admin status look more legit	2026-01-10 00:20:55.635	2026-01-08 04:43:44.989577
1b38a442-b41b-42bd-a515-64f67ea876e7	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	I think I got most of the bugs squished for now. Still not sure if messages bug you or not but	2026-01-10 00:20:55.635	2026-01-09 05:17:29.041949
7d5a0d00-eedb-40f3-9dac-072b380bd32b	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	Mama	2026-01-11 00:47:10.82	2026-01-10 00:21:22.727603
fb0b8e26-40c2-4d1a-8259-822ad969fe90	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	I texted you but your phones down	2026-01-11 00:47:10.82	2026-01-10 11:28:29.928289
72192d99-9616-4c49-bf16-876ea981af10	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	Yeah I’m broke nigga	2026-01-11 16:43:42.06	2026-01-11 09:16:33.369969
b32d7562-9e4b-4958-87e2-ebf49539015f	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	Getting it paid tomorrow	2026-01-11 16:43:42.06	2026-01-11 09:16:47.607878
c2448711-ec18-4d1c-bcd7-1835e8966fe6	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2f6354fe-c1ab-442a-b3eb-a49348029dfe	YIPPIE	2026-01-16 02:42:25.637	2026-01-16 02:41:25.056127
a768ed49-b676-4a4f-b5fd-bd6a60eb3018	2f6354fe-c1ab-442a-b3eb-a49348029dfe	2c3fcef7-59eb-4585-a7dc-4d14324afad9	Hell yeah nigger	2026-01-16 02:51:05.023	2026-01-16 02:42:34.924938
\.


--
-- Data for Name: dislikes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.dislikes (id, user_id, bar_id, created_at) FROM stdin;
d32d9ed8-e867-4ba4-b2b5-ec9276674085	1520cea1-ed54-4add-8d3b-37260aa10746	fa923eaf-7b99-4932-b8a9-6a6200804d93	2026-01-12 03:48:35.92414
\.


--
-- Data for Name: flagged_phrases; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.flagged_phrases (id, phrase, normalized_phrase, severity, similarity_threshold, notes, is_active, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.follows (id, follower_id, following_id, created_at) FROM stdin;
da6a8bf3-1ada-4914-a79a-3841de6ec3a4	944b684c-3adb-4d49-b501-c7e11fc00510	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-02 15:39:44.199433
5e037f02-84b2-4dc3-8cfd-ff150edf904d	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-02 19:13:45.590116
5c609efd-1e37-416d-9264-aa8afa721741	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	2026-01-02 20:01:14.586808
baa82620-9b9c-40e0-8b6c-4891d88c83d7	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2f6354fe-c1ab-442a-b3eb-a49348029dfe	2026-01-03 03:24:49.132997
e80c89c2-a5e0-434d-8d53-33f4abbc9182	ba15fbc6-9a62-450f-a9a1-d56afabdc566	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-04 10:46:15.285083
b4673c85-e8ca-4f26-9104-a6e3bdfa8a79	4efb9a47-0db2-4fc2-94e9-8cd862ec9945	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-04 22:31:38.6149
843a3fe6-34b0-42ec-85ac-351a0ef55a38	307f9c75-2c84-4b32-8ee3-e576f71848fe	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-08 03:54:03.083257
eb2a4838-f7c8-4fcc-8628-4a416bb02e8c	1520cea1-ed54-4add-8d3b-37260aa10746	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-12 03:43:16.570422
8ccd380a-1cfb-4856-b7ad-4e93c3a3e003	19f337b1-c1c1-450e-8a84-3a4efac4934f	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-24 02:48:56.329778
\.


--
-- Data for Name: friendships; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.friendships (id, requester_id, receiver_id, status, created_at) FROM stdin;
ebef5857-9317-42f7-aea3-f51611cb4505	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2f6354fe-c1ab-442a-b3eb-a49348029dfe	accepted	2026-01-03 03:04:56.516407
1966c60c-d8f5-4a1e-afa4-14b38da0d35a	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	accepted	2026-01-02 20:01:26.767908
40d29680-5e3c-405e-904e-2724d800114b	2c3fcef7-59eb-4585-a7dc-4d14324afad9	4efb9a47-0db2-4fc2-94e9-8cd862ec9945	accepted	2026-01-04 22:31:38.723866
afda6fa8-e734-44bf-be66-ff8b75a94f73	2c3fcef7-59eb-4585-a7dc-4d14324afad9	307f9c75-2c84-4b32-8ee3-e576f71848fe	accepted	2026-01-08 03:54:03.182111
d9002d2f-ca94-4a79-b282-96f0f4863b5b	2c3fcef7-59eb-4585-a7dc-4d14324afad9	1520cea1-ed54-4add-8d3b-37260aa10746	accepted	2026-01-12 03:43:16.674265
9e5c6c25-532f-40ec-a861-f278a6dede11	2c3fcef7-59eb-4585-a7dc-4d14324afad9	19f337b1-c1c1-450e-8a84-3a4efac4934f	accepted	2026-01-24 02:48:56.432159
\.


--
-- Data for Name: likes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.likes (id, user_id, bar_id, created_at) FROM stdin;
74d4fe98-819e-4fc9-bc45-1569f73ad031	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	641beeb6-ce3f-4578-bdbd-6fb6a95a95d1	2026-01-08 03:49:21.455814
35664565-8469-4009-86a4-a2b9aa2926db	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	abd59686-d9c0-4257-a33b-bcbc2c84ede4	2026-01-08 03:49:33.635033
cce9739a-63d3-45d9-b503-8c0665cb40ba	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	4eb6e1de-d661-4cba-adad-58189d7e3a0b	2026-01-08 03:50:11.1077
8b312dcd-da38-4e56-9de1-556f8b0eabc3	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	3c0e501e-9b17-4ac1-992c-7c26dfefb1ee	2026-01-08 03:50:34.310693
aac92f87-1c9c-4914-a6a8-22a7adedfb4f	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	7626b620-7bea-43c6-8e73-ef4bdbac124f	2026-01-08 03:50:35.158734
2c8ebf32-d699-4ba7-a65f-128d59519414	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	c84ef0de-496a-4329-976c-a8bcd7007358	2026-01-08 03:50:57.614796
41750a85-0e26-4067-ac00-18bba673c918	307f9c75-2c84-4b32-8ee3-e576f71848fe	e1eec35d-54ed-416c-8bcd-416fb7df796c	2026-01-08 03:56:19.339244
7f9fe564-31f6-414c-b160-65fbfad0f93b	307f9c75-2c84-4b32-8ee3-e576f71848fe	0af27598-4375-4aa2-81b8-ebcd18bc3388	2026-01-08 03:56:24.309559
a7d46068-bacd-4695-8325-2064a8117ec6	307f9c75-2c84-4b32-8ee3-e576f71848fe	e1aa38be-8e07-4eb8-b292-614d574c277b	2026-01-08 03:56:28.299598
50180ab8-db35-42b0-b09d-2308c95fa1e5	307f9c75-2c84-4b32-8ee3-e576f71848fe	21e1789c-09c6-4334-aa8b-7c4b3c8a2d7d	2026-01-08 03:56:32.79349
49ce0a9c-2179-4271-aef8-d523abe6fed3	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	152e4f6f-0843-42eb-8d10-577ba183f20a	2026-01-08 03:57:00.24676
e9ef1f94-389d-4dd6-91b2-645ffd586a2b	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	45f2d76d-9012-4d27-a177-860bc2493253	2026-01-08 04:08:27.691873
ffe04768-9a0b-4025-97ea-022dfeacf6a3	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	dde2ade8-f234-40c6-9253-ee4087fbd157	2026-01-08 04:19:50.401489
93c641bb-33d6-4e04-9727-961d8f004093	2c3fcef7-59eb-4585-a7dc-4d14324afad9	3b9610dc-9ecd-435e-a9cd-195c8ab1fbad	2026-01-08 13:11:18.017759
339ac8ba-e22c-40c3-8096-62d8e10697aa	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	2026-01-08 13:16:08.655548
efe68996-f2f3-47f0-a7e2-a8d526b45da2	2f6354fe-c1ab-442a-b3eb-a49348029dfe	3b9610dc-9ecd-435e-a9cd-195c8ab1fbad	2026-01-04 21:10:36.42079
385e3108-8205-41d2-8242-49cb0ae73766	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dde2ade8-f234-40c6-9253-ee4087fbd157	2026-01-09 04:12:37.403468
2af4c495-8e48-4af8-863e-c919f0dfef79	2c3fcef7-59eb-4585-a7dc-4d14324afad9	45f2d76d-9012-4d27-a177-860bc2493253	2026-01-09 04:12:39.739836
febee2f4-480e-4e4e-a632-2f1ea39990cc	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	851e3eae-1b3e-4b4d-bd2b-8217ffa6fe54	2026-01-05 00:31:29.64482
881d3b75-feaa-49cc-9a55-da5799fc1e76	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dc552827-6566-41ca-978d-d259cbea1b1c	2026-01-09 04:12:44.841079
8d84034a-b195-474a-a493-82cdb5166b03	2c3fcef7-59eb-4585-a7dc-4d14324afad9	21e1789c-09c6-4334-aa8b-7c4b3c8a2d7d	2026-01-09 04:13:17.705185
c7bb7600-3ca5-4e0d-8cf4-60ce93c49cfc	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1aa38be-8e07-4eb8-b292-614d574c277b	2026-01-09 04:13:20.611203
6fb565d0-498a-4297-acd6-e64317da9f28	2c3fcef7-59eb-4585-a7dc-4d14324afad9	0af27598-4375-4aa2-81b8-ebcd18bc3388	2026-01-09 04:13:24.054848
699e72e6-952d-4264-a6af-9886013ff566	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1eec35d-54ed-416c-8bcd-416fb7df796c	2026-01-09 04:13:27.708659
277d6c37-1692-4c4a-9db0-22a898525a55	c21705a3-d3ca-406e-9b45-e119e8fe606f	dde2ade8-f234-40c6-9253-ee4087fbd157	2026-01-09 10:48:55.610934
98f01812-4782-4918-9adc-9e1a491e440c	c21705a3-d3ca-406e-9b45-e119e8fe606f	45f2d76d-9012-4d27-a177-860bc2493253	2026-01-09 10:48:59.840743
7299d30a-acbe-4d59-b978-991c5c383c49	c21705a3-d3ca-406e-9b45-e119e8fe606f	152e4f6f-0843-42eb-8d10-577ba183f20a	2026-01-09 10:49:03.364302
560957e6-1b09-4d88-a204-a1a9502b725c	c21705a3-d3ca-406e-9b45-e119e8fe606f	273dc2db-1aa4-4d3d-aba1-3ca0a5e36ebc	2026-01-09 10:49:11.153686
ada915e5-d4c5-44f7-bc1f-a7824cddce21	c21705a3-d3ca-406e-9b45-e119e8fe606f	e1eec35d-54ed-416c-8bcd-416fb7df796c	2026-01-09 10:49:42.470127
1f654395-5078-446f-8a86-c1fe13e498f5	c21705a3-d3ca-406e-9b45-e119e8fe606f	0af27598-4375-4aa2-81b8-ebcd18bc3388	2026-01-09 10:49:48.880587
f986f107-187a-4a3a-aa85-6a01ee3ace5d	c21705a3-d3ca-406e-9b45-e119e8fe606f	3b9610dc-9ecd-435e-a9cd-195c8ab1fbad	2026-01-09 10:49:53.311375
358937e7-85ac-4911-9435-3dadd7dcb56c	c21705a3-d3ca-406e-9b45-e119e8fe606f	e1aa38be-8e07-4eb8-b292-614d574c277b	2026-01-09 10:49:58.26889
7773bce2-8ea1-496f-b3cd-307f02278d2f	c21705a3-d3ca-406e-9b45-e119e8fe606f	21e1789c-09c6-4334-aa8b-7c4b3c8a2d7d	2026-01-09 10:50:20.259817
7e8fc62a-bc4f-43bd-92ef-0d33c85536e5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	273dc2db-1aa4-4d3d-aba1-3ca0a5e36ebc	2026-01-10 07:57:22.148514
7a73eabf-0e29-4d60-ab97-33a937545908	2c3fcef7-59eb-4585-a7dc-4d14324afad9	152e4f6f-0843-42eb-8d10-577ba183f20a	2026-01-10 07:57:28.183359
40720080-6fcc-437b-9cdb-a472e6ed6776	1520cea1-ed54-4add-8d3b-37260aa10746	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2026-01-12 03:48:02.086255
5792fc86-5d7e-423d-a4a9-3bc23f263867	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	273dc2db-1aa4-4d3d-aba1-3ca0a5e36ebc	2026-01-06 11:40:38.928668
83a1137a-b620-4ddc-8e13-483eb1436a9e	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	dc552827-6566-41ca-978d-d259cbea1b1c	2026-01-06 11:40:41.285913
79e1d7f6-e8ac-48a0-bf20-3d01245109b4	2f6354fe-c1ab-442a-b3eb-a49348029dfe	fa923eaf-7b99-4932-b8a9-6a6200804d93	2026-01-06 12:28:48.214814
45713818-826d-420b-a256-a77cc13cc8d7	1520cea1-ed54-4add-8d3b-37260aa10746	dde2ade8-f234-40c6-9253-ee4087fbd157	2026-01-12 03:48:13.086198
5a51e7e2-f3f6-4224-93b8-39b2a6efa133	1520cea1-ed54-4add-8d3b-37260aa10746	45f2d76d-9012-4d27-a177-860bc2493253	2026-01-12 03:48:16.405646
469cfde7-75c6-49fd-852e-771cbac8af5f	1520cea1-ed54-4add-8d3b-37260aa10746	152e4f6f-0843-42eb-8d10-577ba183f20a	2026-01-12 03:48:18.448302
d738745c-34dc-45b9-8781-d310eb0b9a34	2c3fcef7-59eb-4585-a7dc-4d14324afad9	53992773-3127-4f5b-bf02-34a24fd08175	2026-01-17 02:18:18.123781
ad8f6183-e391-4483-8021-7609e5c3338b	2c3fcef7-59eb-4585-a7dc-4d14324afad9	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	2026-01-17 02:18:21.889474
\.


--
-- Data for Name: maintenance_status; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.maintenance_status (id, is_active, message, activated_at, activated_by) FROM stdin;
singleton	f	\N	\N	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, user_id, type, actor_id, bar_id, message, read, created_at, comment_id) FROM stdin;
156cb9b9-6fba-490f-a6b3-babd0be95e90	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	f	2026-01-11 09:16:33.45614	\N
4ddc2dc1-4939-4ff7-a95d-08b4009e825d	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	f	2026-01-11 09:16:47.63876	\N
50d14c8b-438d-40a6-b951-a7d0ef66ed1d	1520cea1-ed54-4add-8d3b-37260aa10746	comment_like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	@Milsling liked your comment	f	2026-01-15 14:05:15.691061	15e11d75-a3b9-4261-90d1-47d138e50227
a96ef020-b0c6-40ba-9cec-b5483e7e9988	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling liked your bar	t	2026-01-06 06:35:34.938413	\N
440ea704-ae23-4874-bd51-6d5de126214f	2f6354fe-c1ab-442a-b3eb-a49348029dfe	bar_adopted	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling adopted your bar!	t	2026-01-11 04:20:54.220927	\N
529ee360-1177-4060-9a52-e945f42a05d3	2f6354fe-c1ab-442a-b3eb-a49348029dfe	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-16 02:41:25.087647	\N
84542324-247c-4d75-a740-9373ea384ca5	2f6354fe-c1ab-442a-b3eb-a49348029dfe	friend_request	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a friend request	t	2026-01-03 03:04:56.553076	\N
bf054242-5cbe-4443-9639-e40be6833a29	2f6354fe-c1ab-442a-b3eb-a49348029dfe	moderation	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	Your post "She’s too this she’s too that, she’s too young she..." was removed due to moderation. Reason: Cmon man no pedo shit	t	2026-01-03 03:21:21.731927	\N
40f15ac6-9426-4ad2-ac3b-1e78f5ea289d	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	3b9610dc-9ecd-435e-a9cd-195c8ab1fbad	@Milsling liked your bar	t	2026-01-06 06:35:46.739065	\N
2e2e3161-628d-44ab-869c-c716e5316045	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	friend_request	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a friend request	t	2026-01-02 20:01:26.803053	\N
0b23e3f7-818c-4cf2-9252-c07aa54c8674	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	21e1789c-09c6-4334-aa8b-7c4b3c8a2d7d	@Milsling dropped a new bar	t	2026-01-03 22:11:44.392887	\N
0db0b5af-df1a-4603-b26e-cfb462f8d80d	944b684c-3adb-4d49-b501-c7e11fc00510	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	21e1789c-09c6-4334-aa8b-7c4b3c8a2d7d	@Milsling dropped a new bar	f	2026-01-03 22:11:44.357548	\N
d2e05c33-a866-401c-9185-2d0f293c073e	944b684c-3adb-4d49-b501-c7e11fc00510	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1aa38be-8e07-4eb8-b292-614d574c277b	@Milsling dropped a new bar	f	2026-01-04 02:16:30.817601	\N
01ae45ba-d132-4b36-9889-2cc32be6ae67	944b684c-3adb-4d49-b501-c7e11fc00510	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	0af27598-4375-4aa2-81b8-ebcd18bc3388	@Milsling dropped a new bar	f	2026-01-04 10:22:51.773087	\N
1ff68af9-64dc-449f-b21d-5c0789ca33b8	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	851e3eae-1b3e-4b4d-bd2b-8217ffa6fe54	@Milsling liked your bar	t	2026-01-04 00:51:12.903921	\N
d7ab6290-0bef-44d8-939a-cd91b778c503	2f6354fe-c1ab-442a-b3eb-a49348029dfe	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-03 04:02:19.364499	\N
f82d533e-40a9-4a7f-bc56-fc7a0e6de1cc	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	851e3eae-1b3e-4b4d-bd2b-8217ffa6fe54	@Milsling liked your bar	t	2026-01-04 00:51:15.622158	\N
df4243b1-3cc4-4f22-bd22-a0888b0ca1c3	2c3fcef7-59eb-4585-a7dc-4d14324afad9	like	1520cea1-ed54-4add-8d3b-37260aa10746	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	@NotMilsling liked your bar	t	2026-01-12 03:48:02.223745	\N
a31c9412-e7b9-4dbb-b2d9-2e1cce3cd819	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	@BBL-Buggy sent you a message	t	2026-01-06 11:42:05.438776	\N
22628aec-f425-4c3a-a43b-e7c0dbcc0390	2c3fcef7-59eb-4585-a7dc-4d14324afad9	achievement	\N	\N	🔥 Achievement unlocked: Origin Founder!	t	2026-01-04 10:22:52.040469	\N
7022972d-e9c1-4f22-8526-39d145795d76	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	2f6354fe-c1ab-442a-b3eb-a49348029dfe	\N	@Bainjo sent you a message	t	2026-01-04 21:11:30.952386	\N
4382041a-21cb-40b1-a4a9-35e2db127189	944b684c-3adb-4d49-b501-c7e11fc00510	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1eec35d-54ed-416c-8bcd-416fb7df796c	@Milsling dropped a new bar	f	2026-01-04 21:16:54.543516	\N
7b03208d-7ca9-4f1b-a97f-90825b3df5bb	ba15fbc6-9a62-450f-a9a1-d56afabdc566	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1eec35d-54ed-416c-8bcd-416fb7df796c	@Milsling dropped a new bar	f	2026-01-04 21:16:54.608831	\N
f4ceef30-cf06-442b-8168-015b4e2b1cc9	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	2f6354fe-c1ab-442a-b3eb-a49348029dfe	6042545a-45ff-4ff4-96e9-c378728c5c71	@Bainjo dropped a new bar	t	2026-01-16 02:41:29.009003	\N
916befe7-68b6-459a-ae80-b98332792eb3	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	1520cea1-ed54-4add-8d3b-37260aa10746	dde2ade8-f234-40c6-9253-ee4087fbd157	@NotMilsling liked your bar	f	2026-01-12 03:48:13.210586	\N
f7b8c86c-a7e2-4998-8307-b039b49dea71	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1aa38be-8e07-4eb8-b292-614d574c277b	@Milsling dropped a new bar	t	2026-01-04 02:16:30.85629	\N
9865dae3-b187-4b93-8d7c-d38c3bb386b0	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	0af27598-4375-4aa2-81b8-ebcd18bc3388	@Milsling dropped a new bar	t	2026-01-04 10:22:51.807086	\N
ebecae51-19c5-4d12-94e9-7527b81b7235	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	851e3eae-1b3e-4b4d-bd2b-8217ffa6fe54	@Milsling liked your bar	t	2026-01-06 06:35:50.906076	\N
efbca6a1-ae2a-4272-b128-a8fdb79ed15e	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	3b9610dc-9ecd-435e-a9cd-195c8ab1fbad	@Milsling liked your bar	t	2026-01-05 03:32:49.198785	\N
f963b6c1-e789-441b-a492-8d6d5b3898b2	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	273dc2db-1aa4-4d3d-aba1-3ca0a5e36ebc	@Milsling liked your bar	t	2026-01-05 20:11:30.026791	\N
dc7a9dee-9ffd-49bd-a1da-aec837493967	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dc552827-6566-41ca-978d-d259cbea1b1c	@Milsling liked your bar	t	2026-01-05 20:11:33.404524	\N
8c5ab3f9-a574-44bc-9f7b-0a0a46f0cab6	2f6354fe-c1ab-442a-b3eb-a49348029dfe	achievement	\N	\N	🔥 Achievement unlocked: Origin Founder!	t	2026-01-04 21:18:34.0314	\N
b077de92-d91d-445a-b4d3-c442f7ac0b5e	2f6354fe-c1ab-442a-b3eb-a49348029dfe	dislike	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling disliked your bar	t	2026-01-04 21:26:18.3002	\N
de1e1a5f-662f-4800-926c-cf3596f88e9b	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	fa923eaf-7b99-4932-b8a9-6a6200804d93	@BBL-Buggy liked your bar	t	2026-01-04 21:48:49.148168	\N
b634370b-4d8e-477e-9e73-0acb7903db1a	2f6354fe-c1ab-442a-b3eb-a49348029dfe	comment	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	fa923eaf-7b99-4932-b8a9-6a6200804d93	@BBL-Buggy commented on your bar	t	2026-01-04 21:48:55.157832	\N
8bd894ab-8f9c-4bac-a41d-b5516dd97033	2f6354fe-c1ab-442a-b3eb-a49348029dfe	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-05 20:03:07.619069	\N
008e8837-4410-4aa3-b7b1-5b359943fcad	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	fa923eaf-7b99-4932-b8a9-6a6200804d93	@BBL-Buggy liked your bar	t	2026-01-05 03:34:05.894451	\N
1c9ae5ae-644f-4764-afd7-bc6207fc87d5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	comment_like	1520cea1-ed54-4add-8d3b-37260aa10746	dc552827-6566-41ca-978d-d259cbea1b1c	@NotMilsling liked your comment	t	2026-01-12 03:48:27.266877	3173b1d5-5093-4867-a659-ed8c9903a92b
524b0d77-4dc9-4040-8e18-77f20304adc4	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	@BBL-Buggy sent you a message	t	2026-01-05 03:33:56.997508	\N
17a203bc-4c7a-481e-9dad-52a019ae994a	2c3fcef7-59eb-4585-a7dc-4d14324afad9	friend_accepted	2f6354fe-c1ab-442a-b3eb-a49348029dfe	\N	@Bainjo accepted your friend request	t	2026-01-03 03:30:23.560252	\N
7c54e809-c84c-4919-8c15-612f7775ffe6	2c3fcef7-59eb-4585-a7dc-4d14324afad9	friend_accepted	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	@BBL-Buggy accepted your friend request	t	2026-01-04 02:58:08.14045	\N
f721bc19-43c8-4a85-b13f-2c05d4dfcef1	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	3b9610dc-9ecd-435e-a9cd-195c8ab1fbad	@BBL-Buggy dropped a new bar	t	2026-01-04 03:16:44.319394	\N
9fdeda67-23c1-4396-b08d-e44d1e2a3659	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	2f6354fe-c1ab-442a-b3eb-a49348029dfe	\N	@Bainjo sent you a message	t	2026-01-04 21:11:24.377691	\N
0b98e04b-3229-4eba-95d3-1eb1fea6bf4f	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	fa923eaf-7b99-4932-b8a9-6a6200804d93	@BBL-Buggy liked your bar	t	2026-01-05 03:34:12.280363	\N
d57af4e8-5be7-4613-a3a9-0f1bfc76abaa	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	851e3eae-1b3e-4b4d-bd2b-8217ffa6fe54	@BBL-Buggy dropped a new bar	t	2026-01-03 22:37:10.215819	\N
10970ee4-9732-4d60-9bec-63a54535d0e6	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	2f6354fe-c1ab-442a-b3eb-a49348029dfe	\N	@Bainjo sent you a message	t	2026-01-16 02:42:34.953894	\N
d5cdadff-4c08-44d9-ad97-9b6a1e51dce6	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling liked your bar	t	2026-01-05 20:11:39.192269	\N
6388b66c-9d28-445c-b8dc-e56565ca9599	2f6354fe-c1ab-442a-b3eb-a49348029dfe	dislike	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling disliked your bar	t	2026-01-05 20:11:40.478283	\N
dbaead33-38f8-466a-a13f-efa164028c4c	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling liked your bar	t	2026-01-05 20:11:42.403801	\N
1870e867-50b4-43a5-9bfd-1fa8521fc808	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	1520cea1-ed54-4add-8d3b-37260aa10746	45f2d76d-9012-4d27-a177-860bc2493253	@NotMilsling liked your bar	f	2026-01-12 03:48:16.534185	\N
fa1408d1-4f44-44d5-a134-a6dcd02208b2	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	@BBL-Buggy sent you a message	t	2026-01-05 22:08:40.985614	\N
ace8553e-46c7-4612-a856-f4ecceb6df11	2c3fcef7-59eb-4585-a7dc-4d14324afad9	badge_granted	\N	\N	The king has blessed you with a one of a kind custom badge "DADDY". Enjoy.	t	2026-01-16 13:39:35.182264	\N
6c0290cd-ce3c-47cd-8fb0-f8e0c52a7848	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	2f6354fe-c1ab-442a-b3eb-a49348029dfe	5dcee9f1-a8fb-4667-8668-60bd651a9e97	@Bainjo dropped a new bar	t	2026-01-16 14:39:42.822409	\N
6cb0f8dc-3e3e-4723-9411-3b3471d6821d	2f6354fe-c1ab-442a-b3eb-a49348029dfe	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-04 10:24:40.840479	\N
2af009c6-3efd-4585-9a2d-dccc6b6dac82	2f6354fe-c1ab-442a-b3eb-a49348029dfe	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-04 10:24:53.079787	\N
4cc533d7-f4c9-4c8a-8a87-6ebf6ea6757c	2f6354fe-c1ab-442a-b3eb-a49348029dfe	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-04 10:25:44.296274	\N
71f2649f-4ea4-4d7f-9d9a-cddff826d87e	2f6354fe-c1ab-442a-b3eb-a49348029dfe	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-04 21:13:57.923177	\N
456d07c0-7944-476e-8278-04acdee7dc1d	2f6354fe-c1ab-442a-b3eb-a49348029dfe	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-04 21:14:13.518204	\N
3da07b3e-be5b-4a87-9384-389a14cd41e1	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	851e3eae-1b3e-4b4d-bd2b-8217ffa6fe54	@Milsling liked your bar	t	2026-01-04 00:51:16.431116	\N
4b1d93c3-cacb-4dc2-8ff0-d425e86dfb8b	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	851e3eae-1b3e-4b4d-bd2b-8217ffa6fe54	@Milsling liked your bar	t	2026-01-04 00:52:39.514129	\N
34821dc1-49e8-4639-8cf0-07cdcd9517a8	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	851e3eae-1b3e-4b4d-bd2b-8217ffa6fe54	@Milsling liked your bar	t	2026-01-04 01:19:09.485473	\N
4bb062f0-88bb-409c-ab79-f9d1c7a23f7c	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	achievement	\N	\N	🔥 Achievement unlocked: Origin Founder!	t	2026-01-04 03:16:44.556309	\N
83955421-e0f4-44bb-afa8-18b043e8ac56	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-04 10:29:10.222724	\N
1e4365c3-ac0c-47c0-83aa-313acbd16f96	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2f6354fe-c1ab-442a-b3eb-a49348029dfe	3b9610dc-9ecd-435e-a9cd-195c8ab1fbad	@Bainjo liked your bar	t	2026-01-04 21:10:36.528932	\N
4df9570b-8a25-4b02-a550-2279faa3dd82	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1eec35d-54ed-416c-8bcd-416fb7df796c	@Milsling dropped a new bar	t	2026-01-04 21:16:54.577064	\N
88f0fd79-666f-4303-8e8e-c9e2586be8e8	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-05 03:23:53.906354	\N
215bc2ac-6896-49d9-a56d-24915d0f9e45	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	comment	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dc552827-6566-41ca-978d-d259cbea1b1c	@Milsling commented on your bar	t	2026-01-04 22:48:24.929236	\N
216170a1-c8d7-4483-b4fa-30b076a06a5a	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-05 20:03:39.019773	\N
7fe70c54-14e9-4f8c-93cd-af8f6d08cb01	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-05 20:03:55.707453	\N
52fd8d83-af0a-40a5-8c62-7fbf7359afee	2f6354fe-c1ab-442a-b3eb-a49348029dfe	dislike	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling disliked your bar	t	2026-01-04 22:49:59.575451	\N
cc063361-12eb-4f4a-bc79-54b0a787c973	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	1520cea1-ed54-4add-8d3b-37260aa10746	152e4f6f-0843-42eb-8d10-577ba183f20a	@NotMilsling liked your bar	f	2026-01-12 03:48:18.573017	\N
99bc2f5b-3f92-4bd3-a1da-ba6e1ca8387a	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	fa923eaf-7b99-4932-b8a9-6a6200804d93	@BBL-Buggy liked your bar	t	2026-01-05 00:33:21.640023	\N
7cd9ce09-4bad-44ff-8780-deab29c0ecd8	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling liked your bar	t	2026-01-05 20:01:47.01674	\N
18f37905-1a26-43ec-a39b-d4d41815c2c6	2f6354fe-c1ab-442a-b3eb-a49348029dfe	dislike	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling disliked your bar	t	2026-01-05 20:01:48.018892	\N
5058f511-fc30-4c10-ad59-e7c07e1fa5d9	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling liked your bar	t	2026-01-05 20:01:49.258124	\N
179847af-0f56-41d3-bd83-3bc811709edc	307f9c75-2c84-4b32-8ee3-e576f71848fe	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	f	2026-01-08 03:56:19.358449	\N
93694911-139e-4fbc-a423-22bd6bd31f14	2f6354fe-c1ab-442a-b3eb-a49348029dfe	moderation	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	Your post "Good god Its gonna drop squattin on your grave lik..." was removed due to moderation. Reason: You can’t steal from God	t	2026-01-16 17:32:29.496897	\N
b15bfee5-086b-4c9f-b021-6beb559386fa	2f6354fe-c1ab-442a-b3eb-a49348029dfe	dislike	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling disliked your bar	t	2026-01-05 20:11:43.069946	\N
000fbb4e-8c3c-4c66-ae2f-8dd043f797ea	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling liked your bar	t	2026-01-05 21:47:38.240867	\N
d92631f5-5c49-4827-80eb-0d3d0327fedb	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	2f6354fe-c1ab-442a-b3eb-a49348029dfe	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Bainjo dropped a new bar	t	2026-01-04 21:18:33.792055	\N
91b2d991-5cad-4399-8ec2-b4368bbc4c2e	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	641beeb6-ce3f-4578-bdbd-6fb6a95a95d1	@BBL-Buggy dropped a new bar	t	2026-01-08 03:49:18.22284	\N
4bab9542-ee84-44d9-bc6e-d3c045c8717d	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dc552827-6566-41ca-978d-d259cbea1b1c	@Milsling liked your bar	t	2026-01-04 22:49:49.645018	\N
a5c847c9-2378-4c10-9fd1-f7fe673d83e3	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	dislike	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dc552827-6566-41ca-978d-d259cbea1b1c	@Milsling disliked your bar	t	2026-01-05 03:22:03.815391	\N
4507b960-cba8-4303-a3df-14b23202162f	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-05 03:23:29.94721	\N
70cc5097-a29e-4c80-a74e-679cca648f10	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	273dc2db-1aa4-4d3d-aba1-3ca0a5e36ebc	@Milsling liked your bar	t	2026-01-06 00:43:42.50427	\N
a2ab2785-ffc6-48ef-9c36-d89f0e79bfd7	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dc552827-6566-41ca-978d-d259cbea1b1c	@Milsling liked your bar	t	2026-01-06 00:43:44.643559	\N
bb7fafad-290d-40f0-b0ed-904bce9888fb	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	t	2026-01-06 02:13:50.945867	\N
f745af66-05b1-41bf-b252-d2efd3bdb0a4	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	273dc2db-1aa4-4d3d-aba1-3ca0a5e36ebc	@Milsling liked your bar	t	2026-01-08 03:09:04.428488	\N
d6745640-568f-4f9a-ac53-58afb2eec36c	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	abd59686-d9c0-4257-a33b-bcbc2c84ede4	@BBL-Buggy dropped a new bar	t	2026-01-08 03:49:30.343995	\N
41944052-994f-49dc-b232-574e92a2894c	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	4eb6e1de-d661-4cba-adad-58189d7e3a0b	@BBL-Buggy dropped a new bar	t	2026-01-08 03:50:06.036429	\N
79fd5749-29ad-42d0-af42-02999622887f	2f6354fe-c1ab-442a-b3eb-a49348029dfe	dislike	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling disliked your bar	t	2026-01-06 00:55:47.485512	\N
b8f5af9b-e45b-4df8-a77d-005b9d29e4a4	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling liked your bar	t	2026-01-08 03:09:10.168871	\N
545a1702-64ff-42a3-9170-2c2594b718d6	2f6354fe-c1ab-442a-b3eb-a49348029dfe	dislike	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling disliked your bar	t	2026-01-08 03:09:11.386659	\N
6ed7d645-0ff0-4752-9a00-22bd654dfb55	2f6354fe-c1ab-442a-b3eb-a49348029dfe	dislike	1520cea1-ed54-4add-8d3b-37260aa10746	fa923eaf-7b99-4932-b8a9-6a6200804d93	@NotMilsling disliked your bar	t	2026-01-12 03:48:36.078656	\N
50b2e2d6-a2d9-43fc-bc3e-7409d0711b06	2f6354fe-c1ab-442a-b3eb-a49348029dfe	system	\N	\N	Your bar review request was not approved: Listen here nigger only one saying nigger around here is me you good for nothing jigaboo	t	2026-01-16 17:37:39.634367	\N
38f191ce-67c2-44eb-8ab3-fca740a3a15b	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	7626b620-7bea-43c6-8e73-ef4bdbac124f	@BBL-Buggy dropped a new bar	t	2026-01-08 03:50:20.803748	\N
14a82f8b-0dc0-4130-b8d9-df7e9f0bab89	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dc552827-6566-41ca-978d-d259cbea1b1c	@Milsling liked your bar	t	2026-01-08 03:09:06.205381	\N
50076a1c-b79f-4b68-9521-f38ba8965382	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	achievement	\N	\N	💀 Achievement unlocked: Bar Slinger!	t	2026-01-08 03:50:43.557744	\N
7d810e39-ebc1-4e1d-a53b-7d1d30058f0e	307f9c75-2c84-4b32-8ee3-e576f71848fe	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	f	2026-01-08 03:57:56.56384	\N
a6d3c29f-7773-4e09-ba86-a3581c79f9a1	944b684c-3adb-4d49-b501-c7e11fc00510	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	53992773-3127-4f5b-bf02-34a24fd08175	@Milsling dropped a new bar	f	2026-01-17 02:17:28.920905	\N
1ad1d552-54a3-423a-ba3c-8e3d5f563c2e	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	53992773-3127-4f5b-bf02-34a24fd08175	@Milsling dropped a new bar	f	2026-01-17 02:17:29.041586	\N
fdb8f2da-c2a6-481e-86ef-3bd32b2b5cec	ba15fbc6-9a62-450f-a9a1-d56afabdc566	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	53992773-3127-4f5b-bf02-34a24fd08175	@Milsling dropped a new bar	f	2026-01-17 02:17:29.09819	\N
876188e2-550f-4ee3-aa62-298a2852b7cb	4efb9a47-0db2-4fc2-94e9-8cd862ec9945	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	53992773-3127-4f5b-bf02-34a24fd08175	@Milsling dropped a new bar	f	2026-01-17 02:17:29.156988	\N
ae97d653-1a56-448a-8c3f-991bfcad8c14	307f9c75-2c84-4b32-8ee3-e576f71848fe	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	53992773-3127-4f5b-bf02-34a24fd08175	@Milsling dropped a new bar	f	2026-01-17 02:17:29.216129	\N
40b0e1d0-df98-413b-8f73-bac2502f7be8	2c3fcef7-59eb-4585-a7dc-4d14324afad9	comment	1520cea1-ed54-4add-8d3b-37260aa10746	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	@NotMilsling commented on your bar	t	2026-01-12 03:54:48.349168	\N
9aa7eca6-c330-4daf-b9a8-de15d68fe23f	1520cea1-ed54-4add-8d3b-37260aa10746	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	53992773-3127-4f5b-bf02-34a24fd08175	@Milsling dropped a new bar	f	2026-01-17 02:17:29.276486	\N
a0c9c773-ad60-40dc-945c-eae3d4027590	19f337b1-c1c1-450e-8a84-3a4efac4934f	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1038043-6172-4335-8e26-1f7d47615a63	@Milsling liked your bar	f	2026-01-24 09:47:49.958401	\N
df29eb67-56a6-4c61-bc2c-dde71e93a6d7	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	@BBL-Buggy sent you a message	t	2026-01-04 21:49:34.729313	\N
ff96d9e4-8fee-4314-a723-1e49b545d5f4	2f6354fe-c1ab-442a-b3eb-a49348029dfe	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	@Milsling liked your bar	t	2026-01-08 13:16:08.759105	\N
56f1c292-b3bb-4e60-ac6a-9db30dc769ea	2f6354fe-c1ab-442a-b3eb-a49348029dfe	badge_granted	\N	\N	The king has blessed you with a one of a kind custom badge "EN WURD". Enjoy.	t	2026-01-16 17:40:48.353136	\N
bf4039a5-d082-4e35-80c0-df25db7c4099	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	152e4f6f-0843-42eb-8d10-577ba183f20a	@Milsling liked your bar	f	2026-01-08 04:41:05.273036	\N
70d2e9a8-d280-4049-9690-ddc65a70738f	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dde2ade8-f234-40c6-9253-ee4087fbd157	@Milsling liked your bar	f	2026-01-08 04:41:52.227533	\N
ff9f83e5-c509-40ed-a57d-97cc06aaccc1	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	45f2d76d-9012-4d27-a177-860bc2493253	@Milsling liked your bar	f	2026-01-08 04:42:26.455912	\N
a7672be9-2a33-493b-b2c3-ec600e087b90	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	f	2026-01-08 04:43:15.638031	\N
d1925d93-3f52-4f77-b41d-ed9e85cbd8f9	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	f	2026-01-08 04:43:45.02785	\N
61253b79-2dd5-4f50-ad38-65ac7ed038d1	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	3b9610dc-9ecd-435e-a9cd-195c8ab1fbad	@Milsling liked your bar	f	2026-01-08 13:11:18.113829	\N
6eca6e1a-6343-4873-8f8b-1afeb2b7c9e0	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dde2ade8-f234-40c6-9253-ee4087fbd157	@Milsling liked your bar	f	2026-01-08 13:26:21.519411	\N
d6663d46-f6cc-4691-a823-62819a2bb831	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dde2ade8-f234-40c6-9253-ee4087fbd157	@Milsling liked your bar	f	2026-01-08 13:29:43.23484	\N
a507876f-3e75-49ac-8283-b8920dfde05b	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	45f2d76d-9012-4d27-a177-860bc2493253	@Milsling liked your bar	f	2026-01-08 13:29:45.635198	\N
ddb74c2a-3414-46a0-b8f3-4facd1d47946	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dde2ade8-f234-40c6-9253-ee4087fbd157	@Milsling liked your bar	f	2026-01-09 01:19:46.563477	\N
0db68a33-f877-4529-8353-cdfa4e8585ac	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dde2ade8-f234-40c6-9253-ee4087fbd157	@Milsling liked your bar	f	2026-01-09 04:12:34.004571	\N
efb28060-49cc-4add-bc7d-730cc9d145f6	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dde2ade8-f234-40c6-9253-ee4087fbd157	@Milsling liked your bar	f	2026-01-09 04:12:37.53328	\N
cb1a4132-7897-482e-aa3e-1c81513f285c	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	45f2d76d-9012-4d27-a177-860bc2493253	@Milsling liked your bar	f	2026-01-09 04:12:39.867527	\N
e6a99f6f-f536-4e85-82b4-4a7164551de7	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	152e4f6f-0843-42eb-8d10-577ba183f20a	@Milsling liked your bar	f	2026-01-09 04:12:41.589588	\N
a533332b-ea21-41d4-a02b-0be2847b5ae8	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	273dc2db-1aa4-4d3d-aba1-3ca0a5e36ebc	@Milsling liked your bar	f	2026-01-09 04:12:43.700867	\N
a1d3d847-f66e-4276-9528-faf7611cf521	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	dc552827-6566-41ca-978d-d259cbea1b1c	@Milsling liked your bar	f	2026-01-09 04:12:44.963807	\N
d6246ce7-cc4c-4e2b-bed3-d9f7af640ee7	307f9c75-2c84-4b32-8ee3-e576f71848fe	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	f	2026-01-09 05:16:37.92992	\N
e258d850-ec48-42c7-89df-346d0eb37572	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	message	2c3fcef7-59eb-4585-a7dc-4d14324afad9	\N	@Milsling sent you a message	f	2026-01-09 05:17:29.07525	\N
43e64e61-f2d2-4a46-8661-a559bffb949b	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	c21705a3-d3ca-406e-9b45-e119e8fe606f	dde2ade8-f234-40c6-9253-ee4087fbd157	@1smmeyer1 liked your bar	f	2026-01-09 10:48:55.752955	\N
b1bf4eb3-7014-4f13-84f6-f2aa16878d78	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	c21705a3-d3ca-406e-9b45-e119e8fe606f	45f2d76d-9012-4d27-a177-860bc2493253	@1smmeyer1 liked your bar	f	2026-01-09 10:48:59.968755	\N
0372dfd1-a57d-4d1a-947a-9e294af4237e	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	c21705a3-d3ca-406e-9b45-e119e8fe606f	152e4f6f-0843-42eb-8d10-577ba183f20a	@1smmeyer1 liked your bar	f	2026-01-09 10:49:03.493958	\N
adbe2e7f-22d2-49b6-b4e9-ca38fbd1e246	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	c21705a3-d3ca-406e-9b45-e119e8fe606f	273dc2db-1aa4-4d3d-aba1-3ca0a5e36ebc	@1smmeyer1 liked your bar	f	2026-01-09 10:49:11.283413	\N
8642bf2e-99db-4f70-bd27-380aeaae2a0a	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	3c0e501e-9b17-4ac1-992c-7c26dfefb1ee	@BBL-Buggy dropped a new bar	t	2026-01-08 03:50:31.20002	\N
97694c2c-fa7b-4882-b606-409013cbd3c3	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	c84ef0de-496a-4329-976c-a8bcd7007358	@BBL-Buggy dropped a new bar	t	2026-01-08 03:50:43.231381	\N
b89ca77a-e739-48ea-b59b-dab16e956656	2c3fcef7-59eb-4585-a7dc-4d14324afad9	bar_adopted	1520cea1-ed54-4add-8d3b-37260aa10746	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	@NotMilsling adopted your bar!	t	2026-01-12 04:07:46.413104	\N
2b9c9037-ff6a-4611-944e-931fb925b905	19f337b1-c1c1-450e-8a84-3a4efac4934f	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1038043-6172-4335-8e26-1f7d47615a63	@Milsling liked your bar	f	2026-01-24 09:48:00.148637	\N
43291974-acf3-469b-bcbc-c517d5ca4661	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	c21705a3-d3ca-406e-9b45-e119e8fe606f	3b9610dc-9ecd-435e-a9cd-195c8ab1fbad	@1smmeyer1 liked your bar	f	2026-01-09 10:49:53.441886	\N
e35f0d4f-3557-4eb7-a426-5c985892c191	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	95d6310c-a68d-4c87-aaea-c2f70cc02705	@BBL-Buggy dropped a new bar	t	2026-01-08 03:51:05.696333	\N
05708401-fbde-4811-bd95-559366e63b9c	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	307f9c75-2c84-4b32-8ee3-e576f71848fe	\N	@Satlybaboo sent you a message	t	2026-01-08 03:55:07.711842	\N
1c0b0b4f-69b5-44d4-84b3-3c730b3120a7	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	@BBL-Buggy sent you a message	t	2026-01-04 21:49:43.858224	\N
a7464f33-b631-47bb-b194-f9f77e416547	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	dc552827-6566-41ca-978d-d259cbea1b1c	@BBL-Buggy dropped a new bar	t	2026-01-04 21:52:54.945601	\N
b3159dcc-d2c4-4826-af7b-9788feb4ec37	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	273dc2db-1aa4-4d3d-aba1-3ca0a5e36ebc	@BBL-Buggy dropped a new bar	t	2026-01-05 13:56:38.607298	\N
00c5422d-013b-49f0-b7c3-932b5d70e11f	19f337b1-c1c1-450e-8a84-3a4efac4934f	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	e1038043-6172-4335-8e26-1f7d47615a63	@Milsling liked your bar	f	2026-01-24 09:49:21.975202	\N
86b1b2b1-33c3-43df-bed6-093c898a0485	2c3fcef7-59eb-4585-a7dc-4d14324afad9	like	307f9c75-2c84-4b32-8ee3-e576f71848fe	e1eec35d-54ed-416c-8bcd-416fb7df796c	@Satlybaboo liked your bar	t	2026-01-08 03:56:19.435196	\N
9f8b0138-8789-43cb-b71e-9dfd4fb9ecf0	2c3fcef7-59eb-4585-a7dc-4d14324afad9	like	307f9c75-2c84-4b32-8ee3-e576f71848fe	0af27598-4375-4aa2-81b8-ebcd18bc3388	@Satlybaboo liked your bar	t	2026-01-08 03:56:24.410622	\N
1ad5fcb8-99ad-4f63-893e-401e02d193c6	2c3fcef7-59eb-4585-a7dc-4d14324afad9	like	307f9c75-2c84-4b32-8ee3-e576f71848fe	e1aa38be-8e07-4eb8-b292-614d574c277b	@Satlybaboo liked your bar	t	2026-01-08 03:56:28.396729	\N
c9a944bc-b8c0-4857-86da-e747c786c121	2c3fcef7-59eb-4585-a7dc-4d14324afad9	like	307f9c75-2c84-4b32-8ee3-e576f71848fe	21e1789c-09c6-4334-aa8b-7c4b3c8a2d7d	@Satlybaboo liked your bar	t	2026-01-08 03:56:32.889151	\N
fd6ab66e-0f12-4052-a1a2-f0f73cd3cc80	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	152e4f6f-0843-42eb-8d10-577ba183f20a	@BBL-Buggy dropped a new bar	t	2026-01-08 03:56:56.786776	\N
9e62c27c-2493-483a-8ee7-b1d0188487cf	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	307f9c75-2c84-4b32-8ee3-e576f71848fe	\N	@Satlybaboo sent you a message	t	2026-01-08 03:57:14.855972	\N
562c3bb6-1d76-4139-b063-ee6919d3446f	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	45f2d76d-9012-4d27-a177-860bc2493253	@BBL-Buggy dropped a new bar	t	2026-01-08 04:08:20.089398	\N
71f5402f-cd33-4507-af30-1a8c8e252663	2c3fcef7-59eb-4585-a7dc-4d14324afad9	new_bar	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	dde2ade8-f234-40c6-9253-ee4087fbd157	@BBL-Buggy dropped a new bar	t	2026-01-08 04:15:11.267357	\N
387aaaba-209d-4a7b-ad03-261a0c9cfe3c	2c3fcef7-59eb-4585-a7dc-4d14324afad9	like	c21705a3-d3ca-406e-9b45-e119e8fe606f	e1eec35d-54ed-416c-8bcd-416fb7df796c	@1smmeyer1 liked your bar	t	2026-01-09 10:49:42.598262	\N
6f79e9ad-df67-4dab-a770-a87c064d11fd	2c3fcef7-59eb-4585-a7dc-4d14324afad9	like	c21705a3-d3ca-406e-9b45-e119e8fe606f	0af27598-4375-4aa2-81b8-ebcd18bc3388	@1smmeyer1 liked your bar	t	2026-01-09 10:49:49.00628	\N
f7bc6725-33df-4ba4-802f-67e6c1cb378c	2c3fcef7-59eb-4585-a7dc-4d14324afad9	like	c21705a3-d3ca-406e-9b45-e119e8fe606f	e1aa38be-8e07-4eb8-b292-614d574c277b	@1smmeyer1 liked your bar	t	2026-01-09 10:49:58.398985	\N
3e979561-0a63-4692-ae79-d50ebeeba8b7	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	273dc2db-1aa4-4d3d-aba1-3ca0a5e36ebc	@Milsling liked your bar	f	2026-01-10 07:57:22.290707	\N
e95a8750-ddb3-41bf-b884-a18d3b92a8e2	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	like	2c3fcef7-59eb-4585-a7dc-4d14324afad9	152e4f6f-0843-42eb-8d10-577ba183f20a	@Milsling liked your bar	f	2026-01-10 07:57:28.320223	\N
48fd3cbd-dd09-496c-be20-50483e9d1d4b	944b684c-3adb-4d49-b501-c7e11fc00510	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	@Milsling dropped a new bar	f	2026-01-11 00:45:38.975458	\N
f0dacc25-8818-4ac6-a598-91013262e621	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	@Milsling dropped a new bar	f	2026-01-11 00:45:39.013683	\N
5c55c813-bd9e-4652-9934-08806e7c0bb1	ba15fbc6-9a62-450f-a9a1-d56afabdc566	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	@Milsling dropped a new bar	f	2026-01-11 00:45:39.044541	\N
d7182cb0-899c-474f-bac0-874bd0e4aef4	4efb9a47-0db2-4fc2-94e9-8cd862ec9945	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	@Milsling dropped a new bar	f	2026-01-11 00:45:39.077914	\N
caa5560a-b5e5-47df-b91a-9a132c2c2ddd	307f9c75-2c84-4b32-8ee3-e576f71848fe	new_bar	2c3fcef7-59eb-4585-a7dc-4d14324afad9	25e2f8de-37cb-4ae8-a9fd-cf40d2fa8fef	@Milsling dropped a new bar	f	2026-01-11 00:45:39.108647	\N
f9e07bd3-e35a-4f0b-82e9-907fd74369e1	2c3fcef7-59eb-4585-a7dc-4d14324afad9	like	c21705a3-d3ca-406e-9b45-e119e8fe606f	21e1789c-09c6-4334-aa8b-7c4b3c8a2d7d	@1smmeyer1 liked your bar	t	2026-01-09 10:50:20.391326	\N
3bb1e2b5-0d51-4325-a22d-eaa5950e91d5	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	@BBL-Buggy sent you a message	t	2026-01-10 00:21:22.768467	\N
5ba6716f-f9d6-40e4-ac83-b35a2a94c90e	2c3fcef7-59eb-4585-a7dc-4d14324afad9	message	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	\N	@BBL-Buggy sent you a message	t	2026-01-10 11:28:29.965859	\N
\.


--
-- Data for Name: password_reset_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.password_reset_codes (id, email, code, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: profile_badges; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.profile_badges (id, name, display_name, description, image_url, emoji, color, background_color, border_color, animation, rarity, is_active, linked_achievement_id, created_by, created_at) FROM stdin;
46d69e89-7009-4949-be78-fa6b60200ce7	father-ob	DADDY	Father of Orphan Bars	\N	\N	#982abc	#2e063d	#371a94	pulse	legendary	t	\N	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-16 13:39:01.635249
b2252a25-ebb5-4033-8a74-f73d6ab6a958	nword	EN WURD	For being a realist	\N	\N	#d6d6d6	#563d2e	#ffffff	bounce	legendary	t	\N	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-16 17:40:02.156513
\.


--
-- Data for Name: protected_bars; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.protected_bars (id, content, notes, created_at, created_by, similarity_threshold) FROM stdin;
e21e9aa8-81c2-401d-bd04-b7363e1e45e9	Cocaine like cuticles cause it’s always on my nails.	Bait	2026-01-22 14:02:02.529065	2c3fcef7-59eb-4585-a7dc-4d14324afad9	80
\.


--
-- Data for Name: push_subscriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at) FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reports (id, reporter_id, bar_id, comment_id, user_id, reason, details, status, reviewed_by, reviewed_at, created_at) FROM stdin;
199f60c8-30d2-4b7d-9c3c-87fb683366b0	2c3fcef7-59eb-4585-a7dc-4d14324afad9	fa923eaf-7b99-4932-b8a9-6a6200804d93	\N	\N	illegal_content	Not cool	dismissed	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-08 03:11:30.708	2026-01-05 03:21:32.424303
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
uNvK0_TbMVJX3crQU5lEHUkTQiZzgo7-	{"cookie":{"secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"2c3fcef7-59eb-4585-a7dc-4d14324afad9"}}	2026-01-24 23:01:39
SN3eYxpxHfJnB4Zbcxv7WbxS87FE_Gj4	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-02-23T02:48:56.734Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"19f337b1-c1c1-450e-8a84-3a4efac4934f"}}	2026-02-23 22:10:29
rxIzM1CHcxfLOWfa8dFkK_hZBhEjlfSy	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-02-07T13:32:11.277Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"307f9c75-2c84-4b32-8ee3-e576f71848fe"}}	2026-02-15 01:52:06
TI3ICjtMAzboJicXsJHkK2sBZ8AE68we	{"cookie":{"secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"2c3fcef7-59eb-4585-a7dc-4d14324afad9"}}	2026-01-25 09:58:16
BlOOeqTPZCz7sXWmoiOAfESEpmMhKRtn	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-02-08T10:48:40.159Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"c21705a3-d3ca-406e-9b45-e119e8fe606f"}}	2026-02-08 10:53:31
fdV4FpUzLs6gI2M_u6GySaBBz0E-mLZu	{"cookie":{"originalMaxAge":2592000000,"expires":"2026-02-06T02:30:41.331Z","secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"2f6354fe-c1ab-442a-b3eb-a49348029dfe"}}	2026-02-15 19:27:53
7D2Xe8lPn-JYvyVkt7LnelaoSarcSun8	{"cookie":{"secure":true,"httpOnly":true,"path":"/","sameSite":"lax"},"passport":{"user":"2c3fcef7-59eb-4585-a7dc-4d14324afad9"}}	2026-01-25 09:51:00
\.


--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_achievements (id, user_id, achievement_id, unlocked_at) FROM stdin;
7039d45f-972a-4cfe-998a-b151a48a7089	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	first_bar	2026-01-04 03:16:44.521867
828ad4ea-f434-4b5c-a9ca-9366d1cde8e6	2c3fcef7-59eb-4585-a7dc-4d14324afad9	first_bar	2026-01-04 10:22:52.005189
ac1bb211-af89-4c4c-9929-d532dc0628c3	2f6354fe-c1ab-442a-b3eb-a49348029dfe	first_bar	2026-01-04 21:18:33.99666
55d41704-9fe7-4d7f-8391-7f6e90813201	4e83a22a-ef02-44eb-99c2-89970d6dcfd5	bar_slinger	2026-01-08 03:50:43.422199
77187900-2c9c-496f-b0ef-ec9744ee7931	2c3fcef7-59eb-4585-a7dc-4d14324afad9	custom_0d9617c6-1686-4e06-af66-b910c8536129	2026-01-12 03:48:02.528329
d55a791f-bd7b-45bb-92a4-7297b48bcc6d	19f337b1-c1c1-450e-8a84-3a4efac4934f	first_bar	2026-01-24 02:52:22.614248
\.


--
-- Data for Name: user_badges; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.user_badges (id, user_id, badge_id, source, source_details, granted_by, granted_at) FROM stdin;
35ec09fa-2d49-4a64-9281-db0e572e4d2c	2c3fcef7-59eb-4585-a7dc-4d14324afad9	46d69e89-7009-4949-be78-fa6b60200ce7	owner_gift	\N	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-16 13:39:35.14996
1ea5bd09-d764-45b0-99dd-a87945a6f5cc	2f6354fe-c1ab-442a-b3eb-a49348029dfe	b2252a25-ebb5-4033-8a74-f73d6ab6a958	owner_gift	\N	2c3fcef7-59eb-4585-a7dc-4d14324afad9	2026-01-16 17:40:48.320508
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, bio, avatar_url, membership_tier, membership_expires_at, location, email, email_verified, is_admin, username_changed_at, is_owner, online_status, last_seen_at, message_privacy, banner_url, displayed_badges, is_admin_plus, xp, level, last_xp_update, daily_xp_likes, daily_xp_comments, daily_xp_bookmarks) FROM stdin;
2f6354fe-c1ab-442a-b3eb-a49348029dfe	Bainjo	dcd70a4fa3401e51a97f1ca91490f9b08970a8a1bb3ea5ca66e09d4a15bdfc64d1a7951190c8246c0696a62e29a2feb14071de296376cb3dd5b1c096235abdf2.39ac90f25b4ec341ab5153eb754bb5c2	\N	\N	free	\N	\N	mrtylerbain@gmail.com	t	f	\N	f	online	2026-01-16 19:27:52.006	friends_only	\N	{b2252a25-ebb5-4033-8a74-f73d6ab6a958}	f	55	1	2026-01-16 14:39:42.87	0	0	0
c21705a3-d3ca-406e-9b45-e119e8fe606f	1smmeyer1	e3cb6a0a5f82420a15d74a0cdd785822aaa9c15c598b30ad4be6e6b923d21a925b68968c83b9e956c0db3d7f3616235461f200bdcf19ff3d92184f2f7d1e3592.e5fe32f093b3e3025f42db33c5e57340	\N	\N	free	\N	\N	shawnda.meyer19@yahoo.com	t	t	\N	f	offline	2026-01-09 10:53:30.082	friends_only	\N	\N	f	0	1	2026-01-15 14:02:51.028	0	0	0
944b684c-3adb-4d49-b501-c7e11fc00510	Smokedonkey	d5c9b962f938bf5fedea09a14ad8f7139606abf05bba60dc5482838c1920df665c52af9db45b0a2d6214c0c12ba14d539e0c6177961a5c36f9d42560539b0120.54d95f9d14ab7839527864b4e51b0074	\N	\N	free	\N	\N	franciscovillavicencio55@gmail.com	t	f	\N	f	offline	\N	friends_only	\N	\N	f	0	1	2026-01-15 14:02:51.39	0	0	0
4e83a22a-ef02-44eb-99c2-89970d6dcfd5	BBL-Buggy	f0c4031502af84036cd6eef5fcec45741230ab3b91acd866288f88eac661d0b0f317f4abfeafc32b63fef6c7cfeb0e6eb4d5e2f58c777cf922121aacad13c177.b2885e3a66ec84896af6e93a1bce0212	\N	/objects/uploads/997750e7-3495-4872-88f5-5b80e8e9ca6f	free	\N	\N	littlemankhaelen@gmail.com	t	t	\N	f	online	2026-01-11 16:43:43.389	friends_only	\N	{}	t	215	2	2026-01-15 14:02:51.734	0	0	0
1520cea1-ed54-4add-8d3b-37260aa10746	NotMilsling	1cc503859b93b304a9b676893c7fad3ee88f10ee530c6e7d535b97f0b0cb2e054d324a0038801a29b0be0135b59cbb67c84e27627e45548744b94dc8bdbb4612.110eed82dd5fcadcc53846a6330d1841	I’m not the creator of orphanbars.com!	/objects/uploads/b68b842e-a44b-428f-8254-eb72e5a84527	free	\N	Not Seattle	picconetrevor@gmail.com	t	t	\N	f	offline	2026-01-15 13:43:40.572	everyone	\N	\N	f	3	1	2026-01-15 14:02:52.404	0	0	0
307f9c75-2c84-4b32-8ee3-e576f71848fe	Satlybaboo	a464980db49fa9ca71e2731cda12a97ac5c37db59b8afb2e946209754ba6840ebafe8df905d4302ecc9a6cdb3d4f9b6dca8f9bb4e855e2b6716dac4562da678f.16aa4f0906ad2594e1d2b418b97867e0	\N	\N	free	\N	\N	jordynfrazier22@gmail.com	t	f	\N	f	online	2026-01-16 01:52:04.764	friends_only	\N	\N	f	0	1	2026-01-15 14:02:51.903	0	0	0
ba15fbc6-9a62-450f-a9a1-d56afabdc566	GenXjeezy	b15e0518fc34f45e10b28dce81ef7e4440bd716b598621f94cf7ca64ba233bfa0343db728f6e75012c1016e2d07a091f0ac768b34c76f6ffcf6bbe067e78c202.1258bed6f94d3f2277025a6a67faac5e	\N	\N	free	\N	\N	bfiu76@gmail.com	t	f	\N	f	online	2026-01-04 10:48:45.989	friends_only	\N	\N	f	0	1	2026-01-15 14:02:51.197	0	0	0
4efb9a47-0db2-4fc2-94e9-8cd862ec9945	Butertoast3	52e7b361f5393631eb5da0bf544625b1d0654af39a0ff80f9a946ff52e8c1c47c07a63f3a4cdd05b80ac8a8d883647d9b23e2da3159e0b41ab7af306ea3d03ae.0a826ac25187a1f05f9fdf37a6b57457	\N	\N	free	\N	\N	jon.noyb2@gmail.com	t	f	\N	f	online	2026-01-04 22:31:58.326	friends_only	\N	\N	f	0	1	2026-01-15 14:02:51.563	0	0	0
2c3fcef7-59eb-4585-a7dc-4d14324afad9	Milsling	2fae6c6290e6337804b5d62a52f70c043a8acee7eaeb8f4c6c25ab408af6577ce42a8253ec601108ced98cfeceb6bc15328a8df03eb184437ae8aebbbbddd74a.810ac0e93d4133ebebfa5734b6629e31	Creator of orphanbars.com!	/objects/uploads/f8755e8b-bb01-4c03-8917-616a4bd508ef	free	\N	Seattle, WA	trevorjpiccone@gmail.com	t	t	\N	t	online	2026-01-24 09:58:15.878	friends_only	/objects/uploads/d1fb7c8e-a47d-4825-8c89-e13675cd9e3b	{first_bar}	f	133	2	2026-01-17 02:17:29.381	0	0	0
19f337b1-c1c1-450e-8a84-3a4efac4934f	Clever_FTG	ebbc44c463e266047bfeb52d5036bb35658d150a713d0a863640dd1f1643b78b6bf31f2e0bdcc94f73c47a772fb0098215e5fa085e63798731cdf65dad5df3fd.15a8ef46b9840e18d497a754720ac8d6	\N	\N	free	\N	\N	egcrx88@gmail.com	t	f	\N	f	offline	2026-01-24 22:10:28.378	friends_only	\N	\N	f	35	1	2026-01-24 09:49:22.017	15	0	0
\.


--
-- Data for Name: verification_codes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.verification_codes (id, email, code, expires_at, created_at) FROM stdin;
4fcbab58-e6f3-477f-bec2-b1bb9279ba29	mrtylerbaim@gmail.com	385257	2026-01-01 02:21:32.436	2026-01-01 02:11:32.453008
990b85eb-9bd7-4fb3-8017-6de25d75336f	hymn2185@gmail.com	269294	2026-01-04 06:50:06.731	2026-01-04 06:40:06.751094
\.


--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE SET; Schema: _system; Owner: neondb_owner
--

SELECT pg_catalog.setval('_system.replit_database_migrations_v1_id_seq', 27, true);


--
-- Name: replit_database_migrations_v1 replit_database_migrations_v1_pkey; Type: CONSTRAINT; Schema: _system; Owner: neondb_owner
--

ALTER TABLE ONLY _system.replit_database_migrations_v1
    ADD CONSTRAINT replit_database_migrations_v1_pkey PRIMARY KEY (id);


--
-- Name: achievement_badge_images achievement_badge_images_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.achievement_badge_images
    ADD CONSTRAINT achievement_badge_images_pkey PRIMARY KEY (id);


--
-- Name: adoptions adoptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adoptions
    ADD CONSTRAINT adoptions_pkey PRIMARY KEY (id);


--
-- Name: adoptions adoptions_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adoptions
    ADD CONSTRAINT adoptions_unique UNIQUE (original_bar_id, adopted_by_bar_id);


--
-- Name: ai_review_requests ai_review_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_review_requests
    ADD CONSTRAINT ai_review_requests_pkey PRIMARY KEY (id);


--
-- Name: ai_settings ai_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_settings
    ADD CONSTRAINT ai_settings_pkey PRIMARY KEY (id);


--
-- Name: bar_sequence bar_sequence_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bar_sequence
    ADD CONSTRAINT bar_sequence_pkey PRIMARY KEY (id);


--
-- Name: bar_usages bar_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bar_usages
    ADD CONSTRAINT bar_usages_pkey PRIMARY KEY (id);


--
-- Name: bars bars_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bars
    ADD CONSTRAINT bars_pkey PRIMARY KEY (id);


--
-- Name: bookmarks bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_pkey PRIMARY KEY (id);


--
-- Name: bookmarks bookmarks_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_unique UNIQUE (user_id, bar_id);


--
-- Name: comment_dislikes comment_dislikes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comment_dislikes
    ADD CONSTRAINT comment_dislikes_pkey PRIMARY KEY (id);


--
-- Name: comment_dislikes comment_dislikes_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comment_dislikes
    ADD CONSTRAINT comment_dislikes_unique UNIQUE (user_id, comment_id);


--
-- Name: comment_likes comment_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_pkey PRIMARY KEY (id);


--
-- Name: comment_likes comment_likes_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_unique UNIQUE (user_id, comment_id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: custom_achievements custom_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_achievements
    ADD CONSTRAINT custom_achievements_pkey PRIMARY KEY (id);


--
-- Name: custom_categories custom_categories_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_categories
    ADD CONSTRAINT custom_categories_name_unique UNIQUE (name);


--
-- Name: custom_categories custom_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_categories
    ADD CONSTRAINT custom_categories_pkey PRIMARY KEY (id);


--
-- Name: custom_tags custom_tags_name_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_tags
    ADD CONSTRAINT custom_tags_name_unique UNIQUE (name);


--
-- Name: custom_tags custom_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_tags
    ADD CONSTRAINT custom_tags_pkey PRIMARY KEY (id);


--
-- Name: debug_logs debug_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.debug_logs
    ADD CONSTRAINT debug_logs_pkey PRIMARY KEY (id);


--
-- Name: direct_messages direct_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_pkey PRIMARY KEY (id);


--
-- Name: dislikes dislikes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dislikes
    ADD CONSTRAINT dislikes_pkey PRIMARY KEY (id);


--
-- Name: dislikes dislikes_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dislikes
    ADD CONSTRAINT dislikes_unique UNIQUE (user_id, bar_id);


--
-- Name: flagged_phrases flagged_phrases_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.flagged_phrases
    ADD CONSTRAINT flagged_phrases_pkey PRIMARY KEY (id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);


--
-- Name: follows follows_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_unique UNIQUE (follower_id, following_id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_unique UNIQUE (requester_id, receiver_id);


--
-- Name: likes likes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_pkey PRIMARY KEY (id);


--
-- Name: maintenance_status maintenance_status_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_status
    ADD CONSTRAINT maintenance_status_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_codes password_reset_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_codes
    ADD CONSTRAINT password_reset_codes_pkey PRIMARY KEY (id);


--
-- Name: profile_badges profile_badges_name_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.profile_badges
    ADD CONSTRAINT profile_badges_name_key UNIQUE (name);


--
-- Name: profile_badges profile_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.profile_badges
    ADD CONSTRAINT profile_badges_pkey PRIMARY KEY (id);


--
-- Name: protected_bars protected_bars_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.protected_bars
    ADD CONSTRAINT protected_bars_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_unique UNIQUE (user_id, achievement_id);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- Name: idx_replit_database_migrations_v1_build_id; Type: INDEX; Schema: _system; Owner: neondb_owner
--

CREATE UNIQUE INDEX idx_replit_database_migrations_v1_build_id ON _system.replit_database_migrations_v1 USING btree (build_id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: adoptions adoptions_adopted_by_bar_id_bars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adoptions
    ADD CONSTRAINT adoptions_adopted_by_bar_id_bars_id_fk FOREIGN KEY (adopted_by_bar_id) REFERENCES public.bars(id) ON DELETE CASCADE;


--
-- Name: adoptions adoptions_adopted_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adoptions
    ADD CONSTRAINT adoptions_adopted_by_user_id_users_id_fk FOREIGN KEY (adopted_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: adoptions adoptions_original_bar_id_bars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adoptions
    ADD CONSTRAINT adoptions_original_bar_id_bars_id_fk FOREIGN KEY (original_bar_id) REFERENCES public.bars(id) ON DELETE CASCADE;


--
-- Name: ai_review_requests ai_review_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_review_requests
    ADD CONSTRAINT ai_review_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: ai_review_requests ai_review_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_review_requests
    ADD CONSTRAINT ai_review_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ai_settings ai_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ai_settings
    ADD CONSTRAINT ai_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: bar_usages bar_usages_bar_id_bars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bar_usages
    ADD CONSTRAINT bar_usages_bar_id_bars_id_fk FOREIGN KEY (bar_id) REFERENCES public.bars(id) ON DELETE CASCADE;


--
-- Name: bar_usages bar_usages_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bar_usages
    ADD CONSTRAINT bar_usages_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bars bars_deleted_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bars
    ADD CONSTRAINT bars_deleted_by_users_id_fk FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: bars bars_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bars
    ADD CONSTRAINT bars_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookmarks bookmarks_bar_id_bars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_bar_id_bars_id_fk FOREIGN KEY (bar_id) REFERENCES public.bars(id) ON DELETE CASCADE;


--
-- Name: bookmarks bookmarks_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comment_dislikes comment_dislikes_comment_id_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comment_dislikes
    ADD CONSTRAINT comment_dislikes_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_dislikes comment_dislikes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comment_dislikes
    ADD CONSTRAINT comment_dislikes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_comment_id_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_likes comment_likes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comment_likes
    ADD CONSTRAINT comment_likes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_bar_id_bars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_bar_id_bars_id_fk FOREIGN KEY (bar_id) REFERENCES public.bars(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: custom_achievements custom_achievements_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_achievements
    ADD CONSTRAINT custom_achievements_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: custom_categories custom_categories_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_categories
    ADD CONSTRAINT custom_categories_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: custom_tags custom_tags_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_tags
    ADD CONSTRAINT custom_tags_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: direct_messages direct_messages_receiver_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_receiver_id_users_id_fk FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: dislikes dislikes_bar_id_bars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dislikes
    ADD CONSTRAINT dislikes_bar_id_bars_id_fk FOREIGN KEY (bar_id) REFERENCES public.bars(id) ON DELETE CASCADE;


--
-- Name: dislikes dislikes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.dislikes
    ADD CONSTRAINT dislikes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: flagged_phrases flagged_phrases_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.flagged_phrases
    ADD CONSTRAINT flagged_phrases_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: follows follows_follower_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_users_id_fk FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_following_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_users_id_fk FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_receiver_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_receiver_id_users_id_fk FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_requester_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_requester_id_users_id_fk FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: likes likes_bar_id_bars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_bar_id_bars_id_fk FOREIGN KEY (bar_id) REFERENCES public.bars(id) ON DELETE CASCADE;


--
-- Name: likes likes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.likes
    ADD CONSTRAINT likes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: maintenance_status maintenance_status_activated_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.maintenance_status
    ADD CONSTRAINT maintenance_status_activated_by_users_id_fk FOREIGN KEY (activated_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_actor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_bar_id_bars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_bar_id_bars_id_fk FOREIGN KEY (bar_id) REFERENCES public.bars(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_comment_id_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profile_badges profile_badges_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.profile_badges
    ADD CONSTRAINT profile_badges_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: protected_bars protected_bars_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.protected_bars
    ADD CONSTRAINT protected_bars_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: push_subscriptions push_subscriptions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_bar_id_bars_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_bar_id_bars_id_fk FOREIGN KEY (bar_id) REFERENCES public.bars(id) ON DELETE CASCADE;


--
-- Name: reports reports_comment_id_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_comment_id_comments_id_fk FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_users_id_fk FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_reviewed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reviewed_by_users_id_fk FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: reports reports_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.profile_badges(id) ON DELETE CASCADE;


--
-- Name: user_badges user_badges_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: user_badges user_badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict 6qxwCvM57w4b5YrdDXtH6hyJFqlirNhR613c7C84RY0upWk7W01DxeRvzFrHwbG

