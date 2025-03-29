script.jslet video = document.getElementById('videoPlayer');
let peerConnection;
let dataChannel;

// بارگذاری ویدیو از لینک
function loadVideo() {
    let link = document.getElementById('videoLink').value.trim();
    if (link) {
        video.src = link;
        video.load();
        video.play().catch(err => alert('خطا در پخش ویدیو: ' + err.message));
    } else {
        alert('لطفاً یه لینک معتبر وارد کن');
    }
}

// تنظیم WebRTC برای هماهنگی
function startSync() {
    peerConnection = new RTCPeerConnection();

    // کانال داده برای ارسال زمان ویدیو
    dataChannel = peerConnection.createDataChannel('syncChannel');
    dataChannel.onopen = () => {
        document.getElementById('connectionInfo').innerHTML = 'اتصال برقرار شد! حالا زمان ویدیو رو با دوستانت هماهنگ کن.';
        syncVideoTime();
    };
    dataChannel.onmessage = (event) => {
        let time = JSON.parse(event.data);
        video.currentTime = time; // همگام‌سازی زمان ویدیو
    };

    // ایجاد پیشنهاد (Offer)
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            let offerText = JSON.stringify(peerConnection.localDescription);
            document.getElementById('connectionInfo').innerHTML = 
                `Offer رو کپی کن و به دوستت بده:<br><textarea readonly class="w-full p-2 bg-gray-800 rounded">${offerText}</textarea>`;
        })
        .catch(err => alert('خطا در ایجاد Offer: ' + err.message));

    // دریافت ICE Candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('ICE Candidate:', event.candidate);
        }
    };

    // دریافت Answer از کاربر دیگه
    setTimeout(() => {
        let answer = prompt('Answer رو از دوستت بگیر و اینجا بذار:');
        if (answer) {
            peerConnection.setRemoteDescription(JSON.parse(answer))
                .catch(err => alert('خطا در ست کردن Answer: ' + err.message));
        }
    }, 2000);
}

// ارسال زمان ویدیو به صورت دوره‌ای
function syncVideoTime() {
    setInterval(() => {
        if (dataChannel.readyState === 'open' && !video.paused) {
            dataChannel.send(JSON.stringify(video.currentTime));
        }
    }, 1000); // هر ۱ ثانیه
}

// همگام‌سازی هنگام پخش یا توقف
video.addEventListener('play', () => {
    if (dataChannel?.readyState === 'open') {
        dataChannel.send(JSON.stringify(video.currentTime));
    }
});
video.addEventListener('pause', () => {
    if (dataChannel?.readyState === 'open') {
        dataChannel.send(JSON.stringify(video.currentTime));
    }
});