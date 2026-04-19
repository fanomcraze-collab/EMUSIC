/**
 * EMUSIC - PRODUCTION ENGINE
 * Features: Real Supabase Auth, DB Integrations, Secure Event Delegation
 */

// 1. SUPABASE CONNECTION (CRITICAL: ADD YOUR KEYS)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. PREMIUM CATALOG
const CATALOG = [
    { id: 1, title: "Neon City Lights", artist: "Synthwave Alpha", cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: 2, title: "Deep Focus Lo-Fi", artist: "Chill Master", cover: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: 3, title: "Uplifting Acoustic", artist: "Sunny Days", cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: 4, title: "Midnight Drive", artist: "The Outrunners", cover: "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f92a?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { id: 5, title: "Ocean Breeze", artist: "Summer Vibes", cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
    { id: 6, title: "Cyberpunk Alley", artist: "Grid Hackers", cover: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
];

// 3. GLOBAL STATE
const State = {
    user: null,
    favorites: new Set(),
    history: [],
    playlists: [],
    queue: [...CATALOG],
    currentTrackIndex: -1,
    isPlaying: false,
    audio: new Audio(),
    currentView: 'app-home'
};

// 4. CORE MODULES
const UI = {
    toast(msg) {
        const el = document.getElementById('toast');
        document.getElementById('toast-message').innerText = msg;
        el.classList.remove('toast-hidden');
        el.classList.add('toast-visible');
        setTimeout(() => {
            el.classList.remove('toast-visible');
            el.classList.add('toast-hidden');
        }, 3500);
    },

    setBtnLoading(btn, isLoading, text) {
        btn.disabled = isLoading;
        btn.innerHTML = isLoading ? `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>` : text;
        lucide.createIcons();
    },

    renderViews() {
        if (State.currentView === 'app-home') this.renderGrid(CATALOG, 'grid-home');
        if (State.currentView === 'app-search') this.renderSearch();
        if (State.currentView === 'app-favorites') {
            const liked = CATALOG.filter(t => State.favorites.has(t.id));
            document.getElementById('count-favorites').innerText = `${liked.length} tracks`;
            this.renderList(liked, 'list-favorites');
        }
        if (State.currentView === 'app-history') {
            // Deduplicate history visually
            const uniqueHistory = Array.from(new Set(State.history.map(a => a.id))).map(id => State.history.find(a => a.id === id));
            this.renderList(uniqueHistory, 'list-history');
        }
        if (State.currentView === 'app-playlists') {
            this.renderPlaylists();
        }
        lucide.createIcons();
    },

    renderSearch() {
        const q = document.getElementById('search-input').value.toLowerCase();
        const results = q ? CATALOG.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)) : [];
        this.renderList(results, 'list-search');
    },

    renderGrid(tracks, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = tracks.map(track => {
            const isPlaying = State.queue[State.currentTrackIndex]?.id === track.id && State.isPlaying;
            return `
                <div class="track-card bg-black/40 hover:bg-white/5 p-4 rounded-2xl transition-all duration-300 cursor-pointer group border border-white/5" data-action="play" data-id="${track.id}">
                    <div class="relative w-full aspect-square mb-4 shadow-2xl overflow-hidden rounded-xl bg-black">
                        <img src="${track.cover}" class="w-full h-full object-cover transition-transform duration-700">
                        <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <button class="play-overlay absolute bottom-3 right-3 w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center opacity-0 shadow-xl hover:bg-brand-400 hover:scale-105 transition-all">
                           <i data-lucide="${isPlaying ? 'pause' : 'play'}" class="w-5 h-5 text-white fill-current ${!isPlaying ? 'ml-1' : ''}"></i>
                        </button>
                    </div>
                    <h4 class="font-display font-bold text-base truncate ${isPlaying ? 'text-brand-500' : 'text-white'}">${track.title}</h4>
                    <p class="text-sm text-gray-400 font-medium truncate mt-1">${track.artist}</p>
                </div>
            `;
        }).join('');
    },

    renderList(tracks, containerId) {
        const container = document.getElementById(containerId);
        if (!tracks.length) {
            container.innerHTML = `<div class="text-gray-500 py-10 text-center font-medium border border-dashed border-white/10 rounded-2xl">Nothing to see here yet.</div>`;
            return;
        }
        container.innerHTML = tracks.map(track => {
            const isLiked = State.favorites.has(track.id);
            const isPlaying = State.queue[State.currentTrackIndex]?.id === track.id && State.isPlaying;
            return `
                <div class="group flex items-center hover:bg-white/5 rounded-xl p-3 transition-colors cursor-pointer border border-transparent hover:border-white/5" data-action="play" data-id="${track.id}">
                    <div class="relative w-12 h-12 rounded-lg overflow-hidden shadow-md">
                        <img src="${track.cover}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <i data-lucide="${isPlaying ? 'pause' : 'play'}" class="w-4 h-4 text-white fill-current ${!isPlaying ? 'ml-1' : ''}"></i>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0 ml-4">
                        <h4 class="font-display font-bold text-base truncate ${isPlaying ? 'text-brand-500' : 'text-white'}">${track.title}</h4>
                        <p class="text-sm text-gray-400 font-medium truncate">${track.artist}</p>
                    </div>
                    <button class="p-3 ml-4 hover:bg-white/10 rounded-full transition-colors z-10" data-action="like" data-id="${track.id}">
                        <i data-lucide="heart" class="w-5 h-5 ${isLiked ? 'text-brand-500 fill-current' : 'text-gray-500 hover:text-white'}"></i>
                    </button>
                </div>
            `;
        }).join('');
    },

    renderPlaylists() {
        const container = document.getElementById('grid-playlists');
        if (!State.playlists.length) {
            container.innerHTML = `<div class="col-span-full text-gray-500 py-10 text-center font-medium border border-dashed border-white/10 rounded-2xl">You haven't created any playlists yet.</div>`;
            return;
        }
        container.innerHTML = State.playlists.map(p => `
            <div class="bg-black/40 border border-white/5 p-6 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer group">
                <div class="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-400 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform"><i data-lucide="music" class="w-5 h-5 text-white"></i></div>
                <div><h4 class="font-display font-bold text-white">${p.name}</h4><p class="text-xs text-gray-500 font-medium mt-1">Playlist</p></div>
            </div>
        `).join('');
    }
};

const DB = {
    async fetchUserData() {
        if(!State.user) return;
        
        try {
            // Fetch Favorites
            const favs = await supabase.from('favorites').select('track_id').eq('user_id', State.user.id);
            if (favs.data) State.favorites = new Set(favs.data.map(f => f.track_id));

            // Fetch History
            const hist = await supabase.from('history').select('track_id').eq('user_id', State.user.id).order('played_at', { ascending: false }).limit(20);
            if (hist.data) {
                State.history = hist.data.map(h => CATALOG.find(c => c.id === h.track_id)).filter(Boolean);
            }

            // Fetch Playlists
            const lists = await supabase.from('playlists').select('*').eq('user_id', State.user.id).order('created_at', { ascending: false });
            if (lists.data) State.playlists = lists.data;
        } catch (error) {
            console.warn("Supabase Tables not yet configured. Please run the SQL setup script.");
        }
    },

    async toggleLike(trackId) {
        if (!State.user) return UI.toast("Log in to save favorites");
        const isLiked = State.favorites.has(trackId);
        
        try {
            if (isLiked) {
                State.favorites.delete(trackId);
                await supabase.from('favorites').delete().match({ user_id: State.user.id, track_id: trackId });
            } else {
                State.favorites.add(trackId);
                await supabase.from('favorites').insert({ user_id: State.user.id, track_id: trackId });
            }
        } catch (e) { UI.toast("Database error. Are tables set up?"); }
    },

    async logPlay(trackId) {
        if (!State.user) return;
        try {
            await supabase.from('history').insert({ user_id: State.user.id, track_id: trackId });
        } catch(e) {} // Fail silently if table missing
    },

    async createPlaylist(name) {
        if (!State.user) return;
        try {
            const { data, error } = await supabase.from('playlists').insert({ user_id: State.user.id, name }).select();
            if (!error && data) {
                State.playlists.unshift(data[0]);
                UI.toast(`Playlist "${name}" created!`);
                UI.renderViews();
            }
        } catch(e) { UI.toast("Failed to create playlist."); }
    }
};

const Auth = {
    async handleSession(user) {
        State.user = user;
        document.getElementById('user-display').innerText = user.email;
        
        await DB.fetchUserData();
        
        document.getElementById('auth-gate').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
        Router.navigateApp('app-home');
    },

    async signUp(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-signup');
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        UI.setBtnLoading(btn, true, "CREATE ACCOUNT");
        const { data, error } = await supabase.auth.signUp({ email, password });
        UI.setBtnLoading(btn, false, "CREATE ACCOUNT");
        
        if (error) UI.toast(error.message);
        else {
            UI.toast("Welcome! Logging you in...");
            // If email verification is off, they log in immediately. 
            // If on, they need to check email. Assuming off for standard prototypes.
            if(data.session) Auth.handleSession(data.session.user);
            else setTimeout(() => Router.navigateAuth('auth-login'), 2000);
        }
    },

    async signIn(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-login');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        UI.setBtnLoading(btn, true, "LOGIN");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        UI.setBtnLoading(btn, false, "LOGIN");
        
        if (error) UI.toast(error.message);
        else Auth.handleSession(data.user);
    },

    async resetPassword(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-reset');
        const email = document.getElementById('reset-email').value;
        
        UI.setBtnLoading(btn, true, "SEND LINK");
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        UI.setBtnLoading(btn, false, "SEND LINK");
        
        if (error) UI.toast(error.message);
        else {
            UI.toast("Recovery link sent!");
            Router.navigateAuth('auth-login');
        }
    },

    logout() {
        supabase.auth.signOut();
        State.user = null;
        State.audio.pause();
        document.getElementById('app-shell').classList.add('hidden');
        document.getElementById('auth-gate').classList.remove('hidden');
        Router.navigateAuth('auth-landing');
    }
};

const Router = {
    navigateAuth(viewId) {
        document.querySelectorAll('.auth-view').forEach(el => el.classList.remove('active'));
        const target = document.querySelector(`[data-view="${viewId}"]`);
        if(target) target.classList.add('active');
    },

    navigateApp(viewId) {
        if (!State.user) return;
        State.currentView = viewId;
        
        document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
        const target = document.querySelector(`[data-view="${viewId}"]`);
        if(target) target.classList.add('active');
        
        document.querySelectorAll('.app-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.target === viewId);
        });

        UI.renderViews();
    }
};

const Player = {
    play(id) {
        const idx = State.queue.findIndex(t => t.id === id);
        if (idx === -1) return;

        if (State.currentTrackIndex === idx) return this.toggle();

        State.currentTrackIndex = idx;
        const track = State.queue[idx];
        
        State.audio.src = track.audio;
        State.audio.play();
        State.isPlaying = true;
        
        // Add to history state
        State.history.unshift(track);
        DB.logPlay(track.id);

        this.updateUI();
        UI.renderViews();
    },

    toggle() {
        if (State.currentTrackIndex === -1) return;
        if (State.isPlaying) State.audio.pause();
        else State.audio.play();
        State.isPlaying = !State.isPlaying;
        this.updateUI();
        UI.renderViews(); // Update grid/list icons
    },

    next() {
        if (State.currentTrackIndex === -1) return;
        this.play(State.queue[(State.currentTrackIndex + 1) % State.queue.length].id);
    },

    prev() {
        if (State.currentTrackIndex === -1) return;
        let idx = State.currentTrackIndex - 1;
        if (idx < 0) idx = State.queue.length - 1;
        this.play(State.queue[idx].id);
    },

    updateUI() {
        const track = State.queue[State.currentTrackIndex];
        if (!track) return;

        document.getElementById('player-cover').src = track.cover;
        document.getElementById('player-cover').classList.remove('opacity-0');
        document.getElementById('player-title').innerText = track.title;
        document.getElementById('player-artist').innerText = track.artist;
        
        const icon = document.getElementById('icon-play');
        icon.setAttribute('data-lucide', State.isPlaying ? 'pause' : 'play');
        State.isPlaying ? icon.classList.remove('ml-1') : icon.classList.add('ml-1');
        
        const likeBtn = document.getElementById('btn-player-like');
        likeBtn.classList.remove('opacity-0', 'pointer-events-none');
        likeBtn.dataset.id = track.id;
        likeBtn.innerHTML = `<i data-lucide="heart" class="w-5 h-5 ${State.favorites.has(track.id) ? 'text-brand-500 fill-current' : ''}"></i>`;

        lucide.createIcons();
    },

    format(sec) {
        if (isNaN(sec)) return "0:00";
        return `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
    }
};

// ==========================================
// 8. BOOTSTRAP & EVENTS
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    lucide.createIcons();
    
    // Auth Check
    if(SUPABASE_URL.includes("YOUR_")) {
        UI.toast("DEVELOPER: Please insert your Supabase Keys in script.js");
    } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) Auth.handleSession(session.user);
        supabase.auth.onAuthStateChange((e, s) => {
            if (e === 'SIGNED_IN') Auth.handleSession(s.user);
            if (e === 'SIGNED_OUT') Auth.executeLogout();
        });
    }

    // --- EVENT DELEGATION ---
    // Router Links
    document.addEventListener('click', (e) => {
        const nav = e.target.closest('.nav-trigger');
        if (nav && nav.dataset.target) Router.navigateAuth(nav.dataset.target);
        
        const appNav = e.target.closest('.app-nav-btn');
        if (appNav && appNav.dataset.target) Router.navigateApp(appNav.dataset.target);
    });

    // Forms
    document.getElementById('form-signup').addEventListener('submit', Auth.signUp);
    document.getElementById('form-login').addEventListener('submit', Auth.signIn);
    document.getElementById('form-reset').addEventListener('submit', Auth.resetPassword);
    document.getElementById('btn-logout').addEventListener('click', Auth.logout);

    // App Actions
    document.getElementById('search-input').addEventListener('input', () => UI.renderSearch());
    
    document.getElementById('btn-create-playlist').addEventListener('click', () => {
        const name = prompt("Enter playlist name:");
        if (name) DB.createPlaylist(name);
    });

    // Play & Like Delegation
    document.addEventListener('click', async (e) => {
        const playBtn = e.target.closest('[data-action="play"]');
        if (playBtn && !e.target.closest('[data-action="like"]')) {
            Player.play(parseInt(playBtn.dataset.id));
        }

        const likeBtn = e.target.closest('[data-action="like"]') || e.target.closest('#btn-player-like');
        if (likeBtn) {
            e.stopPropagation();
            await DB.toggleLike(parseInt(likeBtn.dataset.id));
            Player.updateUI();
            UI.renderViews();
        }
    });

    // Player Controls
    document.querySelector('.ctrl-play').addEventListener('click', () => Player.toggle());
    document.querySelector('.ctrl-next').addEventListener('click', () => Player.next());
    document.querySelector('.ctrl-prev').addEventListener('click', () => Player.prev());

    // Audio Progress
    State.audio.addEventListener('timeupdate', () => {
        if (State.audio.duration) {
            document.getElementById('progress-bar').style.width = `${(State.audio.currentTime / State.audio.duration) * 100}%`;
            document.getElementById('time-current').innerText = Player.format(State.audio.currentTime);
            document.getElementById('time-total').innerText = Player.format(State.audio.duration);
        }
    });
    State.audio.addEventListener('ended', () => Player.next());

    // Scrubbing
    document.getElementById('progress-container').addEventListener('click', (e) => {
        if (State.audio.duration) {
            const rect = e.currentTarget.getBoundingClientRect();
            State.audio.currentTime = ((e.clientX - rect.left) / rect.width) * State.audio.duration;
        }
    });
    
    document.getElementById('volume-container').addEventListener('click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        State.audio.volume = pct;
        document.getElementById('volume-bar').style.width = `${pct * 100}%`;
    });
});
