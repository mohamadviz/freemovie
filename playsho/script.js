// متغیرهای اصلی
let video, connectionStatus;
let peerConnection, dataChannel;
let isHost = false;
let sessionId = null;

// مقداردهی اولیه هنگام بارگذاری صفحه
window.onload = function() {
    video = document.getElementById('videoPlayer');
    connectionStatus = document.getElementById('connectionStatus');
    video.controls = false;
    
    // بررسی اگر لینک حاوی شناسه جلسه باشد
    const urlParams = new URLSearchParams(window.location.search);
    const joinSessionId = urlParams.get('join');
    
    if (joinSessionId) {
        // حالت مهمان - پیوستن به جلسه موجود
        document.getElementById('videoLink').value = localStorage.getItem(`session_${joinSessionId}_videoUrl`);
        loadVideo();
        joinSync();
    } else {
        setupVideoEventListeners();
    }
};

function setupVideoEventListeners() {
    video.addEventListener('play', () => {
        if (dataChannel?.readyState === 'open') {
            sendSyncData({
                type: 'sync',
                time: video.currentTime,
                isPlaying: true
            });
        }
    });

    video.addEventListener('pause', () => {
        if (dataChannel?.readyState === 'open') {
            sendSyncData({
                type: 'sync',
                time: video.currentTime,
                isPlaying: false
            });
        }
    });

    video.addEventListener('seeked', () => {
        if (dataChannel?.readyState === 'open') {
            sendSyncData({
                type: 'sync',
                time: video.currentTime,
                isPlaying: !video.paused
            });
        }
    });
}

window.loadVideo = function() {
    const link = document.getElementById('videoLink').value.trim();
    if (!link) {
        showStatus('لطفاً لینک ویدیو را وارد کنید', 'red');
        return;
    }

    showStatus('در حال بارگذاری ویدیو...', 'blue');
    video.src = link;
    video.load();
    
    video.onloadeddata = () => {
        video.controls = true;
        document.getElementById('syncSection').classList.remove('hidden');
        showStatus('ویدیو آماده پخش است', 'green');
    };
    
    video.onerror = () => {
        showStatus('خطا در بارگذاری ویدیو', 'red');
    };
};

window.startSync = function() {
    isHost = true;
    sessionId = generateSessionId();
    
    // ذخیره لینک ویدیو برای جلسه
    localStorage.setItem(`session_${sessionId}_videoUrl`, video.src);
    
    // ایجاد لینک اشتراک‌گذاری
    const shareLink = `${window.location.origin}${window.location.pathname}?join=${sessionId}`;
    document.getElementById('shareLink').value = shareLink;
    document.getElementById('shareSection').classList.remove('hidden');
    
    setupPeerConnection();
    
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            document.getElementById('offerAnswer').value = JSON.stringify(peerConnection.localDescription);
            showStatus('لینک اشتراک‌گذاری آماده است! آن را برای دوستتان بفرستید', 'green');
        })
        .catch(err => {
            showStatus(`خطا در ایجاد اتصال: ${err}`, 'red');
        });
};

window.joinSync = function() {
    isHost = false;
    setupPeerConnection();
    document.getElementById('connectionSection').classList.remove('hidden');
    showStatus('کد میزبان را وارد کنید', 'blue');
};

window.setRemoteDescription = function() {
    const remoteDesc = document.getElementById('offerAnswer').value.trim();
    if (!remoteDesc) {
        showStatus('لطفاً کد اتصال را وارد کنید', 'red');
        return;
    }

    try {
        const desc = JSON.parse(remoteDesc);
        peerConnection.setRemoteDescription(desc)
            .then(() => {
                if (desc.type === 'offer') {
                    return peerConnection.createAnswer()
                        .then(answer => peerConnection.setLocalDescription(answer))
                        .then(() => {
                            document.getElementById('offerAnswer').value = JSON.stringify(peerConnection.localDescription);
                            showStatus('کد پاسخ شما آماده است. آن را برای میزبان بفرستید', 'green');
                        });
                } else {
                    showStatus('اتصال برقرار شد! هماهنگی شروع شد', 'green');
                }
            })
            .catch(err => {
                showStatus(`خطا در اتصال: ${err}`, 'red');
            });
    } catch (err) {
        showStatus('کد اتصال نامعتبر است', 'red');
    }
};

function setupPeerConnection() {
    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
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
        showStatus(`وضعیت اتصال: ${peerConnection.connectionState}`, 'blue');
    };
}

function setupDataChannel() {
    dataChannel.onopen = () => {
        showStatus('اتصال برقرار شد! هماهنگی فعال است', 'green');
        
        if (isHost) {
            sendSyncData({
                type: 'sync',
                time: video.currentTime,
                isPlaying: !video.paused
            });
        }
    };

    dataChannel.onmessage = event => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'sync') {
            if (Math.abs(video.currentTime - data.time) > 0.5) {
                video.currentTime = data.time;
            }
            
            if (data.isPlaying && video.paused) {
                video.play().catch(e => console.log('Play error:', e));
            } else if (!data.isPlaying && !video.paused) {
                video.pause();
            }
        }
    };

    dataChannel.onclose = () => {
        showStatus('اتصال قطع شد', 'red');
    };
}

function sendSyncData(data) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(data));
    }
}

function showStatus(message, color) {
    connectionStatus.textContent = message;
    connectionStatus.style.color = color;
}

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

window.copyShareLink = function() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');
    showStatus('لینک کپی شد!', 'green');
};