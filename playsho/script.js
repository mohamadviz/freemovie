// Global variables
var video;
var connectionInfo;
var offerAnswerTextarea;
var setRemoteBtn;
var peerConnection;
var dataChannel;

// Initialize when page loads
window.onload = function() {
    video = document.getElementById('videoPlayer');
    connectionInfo = document.getElementById('connectionInfo');
    offerAnswerTextarea = document.getElementById('offerAnswer');
    setRemoteBtn = document.getElementById('setRemoteBtn');
};

// بارگذاری ویدیو
window.loadVideo = function() {
    const link = document.getElementById('videoLink').value.trim();
    if (!link) {
        connectionInfo.textContent = 'لطفاً یه لینک معتبر وارد کن';
        return;
    }
    try {
        video.src = link;
        video.load();
        video.play().catch(err => {
            connectionInfo.textContent = `خطا در پخش ویدیو: ${err.message}`;
        });
    } catch (err) {
        connectionInfo.textContent = `خطا در بارگذاری ویدیو: ${err.message}`;
    }
};

// راه‌اندازی WebRTC برای همگام‌سازی
window.startSync = function() {
    try {
        peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // کانال داده برای ارسال زمان ویدیو
        dataChannel = peerConnection.createDataChannel('syncChannel');
        dataChannel.onopen = () => {
            connectionInfo.textContent = 'اتصال برقرار شد! حالا می‌تونی ویدیو رو هماهنگ کنی.';
            syncVideoTime();
        };
        dataChannel.onmessage = (event) => {
            const time = JSON.parse(event.data);
            if (Math.abs(video.currentTime - time) > 0.5) {
                video.currentTime = time;
            }
        };
        dataChannel.onclose = () => {
            connectionInfo.textContent = 'اتصال بسته شد.';
        };

        // مدیریت ICE Candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE Candidate:', event.candidate);
            }
        };

        // ایجاد Offer
        peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
                offerAnswerTextarea.value = JSON.stringify(peerConnection.localDescription);
                offerAnswerTextarea.classList.remove('hidden');
                setRemoteBtn.classList.remove('hidden');
                connectionInfo.textContent = 'Offer رو کپی کن و به دوستت بده.';
            })
            .catch(err => {
                connectionInfo.textContent = `خطا در ایجاد Offer: ${err.message}`;
            });

    } catch (err) {
        connectionInfo.textContent = `خطا در راه‌اندازی WebRTC: ${err.message}`;
    }
};

// تنظیم Answer یا Offer از طرف مقابل
window.setRemoteDescription = function() {
    const remoteDesc = offerAnswerTextarea.value.trim();
    if (!remoteDesc) {
        connectionInfo.textContent = 'لطفاً Offer یا Answer رو وارد کن';
        return;
    }
    try {
        peerConnection.setRemoteDescription(JSON.parse(remoteDesc))
            .then(() => {
                if (peerConnection.remoteDescription.type === 'offer') {
                    peerConnection.createAnswer()
                        .then(answer => peerConnection.setLocalDescription(answer))
                        .then(() => {
                            offerAnswerTextarea.value = JSON.stringify(peerConnection.localDescription);
                            connectionInfo.textContent = 'Answer رو کپی کن و به دوستت بده.';
                        });
                } else {
                    connectionInfo.textContent = 'اتصال با موفقیت برقرار شد!';
                }
            })
            .catch(err => {
                connectionInfo.textContent = `خطا در تنظیم اتصال: ${err.message}`;
            });
    } catch (err) {
        connectionInfo.textContent = `فرمت اشتباه: ${err.message}`;
    }
};

// همگام‌سازی دوره‌ای زمان ویدیو
function syncVideoTime() {
    setInterval(() => {
        if (dataChannel?.readyState === 'open' && !video.paused) {
            dataChannel.send(JSON.stringify(video.currentTime));
        }
    }, 2000);
}

// رویدادهای ویدیو
video.addEventListener('play', () => {
    if (dataChannel?.readyState === 'open') {
        dataChannel.send(JSON.stringify(video.currentTime));
    }
});
video.addEventListener('pause', () => {
    if (dataChannel?.readyState === 'open') {
        dataChannel.send(JSON.stringify(video.currentTime));
    }
})