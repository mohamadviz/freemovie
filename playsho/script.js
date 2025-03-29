let peerConnection, dataChannel;
let isHost = false;
let currentSession = {
    id: null,
    videoUrl: null,
    lastSync: 0,
    retryCount: 0
};

const ICE_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478?transport=udp' }
    ]
};

// تابع جدید برای مدیریت پارامترهای اتصال
function handleConnectionParams(offerParam, answerParam) {
    if(offerParam) {
        isHost = true;
        setupHostConnection(currentSession.id, offerParam);
    } else if(answerParam) {
        handleAnswer(answerParam);
    }
}

// اصلاح بخش مقداردهی اولیه
window.onload = () => {
    const urlParams = new URLSearchParams(location.search);
    currentSession.id = urlParams.get('join');
    currentSession.videoUrl = urlParams.get('video');

    if(currentSession.videoUrl) {
        initializeVideoPlayer();
        handleConnectionParams( // نام تابع اصلاح شد
            urlParams.get('offer'),
            urlParams.get('answer')
        );
    }
};

async function initializeVideoPlayer() {
    const video = document.getElementById('videoPlayer');
    
    try {
        video.src = currentSession.videoUrl;
        await video.play();
        
        video.controls = true;
        setupVideoSync(video);
        showSection('videoSection');
        
        if(!currentSession.id) {
            createNewSession();
        } else {
            setupPeerConnection();
        }
    } catch(err) {
        showStatus('خطا در بارگذاری ویدیو', 'red');
        showSection('inputSection');
    }
}

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection(ICE_CONFIG);

    if(isHost) {
        dataChannel = peerConnection.createDataChannel('sync');
        setupDataChannel();
    } else {
        peerConnection.ondatachannel = e => {
            dataChannel = e.channel;
            setupDataChannel();
        };
    }

    peerConnection.onicecandidate = e => {
        if(e.candidate) {
            console.log('New ICE candidate:', e.candidate);
        }
    };

    peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        showStatus(`وضعیت اتصال: ${state}`, state === 'connected' ? 'green' : 'yellow');
        
        if(state === 'disconnected' && currentSession.retryCount < 3) {
            currentSession.retryCount++;
            setTimeout(() => window.location.reload(), 2000);
        }
    };
}

function setupDataChannel() {
    dataChannel.onopen = () => {
        showStatus('اتصال برقرار شد!', 'green');
        if(isHost) sendSyncData('fullSync');
    };

    dataChannel.onmessage = async e => {
        try {
            const data = JSON.parse(e.data);
            await handleSyncData(data);
        } catch(err) {
            console.error('خطا در پردازش پیام:', err);
        }
    };
}

async function handleSyncData(data) {
    const video = document.getElementById('videoPlayer');
    const now = Date.now();
    const latency = (now - data.timestamp) / 1000;
    
    if(now - currentSession.lastSync < 100) return;
    currentSession.lastSync = now;

    // Apply sync with latency compensation
    if(Math.abs(video.currentTime - (data.time + latency)) > 0.5) {
        video.currentTime = data.time + latency;
    }

    switch(data.type) {
        case 'play': 
            await video.play();
            break;
        case 'pause':
            video.pause();
            break;
        case 'seek':
            video.currentTime = data.time + latency;
            break;
        case 'fullSync':
            video.currentTime = data.time + latency;
            data.isPlaying ? await video.play() : video.pause();
            break;
    }
}

function createNewSession() {
    currentSession.id = generateSessionId();
    setupShareSection();
    showSection('shareSection');
    setupPeerConnection();
    isHost = true;
}

function setupShareSection() {
    const shareLink = `${location.origin}${location.pathname}?join=${currentSession.id}&video=${encodeURIComponent(currentSession.videoUrl)}`;
    document.getElementById('shareLink').value = shareLink;
    
    const shareText = `با من تماشا کن: ${currentSession.videoUrl}`;
    document.getElementById('whatsappShare').href = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    document.getElementById('telegramShare').href = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}`;
}

// Helper functions
function showSection(sectionId) {
    document.querySelectorAll('[id$="Section"]').forEach(el => {
        el.classList.toggle('hidden', el.id !== sectionId);
        el.classList.toggle('fade-in', el.id === sectionId);
    });
}

function showStatus(message, color) {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.textContent = message;
    statusEl.style.color = color;
}

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function copyShareLink() {
    navigator.clipboard.writeText(document.getElementById('shareLink').value);
    showStatus('لینک کپی شد!', 'green');
}

window.loadVideo = () => {
    const videoUrl = document.getElementById('videoLink').value;
    if(!videoUrl) return showStatus('لینک ویدیو را وارد کنید', 'red');
    
    currentSession.videoUrl = videoUrl;
    location.href = `${location.pathname}?video=${encodeURIComponent(videoUrl)}`;
};

window.showInputSection = () => {
    history.replaceState(null, '', location.pathname);
    location.reload();
};