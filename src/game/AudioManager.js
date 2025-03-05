import { Howl } from 'howler';

class AudioManager {
    constructor() {
        this.initialized = false;
        this.audioUnlocked = false;
        this.ambientSoundId = null;
        this.backgroundMusicId = null;
        this.sounds = {};
        this.music = null;
        this.isMuted = false;
        this.musicVolume = 0.5;
        this.soundVolume = 0.7;
        this.fallbackBaseUrl = 'https://storage.googleapis.com/aya-game-assets/sounds/';
        

        const BASE_URL = 'https://aya-3i9c.onrender.com/';

        
        this.sounds = {
            blueTear: new Howl({
                src: [`${BASE_URL}game/assets/sounds/tear_drop_1.wav`],
                volume: 0.5,
                onload: () => {
                    console.log('Loaded blue tear sound');
                    this.checkInitialization();
                },
                onloaderror: (id, err) => {
                    console.error('Error loading blue tear sound:', err);
                    this.checkInitialization(); // Still check initialization even if load fails
                }
            }),
            redTear: new Howl({
                src: [`${BASE_URL}game/assets/sounds/tear_drop_2.wav`],
                volume: 0.5,
                onload: () => {
                    console.log('Loaded gold tear sound');
                    this.checkInitialization();
                },
                onloaderror: (id, err) => {
                    console.error('Error loading gold tear sound:', err);
                    this.checkInitialization();
                }
            }),
            goldTear: new Howl({
                src: [`${BASE_URL}game/assets/sounds/tear_drop_3.mp3`],
                volume: 0.5,
                onload: () => {
                    console.log('Loaded red tear sound');
                    this.checkInitialization();
                },
                onloaderror: (id, err) => {
                    console.error('Error loading red tear sound:', err);
                    this.checkInitialization();
                }
            }),
            splash: new Howl({
                src: [`${BASE_URL}game/assets/sounds/splash.mp3`],
                volume: 0.5,
                onload: () => {
                    console.log('Loaded splash sound');
                    this.checkInitialization();
                },
                onloaderror: (id, err) => {
                    console.error('Error loading splash sound:', err);
                    this.checkInitialization();
                }
            }),
            rainAmbience: new Howl({
                src: [`${BASE_URL}game/assets/sounds/rain_ambience.wav`],
                volume: 0.2,
                loop: true,
                autoplay: false,
                preload: true,
                onload: () => {
                    console.log('Loaded rain ambience');
                    this.checkInitialization();
                },
                onloaderror: (id, err) => {
                    console.error('Error loading rain ambience:', err);
                    this.checkInitialization();
                }
            }),
            backgroundMusic: new Howl({
                src: [`${BASE_URL}game/assets/sounds/Background1.mp3`],
                volume: 0.3,
                loop: true,
                autoplay: false,
                preload: true,
                onload: () => {
                    console.log('Loaded background music');
                    this.checkInitialization();
                },
                onloaderror: (id, err) => {
                    console.error('Error loading background music:', err);
                    this.checkInitialization();
                }
            })
        };

        if (typeof window !== 'undefined') {
            const unlockAudio = () => {
                if (!this.audioUnlocked) {
                    this.unlockAudioContext();
                }
            };

            const events = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown'];
            events.forEach(event => {
                document.addEventListener(event, unlockAudio, { once: true });
            });
        }
    }

    unlockAudioContext() {
        if (this.audioUnlocked) return;

        const audioContext = Howler.ctx;
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed successfully');
                this.audioUnlocked = true;
                if (this.initialized && !this.ambientSoundId) {
                    this.startRainAmbience();
                }
            }).catch(error => {
                console.error('Failed to resume AudioContext:', error);
            });
        } else {
            this.audioUnlocked = true;
            if (this.initialized && !this.ambientSoundId) {
                this.startRainAmbience();
            }
        }
    }

    checkInitialization() {
        const allLoaded = Object.values(this.sounds).every(sound => sound.state() === 'loaded');
        if (allLoaded && !this.initialized) {
            console.log('All audio files loaded successfully');
            this.initialized = true;
            if (this.audioUnlocked && !this.ambientSoundId) {
                this.startRainAmbience();
            }
        }
    }

    async loadSound(key, url) {
        try {
            // Try to load from original URL first
            this.sounds[key] = new Howl({
                src: [url],
                volume: this.soundVolume,
                onloaderror: (id, err) => {
                    console.error(`Error loading sound ${key} from ${url}:`, err);
                    // Try fallback URL if original fails
                    const filename = url.split('/').pop();
                    const fallbackUrl = this.fallbackBaseUrl + filename;
                    
                    this.sounds[key] = new Howl({
                        src: [fallbackUrl],
                        volume: this.soundVolume,
                        onloaderror: (id, err) => {
                            console.error(`Error loading sound ${key} from fallback ${fallbackUrl}:`, err);
                        }
                    });
                }
            });
        } catch (error) {
            console.error(`Failed to load sound ${key}:`, error);
        }
    }

    playTearSound(tearType) {
        if (!this.initialized || !this.audioUnlocked) {
            console.warn('Audio not fully initialized or unlocked yet');
            return;
        }

        let sound;
        switch(tearType) {
            case 'blue':
                sound = this.sounds.blueTear;
                break;
            case 'gold':
                sound = this.sounds.goldTear;
                break;
            case 'red':
                sound = this.sounds.redTear;
                break;
            case 'black':
                sound = this.sounds.goldTear;
                break;
            default:
                sound = this.sounds.blueTear;
        }

        if (sound && sound.state() === 'loaded') {
            sound.play();
        }
    }

    startRainAmbience() {
        if (!this.initialized || !this.audioUnlocked || this.ambientSoundId) {
            return;
        }

        const rainSound = this.sounds.rainAmbience;
        if (rainSound && rainSound.state() === 'loaded') {
            rainSound.stop();
            this.ambientSoundId = rainSound.play();
            console.log('Started rain ambience with ID:', this.ambientSoundId);
        }
    }

    stopRainAmbience() {
        const rainSound = this.sounds.rainAmbience;
        if (rainSound && this.ambientSoundId !== null) {
            rainSound.stop(this.ambientSoundId);
            this.ambientSoundId = null;
            console.log('Stopped rain ambience');
        }
    }

    startBackgroundMusic() {
        if (!this.initialized || !this.audioUnlocked || this.backgroundMusicId) {
            return;
        }

        const bgMusic = this.sounds.backgroundMusic;
        if (bgMusic && bgMusic.state() === 'loaded') {
            bgMusic.stop();
            this.backgroundMusicId = bgMusic.play();
            console.log('Started background music with ID:', this.backgroundMusicId);
        }
    }

    stopBackgroundMusic() {
        const bgMusic = this.sounds.backgroundMusic;
        if (bgMusic && this.backgroundMusicId !== null) {
            bgMusic.stop(this.backgroundMusicId);
            this.backgroundMusicId = null;
            console.log('Stopped background music');
        }
    }

    setVolume(soundName, volume) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].volume(volume);
        }
    }

    setMasterVolume(volume) {
        Howler.volume(volume);
    }
}

const audioManager = new AudioManager();

export default audioManager; 
