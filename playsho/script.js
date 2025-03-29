// متغیرهای اصلی
let video, connectionStatus;
let peerConnection, dataChannel;
let isHost = false;

// مقداردهی اولیه هنگام بارگذاری صفحه
window.onload = function() {
    video = document.getElementById('videoPlayer');
    connectionStatus = document.getElementById('connectionStatus');
    
    // مخفی کردن کنترل‌های ویدیو تا زمانی که ویدیو بارگذاری شود
    video.controls = false;
};

// بارگذاری ویدیو
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

// شروع هماهنگی به عنوان میزبان
window.startSync = function() {
    isHost = true;
    setupPeerConnection();
    
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            document.getElementById('offerAnswer').value = JSON.stringify(peerConnection.localDescription);
            document.getElementById('connectionSection').classList.remove('hidden');
            showStatus('کد میزبانی شما آماده است. آن را برای دوستتان بفرستید', 'green');
        })
        .catch(err => {
            showStatus(`خطا در ایجاد اتصال: ${err}`, 'red');
        });
};

// پیوستن به هماهنگی به عنوان مهمان
window.joinSync = function() {
    isHost = false;
    setupPeerConnection();
    document.getElementById('connectionSection').classList.remove('hidden');
    showStatus('کد میزبان را وارد کنید', 'blue');
};

// تنظیم اتصال
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
                    showStatus('اتصال برقرار شد!', 'green');
                }
            })
            .catch(err => {
                showStatus(`خطا در اتصال: ${err}`, 'red');
            });
    } catch (err) {
        showStatus('کد اتصال نامعتبر است', 'red');
    }
};

// تنظیمات پایه اتصال Peer
function setupPeerConnection() {
    peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // کانال داده برای هماهنگی
    if (isHost) {
        dataChannel = peerConnection.createDataChannel('syncChannel');
        setupDataChannel();
    } else {
        peerConnection.ondatachannel = event => {
            dataChannel = event.channel;
            setupDataChannel();
        };
    }

    // مدیریت ICE Candidates
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            console.log('ICE Candidate:', event.candidate);
        }
    };

    peerConnection.onconnectionstatechange = () => {
        showStatus(`وضعیت اتصال: ${peerConnection.connectionState}`, 'blue');
    };
}

// تنظیمات کانال داده
function setupDataChannel() {
    dataChannel.onopen = () => {
        showStatus('اتصال برقرار شد! هماهنگی فعال است', 'green');
        
        // همگام‌سازی اولیه
        if (isHost) {
            sendSyncData({
                time: video.currentTime,
                isPlaying: !video.paused
            });
        }
    };

    dataChannel.onmessage = event => {
        const data = JSON.parse(event.data);
        
        // همگام‌سازی زمان و وضعیت پخش
        if (Math.abs(video.currentTime - data.time) > 0.5) {
            video.currentTime = data.time;
        }
        
        if (data.isPlaying && video.paused) {
            video.play().catch(e => console.log('Play error:', e));
        } else if (!data.isPlaying && !video.paused) {
            video.pause();
        }
    };

    dataChannel.onclose = () => {
        showStatus('اتصال قطع شد', 'red');
    };
}

// ارسال داده‌های هماهنگی
function sendSyncData(data) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(data));
    }
}

// رویدادهای ویدیو برای هماهنگی
video.addEventListener('play', () => {
    sendSyncData({
        time: video.currentTime,
        isPlaying: true
    });
});

video.addEventListener('pause', () => {
    sendSyncData({
        time: video.currentTime,
        isPlaying: false
    });
});

video.addEventListener('seeked', () => {
    sendSyncData({
        time: video.currentTime,
        isPlaying: !video.paused
    });
});

// نمایش وضعیت
function showStatus(message, color) {
    connectionStatus.textContent = message;
    connectionStatus.style.color = color;
}