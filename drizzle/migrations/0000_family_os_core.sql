
CREATE TYPE public.app_role AS ENUM ('admin','adulte','ado','enfant','petit');

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  birth_date date NOT NULL,
  sex text NOT NULL DEFAULT 'autre',
  family_role public.app_role NOT NULL DEFAULT 'enfant',
  interface text NOT NULL DEFAULT 'enfant',
  color text NOT NULL DEFAULT '#7fb3e6',
  avatar text NOT NULL DEFAULT '🙂',
  user_id uuid UNIQUE,
  username text UNIQUE,
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  points integer NOT NULL DEFAULT 0,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'adulte')
$$;
CREATE OR REPLACE FUNCTION public.my_member_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.members WHERE user_id = auth.uid() LIMIT 1
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager all members" ON public.members FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "self member" ON public.members FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'rdv',
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  recurrence text NOT NULL DEFAULT 'aucune',
  member_ids uuid[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager events" ON public.events FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "member sees own events" ON public.events FOR SELECT TO authenticated USING (public.my_member_id() = ANY(member_ids));

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '⭐',
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  due_date date,
  frequency text NOT NULL DEFAULT 'unique',
  points integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'a_faire',
  comment text,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager tasks" ON public.tasks FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "member reads own tasks" ON public.tasks FOR SELECT TO authenticated USING (member_id = public.my_member_id());
CREATE POLICY "member updates own tasks" ON public.tasks FOR UPDATE TO authenticated USING (member_id = public.my_member_id()) WITH CHECK (member_id = public.my_member_id());

-- children can only move status among a_faire / en_cours / en_attente; points awarded on validation
CREATE OR REPLACE FUNCTION public.tasks_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_manager() AND auth.uid() IS NOT NULL THEN
    IF NEW.status NOT IN ('a_faire','en_cours','en_attente') OR NEW.points <> OLD.points
       OR NEW.member_id <> OLD.member_id OR NEW.title <> OLD.title THEN
      RAISE EXCEPTION 'Action réservée au parent';
    END IF;
  END IF;
  IF NEW.status = 'validee' AND OLD.status <> 'validee' THEN
    NEW.validated_at := now();
    UPDATE public.members SET points = points + NEW.points WHERE id = NEW.member_id;
  ELSIF OLD.status = 'validee' AND NEW.status <> 'validee' THEN
    UPDATE public.members SET points = GREATEST(0, points - OLD.points) WHERE id = OLD.member_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tasks_guard BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tasks_guard();

CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  icon text NOT NULL DEFAULT '🎁',
  cost integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager rewards" ON public.rewards FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "everyone reads rewards" ON public.rewards FOR SELECT TO authenticated USING (true);

CREATE TABLE public.reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id uuid NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'demandee',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_claims TO authenticated;
GRANT ALL ON public.reward_claims TO service_role;
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager claims" ON public.reward_claims FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "member reads own claims" ON public.reward_claims FOR SELECT TO authenticated USING (member_id = public.my_member_id());
CREATE POLICY "member requests reward" ON public.reward_claims FOR INSERT TO authenticated WITH CHECK (member_id = public.my_member_id() AND status = 'demandee');

CREATE OR REPLACE FUNCTION public.claims_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c integer; p integer;
BEGIN
  IF NEW.status = 'approuvee' AND OLD.status <> 'approuvee' THEN
    SELECT cost INTO c FROM public.rewards WHERE id = NEW.reward_id;
    SELECT points INTO p FROM public.members WHERE id = NEW.member_id;
    IF p < c THEN RAISE EXCEPTION 'Points insuffisants'; END IF;
    UPDATE public.members SET points = points - c WHERE id = NEW.member_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER claims_points BEFORE UPDATE ON public.reward_claims FOR EACH ROW EXECUTE FUNCTION public.claims_points();

CREATE TABLE public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  period text NOT NULL DEFAULT 'matin',
  title text NOT NULL,
  icon text NOT NULL DEFAULT '✅',
  sort integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines TO authenticated;
GRANT ALL ON public.routines TO service_role;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager routines" ON public.routines FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "member reads own routines" ON public.routines FOR SELECT TO authenticated USING (member_id = public.my_member_id());

CREATE TABLE public.routine_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Paris')::date,
  UNIQUE (routine_id, day)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_checks TO authenticated;
GRANT ALL ON public.routine_checks TO service_role;
ALTER TABLE public.routine_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager checks" ON public.routine_checks FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "member own checks" ON public.routine_checks FOR ALL TO authenticated USING (member_id = public.my_member_id()) WITH CHECK (member_id = public.my_member_id());

-- Seed family
INSERT INTO public.members (id, first_name, birth_date, sex, family_role, interface, color, avatar, sort) VALUES
 ('00000000-0000-0000-0000-000000000001','Saïd','1983-06-14','homme','admin','admin','#5b8fd6','🧔',0),
 ('00000000-0000-0000-0000-000000000002','Maya','2013-02-04','fille','ado','ado','#9b7fe0','🎧',1),
 ('00000000-0000-0000-0000-000000000003','Lina-Saja','2017-05-01','fille','enfant','enfant','#f08a7e','🌈',2),
 ('00000000-0000-0000-0000-000000000004','Naël','2018-12-04','garcon','enfant','aventure','#4fb3a0','🚀',3),
 ('00000000-0000-0000-0000-000000000005','Yara','2022-03-24','fille','petit','petite','#f2b84b','🦋',4),
 ('00000000-0000-0000-0000-000000000006','Eden','2023-06-01','garcon','petit','toutpetit','#7fc6e8','🐻',5);

INSERT INTO public.rewards (title, icon, cost) VALUES
 ('1h de jeu vidéo','🎮',50),('Un livre','📚',80),('Une glace','🍦',30),('Film au choix','🎬',60),('Une sortie','🎡',150);

INSERT INTO public.tasks (title, icon, member_id, points, frequency, due_date) VALUES
 ('Faire son lit','🛏️','00000000-0000-0000-0000-000000000002',10,'quotidienne',current_date),
 ('Préparer son sac','🎒','00000000-0000-0000-0000-000000000002',10,'quotidienne',current_date),
 ('Débarrasser la table','🍽️','00000000-0000-0000-0000-000000000002',15,'quotidienne',current_date),
 ('Ranger sa chambre','🧹','00000000-0000-0000-0000-000000000003',20,'hebdomadaire',current_date),
 ('Mettre la table','🍴','00000000-0000-0000-0000-000000000003',10,'quotidienne',current_date),
 ('Ranger ses jouets','🧸','00000000-0000-0000-0000-000000000004',10,'quotidienne',current_date),
 ('Ranger ses vêtements','👕','00000000-0000-0000-0000-000000000004',10,'quotidienne',current_date),
 ('Ranger ses jouets','🧸','00000000-0000-0000-0000-000000000005',5,'quotidienne',current_date);

INSERT INTO public.routines (member_id, period, title, icon, sort)
SELECT m.id, r.period, r.title, r.icon, r.sort FROM public.members m
CROSS JOIN (VALUES ('matin','Se brosser les dents','🪥',1),('matin','S''habiller','👕',2),('matin','Petit-déjeuner','🥣',3),
  ('soir','Prendre le bain','🛁',1),('soir','Pyjama','🌙',2),('soir','Histoire du soir','📖',3)) AS r(period,title,icon,sort)
WHERE m.family_role <> 'admin';

INSERT INTO public.events (title, category, start_at, all_day, member_ids) VALUES
 ('Anniversaire de Saïd','anniversaire','2027-06-14 00:00+02',true,ARRAY['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006']::uuid[]),
 ('Rentrée — école','ecole',now() + interval '1 day',false,ARRAY['00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004']::uuid[]),
 ('Pédiatre Eden','medical',now() + interval '2 days',false,ARRAY['00000000-0000-0000-0000-000000000006']::uuid[]),
 ('Natation Naël','sport',now() + interval '3 days',false,ARRAY['00000000-0000-0000-0000-000000000004']::uuid[]),
 ('Sortie au parc','sortie',now() + interval '5 days',false,ARRAY['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000006']::uuid[]);
