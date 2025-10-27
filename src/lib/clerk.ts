import { Clerk } from '@clerk/clerk-react';

// Initialize Clerk with your publishable key
// Get your key from https://dashboard.clerk.com
export const clerk = new Clerk(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '');

// Helper to sync Clerk user with Supabase profile
export const syncClerkUserToSupabase = async (clerkUser: any, supabase: any) => {
  if (!clerkUser) return;

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_id', clerkUser.id)
    .maybeSingle();

  const profileData = {
    clerk_id: clerkUser.id,
    first_name: clerkUser.firstName || '',
    last_name: clerkUser.lastName || '',
    username: clerkUser.username || '',
    photo_url: clerkUser.imageUrl || '',
    telegram_id: 0, // Default value for required field
    last_login: new Date().toISOString(),
  };

  if (existingProfile) {
    await supabase
      .from('profiles')
      .update(profileData)
      .eq('clerk_id', clerkUser.id);
  } else {
    await supabase
      .from('profiles')
      .insert(profileData);
  }
};
