// Second Supabase client pointing at the User Hub project.
// User Hub is the source of truth for the `users` table.
// Publishable anon key is safe in code.
import { createClient } from "@supabase/supabase-js";

const USERHUB_URL = "https://lafsigvzpefmmmapuiog.supabase.co";
const USERHUB_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhZnNpZ3Z6cGVmbW1tYXB1aW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzI2NzEsImV4cCI6MjA5MzEwODY3MX0.457t57pfzMtYU2hbJRiQLEwLc8zJplUc38OhZqtm5q8";

export type UserHubUser = {
  id: number;
  name: string;
  rfid: string;
  created_at: string;
};

// persistSession:false so this client does not collide with the local
// project's auth session in localStorage.
export const userHub = createClient(USERHUB_URL, USERHUB_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
