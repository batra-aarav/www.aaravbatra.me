/**
 * @typedef {Object} VideoInfo
 * @property {string} thumbnailUrl
 * @property {string} title
 */

const CONFIG = {
    DEFAULTS: {
        FALLBACK_THUMBNAIL: 'https://img.youtube.com/vi/jF-yxeyEhsM/maxresdefault.jpg',
        FALLBACK_TITLE: 'Aarav Batra | Long Snapping Highlight Tape | Class of 2025 | East Brunswick High School'
    }
};

class DeviceDetector {
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    static isIOS() {
        return /iPhone|iPad|iPod/.test(navigator.userAgent);
    }
}

class YouTubeEmbed {
    static createIframe(videoId, type) {
        const iframe = document.createElement('iframe');
        const embedUrl = type === 'playlist' 
            ? `https://www.youtube.com/embed/videoseries?list=${videoId}`
            : `https://www.youtube.com/embed/${videoId}`;

        const params = new URLSearchParams({
            rel: '0',
            autoplay: '1',
            playsinline: '0',
            fs: '1',
            enablejsapi: '1',
            mute: DeviceDetector.isMobile() ? '0' : '1'
        });

        iframe.src = `${embedUrl}&${params}`;
        iframe.frameBorder = '0';
        iframe.allowFullscreen = true;
        iframe.allow = 'autoplay; fullscreen';
        iframe.title = "Aarav Batra's Youtube Video Playlist";

        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';

        return iframe;
    }

    static setupIOSFullscreen(iframe) {
        Object.assign(iframe, {
            webkitPlaysinline: '0',
            playsinline: '0',
            style: 'width: 100%; height: 100%;'
        });

        const fullscreenScript = `
            const video = document.querySelector('video');
            if (video) {
                const enterFullscreen = () => {
                    video.webkitEnterFullscreen();
                    video.play();
                };
                
                if (video.readyState >= 1) enterFullscreen();
                video.addEventListener('loadedmetadata', enterFullscreen);
                video.addEventListener('canplay', enterFullscreen);
            }
        `;

        iframe.onload = () => {
            setTimeout(() => {
                try {
                    iframe.contentWindow.postMessage(
                        JSON.stringify({ event: 'command', func: fullscreenScript }), 
                        '*'
                    );
                } catch (e) {
                    console.warn('[YouTubeEmbed] Fullscreen injection failed:', e);
                }
            }, 500);
        };
    }

    static setupDesktopAutoplay(iframe, embedUrl) {
        setTimeout(() => {
            iframe.src = `${embedUrl}&rel=0&autoplay=1`;
        }, 1000);
    }

    static async createThumbnail(videoId, type) {
        const container = document.createElement('div');
        Object.assign(container.dataset, { id: videoId, type });

        const videoInfo = {
            thumbnailUrl: type === 'playlist' 
                ? CONFIG.DEFAULTS.FALLBACK_THUMBNAIL 
                : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            title: type === 'playlist' 
                ? CONFIG.DEFAULTS.FALLBACK_TITLE 
                : 'Video'
        };

        container.innerHTML = this.getThumbnailHTML(videoInfo);
        container.onclick = () => this.handleThumbnailClick(container, videoId, type);
        return container;
    }

    static getThumbnailHTML(videoInfo) {
        return `
            <img src="${videoInfo.thumbnailUrl}" alt="youtube playlist thumbnail">
            <div class="thumbnail-shadow"></div>
            <div class="video-title-overlay">
                <img src="images/youtube-pfp.png" alt="">
                <span>${videoInfo.title}</span>
            </div>
            <div class="play"></div>
        `;
    }

    static handleThumbnailClick(container, videoId, type) {
        const iframe = this.createIframe(videoId, type);
        container.parentNode.replaceChild(iframe, container);
        
        setTimeout(() => {
            if (DeviceDetector.isIOS()) {
                this.attemptIOSFullscreen(iframe);
            } else {
                const requestFullscreen = iframe.requestFullscreen 
                    || iframe.webkitRequestFullscreen 
                    || iframe.mozRequestFullScreen 
                    || iframe.msRequestFullscreen;

                if (requestFullscreen) {
                    requestFullscreen.call(iframe).catch(err => {
                        console.warn('[YouTubeEmbed] Fullscreen request failed:', err);
                        const parent = iframe.parentElement;
                        if (parent && parent.requestFullscreen) {
                            parent.requestFullscreen().catch(e => 
                                console.warn('[YouTubeEmbed] Parent fullscreen failed:', e));
                        }
                    });
                }
            }
        }, 1000);
    }

    static handleFullscreen(element) {
        if (!DeviceDetector.isMobile()) return;

        if (DeviceDetector.isIOS()) {
            this.attemptIOSFullscreen(element);
        } else {
            element.requestFullscreen?.() || 
            element.webkitRequestFullscreen?.() || 
            element.mozRequestFullScreen?.() || 
            element.msRequestFullscreen?.();
        }
    }

    static attemptIOSFullscreen(iframe, attempts = 0) {
        try {
            const video = iframe.contentDocument?.querySelector('video');
            if (video) {
                const enterFullscreen = () => {
                    video.webkitEnterFullscreen();
                    video.play();
                };

                if (video.readyState >= 1) {
                    enterFullscreen();
                } else {
                    video.addEventListener('loadedmetadata', enterFullscreen);
                    video.addEventListener('canplay', enterFullscreen);
                }
            } else if (attempts < 10) {
                setTimeout(() => this.attemptIOSFullscreen(iframe, attempts + 1), 300);
            }
        } catch (e) {
            console.warn('[YouTubeEmbed] iOS fullscreen failed:', e);
        }
    }
}

async function initYouTubeVideos() {
    const players = document.getElementsByClassName('youtube-player');
    
    for (const player of players) {
        const { id: videoId, type = 'video' } = player.dataset;
        
        if (DeviceDetector.isMobile()) {
            const iframe = YouTubeEmbed.createIframe(videoId, type);
            if (player.firstChild) {
                player.removeChild(player.firstChild);
            }
            player.appendChild(iframe);
            YouTubeEmbed.handleFullscreen(iframe);
        } else {
            const element = await YouTubeEmbed.createThumbnail(videoId, type);
            if (player.firstChild) {
                player.removeChild(player.firstChild);
            }
            player.appendChild(element);
        }
    }
}

document.addEventListener('DOMContentLoaded', initYouTubeVideos);