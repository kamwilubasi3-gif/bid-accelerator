DROP POLICY IF EXISTS "profiles open" ON public.profiles;
DROP POLICY IF EXISTS "proposals open" ON public.proposals;
DROP POLICY IF EXISTS "usage open" ON public.daily_usage;
DROP POLICY IF EXISTS "payments open" ON public.payments;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_usage TO authenticated;
GRANT ALL ON public.daily_usage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (firebase_uid = auth.uid()::text)
WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can view their own proposals"
ON public.proposals
FOR SELECT
TO authenticated
USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can create their own proposals"
ON public.proposals
FOR INSERT
TO authenticated
WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can update their own proposals"
ON public.proposals
FOR UPDATE
TO authenticated
USING (firebase_uid = auth.uid()::text)
WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can view their own daily usage"
ON public.daily_usage
FOR SELECT
TO authenticated
USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can create their own daily usage"
ON public.daily_usage
FOR INSERT
TO authenticated
WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can update their own daily usage"
ON public.daily_usage
FOR UPDATE
TO authenticated
USING (firebase_uid = auth.uid()::text)
WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can create their own payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can update their own payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (firebase_uid = auth.uid()::text)
WITH CHECK (firebase_uid = auth.uid()::text);