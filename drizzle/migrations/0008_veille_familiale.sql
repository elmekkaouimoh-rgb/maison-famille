CREATE TABLE public.veille_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL,
  domain text NOT NULL,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  categories text[] NOT NULL DEFAULT '{}',
  child_categories text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT veille_url_domain CHECK (url LIKE 'https://' || domain || '/%' OR url = 'https://' || domain),
  CONSTRAINT veille_cats CHECK (categories <@ ARRAY['devoir','controle','note','message','rendez_vous','changement_horaire','evenement']::text[] AND child_categories <@ categories)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.veille_sources TO authenticated;
GRANT ALL ON public.veille_sources TO service_role;
ALTER TABLE public.veille_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages sources" ON public.veille_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.veille_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.veille_sources(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  source_key text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  day date,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  grade numeric,
  out_of numeric,
  grade_raw text,
  source_status text,
  done_state text NOT NULL DEFAULT 'inconnu' CHECK (done_state IN ('fait','non_fait','non_coche','inconnu')),
  collected_at timestamptz NOT NULL,
  uncertainties text[] NOT NULL DEFAULT '{}',
  possible_duplicate boolean NOT NULL DEFAULT false,
  child_visible boolean NOT NULL DEFAULT false,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, source_key)
);
GRANT SELECT, INSERT, UPDATE ON public.veille_items TO authenticated;
GRANT ALL ON public.veille_items TO service_role;
ALTER TABLE public.veille_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads items" ON public.veille_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "child reads own allowed items" ON public.veille_items FOR SELECT TO authenticated
  USING (child_visible AND member_id = public.my_member_id());
CREATE POLICY "admin inserts items" ON public.veille_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin updates items" ON public.veille_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.veille_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.veille_sources(id) ON DELETE CASCADE,
  collected_at timestamptz,
  created integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  unchanged integer NOT NULL DEFAULT 0,
  rejected integer NOT NULL DEFAULT 0,
  duplicates integer NOT NULL DEFAULT 0,
  coverage jsonb NOT NULL DEFAULT '{}',
  errors jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.veille_runs TO authenticated;
GRANT ALL ON public.veille_runs TO service_role;
ALTER TABLE public.veille_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads runs" ON public.veille_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin adds runs" ON public.veille_runs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.veille_import(_source uuid, _items jsonb, _apply boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  s public.veille_sources%ROWTYPE; it jsonb; ex public.veille_items%ROWTYPE;
  res jsonb := '[]'; cov jsonb := '{}'; errs jsonb := '[]';
  n_new int := 0; n_upd int := 0; n_same int := 0; n_rej int := 0; n_dup int := 0;
  err text; isdup boolean; act text; v_day date; v_start timestamptz; v_unc text[]; v_coll timestamptz; max_coll timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Réservé à l''administrateur'; END IF;
  SELECT * INTO s FROM public.veille_sources WHERE id = _source AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Source non autorisée'; END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) > 500 THEN RAISE EXCEPTION 'Liste invalide (500 entrées max)'; END IF;
  FOR it IN SELECT value FROM jsonb_array_elements(_items) LOOP
    err := NULL;
    IF coalesce(it->>'source_id','') <> s.id::text THEN err := 'source non autorisée';
    ELSIF coalesce(it->>'member_id','') <> s.member_id::text THEN err := 'enfant non autorisé pour cette source';
    ELSIF NOT (coalesce(it->>'category','') = ANY(s.categories)) THEN err := 'type non autorisé';
    ELSIF length(trim(coalesce(it->>'source_key',''))) = 0 THEN err := 'identifiant source manquant';
    ELSIF length(trim(coalesce(it->>'title',''))) = 0 THEN err := 'titre manquant';
    ELSIF it->>'collected_at' IS NULL THEN err := 'date de collecte manquante';
    ELSIF coalesce(it->>'done_state','inconnu') NOT IN ('fait','non_fait','non_coche','inconnu') THEN err := 'état invalide';
    END IF;
    IF err IS NOT NULL THEN
      n_rej := n_rej + 1;
      res := res || jsonb_build_object('source_key', it->>'source_key', 'title', it->>'title', 'action', 'refusé', 'reason', err);
      errs := errs || jsonb_build_object('source_key', it->>'source_key', 'reason', err);
      CONTINUE;
    END IF;
    v_day := nullif(it->>'day','')::date;
    v_start := nullif(it->>'starts_at','')::timestamptz;
    v_coll := (it->>'collected_at')::timestamptz;
    max_coll := greatest(max_coll, v_coll);
    v_unc := ARRAY(SELECT jsonb_array_elements_text(coalesce(it->'uncertainties','[]'::jsonb)));
    SELECT * INTO ex FROM public.veille_items WHERE source_id = s.id AND source_key = it->>'source_key';
    isdup := false;
    IF ex.id IS NULL THEN
      isdup := EXISTS (SELECT 1 FROM public.veille_items o WHERE o.member_id = s.member_id AND o.category = it->>'category'
        AND lower(o.title) = lower(trim(it->>'title')) AND coalesce(o.day, o.starts_at::date) IS NOT DISTINCT FROM coalesce(v_day, v_start::date));
      act := 'nouveau';
    ELSIF ex.title = trim(it->>'title') AND ex.description IS NOT DISTINCT FROM nullif(it->>'description','')
      AND ex.day IS NOT DISTINCT FROM v_day AND ex.starts_at IS NOT DISTINCT FROM v_start
      AND ex.grade IS NOT DISTINCT FROM nullif(it->>'grade','')::numeric AND ex.source_status IS NOT DISTINCT FROM nullif(it->>'source_status','')
      AND ex.done_state = coalesce(it->>'done_state','inconnu') AND ex.location IS NOT DISTINCT FROM nullif(it->>'location','') THEN
      act := 'identique';
    ELSE act := 'mis à jour';
    END IF;
    IF isdup THEN n_dup := n_dup + 1; v_unc := v_unc || 'doublon possible'::text; END IF;
    IF act = 'nouveau' THEN n_new := n_new + 1; ELSIF act = 'identique' THEN n_same := n_same + 1; ELSE n_upd := n_upd + 1; END IF;
    cov := jsonb_set(cov, ARRAY[it->>'category'], to_jsonb(coalesce((cov->>(it->>'category'))::int, 0) + 1));
    res := res || jsonb_build_object('source_key', it->>'source_key', 'title', it->>'title', 'category', it->>'category', 'action', act, 'possible_duplicate', isdup);
    IF _apply THEN
      INSERT INTO public.veille_items (source_id, member_id, source_key, category, title, description, day, starts_at, ends_at, location,
        grade, out_of, grade_raw, source_status, done_state, collected_at, uncertainties, possible_duplicate, child_visible)
      VALUES (s.id, s.member_id, it->>'source_key', it->>'category', trim(it->>'title'), nullif(it->>'description',''), v_day, v_start,
        nullif(it->>'ends_at','')::timestamptz, nullif(it->>'location',''), nullif(it->>'grade','')::numeric, nullif(it->>'out_of','')::numeric,
        nullif(it->>'grade_raw',''), nullif(it->>'source_status',''), coalesce(it->>'done_state','inconnu'), v_coll, v_unc, isdup,
        (it->>'category') = ANY(s.child_categories))
      ON CONFLICT (source_id, source_key) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, day = EXCLUDED.day,
        starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, location = EXCLUDED.location, grade = EXCLUDED.grade, out_of = EXCLUDED.out_of,
        grade_raw = EXCLUDED.grade_raw, source_status = EXCLUDED.source_status, done_state = EXCLUDED.done_state, collected_at = EXCLUDED.collected_at,
        uncertainties = EXCLUDED.uncertainties, child_visible = EXCLUDED.child_visible, last_seen = now(),
        possible_duplicate = public.veille_items.possible_duplicate;
    END IF;
  END LOOP;
  IF _apply THEN
    INSERT INTO public.veille_runs (source_id, collected_at, created, updated, unchanged, rejected, duplicates, coverage, errors)
    VALUES (s.id, max_coll, n_new, n_upd, n_same, n_rej, n_dup, cov, errs);
  END IF;
  RETURN jsonb_build_object('applied', _apply, 'created', n_new, 'updated', n_upd, 'unchanged', n_same, 'rejected', n_rej,
    'duplicates', n_dup, 'coverage', cov, 'items', res);
END $$;
REVOKE ALL ON FUNCTION public.veille_import(uuid, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.veille_import(uuid, jsonb, boolean) TO authenticated;