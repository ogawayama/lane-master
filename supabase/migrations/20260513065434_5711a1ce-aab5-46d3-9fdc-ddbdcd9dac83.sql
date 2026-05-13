DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
UPDATE public.users SET rfid = NULL WHERE rfid = '';