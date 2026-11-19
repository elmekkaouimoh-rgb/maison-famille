CREATE TABLE public.clothing_sizes (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  height_cm numeric, top text, bottom text, shoes text, pajamas text, notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clothing_sizes TO authenticated;
GRANT ALL ON public.clothing_sizes TO service_role;
ALTER TABLE public.clothing_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager sizes" ON public.clothing_sizes FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "own sizes" ON public.clothing_sizes FOR SELECT TO authenticated USING (member_id = public.my_member_id());

CREATE TABLE public.clothing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'besoin',
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  to_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Hauts',
  size text, season text NOT NULL DEFAULT 'Toutes',
  priority text NOT NULL DEFAULT 'normal',
  condition text, location text,
  price numeric, quantity integer NOT NULL DEFAULT 1,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clothing_items TO authenticated;
GRANT ALL ON public.clothing_items TO service_role;
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager clothes" ON public.clothing_items FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "own clothes" ON public.clothing_items FOR SELECT TO authenticated USING (member_id = public.my_member_id() OR to_member_id = public.my_member_id());