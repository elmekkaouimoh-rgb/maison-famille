
CREATE TABLE public.meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL,
  slot text NOT NULL,
  title text NOT NULL,
  ingredients text[] NOT NULL DEFAULT '{}',
  UNIQUE (day, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals TO authenticated;
GRANT ALL ON public.meals TO service_role;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager meals" ON public.meals FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "family reads meals" ON public.meals FOR SELECT TO authenticated USING (true);

CREATE TABLE public.shopping_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Épicerie',
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_items TO authenticated;
GRANT ALL ON public.shopping_items TO service_role;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family reads shopping" ON public.shopping_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "family adds shopping" ON public.shopping_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "family checks shopping" ON public.shopping_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "manager deletes shopping" ON public.shopping_items FOR DELETE TO authenticated USING (public.is_manager());

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'depense',
  category text NOT NULL DEFAULT 'courses',
  label text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Paris')::date,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager budget" ON public.transactions FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());

CREATE TABLE public.budgets (
  month text PRIMARY KEY,
  amount numeric(10,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager budgets" ON public.budgets FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());

CREATE TABLE public.health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  details text,
  day date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_records TO authenticated;
GRANT ALL ON public.health_records TO service_role;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager health" ON public.health_records FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
