
CREATE OR REPLACE FUNCTION public.conversation_people()
RETURNS TABLE (id uuid, first_name text, avatar text, color text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT m.id, m.first_name, m.avatar, m.color
  FROM public.members m
  JOIN public.conversation_members cm ON cm.member_id = m.id
  WHERE public.in_conversation(cm.conversation_id)
$$;
REVOKE EXECUTE ON FUNCTION public.conversation_people() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversation_people() TO authenticated;
