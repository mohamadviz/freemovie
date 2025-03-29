let video, connectionStatus;
let peerConnection, dataChannel;
let isHost = false;
let sessionId = null;
let videoUrl = null;
let isSyncing = false;

window.onload = function () {
    video = document.getElementById('videoPlayer');
    connectionStatus = document.getElementById('connectionStatus');
    video.controls = false;

    showInputSection();

    const urlParams = new URLSearchParams(window.location.search);
    const joinParam = urlParams.get('join');
    const offerParam = urlParams.get('offer');
    const answerParam = urlParams.get('answer');
    videoUrl = urlParams.get('video');

    if (videoUrl) {
        showVideoSection();
        loadVideo(() => {
            if (offerParam) {
                setupHostConnection(joinParam, offerParam);
            } else if (joinParam && !offerParam && !answerParam) {
                setupGuestConnection(joinParam);
            } else if (answerParam) {
                handleAnswer(answerParam);
            }
        });
    }
};

function showSection(sectionId) {
    ['inputSection', 'shareSection', 'videoSection'].forEach(id => {
        const section = document.getElementById(id);
        section.classList.toggle('hidden', id !== sectionId);
        section.classList.toggle('show', id === sectionId);
    });
}

function showInputSection() { showSection('inputSection'); }
function showVideoSection() { showSection('videoSection'); }
function showShareSection() { showSection('shareSection'); }

function loadVideo(callback) {
    const linkInput = document.getElementById('videoLink');
    videoUrl = videoUrl || linkInput.value.trim();

    if (!videoUrl) {
        showStatus('لطفاً لینک ویدیو را وارد کنید', 'red');
        linkInput.focus();
        return;
    }

    if (!isValidUrl(videoUrl)) {
        showStatus('لینک ویدیو نامعتبر است', 'red');
        return;
    }

    showStatus('در حال بارگذاری ویدیو...', 'blue');
    video.src = videoUrl;
    video.load();

    video.onloadeddata = () => {
        video.controls = true;
        setupVideoEventListeners();
        showStatus('ویدیو آماده پخش است', 'green');
        if (!sessionId) createNewSession();
        showVideoSection();
        if (callback) callback();
    };

    video.onerror = () => {
        showStatus('خطا در بارگذاری ویدیو. لطفاً لینک را بررسی کنید.', 'red');
        showInputSection();
    };
}

function isValidUrl(url) {
    try {
        new URL(url);
        return url.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i);
    } catch (_) {
        return false;
    }
}

function createNewSession() {
    sessionId = generateSessionId();
    localStorage.setItem(`session_${sessionId}_videoUrl`, videoUrl);
    setupShareSection();
    showShareSection();
}

function setupShareSection() {
    const shareLink = `${window.location.origin}${window.location.pathname}?join=${sessionId}&video=${encodeURIComponent(videoUrl)}`;
    document.getElementById('shareLink').value = shareLink;

    const shareText = 'با من این ویدیو رو همزمان تماشا کن: ';
    document.getElementById('whatsappShare').href = `https://wa.me/?text=${encodeURIComponent(shareText + shareLink)}`;
    document.getElementById('telegramShare').href = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`;
}

function copyShareLink() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');
    showStatus('لینک کپی شد!', 'green');
}

function setupVideoEventListeners() {
    const events = ['play', 'pause', 'seeked', 'ended'];
    events.forEach(event => {
        video.addEventListener(event, () => {
            if (!isSyncing && dataChannel?.readyState === 'open') {
                isSyncing = true;
                const syncData = {
                    type: event,
                    time: video.currentTime,
                    timestamp: Date.now(),
                    isPlaying: !video.paused && event !== 'ended'
                };
                sendSyncData(syncData);
                setTimeout(() => { isSyncing = false; }, 100);
            }
        });
    });

    video.addEventListener('timeupdate', () => {
        if (!isSyncing && dataChannel?.readyState === 'open' && isHost) {
            sendSyncData({
                type: 'sync',
                time: video.currentTime,
                timestamp: Date.now(),
                isPlaying: !video.paused
            });
        }
    });
}

function setupHostConnection(joinId, offerData) {
    isHost = true;
    sessionId = joinId;
    setupPeerConnection();
    const desc = JSON.parse(decodeURIComponent(offerData));
    peerConnection.setLocalDescription(desc);
}

function setupGuestConnection(joinId) {
    isHost = false;
    sessionId = joinId;
    setupPeerConnection();
    startGuestConnection();
}

function startGuestConnection() {
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            const offerUrl = `${window.location.origin}${window.location.pathname}?join=${sessionId}&video=${encodeURIComponent(videoUrl)}&offer=${encodeURIComponent(JSON.stringify(peerConnection.localDescription))}`;
            window.location.href = offerUrl;
        })
        .catch(err => {
            console.error('خطا در ایجاد پیشنهاد:', err);
            showStatus('خطا در اتصال. دوباره تلاش کنید.', 'red');
        });
}

function handleAnswer(answerData) {
    try {
        const answer = JSON.parse(decodeURIComponent(answerData));
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
            .then(() => showStatus('اتصال برقرار شد!', 'green'))
            .catch(err => {
                console.error('خطا در تنظیم توضیحات ریموت:', err);
                showStatus('خطا در اتصال', 'red');
            });
    } catch (err) {
        console.error('خطا در پردازش پاسخ:', err);
        showStatus('خطا در پردازش پاسخ', 'red');
    }
}

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            {
                urls: 'turn:your-turn-server.com:3478',
                username: 'username',
                credential: 'password'
            }
        ]
    });

    if (isHost) {
        dataChannel = peerConnection.createDataChannel('syncChannel');
        setupDataChannel();
    } else {
        peerConnection.ondatachannel = event => {
            dataChannel = event.channel;
            setupDataChannel();
        };
    }

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('ICE Candidate:', event.candidate);
        }
    };

    peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        showStatus(`وضعیت اتصال: ${state}`, state === 'connected' ? 'green' : 'blue');
        if (state === 'disconnected' || state === 'failed') {
            showStatus('اتصال قطع شد. در حال تلاش مجدد...', 'red');
            setTimeout(() => window.location.reload(), 3000);
        }
    };
}

function setupDataChannel() {
    dataChannel.onopen = () => {
        showStatus('اتصال برقرار شد! ویدیوها هماهنگ هستند.', 'green');
        if (isHost) {
            sendSyncData({
                type: 'sync',
                time: video.currentTime,
                timestamp: Date.now(),
                isPlaying: !video.paused
            });
        }
    };

    dataChannel.onmessage = event => {
        try {
            const data = JSON.parse(event.data);
            isSyncing = true;

            const latency = (Date.now() - data.timestamp) / 1000;
            const adjustedTime = data.time + latency;

            const timeDiff = Math.abs(video.currentTime - adjustedTime);
            if (timeDiff > 0.2) video.currentTime = adjustedTime;

            switch (data.type) {
                case 'play':
                    video.play().catch(e => console.log('خطا در پخش:', e));
                    break;
                case 'pause':
                    video.pause();
                    break;
                case 'seeked':
                    data.isPlaying ? video.play() : video.pause();
                    break;
                case 'ended':
                    video.pause();
                    video.currentTime = 0;
                    break;
                case 'sync':
                    data.isPlaying ? video.play() : video.pause();
                    break;
            }
            setTimeout(() => { isSyncing = false; }, 100);
        } catch (err) {
            console.error('خطا در پردازش پیام:', err);
        }
    };

    dataChannel.onclose = () => showStatus('اتصال قطع شد', 'red');
    dataChannel.onerror = err => {
        console.error('خطا در کانال داده:', err);
        showStatus('خطا در ارتباط', 'red');
    };
}

function sendSyncData(data) {
    if (dataChannel?.readyState === 'open') {
        try {
            dataChannel.send(JSON.stringify(data));
        } catch (err) {
            console.error('خطا در ارسال داده:', err);
        }
    }
}

function showStatus(message, color) {
    connectionStatus.textContent = message;
    connectionStatus.style.color = color;
}

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15);
}

window.loadVideo = loadVideo;
window.copyShareLink = copyShareLink;