import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
    const { data: genres, error: genreErr } = await supabase.from('genres').select('*');
    console.log('Genres in DB:', genres?.map(g => g.name));

    const { data: profiles, error: profErr } = await supabase.from('profiles').select('*').limit(5);
    console.log('Sample profiles:', profiles?.map(p => ({ id: p.id, top_genres: p.top_genres })));
}

run();
