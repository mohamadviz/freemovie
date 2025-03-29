// نسخه بهینه شده برای همگام‌سازی ویدیو و اشتراک لینک
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
    
    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get('join');
    videoUrl = urlParams.get('video');

    if (videoUrl) {
        loadVideo(() => {
            if (sessionId) {
                setupGuestConnection(sessionId);
            } else {
                createNewSession();
            }
        });
    }
};

function loadVideo(callback) {
    if (!videoUrl) {
        alert('لطفاً لینک ویدیو را وارد کنید.');
        return;
    }
    
    video.src = videoUrl;
    video.load();

    video.onloadeddata = () => {
        video.controls = true;
        setupVideoEventListeners();
        if (callback) callback();
    };

    video.onerror = () => {
        alert('خطا در بارگذاری ویدیو. لینک را بررسی کنید.');
    };
}

function createNewSession() {
    sessionId = Math.random().toString(36).substr(2, 9);
    setupHostConnection();
}

function setupHostConnection() {
    isHost = true;
    setupPeerConnection();
    showShareLink();
}

function setupGuestConnection(joinId) {
    isHost = false;
    sessionId = joinId;
    setupPeerConnection();
}

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    dataChannel = peerConnection.createDataChannel('sync');
    dataChannel.onmessage = handleSyncMessage;
    
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('New ICE candidate:', event.candidate);
        }
    };
}

function handleSyncMessage(event) {
    const syncData = JSON.parse(event.data);
    isSyncing = true;
    video.currentTime = syncData.time;
    if (syncData.isPlaying) {
        video.play();
    } else {
        video.pause();
    }
    isSyncing = false;
}

function showShareLink() {
    const link = `${window.location.origin}?join=${sessionId}&video=${encodeURIComponent(videoUrl)}`;
    document.getElementById('shareLink').value = link;
}

// نگهداری توابعی که ممکن است در نسخه‌ی اصلی حذف شده باشند
function setupVideoEventListeners() {
    video.addEventListener('play', () => syncVideoState(true));
    video.addEventListener('pause', () => syncVideoState(false));
    video.addEventListener('seeked', () => syncVideoState(video.paused));
}

function syncVideoState(isPlaying) {
    if (isSyncing || !dataChannel || dataChannel.readyState !== 'open') return;
    const syncData = JSON.stringify({ time: video.currentTime, isPlaying });
    dataChannel.send(syncData);
}
