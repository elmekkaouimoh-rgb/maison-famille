ALTER TABLE public.members ADD COLUMN IF NOT EXISTS photo_path text;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE POLICY "member adds own memories" ON public.memories FOR INSERT TO authenticated
WITH CHECK (public.is_family() AND public.my_member_id() = ANY(member_ids) AND created_by = public.my_member_id());

CREATE POLICY "memories member insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'memories' AND public.is_family() AND (storage.foldername(name))[1] = public.my_member_id()::text);

CREATE POLICY "avatars family read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND public.is_family());
CREATE POLICY "avatars manager insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND public.is_manager());
CREATE POLICY "avatars manager update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND public.is_manager());
CREATE POLICY "avatars manager delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND public.is_manager());