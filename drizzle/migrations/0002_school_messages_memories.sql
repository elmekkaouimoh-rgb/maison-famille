
CREATE TABLE public.school_profiles (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  school text, class_name text, teacher text, notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_profiles TO authenticated;
GRANT ALL ON public.school_profiles TO service_role;
ALTER TABLE public.school_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager school profiles" ON public.school_profiles FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "own school profile" ON public.school_profiles FOR SELECT TO authenticated USING (member_id = public.my_member_id());

CREATE TABLE public.school_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'devoir',
  subject text,
  title text NOT NULL,
  due_date date,
  grade numeric(5,2),
  out_of numeric(5,2) DEFAULT 20,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_items TO authenticated;
GRANT ALL ON public.school_items TO service_role;
ALTER TABLE public.school_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager school items" ON public.school_items FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "own school items" ON public.school_items FOR SELECT TO authenticated USING (member_id = public.my_member_id());
CREATE POLICY "own school items done" ON public.school_items FOR UPDATE TO authenticated USING (member_id = public.my_member_id()) WITH CHECK (member_id = public.my_member_id());

CREATE OR REPLACE FUNCTION public.school_items_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_manager() AND auth.uid() IS NOT NULL THEN
    IF NEW.title <> OLD.title OR NEW.kind <> OLD.kind OR NEW.grade IS DISTINCT FROM OLD.grade
       OR NEW.due_date IS DISTINCT FROM OLD.due_date OR NEW.member_id <> OLD.member_id THEN
      RAISE EXCEPTION 'Action réservée au parent';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER school_items_guard BEFORE UPDATE ON public.school_items FOR EACH ROW EXECUTE FUNCTION public.school_items_guard();

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager notifications" ON public.notifications FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "own notifications read" ON public.notifications FOR SELECT TO authenticated USING (member_id = public.my_member_id());
CREATE POLICY "own notifications mark" ON public.notifications FOR UPDATE TO authenticated USING (member_id = public.my_member_id()) WITH CHECK (member_id = public.my_member_id());
CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE TO authenticated USING (member_id = public.my_member_id());

CREATE OR REPLACE FUNCTION public.notify_school_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (member_id, title, body, link)
  VALUES (NEW.member_id,
    CASE NEW.kind WHEN 'devoir' THEN '📚 Nouveau devoir' WHEN 'controle' THEN '📝 Contrôle prévu' WHEN 'note' THEN '🎯 Nouvelle note' ELSE '🏫 École' END,
    NEW.title, '/ecole');
  RETURN NEW;
END $$;
CREATE TRIGGER notify_school_item AFTER INSERT ON public.school_items FOR EACH ROW WHEN (NEW.kind IN ('devoir','controle','note')) EXECUTE FUNCTION public.notify_school_item();

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  icon text NOT NULL DEFAULT '💬',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, member_id)
);
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations, public.conversation_members, public.messages TO authenticated;
GRANT ALL ON public.conversations, public.conversation_members, public.messages TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.in_conversation(_conv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = _conv AND member_id = public.my_member_id())
$$;

CREATE POLICY "manager conversations" ON public.conversations FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "member conversations" ON public.conversations FOR SELECT TO authenticated USING (public.in_conversation(id));
CREATE POLICY "manager conv members" ON public.conversation_members FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "member sees co-members" ON public.conversation_members FOR SELECT TO authenticated USING (public.in_conversation(conversation_id));
CREATE POLICY "member marks read" ON public.conversation_members FOR UPDATE TO authenticated USING (member_id = public.my_member_id()) WITH CHECK (member_id = public.my_member_id());
CREATE POLICY "manager messages" ON public.messages FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "member reads messages" ON public.messages FOR SELECT TO authenticated USING (public.in_conversation(conversation_id));
CREATE POLICY "member sends messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (public.in_conversation(conversation_id) AND sender_id = public.my_member_id());

CREATE OR REPLACE FUNCTION public.on_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sender text; conv text;
BEGIN
  SELECT first_name INTO sender FROM public.members WHERE id = NEW.sender_id;
  SELECT title INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  INSERT INTO public.notifications (member_id, title, body, link)
  SELECT cm.member_id, '💬 ' || sender || ' · ' || conv, left(NEW.body, 120), '/messages'
  FROM public.conversation_members cm WHERE cm.conversation_id = NEW.conversation_id AND cm.member_id <> NEW.sender_id;
  RETURN NEW;
END $$;
CREATE TRIGGER on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.on_new_message();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE TABLE public.memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'photo',
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Paris')::date,
  file_path text,
  favorite boolean NOT NULL DEFAULT false,
  member_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memories TO authenticated;
GRANT ALL ON public.memories TO service_role;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager memories" ON public.memories FOR ALL TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "member sees own memories" ON public.memories FOR SELECT TO authenticated USING (public.my_member_id() = ANY(member_ids));

CREATE OR REPLACE FUNCTION public.can_see_memory_file(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_manager() OR EXISTS (SELECT 1 FROM public.memories WHERE file_path = _path AND public.my_member_id() = ANY(member_ids))
$$;

-- Family-wide conversation seeded with everyone who has a profile
INSERT INTO public.conversations (id, title, icon) VALUES ('00000000-0000-0000-0000-0000000000c1', 'Toute la famille', '🏡');
INSERT INTO public.conversation_members (conversation_id, member_id)
SELECT '00000000-0000-0000-0000-0000000000c1', id FROM public.members;
