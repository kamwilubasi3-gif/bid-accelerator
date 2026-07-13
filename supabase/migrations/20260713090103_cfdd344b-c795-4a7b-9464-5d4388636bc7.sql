
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read notifications" ON public.notifications;
CREATE POLICY "read notifications" ON public.notifications FOR SELECT TO authenticated
  USING (target_user_id IS NULL OR target_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin write notifications" ON public.notifications;
CREATE POLICY "admin write notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin update notifications" ON public.notifications;
CREATE POLICY "admin update notifications" ON public.notifications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin delete notifications" ON public.notifications;
CREATE POLICY "admin delete notifications" ON public.notifications FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DROP POLICY IF EXISTS "admin read all profiles" ON public.profiles;
CREATE POLICY "admin read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR firebase_uid = auth.uid()::text);
DROP POLICY IF EXISTS "admin update all profiles" ON public.profiles;
CREATE POLICY "admin update all profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR firebase_uid = auth.uid()::text);

DROP POLICY IF EXISTS "admin read payments" ON public.payments;
CREATE POLICY "admin read payments" ON public.payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR firebase_uid = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.grant_admin_by_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'kamwilubsi3@gmail.com' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.firebase_uid::uuid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS grant_admin_by_email_trg ON public.profiles;
CREATE TRIGGER grant_admin_by_email_trg AFTER INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_by_email();

INSERT INTO public.user_roles(user_id, role)
SELECT firebase_uid::uuid, 'admin'::public.app_role FROM public.profiles WHERE email = 'kamwilubsi3@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
