/**
 * EMUSIC - Production Frontend Engine
 * Architecture: Vanilla JS SPA Module Pattern
 */

// ==========================================
// 1. CONFIGURATION & DATABASE SETUP
// ==========================================
// CRITICAL: INSERT YOUR SUPABASE KEYS HERE
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Premium Royalty-Free Catalog
const CATALOG = [
    { id: 1, title: "Neon City Lights", artist: "Synthwave Alpha", cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: 2, title: "Deep Focus Lo-Fi", artist: "Chill Master", cover: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: 3, title: "Uplifting Acoustic", artist: "Sunny Days", cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: 4, title: "Midnight Drive", artist: "The Outrunners", cover: "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f92a?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { id: 5, title: "Ocean Breeze", artist: "Summer Vibes", cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
    { id: 6, title: "Cyberpunk Alley", artist: "Grid Hackers", cover: "https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=500&q=80", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
];

// Global Application State
const State = {
    user: null,
    favorites: new Set(),
    history: [],
    queue: [...CATALOG],
    currentTrackIndex: -1,
    isPlaying: false,
    audio: new Audio(),
    currentView: 'app-home'
};

// ==========================================
// 2. CORE APPLICATION MODULE
// ==========================================
const App = {
    async init() {
        lucide.createIcons();
        Events.bindAll();
        
        // Check session on load
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await Auth.handleSession(session.user);

        // Listen for Supabase Auth Events
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') Auth.handleSession(session.user);
            if (event === 'SIGNED_OUT') Auth.executeLogout();
        });
    }
};

// ==========================================
// 3. AUTHENTICATION MODULE
// ==========================================
const Auth = {
    async handleSession(user) {
        State.user = user;
        document.getElementById('user-display').innerText = user.email;
        
        // Fetch Favorites (Graceful fail if table not configured yet)
        const { data } = await supabase.from('favorites').select('track_id').eq('user_id', user.id);
        if (data) State.favorites = new Set(data.map(f => f.track_id));
        
        Router.navigateApp('app-home');
        document.getElementById('auth-gate').classList.add('hidden');
        document.getElementById('app-shell').classList.remove('hidden');
    },

    executeLogout() {
        State.user = null;
        State.favorites.clear();
        State.history = [];
        Player.pause();
        document.getElementById('app-shell').classList.add('hidden');
        document.getElementById('auth-gate').classList.remove('hidden');
        Router.navigateAuth('auth-landing');
    },

    async login(email, password, btn) {
        UI.setLoading(btn, true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        UI.setLoading(btn, false, "LOGIN");
        if (error) UI.toast(error.message);
    },

    async signup(email, password, btn) {
        UI.setLoading(btn, true);
        const { error } = await supabase.auth.signUp({ email, password });
        UI.setLoading(btn, false, "CREATE ACCOUNT");
        if (error) UI.toast(error.message);
        else {
            UI.toast("Success! Logging you in...");
            setTimeout(() => this.login(email, password, btn), 1000); // Auto login
        }
    },

    async resetPassword(email, btn) {
        UI.setLoading(btn, true);
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        UI.setLoading(btn, false, "SEND LINK");
        if (error) UI.toast(error.message);
        else {
            UI.toast("Recovery link sent!");
            Router.navigateAuth('auth-login');
        }
    }
};

// ==========================================
// 4. ROUTER MODULE
// ==========================================
const Router = {
    navigateAuth(viewId) {
        document.querySelectorAll('.auth-view').forEach(el => el.classList.remove('active'));
        const target = document.querySelector(`[data-view="${viewId}"]`);
        if(target) target.classList.add('active');
    },

    navigateApp(viewId) {
        if (!State.user) return; // Security Guard
        State.currentView = viewId;
        
        // Toggle Views
        document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
        const target = document.querySelector(`[data-view="${viewId}"]`);
        if(target) target.classList.add('active');
        
        // Toggle Nav Button Active States
        document.querySelectorAll('.app-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.target === viewId);
        });

        UI.refreshData();
    }
};

// ==========================================
// 5. UI & RENDER MODULE
// ==========================================
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

    setLoading(btn, isLoading, originalText = "") {
        btn.disabled = isLoading;
        btn.innerHTML = isLoading ? `<i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto"></i>` : originalText;
        lucide.createIcons();
    },

    refreshData() {
        if (State.currentView === 'app-home') this.renderGrid(CATALOG, 'grid-home');
        if (State.currentView === 'app-search') this.renderSearch();
        if (State.currentView === 'app-favorites') {
            const likedTracks = CATALOG.filter(t => State.favorites.has(t.id));
            document.getElementById('count-favorites').innerText = `${likedTracks.length} tracks`;
            this.renderList(likedTracks, 'list-favorites');
        }
        if (State.currentView === 'app-history') this.renderList(State.history, 'list-history');
    },

    renderSearch() {
        const q = document.getElementById('search-input').value.toLowerCase();
        const results = q ? CATALOG.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)) : [];
        this.renderList(results, 'list-search');
    },

    renderGrid(tracks, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = tracks.map(track => {
            const isPlaying = State.queue[State.currentTrackIndex]?.id === track.id;
            return `
                <div class="track-card bg-black/40 hover:bg-white/5 p-4 rounded-2xl transition-all duration-300 cursor-pointer group border border-white/5" data-action="play" data-id="${track.id}">
                    <div class="relative w-full aspect-square mb-4 shadow-2xl overflow-hidden rounded-xl bg-black">
                        <img src="${track.cover}" class="w-full h-full object-cover transition-transform duration-700">
                        <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <button class="play-overlay absolute bottom-3 right-3 w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center opacity-0 shadow-xl hover:bg-brand-400 hover:scale-105 transition-all">
                           <i data-lucide="${isPlaying && State.isPlaying ? 'pause' : 'play'}" class="w-5 h-5 text-white fill-current ${!isPlaying || !State.isPlaying ? 'ml-1' : ''}"></i>
                        </button>
                    </div>
                    <h4 class="font-display font-bold text-base truncate ${isPlaying ? 'text-brand-500' : 'text-white'}">${track.title}</h4>
                    <p class="text-sm text-gray-400 font-medium truncate mt-1">${track.artist}</p>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    },

    renderList(tracks, containerId) {
        const container = document.getElementById(containerId);
        if (!tracks.length) {
            container.innerHTML = `<div class="text-gray-500 py-10 text-center font-medium border border-dashed border-white/10 rounded-2xl">Nothing to see here yet.</div>`;
            return;
        }
        container.innerHTML = tracks.map(track => {
            const isLiked = State.favorites.has(track.id);
            const isPlaying = State.queue[State.currentTrackIndex]?.id === track.id;
            return `
                <div class="group flex items-center hover:bg-white/5 rounded-xl p-3 transition-colors cursor-pointer border border-transparent hover:border-white/5" data-action="play" data-id="${track.id}">
                    <div class="relative w-12 h-12 rounded-lg overflow-hidden shadow-md">
                        <img src="${track.cover}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <i data-lucide="${isPlaying && State.isPlaying ? 'pause' : 'play'}" class="w-4 h-4 text-white fill-current ${!isPlaying || !State.isPlaying ? 'ml-1' : ''}"></i>
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
        lucide.createIcons();
    }
};

// ==========================================
// 6. PLAYER MODULE
// ==========================================
const Player = {
    playTrack(id) {
        const index = State.queue.findIndex(t => t.id === id);
        if (index === -1) return;

        // Toggle if clicking the same track
        if (State.currentTrackIndex === index) {
            this.toggle();
            return;
        }

        State.currentTrackIndex = index;
        const track = State.queue[index];
        
        State.audio.src = track.audio;
        State.audio.play();
        State.isPlaying = true;
        
        // Add to history (avoid consecutive duplicates)
        if (State.history[0]?.id !== track.id) {
            State.history.unshift(track);
            if (State.history.length > 30) State.history.pop();
        }

        this.updateUI();
        UI.refreshData(); // Updates list highlights
    },

    toggle() {
        if (State.currentTrackIndex === -1) return;
        if (State.isPlaying) {
            State.audio.pause();
        } else {
            State.audio.play();
        }
        State.isPlaying = !State.isPlaying;
        this.updateUI();
        UI.refreshData(); // update play/pause icons on cards
    },

    next() {
        if (State.currentTrackIndex === -1) return;
        const nextIdx = (State.currentTrackIndex + 1) % State.queue.length;
        this.playTrack(State.queue[nextIdx].id);
    },

    prev() {
        if (State.currentTrackIndex === -1) return;
        let prevIdx = State.currentTrackIndex - 1;
        if (prevIdx < 0) prevIdx = State.queue.length - 1;
        this.playTrack(State.queue[prevIdx].id);
    },

    async toggleLike(id) {
        if (!State.user) return;
        const isLiked = State.favorites.has(id);
        
        if (isLiked) {
            State.favorites.delete(id);
            await supabase.from('favorites').delete().match({ user_id: State.user.id, track_id: id });
        } else {
            State.favorites.add(id);
            await supabase.from('favorites').insert({ user_id: State.user.id, track_id: id });
        }
        this.updateUI();
        UI.refreshData();
    },

    setVolume(percent) {
        State.audio.volume = Math.max(0, Math.min(1, percent));
        document.getElementById('volume-bar').style.width = `${percent * 100}%`;
    },

    updateUI() {
        const track = State.queue[State.currentTrackIndex];
        if (!track) return;

        // Cover & Text
        const coverEl = document.getElementById('player-cover');
        coverEl.src = track.cover;
        coverEl.classList.remove('opacity-0');
        document.getElementById('player-title').innerText = track.title;
        document.getElementById('player-artist').innerText = track.artist;

        // Play/Pause Button
        const icon = document.getElementById('icon-play');
        icon.setAttribute('data-lucide', State.isPlaying ? 'pause' : 'play');
        State.isPlaying ? icon.classList.remove('ml-1') : icon.classList.add('ml-1');

        // Like Button
        const likeBtn = document.getElementById('btn-player-like');
        likeBtn.classList.remove('opacity-0', 'pointer-events-none');
        likeBtn.dataset.id = track.id; // Attach ID for delegation
        const isLiked = State.favorites.has(track.id);
        likeBtn.innerHTML = `<i data-lucide="heart" class="w-5 h-5 ${isLiked ? 'text-brand-500 fill-current' : ''}"></i>`;

        lucide.createIcons();
    },

    formatTime(sec) {
        if (isNaN(sec)) return "0:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }
};

// ==========================================
// 7. EVENT DELEGATION & BINDING
// ==========================================
const Events = {
    bindAll() {
        // --- Navigation Routing ---
        document.addEventListener('click', (e) => {
            const navTrigger = e.target.closest('.nav-trigger');
            if (navTrigger) {
                e.preventDefault();
                const target = navTrigger.dataset.target;
                if(target.startsWith('auth-')) Router.navigateAuth(target);
            }
            
            const appNavTrigger = e.target.closest('.app-nav-btn');
            if (appNavTrigger) {
                const target = appNavTrigger.dataset.target;
                if(target) Router.navigateApp(target);
            }
        });

        // --- Auth Forms ---
        document.getElementById('form-login').addEventListener('submit', (e) => {
            e.preventDefault();
            Auth.login(
                document.getElementById('login-email').value, 
                document.getElementById('login-password').value, 
                document.getElementById('btn-login')
            );
        });

        document.getElementById('form-signup').addEventListener('submit', (e) => {
            e.preventDefault();
            Auth.signup(
                document.getElementById('signup-email').value, 
                document.getElementById('signup-password').value, 
                document.getElementById('btn-signup')
            );
        });

        document.getElementById('form-reset').addEventListener('submit', (e) => {
            e.preventDefault();
            Auth.resetPassword(
                document.getElementById('reset-email').value, 
                document.getElementById('btn-reset')
            );
        });

        document.getElementById('btn-logout').addEventListener('click', () => supabase.auth.signOut());

        // --- Main App Interactions (Event Delegation for Dynamic Content) ---
        document.getElementById('search-input').addEventListener('input', () => UI.renderSearch());

        document.addEventListener('click', (e) => {
            // Play Track
            const playBtn = e.target.closest('[data-action="play"]');
            if (playBtn && !e.target.closest('[data-action="like"]')) {
                const id = parseInt(playBtn.dataset.id);
                Player.playTrack(id);
            }

            // Like Track
            const likeBtn = e.target.closest('[data-action="like"]');
            if (likeBtn) {
                e.stopPropagation(); // prevent triggering play
                const id = parseInt(likeBtn.dataset.id);
                Player.toggleLike(id);
            }

            // Player Bar Like
            const playerLikeBtn = e.target.closest('#btn-player-like');
            if (playerLikeBtn) {
                const id = parseInt(playerLikeBtn.dataset.id);
                Player.toggleLike(id);
            }
        });

        // --- Player Controls ---
        document.querySelector('.ctrl-play').addEventListener('click', () => Player.toggle());
        document.querySelector('.ctrl-next').addEventListener('click', () => Player.next());
        document.querySelector('.ctrl-prev').addEventListener('click', () => Player.prev());

        // Audio Time Update & Scrubbing
        State.audio.addEventListener('timeupdate', () => {
            if (State.audio.duration) {
                const percent = (State.audio.currentTime / State.audio.duration) * 100;
                document.getElementById('progress-bar').style.width = `${percent}%`;
                document.getElementById('time-current').innerText = Player.formatTime(State.audio.currentTime);
                document.getElementById('time-total').innerText = Player.formatTime(State.audio.duration);
            }
        });

        State.audio.addEventListener('ended', () => Player.next());

        document.getElementById('progress-container').addEventListener('click', (e) => {
            if (State.audio.duration) {
                const rect = e.currentTarget.getBoundingClientRect();
                State.audio.currentTime = ((e.clientX - rect.left) / rect.width) * State.audio.duration;
            }
        });

        // Volume Scrubbing
        let isDraggingVolume = false;
        const volContainer = document.getElementById('volume-container');
        
        const updateVolume = (e) => {
            const rect = volContainer.getBoundingClientRect();
            let percent = (e.clientX - rect.left) / rect.width;
            Player.setVolume(percent);
        };

        volContainer.addEventListener('mousedown', (e) => { isDraggingVolume = true; updateVolume(e); });
        document.addEventListener('mousemove', (e) => { if(isDraggingVolume) updateVolume(e); });
        document.addEventListener('mouseup', () => { isDraggingVolume = false; });
    }
};

// Boot the Engine
App.init();
