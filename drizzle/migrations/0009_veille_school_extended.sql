ALTER TABLE public.veille_items
  ADD COLUMN subject text,
  ADD COLUMN period text,
  ADD COLUMN coefficient numeric,
  ADD COLUMN class_average numeric,
  ADD COLUMN grade_status text CHECK (grade_status IN ('note','abs','non_note')),
  ADD COLUMN justified boolean,
  ADD COLUMN document_url text CHECK (document_url IS NULL OR document_url LIKE 'https://%');

ALTER TABLE public.veille_sources DROP CONSTRAINT veille_cats;
ALTER TABLE public.veille_sources ADD CONSTRAINT veille_cats CHECK (
  categories <@ ARRAY['devoir','controle','note','message','rendez_vous','changement_horaire','evenement','absence','retard','observation','cours','competence','bulletin','document','moyenne']::text[]
  AND child_categories <@ categories);

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
    ELSIF it->>'grade_status' IS NOT NULL AND it->>'grade_status' NOT IN ('note','abs','non_note') THEN err := 'statut de note invalide';
    ELSIF it->>'document_url' IS NOT NULL AND it->>'document_url' NOT LIKE 'https://%' THEN err := 'lien de document invalide';
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
    ex := NULL;
    SELECT * INTO ex FROM public.veille_items WHERE source_id = s.id AND source_key = it->>'source_key';
    isdup := false;
    IF ex.id IS NULL THEN
      isdup := EXISTS (SELECT 1 FROM public.veille_items o WHERE o.member_id = s.member_id AND o.category = it->>'category'
        AND lower(o.title) = lower(trim(it->>'title')) AND coalesce(o.day, o.starts_at::date) IS NOT DISTINCT FROM coalesce(v_day, v_start::date));
      act := 'nouveau';
    ELSIF ex.title = trim(it->>'title') AND ex.description IS NOT DISTINCT FROM nullif(it->>'description','')
      AND ex.day IS NOT DISTINCT FROM v_day AND ex.starts_at IS NOT DISTINCT FROM v_start
      AND ex.ends_at IS NOT DISTINCT FROM nullif(it->>'ends_at','')::timestamptz
      AND ex.grade IS NOT DISTINCT FROM nullif(it->>'grade','')::numeric AND ex.out_of IS NOT DISTINCT FROM nullif(it->>'out_of','')::numeric
      AND ex.grade_raw IS NOT DISTINCT FROM nullif(it->>'grade_raw','')
      AND ex.source_status IS NOT DISTINCT FROM nullif(it->>'source_status','')
      AND ex.done_state = coalesce(it->>'done_state','inconnu') AND ex.location IS NOT DISTINCT FROM nullif(it->>'location','')
      AND ex.subject IS NOT DISTINCT FROM nullif(it->>'subject','') AND ex.period IS NOT DISTINCT FROM nullif(it->>'period','')
      AND ex.coefficient IS NOT DISTINCT FROM nullif(it->>'coefficient','')::numeric
      AND ex.class_average IS NOT DISTINCT FROM nullif(it->>'class_average','')::numeric
      AND ex.grade_status IS NOT DISTINCT FROM nullif(it->>'grade_status','')
      AND ex.justified IS NOT DISTINCT FROM nullif(it->>'justified','')::boolean
      AND ex.document_url IS NOT DISTINCT FROM nullif(it->>'document_url','') THEN
      act := 'identique';
    ELSE act := 'mis à jour';
    END IF;
    IF isdup THEN n_dup := n_dup + 1; v_unc := v_unc || 'doublon possible'::text; END IF;
    IF act = 'nouveau' THEN n_new := n_new + 1; ELSIF act = 'identique' THEN n_same := n_same + 1; ELSE n_upd := n_upd + 1; END IF;
    cov := jsonb_set(cov, ARRAY[it->>'category'], to_jsonb(coalesce((cov->>(it->>'category'))::int, 0) + 1));
    res := res || jsonb_build_object('source_key', it->>'source_key', 'title', it->>'title', 'category', it->>'category', 'action', act, 'possible_duplicate', isdup);
    IF _apply THEN
      INSERT INTO public.veille_items (source_id, member_id, source_key, category, title, description, day, starts_at, ends_at, location,
        grade, out_of, grade_raw, source_status, done_state, collected_at, uncertainties, possible_duplicate, child_visible,
        subject, period, coefficient, class_average, grade_status, justified, document_url)
      VALUES (s.id, s.member_id, it->>'source_key', it->>'category', trim(it->>'title'), nullif(it->>'description',''), v_day, v_start,
        nullif(it->>'ends_at','')::timestamptz, nullif(it->>'location',''), nullif(it->>'grade','')::numeric, nullif(it->>'out_of','')::numeric,
        nullif(it->>'grade_raw',''), nullif(it->>'source_status',''), coalesce(it->>'done_state','inconnu'), v_coll, v_unc, isdup,
        (it->>'category') = ANY(s.child_categories),
        nullif(it->>'subject',''), nullif(it->>'period',''), nullif(it->>'coefficient','')::numeric, nullif(it->>'class_average','')::numeric,
        nullif(it->>'grade_status',''), nullif(it->>'justified','')::boolean, nullif(it->>'document_url',''))
      ON CONFLICT (source_id, source_key) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, day = EXCLUDED.day,
        starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at, location = EXCLUDED.location, grade = EXCLUDED.grade, out_of = EXCLUDED.out_of,
        grade_raw = EXCLUDED.grade_raw, source_status = EXCLUDED.source_status, done_state = EXCLUDED.done_state, collected_at = EXCLUDED.collected_at,
        uncertainties = EXCLUDED.uncertainties, child_visible = EXCLUDED.child_visible, last_seen = now(),
        subject = EXCLUDED.subject, period = EXCLUDED.period, coefficient = EXCLUDED.coefficient, class_average = EXCLUDED.class_average,
        grade_status = EXCLUDED.grade_status, justified = EXCLUDED.justified, document_url = EXCLUDED.document_url,
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