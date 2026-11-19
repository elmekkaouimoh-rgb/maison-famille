CREATE OR REPLACE FUNCTION public.is_family()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid() AND active)
$$;

DROP POLICY IF EXISTS "family reads meals" ON public.meals;
CREATE POLICY "family reads meals" ON public.meals FOR SELECT TO authenticated USING (public.is_family());

DROP POLICY IF EXISTS "everyone reads rewards" ON public.rewards;
CREATE POLICY "family reads rewards" ON public.rewards FOR SELECT TO authenticated USING (public.is_family());

DROP POLICY IF EXISTS "family reads shopping" ON public.shopping_items;
DROP POLICY IF EXISTS "family adds shopping" ON public.shopping_items;
DROP POLICY IF EXISTS "family checks shopping" ON public.shopping_items;
CREATE POLICY "family reads shopping" ON public.shopping_items FOR SELECT TO authenticated USING (public.is_family());
CREATE POLICY "family adds shopping" ON public.shopping_items FOR INSERT TO authenticated WITH CHECK (public.is_family());
CREATE POLICY "family checks shopping" ON public.shopping_items FOR UPDATE TO authenticated USING (public.is_family()) WITH CHECK (public.is_family());

CREATE TABLE public.wardrobe_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  summary text NOT NULL,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'en_attente',
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wardrobe_digests TO authenticated;
GRANT ALL ON public.wardrobe_digests TO service_role;
ALTER TABLE public.wardrobe_digests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager digests" ON public.wardrobe_digests FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());