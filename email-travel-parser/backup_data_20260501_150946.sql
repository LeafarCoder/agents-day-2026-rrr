SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict qvIcvDZehfIbqxewrcfHrpTC8G6nI0KPyLg3iBez6U6kfcMMF4WirTV0DqCutIE

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: activity_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."activity_categories" ("id", "name") VALUES
	('b7ef4b1f-9eaf-415b-af1e-44ba619ed2e8', 'food_dining'),
	('56961472-1e6b-4853-990a-3cad5b228d0d', 'culture_history'),
	('0a3d9e7a-f206-47f6-a4bd-57d9e9511cac', 'adventure_outdoor'),
	('baeb0afb-23c6-4952-9811-fed5eab98d50', 'nightlife'),
	('e8e6b6f3-ed91-4a95-acab-dc6e98baf41c', 'wellness'),
	('67f4893a-38a2-49fb-98d7-cbc3cd5a1bf5', 'sightseeing'),
	('3c853221-b5b4-439a-b6f9-1903e4b5821e', 'cuisine'),
	('8dfa01a8-3148-4dd3-881c-b1eda9dae6e2', 'accommodation'),
	('9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'transportation');


--
-- Data for Name: activity_keywords; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."activity_keywords" ("id", "category_id", "keyword") VALUES
	('fbef3000-f0e9-4937-8c7d-d0b24eb19631', 'b7ef4b1f-9eaf-415b-af1e-44ba619ed2e8', 'food tour'),
	('d8b0cfe6-4c0f-4194-b8ff-b861df7d999c', 'b7ef4b1f-9eaf-415b-af1e-44ba619ed2e8', 'cooking class'),
	('67e81117-8149-4057-a706-df0ee2dc10c4', 'b7ef4b1f-9eaf-415b-af1e-44ba619ed2e8', 'restaurant'),
	('74f127f5-fac1-4c41-a57a-00812c178b0f', 'b7ef4b1f-9eaf-415b-af1e-44ba619ed2e8', 'dinner'),
	('f5e6196f-6868-456c-a832-b5f9898c2ff2', 'b7ef4b1f-9eaf-415b-af1e-44ba619ed2e8', 'tasting'),
	('675449fd-9c56-4ff4-9799-17907cb0abfb', 'b7ef4b1f-9eaf-415b-af1e-44ba619ed2e8', 'wine tour'),
	('7205d135-5409-4ae8-855d-8649606c2c49', 'b7ef4b1f-9eaf-415b-af1e-44ba619ed2e8', 'culinary'),
	('7f4bdd14-5ba9-4e7b-ad29-1297606b0de5', 'b7ef4b1f-9eaf-415b-af1e-44ba619ed2e8', 'food experience'),
	('a54c07ef-958e-4ce8-bb32-8cfe57321a09', '56961472-1e6b-4853-990a-3cad5b228d0d', 'museum'),
	('66339729-aeba-499a-a605-e3e3b276532f', '56961472-1e6b-4853-990a-3cad5b228d0d', 'historical'),
	('6403dd9b-3135-4689-a84a-9aa5cc810d3f', '56961472-1e6b-4853-990a-3cad5b228d0d', 'walking tour'),
	('612c2e9d-bb76-4e77-8b4c-c61c7f8caa9f', '56961472-1e6b-4853-990a-3cad5b228d0d', 'heritage'),
	('344b3ac9-2b2b-468d-923b-710cdec2d90a', '56961472-1e6b-4853-990a-3cad5b228d0d', 'architecture'),
	('171887cb-6932-44c3-b39b-40bc31475be2', '56961472-1e6b-4853-990a-3cad5b228d0d', 'art tour'),
	('d8c7e8c3-2b6d-4a2d-8666-1d9ed5318aaa', '56961472-1e6b-4853-990a-3cad5b228d0d', 'cultural'),
	('bab252c6-47d4-4fb8-af33-678e6f8eea28', '56961472-1e6b-4853-990a-3cad5b228d0d', 'old town'),
	('2d2ab40d-e53d-40bb-b1d9-97b803d1acdc', '0a3d9e7a-f206-47f6-a4bd-57d9e9511cac', 'hiking'),
	('47590b69-b21f-4013-b068-10385bf21a89', '0a3d9e7a-f206-47f6-a4bd-57d9e9511cac', 'trekking'),
	('9732fc7d-bc4d-4de1-88c7-520dac3defe8', '0a3d9e7a-f206-47f6-a4bd-57d9e9511cac', 'kayak'),
	('a61cbf94-0976-463f-9259-bffcec15b566', '0a3d9e7a-f206-47f6-a4bd-57d9e9511cac', 'surf'),
	('ea5d1a64-e4b3-4ab0-942c-844e79a0c7be', '0a3d9e7a-f206-47f6-a4bd-57d9e9511cac', 'scuba'),
	('3e56f772-3b65-4fa4-a189-8d1ea04182c8', '0a3d9e7a-f206-47f6-a4bd-57d9e9511cac', 'climbing'),
	('0418cfe0-8e08-4966-8d28-fdbd65d73407', '0a3d9e7a-f206-47f6-a4bd-57d9e9511cac', 'safari'),
	('5c2d33b0-a334-4728-9b97-3c89e9cfeb3f', '0a3d9e7a-f206-47f6-a4bd-57d9e9511cac', 'zip line'),
	('539095b7-855f-4ffa-8d8d-98abcafb9895', '0a3d9e7a-f206-47f6-a4bd-57d9e9511cac', 'rafting'),
	('0879647f-3f2f-400f-a3dc-c21934df2e50', '0a3d9e7a-f206-47f6-a4bd-57d9e9511cac', 'cycling tour'),
	('ba600777-e971-4810-ae55-9b16bf74441e', 'baeb0afb-23c6-4952-9811-fed5eab98d50', 'nightlife tour'),
	('a498ec17-b088-40f9-af2c-a5b82d971f42', 'baeb0afb-23c6-4952-9811-fed5eab98d50', 'bar crawl'),
	('3809540a-f67d-40d2-8fa7-0c40fe3b023b', 'baeb0afb-23c6-4952-9811-fed5eab98d50', 'pub crawl'),
	('05688d53-5401-403c-b4d5-71be82e781f0', 'baeb0afb-23c6-4952-9811-fed5eab98d50', 'rooftop bar'),
	('d9a4f9b3-c04f-41e3-a095-38c87e16c8f6', 'baeb0afb-23c6-4952-9811-fed5eab98d50', 'cocktail'),
	('f7ef5f54-e170-4caf-ae25-e36c8ef8e186', 'e8e6b6f3-ed91-4a95-acab-dc6e98baf41c', 'spa'),
	('05d56dc7-7bd3-492b-bade-52288d345f8b', 'e8e6b6f3-ed91-4a95-acab-dc6e98baf41c', 'yoga retreat'),
	('45b42806-3cce-461d-b5c0-f434090fedab', 'e8e6b6f3-ed91-4a95-acab-dc6e98baf41c', 'meditation'),
	('c226e288-6e82-4803-ab0e-88cc5e196e90', 'e8e6b6f3-ed91-4a95-acab-dc6e98baf41c', 'wellness'),
	('9b73d9b0-8a1f-4bdb-af11-3838698a8e5c', 'e8e6b6f3-ed91-4a95-acab-dc6e98baf41c', 'massage'),
	('a634a755-a2fc-4a2d-b739-f2cb6c6010e8', '67f4893a-38a2-49fb-98d7-cbc3cd5a1bf5', 'city tour'),
	('b13a614d-86c3-4543-a3ef-7078a011484e', '67f4893a-38a2-49fb-98d7-cbc3cd5a1bf5', 'sightseeing'),
	('95e54a01-4569-4ea4-a32d-e5dd109cd8c7', '67f4893a-38a2-49fb-98d7-cbc3cd5a1bf5', 'bus tour'),
	('f1871f20-9c0a-40d6-bc57-b7445da66c10', '67f4893a-38a2-49fb-98d7-cbc3cd5a1bf5', 'boat tour'),
	('4bd864ae-1116-46b3-918c-da97658a3301', '67f4893a-38a2-49fb-98d7-cbc3cd5a1bf5', 'sunset cruise'),
	('2990f2bd-9dea-4fc5-8faa-22e3ffeb42c3', '67f4893a-38a2-49fb-98d7-cbc3cd5a1bf5', 'day trip'),
	('2123bc47-7f3c-47a9-a7a3-fac2f910f199', '67f4893a-38a2-49fb-98d7-cbc3cd5a1bf5', 'excursion'),
	('b25c9087-f7d2-4068-b740-6623f993c53a', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'italian'),
	('51ea4bdd-1e47-4676-8e43-ef5fda681b5b', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'japanese'),
	('aaf16cc3-3c95-4803-8f5a-ff52d0479f5f', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'mexican'),
	('9be5d571-809d-4675-91c0-d239d6e697c8', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'indian'),
	('72cd6681-9e0b-4b8e-b67f-89c5a9733864', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'chinese'),
	('433053d4-321b-47e4-bb49-fe946daeecb0', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'thai'),
	('bed15e16-0ce0-4625-86e3-c3b6bb32292e', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'french'),
	('99741844-714a-47e4-9d28-d542dd241040', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'spanish'),
	('bc0f1f98-0860-4add-ba7c-e1c335b1992f', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'portuguese'),
	('851cfc74-5c34-4ab5-8c4f-33dfd46ded07', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'greek'),
	('2daf02fd-d35b-4a08-bf1f-9fa4e6b6c72a', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'moroccan'),
	('0ed3f334-8e1e-425c-b273-55f6eafc7561', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'vietnamese'),
	('7e51e8bc-a0bd-4fb3-8c10-db23d394ea5c', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'korean'),
	('266bc9fa-b71e-4f3a-b156-eaffb6bd0ac4', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'american'),
	('a56bf9da-e6af-44db-88c3-5e3856400b92', '3c853221-b5b4-439a-b6f9-1903e4b5821e', 'mediterranean'),
	('78f6d827-16f3-4fc9-9789-d0dfd3921f82', '8dfa01a8-3148-4dd3-881c-b1eda9dae6e2', 'accommodation airbnb'),
	('29d44f02-5049-4a73-8042-48a63a206127', '8dfa01a8-3148-4dd3-881c-b1eda9dae6e2', 'airbnb'),
	('f33c180d-b3a8-457d-9740-e0662c7e28e3', '8dfa01a8-3148-4dd3-881c-b1eda9dae6e2', 'vacation rental'),
	('f0f93ba5-deb6-4618-a956-c14bbd851062', '8dfa01a8-3148-4dd3-881c-b1eda9dae6e2', 'apartment rental'),
	('591fb3e5-8752-4dd2-8fe0-1a0d7e69cf51', '8dfa01a8-3148-4dd3-881c-b1eda9dae6e2', 'accommodation hotel'),
	('d42f0224-d826-4b05-bdbc-8d3c43232af8', '8dfa01a8-3148-4dd3-881c-b1eda9dae6e2', 'hotel'),
	('717c2016-98f1-4756-8a32-6caddffbd972', '8dfa01a8-3148-4dd3-881c-b1eda9dae6e2', 'hostel'),
	('122ce2db-7e76-4dbf-9ba1-f30229183e48', '8dfa01a8-3148-4dd3-881c-b1eda9dae6e2', 'resort'),
	('beb974ad-fbb8-4203-8526-75f5a37b5964', '8dfa01a8-3148-4dd3-881c-b1eda9dae6e2', 'bed and breakfast'),
	('a34dba80-248f-4e96-bbf4-952a946e19f7', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'flight'),
	('e83d7110-6fe8-4e55-9681-29d10bc08d97', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'e-ticket'),
	('a8906f70-e920-4f67-a70d-296318a83ab5', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'boarding'),
	('99d66522-04e0-4f9a-963c-1a6a88d47b57', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'itinerary'),
	('749450dd-ba34-4dc1-90af-3d45b5c7b103', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'budget flight'),
	('a95b3e0c-7c80-44cf-84a1-50a0a2a08e2b', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'business class'),
	('2445c73f-d86c-464a-b21d-003071dda9bb', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'first class'),
	('dedcb88c-860d-44bf-8695-a1bc8fb3253a', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'economy class'),
	('521d9d02-b33f-49ab-99c8-053b2cb0768d', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'train'),
	('d8e690fd-dd09-4d74-93e8-52aacf7669f5', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'bus'),
	('baed81de-fd5f-4576-8e57-0992fc802b0d', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'coach'),
	('5c142db4-66ef-4e9b-86f3-fb76bb3ca68a', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'ferry'),
	('438baff3-e210-40df-a619-e104271304c8', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'cruise'),
	('b5b2a28a-c4f3-4076-a456-e28fd30cea3a', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'car rental'),
	('a94a830b-c3e1-4f75-917b-af9abe1892e0', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'taxi'),
	('908f4091-c40a-421d-8509-c4f2ba5157c2', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'transfer'),
	('a59b5022-106c-4060-9bd7-f6acf2345333', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'shuttle'),
	('ace2997e-5109-4aaf-959a-7822984823f6', '9d5f6ec4-d3ad-4095-ad18-5952aa560e0b', 'tuk-tuk');


--
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."countries" ("id", "name", "code") VALUES
	('5d7c78bf-b4e6-4bbf-8ef7-7bc9fddaa50b', 'Singapore', 'SG'),
	('c3e85d43-e6f3-43bd-a3a6-610ce7769223', 'France', 'FR'),
	('41d73a4a-e82b-42f7-81e9-f8ddf69d4630', 'Italy', 'IT'),
	('cdea1bc6-afef-4ed9-b08f-8f52ffb7dab0', 'Spain', 'ES'),
	('b84a8264-1658-47fb-a5a6-1c21c0b28b49', 'Portugal', 'PT');


--
-- Data for Name: cities; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."cities" ("id", "name", "country_id") VALUES
	('5c2a3edc-be85-4e90-a1f8-a891a3d20043', 'Singapore', '5d7c78bf-b4e6-4bbf-8ef7-7bc9fddaa50b'),
	('7d8bd27e-3aad-43a2-8fd1-2ce8959eafd9', 'Paris', 'c3e85d43-e6f3-43bd-a3a6-610ce7769223'),
	('8ff16a7b-f364-4ab1-bc26-bf7ddb0f60aa', 'Rome', '41d73a4a-e82b-42f7-81e9-f8ddf69d4630'),
	('e6a3a6d5-f3ed-4d67-8b43-1e269f9fc22c', 'Barcelona', 'cdea1bc6-afef-4ed9-b08f-8f52ffb7dab0'),
	('270d023d-3625-4fb8-b468-0b7d0673537a', 'Lisbon', 'b84a8264-1658-47fb-a5a6-1c21c0b28b49'),
	('e333534b-0c87-424d-8da4-f1d34ab8d15c', 'Alentejo', 'b84a8264-1658-47fb-a5a6-1c21c0b28b49');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."users" ("id", "email", "created_at", "last_scanned_at", "oldest_email_scanned") VALUES
	('efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'email.travel.parser@gmail.com', '2026-05-01 10:28:14.07324+00', '2026-05-01 13:58:33.057711+00', '2020-06-05 00:00:00+00');


--
-- Data for Name: travels; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."travels" ("id", "user_id", "destination_city_id", "title", "start_date", "end_date", "created_at") VALUES
	('9c527ec8-bb66-4bab-8136-36d5340ca4c9', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '5c2a3edc-be85-4e90-a1f8-a891a3d20043', 'Singapore', '2018-09-15', '2018-09-15', '2026-05-01 12:35:06.270159+00'),
	('9f44b375-7451-4580-a8b8-288323cdb661', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '7d8bd27e-3aad-43a2-8fd1-2ce8959eafd9', 'Paris', '2026-05-01', '2026-05-01', '2026-05-01 12:35:07.047541+00'),
	('b6c2ee67-fc0b-4f57-8563-2a3832de6760', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '8ff16a7b-f364-4ab1-bc26-bf7ddb0f60aa', 'Rome', '2026-05-01', '2026-05-01', '2026-05-01 12:35:08.30022+00'),
	('19d80320-0485-49a1-9f3a-b10682b6ecc0', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'e6a3a6d5-f3ed-4d67-8b43-1e269f9fc22c', 'Barcelona', '2016-03-13', '2016-03-13', '2026-05-01 12:35:08.901821+00'),
	('2d256085-5e30-47fb-82cf-3c2e7d9dd64e', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '270d023d-3625-4fb8-b468-0b7d0673537a', 'Lisbon', '2024-01-12', '2024-01-12', '2026-05-01 12:35:10.120483+00'),
	('68c55ad5-a642-413f-9006-85e1404fe211', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'e333534b-0c87-424d-8da4-f1d34ab8d15c', 'Alentejo', '2025-05-10', '2025-05-10', '2026-05-01 13:19:15.709227+00');


--
-- Data for Name: emails; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."emails" ("id", "user_id", "gmail_msg_id", "sender_domain", "subject", "email_date", "travel_id", "created_at") VALUES
	('829f9b76-80c2-4189-8482-eda20229ebd7', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '19de10caee21c084', NULL, 'Your trip to Paris is confirmed - Louvre museum and wine tasting', '2026-05-01', '9f44b375-7451-4580-a8b8-288323cdb661', '2026-05-01 10:28:15.135508+00'),
	('2da4de77-706a-4e2a-a137-52b26e3121c4', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18e749f99cd07251', 'easyjet.com', 'Complete your Lisbon booking — prices going up tomorrow', '2024-03-25', NULL, '2026-05-01 11:49:03.600599+00'),
	('6e168cff-b957-4edc-bf1e-9884bdee495b', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1835a04ae7ec599c', 'getyourguide.com', 'Confirmed: Northern Lights & glacier hike combo – 23 Sept 2022', '2022-09-20', NULL, '2026-05-01 11:35:16.595055+00'),
	('2e755f66-97db-4117-9834-a64144b3f0f6', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1834fd36e2f0187c', 'easyjet.com', 'Booking confirmed: EZY6690 London LGW → Reykjavik KEF', '2022-09-18', NULL, '2026-05-01 11:35:16.669684+00'),
	('cd81ea4c-d76f-409b-a86c-02ec9ec8ddb6', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '192899cae3512ac1', NULL, 'CONGRATULATIONS Adrien — you''ve won a FREE trip to the Maldives!', '2024-10-14', NULL, '2026-05-01 11:49:02.955358+00'),
	('491702bb-93f3-45bf-9dc6-b8c558852e33', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '19c3ce88e15f13c1', 'viator.com', 'Booking confirmed: private Portuguese cooking class – 12 Feb 2026', '2026-02-08', NULL, '2026-05-01 10:28:15.564929+00'),
	('4147b26c-5e39-43dd-b5e1-d60675a19206', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '191e018b09e770c9', 'getyourguide.com', 'Confirmed: Madeira levada hike & whale watching – 14 Sept 2024', '2024-09-11', NULL, '2026-05-01 11:49:03.04787+00'),
	('fbe7b64f-14b3-4aea-b4b3-ad880c0ec422', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '191c169762f2be16', NULL, 'Booking confirmed – TP1753 Lisbon LIS → Funchal FNC (Madeira)', '2024-09-05', NULL, '2026-05-01 11:49:03.171212+00'),
	('0333b083-8798-4bde-bf45-7c1e6d5b67bd', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1916f03b7a866c3d', NULL, 'Your train booking: Lisbon Oriente → Porto Campanhã', '2024-08-20', NULL, '2026-05-01 11:49:03.250685+00'),
	('0a502167-6253-4784-9bf7-cb9bdb76a1ae', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '19b8d2b8c92f3fd9', 'airbnb.com', 'Your trip ideas: Tokyo — saved experiences & homes', '2026-01-05', NULL, '2026-05-01 10:28:15.639244+00'),
	('c83db103-6fd5-4e27-a86c-1cb113942b97', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '19d4d34d11dbd98e', NULL, 'Booking confirmed – TP1360 Lisbon LIS → London LHR', '2026-04-02', NULL, '2026-05-01 10:28:15.206886+00'),
	('d9747fef-437f-45bf-b9ac-2d34f3b2fef9', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18d9275a47ce1462', NULL, 'Booking confirmed: Pastel de nata baking class – 14 February 2024', '2024-02-10', NULL, '2026-05-01 11:49:03.677644+00'),
	('d06f173f-a2e0-4fe9-ae12-227a025dff78', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1866449be6fe163e', 'getyourguide.com', 'Confirmed: Marrakech souk food tour & Atlas Mountains hike', '2023-02-18', NULL, '2026-05-01 11:35:16.351822+00'),
	('6daf0fe0-533c-4d11-b7c8-db3bf0c9fe4d', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1864f5de92182901', 'ryanair.com', 'Your booking: FR1472 London STN → Marrakech RAK, 24 February', '2023-02-14', NULL, '2026-05-01 11:35:16.430545+00'),
	('3c4f8e60-97cc-4592-be02-e345a48bf472', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18595c20bbd48737', 'booking.com', 'Adrien, here are the hottest places to visit in 2023', '2023-01-09', NULL, '2026-05-01 11:35:16.51907+00'),
	('ca0c57b0-edc8-488b-8695-9254019e533b', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '196b9354c8857b54', 'booking.com', 'Booking confirmed: Monte da Ravasqueira wine estate, Alentejo', '2025-05-10', '68c55ad5-a642-413f-9006-85e1404fe211', '2026-05-01 11:11:29.80573+00'),
	('52774a6f-5ee6-4aa9-913c-8cc5b0b1c2ef', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '181f6e4d0cacd17a', 'getyourguide.com', 'Confirmed: Lisbon Alfama & Mouraria food tour – 15 July 2022', '2022-07-13', NULL, '2026-05-01 11:35:16.748394+00'),
	('3f016946-ee4c-4ee7-b9d3-1ffaa97991c7', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '181e78d35f84bfaf', NULL, 'Booking confirmed – TP1369 London LHR → Lisbon LIS', '2022-07-10', NULL, '2026-05-01 11:35:16.844586+00'),
	('b41a5f37-126e-4de5-9c54-fa0a88246b60', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18088eee9890ae05', 'eurostar.com', 'Your Eurostar e-ticket: London St Pancras → Paris Gare du Nord', '2022-05-03', NULL, '2026-05-01 11:35:16.916602+00'),
	('e2169c13-50eb-46e8-8c08-396fdfacc14f', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '180176c10d32cbf2', 'airbnb.com', 'Your saved homes in Lisbon are still available', '2022-04-11', NULL, '2026-05-01 11:35:17.001707+00'),
	('08c67964-2238-480b-b481-fd61c06273b1', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '17e90ad8c8aaae86', 'getyourguide.com', 'Confirmed: Edinburgh whisky tasting & Old Town ghost tour  – 29 Jan', '2022-01-25', NULL, '2026-05-01 11:35:17.07843+00'),
	('d763b3f9-cdc1-4986-8553-5959f670dcc1', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '179f337f00ccf1c1', NULL, 'Booking confirmed: QF1 Sydney SYD → London LHR', '2021-06-10', NULL, '2026-05-01 11:35:17.150768+00'),
	('b6f4ac8c-00c0-4e19-9f90-1f6944ff1bca', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1795f6008c3b15e1', 'easyjet.com', 'Don''t miss these summer deals — flights from £19.99', '2021-05-12', NULL, '2026-05-01 11:35:17.25891+00'),
	('5c2143b5-fd3a-400f-8b67-941d07c78aa4', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1779e28a497c336c', 'viator.com', 'Booking confirmed: Margaret River wine & brewery half-day tour', '2021-02-14', NULL, '2026-05-01 11:35:17.3353+00'),
	('542ec8e6-fc8b-4102-9582-c8b4a9d56f0f', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '17369a09a59e78b7', 'getyourguide.com', 'Confirmed: Uluru base walk & Kata Tjuta guided tour – 25 July 2020', '2020-07-20', NULL, '2026-05-01 11:35:17.509873+00'),
	('0f7cd0d4-bb86-425d-ae31-959863783276', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '17281900879a06ef', NULL, 'Booking confirmed: Great Barrier Reef snorkel & dive day  – 10 June 2020', '2020-06-05', NULL, '2026-05-01 11:35:17.593375+00'),
	('bf83d88e-1cb9-4dad-8d09-6067b9b9ad80', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '195b335c260e49cf', 'getyourguide.com', 'Confirmed: Azores whale watching & canyoning – 28–29 March 2025', '2025-03-20', NULL, '2026-05-01 11:49:02.612625+00'),
	('5ef72332-7ed4-4bec-a2de-9ffa63ef2b9d', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '195993f08481548e', NULL, 'Booking confirmed – S4 402 Lisbon LIS → Ponta Delgada PDL', '2025-03-15', NULL, '2026-05-01 11:49:02.68199+00'),
	('c5275b4c-2eec-41e3-85c5-8638c825ec1f', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '19d0a7913a24c53c', NULL, 'Reserva confirmada: Navegação ao pôr do sol – 25 março 2026', '2026-03-20', NULL, '2026-05-01 10:28:15.31982+00'),
	('6c2464a9-e789-4672-8a5d-f6a927187adc', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '19cd6c28d17657ec', 'viator.com', 'Your personalised travel ideas for spring 2026 🌸', '2026-03-10', NULL, '2026-05-01 10:28:15.413614+00'),
	('862281d0-c524-4e8e-a507-c526d8a18af1', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1980d347b09c0104', 'getyourguide.com', 'Confirmed: Marrakech private cooking class & desert overnight', '2025-07-15', NULL, '2026-05-01 11:11:29.433219+00'),
	('1a2ae295-a428-4111-aa6e-16151743f082', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '197729a3d0afb6cb', 'booking.com', 'Your booking confirmed: Algarve resort — plus: our summer sale 🌞', '2025-06-15', NULL, '2026-05-01 11:11:29.592827+00'),
	('c766a8a8-7248-4a0a-ab5d-d2c2267e1a69', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1972fde7f823a31c', NULL, 'Your train booking: Lisbon Santa Apolónia → Seville Santa Justa', '2025-06-02', NULL, '2026-05-01 11:11:29.725542+00'),
	('aec5e0f6-89bd-4e7f-936b-dad593284ff3', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '19522ccc57c3f371', 'viator.com', 'Booking confirmed: Arrábida kayaking & snorkeling – 22 Feb 2025', '2025-02-20', NULL, '2026-05-01 11:49:02.766138+00'),
	('d1c41226-e693-41a3-948d-00face032a3f', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '19cbd709cf78d56e', 'getyourguide.com', 'Confirmed: Lisbon Pombaline & azulejo architecture walk – 8 Mar 2026', '2026-03-05', NULL, '2026-05-01 10:28:15.484973+00'),
	('b8c09a74-681a-4c86-a946-14e22bd2e190', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18f8aedee542c567', 'viator.com', 'Booking confirmed: Tagus River sunset sailing – 22 May 2024', '2024-05-18', NULL, '2026-05-01 11:49:03.336641+00'),
	('10ef7427-5b11-4c80-8ba6-b81bb7e4c4ab', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1777f270755c5666', NULL, 'Booking confirmed: VA480 Sydney SYD → Perth PER', '2021-02-08', NULL, '2026-05-01 11:35:17.419636+00'),
	('417c5853-868d-4800-9036-6c38e63afa80', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '19482b9c4c7fd88f', 'getyourguide.com', 'Review our top tours in Lisbon — what''s hot in 2025', '2025-01-20', NULL, '2026-05-01 11:49:02.86091+00'),
	('4081bf27-fcc3-4777-a789-530cec08066a', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18ed1bfecfdfbec1', 'getyourguide.com', 'Confirmed: Sintra small-group hiking tour – 15 April 2024', '2024-04-12', NULL, '2026-05-01 11:49:03.503072+00'),
	('cd273797-b92e-4c2a-ad11-7d4265fea3ae', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18cfd1d389e0a14d', 'airbnb.com', 'Long-stay reservation confirmed – Príncipe Real, Lisbon', '2024-01-12', '2d256085-5e30-47fb-82cf-3c2e7d9dd64e', '2026-05-01 11:49:03.795461+00'),
	('1ef81150-d8e7-451f-9c32-2ba43e02a570', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18be216623e75ca6', 'getyourguide.com', 'Confirmed: Berlin Cold War history tour & craft beer tasting  – 25 Nov', '2023-11-18', NULL, '2026-05-01 11:49:03.977663+00'),
	('d5fe9e87-ff77-4659-b4cb-478701a00113', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18842e6c5d729228', 'viator.com', 'Booking confirmed: Capri boat trip & Blue Grotto – 23 May 2023', '2023-05-22', NULL, '2026-05-01 11:49:04.163224+00'),
	('7969da09-72eb-43cf-b538-f4e1d57de873', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18804ac99149b833', 'easyjet.com', 'Booking confirmed: EZY2880 London LGW → Naples NAP', '2023-05-10', NULL, '2026-05-01 11:49:04.363407+00'),
	('e8449ab8-3a8d-49d7-98ba-2b0402d7bf3b', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18a122c2fbe9eb7f', NULL, 'Order confirmed: Specialty coffee cupping workshop – 25 Aug 2023', '2023-08-20', NULL, '2026-05-01 12:19:50.779132+00'),
	('781f31f9-f446-4b88-8517-a2547edffc0d', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18437919bb348bd1', NULL, 'Order confirmed: Amsterdam Dance Event – ADE 2022 club pass', '2022-11-02', NULL, '2026-05-01 12:19:51.692887+00'),
	('8b51bb54-7941-49c4-b317-60c2d8e6f15f', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '170ea82b632c8ee1', 'viator.com', 'Adrien, here are your top tour ideas for Australia 🦘', '2020-03-18', NULL, '2026-05-01 12:19:53.248978+00'),
	('ca3e4f68-7d70-4102-947f-018ab96fe06b', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '19de10cc31ffd1b9', NULL, 'Your stay in Rome is confirmed - Hilton', '2026-05-01', 'b6c2ee67-fc0b-4f57-8563-2a3832de6760', '2026-05-01 12:19:47.618121+00'),
	('52faf8a5-dd21-4394-b52a-bba7e54d0a32', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1961469ccd5a3df0', NULL, 'Acumule o dobro de milhas em voos TAP até 30 de abril', '2025-04-08', NULL, '2026-05-01 12:19:48.792534+00'),
	('836f8db0-a4b8-474a-b53a-2ebf39906ec3', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1881ea353d9ade48', 'viator.com', 'Confirmed: Naples pizza-making class & Pompeii guided tour', '2023-05-15', NULL, '2026-05-01 11:49:04.286568+00'),
	('ec1194be-cd4b-4199-9b1e-3a0db6d42550', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '16fca1e97f2576eb', 'viator.com', 'Booking confirmed: Melbourne street art & laneways walking tour', '2020-01-22', NULL, '2026-05-01 12:19:53.347621+00'),
	('70648b54-68d4-4399-81f6-444bbf486036', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '16fa64900e4c9571', NULL, 'Booking confirmed: JQ411 Sydney SYD → Melbourne MEL', '2020-01-15', NULL, '2026-05-01 12:19:53.435391+00'),
	('6b8d6259-8115-485d-8dec-ca9bb3c6680f', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '16e85e4e0d34397b', NULL, 'Booking confirmed: QF74 Singapore SIN → Sydney SYD', '2019-11-20', NULL, '2026-05-01 12:19:53.518397+00'),
	('3f032938-26b4-4cd1-aa1f-fb1549c6ec3e', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '16e0fe07bb37328f', 'booking.com', 'Booking request submitted – awaiting confirmation from the property', '2019-10-28', NULL, '2026-05-01 12:19:53.619988+00'),
	('837e61ee-42ed-4428-82b3-37a2059adfd8', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '16dbd0cdcc9943d6', 'getyourguide.com', 'Confirmed: Mount Batur sunrise hike – 14 October 2019', '2019-10-12', NULL, '2026-05-01 12:19:53.713011+00'),
	('d1c860f7-f002-4640-8094-0a71ec74c54b', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '16d0e7df9e9095d4', 'viator.com', 'Booking confirmed: Palawan island hopping – El Nido, 11 Sept 2019', '2019-09-08', NULL, '2026-05-01 12:19:53.802018+00'),
	('5878b22e-73fa-4526-8d24-45c84007512a', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '16c794104278ff6a', 'klook.com', 'Activity confirmed: Kuala Lumpur food walk – 13 August 2019', '2019-08-10', NULL, '2026-05-01 12:19:53.897038+00'),
	('58818568-14fe-4b55-ab2d-b7abf27c71ba', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '16bf35bad52b207b', NULL, 'Confirmed: 2-dive boat trip – Koh Tao, 18 July 2019', '2019-07-15', NULL, '2026-05-01 12:19:53.971443+00'),
	('669491dd-cc8c-4cb0-8118-fa93ba5f8806', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '16b7ccdf1fe622b6', NULL, 'Booking confirmed: Single day visit – 25 June 2019', '2019-06-22', NULL, '2026-05-01 12:19:54.063302+00'),
	('299defdb-c2f2-4784-95c5-97f82cae20a3', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '16b25cb2b4b00323', 'getyourguide.com', 'Booking confirmed: Bangkok food tour – Chinatown & street eats', '2019-06-05', NULL, '2026-05-01 12:19:54.14959+00'),
	('9314ab60-1cba-4547-8647-d8e0e7ff59bd', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '16a9f936c3a8b464', NULL, 'Booking confirmed: E-bike temple tour – 14 May 2019', '2019-05-10', NULL, '2026-05-01 12:19:54.224772+00'),
	('56139014-e865-4686-966f-a0e8a7fddcfe', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '169dc18b2e671485', 'klook.com', 'Activity confirmed: Luang Prabang Kuang Si waterfall + Mekong sunset', '2019-04-02', NULL, '2026-05-01 12:19:54.416915+00'),
	('9b1caf0b-f520-4314-a6c9-6f3a8f0f7095', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '169989cb334dc004', 'klook.com', 'Your trip ideas for Southeast Asia 🌴', '2019-03-20', NULL, '2026-05-01 12:19:54.532433+00'),
	('56ecf7d8-d174-448e-8285-0d568f09e47d', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1694ca6e5dfa1c13', 'getyourguide.com', 'Confirmed: Angkor Wat sunrise tuk-tuk tour – 8 March 2019', '2019-03-05', NULL, '2026-05-01 12:19:54.632923+00'),
	('6eb5891b-1ef6-4eed-bfe4-1a29e85a4921', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '168cad540ddceef9', NULL, 'Booking confirmed: Hoi An cooking class – 12 February 2019', '2019-02-08', NULL, '2026-05-01 12:19:54.733294+00'),
	('e9d24f05-92d5-4da7-8eae-2b18d9bf2548', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1686985c14fbdb49', 'getyourguide.com', 'Booking confirmed: Hanoi street food tour by motorbike – 21 Jan', '2019-01-20', NULL, '2026-05-01 12:19:54.827691+00'),
	('e20e69cd-80db-4587-a790-f5b112c51916', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1685462fcfabb1e6', 'klook.com', 'Activity confirmed: 2D1N Ha Long Bay cruise – 22 January 2019', '2019-01-16', NULL, '2026-05-01 12:19:54.904273+00'),
	('1e4b352e-2d89-40d0-81fa-e4fd5e039c50', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1683bb5d8af62f39', 'booking.com', 'Booking confirmation: Hanoi Old Quarter Guesthouse', '2019-01-11', NULL, '2026-05-01 12:19:54.983758+00'),
	('e7cf2a84-b00b-4237-aa56-bb0a24f69cf9', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '168357cd587782d9', NULL, 'Booking confirmed: AK528 Singapore → Hanoi, 18 January 2019', '2019-01-10', NULL, '2026-05-01 12:19:55.078933+00'),
	('71b264ed-e976-4047-ab49-a55c6e44adad', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '166d226083f7c08d', NULL, 'Dive trip confirmed: Pulau Hantu – 10 November 2018', '2018-11-02', NULL, '2026-05-01 12:19:55.156616+00'),
	('47ee565b-ff8e-477f-9482-6c504fb62bf2', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '165da86eccfe3716', 'airbnb.com', 'Reservation confirmed – Tiong Bahru studio, Singapore', '2018-09-15', '9c527ec8-bb66-4bab-8136-36d5340ca4c9', '2026-05-01 12:19:55.314165+00'),
	('96c3c261-f7a5-4658-8ab2-a19380865797', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1659982a2e4a45fb', NULL, 'E-ticket confirmation: SQ327 Paris CDG → Singapore Changi', '2018-09-02', NULL, '2026-05-01 12:19:55.396201+00'),
	('06004dec-ae1a-495b-9712-7ce8daad77ee', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '164e9c59f544951e', 'booking.com', 'Adrien, your next stay in Singapore is waiting 🏙', '2018-07-30', NULL, '2026-05-01 12:19:55.479153+00'),
	('a37de92c-f66a-49d8-ac3f-5bc65cbe1976', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '162ae762129f256b', NULL, 'Your booking: Paris Gare du Nord → Amsterdam Centraal (Thalys)', '2018-04-10', NULL, '2026-05-01 12:19:55.55424+00'),
	('26f902da-86bf-42d2-a308-6149d088b2be', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '15e46ea179259c6a', NULL, 'Booking confirmed: Tandem skydive – 9 September 2017', '2017-09-03', NULL, '2026-05-01 12:19:55.638838+00'),
	('c1f6721d-0680-4dbe-984e-cd50b9a1c45b', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '15d8e6e9d5ca775d', NULL, 'Booking confirmed: Amsterdam canal cruise – 30 July 2017', '2017-07-29', NULL, '2026-05-01 12:19:55.805888+00'),
	('4da6bbb7-c2d3-4bda-8d07-20e4dd361282', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '15c2ebda7be0937c', 'viator.com', 'Review our top tours in Paris this summer 🗼', '2017-05-22', NULL, '2026-05-01 12:19:55.905711+00'),
	('ed6aee8b-027b-4ecb-b820-b28210bab4f9', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '15bb8b941993355c', NULL, 'Confirmed: Tandem paragliding flight – 6 May 2017', '2017-04-29', NULL, '2026-05-01 12:19:56.067936+00'),
	('46d9e121-02b8-4ccb-bc5d-d56a75a1d846', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '15861d999ab50d9d', 'getyourguide.com', 'Your saved tour in Loire Valley is getting popular 🔥', '2016-11-14', NULL, '2026-05-01 12:19:56.22092+00'),
	('a808c4dd-ab1b-4908-b356-4cbcd63a85d7', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '154700d4b39fb86f', 'ryanair.com', 'Price alert: London Stansted → Rome from €9.99– book now!', '2016-05-02', NULL, '2026-05-01 12:19:56.42098+00'),
	('600c5c14-03ef-403b-be79-39088af05b84', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '15383bfd2fb9e387', 'getyourguide.com', 'Your booking is confirmed: Gothic Quarter & El Born walking tour', '2016-03-17', NULL, '2026-05-01 12:19:56.519465+00'),
	('2575c4be-61f2-4b0c-9d91-e0ae28f6ad78', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '153702b4f3ca4f5e', 'airbnb.com', 'Reservation confirmed – Eixample apartment, Barcelona', '2016-03-13', '19d80320-0485-49a1-9f3a-b10682b6ecc0', '2026-05-01 12:19:56.637062+00'),
	('bb8a2012-6eea-4c1c-ab2f-8e39d4aae6b7', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '15369d6d576969bf', 'vueling.com', 'Your booking is confirmed – VY8432 Paris ORY → Barcelona BCN', '2016-03-12', NULL, '2026-05-01 12:19:56.7153+00'),
	('888f467c-4520-4585-b6f6-10c7f1cc76ca', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '14fcfb21a1566982', 'booking.com', 'Adrien, vous avez oublié quelque chose…', '2015-09-15', NULL, '2026-05-01 12:19:56.823831+00'),
	('80278a98-5504-4eb2-b5c0-55a99dc72983', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '14d18d7b63ea08a5', 'viator.com', 'Booking confirmed: Saint-Émilion half-day wine tasting tour', '2015-05-03', NULL, '2026-05-01 12:19:56.929651+00'),
	('17e8c308-c634-4879-b2d1-5e77bf924eaa', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '156a7a936b9ecaf1', 'booking.com', 'Booking confirmation: Le Grand Chalet, Chamonix', '2016-08-20', NULL, '2026-05-01 12:19:56.30299+00'),
	('0f71366d-56f8-4aca-b5fe-ef9fad07d5c3', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '18ce84cdb55401cf', NULL, 'Booking confirmed – TP1364 London LHR → Lisbon LIS', '2024-01-08', NULL, '2026-05-01 11:49:03.878758+00'),
	('29008033-b583-4d9d-bd74-c4a9284ed5d3', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '189ab11861a78518', NULL, 'Fwd: Our Lisbon itinerary – sharing with you!', '2023-07-31', NULL, '2026-05-01 11:49:04.058504+00');


--
-- Data for Name: msgvault_sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."msgvault_sources" ("id", "user_id", "account_email", "msgvault_source_id", "msgvault_home", "last_sync_at", "active_vector_generation", "created_at", "updated_at") VALUES
	('7e07b46e-b828-47ff-91d2-d85f6ced32b9', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'email.travel.parser@gmail.com', 1, '/Users/rwb/.msgvault', '2026-05-01 12:09:15.098782+00', '{"model": "nomic-embed-text", "state": "active", "dimension": 768, "fingerprint": "nomic-embed-text:768"}', '2026-05-01 11:22:01.019039+00', '2026-05-01 12:09:15.098794+00');


--
-- Data for Name: msgvault_profile_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."msgvault_profile_runs" ("id", "user_id", "msgvault_source_id", "status", "search_mode", "search_queries", "search_result_count", "claude_model", "extraction_prompt_hash", "embedding_model", "embedding_dimensions", "started_at", "completed_at", "error_message") VALUES
	('4786c666-54d6-45b3-8a7f-607f91322987', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '7e07b46e-b828-47ff-91d2-d85f6ced32b9', 'completed', 'hybrid', '["traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching"]', 8, NULL, NULL, NULL, 1536, '2026-05-01 11:22:01.101786+00', '2026-05-01 11:22:03.151686+00', NULL),
	('4129506f-e233-4d31-b80c-882e3818e415', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '7e07b46e-b828-47ff-91d2-d85f6ced32b9', 'running', 'hybrid', '["traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching"]', 0, NULL, NULL, NULL, 1536, '2026-05-01 12:08:32.965076+00', NULL, NULL),
	('1565e242-c055-4709-9d66-97fbaa5f4370', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '7e07b46e-b828-47ff-91d2-d85f6ced32b9', 'completed', 'hybrid', '["traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching"]', 8, NULL, NULL, NULL, 1536, '2026-05-01 12:09:15.379711+00', '2026-05-01 12:09:16.815231+00', NULL);


--
-- Data for Name: msgvault_message_evidence; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."msgvault_message_evidence" ("id", "run_id", "user_id", "email_id", "msgvault_message_id", "msgvault_source_message_id", "sender_domain", "subject", "sent_at", "snippet", "search_query", "search_rank", "relevance_score", "extracted_preferences", "created_at") VALUES
	('68a20277-fc93-42a7-869a-d06207062bd3', '4786c666-54d6-45b3-8a7f-607f91322987', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '829f9b76-80c2-4189-8482-eda20229ebd7', '2', '19de10caee21c084', 'gmail.com', 'Your trip to Paris is confirmed - Louvre museum and wine tasting', '2026-05-01 00:59:57+00', 'Synthetic hackathon travel email. Original booking sender: GetYourGuide &lt;tickets@getyourguide.com&gt; Your trip to Paris is confirmed. Activities: - Louvre museum entry - Montmartre walking tour -', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 1, 0.19518816471099854, '[{"method": "keyword_smoke_test", "category": "food_dining"}, {"method": "keyword_smoke_test", "category": "culture_history"}, {"method": "keyword_smoke_test", "category": "sightseeing"}, {"method": "keyword_smoke_test", "category": "cuisine"}]', '2026-05-01 11:22:03.076043+00'),
	('ee65d4ca-6bd6-4b63-898a-a033f2b5a8fd', '4786c666-54d6-45b3-8a7f-607f91322987', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '862281d0-c524-4e8e-a507-c526d8a18af1', '13', '1980d347b09c0104', 'getyourguide.com', 'Confirmed: Marrakech private cooking class & desert overnight', '2025-07-15 08:30:00+00', 'Hi Adrien, Your Morocco experiences are confirmed! 1. Private Moroccan Cooking Class (riad kitchen, max 4) — Mon 21 July, 10:00 Includes: market visit, tagine + pastilla + harira, lunch with recipes', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 2, 0.14582669734954834, '[{"method": "keyword_smoke_test", "category": "food_dining"}, {"method": "keyword_smoke_test", "category": "cuisine"}]', '2026-05-01 11:22:03.076043+00'),
	('6f101903-492f-4fa6-9203-225395b5784f', '4786c666-54d6-45b3-8a7f-607f91322987', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', NULL, '10', '19bb1a5ec8710ed4', 'surfslisbon.com', 'Confirmed: advanced surf coaching pack (4 sessions) – Jan/Feb 2026', '2026-01-12 10:00:00+00', 'Hey Adrien! Your 2026 surf coaching pack is confirmed! Package: 4-session advanced coaching (private, 1:1) Sessions: 17 Jan, 31 Jan, 14 Feb, 28 Feb 2026 — 08:00 each Location: Praia Grande, Sintra', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 3, 0.0927627682685852, '[{"method": "keyword_smoke_test", "category": "adventure_outdoor"}]', '2026-05-01 11:22:03.076043+00'),
	('7100e394-1901-457b-908b-66761283e1ec', '4786c666-54d6-45b3-8a7f-607f91322987', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'd1c41226-e693-41a3-948d-00face032a3f', '7', '19cbd709cf78d56e', 'getyourguide.com', 'Confirmed: Lisbon Pombaline & azulejo architecture walk – 8 Mar 2026', '2026-03-05 10:00:00+00', 'Hi Adrien, Your architecture walking tour is confirmed! Tour: Lisbon Hidden Architecture — Pombaline Baixa, Modernist Buildings &amp; Azulejos Date: Sunday, 8 March 2026 — 10:00 at Praça do Comércio', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 4, 0.0924491286277771, '[{"method": "keyword_smoke_test", "category": "culture_history"}]', '2026-05-01 11:22:03.076043+00'),
	('79d97370-3d69-4496-8049-a68dec59296f', '4786c666-54d6-45b3-8a7f-607f91322987', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'ca0c57b0-edc8-488b-8695-9254019e533b', '17', '196b9354c8857b54', 'booking.com', 'Booking confirmed: Monte da Ravasqueira wine estate, Alentejo', '2025-05-10 08:00:00+00', 'Dear Adrien, Your Alentejo stay is confirmed! Property: Monte da Ravasqueira — luxury wine estate &amp; guesthouse Check-in: Friday, 16 May 2025 Check-out: Sunday, 18 May 2025 Room: Superior room with', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 5, 0.08929389715194702, '[{"method": "keyword_smoke_test", "category": "food_dining"}]', '2026-05-01 11:22:03.076043+00'),
	('c49d62e9-3e35-4acf-b9ca-db3c59a48d50', '4786c666-54d6-45b3-8a7f-607f91322987', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '491702bb-93f3-45bf-9dc6-b8c558852e33', '9', '19c3ce88e15f13c1', 'viator.com', 'Booking confirmed: private Portuguese cooking class – 12 Feb 2026', '2026-02-08 11:00:00+00', 'Hi Adrien, Your private cooking class is confirmed! Experience: Private Portuguese Cooking Class with Chef Marta Sousa Date: Thursday, 12 February 2026 — 10:00 (4 hours, Príncipe Real kitchen) Menu:', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 6, 0.08440381288528442, '[{"method": "keyword_smoke_test", "category": "food_dining"}, {"method": "keyword_smoke_test", "category": "cuisine"}]', '2026-05-01 11:22:03.076043+00'),
	('4a7a8bb7-5779-4e13-b964-728bedcca0fe', '4786c666-54d6-45b3-8a7f-607f91322987', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '6c2464a9-e789-4672-8a5d-f6a927187adc', '6', '19cd6c28d17657ec', 'viator.com', 'Your personalised travel ideas for spring 2026 🌸', '2026-03-10 08:00:00+00', 'Hi Adrien, Spring is here — experiences tailored to your travel style: 🇬🇷 Greek islands sailing week — from €890 🇯🇵 Tokyo food &amp; sake tour — from €65 🇵🇹 Douro Valley private wine day — from €120 🇲🇦', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 7, 0.137631356716156, '[{"method": "keyword_smoke_test", "category": "cuisine"}]', '2026-05-01 11:22:03.076043+00'),
	('7bc13c87-dbce-4d49-b04f-782829ab81bf', '4786c666-54d6-45b3-8a7f-607f91322987', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', NULL, '1', '19de10cc31ffd1b9', 'gmail.com', 'Your stay in Rome is confirmed - Hilton', '2026-05-01 01:00:02+00', 'Synthetic hackathon travel email. Original booking sender: Hilton &lt;reservations@hilton.com&gt; Your stay in Rome is confirmed. Hotel: Aleph Rome Hotel Check-in: March 24, 2026 Check-out: March 28,', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 8, 0.12260210514068604, '[{"method": "keyword_smoke_test", "category": "food_dining"}, {"method": "keyword_smoke_test", "category": "culture_history"}, {"method": "keyword_smoke_test", "category": "sightseeing"}, {"method": "keyword_smoke_test", "category": "accommodation_hotel"}]', '2026-05-01 11:22:03.076043+00'),
	('339c0116-2d52-41e7-bb12-0201a1f265d8', '1565e242-c055-4709-9d66-97fbaa5f4370', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '829f9b76-80c2-4189-8482-eda20229ebd7', '2', '19de10caee21c084', 'gmail.com', 'Your trip to Paris is confirmed - Louvre museum and wine tasting', '2026-05-01 00:59:57+00', 'Synthetic hackathon travel email. Original booking sender: GetYourGuide &lt;tickets@getyourguide.com&gt; Your trip to Paris is confirmed. Activities: - Louvre museum entry - Montmartre walking tour -', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 1, 0.19518816471099854, '[{"method": "keyword_smoke_test", "category": "food_dining"}, {"method": "keyword_smoke_test", "category": "culture_history"}, {"method": "keyword_smoke_test", "category": "sightseeing"}, {"method": "keyword_smoke_test", "category": "cuisine"}]', '2026-05-01 12:09:16.847025+00'),
	('b587333d-7181-442f-9cbd-41b761ead3da', '1565e242-c055-4709-9d66-97fbaa5f4370', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '862281d0-c524-4e8e-a507-c526d8a18af1', '13', '1980d347b09c0104', 'getyourguide.com', 'Confirmed: Marrakech private cooking class & desert overnight', '2025-07-15 08:30:00+00', 'Hi Adrien, Your Morocco experiences are confirmed! 1. Private Moroccan Cooking Class (riad kitchen, max 4) — Mon 21 July, 10:00 Includes: market visit, tagine + pastilla + harira, lunch with recipes', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 2, 0.14582669734954834, '[{"method": "keyword_smoke_test", "category": "food_dining"}, {"method": "keyword_smoke_test", "category": "cuisine"}]', '2026-05-01 12:09:16.847025+00'),
	('e891860c-cebc-4d0d-9077-35fae917016d', '1565e242-c055-4709-9d66-97fbaa5f4370', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', NULL, '10', '19bb1a5ec8710ed4', 'surfslisbon.com', 'Confirmed: advanced surf coaching pack (4 sessions) – Jan/Feb 2026', '2026-01-12 10:00:00+00', 'Hey Adrien! Your 2026 surf coaching pack is confirmed! Package: 4-session advanced coaching (private, 1:1) Sessions: 17 Jan, 31 Jan, 14 Feb, 28 Feb 2026 — 08:00 each Location: Praia Grande, Sintra', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 3, 0.0927627682685852, '[{"method": "keyword_smoke_test", "category": "adventure_outdoor"}]', '2026-05-01 12:09:16.847025+00'),
	('8c26b6e4-83a1-4509-bfeb-4585da06b8d1', '1565e242-c055-4709-9d66-97fbaa5f4370', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'd1c41226-e693-41a3-948d-00face032a3f', '7', '19cbd709cf78d56e', 'getyourguide.com', 'Confirmed: Lisbon Pombaline & azulejo architecture walk – 8 Mar 2026', '2026-03-05 10:00:00+00', 'Hi Adrien, Your architecture walking tour is confirmed! Tour: Lisbon Hidden Architecture — Pombaline Baixa, Modernist Buildings &amp; Azulejos Date: Sunday, 8 March 2026 — 10:00 at Praça do Comércio', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 4, 0.0924491286277771, '[{"method": "keyword_smoke_test", "category": "culture_history"}]', '2026-05-01 12:09:16.847025+00'),
	('1fdc121e-783d-4a7e-b3a7-8712a62947b8', '1565e242-c055-4709-9d66-97fbaa5f4370', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'ca0c57b0-edc8-488b-8695-9254019e533b', '17', '196b9354c8857b54', 'booking.com', 'Booking confirmed: Monte da Ravasqueira wine estate, Alentejo', '2025-05-10 08:00:00+00', 'Dear Adrien, Your Alentejo stay is confirmed! Property: Monte da Ravasqueira — luxury wine estate &amp; guesthouse Check-in: Friday, 16 May 2025 Check-out: Sunday, 18 May 2025 Room: Superior room with', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 5, 0.08929389715194702, '[{"method": "keyword_smoke_test", "category": "food_dining"}]', '2026-05-01 12:09:16.847025+00'),
	('81e6f6d0-5c24-4100-8334-de8a57941ecc', '1565e242-c055-4709-9d66-97fbaa5f4370', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '491702bb-93f3-45bf-9dc6-b8c558852e33', '9', '19c3ce88e15f13c1', 'viator.com', 'Booking confirmed: private Portuguese cooking class – 12 Feb 2026', '2026-02-08 11:00:00+00', 'Hi Adrien, Your private cooking class is confirmed! Experience: Private Portuguese Cooking Class with Chef Marta Sousa Date: Thursday, 12 February 2026 — 10:00 (4 hours, Príncipe Real kitchen) Menu:', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 6, 0.08440381288528442, '[{"method": "keyword_smoke_test", "category": "food_dining"}, {"method": "keyword_smoke_test", "category": "cuisine"}]', '2026-05-01 12:09:16.847025+00'),
	('249f84e6-ff3a-4c36-acf3-9a230896343b', '1565e242-c055-4709-9d66-97fbaa5f4370', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '6c2464a9-e789-4672-8a5d-f6a927187adc', '6', '19cd6c28d17657ec', 'viator.com', 'Your personalised travel ideas for spring 2026 🌸', '2026-03-10 08:00:00+00', 'Hi Adrien, Spring is here — experiences tailored to your travel style: 🇬🇷 Greek islands sailing week — from €890 🇯🇵 Tokyo food &amp; sake tour — from €65 🇵🇹 Douro Valley private wine day — from €120 🇲🇦', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 7, 0.137631356716156, '[{"method": "keyword_smoke_test", "category": "cuisine"}]', '2026-05-01 12:09:16.847025+00'),
	('b4fc75bf-e730-4291-b65f-69975ce356a3', '1565e242-c055-4709-9d66-97fbaa5f4370', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', NULL, '1', '19de10cc31ffd1b9', 'gmail.com', 'Your stay in Rome is confirmed - Hilton', '2026-05-01 01:00:02+00', 'Synthetic hackathon travel email. Original booking sender: Hilton &lt;reservations@hilton.com&gt; Your stay in Rome is confirmed. Hotel: Aleph Rome Hotel Check-in: March 24, 2026 Check-out: March 28,', 'traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching', 8, 0.12260210514068604, '[{"method": "keyword_smoke_test", "category": "food_dining"}, {"method": "keyword_smoke_test", "category": "culture_history"}, {"method": "keyword_smoke_test", "category": "sightseeing"}, {"method": "keyword_smoke_test", "category": "accommodation_hotel"}]', '2026-05-01 12:09:16.847025+00');


--
-- Data for Name: user_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_preferences" ("id", "user_id", "intensity", "source", "updated_at", "activity_keyword_id", "count") VALUES
	('616338c0-1d9a-401c-b4dc-513f0b548c99', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:15.81828+00', NULL, NULL),
	('b16f0e06-cbe2-4154-8d2b-dc8693d8d1be', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:15.898535+00', NULL, NULL),
	('f319cf3a-ace5-41ce-8805-bf9032b24d69', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:15.973185+00', NULL, NULL),
	('7396f464-1fc8-4403-9ebe-3621e3b52a03', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:16.059968+00', NULL, NULL),
	('9a94def3-24d6-4a57-bc4f-b44db0d564ad', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:16.166078+00', NULL, NULL),
	('6db59caa-ee4a-4933-a843-22d58d051f21', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:16.249931+00', NULL, NULL),
	('1dfa314e-fdf7-4b42-a8ba-f5196729083c', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:16.334447+00', NULL, NULL),
	('914913c9-87ca-4d98-b6ca-f8efec507545', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:16.417522+00', NULL, NULL),
	('468df17d-3228-4922-8bda-b7081d547a19', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:16.711692+00', NULL, NULL),
	('40b8693c-e4d9-45e8-8370-b45767e3678d', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:16.791988+00', NULL, NULL),
	('57c58735-bf09-46f3-9741-6dc310de4ba9', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:16.86156+00', NULL, NULL),
	('e806ce2a-4aac-48b2-8bc7-91c19fd27386', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:16.936376+00', NULL, NULL),
	('4daf294f-88e1-4d1f-843b-3eed26bb7c4f', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:17.016759+00', NULL, NULL),
	('5a3bcf66-f1b9-410f-a4f7-37fd64184a3c', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:17.095377+00', NULL, NULL),
	('f7428984-db09-45c6-99ff-822bbf2f3300', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:17.186875+00', NULL, NULL),
	('77f415b5-5935-48cc-9fc1-6eca51eebcef', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:17.267184+00', NULL, NULL),
	('2e1149b8-aad2-4213-9663-7cb87a02f32b', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 10:28:17.520804+00', NULL, NULL),
	('69d0aece-d5a2-40e0-8e7b-ad49863a7938', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 10:28:17.627247+00', NULL, NULL),
	('3d03f403-3c8a-4d0a-8f66-7b3da5a865ca', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 10:28:17.724423+00', NULL, NULL),
	('e33fbc57-96aa-4238-9291-ec48d6ac51cf', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 10:28:17.886743+00', NULL, NULL),
	('ab54722c-5b0b-4192-a0ce-653667a7332f', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:18.161865+00', NULL, NULL),
	('44fbd504-d404-43b2-b69f-0c1a1ea361b9', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:18.278781+00', NULL, NULL),
	('147fb7ae-2a0a-4413-87d9-b3a41ffddc6e', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:18.350975+00', NULL, NULL),
	('64ce5c28-b9cb-4600-ba64-178d3b7ad98a', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:18.468079+00', NULL, NULL),
	('b010303c-acae-408b-9c27-71361fa225ea', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:18.565234+00', NULL, NULL),
	('f4bd2077-56e8-4c97-a79b-cbde51826b5d', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:18.649824+00', NULL, NULL),
	('ab674931-5baf-46a8-bc1d-506615b2e9c5', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:18.744332+00', NULL, NULL),
	('8b68ded2-214a-41d6-a0c2-80cb113a3a34', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:18.937692+00', NULL, NULL),
	('1ddfe1f3-ed83-4f8e-862b-3dc38ef7ee92', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:19.085514+00', NULL, NULL),
	('cf04d679-7982-4ee6-b0b9-255ca2a38a50', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:19.200565+00', NULL, NULL),
	('fe1cf894-e432-43c6-94fa-bfa01d5430a3', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:19.396808+00', NULL, NULL),
	('67d7bec7-0518-420a-a7d5-a9b7745ad171', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:19.546506+00', NULL, NULL),
	('0f3a2146-eaba-4999-ba70-63f72385ee5a', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:19.627865+00', NULL, NULL),
	('d659d653-03c5-429a-8d36-8b0d89c35e2e', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:19.751596+00', NULL, NULL),
	('fe914216-2228-493a-acc1-0af26cc52788', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 10:28:19.964581+00', NULL, NULL),
	('23a68f12-7c3e-47b7-8237-fcfc41712d37', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:47:00.158385+00', '266bc9fa-b71e-4f3a-b156-eaffb6bd0ac4', NULL),
	('1ab0b786-091b-43ce-86d8-e89c527973de', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:47:00.254287+00', 'a56bf9da-e6af-44db-88c3-5e3856400b92', NULL),
	('bdb56482-3c5a-45eb-81b2-9e1ae9d77c06', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:47:00.685475+00', 'a54c07ef-958e-4ce8-bb32-8cfe57321a09', NULL),
	('a53d6127-318c-445a-b7f8-5c59883452d4', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:47:00.8041+00', '66339729-aeba-499a-a605-e3e3b276532f', NULL),
	('36fa9450-beb1-479e-b7dd-12488fa5f96c', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:45.054792+00', '344b3ac9-2b2b-468d-923b-710cdec2d90a', 1),
	('e6d37c20-e43d-4a0d-8bbc-3f33c1185ea7', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:47:01.248139+00', '612c2e9d-bb76-4e77-8b4c-c61c7f8caa9f', NULL),
	('e5612195-4694-49eb-96b1-622cb804de4c', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:45.153574+00', 'd8c7e8c3-2b6d-4a2d-8666-1d9ed5318aaa', 1),
	('590981e4-81a4-483a-85eb-6233162fd5c9', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:57.997494+00', '51ea4bdd-1e47-4676-8e43-ef5fda681b5b', NULL),
	('67d6a487-c627-48e5-9a39-25c88bae6548', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:45.291192+00', 'bab252c6-47d4-4fb8-af33-678e6f8eea28', 1),
	('41308944-d325-4cda-b658-ff5b8bc9a543', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:58.510166+00', 'aaf16cc3-3c95-4803-8f5a-ff52d0479f5f', NULL),
	('0d718d47-c8ce-42ba-93ca-303af55d0778', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 13:58:45.907935+00', 'd8b0cfe6-4c0f-4194-b8ff-b861df7d999c', 2),
	('acceb616-eb60-468d-855a-8d61dadace86', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 13:58:46.28678+00', '74f127f5-fac1-4c41-a57a-00812c178b0f', 2),
	('3af2852d-f391-4183-b72d-c0cecf0ee630', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 13:58:46.393555+00', 'f5e6196f-6868-456c-a832-b5f9898c2ff2', 6),
	('a977df3a-caad-490f-a7f8-36ef1f779a6a', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:46.755052+00', 'd42f0224-d826-4b05-bdbc-8d3c43232af8', 3),
	('43d33dcb-a031-4bae-8ef1-70763a29883e', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:58.664536+00', '9be5d571-809d-4675-91c0-d239d6e697c8', NULL),
	('69717549-18ab-43ad-81f3-b1c8bc73aa2f', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:47:03.660719+00', '7205d135-5409-4ae8-855d-8649606c2c49', NULL),
	('21866788-01de-4d29-813a-dae817007ee3', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:58.928521+00', '72cd6681-9e0b-4b8e-b67f-89c5a9733864', NULL),
	('34a5bc13-7906-43b0-a437-0416266ebfd3', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:44.237706+00', 'bc0f1f98-0860-4add-ba7c-e1c335b1992f', 2),
	('c8fd58a0-61c7-4165-962e-c0bb3a79e084', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:59.044992+00', '433053d4-321b-47e4-bb49-fe946daeecb0', NULL),
	('6247ec40-b879-411b-a64c-a72d15eeb454', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:59.201395+00', 'bed15e16-0ce0-4625-86e3-c3b6bb32292e', NULL),
	('def069c5-2b26-42be-bea9-86ba9ee88700', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:59.396117+00', '99741844-714a-47e4-9d28-d542dd241040', NULL),
	('d2f50e85-321c-4a9f-baed-33d66821577e', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:47:01.486391+00', '171887cb-6932-44c3-b39b-40bc31475be2', NULL),
	('60ae2c6d-e023-4d40-a8ba-31d405fb4880', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 13:58:45.744235+00', 'fbef3000-f0e9-4937-8c7d-d0b24eb19631', 4),
	('0cb4a89a-83c3-44f2-a355-b596c503c417', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:44.348093+00', '851cfc74-5c34-4ab5-8c4f-33dfd46ded07', 1),
	('b4fa1f81-8b5d-4c3c-8137-ab595c50a2d2', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:44.491639+00', '2daf02fd-d35b-4a08-bf1f-9fa4e6b6c72a', 1),
	('8de91777-0941-40cd-9012-ddd6944a808b', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:44.922151+00', '6403dd9b-3135-4689-a84a-9aa5cc810d3f', 2),
	('ec382cf4-2095-4207-a2f4-52956853873e', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:59.940737+00', '0ed3f334-8e1e-425c-b273-55f6eafc7561', NULL),
	('52b837b8-65f3-4d9a-8924-d1798acfe5fe', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:47:03.768558+00', '7f4bdd14-5ba9-4e7b-ad29-1297606b0de5', NULL),
	('9b3b52a9-5fa9-4097-99e7-4652c2905753', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:47:00.078792+00', '7e51e8bc-a0bd-4fb3-8c10-db23d394ea5c', NULL),
	('5dee4fe9-7134-4d10-8751-0ce10fc0de16', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:47:02.605165+00', '67e81117-8149-4057-a706-df0ee2dc10c4', NULL),
	('f425dc70-4af1-4a95-b932-73631bd7bce8', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:47:03.519451+00', '675449fd-9c56-4ff4-9799-17907cb0abfb', NULL),
	('25437db6-dce7-43d8-abeb-7fbf31adee29', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:57.486876+00', 'b25c9087-f7d2-4068-b740-6623f993c53a', NULL),
	('1d8eca72-aad5-4e62-8f6b-081b1a89f355', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 12:35:26.240102+00', '5c2d33b0-a334-4728-9b97-3c89e9cfeb3f', NULL),
	('e0c7ee8b-8b04-41c2-b0a6-2b9a2c072130', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 12:35:26.316183+00', '539095b7-855f-4ffa-8d8d-98abcafb9895', NULL),
	('5a6d56fd-9b3c-4284-a599-7cb62e515c0a', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 12:35:26.398664+00', '0879647f-3f2f-400f-a3dc-c21934df2e50', NULL),
	('18aeb0db-c95b-4bf0-aed4-4941bb8b1da1', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 12:35:26.740413+00', 'a634a755-a2fc-4a2d-b739-f2cb6c6010e8', NULL),
	('3125d58e-fa9b-4108-a64d-f425b0f3700a', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 12:35:26.877087+00', 'b13a614d-86c3-4543-a3ef-7078a011484e', NULL),
	('1ff1c05d-3ec8-4a44-b0d8-2dffeee5d4db', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 12:35:26.965911+00', '95e54a01-4569-4ea4-a32d-e5dd109cd8c7', NULL),
	('32288a4c-34a6-4c2b-8040-0f018281a123', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 12:35:27.07232+00', 'f1871f20-9c0a-40d6-bc57-b7445da66c10', NULL),
	('621a3de3-5762-4ab0-b656-8435e64db2aa', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 12:35:27.326371+00', '4bd864ae-1116-46b3-918c-da97658a3301', NULL),
	('5f97f95c-cbc1-4b24-a62f-8d4fc58d5df1', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 12:35:28.142935+00', '05d56dc7-7bd3-492b-bade-52288d345f8b', NULL),
	('88b3034b-e2a7-48d6-aaa2-acf7b4b7ac02', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 12:35:28.222942+00', '45b42806-3cce-461d-b5c0-f434090fedab', NULL),
	('b9f1f64a-3111-4aec-b0c1-cded6507ddf9', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 12:35:28.343643+00', 'c226e288-6e82-4803-ab0e-88cc5e196e90', NULL),
	('137fa195-8b37-4f40-a0d4-fe1296a28d05', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 12:35:28.490888+00', '9b73d9b0-8a1f-4bdb-af11-3838698a8e5c', NULL),
	('57a98cab-c976-4bbf-9b7a-aea073317d5f', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 13:58:43.548277+00', 'd8e690fd-dd09-4d74-93e8-52aacf7669f5', 1),
	('687dec69-c904-4c2c-bccf-efc04ced3c69', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 13:58:43.734951+00', 'baed81de-fd5f-4576-8e57-0992fc802b0d', 1),
	('c7819dc4-5560-4b47-8af6-81f03d97de27', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:46.845455+00', '122ce2db-7e76-4dbf-9ba1-f30229183e48', 1),
	('6f032407-35fd-48de-b09a-1e1afbdd1805', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:47.30008+00', '2d2ab40d-e53d-40bb-b1d9-97b803d1acdc', 1),
	('930545f4-a341-49b3-a1a7-776f35c462ec', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:47.433751+00', '9732fc7d-bc4d-4de1-88c7-520dac3defe8', 1),
	('d15fa8a4-ca8c-41a9-ba7b-3fa794f289b1', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:47.567452+00', 'ea5d1a64-e4b3-4ab0-942c-844e79a0c7be', 1),
	('fca54666-82eb-4724-abf9-b5a22f483aa9', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:47.645615+00', '3e56f772-3b65-4fa4-a189-8d1ea04182c8', 1),
	('f6f58d08-ae4c-48ff-b4dd-7a36f493786b', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:48.130918+00', '2990f2bd-9dea-4fc5-8faa-22e3ffeb42c3', 2),
	('de688845-e432-4989-b860-7c0d458aab92', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:52.920839+00', '749450dd-ba34-4dc1-90af-3d45b5c7b103', NULL),
	('dd4298de-eec7-44b9-ab91-0e07198acc6e', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:53.330686+00', 'a95b3e0c-7c80-44cf-84a1-50a0a2a08e2b', NULL),
	('fc3259e1-b741-4251-8ed4-9ca02cf28fef', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:53.580794+00', '2445c73f-d86c-464a-b21d-003071dda9bb', NULL),
	('23f3d95b-e31f-45b9-81c0-cd016926467e', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:53.731541+00', 'dedcb88c-860d-44bf-8695-a1bc8fb3253a', NULL),
	('748c69bf-f1ed-4ef5-b431-f3210429cb62', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 12:35:25.374786+00', '47590b69-b21f-4013-b068-10385bf21a89', NULL),
	('958591bf-72fc-4759-9116-e3f37c9e7e7d', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 12:35:25.698782+00', 'a61cbf94-0976-463f-9259-bffcec15b566', NULL),
	('397bebeb-7bb2-4516-af47-3f7b2b67f0c1', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 12:35:26.089758+00', '0418cfe0-8e08-4966-8d28-fdbd65d73407', NULL),
	('5cad55a9-8339-4ffe-87c9-eaf1dcb0e9f6', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:54.915784+00', '438baff3-e210-40df-a619-e104271304c8', NULL),
	('a27e041e-3840-444f-b123-19b3236776c9', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:55.031794+00', 'b5b2a28a-c4f3-4076-a456-e28fd30cea3a', NULL),
	('5b663241-d22c-484e-afea-523602e005e1', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:55.200203+00', 'a94a830b-c3e1-4f75-917b-af9abe1892e0', NULL),
	('f6c9e360-02ba-4445-9c9c-7013cca2eb19', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:55.442365+00', '908f4091-c40a-421d-8509-c4f2ba5157c2', NULL),
	('335c086c-9983-48a4-91d8-cd0fa0180bf2', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:58:48.262404+00', '2123bc47-7f3c-47a9-a7a3-fac2f910f199', 1),
	('d60621b8-3ced-4448-994a-20864caae4eb', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:54.832151+00', '5c142db4-66ef-4e9b-86f3-fb76bb3ca68a', NULL),
	('9145ac55-f2d3-4f25-a226-c6cc211d3f0f', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:55.7619+00', 'a59b5022-106c-4060-9bd7-f6acf2345333', NULL),
	('69519cef-0694-41d6-a574-99f292e8955e', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'moderate', 'inferred', '2026-05-01 13:46:56.006402+00', 'ace2997e-5109-4aaf-959a-7822984823f6', NULL),
	('6b232cb2-d898-4e67-b6ba-c114ce479aa4', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:47:04.125645+00', '78f6d827-16f3-4fc9-9789-d0dfd3921f82', NULL),
	('d27a00e9-7881-4543-863a-2c1fbfb5b8cd', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:47:04.207896+00', '29d44f02-5049-4a73-8042-48a63a206127', NULL),
	('00714e5c-488b-402a-b296-58776dbdc364', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:47:04.31793+00', 'f33c180d-b3a8-457d-9740-e0662c7e28e3', NULL),
	('e2843c10-e82e-4d5a-b6de-a27d7fdbf3f4', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:47:04.415137+00', 'f0f93ba5-deb6-4618-a956-c14bbd851062', NULL),
	('511ccb38-5ab4-42da-b786-c3627a8461bc', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:47:04.518101+00', '591fb3e5-8752-4dd2-8fe0-1a0d7e69cf51', NULL),
	('89325a12-f01c-4e82-8d23-ea772a9df500', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:47:04.749934+00', '717c2016-98f1-4756-8a32-6caddffbd972', NULL),
	('c6822eb1-dcad-4099-9c45-86c2a178430d', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:47:05.104367+00', 'beb974ad-fbb8-4203-8526-75f5a37b5964', NULL),
	('a462391c-f119-4ba6-af40-cb33323bd1b6', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 13:58:42.299114+00', 'a34dba80-248f-4e96-bbf4-952a946e19f7', 13),
	('ce43000d-c381-4125-81b9-ac6ab539db86', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 13:58:42.472595+00', 'e83d7110-6fe8-4e55-9681-29d10bc08d97', 1),
	('92afa038-29c5-48e9-9456-efae247a70df', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 13:58:42.600116+00', 'a8906f70-e920-4f67-a70d-296318a83ab5', 1),
	('e331a689-4ad9-48ed-86a7-a0e98d2e0bc2', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 13:58:42.704284+00', '99d66522-04e0-4f9a-963c-1a6a88d47b57', 1),
	('f1070853-2c16-461c-9b01-8a7fc0ad4b13', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'weak', 'inferred', '2026-05-01 13:58:48.674483+00', 'f7ef5f54-e170-4caf-ae25-e36c8ef8e186', 1),
	('2ccdb775-af83-4b0b-86e2-8edb4b8aac38', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', 'strong', 'inferred', '2026-05-01 13:58:42.829516+00', '521d9d02-b33f-49ab-99c8-053b2cb0768d', 5);


--
-- Data for Name: user_preference_evidence; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_taste_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_taste_profiles" ("id", "user_id", "latest_run_id", "profile_text", "profile_json", "embedding", "embedding_model", "embedding_dimensions", "source", "confidence", "generated_at", "updated_at") VALUES
	('fc473863-3ce8-4bb3-af8a-2ebd6d8ff921', 'efbef2c2-8adb-46b9-9d16-abcbf3b0df0f', '1565e242-c055-4709-9d66-97fbaa5f4370', 'Taste profile inferred from local msgvault smoke test: food dining (5 evidence emails); cuisine (4 evidence emails); culture history (3 evidence emails); sightseeing (2 evidence emails); adventure outdoor (1 evidence emails); accommodation hotel (1 evidence emails)', '{"note": "Smoke test only. Replace with Claude extraction before production use.", "query": "traveler likes cooking classes wine tasting architecture walks boutique hotels and surf coaching", "method": "msgvault_hybrid_keyword_smoke_test", "evidence_count": 8, "top_categories": ["food_dining", "cuisine", "culture_history", "sightseeing", "adventure_outdoor", "accommodation_hotel"], "category_counts": {"cuisine": 4, "food_dining": 5, "sightseeing": 2, "culture_history": 3, "adventure_outdoor": 1, "accommodation_hotel": 1}, "embedding_status": "not_written_schema_expects_1536_local_msgvault_index_is_768", "evidence_subjects": ["Your trip to Paris is confirmed - Louvre museum and wine tasting", "Confirmed: Marrakech private cooking class & desert overnight", "Confirmed: advanced surf coaching pack (4 sessions) – Jan/Feb 2026", "Confirmed: Lisbon Pombaline & azulejo architecture walk – 8 Mar 2026", "Booking confirmed: Monte da Ravasqueira wine estate, Alentejo", "Booking confirmed: private Portuguese cooking class – 12 Feb 2026", "Your personalised travel ideas for spring 2026 🌸", "Your stay in Rome is confirmed - Hilton"], "vector_generation": {"id": 1, "model": "nomic-embed-text", "state": "active", "dimension": 768, "fingerprint": "nomic-embed-text:768"}}', NULL, NULL, 1536, 'imported', 0.650, '2026-05-01 12:09:16.738489+00', '2026-05-01 12:09:16.738511+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict qvIcvDZehfIbqxewrcfHrpTC8G6nI0KPyLg3iBez6U6kfcMMF4WirTV0DqCutIE

RESET ALL;
