let video = document.getElementById('videoPlayer');
let peerConnection;
let dataChannel;

// بارگذاری ویدیو از لینک
function loadVideo() {
    let link = document.getElementById('videoLink').value;
    if (link) {
        video.src = link;
        video.load();
    } else {
        alert('لطفاً یه لینک معتبر وارد کن');
    }
}

// تنظیم WebRTC برای هماهنگی
function startSync() {
    // پیکربندی اولیه WebRTC
    peerConnection = new RTCPeerConnection();

    // کانال داده برای ارسال زمان ویدیو
    dataChannel = peerConnection.createDataChannel('syncChannel');
    dataChannel.onopen = () => console.log('کانال باز شد');
    dataChannel.onmessage = (event) => {
        let time = JSON.parse(event.data);
        video.currentTime = time; // همگام‌سازی زمان ویدیو
    };

    // ایجاد پیشنهاد (offer) برای اتصال
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            // اینجا باید offer رو به صورت دستی به کاربر دیگه بدی
            console.log('Offer:', peerConnection.localDescription);
            alert('این Offer رو کپی کن و به دوستت بده: ' + JSON.stringify(peerConnection.localDescription));
        });

    // دریافت جواب (answer) از کاربر دیگه
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('ICE Candidate:', event.candidate);
        }
    };

    // وقتی ویدیو پخش میشه، زمان رو به بقیه بفرست
    video.ontimeupdate = () => {
        if (dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify(video.currentTime));
        }
    };
}

// دریافت Answer از کاربر دیگه
function setAnswer() {
    let answer = prompt('Answer رو از دوستت بگیر و اینجا بذار:');
    if (answer) {
        peerConnection.setRemoteDescription(JSON.parse(answer));
    }
}

// دکمه اضافی برای ست کردن Answer (اختیاری)
document.body.innerHTML += '<button onclick="setAnswer()">ست کردن Answer</button>';