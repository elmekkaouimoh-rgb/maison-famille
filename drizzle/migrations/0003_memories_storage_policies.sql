
CREATE POLICY "memories read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'memories' AND public.can_see_memory_file(name));
CREATE POLICY "memories manager insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'memories' AND public.is_manager());
CREATE POLICY "memories manager update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'memories' AND public.is_manager());
CREATE POLICY "memories manager delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'memories' AND public.is_manager());
