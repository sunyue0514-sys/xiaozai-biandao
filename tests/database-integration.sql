-- Run in a disposable local PostgreSQL/Supabase database after initialization.
-- All fixtures are synthetic and rolled back; never point this at production.
BEGIN;
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') LOOP
  IF NOT item.relrowsecurity THEN RAISE EXCEPTION 'RLS missing: %',item.relname; END IF;
  IF has_table_privilege('anon',format('public.%I',item.relname),'SELECT,INSERT,UPDATE,DELETE')
   OR has_table_privilege('authenticated',format('public.%I',item.relname),'SELECT,INSERT,UPDATE,DELETE') THEN
   RAISE EXCEPTION 'Frontend table access: %',item.relname;
  END IF;
 END LOOP;
 FOR item IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' LOOP
  IF has_function_privilege('anon',item.oid,'EXECUTE') OR has_function_privilege('authenticated',item.oid,'EXECUTE') THEN
   RAISE EXCEPTION 'Frontend RPC access: %',item.proname;
  END IF;
 END LOOP;
 IF to_regprocedure('public.exec_sql(text)') IS NOT NULL THEN RAISE EXCEPTION 'Arbitrary SQL RPC exists'; END IF;
 IF has_schema_privilege('service_role','public','CREATE') THEN RAISE EXCEPTION 'Service role can create objects'; END IF;
END $$;

SET LOCAL ROLE service_role;
INSERT INTO users(uid,username,password) VALUES ('test-database-user','test-database-user','synthetic-test-hash');
INSERT INTO sessions(token,user_id) SELECT 'synthetic-session-token',id FROM users WHERE uid='test-database-user';
INSERT INTO customers(uid,name,description) SELECT id::text,'Synthetic customer','' FROM users WHERE uid='test-database-user';
INSERT INTO materials(uid,customer_id,customer_name,topic,script_type)
 SELECT uid,0,'','Synthetic topic','story' FROM users WHERE uid='test-database-user';
INSERT INTO customer_materials(uid,customer_id,customer_name,topic,script_type)
 SELECT uid,0,'','Synthetic topic','story' FROM users WHERE uid='test-database-user';
INSERT INTO product_profiles(uid,name) VALUES ('test-database-user','Synthetic product');
INSERT INTO user_style_profile(uid) VALUES ('test-database-user') ON CONFLICT(uid) DO UPDATE SET learning_progress=1;
INSERT INTO user_style_profile(uid) VALUES ('test-database-user') ON CONFLICT(uid) DO UPDATE SET learning_progress=2;
INSERT INTO user_generation_stats(user_id) SELECT id FROM users WHERE uid='test-database-user' ON CONFLICT(user_id) DO UPDATE SET total_scripts=1;
INSERT INTO user_onboarding_progress(user_id,task_key,status)
 SELECT id,'save_material','completed' FROM users WHERE uid='test-database-user'
 ON CONFLICT(user_id,task_key) DO UPDATE SET status='completed';
INSERT INTO user_onboarding_progress(user_id,task_key,status)
 SELECT id,'save_material','claimed' FROM users WHERE uid='test-database-user'
 ON CONFLICT(user_id,task_key) DO UPDATE SET status='claimed';
INSERT INTO creative_records(user_id,topic,script_content) SELECT id,'Synthetic topic','Synthetic script' FROM users WHERE uid='test-database-user';
INSERT INTO creative_sessions(user_id,customer_id)
 SELECT u.id,c.id FROM users u JOIN customers c ON c.uid=u.id::text WHERE u.uid='test-database-user';
INSERT INTO scriptless_conversations(uid) VALUES ('test-database-user');
INSERT INTO scriptless_messages(conversation_id,role,content)
 SELECT id,'user','Synthetic message' FROM scriptless_conversations WHERE uid='test-database-user';
INSERT INTO user_feedback(user_id,type,content,title,replied_by)
 SELECT id,'suggestion','Synthetic feedback',NULL,id FROM users WHERE uid='test-database-user';
INSERT INTO hit_patterns(uid,pattern_type,pattern_name) VALUES ('test-database-user','title','Synthetic pattern');
SELECT increment_used_power(id,3) FROM users WHERE uid='test-database-user';
SELECT increment_used_power(id,4) FROM users WHERE uid='test-database-user';
SELECT increment_pattern_success(id) FROM hit_patterns WHERE uid='test-database-user';
SELECT get_database_size();
SELECT * FROM get_table_sizes();
SELECT * FROM get_operation_log_action_stats();
DO $$ BEGIN
 IF (SELECT used_power FROM public.users WHERE uid='test-database-user') <> 7 THEN RAISE EXCEPTION 'Atomic power increment mismatch'; END IF;
 IF (SELECT success_count FROM public.hit_patterns WHERE uid='test-database-user') <> 2 THEN RAISE EXCEPTION 'Pattern increment mismatch'; END IF;
 IF (SELECT count(*) FROM public.user_style_profile WHERE uid='test-database-user') <> 1 THEN RAISE EXCEPTION 'Profile upsert mismatch'; END IF;
 IF (SELECT count(*) FROM public.user_onboarding_progress p JOIN public.users u ON u.id=p.user_id WHERE u.uid='test-database-user') <> 1 THEN RAISE EXCEPTION 'Progress upsert mismatch'; END IF;
 BEGIN
  PERFORM public.increment_used_power((SELECT id FROM public.users WHERE uid='test-database-user'),-1);
  RAISE EXCEPTION 'Negative power increment was accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'increment_amount must be nonnegative' THEN RAISE; END IF;
 END;
END $$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM * FROM public.users; RAISE EXCEPTION 'anon read was accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.increment_used_power(1,1); RAISE EXCEPTION 'anon RPC was accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN INSERT INTO public.sessions(token,user_id) VALUES ('forbidden',1); RAISE EXCEPTION 'authenticated write was accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
