// متغیرهای اصلی
let video, connectionStatus;
let peerConnection, dataChannel;
let isHost = false;
let sessionId = null;
let videoUrl = null;

// مقداردهی اولیه هنگام بارگذاری صفحه
window.onload = function() {
    video = document.getElementById('videoPlayer');
    connectionStatus = document.getElementById('connectionStatus');
    video.controls = false;

    // بررسی پارامترهای URL
    const urlParams = new URLSearchParams(window.location.search);
    const joinParam = urlParams.get('join');
    const offerParam = urlParams.get('offer');
    const answerParam = urlParams.get('answer');
    videoUrl = urlParams.get('video');

    if (videoUrl) {
        // حالت میزبان یا مهمان - بارگذاری ویدیو
        loadVideo(() => {
            if (offerParam) {
                // حالت میزبان
                isHost = true;
                sessionId = joinParam;
                setupPeerConnection();
                const desc = JSON.parse(decodeURIComponent(offerParam));
                peerConnection.setLocalDescription(desc);
            } else if (joinParam && !offerParam && !answerParam) {
                // حالت مهمان - ایجاد offer جدید
                isHost = false;
                sessionId = joinParam;
                setupPeerConnection();
                startGuestConnection();
            } else if (answerParam) {
                // حالت میزبان - دریافت answer
                const answer = JSON.parse(decodeURIComponent(answerParam));
                if (peerConnection) {
                    peerConnection.setRemoteDescription(answer);
                }
            }
        });
    } else if (joinParam && offerParam) {
        // حالت مهمان - پیوستن به جلسه موجود
        isHost = false;
        sessionId = joinParam;
        videoUrl = localStorage.getItem(`session_${sessionId}_videoUrl`);
        if (videoUrl) {
            loadVideo(() => {
                setupPeerConnection();
                const desc = JSON.parse(decodeURIComponent(offerParam));
                peerConnection.setRemoteDescription(desc)
                    .then(() => peerConnection.createAnswer())
                    .then(answer => peerConnection.setLocalDescription(answer))
                    .then(() => {
                        const answerUrl = `https://m4tinbeigi-official.github.io/freemovie/playsho/?join=${sessionId}&video=${encodeURIComponent(videoUrl)}&answer=${encodeURIComponent(JSON.stringify(peerConnection.localDescription))}`;
                        window.location.href = answerUrl;
                    });
            });
        }
    } else {
        // حالت جدید - ایجاد جلسه
        createNewSession();
    }
};

function createNewSession() {
    sessionId = generateSessionId();
    videoUrl = prompt('لطفاً لینک ویدیو را وارد کنید:');
    
    if (videoUrl) {
        localStorage.setItem(`session_${sessionId}_videoUrl`, videoUrl);
        const shareLink = `https://m4tinbeigi-official.github.io/freemovie/playsho/?join=${sessionId}&video=${encodeURIComponent(videoUrl)}`;
        window.location.href = shareLink;
    }
}

function loadVideo(callback) {
    if (!videoUrl) return;

    showStatus('در حال بارگذاری ویدیو...', 'blue');
    video.src = videoUrl;
    video.load();
    
    video.onloadeddata = () => {
        video.controls = true;
        showStatus('ویدیو آماده پخش است', 'green');
        if (callback) callback();
    };
    
    video.onerror = () => {
        showStatus('خطا در بارگذاری ویدیو', 'red');
    };
}

function startGuestConnection() {
    setupPeerConnection();
    
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            const offerUrl = `https://m4tinbeigi-official.github.io/freemovie/playsho/?join=${sessionId}&video=${encodeURIComponent(videoUrl)}&offer=${encodeURIComponent(JSON.stringify(peerConnection.localDescription))}`;
            window.location.href = offerUrl;
        });
}

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