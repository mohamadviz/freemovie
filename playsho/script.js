// متغیرهای اصلی
let video, connectionStatus;
let peerConnection, dataChannel;
let isHost = false;
let sessionId = null;
let videoUrl = null;
let isSyncing = false;

// مقداردهی اولیه هنگام بارگذاری صفحه
window.onload = function() {
    // انتخاب المان‌های DOM
    video = document.getElementById('videoPlayer');
    connectionStatus = document.getElementById('connectionStatus');
    video.controls = false;

    // نمایش بخش ورود لینک
    showInputSection();

    // بررسی پارامترهای URL
    const urlParams = new URLSearchParams(window.location.search);
    const joinParam = urlParams.get('join');
    const offerParam = urlParams.get('offer');
    const answerParam = urlParams.get('answer');
    videoUrl = urlParams.get('video');

    if (videoUrl) {
        // حالت خودکار - بارگذاری ویدیو
        showVideoSection();
        loadVideo(() => {
            if (offerParam) {
                // حالت میزبان
                setupHostConnection(joinParam, offerParam);
            } else if (joinParam && !offerParam && !answerParam) {
                // حالت مهمان - ایجاد اتصال
                setupGuestConnection(joinParam);
            } else if (answerParam) {
                // حالت میزبان - دریافت پاسخ
                handleAnswer(answerParam);
            }
        });
    }
};

// نمایش بخش ویدیو
function showVideoSection() {
    document.getElementById('inputSection').classList.add('hidden');
    document.getElementById('shareSection').classList.add('hidden');
    document.getElementById('videoSection').classList.remove('hidden');
    document.getElementById('videoSection').classList.add('show');
}

// نمایش بخش ورود لینک
function showInputSection() {
    document.getElementById('inputSection').classList.remove('hidden');
    document.getElementById('inputSection').classList.add('show');
    document.getElementById('videoSection').classList.add('hidden');
    document.getElementById('shareSection').classList.add('hidden');
}

// بارگذاری ویدیو
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
        
        if (!sessionId) {
            createNewSession();
        }
        
        if (callback) callback();
    };
    
    video.onerror = () => {
        showStatus('خطا در بارگذاری ویدیو', 'red');
        showInputSection();
    };
}

// اعتبارسنجی URL
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
}

// ایجاد جلسه جدید
function createNewSession() {
    sessionId = generateSessionId();
    localStorage.setItem(`session_${sessionId}_videoUrl`, videoUrl);
    setupShareSection();
}

// تنظیم بخش اشتراک‌گذاری
function setupShareSection() {
    const shareLink = `${window.location.origin}${window.location.pathname}?join=${sessionId}&video=${encodeURIComponent(videoUrl)}`;
    document.getElementById('shareLink').value = shareLink;
    
    const shareText = 'به تماشای همزمان این ویدیو با من بپیوندید: ';
    document.getElementById('whatsappShare').href = `https://wa.me/?text=${encodeURIComponent(shareText + shareLink)}`;
    document.getElementById('telegramShare').href = `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(shareText)}`;
    
    document.getElementById('shareSection').classList.remove('hidden');
    document.getElementById('shareSection').classList.add('show');
}

// کپی لینک اشتراک‌گذاری
function copyShareLink() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');
    showStatus('لینک با موفقیت کپی شد!', 'green');
    shareLink.classList.add('bg-blue-900');
    setTimeout(() => shareLink.classList.remove('bg-blue-900'), 300);
}

// تنظیم رویدادهای ویدیو
function setupVideoEventListeners() {
    const events = ['play', 'pause', 'seeked'];
    events.forEach(event => {
        video.addEventListener(event, () => {
            if (!isSyncing && dataChannel?.readyState === 'open') {
                sendSyncData({
                    type: event,
                    time: video.currentTime,
                    isPlaying: !video.paused
                });
            }
        });
    });

    // تشخیص توقف کامل
    let lastTime = -1;
    const checkStop = () => {
        if (video.currentTime === lastTime && video.currentTime === 0 && !video.paused) {
            if (dataChannel?.readyState === 'open') {
                sendSyncData({
                    type: 'stop',
                    time: 0,
                    isPlaying: false
                });
            }
        }
        lastTime = video.currentTime;
    };
    setInterval(checkStop, 300);
}

// تنظیم اتصال میزبان
function setupHostConnection(joinId, offerData) {
    isHost = true;
    sessionId = joinId;
    setupPeerConnection();
    const desc = JSON.parse(decodeURIComponent(offerData));
    peerConnection.setLocalDescription(desc);
}

// تنظیم اتصال مهمان
function setupGuestConnection(joinId) {
    isHost = false;
    sessionId = joinId;
    setupPeerConnection();
    startGuestConnection();
}

// شروع اتصال مهمان
function startGuestConnection() {
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            const offerUrl = `${window.location.origin}${window.location.pathname}?join=${sessionId}&video=${encodeURIComponent(videoUrl)}&offer=${encodeURIComponent(JSON.stringify(peerConnection.localDescription))}`;
            window.location.href = offerUrl;
        })
        .catch(err => {
            console.error('Error creating offer:', err);
            showStatus('خطا در ایجاد اتصال', 'red');
        });
}

// مدیریت پاسخ مهمان
function handleAnswer(answerData) {
    try {
        const answer = JSON.parse(decodeURIComponent(answerData));
        if (peerConnection) {
            peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
                .then(() => {
                    showStatus('اتصال با موفقیت برقرار شد', 'green');
                })
                .catch(err => {
                    console.error('Error setting remote description:', err);
                    showStatus('خطا در برقراری اتصال', 'red');
                });
        }
    } catch (err) {
        console.error('Error parsing answer:', err);
        showStatus('خطا در پردازش پاسخ', 'red');
    }
}

// تنظیم اتصال Peer
function setupPeerConnection() {
    try {
        peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
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
            const status = peerConnection.connectionState;
            showStatus(`وضعیت اتصال: ${status}`, 'blue');
            if (status === 'disconnected' || status === 'failed') {
                setTimeout(() => window.location.reload(), 3000);
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', peerConnection.iceConnectionState);
        };

    } catch (err) {
        console.error('Error setting up peer connection:', err);
        showStatus('خطا در راه‌اندازی اتصال', 'red');
    }
}

// تنظیم کانال داده
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
        try {
            const data = JSON.parse(event.data);
            isSyncing = true;
            
            switch(data.type) {
                case 'play':
                    if (Math.abs(video.currentTime - data.time) > 0.5) {
                        video.currentTime = data.time;
                    }
                    video.play().catch(e => console.log('Play error:', e));
                    break;
                case 'pause':
                    if (Math.abs(video.currentTime - data.time) > 0.5) {
                        video.currentTime = data.time;
                    }
                    video.pause();
                    break;
                case 'seeked':
                    video.currentTime = data.time;
                    if (data.isPlaying && video.paused) {
                        video.play().catch(e => console.log('Play error:', e));
                    } else if (!data.isPlaying && !video.paused) {
                        video.pause();
                    }
                    break;
                case 'stop':
                    video.currentTime = 0;
                    video.pause();
                    break;
                case 'sync':
                    if (Math.abs(video.currentTime - data.time) > 0.5) {
                        video.currentTime = data.time;
                    }
                    if (data.isPlaying && video.paused) {
                        video.play().catch(e => console.log('Play error:', e));
                    } else if (!data.isPlaying && !video.paused) {
                        video.pause();
                    }
                    break;
            }
            
            setTimeout(() => { isSyncing = false; }, 100);
        } catch (err) {
            console.error('Error processing message:', err);
        }
    };

    dataChannel.onclose = () => {
        showStatus('اتصال قطع شد', 'red');
    };

    dataChannel.onerror = (err) => {
        console.error('Data channel error:', err);
        showStatus('خطا در کانال ارتباطی', 'red');
    };
}

// ارسال داده همگام‌سازی
function sendSyncData(data) {
    if (dataChannel && dataChannel.readyState === 'open') {
        try {
            dataChannel.send(JSON.stringify(data));
        } catch (err) {
            console.error('Error sending sync data:', err);
        }
    }
}

// نمایش وضعیت
function showStatus(message, color) {
    connectionStatus.textContent = message;
    connectionStatus.style.color = color;
}

// تولید شناسه جلسه
function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// رویداد کلیک دکمه بارگذاری ویدیو
window.loadVideo = loadVideo;

// رویداد کلیک دکمه کپی لینک
window.copyShareLink = copyShareLink;