import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const conWarn = console.warn;
const conLog = console.log;

const IGNORE_WARNINGS = [
  'Using the user object as returned from supabase.auth.getSession()'
];

console.warn = (...args) => {
  const match = args.find((arg) =>
    typeof arg === 'string'
      ? IGNORE_WARNINGS.find((warning) => arg.includes(warning))
      : false
  );
  if (!match) {
    conWarn(...args);
  }
};

console.log = (...args) => {
  const match = args.find((arg) =>
    typeof arg === 'string'
      ? IGNORE_WARNINGS.find((warning) => arg.includes(warning))
      : false
  );
  if (!match) {
    conLog(...args);
  }
};

export const createClient = (options) => {
  // const { admin = false, ...rest } = options ?? {};
  const { admin = false, schema = 'public' } = options ?? {};

  console.log('createClient schema', schema);

  const cookieStore = cookies();
  const key = admin
    ? process.env.SUPABASE_SERVICE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const auth = admin
    ? {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    : {};

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    db: {
      schema: schema
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      }
    },
    auth
    // global: {
    //   headers: {
    //     // Pass user agent from browser
    //     'user-agent': headers().get('user-agent')
    //   }
    // }
  });
};
